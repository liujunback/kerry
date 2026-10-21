import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { packagingMaterialTransactionListQuerySchema } from '@/lib/validations/packaging-material-transaction'
import { NextResponse } from 'next/server'

// GET /api/v1/packaging-material-transactions - 获取包材流水列表
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = packagingMaterialTransactionListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      materialId: searchParams.get('materialId'),
      warehouseId: searchParams.get('warehouseId'),
      transactionType: searchParams.get('transactionType'),
      referenceType: searchParams.get('referenceType'),
      auditStatus: searchParams.get('auditStatus'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const {
      page, pageSize, search, materialId, warehouseId: requestedWarehouseId,
      transactionType, referenceType, auditStatus,
      startDate, endDate, sortBy, sortOrder
    } = queryResult.data
    const warehouseId = resolveScopedWarehouseId(auth.user, requestedWarehouseId)

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (search) {
      where.OR = [
        { materialCode: { contains: search } },
        { materialName: { contains: search } },
        { referenceNumber: { contains: search } },
        { operatorName: { contains: search } },
      ]
    }

    if (materialId) {
      where.materialId = materialId
    }

    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    if (transactionType) {
      where.transactionType = transactionType
    }

    if (referenceType) {
      where.referenceType = referenceType
    }

    if (auditStatus) {
      where.auditStatus = auditStatus
    }

    if (startDate || endDate) {
      where.operationTime = {}
      if (startDate) {
        (where.operationTime as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        ;(where.operationTime as Record<string, Date>).lte = end
      }
    }

    const total = await prisma.packagingMaterialTransaction.count({ where })

    const transactions = await prisma.packagingMaterialTransaction.findMany({
      where,
      select: {
        id: true,
        warehouseId: true,
        materialId: true,
        materialCode: true,
        materialName: true,
        transactionType: true,
        quantityChange: true,
        quantityBefore: true,
        quantityAfter: true,
        referenceType: true,
        referenceNumber: true,
        operatorId: true,
        operatorName: true,
        operationTime: true,
        auditStatus: true,
        notes: true,
        createdAt: true,
      },
      orderBy: { [sortBy!]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // 统计汇总
    const inboundCount = await prisma.packagingMaterialTransaction.count({
      where: {
        ...where,
        quantityChange: { gt: 0 },
      },
    })

    const outboundCount = await prisma.packagingMaterialTransaction.count({
      where: {
        ...where,
        quantityChange: { lt: 0 },
      },
    })

    const summary = {
      total,
      inboundCount,
      outboundCount,
    }

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      summary,
    })
  } catch (error) {
    console.error('获取包材流水列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取包材流水列表失败' },
      { status: 500 }
    )
  }
})
