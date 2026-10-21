import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { createWaveSchema, waveListQuerySchema } from '@/lib/validations/outbound'
import { generateWaveNumber } from '@/lib/utils/number-generator'
import { operationLogService } from '@/lib/services/operation-log-service'
import { ORDER_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { createAuthHandler } from '@/lib/api/create-handler'

const manualWaveEntryDisabled = true

// GET /api/v1/waves - 获取波次列表
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = waveListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      waveType: searchParams.get('waveType'),
      warehouseId: searchParams.get('warehouseId'),
      pickStrategy: searchParams.get('pickStrategy'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, search, status, waveType, warehouseId: requestedWarehouseId, pickStrategy, sortBy, sortOrder } = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (search) {
      where.OR = [{ waveNumber: { contains: search } }]
    }

    if (status) where.status = status
    if (waveType) where.waveType = waveType
    if (warehouseId) where.warehouseId = warehouseId
    if (pickStrategy) where.pickStrategy = pickStrategy

    const total = await prisma.wave.count({ where })

    const waves = await prisma.wave.findMany({
      where,
      select: {
        id: true,
        waveNumber: true,
        waveType: true,
        sourceType: true,
        status: true,
        releaseMode: true,
        releaseStatus: true,
        priority: true,
        totalOrders: true,
        totalLines: true,
        totalQty: true,
        totalSkuCount: true,
        pickedOrders: true,
        pickedQty: true,
        pickStrategy: true,
        plannedStartAt: true,
        actualStartAt: true,
        actualEndAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        _count: {
          select: {
            orders: true,
            pickOrders: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: waves,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取波次列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取波次列表失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/waves - 创建波次
export const POST = createAuthHandler(async (request, auth) => {
  try {
    if (manualWaveEntryDisabled) {
      return NextResponse.json(
        { success: false, message: '手工汇波入口已关闭，请勿再创建手工波次' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createWaveSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 验证仓库是否存在
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: data.warehouseId,
        tenantId: auth.user.tenantId,
      },
    })

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: '仓库不存在', code: 'WAREHOUSE_NOT_FOUND' },
        { status: 400 }
      )
    }

    // 生成波次号
      const waveNumber = data.waveNumber || await generateWaveNumber(
      auth.user.tenantId,
      warehouse.warehouseCode
    )

    // 检查波次号是否已存在
    const existingWave = await prisma.wave.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          waveNumber,
      },
    })

    if (existingWave) {
      return NextResponse.json(
        { success: false, message: '波次号已存在', code: 'WAVE_NUMBER_EXISTS' },
        { status: 400 }
      )
    }

    // 验证订单并计算统计数据
    const orderIds = data.orderIds || []
    let totalOrders = 0
    let totalLines = 0
    let totalQty = 0
    let totalSkuCount = 0

    if (orderIds.length > 0) {
      const orders = await prisma.outboundOrder.findMany({
        where: {
          id: { in: orderIds },
          tenantId: auth.user.tenantId,
          warehouseId: data.warehouseId,
          status: { in: ['CREATED', 'PENDING', 'ALLOCATED', 'PENDING_WAVE'] },
          waveId: null,
        },
        include: {
          lines: true,
        },
      })

      if (orders.length !== orderIds.length) {
        return NextResponse.json(
          { success: false, message: '部分订单不存在或状态不允许加入波次', code: 'INVALID_ORDERS' },
          { status: 400 }
        )
      }

      totalOrders = orders.length
      totalLines = orders.reduce((sum, o) => sum + o.lines.length, 0)
      totalQty = orders.reduce((sum, o) => sum + o.totalOrderedQty, 0)
      totalSkuCount = new Set(orders.flatMap((o) => o.lines.map((l) => l.skuId))).size
    }

    // 创建波次
    const wave = await prisma.wave.create({
        data: {
          tenantId: auth.user.tenantId,
          warehouseId: data.warehouseId,
          waveNumber,
          waveType: data.waveType,
          sourceType: 'MANUAL',
          status: 'CREATED',
          releaseMode: 'MANUAL',
          releaseStatus: 'PENDING_RELEASE',
          priority: data.priority,
          pickStrategy: data.pickStrategy,
          plannedStartAt: data.plannedStartAt || null,
          zoneIds: data.zoneIds || undefined,
          orderIds: orderIds.length > 0 ? orderIds : undefined,
          totalOrders,
          totalLines,
          totalQty,
          totalSkuCount,
          notes: data.notes || null,
          createdBy: auth.user.id,
          updatedBy: auth.user.id,
        },
      include: {
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
    })

    // 更新订单的波次关联
    if (orderIds.length > 0) {
      // 先查询订单信息用于记录日志
      const ordersForLog = await prisma.outboundOrder.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, orderNumber: true, status: true },
      })

      await prisma.waveOrder.createMany({
        data: ordersForLog.map((order) => ({
          tenantId: auth.user.tenantId,
          waveId: wave.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
        })),
      })

      await prisma.outboundOrder.updateMany({
        where: {
          id: { in: orderIds },
        },
        data: {
          waveId: wave.id,
          status: 'IN_WAVE',
          updatedBy: auth.user.id,
        },
      })

      for (const order of ordersForLog) {
        await prisma.outboundOrderWaveContext.upsert({
          where: { orderId: order.id },
          create: {
            tenantId: auth.user.tenantId,
            orderId: order.id,
            releaseMode: 'MANUAL',
            releaseStatus: 'PENDING_RELEASE',
            lastWaveEvaluatedAt: new Date(),
          },
          update: {
            releaseMode: 'MANUAL',
            releaseStatus: 'PENDING_RELEASE',
            lastWaveEvaluatedAt: new Date(),
          },
        })
      }

      // 为每个订单记录操作日志
      for (const order of ordersForLog) {
        operationLogService.logOperation({
          tenantId: auth.user.tenantId,
          entityType: 'OUTBOUND_ORDER',
          entityId: order.id,
          entityNumber: order.orderNumber,
          operationType: ORDER_OPERATION_TYPES.JOIN_WAVE.type,
          operationName: ORDER_OPERATION_TYPES.JOIN_WAVE.name,
          beforeStatus: order.status,
          afterStatus: 'IN_WAVE',
          remark: `加入波次 ${wave.waveNumber}`,
          operatorId: auth.user.id,
          operatorName: auth.user.name || undefined,
          metadata: {
            waveId: wave.id,
            waveNumber: wave.waveNumber,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: wave,
      message: '波次创建成功',
    })
  } catch (error) {
    console.error('创建波次失败:', error)
    return NextResponse.json(
      { success: false, message: '创建波次失败' },
      { status: 500 }
    )
  }
})
