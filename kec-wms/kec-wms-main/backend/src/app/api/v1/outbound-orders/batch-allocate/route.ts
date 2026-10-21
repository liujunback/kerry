import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { Log } from '@/lib/logger'
import { allocateInventorySync } from '@/lib/services/inventory-allocation-service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const batchAllocateSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1, '至少选择一个订单'),
})

// POST /api/v1/outbound-orders/batch-allocate - 批量库存分配
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validationResult = batchAllocateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { orderIds } = validationResult.data
    Log.info('[BatchAllocate] 开始批量分配', { order_count: orderIds.length, order_ids: orderIds })

    const orders = await prisma.outboundOrder.findMany({
      where: {
        id: { in: orderIds },
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        warehouseId: true,
        clientId: true,
      },
    })

    if (orders.length === 0) {
      return NextResponse.json(
        { success: false, message: '未找到有效订单', code: 'NO_VALID_ORDERS' },
        { status: 400 }
      )
    }

    const invalidOrders = orders.filter((order) => order.status !== 'PENDING')
    if (invalidOrders.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${invalidOrders.length} 个订单状态不允许分配库存`,
          code: 'INVALID_ORDER_STATUS',
          data: { invalidOrders: invalidOrders.map((order) => order.orderNumber) },
        },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      failed: 0,
      details: [] as { orderNumber: string; status: string; message?: string }[],
    }

    for (const order of orders) {
      const result = await allocateInventorySync(order.id, auth.user.tenantId, auth.user.id)

      if (result.success) {
        results.success++
        results.details.push({ orderNumber: order.orderNumber, status: 'SUCCESS' })
      } else {
        results.failed++
        results.details.push({
          orderNumber: order.orderNumber,
          status: 'FAILED',
          message: result.message,
        })
      }
    }

    Log.info('[BatchAllocate] 批量分配完成', { success: results.success, failed: results.failed })
    return NextResponse.json({
      success: true,
      message: `成功分配 ${results.success} 个订单，失败 ${results.failed} 个`,
      data: results,
    })
  } catch (error) {
    Log.error('批量库存分配失败', { error })
    return NextResponse.json({ success: false, message: '批量库存分配失败' }, { status: 500 })
  }
})
