'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { generateManifestNumber } from '@/lib/services/checkout-service'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const tenantId = auth.user.tenantId

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
    const channelCode = searchParams.get('channelCode') || ''
    const clientId = searchParams.get('clientId') || ''
    const dateType = searchParams.get('dateType') || 'created'
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Prisma.ManifestOrderWhereInput = {
      tenantId,
    }

    // 搜索条件：总单号、订单号、托盘号/袋号、物流单号
    if (search) {
      where.OR = [
        { manifestNumber: { contains: search } },
        { channelName: { contains: search } },
        {
          checkoutOrders: {
            some: {
              OR: [
                { checkoutNumber: { contains: search } },
                {
                  records: {
                    some: {
                      OR: [
                        { orderNumber: { contains: search } },
                        { trackingNumber: { contains: search } },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (warehouseId && warehouseId !== 'all') {
      where.warehouseId = warehouseId
    }

    if (channelCode && channelCode !== 'all') {
      where.channelCode = channelCode
    }

    if (clientId && clientId !== 'all') {
      where.clientId = clientId
    }

    // 日期范围筛选
    if (dateFrom || dateTo) {
      const dateField = dateType === 'completed' ? 'completedAt' : 'createdAt'
      where[dateField] = {}
      if (dateFrom) {
        ;(where[dateField] as Prisma.DateTimeFilter).gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        ;(where[dateField] as Prisma.DateTimeFilter).lte = endDate
      }
    }

    const [data, total] = await Promise.all([
      prisma.manifestOrder.findMany({
        where,
        include: {
          warehouse: {
            select: { warehouseCode: true, warehouseName: true },
          },
          client: {
            select: { clientCode: true, clientName: true },
          },
          _count: {
            select: { checkoutOrders: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.manifestOrder.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Failed to fetch manifest orders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch manifest orders' },
      { status: 500 }
    )
  }
})

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const tenantId = auth.user.tenantId
    const userId = auth.user.id

    const body = await request.json()

    // 验证必填字段
    const { warehouseId, channelCode, channelName, notes } = body

    if (!warehouseId || !channelCode || !channelName) {
      return NextResponse.json(
        { success: false, error: '仓库、渠道编码和渠道名称为必填项' },
        { status: 400 }
      )
    }

    // 获取仓库信息，用于生成总单号
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { warehouseCode: true, warehouseName: true },
    })

    if (!warehouse) {
      return NextResponse.json({ success: false, error: '仓库不存在' }, { status: 404 })
    }

    // 生成总单号
    const manifestNumber = await generateManifestNumber(tenantId, warehouse.warehouseCode, channelCode)

    // 创建总单
    const manifestOrder = await prisma.manifestOrder.create({
      data: {
        tenantId,
        warehouseId,
        manifestNumber,
        channelCode,
        channelName,
        notes: notes || null,
        status: 'CREATED',
        createdBy: userId,
      },
      include: {
        warehouse: {
          select: { warehouseCode: true, warehouseName: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: manifestOrder,
      message: '出库总单创建成功',
    })
  } catch (error) {
    console.error('Failed to create manifest order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create manifest order' },
      { status: 500 }
    )
  }
})
