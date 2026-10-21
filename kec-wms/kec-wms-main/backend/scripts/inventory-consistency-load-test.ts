import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Prisma } from '@prisma/client'
import { prisma } from '../src/lib/db/prisma'
import type { AuthUser } from '../src/lib/auth/middleware'
import { putaway, pick, ship, freeze, unfreeze, transfer, adjust } from '../src/lib/services/inventory-operation-service'
import { allocateInventorySync, deallocateInventorySync } from '../src/lib/services/inventory-allocation-service'
import {
  createInventoryCountOrder,
  generateInventoryCountScope,
  getInventoryCountOrderDetail,
  startInventoryCountBatch,
  submitInventoryCountTaskLines,
  confirmInventoryCountDifferences,
  startInventoryCountDisposal,
  completeInventoryCountDisposal,
  settleInventoryCountOrder,
} from '../src/lib/services/inventory-count-service'
import { BucketType } from '../src/lib/services/inventory-event-service'
import { createOrUpdatePickingShortageCases, generateSupplementPickOrder, manuallyCompleteSupplementPickOrder } from '../src/lib/services/picking-exception-service'
import { updateLocationSnapshot, updateSkuSummary } from '../src/lib/services/inventory-snapshot-service'

const DEFAULT_CONCURRENCY = 20
const DEFAULT_ROUNDS = 5
const DEFAULT_INITIAL_QTY = 10_000
const DEFAULT_SNAPSHOT_WAIT_MS = 30_000
const DEFAULT_SNAPSHOT_POLL_INTERVAL_MS = 1_000
const EMPTY_JSON = {} as Prisma.InputJsonObject

const DEFAULT_SCENARIOS = [
  'putaway',
  'allocate_deallocate',
  'pick',
  'ship',
  'transfer',
  'freeze_unfreeze',
  'adjust',
  'inventory_count',
  'pick_shortage_supplement',
] as const

type ScenarioName = (typeof DEFAULT_SCENARIOS)[number]

type QuantityField =
  | 'qtyAvailable'
  | 'qtyAllocated'
  | 'qtyFrozen'
  | 'qtyDefective'
  | 'qtyPicking'
  | 'qtyQcHold'
  | 'qtyCountHold'

type ScenarioResult = {
  scenario: ScenarioName
  durationMs: number
  deltas: BucketDelta[]
}

type ScenarioDefinition = {
  name: ScenarioName
  parallelSafe: boolean
  runOnce: boolean
  run: (ctx: RunContext, token: string) => Promise<BucketDelta[]>
}

type BucketDimensions = {
  tenantId: string
  warehouseId: string
  clientId: string
  locationId: string
  skuId: string
  skuCode: string
  batchNumber: string
  lpn: string
  asnNumber: string
  bucketType: string
  expiryDateKey: string
}

type BucketFact = BucketDimensions & {
  quantity: number
}

type BucketDelta = BucketDimensions & {
  quantityDelta: number
}

type SnapshotProjection = {
  tenantId: string
  warehouseId: string
  clientId: string
  locationId: string
  skuId: string
  skuCode: string
  batchNumber: string
  lpn: string
  asnNumber: string
  expiryDateKey: string
  qtyAvailable: number
  qtyAllocated: number
  qtyFrozen: number
  qtyDefective: number
  qtyPicking: number
  qtyQcHold: number
  qtyCountHold: number
  totalOnHand: number
}

type SummaryProjection = {
  tenantId: string
  warehouseId: string
  clientId: string
  skuId: string
  skuCode: string
  qtyAvailable: number
  qtyAllocated: number
  qtyFrozen: number
  qtyDefective: number
  qtyPicking: number
  totalOnHand: number
  locationCount: number
}

type RunOptions = {
  concurrency: number
  rounds: number
  initialQty: number
  cleanup: boolean
  snapshotWaitMs: number
  snapshotPollIntervalMs: number
  summaryJsonPath?: string
  scenarios: ScenarioName[]
}

type WarehouseLocation = {
  id: string
  zoneId: string
  locationCode: string
  locationType: string | null
  isPickable: boolean
  isReceivable: boolean
}

type WarehouseContext = {
  tenantId: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  authUser: AuthUser
  mainLocation: WarehouseLocation
  transferLocation: WarehouseLocation
  alternateLocation: WarehouseLocation
  stagingLocation: WarehouseLocation
}

type ClientSkuFixture = {
  clientId: string
  clientCode: string
  clientName: string
  skuId: string
  skuCode: string
  skuName: string
}

type CountSeed = {
  location: WarehouseLocation
  batchNumber: string
  asnNumber: string
  bookQuantity: number
  countedQuantity: number
}

type Fixtures = {
  direct: ClientSkuFixture
  count: ClientSkuFixture
  shortage: ClientSkuFixture
  directMainBatch: string
  directMainAsn: string
  shortageSourceBatch: string
  shortageSourceAsn: string
  countSeeds: CountSeed[]
}

type CreatedResources = {
  clientIds: Set<string>
  skuIds: Set<string>
  outboundOrderIds: Set<string>
  pickOrderIds: Set<string>
  inventoryCountOrderIds: Set<string>
}

type ScenarioMetric = {
  runs: number
  totalDurationMs: number
}

type SummaryReport = {
  runPrefix: string
  startedAt: string
  finishedAt?: string
  options: RunOptions
  warehouse: {
    tenantId: string
    warehouseId: string
    warehouseCode: string
    warehouseName: string
  }
  selectedScenarios: ScenarioName[]
  executedScenarios: ScenarioName[]
  roundsCompleted: number
  scenarioMetrics: Record<ScenarioName, ScenarioMetric>
  cleanupRequested: boolean
  cleanupCompleted: boolean
  success: boolean
  error?: string
  diagnostics: {
    layer: 'none' | 'bucket' | 'event' | 'derived' | 'lock' | 'runtime'
    bucketDiffCount: number
    eventDiffCount: number
    snapshotDiffCount: number
    summaryDiffCount: number
    activeLockCount: number
    samples: string[]
  }
}

function buildReadableSummary(summary: SummaryReport) {
  const scenarioLines = Object.entries(summary.scenarioMetrics)
    .filter(([, metric]) => metric.runs > 0)
    .map(([name, metric]) => {
      const avg = metric.runs > 0 ? Math.round(metric.totalDurationMs / metric.runs) : 0
      return `- ${name}: runs=${metric.runs}, totalMs=${metric.totalDurationMs}, avgMs=${avg}`
    })

  const statusLine = summary.success
    ? '结果: 通过'
    : '结果: 失败'

  const roundsLine = `轮次: ${summary.roundsCompleted}/${summary.options.rounds}`
  const cleanupLine = `清理: requested=${summary.cleanupRequested}, completed=${summary.cleanupCompleted}`
  const runPrefixLine = `前缀: ${summary.runPrefix}`

  const errorLine = summary.error
    ? `异常: ${summarizeError(summary.error)}`
    : '异常: 无'

  const diagnosticLine = [
    `诊断: layer=${summary.diagnostics.layer}`,
    `bucket=${summary.diagnostics.bucketDiffCount}`,
    `event=${summary.diagnostics.eventDiffCount}`,
    `snapshot=${summary.diagnostics.snapshotDiffCount}`,
    `summary=${summary.diagnostics.summaryDiffCount}`,
    `activeLock=${summary.diagnostics.activeLockCount}`,
  ].join(', ')

  const sampleLines = summary.diagnostics.samples.length > 0
    ? ['样本:', ...summary.diagnostics.samples.map((item) => `- ${summarizeError(item)}`)]
    : []

  return [
    runPrefixLine,
    statusLine,
    roundsLine,
    cleanupLine,
    errorLine,
    diagnosticLine,
    '场景:',
    ...scenarioLines,
    ...sampleLines,
  ].join('\n')
}

function summarizeError(error: string) {
  const text = error.replace(/\s+/g, ' ').trim()
  const limit = 320
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

function setDiagnostics(
  summary: SummaryReport,
  patch: Partial<SummaryReport['diagnostics']>
) {
  summary.diagnostics = {
    ...summary.diagnostics,
    ...patch,
  }
}

function buildDiagnosticsFromError(error?: string): SummaryReport['diagnostics'] {
  if (!error) {
    return {
      layer: 'none',
      bucketDiffCount: 0,
      eventDiffCount: 0,
      snapshotDiffCount: 0,
      summaryDiffCount: 0,
      activeLockCount: 0,
      samples: [],
    }
  }

  const normalized = error.replace(/\s+/g, ' ').trim()
  const samples = normalized
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3)

  if (normalized.includes('事实层不一致')) {
    return {
      layer: 'bucket',
      bucketDiffCount: Math.max(1, samples.length),
      eventDiffCount: 0,
      snapshotDiffCount: 0,
      summaryDiffCount: 0,
      activeLockCount: 0,
      samples,
    }
  }

  if (normalized.includes('事件层不一致')) {
    return {
      layer: 'event',
      bucketDiffCount: 0,
      eventDiffCount: Math.max(1, samples.length),
      snapshotDiffCount: 0,
      summaryDiffCount: 0,
      activeLockCount: 0,
      samples,
    }
  }

  if (normalized.includes('派生层对账超时')) {
    const snapshotMatch = normalized.match(/snapshot_diff=([^;]+?)(?:; summary_diff=|$)/)
    const summaryMatch = normalized.match(/summary_diff=(.+)$/)
    const snapshotParts = snapshotMatch?.[1]
      ? snapshotMatch[1].split('|').map((item) => item.trim()).filter(Boolean).slice(0, 3)
      : []
    const summaryParts = summaryMatch?.[1]
      ? summaryMatch[1].split('|').map((item) => item.trim()).filter(Boolean).slice(0, 3)
      : []
    return {
      layer: 'derived',
      bucketDiffCount: 0,
      eventDiffCount: 0,
      snapshotDiffCount: snapshotParts.length,
      summaryDiffCount: summaryParts[0] === 'none' ? 0 : summaryParts.length,
      activeLockCount: 0,
      samples: [...snapshotParts, ...summaryParts.filter((item) => item !== 'none')].slice(0, 3),
    }
  }

  if (normalized.includes('仍存在未释放的盘点锁')) {
    const countMatch = normalized.match(/未释放的盘点锁：(\d+)/)
    return {
      layer: 'lock',
      bucketDiffCount: 0,
      eventDiffCount: 0,
      snapshotDiffCount: 0,
      summaryDiffCount: 0,
      activeLockCount: countMatch ? Number.parseInt(countMatch[1], 10) : 1,
      samples,
    }
  }

  return {
    layer: 'runtime',
    bucketDiffCount: 0,
    eventDiffCount: 0,
    snapshotDiffCount: 0,
    summaryDiffCount: 0,
    activeLockCount: 0,
    samples,
  }
}

type RunContext = {
  options: RunOptions
  warehouse: WarehouseContext
  fixtures: Fixtures
  resources: CreatedResources
  runPrefix: string
  startedAt: Date
  nextToken: () => string
}

function readIntEnv(name: string, fallback: number) {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`环境变量 ${name} 必须是正整数，当前值：${raw}`)
  }
  return parsed
}

function readBoolEnv(name: string) {
  const raw = process.env[name]
  if (!raw) return false
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase())
}

function parseScenarios(raw: string | undefined): ScenarioName[] {
  if (!raw || !raw.trim()) {
    return [...DEFAULT_SCENARIOS]
  }

  const requested = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const valid = new Set<ScenarioName>(DEFAULT_SCENARIOS)
  const invalid = requested.filter((item) => !valid.has(item as ScenarioName))
  if (invalid.length > 0) {
    throw new Error(`SCENARIOS 包含未知场景：${invalid.join(', ')}`)
  }

  return [...new Set(requested as ScenarioName[])]
}

function buildOptions(): RunOptions {
  return {
    concurrency: readIntEnv('CONCURRENCY', DEFAULT_CONCURRENCY),
    rounds: readIntEnv('ROUNDS', DEFAULT_ROUNDS),
    initialQty: readIntEnv('INITIAL_QTY', DEFAULT_INITIAL_QTY),
    cleanup: readBoolEnv('CLEANUP'),
    snapshotWaitMs: readIntEnv('SNAPSHOT_WAIT_MS', DEFAULT_SNAPSHOT_WAIT_MS),
    snapshotPollIntervalMs: readIntEnv('SNAPSHOT_POLL_INTERVAL_MS', DEFAULT_SNAPSHOT_POLL_INTERVAL_MS),
    summaryJsonPath: process.env.SUMMARY_JSON_PATH?.trim() || undefined,
    scenarios: parseScenarios(process.env.SCENARIOS),
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomInt(min: number, max: number) {
  if (max <= min) return min
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffleArray<T>(items: T[]) {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = current
  }
  return next
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() || ''
}

function toExpiryDateKey(value: Date | string | null | undefined) {
  if (!value) return '1000-01-01'
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? '1000-01-01' : date.toISOString().slice(0, 10)
}

function bucketKey(dimensions: BucketDimensions) {
  return [
    dimensions.tenantId,
    dimensions.warehouseId,
    dimensions.clientId,
    dimensions.locationId,
    dimensions.skuId,
    dimensions.batchNumber,
    dimensions.lpn,
    dimensions.asnNumber,
    dimensions.bucketType,
    dimensions.expiryDateKey,
  ].join('|')
}

function snapshotProjectionKey(row: {
  tenantId: string
  warehouseId: string
  clientId: string
  locationId: string
  skuId: string
  batchNumber: string
  lpn: string
  asnNumber: string
  expiryDateKey: string
}) {
  return [
    row.tenantId,
    row.warehouseId,
    row.clientId,
    row.locationId,
    row.skuId,
    row.batchNumber,
    row.lpn,
    row.asnNumber,
    row.expiryDateKey,
  ].join('|')
}

function summaryProjectionKey(row: {
  tenantId: string
  warehouseId: string
  clientId: string
  skuId: string
}) {
  return [row.tenantId, row.warehouseId, row.clientId, row.skuId].join('|')
}

function cloneBucketMap(input: Map<string, BucketFact>) {
  return new Map<string, BucketFact>([...input.entries()].map(([key, value]) => [key, { ...value }]))
}

function applyDeltaMap(target: Map<string, BucketFact>, deltas: BucketDelta[]) {
  for (const delta of deltas) {
    const key = bucketKey(delta)
    const existing = target.get(key)
    const nextQuantity = (existing?.quantity || 0) + delta.quantityDelta
    if (nextQuantity < 0) {
      throw new Error(`内存账本出现负库存：${key} -> ${nextQuantity}`)
    }
    if (nextQuantity === 0) {
      target.delete(key)
      continue
    }
    target.set(key, {
      ...delta,
      quantity: nextQuantity,
    })
  }
}

function accumulateScenarioMetric(summary: SummaryReport, scenario: ScenarioName, durationMs: number) {
  const metric = summary.scenarioMetrics[scenario]
  metric.runs += 1
  metric.totalDurationMs += durationMs
  if (!summary.executedScenarios.includes(scenario)) {
    summary.executedScenarios.push(scenario)
  }
}

function ensure<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message)
  }
  return value
}

async function queryTestUserAndWarehouse(): Promise<WarehouseContext> {
  const userWarehouse = await prisma.userWarehouse.findFirst({
    where: {
      isActive: true,
      warehouse: {
        status: 'ACTIVE',
      },
      user: {
        status: 'ACTIVE',
        isActive: true,
      },
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'asc' },
    ],
    select: {
      tenantId: true,
      warehouseId: true,
      warehouse: {
        select: {
          warehouseCode: true,
          warehouseName: true,
        },
      },
      user: {
        select: {
          id: true,
          tenantId: true,
          username: true,
          fullName: true,
          userType: true,
        },
      },
    },
  })

  if (!userWarehouse) {
    throw new Error('未找到可用的用户仓库绑定，请先准备测试用户与仓库')
  }

  const locations = await prisma.binLocation.findMany({
    where: {
      tenantId: userWarehouse.tenantId,
      warehouseId: userWarehouse.warehouseId,
      status: 'ACTIVE',
      lockStatus: 'UNLOCKED',
    },
    orderBy: [
      { isPickable: 'desc' },
      { isReceivable: 'desc' },
      { pickSequence: 'asc' },
      { locationCode: 'asc' },
    ],
    select: {
      id: true,
      zoneId: true,
      locationCode: true,
      locationType: true,
      isPickable: true,
      isReceivable: true,
    },
  })

  const stagingLocation = locations.find((location) => location.locationType === 'STAGING')
  if (!stagingLocation) {
    throw new Error('当前仓库缺少可用的 STAGING 暂存库位，无法完成盘点差异处理验证')
  }

  const preferredOperational = locations.filter((location) => location.id !== stagingLocation.id)
  const operationalPool = preferredOperational.length >= 3 ? preferredOperational : locations
  const chosen = operationalPool.slice(0, 3)
  if (chosen.length < 3) {
    throw new Error('当前仓库至少需要 3 个可用库位，才能执行移库、盘点和补拣场景')
  }

  return {
    tenantId: userWarehouse.tenantId,
    warehouseId: userWarehouse.warehouseId,
    warehouseCode: userWarehouse.warehouse.warehouseCode,
    warehouseName: userWarehouse.warehouse.warehouseName,
    authUser: {
      id: userWarehouse.user.id,
      tenantId: userWarehouse.user.tenantId,
      tenantCode: '',
      username: userWarehouse.user.username,
      name: userWarehouse.user.fullName,
      userType: userWarehouse.user.userType,
      warehouseId: userWarehouse.warehouseId,
      terminalType: 'WEB',
    },
    mainLocation: chosen[0],
    transferLocation: chosen[1],
    alternateLocation: chosen[2],
    stagingLocation,
  }
}

async function createClientSkuFixture(
  ctx: WarehouseContext,
  resources: CreatedResources,
  runPrefix: string,
  suffix: string,
  label: string
): Promise<ClientSkuFixture> {
  const clientCode = `${runPrefix}-${suffix}`.slice(0, 32).toUpperCase()
  const skuCode = `${runPrefix}-${suffix}-SKU`.slice(0, 64).toUpperCase()
  const client = await prisma.client.create({
    data: {
      tenantId: ctx.tenantId,
      clientCode,
      clientName: `${label}-${runPrefix}`,
      config: EMPTY_JSON,
      createdBy: ctx.authUser.id,
      updatedBy: ctx.authUser.id,
    },
  })
  const sku = await prisma.sku.create({
    data: {
      tenantId: ctx.tenantId,
      clientId: client.id,
      skuCode,
      skuName: `${label}-${runPrefix}`,
      unit: 'PCS',
      status: 'ACTIVE',
      config: EMPTY_JSON,
      createdBy: ctx.authUser.id,
      updatedBy: ctx.authUser.id,
    },
  })

  resources.clientIds.add(client.id)
  resources.skuIds.add(sku.id)

  return {
    clientId: client.id,
    clientCode: client.clientCode,
    clientName: client.clientName,
    skuId: sku.id,
    skuCode: sku.skuCode,
    skuName: sku.skuName,
  }
}

async function seedFixtures(
  warehouse: WarehouseContext,
  resources: CreatedResources,
  runPrefix: string,
  initialQty: number
): Promise<Fixtures> {
  const direct = await createClientSkuFixture(warehouse, resources, runPrefix, 'DIR', '并发压测-直接库存')
  const count = await createClientSkuFixture(warehouse, resources, runPrefix, 'CNT', '并发压测-盘点')
  const shortage = await createClientSkuFixture(warehouse, resources, runPrefix, 'SHT', '并发压测-补拣')

  const directMainBatch = `${runPrefix}-MAIN`
  const directMainAsn = `${runPrefix}-ASN-A`
  const shortageSourceBatch = `${runPrefix}-SRC`
  const shortageSourceAsn = `${runPrefix}-ASN-S`
  const countSeeds: CountSeed[] = [
    {
      location: warehouse.mainLocation,
      batchNumber: `${runPrefix}-CNT-A`,
      asnNumber: `${runPrefix}-CNT-ASN-A`,
      bookQuantity: 5,
      countedQuantity: 5,
    },
    {
      location: warehouse.transferLocation,
      batchNumber: `${runPrefix}-CNT-B`,
      asnNumber: `${runPrefix}-CNT-ASN-B`,
      bookQuantity: 5,
      countedQuantity: 4,
    },
    {
      location: warehouse.alternateLocation,
      batchNumber: `${runPrefix}-CNT-C`,
      asnNumber: `${runPrefix}-CNT-ASN-C`,
      bookQuantity: 5,
      countedQuantity: 6,
    },
  ]

  await putaway({
    tenantId: warehouse.tenantId,
    clientId: direct.clientId,
    warehouseId: warehouse.warehouseId,
    locationId: warehouse.mainLocation.id,
    skuId: direct.skuId,
    skuCode: direct.skuCode,
    quantity: initialQty,
    batchNumber: directMainBatch,
    asnNumber: directMainAsn,
    fifoDate: new Date('2026-01-01T00:00:00.000Z'),
    referenceType: 'LOAD_TEST_SEED',
    referenceNumber: `${runPrefix}-SEED-DIRECT`,
    operatorId: warehouse.authUser.id,
  })

  await putaway({
    tenantId: warehouse.tenantId,
    clientId: shortage.clientId,
    warehouseId: warehouse.warehouseId,
    locationId: warehouse.mainLocation.id,
    skuId: shortage.skuId,
    skuCode: shortage.skuCode,
    quantity: initialQty,
    batchNumber: `${runPrefix}-SHT-A`,
    asnNumber: `${runPrefix}-SHT-ASN-A`,
    fifoDate: new Date('2026-01-03T00:00:00.000Z'),
    referenceType: 'LOAD_TEST_SEED',
    referenceNumber: `${runPrefix}-SEED-SHORTAGE-A`,
    operatorId: warehouse.authUser.id,
  })

  await putaway({
    tenantId: warehouse.tenantId,
    clientId: shortage.clientId,
    warehouseId: warehouse.warehouseId,
    locationId: warehouse.alternateLocation.id,
    skuId: shortage.skuId,
    skuCode: shortage.skuCode,
    quantity: initialQty,
    batchNumber: shortageSourceBatch,
    asnNumber: shortageSourceAsn,
    fifoDate: new Date('2026-01-04T00:00:00.000Z'),
    referenceType: 'LOAD_TEST_SEED',
    referenceNumber: `${runPrefix}-SEED-SHORTAGE-B`,
    operatorId: warehouse.authUser.id,
  })

  for (const [index, seed] of countSeeds.entries()) {
    await putaway({
      tenantId: warehouse.tenantId,
      clientId: count.clientId,
      warehouseId: warehouse.warehouseId,
      locationId: seed.location.id,
      skuId: count.skuId,
      skuCode: count.skuCode,
      quantity: seed.bookQuantity,
      batchNumber: seed.batchNumber,
      asnNumber: seed.asnNumber,
      fifoDate: new Date(`2026-01-1${index + 1}T00:00:00.000Z`),
      referenceType: 'LOAD_TEST_SEED',
      referenceNumber: `${runPrefix}-SEED-COUNT-${index + 1}`,
      operatorId: warehouse.authUser.id,
    })
  }

  return {
    direct,
    count,
    shortage,
    directMainBatch,
    directMainAsn,
    shortageSourceBatch,
    shortageSourceAsn,
    countSeeds,
  }
}

async function queryBucketFacts(skuIds: string[]) {
  const rows = await prisma.inventoryBucket.findMany({
    where: {
      skuId: { in: skuIds },
      quantity: { not: 0 },
    },
    select: {
      tenantId: true,
      warehouseId: true,
      clientId: true,
      locationId: true,
      skuId: true,
      skuCode: true,
      batchNumber: true,
      lpn: true,
      asnNumber: true,
      bucketType: true,
      expiryDate: true,
      quantity: true,
    },
  })

  const map = new Map<string, BucketFact>()
  for (const row of rows) {
    const fact: BucketFact = {
      tenantId: row.tenantId,
      warehouseId: row.warehouseId,
      clientId: row.clientId,
      locationId: row.locationId,
      skuId: row.skuId,
      skuCode: row.skuCode,
      batchNumber: normalizeText(row.batchNumber),
      lpn: normalizeText(row.lpn),
      asnNumber: normalizeText(row.asnNumber),
      bucketType: row.bucketType,
      expiryDateKey: toExpiryDateKey(row.expiryDate),
      quantity: row.quantity,
    }
    map.set(bucketKey(fact), fact)
  }
  return map
}

async function queryEventDeltaFacts(skuIds: string[], baseline: Map<string, number>) {
  const rows = await prisma.inventoryEvent.findMany({
    where: {
      skuId: { in: skuIds },
    },
    select: {
      tenantId: true,
      warehouseId: true,
      clientId: true,
      locationId: true,
      skuId: true,
      skuCode: true,
      batchNumber: true,
      lpn: true,
      asnNumber: true,
      bucketType: true,
      quantityDelta: true,
    },
  })

  const current = new Map<string, number>()
  for (const row of rows) {
    const dimensions: BucketDimensions = {
      tenantId: row.tenantId,
      warehouseId: row.warehouseId,
      clientId: normalizeText(row.clientId),
      locationId: row.locationId,
      skuId: row.skuId,
      skuCode: row.skuCode,
      batchNumber: normalizeText(row.batchNumber),
      lpn: normalizeText(row.lpn),
      asnNumber: normalizeText(row.asnNumber),
      bucketType: row.bucketType,
      expiryDateKey: '1000-01-01',
    }
    const key = bucketKey(dimensions)
    current.set(key, (current.get(key) || 0) + row.quantityDelta)
  }

  const delta = new Map<string, number>()
  const keys = new Set<string>([...baseline.keys(), ...current.keys()])
  for (const key of keys) {
    const next = (current.get(key) || 0) - (baseline.get(key) || 0)
    if (next !== 0) {
      delta.set(key, next)
    }
  }
  return delta
}

async function queryEventBaseline(skuIds: string[]) {
  const rows = await prisma.inventoryEvent.findMany({
    where: {
      skuId: { in: skuIds },
    },
    select: {
      tenantId: true,
      warehouseId: true,
      clientId: true,
      locationId: true,
      skuId: true,
      skuCode: true,
      batchNumber: true,
      lpn: true,
      asnNumber: true,
      bucketType: true,
      quantityDelta: true,
    },
  })

  const map = new Map<string, number>()
  for (const row of rows) {
    const dimensions: BucketDimensions = {
      tenantId: row.tenantId,
      warehouseId: row.warehouseId,
      clientId: normalizeText(row.clientId),
      locationId: row.locationId,
      skuId: row.skuId,
      skuCode: row.skuCode,
      batchNumber: normalizeText(row.batchNumber),
      lpn: normalizeText(row.lpn),
      asnNumber: normalizeText(row.asnNumber),
      bucketType: row.bucketType,
      expiryDateKey: '1000-01-01',
    }
    const key = bucketKey(dimensions)
    map.set(key, (map.get(key) || 0) + row.quantityDelta)
  }
  return map
}

function buildExpectedDeltaMap(baseline: Map<string, BucketFact>, expected: Map<string, BucketFact>) {
  const delta = new Map<string, number>()
  const keys = new Set<string>([...baseline.keys(), ...expected.keys()])
  for (const key of keys) {
    const bucketType = key.split('|')[8] || ''
    if (bucketType === BucketType.COUNT_HOLD) {
      continue
    }
    const next = (expected.get(key)?.quantity || 0) - (baseline.get(key)?.quantity || 0)
    if (next !== 0) {
      delta.set(key, next)
    }
  }
  return delta
}

function compareBucketFacts(expected: Map<string, BucketFact>, actual: Map<string, BucketFact>) {
  const diffs: string[] = []
  const keys = new Set<string>([...expected.keys(), ...actual.keys()])
  for (const key of keys) {
    const expectedQty = expected.get(key)?.quantity || 0
    const actualQty = actual.get(key)?.quantity || 0
    if (expectedQty !== actualQty) {
      diffs.push(`${key}: expected=${expectedQty}, actual=${actualQty}`)
    }
  }
  return diffs
}

function compareEventDeltas(expected: Map<string, number>, actual: Map<string, number>) {
  const diffs: string[] = []
  const keys = new Set<string>([...expected.keys(), ...actual.keys()])
  for (const key of keys) {
    const bucketType = key.split('|')[8] || ''
    if (bucketType === BucketType.COUNT_HOLD) {
      continue
    }
    const expectedQty = expected.get(key) || 0
    const actualQty = actual.get(key) || 0
    if (expectedQty !== actualQty) {
      diffs.push(`${key}: expected_delta=${expectedQty}, actual_delta=${actualQty}`)
    }
  }
  return diffs
}

function quantityFieldForBucketType(bucketType: string): QuantityField | null {
  switch (bucketType) {
    case BucketType.AVAILABLE:
      return 'qtyAvailable'
    case BucketType.ALLOCATED:
      return 'qtyAllocated'
    case BucketType.FROZEN:
      return 'qtyFrozen'
    case BucketType.DEFECTIVE:
      return 'qtyDefective'
    case BucketType.PICKING:
      return 'qtyPicking'
    case BucketType.QC_HOLD:
      return 'qtyQcHold'
    default:
      return null
  }
}

function projectSnapshotsFromBuckets(buckets: Map<string, BucketFact>) {
  const grouped = new Map<string, {
    dimensions: Omit<SnapshotProjection, 'qtyAvailable' | 'qtyAllocated' | 'qtyFrozen' | 'qtyDefective' | 'qtyPicking' | 'qtyQcHold' | 'qtyCountHold' | 'totalOnHand'>
    quantities: Record<string, number>
  }>()

  for (const fact of buckets.values()) {
    const key = snapshotProjectionKey(fact)
    const current = grouped.get(key) || {
      dimensions: {
        tenantId: fact.tenantId,
        warehouseId: fact.warehouseId,
        clientId: fact.clientId,
        locationId: fact.locationId,
        skuId: fact.skuId,
        skuCode: fact.skuCode,
        batchNumber: fact.batchNumber,
        lpn: fact.lpn,
        asnNumber: fact.asnNumber,
        expiryDateKey: fact.expiryDateKey,
      },
      quantities: {},
    }
    current.quantities[fact.bucketType] = (current.quantities[fact.bucketType] || 0) + fact.quantity
    grouped.set(key, current)
  }

  const map = new Map<string, SnapshotProjection>()
  for (const [key, group] of grouped.entries()) {
    const qtyAvailable = group.quantities[BucketType.AVAILABLE] || 0
    const qtyAllocated = group.quantities[BucketType.ALLOCATED] || 0
    const qtyPicking = group.quantities[BucketType.PICKING] || 0
    const qtyFrozen = group.quantities[BucketType.FROZEN] || 0
    const qtyDefective = group.quantities[BucketType.DEFECTIVE] || 0
    const qtyQcHold = group.quantities[BucketType.QC_HOLD] || 0
    const totalOnHand = qtyAvailable + qtyAllocated + qtyPicking + qtyFrozen + qtyDefective + qtyQcHold

    if (totalOnHand === 0) {
      continue
    }

    map.set(key, {
      ...group.dimensions,
      qtyAvailable,
      qtyAllocated,
      qtyFrozen,
      qtyDefective,
      qtyPicking,
      qtyQcHold,
      qtyCountHold: 0,
      totalOnHand,
    })
  }

  return map
}

function projectSummariesFromBuckets(buckets: Map<string, BucketFact>) {
  const map = new Map<string, SummaryProjection>()
  const locationSets = new Map<string, Set<string>>()
  for (const fact of buckets.values()) {
    const key = summaryProjectionKey(fact)
    const current = map.get(key) || {
      tenantId: fact.tenantId,
      warehouseId: fact.warehouseId,
      clientId: fact.clientId,
      skuId: fact.skuId,
      skuCode: fact.skuCode,
      qtyAvailable: 0,
      qtyAllocated: 0,
      qtyFrozen: 0,
      qtyDefective: 0,
      qtyPicking: 0,
      totalOnHand: 0,
      locationCount: 0,
    }

    if (fact.quantity > 0) {
      const locationSet = locationSets.get(key) || new Set<string>()
      locationSet.add(fact.locationId)
      locationSets.set(key, locationSet)
    }

    switch (fact.bucketType) {
      case BucketType.AVAILABLE:
        current.qtyAvailable += fact.quantity
        current.totalOnHand += fact.quantity
        break
      case BucketType.ALLOCATED:
        current.qtyAllocated += fact.quantity
        current.totalOnHand += fact.quantity
        break
      case BucketType.FROZEN:
        current.qtyFrozen += fact.quantity
        current.totalOnHand += fact.quantity
        break
      case BucketType.DEFECTIVE:
        current.qtyDefective += fact.quantity
        current.totalOnHand += fact.quantity
        break
      case BucketType.PICKING:
        current.qtyPicking += fact.quantity
        current.totalOnHand += fact.quantity
        break
      case BucketType.QC_HOLD:
        current.totalOnHand += fact.quantity
        break
      default:
        break
    }

    map.set(key, current)
  }

  for (const [key, summary] of map.entries()) {
    summary.locationCount = locationSets.get(key)?.size || 0
  }
  return map
}

async function querySnapshotProjection(skuIds: string[]) {
  const rows = await prisma.inventorySnapshot.findMany({
    where: {
      skuId: { in: skuIds },
    },
    select: {
      tenantId: true,
      warehouseId: true,
      clientId: true,
      locationId: true,
      skuId: true,
      skuCode: true,
      batchNumber: true,
      lpn: true,
      asnNumber: true,
      expiryDate: true,
      qtyAvailable: true,
      qtyAllocated: true,
      qtyFrozen: true,
      qtyDefective: true,
      qtyPicking: true,
      qtyQcHold: true,
      qtyCountHold: true,
      totalOnHand: true,
    },
  })

  const map = new Map<string, SnapshotProjection>()
  for (const row of rows) {
    const projection: SnapshotProjection = {
      tenantId: row.tenantId,
      warehouseId: row.warehouseId,
      clientId: row.clientId,
      locationId: row.locationId,
      skuId: row.skuId,
      skuCode: row.skuCode,
      batchNumber: normalizeText(row.batchNumber),
      lpn: normalizeText(row.lpn),
      asnNumber: normalizeText(row.asnNumber),
      expiryDateKey: toExpiryDateKey(row.expiryDate),
      qtyAvailable: row.qtyAvailable,
      qtyAllocated: row.qtyAllocated,
      qtyFrozen: row.qtyFrozen,
      qtyDefective: row.qtyDefective,
      qtyPicking: row.qtyPicking,
      qtyQcHold: row.qtyQcHold,
      qtyCountHold: row.qtyCountHold,
      totalOnHand: row.totalOnHand,
    }
    const nonZero =
      projection.qtyAvailable ||
      projection.qtyAllocated ||
      projection.qtyFrozen ||
      projection.qtyDefective ||
      projection.qtyPicking ||
      projection.qtyQcHold ||
      projection.qtyCountHold ||
      projection.totalOnHand
    if (!nonZero) continue
    map.set(snapshotProjectionKey(projection), projection)
  }
  return map
}

async function querySummaryProjection(skuIds: string[]) {
  const rows = await prisma.skuInventorySummary.findMany({
    where: {
      skuId: { in: skuIds },
    },
    select: {
      tenantId: true,
      warehouseId: true,
      clientId: true,
      skuId: true,
      skuCode: true,
      qtyAvailable: true,
      qtyAllocated: true,
      qtyFrozen: true,
      qtyDefective: true,
      qtyPicking: true,
      totalOnHand: true,
      locationCount: true,
    },
  })

  const map = new Map<string, SummaryProjection>()
  for (const row of rows) {
    const projection: SummaryProjection = {
      tenantId: row.tenantId,
      warehouseId: row.warehouseId,
      clientId: row.clientId,
      skuId: row.skuId,
      skuCode: row.skuCode,
      qtyAvailable: row.qtyAvailable,
      qtyAllocated: row.qtyAllocated,
      qtyFrozen: row.qtyFrozen,
      qtyDefective: row.qtyDefective,
      qtyPicking: row.qtyPicking,
      totalOnHand: row.totalOnHand,
      locationCount: row.locationCount,
    }
    const nonZero =
      projection.qtyAvailable ||
      projection.qtyAllocated ||
      projection.qtyFrozen ||
      projection.qtyDefective ||
      projection.qtyPicking ||
      projection.totalOnHand ||
      projection.locationCount
    if (!nonZero) continue
    map.set(summaryProjectionKey(projection), projection)
  }
  return map
}

async function forceRefreshDerivedViews(skuIds: string[]) {
  const [bucketRows, snapshotRows, summaryRows] = await Promise.all([
    prisma.inventoryBucket.findMany({
      where: {
        skuId: { in: skuIds },
      },
      select: {
        tenantId: true,
        clientId: true,
        warehouseId: true,
        locationId: true,
        skuId: true,
        skuCode: true,
      },
    }),
    prisma.inventorySnapshot.findMany({
      where: {
        skuId: { in: skuIds },
      },
      select: {
        tenantId: true,
        clientId: true,
        warehouseId: true,
        locationId: true,
        skuId: true,
        skuCode: true,
      },
    }),
    prisma.skuInventorySummary.findMany({
      where: {
        skuId: { in: skuIds },
      },
      select: {
        tenantId: true,
        clientId: true,
        warehouseId: true,
        skuId: true,
        skuCode: true,
      },
    }),
  ])

  const locationTargets = new Map<string, {
    tenantId: string
    clientId: string
    warehouseId: string
    locationId: string
    skuId: string
    skuCode: string
  }>()
  for (const row of [...bucketRows, ...snapshotRows]) {
    const key = [row.tenantId, row.clientId, row.warehouseId, row.locationId, row.skuId].join('|')
    locationTargets.set(key, {
      tenantId: row.tenantId,
      clientId: row.clientId,
      warehouseId: row.warehouseId,
      locationId: row.locationId,
      skuId: row.skuId,
      skuCode: row.skuCode,
    })
  }

  const summaryTargets = new Map<string, {
    tenantId: string
    clientId: string
    warehouseId: string
    skuId: string
    skuCode: string
  }>()
  for (const row of [...bucketRows, ...summaryRows]) {
    const key = [row.tenantId, row.clientId, row.warehouseId, row.skuId].join('|')
    summaryTargets.set(key, {
      tenantId: row.tenantId,
      clientId: row.clientId,
      warehouseId: row.warehouseId,
      skuId: row.skuId,
      skuCode: row.skuCode,
    })
  }

  for (const target of locationTargets.values()) {
    await updateLocationSnapshot({
      tenantId: target.tenantId,
      clientId: target.clientId,
      warehouseId: target.warehouseId,
      locationId: target.locationId,
      skuId: target.skuId,
      skuCode: target.skuCode,
    })
  }

  for (const target of summaryTargets.values()) {
    await updateSkuSummary({
      tenantId: target.tenantId,
      clientId: target.clientId,
      warehouseId: target.warehouseId,
      skuId: target.skuId,
      skuCode: target.skuCode,
    })
  }
}

function compareSnapshotProjection(expected: Map<string, SnapshotProjection>, actual: Map<string, SnapshotProjection>) {
  const diffs: string[] = []
  const keys = new Set<string>([...expected.keys(), ...actual.keys()])
  const fields: Array<keyof SnapshotProjection> = [
    'qtyAvailable',
    'qtyAllocated',
    'qtyFrozen',
    'qtyDefective',
    'qtyPicking',
    'qtyQcHold',
    'qtyCountHold',
    'totalOnHand',
  ]
  for (const key of keys) {
    const expectedRow = expected.get(key)
    const actualRow = actual.get(key)
    for (const field of fields) {
      const expectedValue = expectedRow?.[field] || 0
      const actualValue = actualRow?.[field] || 0
      if (expectedValue !== actualValue) {
        diffs.push(`${key}:${field}: expected=${expectedValue}, actual=${actualValue}`)
      }
    }
  }
  return diffs
}

function compareSummaryProjection(expected: Map<string, SummaryProjection>, actual: Map<string, SummaryProjection>) {
  const diffs: string[] = []
  const keys = new Set<string>([...expected.keys(), ...actual.keys()])
  const fields: Array<keyof SummaryProjection> = [
    'qtyAvailable',
    'qtyAllocated',
    'qtyFrozen',
    'qtyDefective',
    'qtyPicking',
    'totalOnHand',
    'locationCount',
  ]
  for (const key of keys) {
    const expectedRow = expected.get(key)
    const actualRow = actual.get(key)
    for (const field of fields) {
      const expectedValue = expectedRow?.[field] || 0
      const actualValue = actualRow?.[field] || 0
      if (expectedValue !== actualValue) {
        diffs.push(`${key}:${field}: expected=${expectedValue}, actual=${actualValue}`)
      }
    }
  }
  return diffs
}

async function waitForDerivedViews(ctx: RunContext, label: string) {
  const skuIds = [...ctx.resources.skuIds]
  const deadline = Date.now() + ctx.options.snapshotWaitMs
  let lastSnapshotDiffs: string[] = []
  let lastSummaryDiffs: string[] = []

  while (Date.now() <= deadline) {
    await forceRefreshDerivedViews(skuIds)
    const buckets = await queryBucketFacts(skuIds)
    const expectedSnapshots = projectSnapshotsFromBuckets(buckets)
    const expectedSummaries = projectSummariesFromBuckets(buckets)
    const actualSnapshots = await querySnapshotProjection(skuIds)
    const actualSummaries = await querySummaryProjection(skuIds)
    lastSnapshotDiffs = compareSnapshotProjection(expectedSnapshots, actualSnapshots)
    lastSummaryDiffs = compareSummaryProjection(expectedSummaries, actualSummaries)
    if (lastSnapshotDiffs.length === 0 && lastSummaryDiffs.length === 0) {
      return
    }
    await sleep(ctx.options.snapshotPollIntervalMs)
  }

  throw new Error(
    `${label} 派生层对账超时；snapshot_diff=${lastSnapshotDiffs.slice(0, 3).join(' | ') || 'none'}; summary_diff=${lastSummaryDiffs.slice(0, 3).join(' | ') || 'none'}`
  )
}

async function assertExpectedState(
  ctx: RunContext,
  baselineBuckets: Map<string, BucketFact>,
  expectedBuckets: Map<string, BucketFact>,
  baselineEvents: Map<string, number>,
  label: string
) {
  const skuIds = [...ctx.resources.skuIds]
  const actualBuckets = await queryBucketFacts(skuIds)
  const bucketDiffs = compareBucketFacts(expectedBuckets, actualBuckets)
  if (bucketDiffs.length > 0) {
    throw new Error(`${label} 事实层不一致：${bucketDiffs.slice(0, 10).join(' | ')}`)
  }

  for (const fact of actualBuckets.values()) {
    if (fact.quantity < 0) {
      throw new Error(`${label} 发现负库存：${bucketKey(fact)} -> ${fact.quantity}`)
    }
  }

  const expectedEventDeltas = buildExpectedDeltaMap(baselineBuckets, expectedBuckets)
  const actualEventDeltas = await queryEventDeltaFacts(skuIds, baselineEvents)
  const eventDiffs = compareEventDeltas(expectedEventDeltas, actualEventDeltas)
  if (eventDiffs.length > 0) {
    throw new Error(`${label} 事件层不一致：${eventDiffs.slice(0, 10).join(' | ')}`)
  }

  if (ctx.resources.inventoryCountOrderIds.size > 0) {
    const activeLocks = await prisma.inventoryCountLock.count({
      where: {
        orderId: {
          in: [...ctx.resources.inventoryCountOrderIds],
        },
        status: 'ACTIVE',
      },
    })
    if (activeLocks > 0) {
      throw new Error(`${label} 仍存在未释放的盘点锁：${activeLocks}`)
    }
  }
}

async function createOutboundOrder(params: {
  ctx: RunContext
  fixture: ClientSkuFixture
  quantity: number
  token: string
  initialPickedQty?: number
  initialShortQty?: number
  status?: string
  batchNumber?: string
}) {
  const { ctx, fixture, quantity, token } = params
  const order = await prisma.outboundOrder.create({
    data: {
      tenantId: ctx.warehouse.tenantId,
      clientId: fixture.clientId,
      warehouseId: ctx.warehouse.warehouseId,
      orderNumber: `${ctx.runPrefix}-SO-${token}`.slice(0, 32),
      referenceNumber: `${ctx.runPrefix}-REF-${token}`.slice(0, 64),
      platform: 'MANUAL',
      orderSource: 'MANUAL',
      orderBusinessType: 'STANDARD',
      orderType: 'SINGLE_ITEM_SINGLE',
      status: params.status || 'PENDING',
      totalOrderedQty: quantity,
      totalPickedQty: params.initialPickedQty || 0,
      totalSkuCount: 1,
      config: EMPTY_JSON,
      createdBy: ctx.warehouse.authUser.id,
      updatedBy: ctx.warehouse.authUser.id,
      lines: {
        create: {
          tenantId: ctx.warehouse.tenantId,
          lineNumber: 1,
          skuId: fixture.skuId,
          skuCode: fixture.skuCode,
          skuName: fixture.skuName,
          orderedQty: quantity,
          pickedQty: params.initialPickedQty || 0,
          shortQty: params.initialShortQty || 0,
          batchNumber: params.batchNumber,
          status: params.status === 'PICKED' ? 'PICKED' : 'PENDING',
          createdBy: ctx.warehouse.authUser.id,
          updatedBy: ctx.warehouse.authUser.id,
        },
      },
    },
    include: {
      lines: true,
    },
  })

  ctx.resources.outboundOrderIds.add(order.id)
  return order
}

async function scenarioPutaway(ctx: RunContext, token: string) {
  const batchNumber = `${ctx.runPrefix}-PUT-${token}`.slice(0, 64)
  const asnNumber = `${ctx.runPrefix}-PUT-ASN-${token}`.slice(0, 64)
  const quantity = 1
  await putaway({
    tenantId: ctx.warehouse.tenantId,
    clientId: ctx.fixtures.direct.clientId,
    warehouseId: ctx.warehouse.warehouseId,
    locationId: ctx.warehouse.mainLocation.id,
    skuId: ctx.fixtures.direct.skuId,
    skuCode: ctx.fixtures.direct.skuCode,
    quantity,
    batchNumber,
    asnNumber,
    fifoDate: new Date(),
    referenceType: 'LOAD_TEST_PUTAWAY',
    referenceNumber: `${ctx.runPrefix}-PUT-${token}`.slice(0, 64),
    operatorId: ctx.warehouse.authUser.id,
  })

  return [
    {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      clientId: ctx.fixtures.direct.clientId,
      locationId: ctx.warehouse.mainLocation.id,
      skuId: ctx.fixtures.direct.skuId,
      skuCode: ctx.fixtures.direct.skuCode,
      batchNumber,
      lpn: '',
      asnNumber,
      bucketType: BucketType.AVAILABLE,
      expiryDateKey: '1000-01-01',
      quantityDelta: quantity,
    },
  ]
}

async function scenarioAllocateDeallocate(ctx: RunContext, token: string) {
  const order = await createOutboundOrder({
    ctx,
    fixture: ctx.fixtures.direct,
    quantity: 2,
    token,
    batchNumber: ctx.fixtures.directMainBatch,
  })

  const allocateResult = await allocateInventorySync(order.id, ctx.warehouse.tenantId, ctx.warehouse.authUser.id)
  if (!allocateResult.success || allocateResult.allocatedQty !== 2) {
    throw new Error(`分配失败：${allocateResult.message || 'unknown'}`)
  }

  const deallocateResult = await deallocateInventorySync(order.id, ctx.warehouse.tenantId, ctx.warehouse.authUser.id)
  if (!deallocateResult.success || deallocateResult.deallocatedQty !== 2) {
    throw new Error(`取消分配失败：${deallocateResult.message || 'unknown'}`)
  }

  return []
}

async function resolveAllocatedBucket(orderId: string) {
  const allocation = await prisma.allocationDetail.findFirst({
    where: {
      referenceType: 'OUTBOUND_ORDER',
      referenceId: orderId,
      status: 'ALLOCATED',
    },
    orderBy: {
      allocatedAt: 'asc',
    },
    include: {
      bucket: {
        select: {
          locationId: true,
          skuId: true,
          skuCode: true,
          clientId: true,
          batchNumber: true,
          lpn: true,
          asnNumber: true,
          expiryDate: true,
        },
      },
    },
  })

  if (!allocation) {
    throw new Error(`未找到分配明细：${orderId}`)
  }

  return allocation
}

async function scenarioPick(ctx: RunContext, token: string) {
  const quantity = 2
  const order = await createOutboundOrder({
    ctx,
    fixture: ctx.fixtures.direct,
    quantity,
    token,
    batchNumber: ctx.fixtures.directMainBatch,
  })

  const allocateResult = await allocateInventorySync(order.id, ctx.warehouse.tenantId, ctx.warehouse.authUser.id)
  if (!allocateResult.success || allocateResult.allocatedQty !== quantity) {
    throw new Error(`分配失败：${allocateResult.message || 'unknown'}`)
  }

  const allocation = await resolveAllocatedBucket(order.id)
  await pick({
    tenantId: ctx.warehouse.tenantId,
    clientId: ctx.fixtures.direct.clientId,
    warehouseId: ctx.warehouse.warehouseId,
    locationId: allocation.locationId,
    skuId: allocation.skuId,
    skuCode: allocation.bucket.skuCode,
    quantity,
    batchNumber: allocation.batchNumber,
    lpn: allocation.lpn,
    asnNumber: allocation.asnNumber,
    expiryDate: allocation.bucket.expiryDate,
    referenceType: 'LOAD_TEST_PICK',
    referenceId: order.id,
    referenceNumber: order.orderNumber,
    referenceLineId: order.lines[0].id,
    operatorId: ctx.warehouse.authUser.id,
  })

  return [
    {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      clientId: ctx.fixtures.direct.clientId,
      locationId: allocation.locationId,
      skuId: allocation.skuId,
      skuCode: allocation.bucket.skuCode,
      batchNumber: allocation.batchNumber,
      lpn: allocation.lpn,
      asnNumber: allocation.asnNumber,
      bucketType: BucketType.AVAILABLE,
      expiryDateKey: toExpiryDateKey(allocation.bucket.expiryDate),
      quantityDelta: -quantity,
    },
    {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      clientId: ctx.fixtures.direct.clientId,
      locationId: allocation.locationId,
      skuId: allocation.skuId,
      skuCode: allocation.bucket.skuCode,
      batchNumber: allocation.batchNumber,
      lpn: allocation.lpn,
      asnNumber: allocation.asnNumber,
      bucketType: BucketType.PICKING,
      expiryDateKey: toExpiryDateKey(allocation.bucket.expiryDate),
      quantityDelta: quantity,
    },
  ]
}

async function scenarioShip(ctx: RunContext, token: string) {
  const quantity = 1
  const order = await createOutboundOrder({
    ctx,
    fixture: ctx.fixtures.direct,
    quantity,
    token,
    batchNumber: ctx.fixtures.directMainBatch,
  })

  const allocateResult = await allocateInventorySync(order.id, ctx.warehouse.tenantId, ctx.warehouse.authUser.id)
  if (!allocateResult.success || allocateResult.allocatedQty !== quantity) {
    throw new Error(`分配失败：${allocateResult.message || 'unknown'}`)
  }

  const allocation = await resolveAllocatedBucket(order.id)
  await pick({
    tenantId: ctx.warehouse.tenantId,
    clientId: ctx.fixtures.direct.clientId,
    warehouseId: ctx.warehouse.warehouseId,
    locationId: allocation.locationId,
    skuId: allocation.skuId,
    skuCode: allocation.bucket.skuCode,
    quantity,
    batchNumber: allocation.batchNumber,
    lpn: allocation.lpn,
    asnNumber: allocation.asnNumber,
    expiryDate: allocation.bucket.expiryDate,
    referenceType: 'LOAD_TEST_PICK',
    referenceId: order.id,
    referenceNumber: order.orderNumber,
    referenceLineId: order.lines[0].id,
    operatorId: ctx.warehouse.authUser.id,
  })

  await ship({
    tenantId: ctx.warehouse.tenantId,
    clientId: ctx.fixtures.direct.clientId,
    warehouseId: ctx.warehouse.warehouseId,
    locationId: allocation.locationId,
    skuId: allocation.skuId,
    skuCode: allocation.bucket.skuCode,
    quantity,
    batchNumber: allocation.batchNumber,
    lpn: allocation.lpn,
    asnNumber: allocation.asnNumber,
    expiryDate: allocation.bucket.expiryDate,
    referenceType: 'LOAD_TEST_SHIP',
    referenceId: order.id,
    referenceNumber: order.orderNumber,
    referenceLineId: order.lines[0].id,
    operatorId: ctx.warehouse.authUser.id,
    sourceBucketType: BucketType.PICKING,
  })

  return [
    {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      clientId: ctx.fixtures.direct.clientId,
      locationId: allocation.locationId,
      skuId: allocation.skuId,
      skuCode: allocation.bucket.skuCode,
      batchNumber: allocation.batchNumber,
      lpn: allocation.lpn,
      asnNumber: allocation.asnNumber,
      bucketType: BucketType.AVAILABLE,
      expiryDateKey: toExpiryDateKey(allocation.bucket.expiryDate),
      quantityDelta: -quantity,
    },
  ]
}

async function scenarioTransfer(ctx: RunContext, _token: string) {
  const quantity = 1
  await transfer({
    tenantId: ctx.warehouse.tenantId,
    clientId: ctx.fixtures.direct.clientId,
    warehouseId: ctx.warehouse.warehouseId,
    sourceLocationId: ctx.warehouse.mainLocation.id,
    targetLocationId: ctx.warehouse.transferLocation.id,
    skuId: ctx.fixtures.direct.skuId,
    skuCode: ctx.fixtures.direct.skuCode,
    quantity,
    batchNumber: ctx.fixtures.directMainBatch,
    asnNumber: ctx.fixtures.directMainAsn,
    bucketType: BucketType.AVAILABLE,
    referenceType: 'LOAD_TEST_TRANSFER',
    operatorId: ctx.warehouse.authUser.id,
  })
  await transfer({
    tenantId: ctx.warehouse.tenantId,
    clientId: ctx.fixtures.direct.clientId,
    warehouseId: ctx.warehouse.warehouseId,
    sourceLocationId: ctx.warehouse.transferLocation.id,
    targetLocationId: ctx.warehouse.mainLocation.id,
    skuId: ctx.fixtures.direct.skuId,
    skuCode: ctx.fixtures.direct.skuCode,
    quantity,
    batchNumber: ctx.fixtures.directMainBatch,
    asnNumber: ctx.fixtures.directMainAsn,
    bucketType: BucketType.AVAILABLE,
    referenceType: 'LOAD_TEST_TRANSFER',
    operatorId: ctx.warehouse.authUser.id,
  })
  return []
}

async function scenarioFreezeUnfreeze(ctx: RunContext, _token: string) {
  const quantity = 1
  await freeze({
    tenantId: ctx.warehouse.tenantId,
    clientId: ctx.fixtures.direct.clientId,
    warehouseId: ctx.warehouse.warehouseId,
    locationId: ctx.warehouse.mainLocation.id,
    skuId: ctx.fixtures.direct.skuId,
    skuCode: ctx.fixtures.direct.skuCode,
    quantity,
    batchNumber: ctx.fixtures.directMainBatch,
    asnNumber: ctx.fixtures.directMainAsn,
    reasonCode: 'LOAD_TEST_FREEZE',
    referenceType: 'LOAD_TEST_FREEZE',
    operatorId: ctx.warehouse.authUser.id,
  })
  await unfreeze({
    tenantId: ctx.warehouse.tenantId,
    clientId: ctx.fixtures.direct.clientId,
    warehouseId: ctx.warehouse.warehouseId,
    locationId: ctx.warehouse.mainLocation.id,
    skuId: ctx.fixtures.direct.skuId,
    skuCode: ctx.fixtures.direct.skuCode,
    quantity,
    batchNumber: ctx.fixtures.directMainBatch,
    asnNumber: ctx.fixtures.directMainAsn,
    reasonCode: 'LOAD_TEST_UNFREEZE',
    referenceType: 'LOAD_TEST_UNFREEZE',
    operatorId: ctx.warehouse.authUser.id,
  })
  return []
}

async function scenarioAdjust(ctx: RunContext, token: string) {
  await adjust({
    tenantId: ctx.warehouse.tenantId,
    clientId: ctx.fixtures.direct.clientId,
    warehouseId: ctx.warehouse.warehouseId,
    locationId: ctx.warehouse.mainLocation.id,
    skuId: ctx.fixtures.direct.skuId,
    skuCode: ctx.fixtures.direct.skuCode,
    bucketType: BucketType.AVAILABLE,
    quantityDelta: 1,
    batchNumber: ctx.fixtures.directMainBatch,
    asnNumber: ctx.fixtures.directMainAsn,
    reasonCode: 'LOAD_TEST_ADJUST_INC',
    reasonDescription: token,
    referenceType: 'LOAD_TEST_ADJUST',
    referenceNumber: `${ctx.runPrefix}-ADJ-${token}`,
    operatorId: ctx.warehouse.authUser.id,
  })
  await adjust({
    tenantId: ctx.warehouse.tenantId,
    clientId: ctx.fixtures.direct.clientId,
    warehouseId: ctx.warehouse.warehouseId,
    locationId: ctx.warehouse.mainLocation.id,
    skuId: ctx.fixtures.direct.skuId,
    skuCode: ctx.fixtures.direct.skuCode,
    bucketType: BucketType.AVAILABLE,
    quantityDelta: -1,
    batchNumber: ctx.fixtures.directMainBatch,
    asnNumber: ctx.fixtures.directMainAsn,
    reasonCode: 'LOAD_TEST_ADJUST_DEC',
    reasonDescription: token,
    referenceType: 'LOAD_TEST_ADJUST',
    referenceNumber: `${ctx.runPrefix}-ADJ-${token}`,
    operatorId: ctx.warehouse.authUser.id,
  })
  return []
}

async function scenarioInventoryCount(ctx: RunContext, token: string) {
  const order = await createInventoryCountOrder(ctx.warehouse.authUser, {
    saveMode: 'PENDING_SCOPE',
    orderName: `${ctx.runPrefix}-COUNT-${token}`.slice(0, 128),
    orderType: 'FULL',
    countMode: 'BLIND',
    warehouseId: ctx.warehouse.warehouseId,
    plannedAt: new Date().toISOString(),
    remark: `${ctx.runPrefix}-inventory-count`,
    ownerScopeMode: 'PARTIAL',
    clientIds: [ctx.fixtures.count.clientId],
    scopeConfig: {
      inventoryStatuses: ['AVAILABLE'],
      skuCodes: [],
      maxLocationsPerBatch: 1,
    },
    executionConfig: {
      splitRule: 'BY_LOCATION',
      allowPrint: false,
      pdaMode: 'BLIND',
    },
  })
  ctx.resources.inventoryCountOrderIds.add(order.id)

  await generateInventoryCountScope(ctx.warehouse.authUser, order.id, ctx.warehouse.warehouseId)
  const detailAfterScope = await getInventoryCountOrderDetail(ctx.warehouse.authUser, order.id, ctx.warehouse.warehouseId)
  const batches = ensure(detailAfterScope?.batches, '盘点范围生成后缺少批次')
  const details = ensure(detailAfterScope?.pendingDetails, '盘点范围生成后缺少明细')

  for (const batch of batches) {
    await startInventoryCountBatch(ctx.warehouse.authUser, order.id, batch.id, ctx.warehouse.warehouseId)
    const detail = ensure(
      details.find((item) => item.batchId === batch.id),
      `批次缺少对应明细：${batch.batchNumber}`
    )
    const seed = ensure(
      ctx.fixtures.countSeeds.find((item) => item.location.id === detail.locationId),
      `缺少盘点种子：${detail.locationId}`
    )
    await submitInventoryCountTaskLines(
      ctx.warehouse.authUser,
      order.id,
      batch.id,
      {
        countedQuantity: seed.countedQuantity,
        detailIds: [detail.id],
        isEmptyLocation: false,
        scope: {
          locationId: detail.locationId,
          skuId: detail.skuId,
          lpn: normalizeText(detail.lpn),
          batchNumber: normalizeText(detail.batchNumber),
          bucketType: detail.bucketType,
          expiryDateKey: toExpiryDateKey(detail.expiryDate),
        },
        roundType: 'FIRST',
      },
      ctx.warehouse.warehouseId
    )
  }

  const firstPass = await getInventoryCountOrderDetail(ctx.warehouse.authUser, order.id, ctx.warehouse.warehouseId)
  const recountDetailIds = ensure(firstPass?.pendingDetails, '缺少盘点明细')
    .filter((detail) => detail.status === 'RECOUNT_PENDING')
    .map((detail) => detail.id)

  if (recountDetailIds.length > 0) {
    const recountPass = await getInventoryCountOrderDetail(ctx.warehouse.authUser, order.id, ctx.warehouse.warehouseId)
    const recountBatches = ensure(recountPass?.batches, '缺少复盘批次').filter((batch) => batch.batchType === 'RECOUNT')
    const recountDetails = ensure(recountPass?.pendingDetails, '缺少复盘明细')
    for (const batch of recountBatches) {
      await startInventoryCountBatch(ctx.warehouse.authUser, order.id, batch.id, ctx.warehouse.warehouseId)
      const batchDetail = recountDetails.find((detail) => detail.batchId === batch.id)
      const detail = ensure(batchDetail, `复盘批次缺少明细：${batch.batchNumber}`)
      const seed = ensure(
        ctx.fixtures.countSeeds.find((item) => item.location.id === detail.locationId),
        `缺少复盘种子：${detail.locationId}`
      )
      await submitInventoryCountTaskLines(
        ctx.warehouse.authUser,
        order.id,
        batch.id,
        {
          countedQuantity: seed.countedQuantity,
          detailIds: [detail.id],
          isEmptyLocation: false,
          scope: {
            locationId: detail.locationId,
            skuId: detail.skuId,
            lpn: normalizeText(detail.lpn),
            batchNumber: normalizeText(detail.batchNumber),
            bucketType: detail.bucketType,
            expiryDateKey: toExpiryDateKey(detail.expiryDate),
          },
          roundType: 'RECOUNT',
        },
        ctx.warehouse.warehouseId
      )
    }
  }

  await confirmInventoryCountDifferences(
    ctx.warehouse.authUser,
    order.id,
    { detailIds: recountDetailIds },
    ctx.warehouse.warehouseId
  )

  const disposals = await prisma.inventoryCountDisposal.findMany({
    where: {
      orderId: order.id,
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })
  for (const disposal of disposals) {
    await startInventoryCountDisposal(ctx.warehouse.authUser, order.id, disposal.id, ctx.warehouse.warehouseId)
    await completeInventoryCountDisposal(
      ctx.warehouse.authUser,
      order.id,
      disposal.id,
      { targetLocationCode: ctx.warehouse.stagingLocation.locationCode },
      ctx.warehouse.warehouseId
    )
  }

  const afterDisposal = await getInventoryCountOrderDetail(ctx.warehouse.authUser, order.id, ctx.warehouse.warehouseId)
  if (afterDisposal?.status !== 'COMPLETED') {
    await settleInventoryCountOrder(ctx.warehouse.authUser, order.id, ctx.warehouse.warehouseId)
  }

  const locMain = ctx.fixtures.countSeeds[0]
  const locShort = ctx.fixtures.countSeeds[1]
  return [
    {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      clientId: ctx.fixtures.count.clientId,
      locationId: locShort.location.id,
      skuId: ctx.fixtures.count.skuId,
      skuCode: ctx.fixtures.count.skuCode,
      batchNumber: locShort.batchNumber,
      lpn: '',
      asnNumber: locShort.asnNumber,
      bucketType: BucketType.AVAILABLE,
      expiryDateKey: '1000-01-01',
      quantityDelta: -1,
    },
    {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      clientId: ctx.fixtures.count.clientId,
      locationId: locShort.location.id,
      skuId: ctx.fixtures.count.skuId,
      skuCode: ctx.fixtures.count.skuCode,
      batchNumber: locShort.batchNumber,
      lpn: '',
      asnNumber: locShort.asnNumber,
      bucketType: BucketType.COUNT_SHORTAGE,
      expiryDateKey: '1000-01-01',
      quantityDelta: 1,
    },
    {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      clientId: ctx.fixtures.count.clientId,
      locationId: ctx.warehouse.stagingLocation.id,
      skuId: ctx.fixtures.count.skuId,
      skuCode: ctx.fixtures.count.skuCode,
      batchNumber: ctx.fixtures.countSeeds[2].batchNumber,
      lpn: '',
      asnNumber: ctx.fixtures.countSeeds[2].asnNumber,
      bucketType: BucketType.COUNT_SURPLUS,
      expiryDateKey: '1000-01-01',
      quantityDelta: 1,
    },
    {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      clientId: ctx.fixtures.count.clientId,
      locationId: locMain.location.id,
      skuId: ctx.fixtures.count.skuId,
      skuCode: ctx.fixtures.count.skuCode,
      batchNumber: locMain.batchNumber,
      lpn: '',
      asnNumber: locMain.asnNumber,
      bucketType: BucketType.AVAILABLE,
      expiryDateKey: '1000-01-01',
      quantityDelta: 0,
    },
  ].filter((item) => item.quantityDelta !== 0)
}

async function scenarioPickShortageSupplement(ctx: RunContext, token: string) {
  const expectedQty = 4
  const pickedQty = 2
  const shortQty = 2
  const order = await createOutboundOrder({
    ctx,
    fixture: ctx.fixtures.shortage,
    quantity: expectedQty,
    token,
    initialPickedQty: pickedQty,
    initialShortQty: shortQty,
    status: 'PICKING',
    batchNumber: `${ctx.runPrefix}-SHT-A`,
  })

  const sourceBucket = ensure(await prisma.inventoryBucket.findFirst({
    where: {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      clientId: ctx.fixtures.shortage.clientId,
      skuId: ctx.fixtures.shortage.skuId,
      locationId: ctx.warehouse.mainLocation.id,
      batchNumber: `${ctx.runPrefix}-SHT-A`,
      asnNumber: `${ctx.runPrefix}-SHT-ASN-A`,
      bucketType: BucketType.AVAILABLE,
    },
    select: {
      id: true,
      asnNumber: true,
    },
  }), '缺货来源库存桶不存在')

  const bucketId = sourceBucket.id
  const pickOrder = await prisma.pickOrder.create({
    data: {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      taskNumber: `${ctx.runPrefix}-PO-${token}`.slice(0, 32),
      taskType: 'SINGLE_SKU_SINGLE',
      status: 'IN_PROGRESS',
      assignedUserId: ctx.warehouse.authUser.id,
      assignedAt: new Date(),
      totalLines: 1,
      totalQty: expectedQty,
      pickedQty,
      createdBy: ctx.warehouse.authUser.id,
      updatedBy: ctx.warehouse.authUser.id,
      lines: {
        create: {
          tenantId: ctx.warehouse.tenantId,
          lineNumber: 1,
          orderId: order.id,
          orderLineId: order.lines[0].id,
          skuId: ctx.fixtures.shortage.skuId,
          skuCode: ctx.fixtures.shortage.skuCode,
          locationId: ctx.warehouse.mainLocation.id,
          bucketId,
          batchNumber: `${ctx.runPrefix}-SHT-A`,
          expectedQty,
          pickedQty,
          shortQty,
          status: 'SHORT',
          pickedBy: ctx.warehouse.authUser.id,
          createdBy: ctx.warehouse.authUser.id,
          updatedBy: ctx.warehouse.authUser.id,
        },
      },
    },
    include: {
      lines: true,
    },
  })
  ctx.resources.pickOrderIds.add(pickOrder.id)

  await prisma.outboundOrderLine.update({
    where: {
      id: order.lines[0].id,
    },
    data: {
      status: 'PICKING',
    },
  })

  await createOrUpdatePickingShortageCases(prisma, {
    tenantId: ctx.warehouse.tenantId,
    warehouseId: ctx.warehouse.warehouseId,
    pickOrderId: pickOrder.id,
    pickOrderNumber: pickOrder.taskNumber,
    operatorId: ctx.warehouse.authUser.id,
    lines: [
      {
        id: pickOrder.lines[0].id,
        orderId: order.id,
        orderLineId: order.lines[0].id,
        skuId: ctx.fixtures.shortage.skuId,
        skuCode: ctx.fixtures.shortage.skuCode,
        expectedQty,
        pickedQty,
        shortQty,
        locationId: ctx.warehouse.mainLocation.id,
        bucketId,
        batchNumber: `${ctx.runPrefix}-SHT-A`,
        lpn: '',
        bucket: {
          asnNumber: sourceBucket.asnNumber,
        },
        location: {
          locationCode: ctx.warehouse.mainLocation.locationCode,
        },
        sku: {
          skuName: ctx.fixtures.shortage.skuName,
        },
        order: {
          orderNumber: order.orderNumber,
        },
      },
    ],
  })

  const exceptionCase = await prisma.pickingExceptionCase.findFirst({
    where: {
      tenantId: ctx.warehouse.tenantId,
      pickOrderId: pickOrder.id,
      orderId: order.id,
      exceptionType: 'PICK_SHORTAGE',
      status: 'OPEN',
    },
    select: {
      id: true,
    },
  })

  const caseId = ensure(exceptionCase?.id, '未生成拣货缺货异常单')
  const supplementOrder = await generateSupplementPickOrder({
    tenantId: ctx.warehouse.tenantId,
    caseId,
    operatorId: ctx.warehouse.authUser.id,
  })

  await manuallyCompleteSupplementPickOrder({
    tenantId: ctx.warehouse.tenantId,
    supplementPickOrderId: supplementOrder.id,
    operatorId: ctx.warehouse.authUser.id,
    remark: `${ctx.runPrefix}-manual-complete`,
  })

  return [
    {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      clientId: ctx.fixtures.shortage.clientId,
      locationId: ctx.warehouse.alternateLocation.id,
      skuId: ctx.fixtures.shortage.skuId,
      skuCode: ctx.fixtures.shortage.skuCode,
      batchNumber: ctx.fixtures.shortageSourceBatch,
      lpn: '',
      asnNumber: ctx.fixtures.shortageSourceAsn,
      bucketType: BucketType.AVAILABLE,
      expiryDateKey: '1000-01-01',
      quantityDelta: -shortQty,
    },
    {
      tenantId: ctx.warehouse.tenantId,
      warehouseId: ctx.warehouse.warehouseId,
      clientId: ctx.fixtures.shortage.clientId,
      locationId: ctx.warehouse.alternateLocation.id,
      skuId: ctx.fixtures.shortage.skuId,
      skuCode: ctx.fixtures.shortage.skuCode,
      batchNumber: ctx.fixtures.shortageSourceBatch,
      lpn: '',
      asnNumber: ctx.fixtures.shortageSourceAsn,
      bucketType: BucketType.PICKING,
      expiryDateKey: '1000-01-01',
      quantityDelta: shortQty,
    },
  ]
}

const SCENARIO_REGISTRY: Record<ScenarioName, ScenarioDefinition> = {
  putaway: {
    name: 'putaway',
    parallelSafe: true,
    runOnce: false,
    run: scenarioPutaway,
  },
  allocate_deallocate: {
    name: 'allocate_deallocate',
    parallelSafe: true,
    runOnce: false,
    run: scenarioAllocateDeallocate,
  },
  pick: {
    name: 'pick',
    parallelSafe: true,
    runOnce: false,
    run: scenarioPick,
  },
  ship: {
    name: 'ship',
    parallelSafe: true,
    runOnce: false,
    run: scenarioShip,
  },
  transfer: {
    name: 'transfer',
    parallelSafe: true,
    runOnce: false,
    run: scenarioTransfer,
  },
  freeze_unfreeze: {
    name: 'freeze_unfreeze',
    parallelSafe: true,
    runOnce: false,
    run: scenarioFreezeUnfreeze,
  },
  adjust: {
    name: 'adjust',
    parallelSafe: true,
    runOnce: false,
    run: scenarioAdjust,
  },
  inventory_count: {
    name: 'inventory_count',
    parallelSafe: false,
    runOnce: true,
    run: scenarioInventoryCount,
  },
  pick_shortage_supplement: {
    name: 'pick_shortage_supplement',
    parallelSafe: false,
    runOnce: false,
    run: scenarioPickShortageSupplement,
  },
}

function buildScenarioQueue(selected: ScenarioName[], concurrency: number, executedOnce: Set<ScenarioName>) {
  const eligible = selected.filter((name) => {
    const definition = SCENARIO_REGISTRY[name]
    return !(definition.runOnce && executedOnce.has(name))
  })
  if (eligible.length === 0) {
    return []
  }

  const baseQueue = shuffleArray(eligible)
  const randomizablePool = eligible.filter((name) => SCENARIO_REGISTRY[name].parallelSafe)
  const queue = [...baseQueue]

  if (randomizablePool.length === 0 || queue.length >= concurrency) {
    return queue
  }

  const remainingSlots = concurrency - queue.length
  const extraSlots = randomInt(0, remainingSlots)
  for (let index = 0; index < extraSlots; index += 1) {
    const pick = randomizablePool[randomInt(0, randomizablePool.length - 1)]
    queue.push(pick)
  }

  return shuffleArray(queue)
}

async function runScenario(ctx: RunContext, scenario: ScenarioName): Promise<ScenarioResult> {
  const startedAt = Date.now()
  const token = ctx.nextToken()
  const deltas = await SCENARIO_REGISTRY[scenario].run(ctx, token)
  return {
    scenario,
    deltas,
    durationMs: Date.now() - startedAt,
  }
}

async function runScenarioQueue(ctx: RunContext, queue: ScenarioName[], summary: SummaryReport) {
  const results: ScenarioResult[] = []
  const executedOnce = new Set<ScenarioName>()

  for (let index = 0; index < queue.length; index += ctx.options.concurrency) {
    const chunk = queue.slice(index, index + ctx.options.concurrency)
    const settled = await Promise.allSettled(chunk.map((scenario) => runScenario(ctx, scenario)))
    const failures: string[] = []
    for (const item of settled) {
      if (item.status === 'rejected') {
        failures.push(item.reason instanceof Error ? item.reason.message : String(item.reason))
        continue
      }

      results.push(item.value)
      executedOnce.add(item.value.scenario)
      accumulateScenarioMetric(summary, item.value.scenario, item.value.durationMs)
    }
    if (failures.length > 0) {
      throw new Error(`场景执行失败：${failures.join(' | ')}`)
    }
  }

  return {
    results,
    executedOnce,
  }
}

async function writeSummary(summary: SummaryReport, targetPath?: string) {
  if (!targetPath) return
  const absolutePath = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
}

async function cleanupResources(ctx: RunContext) {
  const orderIds = [...ctx.resources.outboundOrderIds]
  const pickOrderIds = [...ctx.resources.pickOrderIds]
  const countOrderIds = [...ctx.resources.inventoryCountOrderIds]
  const skuIds = [...ctx.resources.skuIds]
  const clientIds = [...ctx.resources.clientIds]

  if (countOrderIds.length > 0) {
    const countDetails = await prisma.inventoryCountDetail.findMany({
      where: {
        orderId: { in: countOrderIds },
      },
      select: {
        adjustmentId: true,
      },
    })
    const adjustmentIds = [...new Set(countDetails.map((item) => item.adjustmentId).filter((value): value is string => Boolean(value)))]

    await prisma.inventoryCountOperationLog.deleteMany({ where: { orderId: { in: countOrderIds } } })
    await prisma.inventoryCountRecord.deleteMany({ where: { orderId: { in: countOrderIds } } })
    await prisma.inventoryCountLock.deleteMany({ where: { orderId: { in: countOrderIds } } })
    await prisma.inventoryCountRoundLine.deleteMany({ where: { orderId: { in: countOrderIds } } })
    await prisma.inventoryCountDisposal.deleteMany({ where: { orderId: { in: countOrderIds } } })
    await prisma.inventoryCountBatch.deleteMany({ where: { orderId: { in: countOrderIds } } })
    await prisma.inventoryCountDetail.deleteMany({ where: { orderId: { in: countOrderIds } } })
    await prisma.inventoryCountOrder.deleteMany({ where: { id: { in: countOrderIds } } })
    if (adjustmentIds.length > 0) {
      await prisma.inventoryAdjustmentLine.deleteMany({ where: { adjustmentId: { in: adjustmentIds } } })
      await prisma.inventoryAdjustment.deleteMany({ where: { id: { in: adjustmentIds } } })
    }
  }

  if (pickOrderIds.length > 0 || orderIds.length > 0) {
    await prisma.supplementPickOrderLine.deleteMany({
      where: {
        orderLineId: {
          in: await prisma.outboundOrderLine.findMany({
            where: { orderId: { in: orderIds } },
            select: { id: true },
          }).then((rows) => rows.map((row) => row.id)),
        },
      },
    })
    await prisma.supplementPickOrder.deleteMany({
      where: {
        orderId: { in: orderIds },
      },
    })
    await prisma.pickingExceptionLine.deleteMany({
      where: {
        orderId: { in: orderIds },
      },
    })
    await prisma.pickingExceptionCase.deleteMany({
      where: {
        orderId: { in: orderIds },
      },
    })
    await prisma.pickOrderLine.deleteMany({ where: { pickOrderId: { in: pickOrderIds } } })
    await prisma.pickOrder.deleteMany({ where: { id: { in: pickOrderIds } } })
    await prisma.allocationDetail.deleteMany({
      where: {
        referenceType: 'OUTBOUND_ORDER',
        referenceId: { in: orderIds },
      },
    })
    await prisma.orderTimeline.deleteMany({ where: { orderId: { in: orderIds } } })
    await prisma.outboundOrderLine.deleteMany({ where: { orderId: { in: orderIds } } })
    await prisma.outboundOrder.deleteMany({ where: { id: { in: orderIds } } })
  }

  if (skuIds.length > 0) {
    await prisma.inventorySnapshot.deleteMany({ where: { skuId: { in: skuIds } } })
    await prisma.skuInventorySummary.deleteMany({ where: { skuId: { in: skuIds } } })
    await prisma.inventoryEvent.deleteMany({ where: { skuId: { in: skuIds } } })
    await prisma.allocationDetail.deleteMany({ where: { skuId: { in: skuIds } } })
    await prisma.pickOrderLine.deleteMany({ where: { skuId: { in: skuIds } } })
    await prisma.inventoryBucket.deleteMany({ where: { skuId: { in: skuIds } } })
    await prisma.sku.deleteMany({ where: { id: { in: skuIds } } })
  }

  if (clientIds.length > 0) {
    await prisma.client.deleteMany({ where: { id: { in: clientIds } } })
  }
}

async function main() {
  const options = buildOptions()
  const runPrefix = `LT${Date.now().toString(36).slice(-8).toUpperCase()}`
  const resources: CreatedResources = {
    clientIds: new Set<string>(),
    skuIds: new Set<string>(),
    outboundOrderIds: new Set<string>(),
    pickOrderIds: new Set<string>(),
    inventoryCountOrderIds: new Set<string>(),
  }
  const summary: SummaryReport = {
    runPrefix,
    startedAt: new Date().toISOString(),
    options,
    warehouse: {
      tenantId: '',
      warehouseId: '',
      warehouseCode: '',
      warehouseName: '',
    },
    selectedScenarios: [...options.scenarios],
    executedScenarios: [],
    roundsCompleted: 0,
    scenarioMetrics: Object.fromEntries(
      DEFAULT_SCENARIOS.map((name) => [name, { runs: 0, totalDurationMs: 0 }])
    ) as Record<ScenarioName, ScenarioMetric>,
    cleanupRequested: options.cleanup,
    cleanupCompleted: false,
    success: false,
    diagnostics: buildDiagnosticsFromError(),
  }

  let ctx: RunContext | null = null

  try {
    const warehouse = await queryTestUserAndWarehouse()
    summary.warehouse = {
      tenantId: warehouse.tenantId,
      warehouseId: warehouse.warehouseId,
      warehouseCode: warehouse.warehouseCode,
      warehouseName: warehouse.warehouseName,
    }

    const fixtures = await seedFixtures(warehouse, resources, runPrefix, options.initialQty)
    let tokenCounter = 0
    ctx = {
      options,
      warehouse,
      fixtures,
      resources,
      runPrefix,
      startedAt: new Date(),
      nextToken: () => `${(++tokenCounter).toString().padStart(4, '0')}`,
    }

    const skuIds = [...resources.skuIds]
    const baselineBuckets = await queryBucketFacts(skuIds)
    const baselineEvents = await queryEventBaseline(skuIds)
    await waitForDerivedViews(ctx, 'seed')

    const expectedBuckets = cloneBucketMap(baselineBuckets)
    const executedOnce = new Set<ScenarioName>()

    for (let round = 1; round <= options.rounds; round += 1) {
      const queue = buildScenarioQueue(options.scenarios, options.concurrency, executedOnce)
      if (queue.length === 0) {
        break
      }

      const { results, executedOnce: executedThisRound } = await runScenarioQueue(ctx, queue, summary)
      for (const name of executedThisRound) {
        if (SCENARIO_REGISTRY[name].runOnce) {
          executedOnce.add(name)
        }
      }
      for (const result of results) {
        applyDeltaMap(expectedBuckets, result.deltas)
      }

      await waitForDerivedViews(ctx, `round-${round}`)
      await assertExpectedState(ctx, baselineBuckets, expectedBuckets, baselineEvents, `round-${round}`)
      summary.roundsCompleted = round
    }

    summary.success = true
    setDiagnostics(summary, buildDiagnosticsFromError())
    return { ctx, summary }
  } catch (error) {
    summary.error = error instanceof Error ? error.message : String(error)
    setDiagnostics(summary, buildDiagnosticsFromError(summary.error))
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
      summary,
      ctx,
    })
  } finally {
    summary.finishedAt = new Date().toISOString()
    if (ctx && options.cleanup) {
      try {
        await cleanupResources(ctx)
        summary.cleanupCompleted = true
      } catch (cleanupError) {
        const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError)
        summary.error = summary.error ? `${summary.error}; cleanup=${message}` : `cleanup=${message}`
      }
    }
    await writeSummary(summary, options.summaryJsonPath)
  }
}

main()
  .then(({ summary }) => {
    console.log(buildReadableSummary(summary))
    console.log('--- JSON ---')
    console.log(JSON.stringify(summary, null, 2))
    process.exit(0)
  })
  .catch((error: unknown) => {
    const summary = typeof error === 'object' && error !== null && 'summary' in error
      ? (error as { summary?: SummaryReport }).summary
      : undefined
    if (summary) {
      console.error(buildReadableSummary(summary))
      console.error('--- JSON ---')
      console.error(JSON.stringify(summary, null, 2))
    }
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
