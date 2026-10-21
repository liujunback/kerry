import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { createHandler } from '@/lib/api/create-handler'

// GET /api/v1/shelving/container
export const GET = createHandler(async (request) => {
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const { user } = authResult
  const searchParams = request.nextUrl.searchParams
  const containerCode = searchParams.get('containerCode')
  const warehouseId = resolveScopedWarehouseId(user, searchParams.get('warehouseId'))

  if (!containerCode) {
    return NextResponse.json(
      { success: false, message: '容器编码不能为空' },
      { status: 400 }
    )
  }

  const where: Record<string, unknown> = {
    tenantId: user.tenantId,
    containerCode,
  }

  if (warehouseId && warehouseId.trim()) {
    where.warehouseId = warehouseId
  }

  const container = await prisma.container.findFirst({
    where,
    select: {
      id: true,
      containerCode: true,
      containerType: true,
      workStatus: true,
      warehouseId: true,
    },
  })

  if (!container) {
    return NextResponse.json(
      { success: false, message: '容器不存在', code: 'CONTAINER_NOT_FOUND' },
      { status: 404 }
    )
  }

  const containerItemCount = await prisma.containerItem.count({
    where: {
      containerId: container.id,
      quantity: { gt: 0 },
    },
  })

  if (containerItemCount === 0) {
    return NextResponse.json(
      { success: false, message: '容器为空，无法上架', code: 'CONTAINER_EMPTY' },
      { status: 400 }
    )
  }

  const containerItems = await prisma.containerItem.findMany({
    where: {
      containerId: container.id,
      quantity: { gt: 0 },
    },
    orderBy: {
      receivedAt: 'desc',
    },
  })

  const skuIds = [...new Set(containerItems.map((item) => item.skuId))]
  const skus = await prisma.sku.findMany({
    where: { id: { in: skuIds } },
    select: {
      id: true,
      skuCode: true,
      skuName: true,
      barcode: true,
      isSerialManaged: true,
    },
  })
  const skuMap = new Map(skus.map((sku) => [sku.id, sku]))

  const serialManagedSkuIds = skus
    .filter((sku) => sku.isSerialManaged)
    .map((sku) => sku.id)

  const serialNumbers =
    serialManagedSkuIds.length > 0
      ? await prisma.serialNumber.findMany({
          where: {
            skuId: { in: serialManagedSkuIds },
            status: 'IN_STOCK',
            receivedAsnId: { in: containerItems.map((item) => item.asnId) },
            putawayAt: null,
          },
          select: {
            serialNumber: true,
            skuId: true,
          },
        })
      : []

  const serialMap = new Map<string, string[]>()
  for (const serialNumber of serialNumbers) {
    const existing = serialMap.get(serialNumber.skuId) || []
    existing.push(serialNumber.serialNumber)
    serialMap.set(serialNumber.skuId, existing)
  }

  const items = containerItems.map((item) => {
    const sku = skuMap.get(item.skuId)
    const itemSerials = serialMap.get(item.skuId) || []

    return {
      id: item.id,
      skuId: item.skuId,
      skuCode: item.skuCode,
      skuName: sku?.skuName || item.skuName,
      barcode: sku?.barcode || null,
      quantity: item.quantity,
      availableQty: item.quantity,
      batchNumber: item.batchNumber,
      qualityStatus: item.qualityType,
      isSerialManaged: sku?.isSerialManaged || false,
      serialNumbers: itemSerials,
    }
  })

  return NextResponse.json({
    success: true,
    data: {
      container: {
        id: container.id,
        containerCode: container.containerCode,
        containerType: container.containerType,
        workStatus: container.workStatus,
        warehouseId: container.warehouseId,
      },
      items,
    },
  })
})
