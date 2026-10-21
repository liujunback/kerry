'use server'

import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const tenantId = auth.user.tenantId

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const orderNumber = searchParams.get('orderNumber') || ''
    const trackingNumber = searchParams.get('trackingNumber') || ''
    const checkoutNumber = searchParams.get('checkoutNumber') || ''
    const palletNumber = searchParams.get('palletNumber') || ''
    const bagNumber = searchParams.get('bagNumber') || ''
    const channelCode = searchParams.get('channelCode') || ''
    const operatorId = searchParams.get('operatorId') || ''
    const completedAtStart = searchParams.get('completedAtStart') || ''
    const completedAtEnd = searchParams.get('completedAtEnd') || ''
    const checkoutType = searchParams.get('checkoutType') || ''
    const status = searchParams.get('status') || ''
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))

    const where: Record<string, unknown> = {
      tenantId,
    }

    // 按状态查询（不传则查全部）
    if (status && status !== 'all') {
      where.status = status
    }

    // 按仓库查询
    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    if (checkoutNumber) {
      where.checkoutNumber = { contains: checkoutNumber }
    }

    // 按板号查询
    if (palletNumber) {
      where.checkoutType = 'PALLET'
      where.checkoutNumber = { contains: palletNumber }
    }

    // 按袋号查询
    if (bagNumber) {
      where.checkoutType = 'BAG'
      where.checkoutNumber = { contains: bagNumber }
    }

    // 按签出类型查询
    if (checkoutType && checkoutType !== 'all') {
      where.checkoutType = checkoutType
    }

    // 按渠道查询
    if (channelCode) {
      where.OR = [
        { channelCode: { contains: channelCode } },
        { channelName: { contains: channelCode } },
      ]
    }

    // 按操作人查询
    if (operatorId) {
      where.checkedOutBy = operatorId
    }

    // 按完成时间范围查询
    if (completedAtStart || completedAtEnd) {
      where.checkedOutAt = {}
      if (completedAtStart) {
        (where.checkedOutAt as Record<string, unknown>).gte = new Date(completedAtStart)
      }
      if (completedAtEnd) {
        (where.checkedOutAt as Record<string, unknown>).lte = new Date(completedAtEnd)
      }
    }

    // 按出库单号或物流单号查询（需要关联 CheckoutRecord）
    let checkoutOrderIds: string[] | null = null
    if (orderNumber || trackingNumber) {
      const recordWhere: Record<string, unknown> = { tenantId }
      if (orderNumber) {
        recordWhere.orderNumber = { contains: orderNumber }
      }
      if (trackingNumber) {
        recordWhere.trackingNumber = { contains: trackingNumber }
      }
      const records = await prisma.checkoutRecord.findMany({
        where: recordWhere,
        select: { checkoutOrderId: true },
        distinct: ['checkoutOrderId'],
      })
      checkoutOrderIds = records.map(r => r.checkoutOrderId)
      if (checkoutOrderIds.length === 0) {
        // 没有匹配的记录，返回空结果
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        })
      }
      where.id = { in: checkoutOrderIds }
    }

    const [data, total] = await Promise.all([
      prisma.checkoutOrder.findMany({
        where,
        include: {
          warehouse: {
            select: { warehouseCode: true, warehouseName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.checkoutOrder.count({ where }),
    ])

    // 获取操作人信息
    const operatorIds = [...new Set(data.map(d => d.checkedOutBy).filter(Boolean))] as string[]
    const operators = operatorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: operatorIds } },
          select: { id: true, username: true },
        })
      : []
    const operatorMap = new Map(operators.map(o => [o.id, o.username]))

    // 格式化返回数据
    const formattedData = data.map(order => ({
      ...order,
      operatorName: order.checkedOutBy ? operatorMap.get(order.checkedOutBy) || '-' : '-',
    }))

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Failed to fetch checkout orders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch checkout orders' },
      { status: 500 }
    )
  }
})
