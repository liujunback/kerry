import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const validateSchema = z.object({
  containerNumber: z.string().min(1, '板号/袋号不能为空'),
  checkoutType: z.enum(['PALLET', 'BAG']),
  warehouseId: z.string().optional(),
})

export async function postCheckoutValidate(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const { user } = authResult

  try {
    const body = await request.json()
    const result = validateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { containerNumber, checkoutType, warehouseId: bodyWarehouseId } =
      result.data
    const tenantId = user.tenantId
    const warehouseId = bodyWarehouseId || (user as { warehouseId?: string }).warehouseId

    if (!warehouseId) {
      return NextResponse.json(
        { success: false, message: '请先选择仓库后再操作' },
        { status: 400 }
      )
    }

    const existingCheckoutOrder = await prisma.checkoutOrder.findFirst({
      where: {
        tenantId,
        warehouseId,
        checkoutNumber: containerNumber,
        status: { not: 'CHECKED_OUT' },
      },
      include: {
        records: {
          orderBy: { sequenceNumber: 'asc' },
        },
      },
    })

    if (existingCheckoutOrder) {
      return NextResponse.json({
        success: true,
        data: {
          id: existingCheckoutOrder.id,
          containerNumber: existingCheckoutOrder.checkoutNumber,
          checkoutType: existingCheckoutOrder.checkoutType,
          status: existingCheckoutOrder.status,
          channelName: existingCheckoutOrder.channelName,
          channelCode: existingCheckoutOrder.channelCode,
          orderCount: existingCheckoutOrder.orderCount,
          parcelCount: existingCheckoutOrder.parcelCount,
          records: existingCheckoutOrder.records.map((record) => ({
            id: record.id,
            sequenceNumber: record.sequenceNumber,
            scannedNumber: record.scannedNumber,
            orderNumber: record.orderNumber,
            trackingNumber: record.trackingNumber,
            channelName: record.channelName,
            scannedAt: record.scannedAt,
          })),
        },
      })
    }

    const checkedOutOrder = await prisma.checkoutOrder.findFirst({
      where: {
        tenantId,
        warehouseId,
        checkoutNumber: containerNumber,
        status: 'CHECKED_OUT',
      },
    })

    if (checkedOutOrder) {
      return NextResponse.json(
        { success: false, message: '该板号/袋号已签出，不可重复使用' },
        { status: 400 }
      )
    }

    const newCheckoutOrder = await prisma.checkoutOrder.create({
      data: {
        tenantId,
        warehouseId,
        checkoutNumber: containerNumber,
        checkoutType,
        status: 'PENDING',
        createdBy: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newCheckoutOrder.id,
        containerNumber: newCheckoutOrder.checkoutNumber,
        checkoutType: newCheckoutOrder.checkoutType,
        status: newCheckoutOrder.status,
        channelName: null,
        channelCode: null,
        orderCount: 0,
        parcelCount: 0,
        records: [],
      },
    })
  } catch (error) {
    console.error('Validate container error:', error)
    return NextResponse.json(
      { success: false, message: '校验失败' },
      { status: 500 }
    )
  }
}
