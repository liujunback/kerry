import { prisma } from '@/lib/db/prisma'
import type { TransactionClient } from '@/lib/db/prisma'
import type { PickAssignmentRuleConfigInput, PickAssignmentStrategyType } from '@/lib/validations/pick-assignment'

const DEFAULT_LOAD_STATUSES = ['PENDING', 'IN_PROGRESS'] as const

type DbClient = TransactionClient | typeof prisma

type AssignPickOrderParams = {
  tenantId: string
  pickOrderId: string
  operatorId?: string | null
  db?: DbClient
}

type CandidateProfile = {
  id: string
  userId: string
  sequenceNo: number
  maxActiveTasks: number
  zoneIds: string[]
  activeTaskCount: number
}

type RuleConfig = PickAssignmentRuleConfigInput

type AssignPickOrderResult = {
  assigned: boolean
  pickOrderId: string
  assignedUserId: string | null
  pickerProfileId: string | null
  assignmentSource: 'AUTO_RULE' | null
  assignmentStrategyType: PickAssignmentStrategyType | null
  reason?: string
}

type PickOrderContext = Awaited<ReturnType<typeof getPickOrderContext>>

function getDbClient(db?: DbClient) {
  return db ?? prisma
}

function normalizeRuleConfig(configJson: unknown): RuleConfig | null {
  if (!configJson || typeof configJson !== 'object') {
    return null
  }

  const config = configJson as Partial<RuleConfig>
  const includeTaskStatusesInLoad = Array.isArray(config.includeTaskStatusesInLoad)
    ? config.includeTaskStatusesInLoad.filter((status): status is 'PENDING' | 'IN_PROGRESS' => status === 'PENDING' || status === 'IN_PROGRESS')
    : [...DEFAULT_LOAD_STATUSES]

  const strategyType = config.strategyType
  if (strategyType !== 'ROUND_ROBIN' && strategyType !== 'LEAST_ACTIVE_TASKS' && strategyType !== 'ZONE_FIRST') {
    return null
  }

  const fallbackStrategyType = config.fallbackStrategyType
  const normalizedFallback = fallbackStrategyType === 'ROUND_ROBIN' || fallbackStrategyType === 'LEAST_ACTIVE_TASKS' || fallbackStrategyType === 'ZONE_FIRST'
    ? fallbackStrategyType
    : undefined

  return {
    strategyType,
    fallbackStrategyType: normalizedFallback,
    areaMatchMode: config.areaMatchMode === 'STRICT' || config.areaMatchMode === 'IGNORE' ? config.areaMatchMode : 'PREFER',
    capacityCheckMode: config.capacityCheckMode === 'SOFT' ? 'SOFT' : 'STRICT',
    includeTaskStatusesInLoad: includeTaskStatusesInLoad.length > 0 ? includeTaskStatusesInLoad : [...DEFAULT_LOAD_STATUSES],
    assignAtCreation: config.assignAtCreation !== false,
  }
}

function buildOrderByActiveTasks(candidates: CandidateProfile[]) {
  return [...candidates].sort((left, right) => {
    if (left.activeTaskCount !== right.activeTaskCount) {
      return left.activeTaskCount - right.activeTaskCount
    }
    if (left.sequenceNo !== right.sequenceNo) {
      return left.sequenceNo - right.sequenceNo
    }
    return left.id.localeCompare(right.id)
  })
}

function buildRoundRobinOrder(
  candidates: CandidateProfile[],
  lastAssignedPickerProfileId?: string | null,
) {
  const ordered = [...candidates].sort((left, right) => {
    if (left.sequenceNo !== right.sequenceNo) {
      return left.sequenceNo - right.sequenceNo
    }
    return left.id.localeCompare(right.id)
  })

  if (!lastAssignedPickerProfileId) {
    return ordered
  }

  const lastAssignedIndex = ordered.findIndex((item) => item.id === lastAssignedPickerProfileId)
  if (lastAssignedIndex < 0) {
    return ordered
  }

  return [...ordered.slice(lastAssignedIndex + 1), ...ordered.slice(0, lastAssignedIndex + 1)]
}

function selectCandidateByStrategy(params: {
  strategyType: PickAssignmentStrategyType
  candidates: CandidateProfile[]
  fallbackCandidates?: CandidateProfile[]
  lastAssignedPickerProfileId?: string | null
}): CandidateProfile | null {
  const { strategyType, candidates, fallbackCandidates, lastAssignedPickerProfileId } = params

  if (strategyType === 'LEAST_ACTIVE_TASKS') {
    return buildOrderByActiveTasks(candidates)[0] ?? null
  }

  if (strategyType === 'ROUND_ROBIN') {
    return buildRoundRobinOrder(candidates, lastAssignedPickerProfileId)[0] ?? null
  }

  if (strategyType === 'ZONE_FIRST') {
    const preferred = buildOrderByActiveTasks(candidates)
    if (preferred.length > 0) {
      return preferred[0]
    }
    if (fallbackCandidates && fallbackCandidates.length > 0) {
      return buildOrderByActiveTasks(fallbackCandidates)[0] ?? null
    }
  }

  return null
}

async function getEnabledRule(db: DbClient, tenantId: string, warehouseId: string) {
  return db.pickAssignmentRule.findFirst({
    where: {
      tenantId,
      warehouseId,
      status: 'ENABLED',
    },
    orderBy: [
      { isDefault: 'desc' },
      { updatedAt: 'desc' },
    ],
    select: {
      id: true,
      configJson: true,
      lastAssignedPickerProfileId: true,
    },
  })
}

async function getPickOrderContext(db: DbClient, tenantId: string, pickOrderId: string) {
  const pickOrder = await db.pickOrder.findFirst({
    where: {
      id: pickOrderId,
      tenantId,
    },
    select: {
      id: true,
      warehouseId: true,
      assignedUserId: true,
      lines: {
        select: {
          location: {
            select: {
              zoneId: true,
            },
          },
        },
      },
    },
  })

  if (!pickOrder) {
    throw new Error('拣货单不存在')
  }

  return pickOrder
}

async function getPickOrderContexts(db: DbClient, tenantId: string, pickOrderIds: string[]) {
  const pickOrders = await db.pickOrder.findMany({
    where: {
      id: { in: pickOrderIds },
      tenantId,
    },
    select: {
      id: true,
      warehouseId: true,
      assignedUserId: true,
      lines: {
        select: {
          location: {
            select: {
              zoneId: true,
            },
          },
        },
      },
    },
  })

  return new Map(pickOrders.map((pickOrder) => [pickOrder.id, pickOrder]))
}

function resolvePrimaryZoneId(zoneIds: string[]): string | null {
  if (zoneIds.length === 0) return null

  const counter = new Map<string, number>()
  for (const zoneId of zoneIds) {
    counter.set(zoneId, (counter.get(zoneId) ?? 0) + 1)
  }

  let primaryZoneId: string | null = null
  let primaryCount = -1
  for (const [zoneId, count] of counter.entries()) {
    if (count > primaryCount) {
      primaryZoneId = zoneId
      primaryCount = count
      continue
    }

    if (count === primaryCount && primaryZoneId && zoneId.localeCompare(primaryZoneId) < 0) {
      primaryZoneId = zoneId
    }
  }

  return primaryZoneId
}

async function getCandidateProfiles(
  db: DbClient,
  tenantId: string,
  warehouseId: string,
  loadStatuses: Array<'PENDING' | 'IN_PROGRESS'>,
): Promise<CandidateProfile[]> {
  const profiles = await db.pickerProfile.findMany({
    where: {
      tenantId,
      warehouseId,
      isEnabled: true,
      user: {
        isActive: true,
        status: 'ACTIVE',
      },
    },
    select: {
      id: true,
      userId: true,
      sequenceNo: true,
      maxActiveTasks: true,
      zones: {
        select: {
          zoneId: true,
        },
      },
    },
    orderBy: [
      { sequenceNo: 'asc' },
      { createdAt: 'asc' },
    ],
  })

  if (profiles.length === 0) {
    return []
  }

  const activeCounts = await db.pickOrder.groupBy({
    by: ['assignedUserId'],
    where: {
      tenantId,
      warehouseId,
      assignedUserId: { in: profiles.map((profile) => profile.userId) },
      status: { in: loadStatuses },
    },
    _count: {
      _all: true,
    },
  })

  const activeCountMap = new Map(
    activeCounts
      .filter((item): item is typeof item & { assignedUserId: string } => Boolean(item.assignedUserId))
      .map((item) => [item.assignedUserId, item._count._all]),
  )

  return profiles.map((profile) => ({
    id: profile.id,
    userId: profile.userId,
    sequenceNo: profile.sequenceNo,
    maxActiveTasks: profile.maxActiveTasks,
    zoneIds: profile.zones.map((item) => item.zoneId),
    activeTaskCount: activeCountMap.get(profile.userId) ?? 0,
  }))
}

function applyCapacityRule(
  candidates: CandidateProfile[],
  capacityCheckMode: RuleConfig['capacityCheckMode'],
) {
  if (capacityCheckMode === 'SOFT') {
    return candidates
  }

  return candidates.filter((candidate) => candidate.activeTaskCount < candidate.maxActiveTasks)
}

export async function assignPickOrder(params: AssignPickOrderParams): Promise<AssignPickOrderResult> {
  const db = getDbClient(params.db)
  const pickOrder = await getPickOrderContext(db, params.tenantId, params.pickOrderId)

  if (pickOrder.assignedUserId) {
    return {
      assigned: true,
      pickOrderId: pickOrder.id,
      assignedUserId: pickOrder.assignedUserId,
      pickerProfileId: null,
      assignmentSource: null,
      assignmentStrategyType: null,
      reason: '拣货单已存在分配人',
    }
  }

  const rule = await getEnabledRule(db, params.tenantId, pickOrder.warehouseId)
  if (!rule) {
    return {
      assigned: false,
      pickOrderId: pickOrder.id,
      assignedUserId: null,
      pickerProfileId: null,
      assignmentSource: null,
      assignmentStrategyType: null,
      reason: '仓库未启用拣货分配规则',
    }
  }

  const config = normalizeRuleConfig(rule.configJson)
  if (!config || !config.assignAtCreation) {
    return {
      assigned: false,
      pickOrderId: pickOrder.id,
      assignedUserId: null,
      pickerProfileId: null,
      assignmentSource: null,
      assignmentStrategyType: null,
      reason: '拣货分配规则未启用自动分配',
    }
  }

  const primaryZoneId = resolvePrimaryZoneId(
    pickOrder.lines
      .map((line) => line.location.zoneId)
      .filter((zoneId): zoneId is string => Boolean(zoneId)),
  )

  const allCandidates = applyCapacityRule(
    await getCandidateProfiles(db, params.tenantId, pickOrder.warehouseId, [...config.includeTaskStatusesInLoad]),
    config.capacityCheckMode,
  )

  if (allCandidates.length === 0) {
    return {
      assigned: false,
      pickOrderId: pickOrder.id,
      assignedUserId: null,
      pickerProfileId: null,
      assignmentSource: null,
      assignmentStrategyType: null,
      reason: '没有可用的拣货员候选人',
    }
  }

  const zoneMatchedCandidates = primaryZoneId
    ? allCandidates.filter((candidate) => candidate.zoneIds.includes(primaryZoneId))
    : []

  let selectedCandidate: CandidateProfile | null = null
  let effectiveStrategyType: PickAssignmentStrategyType = config.strategyType

  if (config.strategyType === 'ZONE_FIRST') {
    if (zoneMatchedCandidates.length > 0) {
      selectedCandidate = selectCandidateByStrategy({
        strategyType: 'ZONE_FIRST',
        candidates: zoneMatchedCandidates,
      })
    } else if (config.areaMatchMode === 'STRICT') {
      return {
        assigned: false,
        pickOrderId: pickOrder.id,
        assignedUserId: null,
        pickerProfileId: null,
        assignmentSource: null,
        assignmentStrategyType: null,
        reason: '未找到负责主作业区域的拣货员',
      }
    } else if (config.fallbackStrategyType) {
      effectiveStrategyType = config.fallbackStrategyType
      selectedCandidate = selectCandidateByStrategy({
        strategyType: config.fallbackStrategyType,
        candidates: allCandidates,
        lastAssignedPickerProfileId: rule.lastAssignedPickerProfileId,
      })
    }
  } else {
    selectedCandidate = selectCandidateByStrategy({
      strategyType: config.strategyType,
      candidates: allCandidates,
      lastAssignedPickerProfileId: rule.lastAssignedPickerProfileId,
    })
  }

  if (!selectedCandidate) {
    return {
      assigned: false,
      pickOrderId: pickOrder.id,
      assignedUserId: null,
      pickerProfileId: null,
      assignmentSource: null,
      assignmentStrategyType: null,
      reason: '未能根据规则选出拣货员',
    }
  }

  const now = new Date()
  await db.pickOrder.update({
    where: { id: pickOrder.id },
    data: {
      assignedUserId: selectedCandidate.userId,
      assignedAt: now,
      assignmentSource: 'AUTO_RULE',
      assignmentStrategyType: effectiveStrategyType,
      updatedBy: params.operatorId || undefined,
    },
  })

  if (effectiveStrategyType === 'ROUND_ROBIN') {
    await db.pickAssignmentRule.update({
      where: { id: rule.id },
      data: {
        lastAssignedPickerProfileId: selectedCandidate.id,
        lastAssignedAt: now,
        updatedBy: params.operatorId || undefined,
      },
    })
  }

  return {
    assigned: true,
    pickOrderId: pickOrder.id,
    assignedUserId: selectedCandidate.userId,
    pickerProfileId: selectedCandidate.id,
    assignmentSource: 'AUTO_RULE',
    assignmentStrategyType: effectiveStrategyType,
  }
}

export async function assignPickOrdersBatch(params: {
  tenantId: string
  pickOrderIds: string[]
  operatorId?: string | null
  db?: DbClient
}) {
  const db = getDbClient(params.db)
  const pickOrderIds = Array.from(new Set(params.pickOrderIds))
  if (pickOrderIds.length === 0) {
    return [] as AssignPickOrderResult[]
  }

  const pickOrderContextMap = await getPickOrderContexts(db, params.tenantId, pickOrderIds)
  const orderedPickOrders = pickOrderIds.map((pickOrderId) => pickOrderContextMap.get(pickOrderId))
  const missingPickOrderId = orderedPickOrders.findIndex((pickOrder) => !pickOrder)
  if (missingPickOrderId >= 0) {
    throw new Error('拣货单不存在')
  }

  const pickOrders = orderedPickOrders as PickOrderContext[]
  const pickOrdersByWarehouse = new Map<string, PickOrderContext[]>()
  for (const pickOrder of pickOrders) {
    const group = pickOrdersByWarehouse.get(pickOrder.warehouseId) || []
    group.push(pickOrder)
    pickOrdersByWarehouse.set(pickOrder.warehouseId, group)
  }

  const results: AssignPickOrderResult[] = []
  for (const [warehouseId, warehousePickOrders] of pickOrdersByWarehouse.entries()) {
    const rule = await getEnabledRule(db, params.tenantId, warehouseId)
    if (!rule) {
      results.push(...warehousePickOrders.map((pickOrder) => ({
        assigned: false,
        pickOrderId: pickOrder.id,
        assignedUserId: null,
        pickerProfileId: null,
        assignmentSource: null,
        assignmentStrategyType: null,
        reason: '仓库未启用拣货分配规则',
      })))
      continue
    }

    const config = normalizeRuleConfig(rule.configJson)
    if (!config || !config.assignAtCreation) {
      results.push(...warehousePickOrders.map((pickOrder) => ({
        assigned: false,
        pickOrderId: pickOrder.id,
        assignedUserId: null,
        pickerProfileId: null,
        assignmentSource: null,
        assignmentStrategyType: null,
        reason: '拣货分配规则未启用自动分配',
      })))
      continue
    }

    const allCandidates = applyCapacityRule(
      await getCandidateProfiles(db, params.tenantId, warehouseId, [...config.includeTaskStatusesInLoad]),
      config.capacityCheckMode,
    )
    if (allCandidates.length === 0) {
      results.push(...warehousePickOrders.map((pickOrder) => ({
        assigned: false,
        pickOrderId: pickOrder.id,
        assignedUserId: null,
        pickerProfileId: null,
        assignmentSource: null,
        assignmentStrategyType: null,
        reason: '没有可用的拣货员候选人',
      })))
      continue
    }

    const mutableCandidates = allCandidates.map((candidate) => ({ ...candidate }))
    let lastAssignedPickerProfileId = rule.lastAssignedPickerProfileId
    let roundRobinRuleUpdated = false

    for (const pickOrder of warehousePickOrders) {
      if (pickOrder.assignedUserId) {
        results.push({
          assigned: true,
          pickOrderId: pickOrder.id,
          assignedUserId: pickOrder.assignedUserId,
          pickerProfileId: null,
          assignmentSource: null,
          assignmentStrategyType: null,
          reason: '拣货单已存在分配人',
        })
        continue
      }

      const primaryZoneId = resolvePrimaryZoneId(
        pickOrder.lines
          .map((line) => line.location.zoneId)
          .filter((zoneId): zoneId is string => Boolean(zoneId)),
      )

      const zoneMatchedCandidates = primaryZoneId
        ? mutableCandidates.filter((candidate) => candidate.zoneIds.includes(primaryZoneId))
        : []

      let selectedCandidate: CandidateProfile | null = null
      let effectiveStrategyType: PickAssignmentStrategyType = config.strategyType

      if (config.strategyType === 'ZONE_FIRST') {
        if (zoneMatchedCandidates.length > 0) {
          selectedCandidate = selectCandidateByStrategy({
            strategyType: 'ZONE_FIRST',
            candidates: zoneMatchedCandidates,
          })
        } else if (config.areaMatchMode === 'STRICT') {
          results.push({
            assigned: false,
            pickOrderId: pickOrder.id,
            assignedUserId: null,
            pickerProfileId: null,
            assignmentSource: null,
            assignmentStrategyType: null,
            reason: '未找到负责主作业区域的拣货员',
          })
          continue
        } else if (config.fallbackStrategyType) {
          effectiveStrategyType = config.fallbackStrategyType
          selectedCandidate = selectCandidateByStrategy({
            strategyType: config.fallbackStrategyType,
            candidates: mutableCandidates,
            lastAssignedPickerProfileId,
          })
        }
      } else {
        selectedCandidate = selectCandidateByStrategy({
          strategyType: config.strategyType,
          candidates: mutableCandidates,
          lastAssignedPickerProfileId,
        })
      }

      if (!selectedCandidate) {
        results.push({
          assigned: false,
          pickOrderId: pickOrder.id,
          assignedUserId: null,
          pickerProfileId: null,
          assignmentSource: null,
          assignmentStrategyType: null,
          reason: '未能根据规则选出拣货员',
        })
        continue
      }

      const now = new Date()
      await db.pickOrder.update({
        where: { id: pickOrder.id },
        data: {
          assignedUserId: selectedCandidate.userId,
          assignedAt: now,
          assignmentSource: 'AUTO_RULE',
          assignmentStrategyType: effectiveStrategyType,
          updatedBy: params.operatorId || undefined,
        },
      })

      selectedCandidate.activeTaskCount += 1
      if (effectiveStrategyType === 'ROUND_ROBIN') {
        lastAssignedPickerProfileId = selectedCandidate.id
        roundRobinRuleUpdated = true
      }

      results.push({
        assigned: true,
        pickOrderId: pickOrder.id,
        assignedUserId: selectedCandidate.userId,
        pickerProfileId: selectedCandidate.id,
        assignmentSource: 'AUTO_RULE',
        assignmentStrategyType: effectiveStrategyType,
      })
    }

    if (roundRobinRuleUpdated) {
      await db.pickAssignmentRule.update({
        where: { id: rule.id },
        data: {
          lastAssignedPickerProfileId,
          lastAssignedAt: new Date(),
          updatedBy: params.operatorId || undefined,
        },
      })
    }
  }
  return results
}

export type { AssignPickOrderResult }
