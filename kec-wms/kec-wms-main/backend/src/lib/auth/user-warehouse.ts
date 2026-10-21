import { prisma } from '@/lib/db/prisma'

export const WMS_WAREHOUSE_HEADER = 'x-wms-warehouse-id'
export const WMS_TERMINAL_HEADER = 'x-wms-terminal-type'

export type TerminalType = 'WEB' | 'PDA'

export interface UserWarehouseBinding {
  id: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  isDefault: boolean
  isActive: boolean
}

type WarehouseScopedUser =
  | {
      id?: string
      tenantId?: string
      username?: string
      warehouseId?: string | null
    }
  | null
  | undefined

export function resolveScopedWarehouseId(
  user: WarehouseScopedUser,
  requestedWarehouseId?: string | null
): string | undefined {
  const currentWarehouseId =
    user &&
    typeof user === 'object' &&
    'warehouseId' in user &&
    typeof user.warehouseId === 'string' &&
    user.warehouseId.trim()
      ? user.warehouseId.trim()
      : undefined

  return currentWarehouseId || requestedWarehouseId || undefined
}

const WAREHOUSE_SCOPED_API_PREFIXES = [
  '/api/v1/asn',
  '/api/v1/bin-locations',
  '/api/v1/checkout',
  '/api/v1/containers',
  '/api/v1/inventory',
  '/api/v1/manifest-orders',
  '/api/v1/outbound-orders',
  '/api/v1/pick-assignment-rules',
  '/api/v1/pick-orders',
  '/api/v1/picker-profiles',
  '/api/v1/putaway',
  '/api/v1/returns',
  '/api/v1/reports',
  '/api/v1/shelving',
  '/api/v1/sorting-walls',
  '/api/v1/wave-strategies',
  '/api/v1/wave-strategy-runs',
  '/api/v1/waves',
  '/api/v1/zones',
  '/api/pda/v1/asn',
  '/api/pda/v1/checkout',
  '/api/pda/v1/inventory',
  '/api/pda/v1/manifest',
  '/api/pda/v1/outbound',
  '/api/pda/v1/putaway',
  '/api/pda/v1/shelving',
]

export function normalizeTerminalType(value: string | null | undefined): TerminalType | undefined {
  if (!value) return undefined

  const normalized = value.trim().toUpperCase()
  if (normalized === 'WEB' || normalized === 'PDA') {
    return normalized
  }

  return undefined
}

export function isWarehouseScopedApiPath(pathname: string): boolean {
  return WAREHOUSE_SCOPED_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function listUserWarehouseBindings(
  tenantId: string,
  userId: string
): Promise<UserWarehouseBinding[]> {
  const bindings = await prisma.userWarehouse.findMany({
    where: {
      tenantId,
      userId,
      isActive: true,
      warehouse: {
        status: 'ACTIVE',
      },
    },
    select: {
      id: true,
      warehouseId: true,
      isDefault: true,
      isActive: true,
      warehouse: {
        select: {
          warehouseCode: true,
          warehouseName: true,
        },
      },
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'asc' },
    ],
  })

  return bindings.map((binding) => ({
    id: binding.id,
    warehouseId: binding.warehouseId,
    warehouseCode: binding.warehouse.warehouseCode,
    warehouseName: binding.warehouse.warehouseName,
    isDefault: binding.isDefault,
    isActive: binding.isActive,
  }))
}

export function getDefaultWarehouseId(bindings: UserWarehouseBinding[]): string | null {
  return bindings.find((binding) => binding.isDefault)?.warehouseId || bindings[0]?.warehouseId || null
}
