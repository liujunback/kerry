import { prisma } from '@/lib/db/prisma'
import { randomUUID } from 'crypto'
import {
  getWaveStrategyExecutionLockKey,
  withLock,
} from '@/lib/db/distributed-lock'
import type { ProgressUpdate } from '@/lib/queue/types'
import { releaseWave } from '@/lib/services/wave-release-service'
import {
  enqueuePendingImmediateWaveReleaseJobsForRun,
  enqueueWaveReleaseJobs,
} from '@/lib/services/wave-release-job-service'
import {
  enqueueWaveStrategyExecutionJob,
  findWaveStrategyExecutionJobByRunId,
} from '@/lib/services/wave-strategy-execution-job-service'
import {
  acquireOrderExecutionLocksIndividually,
} from '@/lib/services/order-execution-lock-service'
import type {
  ExecuteWaveStrategyInput,
  SimulateWaveStrategyInput,
  WaveStrategyRuleSetInput,
} from '@/lib/validations/wave-strategy'

type StrategyVersionWithRules = {
  id: string
  versionNo: number
  configSnapshot: unknown
  ruleSet: {
    triggerConfigJson: unknown
    filterConfigJson: unknown
    executionConfigJson: unknown
    waveTypeConfigJson: unknown
    pickConfigJson: unknown
    releaseConfigJson: unknown
  } | null
}

type StrategyExecutionContext = {
  strategy: {
    id: string
    tenantId: string
    warehouseId: string
    warehouseCode: string
    strategyCode: string
    strategyName: string
    priority: number
    status: string
  }
  version: StrategyVersionWithRules
  rules: WaveStrategyRuleSetInput
}

type WaveStrategyRunOrderPayload = {
  tenantId: string
  runId: string
  orderId: string
  batchNo: number
  matchedStrategy: boolean
  claimedByStrategyId?: string
  waveTypeCode?: string
  pickMode?: string
  downstreamMode?: string
  resultStatus: string
  waveId?: string
  message?: string
  matchedRuleSnapshot?: Record<string, unknown>
}

const manualExecuteRunningTimeoutMinutes = Math.max(
  Number(process.env.WAVE_STRATEGY_MANUAL_EXECUTE_TIMEOUT_MINUTES) || 120,
  1
)

const waveStrategyExecutePageSize = Math.max(
  Number(process.env.WAVE_STRATEGY_EXECUTE_PAGE_SIZE) || 500,
  100
)
const waveStrategyExecuteRunOrderChunkSize = Math.max(
  Number(process.env.WAVE_STRATEGY_EXECUTE_RUN_ORDER_CHUNK_SIZE) || 500,
  100
)
const waveStrategyExecuteWaveChunkSize = Math.max(
  Number(process.env.WAVE_STRATEGY_EXECUTE_WAVE_CHUNK_SIZE) || 20,
  1
)
const waveStrategyExecuteClaimChunkSize = Math.max(
  Number(process.env.WAVE_STRATEGY_EXECUTE_CLAIM_CHUNK_SIZE) || 200,
  50
)
const waveStrategyExecuteReleaseChunkSize = Math.max(
  Number(process.env.WAVE_STRATEGY_EXECUTE_RELEASE_CHUNK_SIZE) || 10,
  1
)

export class WaveStrategyRunAlreadyRunningError extends Error {
  runId: string
  startedAt: Date | string

  constructor(runId: string, startedAt: Date | string) {
    super(`该策略已有手动执行任务正在运行，请先查看运行日志：${runId}`)
    this.name = 'WaveStrategyRunAlreadyRunningError'
    this.runId = runId
    this.startedAt = startedAt
  }
}

type CandidateOrder = Awaited<ReturnType<typeof fetchCandidateOrders>>['orders'][number]
type CandidateOrderHeader = Awaited<ReturnType<typeof fetchCandidateOrderHeaders>>['orders'][number]
type FilterableOrder = Pick<
  CandidateOrderHeader,
  'id' | 'clientId' | 'platform' | 'shippingMethod' | 'orderBusinessType' | 'timeline'
>

type ClassifiedOrder = {
  order: CandidateOrder
  batchNo: number
  waveTypeCode: string
  groupingKey: string
  pickMode: string
  downstreamMode: string
  matchedRuleSnapshot: Record<string, unknown>
}

type PlannedWave = {
  batchNo: number
  waveTypeCode: WaveStrategyRuleSetInput['waveTypeConfig'][number]['code']
  items: ClassifiedOrder[]
}

const waveTypeExecutionOrder: Array<WaveStrategyRuleSetInput['waveTypeConfig'][number]['code']> = [
  'SINGLE_ONE_HOT',
  'SINGLE_MULTI_HOT',
  'SINGLE_ONE_NORMAL',
  'SINGLE_MULTI_NORMAL',
  'MULTI_FIXED_COMBO',
  'MULTI_NON_FIXED',
]

const waveExecutionTransactionOptions = {
  maxWait: 10000,
  timeout: 15000,
} as const

function getWaveTypeExecutionWeight(code: string) {
  const index = waveTypeExecutionOrder.indexOf(code as WaveStrategyRuleSetInput['waveTypeConfig'][number]['code'])
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER
}

function getLegacyOrdersPerWave(config?: WaveStrategyRuleSetInput['waveTypeConfig'][number]) {
  const legacyValue = Number((config as { ordersPerWave?: unknown } | undefined)?.ordersPerWave)
  return Number.isFinite(legacyValue) && legacyValue > 0 ? Math.trunc(legacyValue) : 0
}

function getWaveMinOrders(config?: WaveStrategyRuleSetInput['waveTypeConfig'][number]) {
  const configuredMin = Number(config?.minOrdersPerWave) || getLegacyOrdersPerWave(config)
  return Math.max(configuredMin, 1)
}

function getWaveMaxOrders(config?: WaveStrategyRuleSetInput['waveTypeConfig'][number]) {
  const configuredMax = Number(config?.maxOrdersPerWave) || getLegacyOrdersPerWave(config)
  return Math.max(configuredMax, getWaveMinOrders(config))
}

function buildClassifiedGroupKey(item: Pick<ClassifiedOrder, 'waveTypeCode' | 'groupingKey'>) {
  return `${item.waveTypeCode}:${item.groupingKey}`
}

function buildWaveNumberPrefix(warehouseCode: string) {
  const today = new Date()
  const dateStr = today
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, '')
  return `WV-${warehouseCode}-${dateStr}-`
}

type FilterCondition = {
  id: string
  groupNo: number
  logicOp: 'AND' | 'OR'
  fieldCode: 'orderBusinessType' | 'platform' | 'shippingMethod' | 'clientId' | 'zoneId' | 'expectedOutboundTime'
  value: string
  valueTo?: string
}
type ReasonMessageParams = Record<string, string | number>
type FilterConditionMatch = {
  matched: boolean
  fieldCode: FilterCondition['fieldCode']
  value: string
  valueTo?: string
  actualValue?: string
  reasonCode: string
  reason?: string
  reasonKey?: string
  reasonParams?: ReasonMessageParams
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function buildReason(reasonCode: string, reasonKey: string, reasonParams?: ReasonMessageParams) {
  return {
    reasonCode,
    reasonKey,
    ...(reasonParams ? { reasonParams } : {}),
  }
}

function buildMessage(messageKey: string, messageParams?: ReasonMessageParams) {
  return {
    messageKey,
    ...(messageParams ? { messageParams } : {}),
  }
}

function normalizeGroupJoinMode(value?: string | null): 'AND' | 'OR' {
  return value === 'OR' ? 'OR' : 'AND'
}

function normalizeConditionLogicOp(value?: string | null): 'AND' | 'OR' {
  return value === 'OR' ? 'OR' : 'AND'
}

function normalizeFilterGroupNo(value?: number | null) {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 1
}

function splitFilterValues(value?: string | null) {
  return (value || '')
    .split(/[\n,\uFF0C;\uFF1B\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getExpectedOutboundPresetDateKeys(values: string[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const mapping = new Map<string, string>([
    ['T', formatDateKey(today)],
    ['T-1', formatDateKey(new Date(today.getTime() - 24 * 60 * 60 * 1000))],
    ['T-2', formatDateKey(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000))],
  ])
  return values
    .map((item) => mapping.get(item))
    .filter((item): item is string => Boolean(item))
}

function evaluateSingleCondition(
  order: FilterableOrder,
  condition: FilterCondition,
  orderZoneMap: Map<string, Set<string>>
) : FilterConditionMatch {
  switch (condition.fieldCode) {
    case 'orderBusinessType':
      {
      const expectedValues = splitFilterValues(condition.value)
      const matched = expectedValues.length === 0 || expectedValues.includes(order.orderBusinessType)
      return {
        matched,
        fieldCode: condition.fieldCode,
        value: condition.value,
        actualValue: order.orderBusinessType,
        ...buildReason(
          matched ? 'FILTER_MATCH_ORDER_BUSINESS_TYPE' : 'FILTER_MISS_ORDER_BUSINESS_TYPE',
          matched
            ? 'details.filter.orderBusinessTypeMatched'
            : 'details.filter.orderBusinessTypeMissed',
          {
            actualValue: order.orderBusinessType || '-',
            expectedValue: expectedValues.join(', ') || '-',
          }
        ),
      }
    }
    case 'platform':
      {
      const expectedValues = splitFilterValues(condition.value)
      const matched = expectedValues.length === 0 || expectedValues.includes(order.platform)
      return {
        matched,
        fieldCode: condition.fieldCode,
        value: condition.value,
        actualValue: order.platform,
        ...buildReason(
          matched ? 'FILTER_MATCH_PLATFORM' : 'FILTER_MISS_PLATFORM',
          matched
            ? 'details.filter.platformMatched'
            : 'details.filter.platformMissed',
          {
            actualValue: order.platform || '-',
            expectedValue: expectedValues.join(', ') || '-',
          }
        ),
      }
    }
    case 'shippingMethod':
      {
      const expectedValues = splitFilterValues(condition.value)
      const matched = expectedValues.length === 0 || (!!order.shippingMethod && expectedValues.includes(order.shippingMethod))
      return {
        matched,
        fieldCode: condition.fieldCode,
        value: condition.value,
        actualValue: order.shippingMethod || '',
        ...buildReason(
          matched ? 'FILTER_MATCH_SHIPPING_METHOD' : 'FILTER_MISS_SHIPPING_METHOD',
          matched
            ? 'details.filter.shippingMethodMatched'
            : 'details.filter.shippingMethodMissed',
          {
            actualValue: order.shippingMethod || '-',
            expectedValue: expectedValues.join(', ') || '-',
          }
        ),
      }
    }
    case 'clientId':
      {
      const expectedValues = splitFilterValues(condition.value)
      const matched = expectedValues.length === 0 || expectedValues.includes(order.clientId)
      return {
        matched,
        fieldCode: condition.fieldCode,
        value: condition.value,
        actualValue: order.clientId,
        ...buildReason(
          matched ? 'FILTER_MATCH_CLIENT' : 'FILTER_MISS_CLIENT',
          matched
            ? 'details.filter.clientMatched'
            : 'details.filter.clientMissed',
          {
            expectedValue: expectedValues.join(', ') || '-',
          }
        ),
      }
    }
    case 'zoneId': {
      const zones = orderZoneMap.get(order.id)
      const expectedValues = splitFilterValues(condition.value)
      const matched = Boolean(zones && expectedValues.some((item) => zones.has(item)))
      return {
        matched,
        fieldCode: condition.fieldCode,
        value: condition.value,
        actualValue: zones ? Array.from(zones).join(',') : '',
        ...buildReason(
          matched ? 'FILTER_MATCH_ZONE' : 'FILTER_MISS_ZONE',
          matched ? 'details.filter.zoneMatched' : 'details.filter.zoneMissed',
          {
            expectedValue: expectedValues.join(', ') || '-',
          }
        ),
      }
    }
    case 'expectedOutboundTime': {
      const expectedOutboundTime = order.timeline?.expectedOutboundTime ? new Date(order.timeline.expectedOutboundTime) : null
      if (!expectedOutboundTime) {
        return {
          matched: false,
          fieldCode: condition.fieldCode,
          value: condition.value,
          valueTo: condition.valueTo,
          actualValue: '',
          ...buildReason(
            'FILTER_MISS_EXPECTED_OUTBOUND_TIME_EMPTY',
            'details.filter.expectedOutboundTimeEmpty'
          ),
        }
      }
      const presetValues = splitFilterValues(condition.value).filter((item) => item === 'T' || item === 'T-1' || item === 'T-2')
      if (presetValues.length > 0) {
        const matched = getExpectedOutboundPresetDateKeys(presetValues).includes(formatDateKey(expectedOutboundTime))
        return {
          matched,
          fieldCode: condition.fieldCode,
          value: condition.value,
          valueTo: condition.valueTo,
          actualValue: expectedOutboundTime.toISOString(),
          ...buildReason(
            matched ? 'FILTER_MATCH_EXPECTED_OUTBOUND_TIME' : 'FILTER_MISS_EXPECTED_OUTBOUND_TIME',
            matched
              ? 'details.filter.expectedOutboundTimeMatched'
              : 'details.filter.expectedOutboundTimeMissed',
            {
              from: presetValues.join(', ') || '-',
              to: presetValues.join(', ') || '-',
            }
          ),
        }
      }
      const from = condition.value ? new Date(condition.value) : null
      const to = condition.valueTo ? new Date(condition.valueTo) : null
      const matched = (!from || expectedOutboundTime >= from) && (!to || expectedOutboundTime <= to)
      return {
        matched,
        fieldCode: condition.fieldCode,
        value: condition.value,
        valueTo: condition.valueTo,
        actualValue: expectedOutboundTime.toISOString(),
        ...buildReason(
          matched ? 'FILTER_MATCH_EXPECTED_OUTBOUND_TIME' : 'FILTER_MISS_EXPECTED_OUTBOUND_TIME',
          matched
            ? 'details.filter.expectedOutboundTimeMatched'
            : 'details.filter.expectedOutboundTimeMissed',
          {
            from: condition.value || '-',
            to: condition.valueTo || '-',
          }
        ),
      }
    }
    default:
      return {
        matched: true,
        fieldCode: condition.fieldCode,
        value: condition.value,
        valueTo: condition.valueTo,
        actualValue: '',
        ...buildReason('FILTER_MATCH_DEFAULT', 'details.filter.defaultMatched'),
      }
  }
}

function matchesLegacyFilter(
  order: FilterableOrder,
  rules: WaveStrategyRuleSetInput,
  orderZoneMap: Map<string, Set<string>>
) {
  if (rules.filterConfig.orderBusinessTypes.length > 0 && !rules.filterConfig.orderBusinessTypes.includes(order.orderBusinessType)) {
    return false
  }
  if (rules.filterConfig.clientIds.length > 0 && !rules.filterConfig.clientIds.includes(order.clientId)) {
    return false
  }
  if (rules.filterConfig.platforms.length > 0 && !rules.filterConfig.platforms.includes(order.platform)) {
    return false
  }
  if (rules.filterConfig.shippingMethods.length > 0 && (!order.shippingMethod || !rules.filterConfig.shippingMethods.includes(order.shippingMethod))) {
    return false
  }
  if (rules.filterConfig.zoneIds.length > 0) {
    const zones = orderZoneMap.get(order.id)
    if (!zones || !rules.filterConfig.zoneIds.some((zoneId) => zones.has(zoneId))) {
      return false
    }
  }
  if (rules.filterConfig.expectedOutboundTime?.from || rules.filterConfig.expectedOutboundTime?.to) {
    const expectedOutboundTime = order.timeline?.expectedOutboundTime ? new Date(order.timeline.expectedOutboundTime) : null
    if (!expectedOutboundTime) return false
    if (rules.filterConfig.expectedOutboundTime.from && expectedOutboundTime < new Date(rules.filterConfig.expectedOutboundTime.from)) {
      return false
    }
    if (rules.filterConfig.expectedOutboundTime.to && expectedOutboundTime > new Date(rules.filterConfig.expectedOutboundTime.to)) {
      return false
    }
  }
  return true
}

function matchesConditionGroups(
  order: FilterableOrder,
  rules: WaveStrategyRuleSetInput,
  orderZoneMap: Map<string, Set<string>>
) {
  const conditionGroups = rules.filterConfig.conditionGroups || []
  if (conditionGroups.length === 0) {
    return {
      matched: matchesLegacyFilter(order, rules, orderZoneMap),
      groupJoinMode: rules.filterConfig.groupJoinMode,
      groups: [],
    }
  }

  const groupedConditions = new Map<number, FilterCondition[]>()
  for (const condition of conditionGroups) {
    const group = groupedConditions.get(condition.groupNo) || []
    group.push(condition)
    groupedConditions.set(condition.groupNo, group)
  }

  const groupResults = Array.from(groupedConditions.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([groupNo, conditions]) => {
      const sortedConditions = [...conditions]
      let result = false
      const evaluatedConditions = sortedConditions.map((condition) => evaluateSingleCondition(order, condition, orderZoneMap))
      evaluatedConditions.forEach((current, index) => {
        if (index === 0) {
          result = current.matched
          return
        }
        result = sortedConditions[index].logicOp === 'OR' ? (result || current.matched) : (result && current.matched)
      })
      return {
        groupNo,
        matched: result,
        conditions: evaluatedConditions,
      }
    })

  if (groupResults.length === 0) {
    return {
      matched: true,
      groupJoinMode: normalizeGroupJoinMode(rules.filterConfig.groupJoinMode),
      groups: [],
    }
  }

  const groupJoinMode = normalizeGroupJoinMode(rules.filterConfig.groupJoinMode)
  const matched = groupJoinMode === 'OR'
    ? groupResults.some((item) => item.matched)
    : groupResults.every((item) => item.matched)
  return {
    matched,
    groupJoinMode,
    groups: groupResults,
  }
}

function normalizeRules(version: StrategyVersionWithRules): WaveStrategyRuleSetInput {
  if (!version.ruleSet) {
    throw new Error('策略规则集不存在')
  }

  const rules: WaveStrategyRuleSetInput = {
    triggerConfig: cloneJson(version.ruleSet.triggerConfigJson as WaveStrategyRuleSetInput['triggerConfig']),
    filterConfig: cloneJson(version.ruleSet.filterConfigJson as WaveStrategyRuleSetInput['filterConfig']),
    executionConfig: cloneJson(version.ruleSet.executionConfigJson as WaveStrategyRuleSetInput['executionConfig']),
    waveTypeConfig: cloneJson(version.ruleSet.waveTypeConfigJson as WaveStrategyRuleSetInput['waveTypeConfig']),
    pickConfig: cloneJson(version.ruleSet.pickConfigJson as WaveStrategyRuleSetInput['pickConfig']),
    releaseConfig: cloneJson(version.ruleSet.releaseConfigJson as WaveStrategyRuleSetInput['releaseConfig']),
  }

  return {
    ...rules,
    filterConfig: {
      ...rules.filterConfig,
      groupJoinMode: normalizeGroupJoinMode(rules.filterConfig.groupJoinMode) as WaveStrategyRuleSetInput['filterConfig']['groupJoinMode'],
      conditionGroups: (rules.filterConfig.conditionGroups || []).map((condition) => ({
        ...condition,
        groupNo: normalizeFilterGroupNo(condition.groupNo),
        logicOp: normalizeConditionLogicOp(condition.logicOp),
      })) as WaveStrategyRuleSetInput['filterConfig']['conditionGroups'],
    },
  }
}

async function loadExecutionContext(
  tenantId: string,
  strategyId: string,
  mode: 'SIMULATE' | 'EXECUTE'
): Promise<StrategyExecutionContext> {
  const strategy = await prisma.waveStrategy.findFirst({
    where: {
      id: strategyId,
      tenantId,
      isDeleted: false,
    },
  })

  if (!strategy) {
    throw new Error('波次策略不存在')
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id: strategy.warehouseId,
      tenantId,
    },
    select: {
      warehouseCode: true,
    },
  })

  if (!warehouse) {
    throw new Error('策略关联仓库不存在')
  }

  const publishedVersion = await prisma.waveStrategyVersion.findFirst({
    where: {
      strategyId,
      isCurrent: true,
    },
    include: {
      ruleSet: true,
    },
  })

  const editingVersion = strategy.currentVersionId
    ? await prisma.waveStrategyVersion.findUnique({
        where: {
          id: strategy.currentVersionId,
        },
        include: {
          ruleSet: true,
        },
      })
    : null

  const version = mode === 'EXECUTE'
    ? publishedVersion
    : (publishedVersion || editingVersion)

  if (!version) {
    throw new Error(mode === 'EXECUTE' ? '策略尚未发布，无法执行' : '策略当前版本不存在')
  }

  return {
    strategy: {
      ...strategy,
      warehouseCode: warehouse.warehouseCode,
    },
    version,
    rules: normalizeRules(version),
  }
}

async function fetchOrderZoneMap(tenantId: string, orderIds: string[]) {
  if (orderIds.length === 0) {
    return new Map<string, Set<string>>()
  }

  const allocations = await prisma.allocationDetail.findMany({
    where: {
      tenantId,
      referenceType: 'OUTBOUND_ORDER',
      referenceId: { in: orderIds },
    },
    select: {
      referenceId: true,
      locationId: true,
    },
  })

  const locationIds = Array.from(new Set(allocations.map((item) => item.locationId)))
  const locations = await prisma.binLocation.findMany({
    where: { id: { in: locationIds } },
    select: { id: true, zoneId: true },
  })
  const locationMap = new Map(locations.map((location) => [location.id, location.zoneId]))

  const orderZoneMap = new Map<string, Set<string>>()
  for (const allocation of allocations) {
    const zoneId = locationMap.get(allocation.locationId)
    if (!zoneId) continue
    const zones = orderZoneMap.get(allocation.referenceId) || new Set<string>()
    zones.add(zoneId)
    orderZoneMap.set(allocation.referenceId, zones)
  }

  return orderZoneMap
}

function buildCandidateOrderWhere(
  tenantId: string,
  warehouseId: string,
  rules: WaveStrategyRuleSetInput,
  orderIds: string[]
) {
  const hasStructuredConditions = (rules.filterConfig.conditionGroups || []).length > 0
  const where: Record<string, unknown> = {
    tenantId,
    warehouseId,
    waveId: null,
    status: { in: ['ALLOCATED', 'PENDING_WAVE'] },
    pickOrderLines: {
      none: {
        task: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      },
    },
  }

  if (orderIds.length > 0) {
    where.id = { in: orderIds }
  }

  if (!hasStructuredConditions && rules.filterConfig.orderBusinessTypes.length > 0) {
    where.orderBusinessType = { in: rules.filterConfig.orderBusinessTypes }
  }

  if (!hasStructuredConditions && rules.filterConfig.clientIds.length > 0) {
    where.clientId = { in: rules.filterConfig.clientIds }
  }

  if (!hasStructuredConditions && rules.filterConfig.platforms.length > 0) {
    where.platform = { in: rules.filterConfig.platforms }
  }

  if (!hasStructuredConditions && rules.filterConfig.shippingMethods.length > 0) {
    where.shippingMethod = { in: rules.filterConfig.shippingMethods }
  }

  if (!hasStructuredConditions && (rules.filterConfig.expectedOutboundTime?.from || rules.filterConfig.expectedOutboundTime?.to)) {
    where.timeline = {
      is: {
        expectedOutboundTime: {
          ...(rules.filterConfig.expectedOutboundTime.from ? { gte: new Date(rules.filterConfig.expectedOutboundTime.from) } : {}),
          ...(rules.filterConfig.expectedOutboundTime.to ? { lte: new Date(rules.filterConfig.expectedOutboundTime.to) } : {}),
        },
      },
    }
  }

  return where
}

async function fetchCandidateOrderHeaders(
  tenantId: string,
  warehouseId: string,
  rules: WaveStrategyRuleSetInput,
  orderIds: string[]
) {
  const hasStructuredConditions = (rules.filterConfig.conditionGroups || []).length > 0
  const where = buildCandidateOrderWhere(tenantId, warehouseId, rules, orderIds)

  const orders = await prisma.outboundOrder.findMany({
    where,
    select: {
      id: true,
      orderNumber: true,
      clientId: true,
      platform: true,
      shippingMethod: true,
      orderBusinessType: true,
      orderType: true,
      totalOrderedQty: true,
      createdAt: true,
      timeline: {
        select: {
          expectedOutboundTime: true,
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  })

  const orderZoneMap = await fetchOrderZoneMap(tenantId, orders.map((order) => order.id))
  const filteredOrders = !hasStructuredConditions && rules.filterConfig.zoneIds.length > 0
    ? orders.filter((order) => {
        const zones = orderZoneMap.get(order.id)
        if (!zones) return false
        return rules.filterConfig.zoneIds.some((zoneId) => zones.has(zoneId))
      })
    : orders

  return {
    orders: filteredOrders,
    orderZoneMap,
  }
}

async function hydrateCandidateOrdersByIds(
  tenantId: string,
  orderIds: string[]
) {
  if (orderIds.length === 0) {
    return []
  }

  return prisma.outboundOrder.findMany({
    where: {
      tenantId,
      id: { in: orderIds },
    },
    include: {
      lines: {
        select: {
          id: true,
          skuId: true,
          skuCode: true,
          orderedQty: true,
          allocatedQty: true,
        },
      },
      timeline: {
        select: {
          expectedOutboundTime: true,
        },
      },
    },
  })
}

async function fetchCandidateOrders(
  tenantId: string,
  warehouseId: string,
  rules: WaveStrategyRuleSetInput,
  orderIds: string[]
) {
  const hasStructuredConditions = (rules.filterConfig.conditionGroups || []).length > 0
  const where = buildCandidateOrderWhere(tenantId, warehouseId, rules, orderIds)

  const orders = await prisma.outboundOrder.findMany({
    where,
    include: {
      lines: {
        select: {
          id: true,
          skuId: true,
          skuCode: true,
          orderedQty: true,
          allocatedQty: true,
        },
      },
      timeline: {
        select: {
          expectedOutboundTime: true,
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
  })

  const orderZoneMap = await fetchOrderZoneMap(tenantId, orders.map((order) => order.id))
  const filteredOrders = !hasStructuredConditions && rules.filterConfig.zoneIds.length > 0
    ? orders.filter((order) => {
        const zones = orderZoneMap.get(order.id)
        if (!zones) return false
        return rules.filterConfig.zoneIds.some((zoneId) => zones.has(zoneId))
      })
    : orders

  return {
    orders: filteredOrders,
    orderZoneMap,
  }
}

function orderMatchesFilter(
  order: FilterableOrder,
  rules: WaveStrategyRuleSetInput,
  orderZoneMap: Map<string, Set<string>>
) {
  return matchesConditionGroups(order, rules, orderZoneMap)
}

function buildLineSignature(order: CandidateOrder) {
  const skuQtyMap = new Map<string, number>()
  for (const line of order.lines) {
    if (!line.skuId) continue
    skuQtyMap.set(line.skuId, (skuQtyMap.get(line.skuId) || 0) + line.orderedQty)
  }

  return Array.from(skuQtyMap.entries())
    .map(([skuId, orderedQty]) => `${skuId}:${orderedQty}`)
    .sort()
    .join('|')
}

function buildTwoSkuSignature(order: CandidateOrder) {
  const uniqueSkuIds = Array.from(new Set(order.lines.map((line) => line.skuId).filter(Boolean))).sort()
  return uniqueSkuIds.length === 2 ? uniqueSkuIds.join('|') : null
}

function classifyOrder(
  order: CandidateOrder,
  rules: WaveStrategyRuleSetInput,
  poolStats: {
    singleItemSingleSkuCountMap: Map<string, number>
    singleItemMultiSkuCountMap: Map<string, number>
    multiItemLineSignatureCountMap: Map<string, number>
  }
) {
  const configs = new Map(rules.waveTypeConfig.map((item) => [item.code, item]))
  const primarySkuId = order.lines[0]?.skuId || null
  const lineSignature = buildLineSignature(order)
  const twoSkuSignature = buildTwoSkuSignature(order)

  const isHot = (code: WaveStrategyRuleSetInput['waveTypeConfig'][number]['code']) => {
    const config = configs.get(code)
    if (!primarySkuId || !config?.enabled) return false
    if (code === 'SINGLE_ONE_HOT') {
      return (poolStats.singleItemSingleSkuCountMap.get(primarySkuId) || 0) >= getWaveMinOrders(config)
    }
    if (code === 'SINGLE_MULTI_HOT') {
      return (poolStats.singleItemMultiSkuCountMap.get(primarySkuId) || 0) >= getWaveMinOrders(config)
    }
    return false
  }

  const isFixedCombo = () => {
    const config = configs.get('MULTI_FIXED_COMBO')
    if (!lineSignature || !config?.enabled) return false
    return (poolStats.multiItemLineSignatureCountMap.get(lineSignature) || 0) >= getWaveMinOrders(config)
  }

  let targetCode: WaveStrategyRuleSetInput['waveTypeConfig'][number]['code'] | null = null
  let groupingKey = '__all__'
  if (order.orderType === 'SINGLE_ITEM_SINGLE') {
    targetCode = isHot('SINGLE_ONE_HOT') ? 'SINGLE_ONE_HOT' : 'SINGLE_ONE_NORMAL'
    groupingKey = targetCode === 'SINGLE_ONE_HOT' && primarySkuId ? primarySkuId : '__all__'
  } else if (order.orderType === 'SINGLE_ITEM_MULTI') {
    targetCode = isHot('SINGLE_MULTI_HOT') ? 'SINGLE_MULTI_HOT' : 'SINGLE_MULTI_NORMAL'
    groupingKey = targetCode === 'SINGLE_MULTI_HOT' && primarySkuId ? primarySkuId : '__all__'
  } else if (order.orderType === 'MULTI_ITEM') {
    targetCode = isFixedCombo() ? 'MULTI_FIXED_COMBO' : 'MULTI_NON_FIXED'
    groupingKey = targetCode === 'MULTI_FIXED_COMBO' ? lineSignature : '__all__'
  }

  if (!targetCode) {
    return null
  }

  const config = configs.get(targetCode)
  if (!config?.enabled) {
    return null
  }

  return {
    waveTypeCode: targetCode,
    groupingKey,
    pickMode: config.pickMode,
    downstreamMode: config.downstreamMode,
    matchedRuleSnapshot: {
      orderType: order.orderType,
      primarySkuId,
      lineSignature,
      twoSkuSignature,
      minOrdersPerWave: getWaveMinOrders(config),
      maxOrdersPerWave: getWaveMaxOrders(config),
      isHotMatched: targetCode === 'SINGLE_ONE_HOT'
        ? Boolean(primarySkuId && (poolStats.singleItemSingleSkuCountMap.get(primarySkuId) || 0) >= getWaveMinOrders(config))
        : targetCode === 'SINGLE_MULTI_HOT'
          ? Boolean(primarySkuId && (poolStats.singleItemMultiSkuCountMap.get(primarySkuId) || 0) >= getWaveMinOrders(config))
          : false,
      fixedComboMatched: targetCode === 'MULTI_FIXED_COMBO',
      targetCode,
      ...buildReason(
        targetCode === 'MULTI_FIXED_COMBO'
          ? 'FIXED_COMBO_MATCH'
          : targetCode === 'MULTI_NON_FIXED'
            ? 'MULTI_ITEM_FALLBACK'
            : targetCode.includes('HOT')
              ? 'HOT_SKU_MATCH'
              : 'ORDER_STRUCTURE_DEFAULT_MATCH',
        targetCode === 'MULTI_FIXED_COMBO'
          ? 'details.classification.fixedComboMatched'
          : targetCode === 'MULTI_NON_FIXED'
            ? 'details.classification.multiItemFallback'
            : targetCode.includes('HOT')
              ? 'details.classification.hotSkuMatched'
              : 'details.classification.orderStructureDefaultMatched'
      ),
    },
  }
}

type RemainderFallbackRule = {
  source: WaveStrategyRuleSetInput['waveTypeConfig'][number]['code']
  target: WaveStrategyRuleSetInput['waveTypeConfig'][number]['code']
  fallbackRemainder: 'BELOW_MIN' | 'ANY_REMAINDER'
}

const remainderFallbackRules: RemainderFallbackRule[] = [
  { source: 'SINGLE_ONE_HOT', target: 'SINGLE_ONE_NORMAL', fallbackRemainder: 'BELOW_MIN' },
  { source: 'SINGLE_MULTI_HOT', target: 'SINGLE_MULTI_NORMAL', fallbackRemainder: 'BELOW_MIN' },
  { source: 'MULTI_FIXED_COMBO', target: 'MULTI_NON_FIXED', fallbackRemainder: 'ANY_REMAINDER' },
]

function reclassifyRemainders(
  classifiedOrders: ClassifiedOrder[],
  rules: WaveStrategyRuleSetInput
) {
  let adjustedOrders = classifiedOrders

  for (const rule of remainderFallbackRules) {
    const sourceConfig = rules.waveTypeConfig.find((item) => item.code === rule.source && item.enabled)
    const targetConfig = rules.waveTypeConfig.find((item) => item.code === rule.target && item.enabled)
    if (!sourceConfig || !targetConfig) {
      continue
    }

    const minOrdersPerWave = getWaveMinOrders(sourceConfig)
    const maxOrdersPerWave = getWaveMaxOrders(sourceConfig)
    const fallbackOrderIds = new Map<string, { remainder: number; minOrdersPerWave: number }>()
    const sourceGroups = new Map<string, ClassifiedOrder[]>()

    for (const item of adjustedOrders) {
      if (item.waveTypeCode !== rule.source) continue
      const key = buildClassifiedGroupKey(item)
      const group = sourceGroups.get(key) || []
      group.push(item)
      sourceGroups.set(key, group)
    }

    for (const group of sourceGroups.values()) {
      const remainder = group.length % maxOrdersPerWave
      const shouldFallback = rule.fallbackRemainder === 'ANY_REMAINDER'
        ? remainder > 0
        : remainder > 0 && remainder < minOrdersPerWave
      if (!shouldFallback) continue
      for (const item of group.slice(-remainder)) {
        fallbackOrderIds.set(item.order.id, {
          remainder,
          minOrdersPerWave,
        })
      }
    }

    if (fallbackOrderIds.size === 0) {
      continue
    }

    adjustedOrders = adjustedOrders.map((item) => {
      const fallback = fallbackOrderIds.get(item.order.id)
      if (!fallback || item.waveTypeCode !== rule.source) {
        return item
      }

      const classification = item.matchedRuleSnapshot.classification
      const currentClassification = classification && typeof classification === 'object'
        ? classification as Record<string, unknown>
        : {}

      return {
        ...item,
        waveTypeCode: rule.target,
        groupingKey: '__all__',
        pickMode: targetConfig.pickMode,
        downstreamMode: targetConfig.downstreamMode,
        matchedRuleSnapshot: {
          ...item.matchedRuleSnapshot,
          classification: {
            ...currentClassification,
            targetCode: rule.target,
            fallbackFromWaveType: rule.source,
            fallbackToWaveType: rule.target,
            isHotMatched: false,
            fixedComboMatched: rule.target === 'MULTI_NON_FIXED' ? false : currentClassification.fixedComboMatched,
            remainderReleasedToFallback: true,
            ...buildReason(
              'REMAINDER_RELEASED_TO_FALLBACK',
              'details.classification.remainderReleasedToFallback',
              {
                sourceWaveType: rule.source,
                targetWaveType: rule.target,
                remainder: fallback.remainder,
                minOrdersPerWave: fallback.minOrdersPerWave,
              }
            ),
          },
        },
      }
    })
  }

  return adjustedOrders
}

function planWaves(
  classifiedOrders: ClassifiedOrder[],
  rules: WaveStrategyRuleSetInput
) {
  const adjustedOrders = reclassifyRemainders(classifiedOrders, rules)
  adjustedOrders.sort((left, right) => {
    const byWaveType = getWaveTypeExecutionWeight(left.waveTypeCode) - getWaveTypeExecutionWeight(right.waveTypeCode)
    if (byWaveType !== 0) return byWaveType

    const byGroupingKey = left.groupingKey.localeCompare(right.groupingKey)
    if (byGroupingKey !== 0) return byGroupingKey

    const byBatch = left.batchNo - right.batchNo
    if (byBatch !== 0) return byBatch

    return new Date(left.order.createdAt).getTime() - new Date(right.order.createdAt).getTime()
  })

  const groupedOrders = new Map<string, ClassifiedOrder[]>()
  for (const item of adjustedOrders) {
    const key = buildClassifiedGroupKey(item)
    const group = groupedOrders.get(key) || []
    group.push(item)
    groupedOrders.set(key, group)
  }

  const orderedGroups = Array.from(groupedOrders.entries()).sort((left, right) => {
    const [leftWaveTypeCode, leftGroupingKey] = left[0].split(':')
    const [rightWaveTypeCode, rightGroupingKey] = right[0].split(':')

    const byWaveType = getWaveTypeExecutionWeight(leftWaveTypeCode) - getWaveTypeExecutionWeight(rightWaveTypeCode)
    if (byWaveType !== 0) return byWaveType

    return leftGroupingKey.localeCompare(rightGroupingKey)
  })

  const plannedWaves: PlannedWave[] = []
  const belowMinOrders: Array<{
    item: ClassifiedOrder
    minOrdersPerWave: number
    currentOrders: number
  }> = []

  for (const [groupKey, items] of orderedGroups) {
    const [waveTypeCode] = groupKey.split(':')
    const typedWaveTypeCode = waveTypeCode as WaveStrategyRuleSetInput['waveTypeConfig'][number]['code']
    const rule = rules.waveTypeConfig.find((config) => config.code === typedWaveTypeCode)
    const minOrdersPerWave = getWaveMinOrders(rule)
    const maxOrdersPerWave = getWaveMaxOrders(rule)

    for (let index = 0; index < items.length; index += maxOrdersPerWave) {
      const slice = items.slice(index, index + maxOrdersPerWave)
      if (slice.length < minOrdersPerWave) {
        for (const item of slice) {
          belowMinOrders.push({
            item,
            minOrdersPerWave,
            currentOrders: slice.length,
          })
        }
        break
      }

      plannedWaves.push({
        batchNo: slice[0].batchNo,
        waveTypeCode: typedWaveTypeCode,
        items: slice,
      })
    }
  }

  return {
    plannedWaves,
    matchedOrders: plannedWaves.flatMap((wave) => wave.items),
    belowMinOrders,
  }
}

function getBatchSortValue(
  order: Pick<CandidateOrderHeader, 'createdAt' | 'timeline'>,
  field: 'expectedOutboundTime' | 'createdAt'
) {
  if (field === 'expectedOutboundTime') {
    return order.timeline?.expectedOutboundTime ? new Date(order.timeline.expectedOutboundTime).getTime() : Number.MAX_SAFE_INTEGER
  }
  return new Date(order.createdAt).getTime()
}

function mapWavePickStrategy(pickMode: string) {
  switch (pickMode) {
    case 'BY_ORDER':
      return 'ORDER'
    case 'SKU_BATCH':
    case 'MIXED_BATCH':
      return 'BATCH'
    case 'PICK_AND_SORT':
      return 'CLUSTER'
    default:
      return 'ORDER'
  }
}

async function loadHigherPriorityRules(tenantId: string, warehouseId: string, currentStrategyId: string, priority: number) {
  const strategies = await prisma.waveStrategy.findMany({
    where: {
      tenantId,
      warehouseId,
      status: 'ENABLED',
      isDeleted: false,
      priority: { lt: priority },
      id: { not: currentStrategyId },
    },
    include: {
      versions: {
        where: { isCurrent: true },
        take: 1,
        include: {
          ruleSet: true,
        },
      },
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })

  return strategies
    .map((strategy) => {
      const version = strategy.versions[0]
      if (!version?.ruleSet) {
        return null
      }
      return {
        id: strategy.id,
        priority: strategy.priority,
        rules: normalizeRules(version),
      }
    })
    .filter((item): item is { id: string; priority: number; rules: WaveStrategyRuleSetInput } => Boolean(item))
}

function chunkArray<T>(items: T[], size: number) {
  if (items.length === 0) {
    return [] as T[][]
  }

  const chunkSize = Math.max(size, 1)
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}

function chunkPlannedWaves(items: PlannedWave[]) {
  const chunks: PlannedWave[][] = []
  let currentChunk: PlannedWave[] = []
  let currentOrderCount = 0

  for (const item of items) {
    const nextOrderCount = currentOrderCount + item.items.length
    if (
      currentChunk.length > 0 &&
      (currentChunk.length >= waveStrategyExecuteWaveChunkSize || nextOrderCount > waveStrategyExecuteClaimChunkSize)
    ) {
      chunks.push(currentChunk)
      currentChunk = []
      currentOrderCount = 0
    }

    currentChunk.push(item)
    currentOrderCount += item.items.length
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk)
  }

  return chunks
}

function getWaveTypeConfig(
  rules: WaveStrategyRuleSetInput,
  waveTypeCode: string
) {
  return rules.waveTypeConfig.find((item) => item.code === waveTypeCode && item.enabled)
}

async function insertRunOrdersInChunks(
  client: Pick<typeof prisma, 'waveStrategyRunOrder'>,
  rows: WaveStrategyRunOrderPayload[]
) {
  for (const chunk of chunkArray(rows, waveStrategyExecuteRunOrderChunkSize)) {
    await client.waveStrategyRunOrder.createMany({
      data: chunk,
    })
  }
}

async function loadWaveRunById(tenantId: string, runId: string) {
  return prisma.waveStrategyRun.findFirst({
    where: {
      id: runId,
      tenantId,
    },
    select: {
      id: true,
      strategyId: true,
      warehouseId: true,
      runMode: true,
      runStatus: true,
      requestPayload: true,
      triggeredBy: true,
      startedAt: true,
      createdWaveCount: true,
      createdPickOrderCount: true,
    },
  })
}

async function failWaveRunOnEnqueueError(runId: string, error: unknown) {
  const message = error instanceof Error ? error.message : '波次策略执行任务入队失败'
  await prisma.waveStrategyRun.update({
    where: { id: runId },
    data: {
      runStatus: 'FAILED',
      errorMessage: message,
      finishedAt: new Date(),
    },
  }).catch((updateError) => {
    console.error('更新波次策略运行失败状态失败:', updateError)
  })
}

async function createRun(
  tenantId: string,
  warehouseId: string,
  strategyId: string,
  strategyVersionId: string,
  runMode: 'SIMULATE' | 'EXECUTE',
  triggerType: 'MANUAL' | 'SCHEDULED' | 'API',
  triggeredBy: string | null | undefined,
  requestPayload: unknown
) {
  return prisma.waveStrategyRun.create({
    data: {
      tenantId,
      warehouseId,
      strategyId,
      strategyVersionId,
      runMode,
      triggerType,
      triggeredBy: triggeredBy || undefined,
      requestPayload: requestPayload as object,
    },
  })
}

export async function simulateWaveStrategy(
  tenantId: string,
  strategyId: string,
  operatorId: string | null | undefined,
  input: SimulateWaveStrategyInput
) {
  return runWaveStrategy(tenantId, strategyId, operatorId, input.orderIds, 'SIMULATE')
}

export async function executeWaveStrategy(
  tenantId: string,
  strategyId: string,
  operatorId: string | null | undefined,
  operatorName: string | null | undefined,
  input: ExecuteWaveStrategyInput
) {
  return runWaveStrategy(tenantId, strategyId, operatorId, input.orderIds, 'EXECUTE', operatorName)
}

export async function startExecuteWaveStrategy(
  tenantId: string,
  strategyId: string,
  operatorId: string | null | undefined,
  operatorName: string | null | undefined,
  input: ExecuteWaveStrategyInput
) {
  const context = await loadExecutionContext(tenantId, strategyId, 'EXECUTE')
  const runningTimeoutCutoff = new Date(Date.now() - manualExecuteRunningTimeoutMinutes * 60 * 1000)
  const activeRunningRun = await prisma.waveStrategyRun.findFirst({
    where: {
      tenantId,
      strategyId: context.strategy.id,
      runMode: 'EXECUTE',
      runStatus: 'RUNNING',
      startedAt: { gt: runningTimeoutCutoff },
    },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      startedAt: true,
    },
  })

  if (activeRunningRun) {
    const existingJob = await findWaveStrategyExecutionJobByRunId(tenantId, activeRunningRun.id)
    if (existingJob) {
      return existingJob
    }

    throw new WaveStrategyRunAlreadyRunningError(activeRunningRun.id, activeRunningRun.startedAt)
  }

  await prisma.waveStrategyRun.updateMany({
    where: {
      tenantId,
      strategyId: context.strategy.id,
      runMode: 'EXECUTE',
      runStatus: 'RUNNING',
      startedAt: { lte: runningTimeoutCutoff },
    },
    data: {
      runStatus: 'FAILED',
      errorMessage: '执行超时，系统自动释放执行锁',
      finishedAt: new Date(),
    },
  })

  const runningRun = await prisma.waveStrategyRun.findFirst({
    where: {
      tenantId,
      strategyId: context.strategy.id,
      runMode: 'EXECUTE',
      runStatus: 'RUNNING',
    },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      startedAt: true,
    },
  })
  if (runningRun) {
    const existingJob = await findWaveStrategyExecutionJobByRunId(tenantId, runningRun.id)
    if (existingJob) {
      return existingJob
    }

    throw new WaveStrategyRunAlreadyRunningError(runningRun.id, runningRun.startedAt)
  }

  const run = await createRun(
    tenantId,
    context.strategy.warehouseId,
    context.strategy.id,
    context.version.id,
    'EXECUTE',
    'MANUAL',
    operatorId,
    { orderIds: input.orderIds }
  )

  try {
    return await enqueueWaveStrategyExecutionJob({
      tenantId,
      strategyId: context.strategy.id,
      strategyName: context.strategy.strategyName,
      warehouseId: context.strategy.warehouseId,
      runId: run.id,
      operatorId,
      operatorName,
    })
  } catch (error) {
    await failWaveRunOnEnqueueError(run.id, error)
    throw error
  }
}

export async function startScheduledExecuteWaveStrategy(
  tenantId: string,
  strategyId: string
) {
  const context = await loadExecutionContext(tenantId, strategyId, 'EXECUTE')
  const runningTimeoutCutoff = new Date(Date.now() - manualExecuteRunningTimeoutMinutes * 60 * 1000)
  const activeRunningRun = await prisma.waveStrategyRun.findFirst({
    where: {
      tenantId,
      strategyId: context.strategy.id,
      runMode: 'EXECUTE',
      runStatus: 'RUNNING',
      startedAt: { gt: runningTimeoutCutoff },
    },
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      startedAt: true,
    },
  })

  if (activeRunningRun) {
    const existingJob = await findWaveStrategyExecutionJobByRunId(tenantId, activeRunningRun.id)
    if (existingJob) {
      return existingJob
    }

    throw new WaveStrategyRunAlreadyRunningError(activeRunningRun.id, activeRunningRun.startedAt)
  }

  await prisma.waveStrategyRun.updateMany({
    where: {
      tenantId,
      strategyId: context.strategy.id,
      runMode: 'EXECUTE',
      runStatus: 'RUNNING',
      startedAt: { lte: runningTimeoutCutoff },
    },
    data: {
      runStatus: 'FAILED',
      errorMessage: '执行超时，系统自动释放执行锁',
      finishedAt: new Date(),
    },
  })

  const run = await createRun(
    tenantId,
    context.strategy.warehouseId,
    context.strategy.id,
    context.version.id,
    'EXECUTE',
    'SCHEDULED',
    null,
    { orderIds: [] }
  )

  try {
    return await enqueueWaveStrategyExecutionJob({
      tenantId,
      strategyId: context.strategy.id,
      strategyName: context.strategy.strategyName,
      warehouseId: context.strategy.warehouseId,
      runId: run.id,
      operatorId: null,
      operatorName: '系统定时任务',
    })
  } catch (error) {
    await failWaveRunOnEnqueueError(run.id, error)
    throw error
  }
}

async function runWaveStrategy(
  tenantId: string,
  strategyId: string,
  operatorId: string | null | undefined,
  orderIds: string[],
  runMode: 'SIMULATE' | 'EXECUTE',
  operatorName?: string | null
) {
  const context = await loadExecutionContext(tenantId, strategyId, runMode)
  const run = await createRun(
    tenantId,
    context.strategy.warehouseId,
    context.strategy.id,
    context.version.id,
    runMode,
    'MANUAL',
    operatorId,
    { orderIds }
  )

  return processWaveStrategyRun({
    tenantId,
    context,
    run,
    orderIds,
    runMode,
    operatorId,
    operatorName,
  })
}

async function processWaveStrategyRun({
  tenantId,
  context,
  run,
  orderIds,
  runMode,
  operatorId,
  operatorName,
}: {
  tenantId: string
  context: Awaited<ReturnType<typeof loadExecutionContext>>
  run: Awaited<ReturnType<typeof createRun>>
  orderIds: string[]
  runMode: 'SIMULATE' | 'EXECUTE'
  operatorId: string | null | undefined
  operatorName?: string | null
}) {
  try {
  const { orders, orderZoneMap } = await fetchCandidateOrders(
    tenantId,
    context.strategy.warehouseId,
    context.rules,
    orderIds
  )

  const higherPriorityStrategies = await loadHigherPriorityRules(
    tenantId,
    context.strategy.warehouseId,
    context.strategy.id,
    context.strategy.priority
  )

  const runOrdersPayload: Array<{
    tenantId: string
    runId: string
    orderId: string
    batchNo: number
    matchedStrategy: boolean
    claimedByStrategyId?: string
    waveTypeCode?: string
    pickMode?: string
    downstreamMode?: string
    resultStatus: string
    waveId?: string
    message?: string
    matchedRuleSnapshot?: Record<string, unknown>
  }> = []

  const claimedOrders = new Map<string, string>()
  for (const order of orders) {
    for (const higher of higherPriorityStrategies) {
      const higherMatch = orderMatchesFilter(order, higher.rules, orderZoneMap)
      if (higherMatch.matched) {
        claimedOrders.set(order.id, higher.id)
        break
      }
    }
  }

  const eligibleOrders = orders.filter((order) => !claimedOrders.has(order.id))
  const sortField = context.rules.executionConfig.batchSortField
  const sortDirection = context.rules.executionConfig.batchSortDirection === 'asc' ? 1 : -1
  const sortedOrders = [...eligibleOrders].sort((left, right) => {
    return (getBatchSortValue(left, sortField) - getBatchSortValue(right, sortField)) * sortDirection
  })

  const batches: CandidateOrder[][] = []
  if (context.rules.executionConfig.enableOrderLimit && context.rules.executionConfig.maxOrdersPerRun) {
    const maxOrdersPerRun = context.rules.executionConfig.maxOrdersPerRun
    for (let index = 0; index < sortedOrders.length; index += maxOrdersPerRun) {
      batches.push(sortedOrders.slice(index, index + maxOrdersPerRun))
    }
  } else if (sortedOrders.length > 0) {
    batches.push(sortedOrders)
  }

  const classifiedOrders: ClassifiedOrder[] = []
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex]
    const batchFilterMatchMap = new Map(batch.map((order) => [order.id, orderMatchesFilter(order, context.rules, orderZoneMap)]))
    const singleItemSingleSkuCountMap = new Map<string, number>()
    const singleItemMultiSkuCountMap = new Map<string, number>()
    const multiItemLineSignatureCountMap = new Map<string, number>()
    for (const order of batch) {
      const filterMatch = batchFilterMatchMap.get(order.id)
      const primarySkuId = order.lines[0]?.skuId
      if (!filterMatch?.matched) continue
      if (order.orderType === 'SINGLE_ITEM_SINGLE' && primarySkuId) {
        singleItemSingleSkuCountMap.set(primarySkuId, (singleItemSingleSkuCountMap.get(primarySkuId) || 0) + 1)
      }
      if (order.orderType === 'SINGLE_ITEM_MULTI' && primarySkuId) {
        singleItemMultiSkuCountMap.set(primarySkuId, (singleItemMultiSkuCountMap.get(primarySkuId) || 0) + 1)
      }
      if (order.orderType === 'MULTI_ITEM') {
        const lineSignature = buildLineSignature(order)
        if (lineSignature) {
          multiItemLineSignatureCountMap.set(lineSignature, (multiItemLineSignatureCountMap.get(lineSignature) || 0) + 1)
        }
      }
    }

    for (const order of batch) {
      const filterMatch = batchFilterMatchMap.get(order.id) || orderMatchesFilter(order, context.rules, orderZoneMap)
      if (!filterMatch.matched) {
        runOrdersPayload.push({
          tenantId,
          runId: run.id,
          orderId: order.id,
          batchNo: batchIndex + 1,
          matchedStrategy: false,
          resultStatus: 'SKIPPED',
          matchedRuleSnapshot: {
            ...buildMessage('runMessages.filterConditionsNotMatched'),
            reasonCode: 'FILTER_CONDITIONS_NOT_MATCHED',
            filter: filterMatch,
          },
        })
        continue
      }

      const classified = classifyOrder(order, context.rules, {
        singleItemSingleSkuCountMap,
        singleItemMultiSkuCountMap,
        multiItemLineSignatureCountMap,
      })
      if (!classified) {
        runOrdersPayload.push({
          tenantId,
          runId: run.id,
          orderId: order.id,
          batchNo: batchIndex + 1,
          matchedStrategy: false,
          resultStatus: 'UNCLASSIFIED',
          matchedRuleSnapshot: {
            ...buildMessage('runMessages.noWaveTypeMatched'),
            reasonCode: 'NO_WAVE_TYPE_MATCHED',
            filter: filterMatch,
            classification: {
              ...buildReason(
                'NO_WAVE_TYPE_MATCHED',
                'details.classification.noWaveTypeMatched'
              ),
            },
          },
        })
        continue
      }

      classifiedOrders.push({
        order,
        batchNo: batchIndex + 1,
        waveTypeCode: classified.waveTypeCode,
        groupingKey: classified.groupingKey,
        pickMode: classified.pickMode,
        downstreamMode: classified.downstreamMode,
        matchedRuleSnapshot: {
          filter: filterMatch,
          classification: classified.matchedRuleSnapshot,
        },
      })
    }
  }

  for (const order of orders) {
    const claimedByStrategyId = claimedOrders.get(order.id)
    if (!claimedByStrategyId) continue
    runOrdersPayload.push({
      tenantId,
      runId: run.id,
      orderId: order.id,
      batchNo: 1,
      matchedStrategy: false,
      claimedByStrategyId,
      resultStatus: 'SKIPPED',
      matchedRuleSnapshot: {
        ...buildMessage('runMessages.claimedByHigherPriority'),
        ...buildReason(
          'CLAIMED_BY_HIGHER_PRIORITY',
          'details.claimedByHigherPriority'
        ),
        claimedByStrategyId,
      },
    })
  }

  const {
    plannedWaves,
    matchedOrders,
    belowMinOrders,
  } = planWaves(classifiedOrders, context.rules)
  const estimatedWaveCount = plannedWaves.length

  for (const released of belowMinOrders) {
    runOrdersPayload.push({
      tenantId,
      runId: run.id,
      orderId: released.item.order.id,
      batchNo: released.item.batchNo,
      matchedStrategy: false,
      waveTypeCode: released.item.waveTypeCode,
      pickMode: released.item.pickMode,
      downstreamMode: released.item.downstreamMode,
      resultStatus: 'UNCLASSIFIED',
      matchedRuleSnapshot: {
        ...released.item.matchedRuleSnapshot,
        ...buildMessage('runMessages.waveSizeBelowMinimum', {
          currentOrders: released.currentOrders,
          minOrdersPerWave: released.minOrdersPerWave,
        }),
        reasonCode: 'WAVE_SIZE_BELOW_MINIMUM',
        reasonKey: 'details.classification.waveSizeBelowMinimum',
        reasonParams: {
          currentOrders: released.currentOrders,
          minOrdersPerWave: released.minOrdersPerWave,
        },
      },
    })
  }

  if (runMode === 'SIMULATE') {
    for (const item of matchedOrders) {
      runOrdersPayload.push({
        tenantId,
        runId: run.id,
        orderId: item.order.id,
        batchNo: item.batchNo,
        matchedStrategy: true,
        waveTypeCode: item.waveTypeCode,
        pickMode: item.pickMode,
        downstreamMode: item.downstreamMode,
        resultStatus: 'MATCHED',
        matchedRuleSnapshot: {
          ...item.matchedRuleSnapshot,
          ...buildMessage('runMessages.simulatedMatched'),
        },
      })
    }

    if (runOrdersPayload.length > 0) {
      await prisma.waveStrategyRunOrder.createMany({
        data: runOrdersPayload,
      })
    }

    await prisma.waveStrategyRun.update({
      where: { id: run.id },
      data: {
        runStatus: 'SUCCESS',
        candidateOrderCount: orders.length,
        matchedOrderCount: matchedOrders.length,
        claimedByHigherCount: claimedOrders.size,
        unclassifiedOrderCount: runOrdersPayload.filter((item) => item.resultStatus === 'UNCLASSIFIED').length,
        createdWaveCount: estimatedWaveCount,
        createdPickOrderCount: context.rules.releaseConfig.releaseMode === 'IMMEDIATE' ? estimatedWaveCount : 0,
        finishedAt: new Date(),
      },
    })

    return prisma.waveStrategyRun.findUniqueOrThrow({
      where: { id: run.id },
      include: {
        orders: {
          include: {
            order: {
              select: {
                orderNumber: true,
                platformOrderId: true,
              },
            },
          },
        },
      },
    })
  }

  const createdWaves: Array<{
    id: string
    waveNumber: string
    orderIds: string[]
  }> = []

  await prisma.$transaction(async (tx) => {
    const waveNumberPrefix = buildWaveNumberPrefix(context.strategy.warehouseCode)
    const lastWave = await tx.wave.findFirst({
      where: {
        tenantId,
        waveNumber: {
          startsWith: waveNumberPrefix,
        },
      },
      orderBy: {
        waveNumber: 'desc',
      },
      select: {
        waveNumber: true,
      },
    })

    let nextWaveSequence = 1
    if (lastWave) {
      const lastSequence = parseInt(lastWave.waveNumber.slice(-4), 10)
      if (!Number.isNaN(lastSequence)) {
        nextWaveSequence = lastSequence + 1
      }
    }

    for (const plannedWave of plannedWaves) {
      const waveNumber = `${waveNumberPrefix}${String(nextWaveSequence).padStart(4, '0')}`
      nextWaveSequence += 1
      const wave = await tx.wave.create({
        data: {
          tenantId,
          warehouseId: context.strategy.warehouseId,
          waveNumber,
          waveType: 'STANDARD',
          sourceType: 'STRATEGY',
          strategyId: context.strategy.id,
          strategyVersionId: context.version.id,
          strategyRunId: run.id,
          waveTypeCode: plannedWave.waveTypeCode,
          pickMode: plannedWave.items[0].pickMode,
          downstreamMode: plannedWave.items[0].downstreamMode,
          releaseMode: context.rules.releaseConfig.releaseMode,
          releaseStatus: context.rules.releaseConfig.releaseMode === 'IMMEDIATE' ? 'PENDING_RELEASE' : 'PENDING_RELEASE',
          batchNo: plannedWave.batchNo,
          status: 'CREATED',
          priority: context.strategy.priority,
          totalOrders: plannedWave.items.length,
          orderIds: plannedWave.items.map((item) => item.order.id),
          totalLines: plannedWave.items.reduce((sum, item) => sum + item.order.lines.length, 0),
          totalQty: plannedWave.items.reduce((sum, item) => sum + item.order.totalOrderedQty, 0),
          totalSkuCount: new Set(plannedWave.items.flatMap((item) => item.order.lines.map((line) => line.skuId))).size,
          pickStrategy: mapWavePickStrategy(plannedWave.items[0].pickMode),
          configSnapshot: context.version.configSnapshot as object,
          createdBy: operatorId || undefined,
          updatedBy: operatorId || undefined,
        },
      })

      await tx.waveOrder.createMany({
        data: plannedWave.items.map((item) => ({
          tenantId,
          waveId: wave.id,
          orderId: item.order.id,
          orderNumber: item.order.orderNumber,
          waveTypeCode: item.waveTypeCode,
          pickMode: item.pickMode,
          downstreamMode: item.downstreamMode,
        })),
      })

      for (const item of plannedWave.items) {
        const claimedOrder = await tx.outboundOrder.updateMany({
          where: {
            id: item.order.id,
            tenantId,
            warehouseId: context.strategy.warehouseId,
            waveId: null,
            status: { in: ['ALLOCATED', 'PENDING_WAVE'] },
          },
          data: {
            waveId: wave.id,
            waveStrategyId: context.strategy.id,
            waveStrategyVersionId: context.version.id,
            waveTypeCode: item.waveTypeCode,
            downstreamMode: item.downstreamMode,
            status: 'IN_WAVE',
            updatedBy: operatorId || undefined,
          },
        })

        if (claimedOrder.count !== 1) {
          throw new Error(`订单 ${item.order.orderNumber} 已被其他波次认领，请刷新后重试`)
        }

        await tx.outboundOrderWaveContext.upsert({
          where: { orderId: item.order.id },
          create: {
            tenantId,
            orderId: item.order.id,
            strategyRunId: run.id,
            waveBatchNo: item.batchNo,
            pickMode: item.pickMode,
            releaseMode: context.rules.releaseConfig.releaseMode,
            releaseStatus: 'PENDING_RELEASE',
            matchedRuleSnapshot: item.matchedRuleSnapshot as object,
            classificationSnapshot: {
              waveTypeCode: item.waveTypeCode,
              pickMode: item.pickMode,
              downstreamMode: item.downstreamMode,
            },
            lastWaveEvaluatedAt: new Date(),
          },
          update: {
            strategyRunId: run.id,
            waveBatchNo: item.batchNo,
            pickMode: item.pickMode,
            releaseMode: context.rules.releaseConfig.releaseMode,
            releaseStatus: 'PENDING_RELEASE',
            matchedRuleSnapshot: item.matchedRuleSnapshot as object,
            classificationSnapshot: {
              waveTypeCode: item.waveTypeCode,
              pickMode: item.pickMode,
              downstreamMode: item.downstreamMode,
            },
            lastWaveEvaluatedAt: new Date(),
          },
        })

        await tx.orderTimeline.upsert({
          where: { orderId: item.order.id },
          create: {
            tenantId,
            orderId: item.order.id,
            wavedAt: new Date(),
          },
          update: {
            wavedAt: new Date(),
          },
        })

        runOrdersPayload.push({
          tenantId,
          runId: run.id,
          orderId: item.order.id,
          batchNo: item.batchNo,
          matchedStrategy: true,
          waveTypeCode: item.waveTypeCode,
          pickMode: item.pickMode,
          downstreamMode: item.downstreamMode,
          waveId: wave.id,
          resultStatus: 'WAVED',
          matchedRuleSnapshot: {
            ...item.matchedRuleSnapshot,
            ...buildMessage('runMessages.waved', {
              waveNumber: wave.waveNumber,
            }),
          },
        })
      }

      createdWaves.push({
        id: wave.id,
        waveNumber: wave.waveNumber,
        orderIds: plannedWave.items.map((item) => item.order.id),
      })
    }

    if (runOrdersPayload.length > 0) {
      await tx.waveStrategyRunOrder.createMany({
        data: runOrdersPayload,
      })
    }

    await tx.waveStrategyRun.update({
      where: { id: run.id },
      data: {
        candidateOrderCount: orders.length,
        matchedOrderCount: matchedOrders.length,
        claimedByHigherCount: claimedOrders.size,
        unclassifiedOrderCount: runOrdersPayload.filter((item) => item.resultStatus === 'UNCLASSIFIED').length,
        createdWaveCount: createdWaves.length,
      },
    })
  }, waveExecutionTransactionOptions)

  let createdPickOrderCount = 0
  if (context.rules.releaseConfig.releaseMode === 'IMMEDIATE') {
    for (const wave of createdWaves) {
      const releaseResult = await releaseWave({
        tenantId,
        waveId: wave.id,
        operatorId,
        operatorName,
      })
      createdPickOrderCount += releaseResult.pickOrders.length
    }
  }

  await prisma.waveStrategyRun.update({
    where: { id: run.id },
    data: {
      runStatus: 'SUCCESS',
      createdPickOrderCount,
      finishedAt: new Date(),
    },
  })

  return prisma.waveStrategyRun.findUniqueOrThrow({
    where: { id: run.id },
    include: {
      orders: {
        include: {
          order: {
            select: {
              orderNumber: true,
              platformOrderId: true,
            },
          },
        },
      },
    },
  })
  } catch (error) {
    const message = error instanceof Error ? error.message : '波次策略执行失败'
    await prisma.waveStrategyRun.update({
      where: { id: run.id },
      data: {
        runStatus: 'FAILED',
        errorMessage: message,
        finishedAt: new Date(),
      },
    }).catch((updateError) => {
      console.error('更新波次策略运行失败状态失败:', updateError)
    })
    throw error
  }
}

type WaveRunMetrics = {
  candidateOrderCount: number
  matchedOrderCount: number
  claimedByHigherCount: number
  unclassifiedOrderCount: number
  createdWaveCount: number
  createdPickOrderCount: number
}

type WaveRunPhaseDurations = {
  candidateQuery: number
  classify: number
  wavePersist: number
  release: number
  total: number
}

function extractOrderIdsFromRequestPayload(requestPayload: unknown) {
  if (!requestPayload || typeof requestPayload !== 'object' || Array.isArray(requestPayload)) {
    return [] as string[]
  }

  const orderIds = (requestPayload as Record<string, unknown>).orderIds
  return Array.isArray(orderIds) ? orderIds.filter((item): item is string => typeof item === 'string') : []
}

async function loadNextWaveSequence(tenantId: string, warehouseCode: string) {
  const waveNumberPrefix = buildWaveNumberPrefix(warehouseCode)
  const lastWave = await prisma.wave.findFirst({
    where: {
      tenantId,
      waveNumber: {
        startsWith: waveNumberPrefix,
      },
    },
    orderBy: {
      waveNumber: 'desc',
    },
    select: {
      waveNumber: true,
    },
  })

  let nextWaveSequence = 1
  if (lastWave) {
    const lastSequence = parseInt(lastWave.waveNumber.slice(-4), 10)
    if (!Number.isNaN(lastSequence)) {
      nextWaveSequence = lastSequence + 1
    }
  }

  return {
    waveNumberPrefix,
    nextWaveSequence,
  }
}

export async function processQueuedWaveStrategyRun({
  tenantId,
  userId,
  runId,
  operatorName,
  onProgress,
}: {
  tenantId: string
  userId: string
  runId: string
  operatorName?: string | null
  onProgress?: (update: ProgressUpdate) => Promise<void>
}) {
  const existingRun = await loadWaveRunById(tenantId, runId)
  if (!existingRun) {
    throw new Error(`波次策略运行记录不存在：${runId}`)
  }

  if (existingRun.runStatus === 'SUCCESS') {
    return {
      runId,
      status: 'SUCCESS' as const,
      createdWaveCount: existingRun.createdWaveCount,
      createdPickOrderCount: existingRun.createdPickOrderCount,
      candidateOrderCount: 0,
      matchedOrderCount: 0,
      claimedByHigherCount: 0,
      unclassifiedOrderCount: 0,
      phaseDurationsMs: {
        candidateQuery: 0,
        classify: 0,
        wavePersist: 0,
        release: 0,
        total: 0,
      },
    }
  }

  if (existingRun.runStatus !== 'RUNNING') {
    throw new Error(`波次策略运行状态异常，无法继续执行：${existingRun.runStatus}`)
  }

  const context = await loadExecutionContext(tenantId, existingRun.strategyId, 'EXECUTE')
  const orderIds = extractOrderIdsFromRequestPayload(existingRun.requestPayload)
  const effectiveOperatorId = existingRun.triggeredBy || userId || null

  return withLock(
    getWaveStrategyExecutionLockKey(tenantId, context.strategy.warehouseId),
    async () => executeQueuedWaveStrategyRun({
      tenantId,
      context,
      runId,
      orderIds,
      operatorId: effectiveOperatorId,
      operatorName,
      onProgress,
    }),
    {
      prefix: 'wave-execute',
      ttlMs: manualExecuteRunningTimeoutMinutes * 60 * 1000,
      retryCount: 0,
    }
  )
}

async function executeQueuedWaveStrategyRun({
  tenantId,
  context,
  runId,
  orderIds,
  operatorId,
  operatorName,
  onProgress,
}: {
  tenantId: string
  context: StrategyExecutionContext
  runId: string
  orderIds: string[]
  operatorId: string | null
  operatorName?: string | null
  onProgress?: (update: ProgressUpdate) => Promise<void>
}) {
  const metrics: WaveRunMetrics = {
    candidateOrderCount: 0,
    matchedOrderCount: 0,
    claimedByHigherCount: 0,
    unclassifiedOrderCount: 0,
    createdWaveCount: 0,
    createdPickOrderCount: 0,
  }
  const phaseDurations: WaveRunPhaseDurations = {
    candidateQuery: 0,
    classify: 0,
    wavePersist: 0,
    release: 0,
    total: 0,
  }
  const startedAtMs = Date.now()

  const reportProgress = async (update: ProgressUpdate) => {
    if (!onProgress) return
    await onProgress(update)
  }

  try {
    await reportProgress({
      progress: 10,
      message: '正在查询候选订单...',
    })

    const candidateQueryStartedAtMs = Date.now()
    const { orders: orderHeaders, orderZoneMap } = await fetchCandidateOrderHeaders(
      tenantId,
      context.strategy.warehouseId,
      context.rules,
      orderIds
    )
    phaseDurations.candidateQuery = Date.now() - candidateQueryStartedAtMs
    metrics.candidateOrderCount = orderHeaders.length

    const higherPriorityStrategies = await loadHigherPriorityRules(
      tenantId,
      context.strategy.warehouseId,
      context.strategy.id,
      context.strategy.priority
    )

    const claimedOrders = new Map<string, string>()
    for (const order of orderHeaders) {
      for (const higher of higherPriorityStrategies) {
        const higherMatch = orderMatchesFilter(order, higher.rules, orderZoneMap)
        if (higherMatch.matched) {
          claimedOrders.set(order.id, higher.id)
          break
        }
      }
    }
    metrics.claimedByHigherCount = claimedOrders.size

    const eligibleOrderHeaders = orderHeaders.filter((order) => !claimedOrders.has(order.id))
    const sortField = context.rules.executionConfig.batchSortField
    const sortDirection = context.rules.executionConfig.batchSortDirection === 'asc' ? 1 : -1
    const sortedOrderHeaders = [...eligibleOrderHeaders].sort((left, right) => {
      return (getBatchSortValue(left, sortField) - getBatchSortValue(right, sortField)) * sortDirection
    })

    const executionBatchSize = context.rules.executionConfig.enableOrderLimit && context.rules.executionConfig.maxOrdersPerRun
      ? context.rules.executionConfig.maxOrdersPerRun
      : waveStrategyExecutePageSize
    const executionBatches = chunkArray(sortedOrderHeaders, executionBatchSize)
    const nonWavedPayload: WaveStrategyRunOrderPayload[] = []
    const classifiedOrders: ClassifiedOrder[] = []

    await reportProgress({
      progress: 20,
      message: `正在筛选与归类订单，共 ${orderHeaders.length} 单...`,
      totalCount: orderHeaders.length,
      processedCount: 0,
      successCount: 0,
      failedCount: metrics.claimedByHigherCount,
    })

    let processedOrderCount = 0
    const classifyStartedAtMs = Date.now()
    for (let batchIndex = 0; batchIndex < executionBatches.length; batchIndex += 1) {
      const batchHeaders = executionBatches[batchIndex]
      const hydratedOrders = await hydrateCandidateOrdersByIds(
        tenantId,
        batchHeaders.map((order) => order.id)
      )
      const hydratedOrderMap = new Map(hydratedOrders.map((order) => [order.id, order]))
      const batchOrders = batchHeaders
        .map((order) => hydratedOrderMap.get(order.id))
        .filter((order): order is CandidateOrder => Boolean(order))

      const batchFilterMatchMap = new Map(
        batchHeaders.map((order) => [order.id, orderMatchesFilter(order, context.rules, orderZoneMap)])
      )
      const singleItemSingleSkuCountMap = new Map<string, number>()
      const singleItemMultiSkuCountMap = new Map<string, number>()
      const multiItemLineSignatureCountMap = new Map<string, number>()

      for (const order of batchOrders) {
        const filterMatch = batchFilterMatchMap.get(order.id)
        const primarySkuId = order.lines[0]?.skuId
        if (!filterMatch?.matched) continue
        if (order.orderType === 'SINGLE_ITEM_SINGLE' && primarySkuId) {
          singleItemSingleSkuCountMap.set(primarySkuId, (singleItemSingleSkuCountMap.get(primarySkuId) || 0) + 1)
        }
        if (order.orderType === 'SINGLE_ITEM_MULTI' && primarySkuId) {
          singleItemMultiSkuCountMap.set(primarySkuId, (singleItemMultiSkuCountMap.get(primarySkuId) || 0) + 1)
        }
        if (order.orderType === 'MULTI_ITEM') {
          const lineSignature = buildLineSignature(order)
          if (lineSignature) {
            multiItemLineSignatureCountMap.set(lineSignature, (multiItemLineSignatureCountMap.get(lineSignature) || 0) + 1)
          }
        }
      }

      for (const order of batchOrders) {
        const filterMatch = batchFilterMatchMap.get(order.id)
        if (!filterMatch?.matched) {
          nonWavedPayload.push({
            tenantId,
            runId,
            orderId: order.id,
            batchNo: batchIndex + 1,
            matchedStrategy: false,
            resultStatus: 'SKIPPED',
            matchedRuleSnapshot: {
              ...buildMessage('runMessages.filterConditionsNotMatched'),
              reasonCode: 'FILTER_CONDITIONS_NOT_MATCHED',
              filter: filterMatch,
            },
          })
          continue
        }

        const classified = classifyOrder(order, context.rules, {
          singleItemSingleSkuCountMap,
          singleItemMultiSkuCountMap,
          multiItemLineSignatureCountMap,
        })
        if (!classified) {
          nonWavedPayload.push({
            tenantId,
            runId,
            orderId: order.id,
            batchNo: batchIndex + 1,
            matchedStrategy: false,
            resultStatus: 'UNCLASSIFIED',
            matchedRuleSnapshot: {
              ...buildMessage('runMessages.noWaveTypeMatched'),
              reasonCode: 'NO_WAVE_TYPE_MATCHED',
              filter: filterMatch,
              classification: {
                ...buildReason(
                  'NO_WAVE_TYPE_MATCHED',
                  'details.classification.noWaveTypeMatched'
                ),
              },
            },
          })
          metrics.unclassifiedOrderCount += 1
          continue
        }

        classifiedOrders.push({
          order,
          batchNo: batchIndex + 1,
          waveTypeCode: classified.waveTypeCode,
          groupingKey: classified.groupingKey,
          pickMode: classified.pickMode,
          downstreamMode: classified.downstreamMode,
          matchedRuleSnapshot: {
            filter: filterMatch,
            classification: classified.matchedRuleSnapshot,
          },
        })
      }

      processedOrderCount += batchHeaders.length
      await reportProgress({
        progress: Math.min(65, 20 + Math.round((processedOrderCount / Math.max(orderHeaders.length, 1)) * 45)),
        message: `正在归类订单，第 ${batchIndex + 1}/${Math.max(executionBatches.length, 1)} 批`,
        totalCount: orderHeaders.length,
        processedCount: processedOrderCount,
        successCount: classifiedOrders.length,
        failedCount: metrics.claimedByHigherCount + metrics.unclassifiedOrderCount,
      })
    }
    phaseDurations.classify = Date.now() - classifyStartedAtMs

    for (const order of orderHeaders) {
      const claimedByStrategyId = claimedOrders.get(order.id)
      if (!claimedByStrategyId) continue
      nonWavedPayload.push({
        tenantId,
        runId,
        orderId: order.id,
        batchNo: 1,
        matchedStrategy: false,
        claimedByStrategyId,
        resultStatus: 'SKIPPED',
        matchedRuleSnapshot: {
          ...buildMessage('runMessages.claimedByHigherPriority'),
          ...buildReason(
            'CLAIMED_BY_HIGHER_PRIORITY',
            'details.claimedByHigherPriority'
          ),
          claimedByStrategyId,
        },
      })
    }

    const {
      plannedWaves,
      matchedOrders,
      belowMinOrders,
    } = planWaves(classifiedOrders, context.rules)
    metrics.matchedOrderCount = matchedOrders.length
    metrics.createdWaveCount = plannedWaves.length

    for (const released of belowMinOrders) {
      nonWavedPayload.push({
        tenantId,
        runId,
        orderId: released.item.order.id,
        batchNo: released.item.batchNo,
        matchedStrategy: false,
        waveTypeCode: released.item.waveTypeCode,
        pickMode: released.item.pickMode,
        downstreamMode: released.item.downstreamMode,
        resultStatus: 'UNCLASSIFIED',
        matchedRuleSnapshot: {
          ...released.item.matchedRuleSnapshot,
          ...buildMessage('runMessages.waveSizeBelowMinimum', {
            currentOrders: released.currentOrders,
            minOrdersPerWave: released.minOrdersPerWave,
          }),
          reasonCode: 'WAVE_SIZE_BELOW_MINIMUM',
          reasonKey: 'details.classification.waveSizeBelowMinimum',
          reasonParams: {
            currentOrders: released.currentOrders,
            minOrdersPerWave: released.minOrdersPerWave,
          },
        },
      })
      metrics.unclassifiedOrderCount += 1
    }

    if (nonWavedPayload.length > 0) {
      await insertRunOrdersInChunks(prisma, nonWavedPayload)
    }

    await prisma.waveStrategyRun.update({
      where: { id: runId },
      data: {
        candidateOrderCount: metrics.candidateOrderCount,
        matchedOrderCount: metrics.matchedOrderCount,
        claimedByHigherCount: metrics.claimedByHigherCount,
        unclassifiedOrderCount: metrics.unclassifiedOrderCount,
        createdWaveCount: metrics.createdWaveCount,
      },
    })

    await reportProgress({
      progress: 70,
      message: `已完成筛选归类，计划生成 ${plannedWaves.length} 个波次`,
      totalCount: orderHeaders.length,
      processedCount: orderHeaders.length,
      successCount: metrics.matchedOrderCount,
      failedCount: metrics.claimedByHigherCount + metrics.unclassifiedOrderCount,
    })

    const createdWaves: Array<{
      id: string
      waveNumber: string
      orderIds: string[]
    }> = []
    const waveSequence = await loadNextWaveSequence(tenantId, context.strategy.warehouseCode)
    const plannedWaveChunks = chunkPlannedWaves(plannedWaves)
    const wavePersistStartedAtMs = Date.now()
    let actualWavedOrderCount = 0

    for (let chunkIndex = 0; chunkIndex < plannedWaveChunks.length; chunkIndex += 1) {
      const plannedWaveChunk = plannedWaveChunks[chunkIndex]
      const committableWaves: Array<{
        plannedWave: PlannedWave
        items: ClassifiedOrder[]
        releaseLocks: () => Promise<void>
      }> = []
      const chunkSkipPayloads: WaveStrategyRunOrderPayload[] = []

      for (const plannedWave of plannedWaveChunk) {
        const orderLocks = await acquireOrderExecutionLocksIndividually({
          tenantId,
          orderIds: plannedWave.items.map((item) => item.order.id),
        })
        const lockedOrderIdSet = new Set(orderLocks.lockedOrderIds)
        const lockedItems = plannedWave.items.filter((item) => lockedOrderIdSet.has(item.order.id))
        const conflictedItems = plannedWave.items.filter((item) => !lockedOrderIdSet.has(item.order.id))

        for (const item of conflictedItems) {
          chunkSkipPayloads.push({
            tenantId,
            runId,
            orderId: item.order.id,
            batchNo: item.batchNo,
            matchedStrategy: false,
            waveTypeCode: item.waveTypeCode,
            pickMode: item.pickMode,
            downstreamMode: item.downstreamMode,
            resultStatus: 'SKIPPED',
            matchedRuleSnapshot: {
              ...item.matchedRuleSnapshot,
              reasonCode: 'WAVE_SKIPPED_DUE_TO_ORDER_EXECUTION_LOCK_CONFLICT',
              message: '订单锁冲突，当前订单未加入本轮波次',
            },
          })
        }

        if (lockedItems.length === 0) {
          await orderLocks.releaseAll()
          continue
        }

        const waveTypeConfig = getWaveTypeConfig(context.rules, plannedWave.waveTypeCode)
        const minOrdersPerWave = getWaveMinOrders(waveTypeConfig)
        if (lockedItems.length < minOrdersPerWave) {
          for (const item of lockedItems) {
            chunkSkipPayloads.push({
              tenantId,
              runId,
              orderId: item.order.id,
              batchNo: item.batchNo,
              matchedStrategy: false,
              waveTypeCode: item.waveTypeCode,
              pickMode: item.pickMode,
              downstreamMode: item.downstreamMode,
                resultStatus: 'SKIPPED',
                matchedRuleSnapshot: {
                  ...item.matchedRuleSnapshot,
                  reasonCode: 'WAVE_INVALID_AFTER_CONFLICT',
                  message: '订单锁冲突后剩余订单不满足最小成波条件，本轮已跳过',
                },
              })
          }

          await orderLocks.releaseAll()
          continue
        }

        committableWaves.push({
          plannedWave,
          items: lockedItems,
          releaseLocks: orderLocks.releaseAll,
        })
      }

      if (chunkSkipPayloads.length > 0) {
        await insertRunOrdersInChunks(prisma, chunkSkipPayloads)
      }

      try {
        await prisma.$transaction(async (tx) => {
          const wavedPayload: WaveStrategyRunOrderPayload[] = []

          for (const committableWave of committableWaves) {
            const { plannedWave, items } = committableWave
            const processedAt = new Date()
            const plannedOrderIds = items.map((item) => item.order.id)
          const waveNumber = `${waveSequence.waveNumberPrefix}${String(waveSequence.nextWaveSequence).padStart(4, '0')}`
          waveSequence.nextWaveSequence += 1
          const wave = await tx.wave.create({
            data: {
              tenantId,
              warehouseId: context.strategy.warehouseId,
              waveNumber,
              waveType: 'STANDARD',
              sourceType: 'STRATEGY',
              strategyId: context.strategy.id,
              strategyVersionId: context.version.id,
              strategyRunId: runId,
              waveTypeCode: plannedWave.waveTypeCode,
              pickMode: plannedWave.items[0].pickMode,
              downstreamMode: plannedWave.items[0].downstreamMode,
              releaseMode: context.rules.releaseConfig.releaseMode,
              releaseStatus: 'PENDING_RELEASE',
              batchNo: plannedWave.batchNo,
              status: 'CREATED',
              priority: context.strategy.priority,
              totalOrders: items.length,
              orderIds: plannedOrderIds,
              totalLines: items.reduce((sum, item) => sum + item.order.lines.length, 0),
              totalQty: items.reduce((sum, item) => sum + item.order.totalOrderedQty, 0),
              totalSkuCount: new Set(items.flatMap((item) => item.order.lines.map((line) => line.skuId))).size,
              pickStrategy: mapWavePickStrategy(items[0].pickMode),
              configSnapshot: context.version.configSnapshot as object,
              createdBy: operatorId || undefined,
              updatedBy: operatorId || undefined,
            },
          })

          await tx.waveOrder.createMany({
            data: items.map((item) => ({
              tenantId,
              waveId: wave.id,
              orderId: item.order.id,
              orderNumber: item.order.orderNumber,
              waveTypeCode: item.waveTypeCode,
              pickMode: item.pickMode,
              downstreamMode: item.downstreamMode,
            })),
          })

          const claimedOrder = await tx.outboundOrder.updateMany({
            where: {
              id: { in: plannedOrderIds },
              tenantId,
              warehouseId: context.strategy.warehouseId,
              waveId: null,
              status: { in: ['ALLOCATED', 'PENDING_WAVE'] },
            },
            data: {
              waveId: wave.id,
              waveStrategyId: context.strategy.id,
              waveStrategyVersionId: context.version.id,
              waveTypeCode: plannedWave.waveTypeCode,
              downstreamMode: plannedWave.items[0].downstreamMode,
              status: 'IN_WAVE',
              updatedBy: operatorId || undefined,
            },
          })

          if (claimedOrder.count !== plannedOrderIds.length) {
            throw new Error(`波次 ${wave.waveNumber} 中存在订单已被其他波次认领，请刷新后重试`)
          }

            const existingContexts = await tx.outboundOrderWaveContext.findMany({
            where: {
              orderId: { in: plannedOrderIds },
            },
            select: {
              orderId: true,
            },
          })
          const existingContextOrderIds = new Set(existingContexts.map((item) => item.orderId))
            const contextRows = items.map((item) => ({
              tenantId,
              orderId: item.order.id,
              strategyRunId: runId,
            waveBatchNo: item.batchNo,
            pickMode: item.pickMode,
            releaseMode: context.rules.releaseConfig.releaseMode,
            releaseStatus: 'PENDING_RELEASE',
            matchedRuleSnapshot: item.matchedRuleSnapshot as object,
            classificationSnapshot: {
              waveTypeCode: item.waveTypeCode,
              pickMode: item.pickMode,
              downstreamMode: item.downstreamMode,
            },
            lastWaveEvaluatedAt: processedAt,
          }))

          const newContextRows = contextRows.filter((item) => !existingContextOrderIds.has(item.orderId))
          if (newContextRows.length > 0) {
            await tx.outboundOrderWaveContext.createMany({
              data: newContextRows,
            })
          }

          for (const item of contextRows) {
            if (!existingContextOrderIds.has(item.orderId)) continue
            await tx.outboundOrderWaveContext.update({
              where: { orderId: item.orderId },
              data: {
                strategyRunId: item.strategyRunId,
                waveBatchNo: item.waveBatchNo,
                pickMode: item.pickMode,
                releaseMode: item.releaseMode,
                releaseStatus: item.releaseStatus,
                matchedRuleSnapshot: item.matchedRuleSnapshot,
                classificationSnapshot: item.classificationSnapshot,
                lastWaveEvaluatedAt: item.lastWaveEvaluatedAt,
              },
            })
          }

          const existingTimelines = await tx.orderTimeline.findMany({
            where: {
              orderId: { in: plannedOrderIds },
            },
            select: {
              orderId: true,
            },
          })
          const existingTimelineOrderIds = new Set(existingTimelines.map((item) => item.orderId))
          const newTimelineRows = plannedOrderIds
            .filter((orderId) => !existingTimelineOrderIds.has(orderId))
            .map((orderId) => ({
              tenantId,
              orderId,
              wavedAt: processedAt,
            }))

          if (newTimelineRows.length > 0) {
            await tx.orderTimeline.createMany({
              data: newTimelineRows,
            })
          }

          if (existingTimelineOrderIds.size > 0) {
            await tx.orderTimeline.updateMany({
              where: {
                orderId: {
                  in: Array.from(existingTimelineOrderIds),
                },
              },
              data: {
                wavedAt: processedAt,
              },
            })
          }

            for (const item of items) {

            wavedPayload.push({
              tenantId,
              runId,
              orderId: item.order.id,
              batchNo: item.batchNo,
              matchedStrategy: true,
              waveTypeCode: item.waveTypeCode,
              pickMode: item.pickMode,
              downstreamMode: item.downstreamMode,
              waveId: wave.id,
              resultStatus: 'WAVED',
              matchedRuleSnapshot: {
                ...item.matchedRuleSnapshot,
                ...buildMessage('runMessages.waved', {
                  waveNumber: wave.waveNumber,
                }),
              },
            })
          }

            createdWaves.push({
              id: wave.id,
              waveNumber: wave.waveNumber,
              orderIds: items.map((item) => item.order.id),
            })
            actualWavedOrderCount += items.length
        }

        if (wavedPayload.length > 0) {
          await insertRunOrdersInChunks(tx, wavedPayload)
        }

        await tx.waveStrategyRun.update({
          where: { id: runId },
          data: {
            createdWaveCount: createdWaves.length,
            matchedOrderCount: actualWavedOrderCount,
          },
        })
      }, waveExecutionTransactionOptions)
      } finally {
        for (const committableWave of committableWaves) {
          await committableWave.releaseLocks()
        }
      }

      await reportProgress({
        progress: Math.min(90, 70 + Math.round((createdWaves.length / Math.max(plannedWaves.length, 1)) * 20)),
        message: `正在创建波次，第 ${chunkIndex + 1}/${Math.max(plannedWaveChunks.length, 1)} 批`,
        totalCount: plannedWaves.length,
        processedCount: createdWaves.length,
        successCount: createdWaves.length,
        failedCount: 0,
      })
    }
    phaseDurations.wavePersist = Date.now() - wavePersistStartedAtMs

    let releaseJobs: Array<{ id: string; jobNumber: string; waveIds: string[] }> = []
    if (context.rules.releaseConfig.releaseMode === 'IMMEDIATE') {
      const releaseStartedAtMs = Date.now()
      releaseJobs = await enqueueWaveReleaseJobs({
        tenantId,
        warehouseId: context.strategy.warehouseId,
        runId,
        strategyName: context.strategy.strategyName,
        waveIds: createdWaves.map((wave) => wave.id),
        operatorId,
        operatorName,
      })
      phaseDurations.release = Date.now() - releaseStartedAtMs

      await reportProgress({
        progress: 98,
        message: `已创建 ${createdWaves.length} 个波次，释放任务已入队 ${releaseJobs.length} 批`,
        totalCount: createdWaves.length,
        processedCount: createdWaves.length,
        successCount: createdWaves.length,
        failedCount: 0,
      })
    }

    await prisma.waveStrategyRun.update({
      where: { id: runId },
      data: {
        runStatus: 'SUCCESS',
        finishedAt: new Date(),
      },
    })

    await reportProgress({
      progress: 100,
      message: '波次策略执行完成',
      totalCount: metrics.candidateOrderCount,
      processedCount: metrics.candidateOrderCount,
      successCount: metrics.matchedOrderCount,
      failedCount: metrics.claimedByHigherCount + metrics.unclassifiedOrderCount,
    })
    phaseDurations.total = Date.now() - startedAtMs

    return {
      runId,
      status: 'SUCCESS' as const,
      createdWaveCount: createdWaves.length,
      createdPickOrderCount: metrics.createdPickOrderCount,
      candidateOrderCount: metrics.candidateOrderCount,
      matchedOrderCount: metrics.matchedOrderCount,
      claimedByHigherCount: metrics.claimedByHigherCount,
      unclassifiedOrderCount: metrics.unclassifiedOrderCount,
      phaseDurationsMs: phaseDurations,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '波次策略执行失败'
    if (context.rules.releaseConfig.releaseMode === 'IMMEDIATE') {
      await enqueuePendingImmediateWaveReleaseJobsForRun({
        tenantId,
        warehouseId: context.strategy.warehouseId,
        runId,
        strategyName: context.strategy.strategyName,
        operatorId,
        operatorName,
      }).catch((releaseJobError) => {
        console.error('补建波次释放任务失败:', releaseJobError)
      })
    }

    await prisma.waveStrategyRun.update({
      where: { id: runId },
      data: {
        runStatus: 'FAILED',
        errorMessage: message,
        finishedAt: new Date(),
      },
    }).catch((updateError) => {
      console.error('更新波次策略运行失败状态失败:', updateError)
    })
    throw error
  }
}
