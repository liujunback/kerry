import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const confirmSchema = z.object({
  checkoutOrderId: z.string().uuid().optional(),
  checkoutType: z.enum(['PALLET', 'BAG']),
  createMode: z.enum(['PRE_CREATE', 'AUTO_GENERATE']),
  warehouseId: z.string().uuid().optional(),
  records: z
    .array(
      z.object({
        scannedNumber: z.string(),
        orderNumber: z.string(),
        trackingNumber: z.string().nullable().optional(),
        channelName: z.string().nullable().optional(),
        channelCode: z.string().nullable().optional(),
        orderId: z.string(),
      })
    )
    .optional(),
})

async function generateCheckoutNumber(
  tenantId: string,
  warehouseCode: string,
  checkoutType: string
): Promise<string> {
  const prefix = checkoutType === 'PALLET' ? 'PL' : 'BG'
  const today = new Date()
  const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '')
  const numberPrefix = `${prefix}-${warehouseCode}-${dateStr}-`

  const lastOrder = await prisma.checkoutOrder.findFirst({
    where: {
      tenantId,
      checkoutNumber: { startsWith: numberPrefix },
    },
    orderBy: { checkoutNumber: 'desc' },
    select: { checkoutNumber: true },
  })

  let sequence = 1
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.checkoutNumber.slice(-4), 10)
    if (!Number.isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `${numberPrefix}${sequence.toString().padStart(4, '0')}`
}

export async function postCheckoutConfirm(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const { user } = authResult

  try {
    const body = await request.json()
    const result = confirmSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const {
      checkoutOrderId,
      checkoutType,
      createMode,
      records,
      warehouseId: bodyWarehouseId,
    } = result.data
    const tenantId = user.tenantId

    if (createMode === 'PRE_CREATE' && checkoutOrderId) {
      const existing = await prisma.checkoutOrder.findUnique({
        where: { id: checkoutOrderId },
        select: {
          status: true,
          checkoutNumber: true,
          orderCount: true,
          parcelCount: true,
          records: { select: { id: true }, take: 1 },
        },
      })

      if (!existing) {
        return NextResponse.json(
          { success: false, message: 'Checkout order not found' },
          { status: 400 }
        )
      }
      if (existing.records.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Please scan a number first' },
          { status: 400 }
        )
      }
      if (existing.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, message: 'Checkout order already completed' },
          { status: 400 }
        )
      }

      const container = await prisma.checkoutOrder.update({
        where: { id: checkoutOrderId },
        data: {
          status: 'CHECKED_OUT',
          checkedOutAt: new Date(),
          checkedOutBy: user.id,
          updatedBy: user.id,
        },
        select: { checkoutNumber: true, orderCount: true, parcelCount: true },
      })

      return NextResponse.json({
        success: true,
        data: {
          checkoutNumber: container.checkoutNumber,
          orderCount: container.orderCount,
          parcelCount: container.parcelCount,
        },
      })
    }

    if (createMode === 'AUTO_GENERATE' && records && records.length > 0) {
      const warehouseId = bodyWarehouseId
      if (!warehouseId) {
        return NextResponse.json(
          { success: false, message: 'Please select a warehouse first' },
          { status: 400 }
        )
      }

      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { warehouseCode: true },
      })

      if (!warehouse) {
        return NextResponse.json(
          { success: false, message: 'Warehouse not found' },
          { status: 400 }
        )
      }

      const checkoutNumber = await generateCheckoutNumber(
        tenantId,
        warehouse.warehouseCode,
        checkoutType
      )

      const uniqueOrderIds = [...new Set(records.map((record) => record.orderId))]
      const channelName = records[0].channelName || 'DEFAULT_CHANNEL'
      const channelCode = records[0].channelCode || 'DEFAULT'

      const newContainer = await prisma.$transaction(async (tx) => {
        const createdContainer = await tx.checkoutOrder.create({
          data: {
            tenantId,
            warehouseId,
            checkoutNumber,
            checkoutType,
            status: 'CHECKED_OUT',
            channelName,
            channelCode,
            orderCount: uniqueOrderIds.length,
            parcelCount: records.length,
            checkedOutAt: new Date(),
            checkedOutBy: user.id,
            createdBy: user.id,
          },
        })

        await tx.checkoutRecord.createMany({
          data: records.map((record, index) => ({
            tenantId,
            checkoutOrderId: createdContainer.id,
            sequenceNumber: index + 1,
            scannedNumber: record.scannedNumber,
            numberType:
              record.scannedNumber === record.orderNumber ? 'ORDER' : 'TRACKING',
            orderId: record.orderId,
            orderNumber: record.orderNumber,
            trackingNumber: record.trackingNumber,
            channelName: record.channelName,
            channelCode: record.channelCode,
            scannedBy: user.id,
          })),
        })

        return createdContainer
      })

      return NextResponse.json({
        success: true,
        data: {
          id: newContainer.id,
          checkoutNumber: newContainer.checkoutNumber,
          orderCount: newContainer.orderCount,
          parcelCount: newContainer.parcelCount,
        },
      })
    }

    return NextResponse.json(
      { success: false, message: 'Invalid parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Confirm checkout error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Checkout failed',
      },
      { status: 500 }
    )
  }
}
