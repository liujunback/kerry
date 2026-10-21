import cron from 'node-cron'
import { prisma } from '@/lib/db/prisma'
import { DEFAULT_TIMEZONE } from '@/lib/config/timezone'
import { reloadTask } from '@/lib/scheduler'
import {
  getPrimaryReasonCode,
  getReasonCategory,
  type MatchedRuleSnapshotLike,
  type ReasonCategory,
} from '@/lib/wave-strategy/reason-codes'
import type {
  CopyWaveStrategyInput,
  CreateWaveStrategyInput,
  ListWaveStrategiesQuery,
  PublishWaveStrategyInput,
  RollbackWaveStrategyInput,
  UpdateWaveStrategyInput,
  WaveStrategyRunDetailQuery,
  WaveStrategyRuleSetInput,
} from '@/lib/validations/wave-strategy'

type StrategyDetail = Awaited<ReturnType<typeof getStrategyOrThrow>>
type PriorityStrategyLite = {
  id: string
  warehouseId: string
  strategyCode: string
  strategyName: string
  priority: number
}

async function getPriorityConflictSummary(
  tenantId: string,
  warehouseId: string,
  strategyId: string,
  priority: number
) {
  const enabledStrategies = await prisma.waveStrategy.findMany({
    where: {
      tenantId,
      warehouseId,
      status: 'ENABLED',
      isDeleted: false,
      id: { not: strategyId },
    },
    select: {
      id: true,
      strategyCode: true,
      strategyName: true,
      priority: true,
    },
    orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
  })

  const higherPriorityStrategies = enabledStrategies.filter((item) => item.priority < priority)
  const samePriorityStrategies = enabledStrategies.filter((item) => item.priority === priority)
  const lowerPriorityStrategies = enabledStrategies.filter((item) => item.priority > priority)

  return {
    higherPriorityCount: higherPriorityStrategies.length,
    samePriorityCount: samePriorityStrategies.length,
    lowerPriorityCount: lowerPriorityStrategies.length,
    higherPriorityStrategies,
    samePriorityStrategies,
    lowerPriorityStrategies: lowerPriorityStrategies.slice(0, 5),
  }
}

async function loadPriorityConflictSummaryMap(
  tenantId: string,
  strategies: Array<{ id: string; warehouseId: string; priority: number }>
) {
  if (strategies.length === 0) {
    return new Map<string, Awaited<ReturnType<typeof getPriorityConflictSummary>>>()
  }

  const warehouseIds = Array.from(new Set(strategies.map((strategy) => strategy.warehouseId)))
  const enabledStrategies = await prisma.waveStrategy.findMany({
    where: {
      tenantId,
      warehouseId: { in: warehouseIds },
      status: 'ENABLED',
      isDeleted: false,
    },
    select: {
      id: true,
      warehouseId: true,
      strategyCode: true,
      strategyName: true,
      priority: true,
    },
    orderBy: [{ warehouseId: 'asc' }, { priority: 'asc' }, { updatedAt: 'desc' }],
  })

  const warehouseStrategyMap = new Map<string, PriorityStrategyLite[]>()
  for (const strategy of enabledStrategies) {
    const current = warehouseStrategyMap.get(strategy.warehouseId) || []
    current.push(strategy)
    warehouseStrategyMap.set(strategy.warehouseId, current)
  }

  return new Map(
    strategies.map((strategy) => {
      const warehouseStrategies = warehouseStrategyMap.get(strategy.warehouseId) || []
      const peers = warehouseStrategies.filter((item) => item.id !== strategy.id)
      const higherPriorityStrategies = peers.filter((item) => item.priority < strategy.priority)
      const samePriorityStrategies = peers.filter((item) => item.priority === strategy.priority)
      const lowerPriorityStrategies = peers.filter((item) => item.priority > strategy.priority)

      return [strategy.id, {
        higherPriorityCount: higherPriorityStrategies.length,
        samePriorityCount: samePriorityStrategies.length,
        lowerPriorityCount: lowerPriorityStrategies.length,
        higherPriorityStrategies,
        samePriorityStrategies,
        lowerPriorityStrategies: lowerPriorityStrategies.slice(0, 5),
      }]
    })
  )
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function buildStartedAtFilter(timePreset?: 'last24hours' | 'last7days' | 'last30days') {
  if (!timePreset) return undefined

  const now = new Date()
  const startAt = new Date(now)
  if (timePreset === 'last24hours') {
    startAt.setHours(startAt.getHours() - 24)
  } else if (timePreset === 'last7days') {
    startAt.setDate(startAt.getDate() - 6)
    startAt.setHours(0, 0, 0, 0)
  } else if (timePreset === 'last30days') {
    startAt.setDate(startAt.getDate() - 29)
    startAt.setHours(0, 0, 0, 0)
  }

  return {
    gte: startAt,
  }
}

type StrategyFilterConfigLite = {
  clientIds: string[]
  shippingMethods: string[]
}

function parseStrategyFilterConfig(filterConfigJson: unknown): StrategyFilterConfigLite {
  if (!filterConfigJson || typeof filterConfigJson !== 'object') {
    return { clientIds: [], shippingMethods: [] }
  }

  const config = filterConfigJson as {
    clientIds?: unknown
    shippingMethods?: unknown
  }

  return {
    clientIds: Array.isArray(config.clientIds)
      ? config.clientIds.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
    shippingMethods: Array.isArray(config.shippingMethods)
      ? config.shippingMethods.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
  }
}

type RunReasonSummaryItem = {
  reasonCode: string
  count: number
}

type WaveStrategyRunOrderDetailRecord = {
  id: string
  orderId: string
  order: {
    orderNumber: string
    platformOrderId: string | null
  } | null
  batchNo: number
  matchedStrategy: boolean
  claimedByStrategyId: string | null
  waveTypeCode: string | null
  pickMode: string | null
  downstreamMode: string | null
  resultStatus: string
  waveId: string | null
  pickOrderId: string | null
  message: string | null
  matchedRuleSnapshot: unknown
  createdAt: Date
}

function isMissingMatchedRuleSnapshotColumn(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? error.code : undefined
  const meta = 'meta' in error ? error.meta : undefined
  const column = meta && typeof meta === 'object' && 'column' in meta ? meta.column : undefined
  return code === 'P2022' && typeof column === 'string' && column.includes('matched_rule_snapshot')
}

function parseMatchedRuleSnapshot(snapshot: unknown): MatchedRuleSnapshotLike | null {
  if (!snapshot || typeof snapshot !== 'object') return null
  return snapshot as MatchedRuleSnapshotLike
}

function buildRunReasonSummaryMap(
  runOrders: Array<{ runId: string; matchedRuleSnapshot: unknown }>
) {
  const summaryMap = new Map<string, Map<string, number>>()

  for (const order of runOrders) {
    const reasonCode = getPrimaryReasonCode(parseMatchedRuleSnapshot(order.matchedRuleSnapshot))
    if (!reasonCode) continue

    const current = summaryMap.get(order.runId) || new Map<string, number>()
    current.set(reasonCode, (current.get(reasonCode) || 0) + 1)
    summaryMap.set(order.runId, current)
  }

  return new Map<string, RunReasonSummaryItem[]>(
    Array.from(summaryMap.entries()).map(([runId, counts]) => [
      runId,
      Array.from(counts.entries())
        .map(([reasonCode, count]) => ({ reasonCode, count }))
        .sort((left, right) => right.count - left.count || left.reasonCode.localeCompare(right.reasonCode))
        .slice(0, 3),
    ])
  )
}

async function loadRunReasonSummary(runIds: string[]) {
  if (runIds.length === 0) {
    return new Map<string, RunReasonSummaryItem[]>()
  }

  try {
    const runOrders = await prisma.waveStrategyRunOrder.findMany({
      where: {
        runId: { in: runIds },
      },
      select: {
        runId: true,
        matchedRuleSnapshot: true,
      },
    })

    return buildRunReasonSummaryMap(runOrders)
  } catch (error) {
    if (isMissingMatchedRuleSnapshotColumn(error)) {
      console.warn('[WaveStrategy] matched_rule_snapshot 列不存在，跳过原因分布聚合')
      return new Map<string, RunReasonSummaryItem[]>()
    }
    throw error
  }
}

async function loadRunIdsByReasonCode(reasonCode: string) {
  try {
    const rows = await prisma.waveStrategyRunOrder.findMany({
      where: {
        OR: [
          {
            matchedRuleSnapshot: {
              path: '$.reasonCode',
              equals: reasonCode,
            },
          },
          {
            matchedRuleSnapshot: {
              path: '$.classification.reasonCode',
              equals: reasonCode,
            },
          },
        ],
      },
      select: {
        runId: true,
      },
      distinct: ['runId'],
    })

    return rows.map((row) => row.runId)
  } catch (error) {
    if (isMissingMatchedRuleSnapshotColumn(error)) {
      console.warn('[WaveStrategy] matched_rule_snapshot 列不存在，跳过 reasonCode 过滤')
      return null
    }
    throw error
  }
}

function buildConfigSnapshot(
  strategy: {
    id: string
    strategyCode: string
    strategyName: string
    warehouseId: string
    priority: number
  },
  rules: WaveStrategyRuleSetInput
) {
  return {
    strategy: {
      id: strategy.id,
      strategyCode: strategy.strategyCode,
      strategyName: strategy.strategyName,
      warehouseId: strategy.warehouseId,
      priority: strategy.priority,
    },
    triggerConfig: rules.triggerConfig,
    filterConfig: rules.filterConfig,
    executionConfig: rules.executionConfig,
    waveTypeConfig: rules.waveTypeConfig,
    pickConfig: rules.pickConfig,
    releaseConfig: rules.releaseConfig,
  }
}

function normalizeRuleSet(ruleSet: {
  triggerConfigJson: unknown
  filterConfigJson: unknown
  executionConfigJson: unknown
  waveTypeConfigJson: unknown
  pickConfigJson: unknown
  releaseConfigJson: unknown
}): WaveStrategyRuleSetInput {
  const triggerConfig = cloneJson(ruleSet.triggerConfigJson as WaveStrategyRuleSetInput['triggerConfig'])
  return {
    triggerConfig: {
      ...triggerConfig,
      scheduleTimes: normalizeScheduleTimes(triggerConfig.scheduleTimes),
    },
    filterConfig: cloneJson(ruleSet.filterConfigJson as WaveStrategyRuleSetInput['filterConfig']),
    executionConfig: cloneJson(ruleSet.executionConfigJson as WaveStrategyRuleSetInput['executionConfig']),
    waveTypeConfig: cloneJson(ruleSet.waveTypeConfigJson as WaveStrategyRuleSetInput['waveTypeConfig']),
    pickConfig: cloneJson(ruleSet.pickConfigJson as WaveStrategyRuleSetInput['pickConfig']),
    releaseConfig: cloneJson(ruleSet.releaseConfigJson as WaveStrategyRuleSetInput['releaseConfig']),
  }
}

function normalizeScheduleTimes(values?: string[] | null) {
  return Array.from(new Set((values || [])
    .map((item) => item.trim())
    .filter((item) => /^\d{2}:\d{2}$/.test(item))
    .filter((item) => {
      const [hourText, minuteText] = item.split(':')
      const hour = Number(hourText)
      const minute = Number(minuteText)
      return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
    })))
    .sort((left, right) => left.localeCompare(right))
}

function buildCronExpressionForScheduleTime(value: string) {
  const [hour, minute] = value.split(':')
  return `0 ${Number(minute)} ${Number(hour)} * * *`
}

async function syncScheduledTaskForStrategy(strategyId: string, operatorId?: string | null) {
  const strategy = await prisma.waveStrategy.findUnique({
    where: { id: strategyId },
    include: {
      currentVersion: {
        include: {
          ruleSet: true,
        },
      },
    },
  })

  if (!strategy?.currentVersion?.ruleSet) {
    return
  }

  const rules = normalizeRuleSet(strategy.currentVersion.ruleSet)
  const taskCodePrefix = `wave-strategy-${strategy.id}`
  const existingTasks = await prisma.scheduledTask.findMany({
    where: {
      tenantId: strategy.tenantId,
      handler: 'wave-strategy-execute',
      OR: [
        {
          taskCode: {
            startsWith: taskCodePrefix,
          },
        },
        {
          params: {
            path: '$.strategyId',
            equals: strategy.id,
          },
        },
      ],
    },
  })

  const scheduleTimes = normalizeScheduleTimes(rules.triggerConfig.scheduleTimes)
  const scheduledEntries = scheduleTimes.length > 0
    ? scheduleTimes.map((time) => ({
        taskCode: `${taskCodePrefix}-${time.replace(':', '')}`,
        cronExpression: buildCronExpressionForScheduleTime(time),
        timeLabel: time,
      }))
    : rules.triggerConfig.cronExpression && cron.validate(rules.triggerConfig.cronExpression)
      ? [{
          taskCode: taskCodePrefix,
          cronExpression: rules.triggerConfig.cronExpression,
          timeLabel: null as string | null,
        }]
      : []

  const shouldSchedule =
    strategy.status === 'ENABLED' &&
    rules.triggerConfig.modes.includes('SCHEDULED') &&
    scheduledEntries.length > 0

  if (
    strategy.status === 'ENABLED' &&
    rules.triggerConfig.modes.includes('SCHEDULED') &&
    scheduledEntries.length === 0
  ) {
    throw new Error('未配置有效的指定运行时间，无法发布定时策略')
  }

  if (!shouldSchedule) {
    for (const task of existingTasks) {
      await prisma.scheduledTask.update({
        where: { id: task.id },
        data: {
          isActive: false,
          updatedBy: operatorId || undefined,
        },
      })
      await reloadTask(task.id)
    }
    return
  }

  if (scheduledEntries.some((item) => !cron.validate(item.cronExpression))) {
    throw new Error('无效的指定运行时间，无法发布定时策略')
  }

  const existingTaskMap = new Map(existingTasks.map((item) => [item.taskCode, item]))
  const desiredTaskCodes = new Set(scheduledEntries.map((item) => item.taskCode))

  for (const task of existingTasks) {
    if (desiredTaskCodes.has(task.taskCode)) continue
    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: {
        isActive: false,
        updatedBy: operatorId || undefined,
      },
    })
    await reloadTask(task.id)
  }

  for (const entry of scheduledEntries) {
    const existing = existingTaskMap.get(entry.taskCode)
    const task = existing
      ? await prisma.scheduledTask.update({
        where: { id: existing.id },
        data: {
          taskName: entry.timeLabel ? `波次策略-${strategy.strategyName}-${entry.timeLabel}` : `波次策略-${strategy.strategyName}`,
          description: entry.timeLabel ? `波次策略自动执行：${strategy.strategyName} @ ${entry.timeLabel}` : `波次策略自动执行：${strategy.strategyName}`,
          cronExpression: entry.cronExpression,
          timezone: DEFAULT_TIMEZONE,
          handler: 'wave-strategy-execute',
          params: {
            strategyId: strategy.id,
          },
          isActive: true,
          updatedBy: operatorId || undefined,
        },
      })
      : await prisma.scheduledTask.create({
        data: {
          tenantId: strategy.tenantId,
          taskCode: entry.taskCode,
          taskName: entry.timeLabel ? `波次策略-${strategy.strategyName}-${entry.timeLabel}` : `波次策略-${strategy.strategyName}`,
          description: entry.timeLabel ? `波次策略自动执行：${strategy.strategyName} @ ${entry.timeLabel}` : `波次策略自动执行：${strategy.strategyName}`,
          cronExpression: entry.cronExpression,
          timezone: DEFAULT_TIMEZONE,
          handler: 'wave-strategy-execute',
          params: {
            strategyId: strategy.id,
          },
          isActive: true,
          createdBy: operatorId || undefined,
          updatedBy: operatorId || undefined,
        },
      })

    await reloadTask(task.id)
  }
}

async function getStrategyOrThrow(tenantId: string, strategyId: string) {
  const strategy = await prisma.waveStrategy.findFirst({
    where: {
      id: strategyId,
      tenantId,
      isDeleted: false,
    },
    include: {
      currentVersion: {
        include: {
          ruleSet: true,
        },
      },
      versions: {
        orderBy: { versionNo: 'desc' },
        select: {
          id: true,
          versionNo: true,
          versionStatus: true,
          isCurrent: true,
          changeSummary: true,
          configSnapshot: true,
          publishedAt: true,
          publishedBy: true,
          createdAt: true,
        },
      },
    },
  })

  if (!strategy) {
    throw new Error('波次策略不存在')
  }

  const priorityConflictSummary = await getPriorityConflictSummary(
    tenantId,
    strategy.warehouseId,
    strategy.id,
    strategy.priority
  )

  return {
    ...strategy,
    priorityConflictSummary,
  }
}

async function ensureEditableVersion(strategy: StrategyDetail, operatorId?: string | null) {
  const currentVersion = strategy.currentVersion
  if (!currentVersion?.ruleSet) {
    throw new Error('当前策略版本不存在规则集')
  }

  if (currentVersion.versionStatus === 'EDITING') {
    return currentVersion
  }

  const nextVersionNo = strategy.latestVersionNo + 1
  const currentRuleSet = currentVersion.ruleSet
  const cloned = await prisma.$transaction(async (tx) => {
    const version = await tx.waveStrategyVersion.create({
      data: {
        tenantId: strategy.tenantId,
        strategyId: strategy.id,
        versionNo: nextVersionNo,
        versionStatus: 'EDITING',
        isCurrent: false,
        changeSummary: currentVersion.changeSummary,
        configSnapshot: cloneJson(currentVersion.configSnapshot as object),
        createdBy: operatorId || undefined,
      },
    })

    await tx.waveStrategyRuleSet.create({
      data: {
        tenantId: strategy.tenantId,
        strategyVersionId: version.id,
        triggerConfigJson: cloneJson(currentRuleSet.triggerConfigJson as object),
        filterConfigJson: cloneJson(currentRuleSet.filterConfigJson as object),
        executionConfigJson: cloneJson(currentRuleSet.executionConfigJson as object),
        waveTypeConfigJson: cloneJson(currentRuleSet.waveTypeConfigJson as object),
        pickConfigJson: cloneJson(currentRuleSet.pickConfigJson as object),
        releaseConfigJson: cloneJson(currentRuleSet.releaseConfigJson as object),
      },
    })

    await tx.waveStrategy.update({
      where: { id: strategy.id },
      data: {
        currentVersionId: version.id,
        latestVersionNo: nextVersionNo,
        updatedBy: operatorId || undefined,
      },
    })

    return tx.waveStrategyVersion.findUniqueOrThrow({
      where: { id: version.id },
      include: { ruleSet: true },
    })
  })

  return cloned
}

export async function listWaveStrategies(tenantId: string, query: ListWaveStrategiesQuery) {
  const where: Record<string, unknown> = {
    tenantId,
    isDeleted: false,
  }

  if (query.search) {
    where.OR = [
      { strategyCode: { contains: query.search } },
      { strategyName: { contains: query.search } },
    ]
  }

  if (query.warehouseId) where.warehouseId = query.warehouseId
  if (query.status) where.status = query.status

  const shouldFilterByRuleConfig = Boolean(query.clientId || query.shippingMethod)

  let total = 0
  let strategies: Awaited<ReturnType<typeof prisma.waveStrategy.findMany>> = []

  if (shouldFilterByRuleConfig) {
    const allStrategies = await prisma.waveStrategy.findMany({
      where,
      include: {
        currentVersion: {
          include: {
            ruleSet: {
              select: {
                triggerConfigJson: true,
                filterConfigJson: true,
              },
            },
          },
        },
      },
      orderBy: { [query.sortBy]: query.sortOrder },
    })

    const normalizedShippingMethodQuery = query.shippingMethod?.trim().toLowerCase()

    const filteredStrategies = allStrategies.filter((strategy) => {
      const filterConfig = parseStrategyFilterConfig(strategy.currentVersion?.ruleSet?.filterConfigJson)

      const matchesClient = query.clientId
        ? filterConfig.clientIds.includes(query.clientId)
        : true

      const matchesShippingMethod = normalizedShippingMethodQuery
        ? filterConfig.shippingMethods.some((shippingMethod) => shippingMethod.toLowerCase().includes(normalizedShippingMethodQuery))
        : true

      return matchesClient && matchesShippingMethod
    })

    total = filteredStrategies.length
    strategies = filteredStrategies.slice(
      (query.page - 1) * query.pageSize,
      query.page * query.pageSize
    )
  } else {
    [total, strategies] = await Promise.all([
      prisma.waveStrategy.count({ where }),
      prisma.waveStrategy.findMany({
        where,
        include: {
          currentVersion: {
            include: {
              ruleSet: {
                select: {
                  triggerConfigJson: true,
                },
              },
            },
          },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ])
  }

  const warehouseIds = Array.from(new Set(strategies.map((strategy) => strategy.warehouseId)))
  const warehouses = warehouseIds.length > 0
    ? await prisma.warehouse.findMany({
        where: {
          id: { in: warehouseIds },
        },
        select: {
          id: true,
          warehouseCode: true,
          warehouseName: true,
        },
      })
    : []
  const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]))

  const enrichedStrategies = strategies.map((strategy) => ({
    ...strategy,
    warehouse: warehouseMap.get(strategy.warehouseId) || null,
  }))

  const strategyIds = enrichedStrategies.map((strategy) => strategy.id)
  const startedAtFilter = buildStartedAtFilter(query.timePreset)
  const [latestSimulateRuns, latestExecuteRuns] = strategyIds.length > 0
    ? await Promise.all([
        prisma.waveStrategyRun.findMany({
          where: {
            tenantId,
            strategyId: { in: strategyIds },
            runMode: 'SIMULATE',
            ...(startedAtFilter ? { startedAt: startedAtFilter } : {}),
          },
          select: {
            id: true,
            strategyId: true,
            runMode: true,
            runStatus: true,
            startedAt: true,
            finishedAt: true,
            candidateOrderCount: true,
            matchedOrderCount: true,
            claimedByHigherCount: true,
            unclassifiedOrderCount: true,
            createdWaveCount: true,
            createdPickOrderCount: true,
          },
          orderBy: [{ strategyId: 'asc' }, { startedAt: 'desc' }],
          distinct: ['strategyId'],
        }),
        prisma.waveStrategyRun.findMany({
          where: {
            tenantId,
            strategyId: { in: strategyIds },
            runMode: 'EXECUTE',
            ...(startedAtFilter ? { startedAt: startedAtFilter } : {}),
          },
          select: {
            id: true,
            strategyId: true,
            runMode: true,
            runStatus: true,
            startedAt: true,
            finishedAt: true,
            candidateOrderCount: true,
            matchedOrderCount: true,
            claimedByHigherCount: true,
            unclassifiedOrderCount: true,
            createdWaveCount: true,
            createdPickOrderCount: true,
          },
          orderBy: [{ strategyId: 'asc' }, { startedAt: 'desc' }],
          distinct: ['strategyId'],
        }),
      ])
    : [[], []]

  const latestRunReasonSummary = await loadRunReasonSummary([
    ...latestSimulateRuns.map((run) => run.id),
    ...latestExecuteRuns.map((run) => run.id),
  ])

  const latestSimulateRunMap = new Map(
    latestSimulateRuns.map((run) => [
      run.strategyId,
      {
        ...run,
        reasonSummary: latestRunReasonSummary.get(run.id) || [],
      },
    ])
  )

  const latestExecuteRunMap = new Map(
    latestExecuteRuns.map((run) => [
      run.strategyId,
      {
        ...run,
        reasonSummary: latestRunReasonSummary.get(run.id) || [],
      },
    ])
  )

  const priorityConflictSummaryMap = await loadPriorityConflictSummaryMap(
    tenantId,
    enrichedStrategies.map((strategy) => ({
      id: strategy.id,
      warehouseId: strategy.warehouseId,
      priority: strategy.priority,
    }))
  )

  const withConflictSummary = enrichedStrategies.map((strategy) => ({
    ...strategy,
    latestRunSummary: {
      simulate: latestSimulateRunMap.get(strategy.id) || null,
      execute: latestExecuteRunMap.get(strategy.id) || null,
    },
    priorityConflictSummary: priorityConflictSummaryMap.get(strategy.id) || {
      higherPriorityCount: 0,
      samePriorityCount: 0,
      lowerPriorityCount: 0,
      higherPriorityStrategies: [],
      samePriorityStrategies: [],
      lowerPriorityStrategies: [],
    },
  }))

  return {
    data: withConflictSummary,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  }
}

export async function createWaveStrategy(
  tenantId: string,
  operatorId: string | null | undefined,
  input: CreateWaveStrategyInput
) {
  const existing = await prisma.waveStrategy.findFirst({
    where: {
      tenantId,
      strategyCode: input.strategyCode,
      isDeleted: false,
    },
    select: { id: true },
  })

  if (existing) {
    throw new Error('策略编码已存在')
  }

  const created = await prisma.$transaction(async (tx) => {
    const strategy = await tx.waveStrategy.create({
      data: {
        tenantId,
        warehouseId: input.warehouseId,
        strategyCode: input.strategyCode,
        strategyName: input.strategyName,
        description: input.description ?? null,
        priority: input.priority,
        status: input.status,
        latestVersionNo: 1,
        createdBy: operatorId || undefined,
        updatedBy: operatorId || undefined,
      },
    })

    const snapshot = buildConfigSnapshot(
      {
        id: strategy.id,
        strategyCode: strategy.strategyCode,
        strategyName: strategy.strategyName,
        warehouseId: strategy.warehouseId,
        priority: strategy.priority,
      },
      input.rules
    )

    const version = await tx.waveStrategyVersion.create({
      data: {
        tenantId,
        strategyId: strategy.id,
        versionNo: 1,
        versionStatus: 'EDITING',
        isCurrent: false,
        configSnapshot: snapshot,
        createdBy: operatorId || undefined,
      },
    })

    await tx.waveStrategyRuleSet.create({
      data: {
        tenantId,
        strategyVersionId: version.id,
        triggerConfigJson: input.rules.triggerConfig,
        filterConfigJson: input.rules.filterConfig,
        executionConfigJson: input.rules.executionConfig,
        waveTypeConfigJson: input.rules.waveTypeConfig,
        pickConfigJson: input.rules.pickConfig,
        releaseConfigJson: input.rules.releaseConfig,
      },
    })

    await tx.waveStrategy.update({
      where: { id: strategy.id },
      data: {
        currentVersionId: version.id,
        updatedBy: operatorId || undefined,
      },
    })

    return strategy.id
  })

  return getStrategyOrThrow(tenantId, created)
}

export async function getWaveStrategyDetail(tenantId: string, strategyId: string) {
  return getStrategyOrThrow(tenantId, strategyId)
}

export async function updateWaveStrategy(
  tenantId: string,
  strategyId: string,
  operatorId: string | null | undefined,
  input: UpdateWaveStrategyInput
) {
  const strategy = await getStrategyOrThrow(tenantId, strategyId)
  const editableVersion = await ensureEditableVersion(strategy, operatorId)

  const nextRuleSet = input.rules ?? normalizeRuleSet(editableVersion.ruleSet!)
  const nextStrategyCode = input.strategyCode?.trim() || strategy.strategyCode
  const nextStrategyName = input.strategyName ?? strategy.strategyName
  const nextDescription = input.description === undefined ? strategy.description : input.description ?? null
  const nextPriority = input.priority ?? strategy.priority
  const nextStatus = input.status ?? strategy.status

  if (nextStrategyCode !== strategy.strategyCode) {
    const existing = await prisma.waveStrategy.findFirst({
      where: {
        tenantId,
        strategyCode: nextStrategyCode,
        isDeleted: false,
        id: { not: strategy.id },
      },
      select: { id: true },
    })

    if (existing) {
      throw new Error('策略编码已存在')
    }
  }

  const snapshot = buildConfigSnapshot(
    {
      id: strategy.id,
      strategyCode: nextStrategyCode,
      strategyName: nextStrategyName,
      warehouseId: strategy.warehouseId,
      priority: nextPriority,
    },
    nextRuleSet
  )

  await prisma.$transaction(async (tx) => {
    await tx.waveStrategy.update({
      where: { id: strategy.id },
      data: {
        strategyCode: nextStrategyCode,
        strategyName: nextStrategyName,
        description: nextDescription,
        priority: nextPriority,
        status: nextStatus,
        updatedBy: operatorId || undefined,
      },
    })

    await tx.waveStrategyVersion.update({
      where: { id: editableVersion.id },
      data: {
        configSnapshot: snapshot,
      },
    })

    await tx.waveStrategyRuleSet.update({
      where: { strategyVersionId: editableVersion.id },
      data: {
        triggerConfigJson: nextRuleSet.triggerConfig,
        filterConfigJson: nextRuleSet.filterConfig,
        executionConfigJson: nextRuleSet.executionConfig,
        waveTypeConfigJson: nextRuleSet.waveTypeConfig,
        pickConfigJson: nextRuleSet.pickConfig,
        releaseConfigJson: nextRuleSet.releaseConfig,
      },
    })
  })

  if (input.status !== undefined && input.status !== strategy.status) {
    await syncScheduledTaskForStrategy(strategyId, operatorId)
  }
  return getStrategyOrThrow(tenantId, strategyId)
}

export async function publishWaveStrategy(
  tenantId: string,
  strategyId: string,
  operatorId: string | null | undefined,
  input: PublishWaveStrategyInput
) {
  const strategy = await getStrategyOrThrow(tenantId, strategyId)
  const version = strategy.currentVersion

  if (!version?.ruleSet) {
    throw new Error('当前策略版本不存在')
  }

  const rules = normalizeRuleSet(version.ruleSet)
  const snapshot = buildConfigSnapshot(
    {
      id: strategy.id,
      strategyCode: strategy.strategyCode,
      strategyName: strategy.strategyName,
      warehouseId: strategy.warehouseId,
      priority: strategy.priority,
    },
    rules
  )

  await prisma.$transaction(async (tx) => {
    await tx.waveStrategyVersion.updateMany({
      where: {
        strategyId: strategy.id,
        isCurrent: true,
      },
      data: {
        isCurrent: false,
      },
    })

    await tx.waveStrategyVersion.update({
      where: { id: version.id },
      data: {
        versionStatus: 'PUBLISHED',
        isCurrent: true,
        changeSummary: input.changeSummary ?? version.changeSummary,
        configSnapshot: snapshot,
        publishedAt: new Date(),
        publishedBy: operatorId || undefined,
      },
    })

    await tx.waveStrategy.update({
      where: { id: strategy.id },
      data: {
        status: strategy.status === 'ARCHIVED' ? 'ARCHIVED' : 'ENABLED',
        currentVersionId: version.id,
        updatedBy: operatorId || undefined,
      },
    })
  })

  await syncScheduledTaskForStrategy(strategy.id, operatorId)
  return getStrategyOrThrow(tenantId, strategy.id)
}

export async function copyWaveStrategy(
  tenantId: string,
  strategyId: string,
  operatorId: string | null | undefined,
  input: CopyWaveStrategyInput
) {
  const strategy = await getStrategyOrThrow(tenantId, strategyId)
  const sourceVersion = strategy.currentVersion

  if (!sourceVersion?.ruleSet) {
    throw new Error('当前策略版本不存在')
  }

  const strategyCode = input.strategyCode ?? `${strategy.strategyCode}_COPY`
  const strategyName = input.strategyName ?? `${strategy.strategyName}-复制`

  const existing = await prisma.waveStrategy.findFirst({
    where: {
      tenantId,
      strategyCode,
      isDeleted: false,
    },
    select: { id: true },
  })

  if (existing) {
    throw new Error('复制后的策略编码已存在')
  }

  const rules = normalizeRuleSet(sourceVersion.ruleSet)
  const created = await prisma.$transaction(async (tx) => {
    const newStrategy = await tx.waveStrategy.create({
      data: {
        tenantId,
        warehouseId: strategy.warehouseId,
        strategyCode,
        strategyName,
        description: strategy.description,
        priority: strategy.priority,
        status: 'DRAFT',
        latestVersionNo: 1,
        createdBy: operatorId || undefined,
        updatedBy: operatorId || undefined,
      },
    })

    const snapshot = buildConfigSnapshot(
      {
        id: newStrategy.id,
        strategyCode: newStrategy.strategyCode,
        strategyName: newStrategy.strategyName,
        warehouseId: newStrategy.warehouseId,
        priority: newStrategy.priority,
      },
      rules
    )

    const newVersion = await tx.waveStrategyVersion.create({
      data: {
        tenantId,
        strategyId: newStrategy.id,
        versionNo: 1,
        versionStatus: 'EDITING',
        isCurrent: false,
        changeSummary: sourceVersion.changeSummary,
        configSnapshot: snapshot,
        createdBy: operatorId || undefined,
      },
    })

    await tx.waveStrategyRuleSet.create({
      data: {
        tenantId,
        strategyVersionId: newVersion.id,
        triggerConfigJson: rules.triggerConfig,
        filterConfigJson: rules.filterConfig,
        executionConfigJson: rules.executionConfig,
        waveTypeConfigJson: rules.waveTypeConfig,
        pickConfigJson: rules.pickConfig,
        releaseConfigJson: rules.releaseConfig,
      },
    })

    await tx.waveStrategy.update({
      where: { id: newStrategy.id },
      data: {
        currentVersionId: newVersion.id,
        updatedBy: operatorId || undefined,
      },
    })

    return newStrategy.id
  })

  return getStrategyOrThrow(tenantId, created)
}

export async function rollbackWaveStrategy(
  tenantId: string,
  strategyId: string,
  operatorId: string | null | undefined,
  input: RollbackWaveStrategyInput
) {
  const strategy = await getStrategyOrThrow(tenantId, strategyId)
  const targetVersion = await prisma.waveStrategyVersion.findFirst({
    where: {
      id: input.versionId,
      strategyId,
      tenantId,
    },
    include: {
      ruleSet: true,
    },
  })

  if (!targetVersion) {
    throw new Error('目标版本不存在')
  }

  const rules = targetVersion.ruleSet
    ? normalizeRuleSet(targetVersion.ruleSet)
    : cloneJson(targetVersion.configSnapshot as WaveStrategyRuleSetInput & { strategy?: unknown })

  const nextVersionNo = strategy.latestVersionNo + 1
  const snapshot = buildConfigSnapshot(
    {
      id: strategy.id,
      strategyCode: strategy.strategyCode,
      strategyName: strategy.strategyName,
      warehouseId: strategy.warehouseId,
      priority: strategy.priority,
    },
    rules
  )

  await prisma.$transaction(async (tx) => {
    await tx.waveStrategyVersion.updateMany({
      where: {
        strategyId: strategy.id,
        isCurrent: true,
      },
      data: {
        isCurrent: false,
      },
    })

    const version = await tx.waveStrategyVersion.create({
      data: {
        tenantId,
        strategyId: strategy.id,
        versionNo: nextVersionNo,
        versionStatus: 'PUBLISHED',
        isCurrent: true,
        changeSummary: `回滚至 V${targetVersion.versionNo}`,
        configSnapshot: snapshot,
        publishedAt: new Date(),
        publishedBy: operatorId || undefined,
        createdBy: operatorId || undefined,
      },
    })

    await tx.waveStrategyRuleSet.create({
      data: {
        tenantId,
        strategyVersionId: version.id,
        triggerConfigJson: rules.triggerConfig,
        filterConfigJson: rules.filterConfig,
        executionConfigJson: rules.executionConfig,
        waveTypeConfigJson: rules.waveTypeConfig,
        pickConfigJson: rules.pickConfig,
        releaseConfigJson: rules.releaseConfig,
      },
    })

    await tx.waveStrategy.update({
      where: { id: strategy.id },
      data: {
        currentVersionId: version.id,
        latestVersionNo: nextVersionNo,
        status: 'ENABLED',
        updatedBy: operatorId || undefined,
      },
    })
  })

  await syncScheduledTaskForStrategy(strategy.id, operatorId)
  return getStrategyOrThrow(tenantId, strategy.id)
}

export async function listWaveStrategyRuns(
  tenantId: string,
  query: {
    page: number
    pageSize: number
    strategyId?: string
    warehouseId?: string
    runMode?: string
    runStatus?: string
    reasonCode?: string
    timePreset?: 'last24hours' | 'last7days' | 'last30days'
    startedAtFrom?: string
    startedAtTo?: string
  }
) {
  const where: Record<string, unknown> = { tenantId }
  if (query.strategyId) where.strategyId = query.strategyId
  if (query.warehouseId) where.warehouseId = query.warehouseId
  if (query.runMode) where.runMode = query.runMode
  if (query.runStatus) where.runStatus = query.runStatus
  const startedAtFilter: Record<string, Date> = buildStartedAtFilter(query.timePreset) || {}
  if (query.startedAtFrom) {
    const parsedFrom = new Date(query.startedAtFrom)
    if (!Number.isNaN(parsedFrom.getTime())) {
      startedAtFilter.gte = parsedFrom
    }
  }
  if (query.startedAtTo) {
    const parsedTo = new Date(query.startedAtTo)
    if (!Number.isNaN(parsedTo.getTime())) {
      startedAtFilter.lte = parsedTo
    }
  }
  if (Object.keys(startedAtFilter).length > 0) {
    where.startedAt = startedAtFilter
  }
  if (query.reasonCode) {
    const runIds = await loadRunIdsByReasonCode(query.reasonCode)
    if (runIds && runIds.length === 0) {
      return {
        data: [],
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total: 0,
          totalPages: 0,
        },
      }
    }
    if (runIds) {
      where.id = {
        in: runIds,
      }
    }
  }

  const [total, runs] = await Promise.all([
    prisma.waveStrategyRun.count({ where }),
    prisma.waveStrategyRun.findMany({
      where,
      include: {
        strategy: {
          select: {
            strategyCode: true,
            strategyName: true,
            priority: true,
          },
        },
        strategyVersion: {
          select: {
            versionNo: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ])

  const runReasonSummary = await loadRunReasonSummary(runs.map((run) => run.id))

  return {
    data: runs.map((run) => ({
      ...run,
      reasonSummary: runReasonSummary.get(run.id) || [],
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  }
}

function buildRunStatusSummary(orders: WaveStrategyRunOrderDetailRecord[]) {
  const summary = {
    ALL: orders.length,
    MATCHED: 0,
    UNCLASSIFIED: 0,
    SKIPPED: 0,
    FAILED: 0,
    WAVED: 0,
  }

  for (const order of orders) {
    if (order.resultStatus === 'MATCHED') summary.MATCHED += 1
    if (order.resultStatus === 'UNCLASSIFIED') summary.UNCLASSIFIED += 1
    if (order.resultStatus === 'SKIPPED') summary.SKIPPED += 1
    if (order.resultStatus === 'FAILED') summary.FAILED += 1
    if (order.resultStatus === 'WAVED') summary.WAVED += 1
  }

  return summary
}

function buildRunBatchSummary(orders: WaveStrategyRunOrderDetailRecord[]) {
  const batchSizeMap = new Map<number, number>()

  for (const order of orders) {
    if (order.resultStatus === 'SKIPPED') continue
    batchSizeMap.set(order.batchNo, (batchSizeMap.get(order.batchNo) || 0) + 1)
  }

  const previewItems = Array.from(batchSizeMap.entries())
    .sort((left, right) => left[0] - right[0])
    .slice(0, 5)
    .map(([batchNo, count]) => ({ batchNo, count }))

  return {
    batchCount: batchSizeMap.size,
    maxOrdersInBatch: Array.from(batchSizeMap.values()).reduce((max, count) => Math.max(max, count), 0),
    previewItems,
  }
}

function buildRunDetailReasonSummary(orders: WaveStrategyRunOrderDetailRecord[]) {
  const counts = new Map<string, number>()

  for (const order of orders) {
    const reasonCode = getPrimaryReasonCode(parseMatchedRuleSnapshot(order.matchedRuleSnapshot))
    if (!reasonCode) continue
    counts.set(reasonCode, (counts.get(reasonCode) || 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([reasonCode, count]) => ({ reasonCode, count }))
    .sort((left, right) => right.count - left.count || left.reasonCode.localeCompare(right.reasonCode))
    .slice(0, 6)
}

function filterRunDetailOrders(
  orders: WaveStrategyRunOrderDetailRecord[],
  query: WaveStrategyRunDetailQuery
) {
  const normalizedSearch = query.search?.trim().toLowerCase() || ''
  const resultStatus = query.resultStatus && query.resultStatus !== 'ALL' ? query.resultStatus : null
  const reasonCategory: ReasonCategory = query.reasonCategory || 'ALL'

  return orders.filter((order) => {
    const snapshot = parseMatchedRuleSnapshot(order.matchedRuleSnapshot)
    const matchesStatus = !resultStatus || order.resultStatus === resultStatus
    const matchesReason = reasonCategory === 'ALL' || getReasonCategory(snapshot) === reasonCategory
    const matchesSearch = !normalizedSearch
      || order.orderId.toLowerCase().includes(normalizedSearch)
      || order.order?.orderNumber.toLowerCase().includes(normalizedSearch)
      || (order.order?.platformOrderId || '').toLowerCase().includes(normalizedSearch)
      || (order.waveTypeCode || '').toLowerCase().includes(normalizedSearch)
      || (order.message || '').toLowerCase().includes(normalizedSearch)

    return matchesStatus && matchesReason && matchesSearch
  })
}

export async function getWaveStrategyRunDetail(
  tenantId: string,
  runId: string,
  query: WaveStrategyRunDetailQuery = { page: 1, pageSize: 20, reasonCategory: 'ALL' }
) {
  const run = await prisma.waveStrategyRun.findFirst({
    where: {
      id: runId,
      tenantId,
    },
    include: {
      strategy: {
        select: {
          strategyCode: true,
          strategyName: true,
          priority: true,
        },
      },
      strategyVersion: {
        select: {
          versionNo: true,
        },
      },
      orders: {
        select: {
          id: true,
          orderId: true,
          batchNo: true,
          matchedStrategy: true,
          claimedByStrategyId: true,
          waveTypeCode: true,
          pickMode: true,
          downstreamMode: true,
          resultStatus: true,
          waveId: true,
          pickOrderId: true,
          message: true,
          matchedRuleSnapshot: true,
          createdAt: true,
          order: {
            select: {
              orderNumber: true,
              platformOrderId: true,
            },
          },
        },
        orderBy: [{ batchNo: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!run) {
    throw new Error('策略运行记录不存在')
  }

  const filteredOrders = filterRunDetailOrders(run.orders, query)
  const total = filteredOrders.length
  const page = query.page
  const pageSize = query.pageSize
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const normalizedPage = Math.min(page, totalPages)
  const startIndex = (normalizedPage - 1) * pageSize
  const pagedOrders = filteredOrders.slice(startIndex, startIndex + pageSize).map((order) => ({
    ...order,
    matchedRuleSnapshot: parseMatchedRuleSnapshot(order.matchedRuleSnapshot),
  }))

  return {
    ...run,
    orders: pagedOrders,
    pagination: {
      page: normalizedPage,
      pageSize,
      total,
      totalPages,
    },
    statusSummary: buildRunStatusSummary(run.orders),
    batchSummary: buildRunBatchSummary(run.orders),
    reasonSummary: buildRunDetailReasonSummary(run.orders),
  }
}
