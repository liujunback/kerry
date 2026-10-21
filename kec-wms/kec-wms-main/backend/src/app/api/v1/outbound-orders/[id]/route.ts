import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { buildOrderInterceptionSummary } from '@/lib/services/order-interception-service'
import { updateOutboundOrderSchema } from '@/lib/validations/outbound'
import { NextRequest,NextResponse } from 'next/server'

// GET /api/v1/outbound-orders/[id] - 获取出库订单详情
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    const order = await prisma.outboundOrder.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        wave: {
          select: {
            id: true,
            waveNumber: true,
            status: true,
            pickStrategy: true,
          },
        },
        lines: {
          select: {
            id: true,
            lineNumber: true,
            skuId: true,
            skuCode: true,
            skuName: true,
            qualityType: true,
            orderedQty: true,
            allocatedQty: true,
            pickedQty: true,
            packedQty: true,
            shippedQty: true,
            cancelledQty: true,
            shortQty: true,
            uomCode: true,
            unitPrice: true,
            lineAmount: true,
            batchNumber: true,
            udf: true,
            status: true,
            notes: true,
            sku: {
              select: {
                barcode: true,
                isSelfPackaged: true,
                isSerialManaged: true,
              },
            },
          },
          orderBy: { lineNumber: 'asc' },
        },
        outbound_order_address: {
          select: {
            id: true,
            shippingName: true,
            shippingPhone: true,
            shippingEmail: true,
            shippingCompany: true,
            shippingLine1: true,
            shippingLine2: true,
            shippingCity: true,
            shippingProvince: true,
            shippingPostalCode: true,
            shippingCountry: true,
            shippingCountryName: true,
          },
        },
        extension: {
          select: {
            channel: true,
            logisticsTrackingNumber: true,
            checkOutWeightKg: true,
            totalAmount: true,
            currency: true,
          },
        },
        timeline: {
          select: {
            expectedShipDate: true,
            expectedOutboundTime: true,
            allocatedAt: true,
            wavedAt: true,
            pickedAt: true,
            sortedAt: true,
            packedAt: true,
            checkedOutAt: true,
            cancelledAt: true,
          },
        },
        interceptionCases: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            source: true,
            remark: true,
            status: true,
            markedBy: true,
            markedAt: true,
            blockedAtCheckout: true,
          },
        },
        shipments: {
          select: {
            id: true,
            shipmentNumber: true,
            status: true,
            carrierName: true,
            trackingNumber: true,
            totalWeightKg: true,
            shippedAt: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: '订单不存在', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: (() => {
        const { interceptionCases, ...rest } = order
        return {
          ...rest,
          ...buildOrderInterceptionSummary(interceptionCases[0]),
        }
      })(),
    })
  } catch (error) {
    console.error('获取出库订单详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取出库订单详情失败' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/outbound-orders/[id] - 更新出库订单
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const validationResult = updateOutboundOrderSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    // 检查订单是否存在
    const existingOrder = await prisma.outboundOrder.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: '订单不存在', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查订单状态是否允许修改
    const nonEditableStatuses = ['PICKING', 'PICKED', 'SORTING', 'SORTED', 'PACKING', 'PACKED', 'CHECKOUT_PENDING', 'CHECKED_OUT', 'CANCELLED']
    if (nonEditableStatuses.includes(existingOrder.status)) {
      return NextResponse.json(
        { success: false, message: '当前订单状态不允许修改', code: 'ORDER_NOT_EDITABLE' },
        { status: 400 }
      )
    }

    const data = validationResult.data
    const { address, config, ...restData } = data

    const order = await prisma.outboundOrder.update({
      where: { id },
      data: {
        ...restData,
        ...(config !== undefined && { config: config as object }),
        updatedBy: auth.user.id,
        ...(address && {
          address: {
            update: address,
          },
        }),
      },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: order,
      message: '订单更新成功',
    })
  } catch (error) {
    console.error('更新出库订单失败:', error)
    return NextResponse.json(
      { success: false, message: '更新出库订单失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/outbound-orders/[id] - 删除出库订单
export const DELETE = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params

    // 检查订单是否存在
    const existingOrder = await prisma.outboundOrder.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: '订单不存在', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 只允许删除 PENDING 状态的订单
    if (existingOrder.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, message: '只能删除待处理状态的订单', code: 'ORDER_NOT_DELETABLE' },
        { status: 400 }
      )
    }

    await prisma.outboundOrder.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '订单删除成功',
    })
  } catch (error) {
    console.error('删除出库订单失败:', error)
    return NextResponse.json(
      { success: false, message: '删除出库订单失败' },
      { status: 500 }
    )
  }
})

