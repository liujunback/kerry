import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { BucketType } from '@/lib/services/inventory-event-service'
import { createTransferSchema, transferListQuerySchema, TransferStatus } from '@/lib/validations/inventory'
import { NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// GET /api/v1/inventory/transfers
export const GET = createAuthHandler(async (request, { user }) => {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams)
  const query = transferListQuerySchema.parse(searchParams)
  const warehouseId = resolveScopedWarehouseId(user, query.warehouseId)

  const where: Record<string, unknown> = {
    tenantId: user.tenantId,
  }

  if (warehouseId) where.warehouseId = warehouseId
  if (query.status) where.status = query.status
  if (query.transferType) where.transferType = query.transferType
  if (query.search) {
    where.OR = [
      { transferNumber: { contains: query.search } },
      { reason: { contains: query.search } },
    ]
  }

  const [transfers, total] = await Promise.all([
    prisma.inventoryTransfer.findMany({
      where,
      include: {
        warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.inventoryTransfer.count({ where }),
  ])

  return NextResponse.json({
    data: transfers,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  })
})

// POST /api/v1/inventory/transfers
export const POST = createAuthHandler(async (request, { user }) => {
  const body = await request.json()
  const data = createTransferSchema.parse(body)
  const warehouseId = resolveScopedWarehouseId(user, data.warehouseId) || data.warehouseId

  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.inventoryTransfer.count({
    where: {
      tenantId: user.tenantId,
      transferNumber: { startsWith: `TRF${dateStr}` },
    },
  })
  const transferNumber = `TRF${dateStr}${String(count + 1).padStart(4, '0')}`

  for (const line of data.lines) {
    if (line.sourceLocationId === line.targetLocationId) {
      return NextResponse.json(
        { error: 'Source and target location cannot be the same' },
        { status: 400 }
      )
    }

    const sourceBucket = await prisma.inventoryBucket.findFirst({
      where: {
        tenantId: user.tenantId,
        warehouseId,
        skuId: line.skuId,
        locationId: line.sourceLocationId,
        batchNumber: line.batchNumber || undefined,
        bucketType: BucketType.AVAILABLE,
      },
    })

    if (!sourceBucket || sourceBucket.quantity < line.quantity) {
      return NextResponse.json(
        { error: 'Insufficient quantity in source location' },
        { status: 400 }
      )
    }
  }

  const transfer = await prisma.inventoryTransfer.create({
    data: {
      tenantId: user.tenantId,
      warehouseId,
      transferNumber,
      transferType: data.transferType,
      reason: data.reason,
      notes: data.notes,
      status: TransferStatus.DRAFT,
      totalItems: data.lines.length,
      totalQuantity: data.lines.reduce((sum, line) => sum + line.quantity, 0),
      createdByUserId: user.id,
      createdBy: user.id,
      lines: {
        create: data.lines.map((line, index) => ({
          tenantId: user.tenantId,
          lineNumber: index + 1,
          skuId: line.skuId,
          sourceLocationId: line.sourceLocationId,
          targetLocationId: line.targetLocationId,
          batchNumber: line.batchNumber,
          quantity: line.quantity,
          reason: line.reason,
        })),
      },
    },
    include: {
      warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
      lines: {
        include: {
          sku: { select: { id: true, skuCode: true, skuName: true } },
          sourceLocation: { select: { id: true, locationCode: true } },
          targetLocation: { select: { id: true, locationCode: true } },
        },
      },
    },
  })

  return NextResponse.json({ data: transfer }, { status: 201 })
})
