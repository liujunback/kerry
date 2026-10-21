import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import type { AuthUser } from '@/lib/auth/middleware'
import type { InventoryCountOrderContext } from '@/lib/services/inventory-count/scope-generation'

export function buildInventoryCountScopedWhere(
  authUser: AuthUser,
  warehouseId?: string
): Prisma.InventoryCountOrderWhereInput {
  const where: Prisma.InventoryCountOrderWhereInput = {
    tenantId: authUser.tenantId,
  }

  if (warehouseId) {
    where.warehouseId = warehouseId
  }

  return where
}

export async function loadInventoryCountOrderContext(
  authUser: AuthUser,
  id: string,
  warehouseId?: string
) {
  const order = await prisma.inventoryCountOrder.findFirst({
    where: {
      ...buildInventoryCountScopedWhere(authUser, warehouseId),
      id,
    },
    select: {
      id: true,
      tenantId: true,
      orderNumber: true,
      warehouseId: true,
      warehouseName: true,
      orderType: true,
      countMode: true,
      status: true,
      ownerScopeMode: true,
      ownerScopeConfigJson: true,
      scopeConfigJson: true,
      executionConfigJson: true,
    },
  })

  if (!order) {
    throw new Error('盘点单不存在')
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id: order.warehouseId,
      tenantId: authUser.tenantId,
    },
    select: {
      warehouseCode: true,
    },
  })

  if (!warehouse) {
    throw new Error('仓库不存在')
  }

  return {
    ...order,
    warehouseCode: warehouse.warehouseCode,
  } satisfies InventoryCountOrderContext
}
