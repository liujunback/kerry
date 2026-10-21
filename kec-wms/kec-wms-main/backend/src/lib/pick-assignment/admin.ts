import type { AuthUser } from '@/lib/auth/middleware'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { pickAssignmentRuleConfigSchema } from '@/lib/validations/pick-assignment'
import { Prisma } from '@prisma/client'

export const pickAssignmentRuleSelect = Prisma.validator<Prisma.PickAssignmentRuleSelect>()({
  id: true,
  warehouseId: true,
  ruleCode: true,
  ruleName: true,
  description: true,
  status: true,
  isDefault: true,
  configJson: true,
  lastAssignedAt: true,
  createdAt: true,
  updatedAt: true,
  warehouse: {
    select: {
      id: true,
      warehouseCode: true,
      warehouseName: true,
    },
  },
  lastAssignedPickerProfile: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          username: true,
          fullName: true,
          employeeId: true,
        },
      },
    },
  },
})

export const pickerProfileSelect = Prisma.validator<Prisma.PickerProfileSelect>()({
  id: true,
  warehouseId: true,
  userId: true,
  maxActiveTasks: true,
  sequenceNo: true,
  isEnabled: true,
  allowPdaExecution: true,
  createdAt: true,
  updatedAt: true,
  warehouse: {
    select: {
      id: true,
      warehouseCode: true,
      warehouseName: true,
    },
  },
  user: {
    select: {
      id: true,
      username: true,
      fullName: true,
      employeeId: true,
      status: true,
      isActive: true,
    },
  },
  zones: {
    select: {
      zoneId: true,
      zone: {
        select: {
          id: true,
          zoneCode: true,
          zoneName: true,
          zoneType: true,
        },
      },
    },
    orderBy: {
      zone: {
        zoneCode: 'asc',
      },
    },
  },
})

type PickAssignmentRuleRecord = Prisma.PickAssignmentRuleGetPayload<{
  select: typeof pickAssignmentRuleSelect
}>

type PickerProfileRecord = Prisma.PickerProfileGetPayload<{
  select: typeof pickerProfileSelect
}>

export function resolveRequiredWarehouseId(
  authUser: AuthUser,
  requestedWarehouseId?: string | null,
): string | null {
  return resolveScopedWarehouseId(authUser, requestedWarehouseId) ?? null
}

export async function ensureWarehouseBelongsToTenant(tenantId: string, warehouseId: string) {
  return prisma.warehouse.findFirst({
    where: {
      id: warehouseId,
      tenantId,
    },
    select: {
      id: true,
      warehouseCode: true,
      warehouseName: true,
      status: true,
    },
  })
}

export async function ensureEligiblePickerUser(params: {
  tenantId: string
  warehouseId: string
  userId: string
}) {
  const { tenantId, warehouseId, userId } = params
  return prisma.user.findFirst({
    where: {
      id: userId,
      tenantId,
      status: 'ACTIVE',
      isActive: true,
      userWarehouses: {
        some: {
          warehouseId,
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      employeeId: true,
    },
  })
}

export async function ensureZonesInWarehouse(params: {
  tenantId: string
  warehouseId: string
  zoneIds: string[]
}) {
  const uniqueZoneIds = [...new Set(params.zoneIds)]
  if (uniqueZoneIds.length === 0) {
    return []
  }

  return prisma.zone.findMany({
    where: {
      tenantId: params.tenantId,
      warehouseId: params.warehouseId,
      id: { in: uniqueZoneIds },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      zoneCode: true,
      zoneName: true,
      zoneType: true,
    },
    orderBy: {
      zoneCode: 'asc',
    },
  })
}

export function serializePickAssignmentRule(rule: PickAssignmentRuleRecord) {
  const parsedConfig = pickAssignmentRuleConfigSchema.safeParse(rule.configJson)

  return {
    id: rule.id,
    warehouseId: rule.warehouseId,
    ruleCode: rule.ruleCode,
    ruleName: rule.ruleName,
    description: rule.description,
    status: rule.status,
    isDefault: rule.isDefault,
    config: parsedConfig.success ? parsedConfig.data : rule.configJson,
    lastAssignedAt: rule.lastAssignedAt,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
    warehouse: rule.warehouse,
    lastAssignedPickerProfile: rule.lastAssignedPickerProfile
      ? {
          id: rule.lastAssignedPickerProfile.id,
          userId: rule.lastAssignedPickerProfile.userId,
          username: rule.lastAssignedPickerProfile.user.username,
          fullName: rule.lastAssignedPickerProfile.user.fullName,
          employeeId: rule.lastAssignedPickerProfile.user.employeeId,
        }
      : null,
  }
}

export function serializePickerProfile(
  profile: PickerProfileRecord,
  activeTaskCount = 0,
) {
  return {
    id: profile.id,
    warehouseId: profile.warehouseId,
    userId: profile.userId,
    maxActiveTasks: profile.maxActiveTasks,
    sequenceNo: profile.sequenceNo,
    isEnabled: profile.isEnabled,
    allowPdaExecution: profile.allowPdaExecution,
    activeTaskCount,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    warehouse: profile.warehouse,
    user: profile.user,
    zones: profile.zones.map((item) => ({
      zoneId: item.zoneId,
      zone: item.zone,
    })),
  }
}
