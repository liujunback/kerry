import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { BucketType } from '@/lib/services/inventory-event-service'
import { extractInventoryCountLockMessage } from '@/lib/services/inventory-count-lock-guard'
import { freeze } from '@/lib/services/inventory-operation-service'
import { createFreezeSchema,freezeListQuerySchema } from '@/lib/validations/inventory'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { Prisma } from '@prisma/client'
import { NextRequest,NextResponse } from 'next/server'

// GET /api/v1/inventory/freezes - 获取冻结库存列表
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = freezeListQuerySchema.parse(searchParams)
    const warehouseId = resolveScopedWarehouseId(auth.user, query.warehouseId)

    const where: Prisma.InventoryBucketWhereInput = {
      tenantId: auth.user.tenantId,
      bucketType: BucketType.FROZEN,
      quantity: { gt: 0 },
    }

    if (warehouseId) {
      where.warehouseId = warehouseId
    }
    if (query.search) {
      where.OR = [
        { sku: { skuCode: { contains: query.search } } },
        { sku: { skuName: { contains: query.search } } },
      ]
    }

    const [freezes, total] = await Promise.all([
      prisma.inventoryBucket.findMany({
        where,
        include: {
          warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
          sku: { select: { id: true, skuCode: true, skuName: true } },
          location: { select: { id: true, locationCode: true } },
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.inventoryBucket.count({ where }),
    ])

    return NextResponse.json({
      data: freezes,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    })
  } catch (error) {
    console.error('Error fetching freezes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch freezes' },
      { status: 500 }
    )
  }
})

// POST /api/v1/inventory/freezes - 创建冻结
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const data = createFreezeSchema.parse(body)
    const warehouseId = resolveScopedWarehouseId(auth.user, data.warehouseId) || data.warehouseId

    // 执行冻结 - 使用新的 freeze 函数
    const results = await prisma.$transaction(async (tx) => {
      const freezeResults = []

      for (const line of data.lines) {
        // 获取 SKU 信息
        const sku = await tx.sku.findUnique({
          where: { id: line.skuId },
          select: { skuCode: true, clientId: true },
        })

        if (!sku) {
          throw new Error(`SKU not found: ${line.skuId}`)
        }

        const result = await freeze({
          tenantId: auth.user.tenantId,
          clientId: sku.clientId,
          warehouseId,
          locationId: line.locationId,
          skuId: line.skuId,
          skuCode: sku.skuCode,
          quantity: line.quantity,
          batchNumber: line.batchNumber,
          lpn: line.lpn,
          asnNumber: line.asnNumber,
          expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
          reasonCode: data.freezeType,
          reasonDescription: line.reason || data.reason,
          referenceType: 'FREEZE',
          operatorId: auth.user.id,
        }, tx)

        freezeResults.push({
          skuId: line.skuId,
          locationId: line.locationId,
          quantity: line.quantity,
          ...result,
        })
      }

      return freezeResults
    })

    return NextResponse.json({ data: results }, { status: 201 })
  } catch (error) {
    const countLockMessage = extractInventoryCountLockMessage(error)
    if (countLockMessage) {
      return NextResponse.json(
        { error: countLockMessage },
        { status: 400 }
      )
    }

    console.error('Error creating freeze:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create freeze' },
      { status: 500 }
    )
  }
})
