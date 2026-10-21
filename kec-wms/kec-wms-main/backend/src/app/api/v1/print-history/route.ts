import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { printHistoryQuerySchema } from '@/lib/validations/print'
import { NextResponse } from 'next/server'

// GET /api/v1/print-history
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = printHistoryQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      labelType: searchParams.get('labelType'),
      scenarioType: searchParams.get('scenarioType'),
      labelSpecCode: searchParams.get('labelSpecCode'),
      warehouseId: searchParams.get('warehouseId'),
      deviceId: searchParams.get('deviceId'),
      status: searchParams.get('status'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, labelType, scenarioType, labelSpecCode, warehouseId, deviceId, status, startDate, endDate } = queryResult.data
    const where: Record<string, unknown> = { tenantId: auth.user.tenantId }

    if (labelType) where.labelType = labelType
    if (scenarioType) where.scenarioType = scenarioType
    if (labelSpecCode) where.labelSpecCode = labelSpecCode
    if (warehouseId !== undefined) where.warehouseId = warehouseId
    if (deviceId) where.deviceId = deviceId
    if (status) where.status = status
    if (startDate || endDate) {
      where.printedAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate + 'T23:59:59') }),
      }
    }

    const total = await prisma.printHistory.count({ where })
    const histories = await prisma.printHistory.findMany({
      where,
      select: {
        id: true,
        labelType: true,
        scenarioType: true,
        labelSpecCode: true,
        warehouseId: true,
        relatedId: true,
        relatedType: true,
        pageCount: true,
        status: true,
        errorMessage: true,
        printedAt: true,
        device: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
        printedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { printedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: histories,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    console.error('获取打印历史失败:', error)
    return NextResponse.json({ success: false, message: '获取打印历史失败' }, { status: 500 })
  }
})

// POST /api/v1/print-history
export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const { deviceId, templateId, labelType, scenarioType, labelSpecCode, warehouseId, relatedIds, relatedType, pageCount, status, errorMessage } = body

    if (!deviceId || !scenarioType) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      )
    }

    const history = await prisma.printHistory.create({
      data: {
        tenantId: auth.user.tenantId,
        deviceId,
        templateId: templateId || null,
        labelType: labelType || labelSpecCode || scenarioType,
        scenarioType,
        labelSpecCode: labelSpecCode || labelType || null,
        warehouseId: warehouseId || null,
        relatedId: relatedIds?.[0] || null,
        relatedType: relatedType || null,
        pageCount: pageCount || 1,
        status: status || 'SUCCESS',
        errorMessage: errorMessage || null,
        printedById: auth.user.id,
      },
    })

    return NextResponse.json({ success: true, data: history, message: '打印历史记录已保存' })
  } catch (error) {
    console.error('保存打印历史失败:', error)
    return NextResponse.json({ success: false, message: '保存打印历史失败' }, { status: 500 })
  }
})
