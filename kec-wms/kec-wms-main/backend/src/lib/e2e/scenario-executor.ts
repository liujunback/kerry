import { prisma } from '@/lib/db/prisma'
import type { E2eScenario, E2eScenarioResult } from '@prisma/client'
import {
  E2E_TENANT_CODE,
  E2E_CLIENT_CODE,
  E2E_WAREHOUSE_CODE,
  E2E_SKU_CODES,
  setupE2eTenant,
} from './setup-e2e-tenant'

// ==================== 类型定义 ====================

export interface ScenarioConfig {
  skuType: 'normal' | 'batch' | 'expiry' | 'serial' | 'full'
  expectedQty: number
  batchNumber?: string
  expiryDate?: string
  productionDate?: string
  receivingSteps?: ReceivingStep[]
  putawaySteps?: PutawayStep[]
  dependencies?: string[]
  reuseDataFrom?: string
}

export interface ReceivingStep {
  qty: number
  qualityStatus?: 'GOOD' | 'DAMAGED'
  serialNumbers?: string[]
  targetContainer?: string
}

export interface PutawayStep {
  mode: 'BY_ORDER' | 'BY_CONTAINER'
  containerCode?: string
  items: PutawayItem[]
}

export interface PutawayItem {
  skuType: string
  qty: number
  fromBin?: string
  toBin: string
  batchNumber?: string
  serialNumbers?: string[]
}

export interface ScenarioExpected {
  asnStatus?: string
  totalReceivedQty?: number
  goodQty?: number
  damagedQty?: number
  putawayStatus?: string
  inventoryInBins?: Array<{ binCode: string; qty: number }>
  errorMessage?: string
}

export interface ExecutionStep {
  name: string
  status: 'success' | 'error' | 'skipped'
  durationMs: number
  input?: unknown
  output?: unknown
  error?: string
}

export interface ExecutionResult {
  passed: boolean
  status: 'PASSED' | 'FAILED' | 'ERROR'
  durationMs: number
  steps: ExecutionStep[]
  actual?: ScenarioExpected
  expected?: ScenarioExpected
  error?: string
}

export interface SeedData {
  tenantId: string
  clientId: string
  clientCode: string
  warehouseId: string
  warehouseCode: string
  skus: Record<string, { id: string; code: string }>
  bins: Record<string, { id: string; code: string; zoneId: string }>
}

// ==================== SKU 模板映射 ====================

const SKU_TYPE_MAP: Record<string, string> = {
  ...E2E_SKU_CODES,
}

// ==================== Seed 数据加载器 ====================

export async function loadSeedData(): Promise<SeedData> {
  await setupE2eTenant()

  // 获取租户
  const tenant = await prisma.tenant.findFirst({
    where: { tenantCode: E2E_TENANT_CODE },
  })
  if (!tenant) throw new Error(`E2E 测试租户 ${E2E_TENANT_CODE} 不存在，请先运行 setupE2eTenant()`)

  // 获取测试客户
  const client = await prisma.client.findFirst({
    where: { tenantId: tenant.id, clientCode: E2E_CLIENT_CODE },
  })
  if (!client) throw new Error(`E2E 测试客户 ${E2E_CLIENT_CODE} 不存在，请先运行 setupE2eTenant()`)

  // 获取仓库
  const warehouse = await prisma.warehouse.findFirst({
    where: { tenantId: tenant.id, warehouseCode: E2E_WAREHOUSE_CODE },
  })
  if (!warehouse) throw new Error(`E2E 测试仓库 ${E2E_WAREHOUSE_CODE} 不存在，请先运行 setupE2eTenant()`)

  // 获取 SKU 模板
  const skuRecords = await prisma.sku.findMany({
    where: {
      clientId: client.id,
      skuCode: { in: Object.values(SKU_TYPE_MAP) },
    },
  })
  const skus: Record<string, { id: string; code: string }> = {}
  for (const [type, code] of Object.entries(SKU_TYPE_MAP)) {
    const sku = skuRecords.find((s) => s.skuCode === code)
    if (sku) {
      skus[type] = { id: sku.id, code: sku.skuCode }
    }
  }

  // 获取库位
  const binRecords = await prisma.binLocation.findMany({
    where: { warehouseId: warehouse.id },
  })
  const bins: Record<string, { id: string; code: string; zoneId: string }> = {}
  for (const bin of binRecords) {
    bins[bin.locationCode] = { id: bin.id, code: bin.locationCode, zoneId: bin.zoneId }
  }

  return {
    tenantId: tenant.id,
    clientId: client.id,
    clientCode: client.clientCode,
    warehouseId: warehouse.id,
    warehouseCode: warehouse.warehouseCode,
    skus,
    bins,
  }
}

// ==================== 场景执行器 ====================

export class ScenarioExecutor {
  private seedData: SeedData | null = null
  private executionContext: Map<string, unknown> = new Map()

  async loadSeedData(): Promise<SeedData> {
    if (!this.seedData) {
      this.seedData = await loadSeedData()
    }
    return this.seedData
  }

  async execute(scenario: E2eScenario): Promise<ExecutionResult> {
    const startTime = Date.now()
    const steps: ExecutionStep[] = []
    const config = scenario.config as unknown as ScenarioConfig
    const expected = scenario.expected as ScenarioExpected

    try {
      // 1. 加载 Seed 数据
      const stepStart = Date.now()
      const seedData = await this.loadSeedData()
      steps.push({
        name: '加载 Seed 数据',
        status: 'success',
        durationMs: Date.now() - stepStart,
        output: {
          clientCode: seedData.clientCode,
          warehouseCode: seedData.warehouseCode,
          skuCode: seedData.skus[config.skuType]?.code,
        },
      })

      // 检查 SKU 是否存在
      const sku = seedData.skus[config.skuType]
      if (!sku) {
        throw new Error(`SKU 模板 ${config.skuType} 不存在`)
      }

      // 2. 检查依赖
      if (config.dependencies?.length) {
        const depStart = Date.now()
        for (const dep of config.dependencies) {
          if (!this.executionContext.has(dep)) {
            throw new Error(`依赖场景 ${dep} 尚未执行`)
          }
        }
        steps.push({
          name: '检查依赖场景',
          status: 'success',
          durationMs: Date.now() - depStart,
          output: { dependencies: config.dependencies },
        })
      }

      // 3. 复用前置场景数据
      let reuseData: unknown = null
      if (config.reuseDataFrom) {
        reuseData = this.executionContext.get(config.reuseDataFrom)
        if (!reuseData) {
          throw new Error(`无法复用场景 ${config.reuseDataFrom} 的数据`)
        }
      }

      // 4. 创建 ASN
      const asnStart = Date.now()
      const asn = await this.createAsn(seedData, config)
      steps.push({
        name: `创建 ASN (${asn.asnNumber})`,
        status: 'success',
        durationMs: Date.now() - asnStart,
        output: { asnId: asn.id, asnNumber: asn.asnNumber, status: asn.status },
      })

      // 5. 签收 ASN
      const signInStart = Date.now()
      await this.signInAsn(asn.id)
      steps.push({
        name: '签收 ASN',
        status: 'success',
        durationMs: Date.now() - signInStart,
        output: { status: 'PENDING_RECEIVING' },
      })

      // 6. 执行收货
      if (config.receivingSteps?.length) {
        for (let i = 0; i < config.receivingSteps.length; i++) {
          const step = config.receivingSteps[i]
          const recvStart = Date.now()
          await this.executeReceiving(asn.id, sku.id, step, config)
          steps.push({
            name: `收货步骤 ${i + 1}: ${step.qty} 件`,
            status: 'success',
            durationMs: Date.now() - recvStart,
            input: step,
          })
        }
      }

      // 7. 完成收货
      const completeStart = Date.now()
      await this.completeReceiving(asn.id)
      steps.push({
        name: '完成收货',
        status: 'success',
        durationMs: Date.now() - completeStart,
      })

      // 8. 执行上架（如果有）
      if (config.putawaySteps?.length) {
        for (let i = 0; i < config.putawaySteps.length; i++) {
          const step = config.putawaySteps[i]
          const putStart = Date.now()
          await this.executePutaway(seedData, asn.id, step, config)
          steps.push({
            name: `上架步骤 ${i + 1}`,
            status: 'success',
            durationMs: Date.now() - putStart,
            input: step,
          })
        }
      }

      // 9. 验证结果
      const verifyStart = Date.now()
      const actual = await this.verifyResult(asn.id, seedData, config)
      const passed = this.compareResult(actual, expected)
      steps.push({
        name: '验证结果',
        status: passed ? 'success' : 'error',
        durationMs: Date.now() - verifyStart,
        output: { actual, expected, passed },
      })

      // 保存执行结果供后续场景使用
      this.executionContext.set(scenario.code, {
        asnId: asn.id,
        asnNumber: asn.asnNumber,
        seedData,
      })

      return {
        passed,
        status: passed ? 'PASSED' : 'FAILED',
        durationMs: Date.now() - startTime,
        steps,
        actual,
        expected,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      steps.push({
        name: '执行失败',
        status: 'error',
        durationMs: 0,
        error: errorMessage,
      })

      return {
        passed: false,
        status: 'ERROR',
        durationMs: Date.now() - startTime,
        steps,
        error: errorMessage,
      }
    }
  }

  // 创建 ASN
  private async createAsn(seedData: SeedData, config: ScenarioConfig) {
    const sku = seedData.skus[config.skuType]
    const asnNumber = `ASN-E2E-${Date.now()}`

    const asn = await prisma.asn.create({
      data: {
        tenantId: seedData.tenantId,
        clientId: seedData.clientId,
        warehouseId: seedData.warehouseId,
        asnNumber,
        externalNumber: asnNumber,
        asnType: 'PURCHASE',
        status: 'CREATED',
        expectedArrivalDate: new Date(),
        config: {},
        asnLines: {
          create: [
            {
              tenantId: seedData.tenantId,
              lineNumber: 1,
              skuId: sku.id,
              skuCode: sku.code,
              expectedQty: config.expectedQty,
              receivedQty: 0,
              status: 'PENDING',
            },
          ],
        },
      },
    })

    return asn
  }

  // 签收 ASN
  private async signInAsn(asnId: string) {
    await prisma.asn.update({
      where: { id: asnId },
      data: {
        status: 'ARRIVED',
        actualArrivalAt: new Date(),
        signedAt: new Date(),
      },
    })
  }

  // 执行收货
  private async executeReceiving(
    asnId: string,
    skuId: string,
    step: ReceivingStep,
    config: ScenarioConfig
  ) {
    const asn = await prisma.asn.findUnique({
      where: { id: asnId },
      include: { asnLines: true },
    })
    if (!asn) throw new Error('ASN 不存在')

    const line = asn.asnLines.find((l) => l.skuId === skuId)
    if (!line) throw new Error('ASN 明细不存在')

    const isGood = step.qualityStatus !== 'DAMAGED'
    const goodQty = isGood ? step.qty : 0
    const damagedQty = isGood ? 0 : step.qty

    // 更新收货数量
    await prisma.asnLine.update({
      where: { id: line.id },
      data: {
        receivedQty: { increment: step.qty },
        receivedGoodQty: { increment: goodQty },
        receivedDamagedQty: { increment: damagedQty },
        status: 'RECEIVING',
      },
    })

    // 创建收货记录
    const recordNumber = `RCV-E2E-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await prisma.receivingRecord.create({
      data: {
        tenantId: asn.tenantId,
        recordNumber,
        asnId: asn.id,
        asnLineId: line.id,
        warehouseId: asn.warehouseId,
        clientId: asn.clientId,
        skuId,
        skuCode: line.skuCode,
        expectedQty: line.expectedQty,
        receivedQty: step.qty,
        goodQty,
        damagedQty,
        batchNumber: config.batchNumber || null,
        expiryDate: config.expiryDate ? new Date(config.expiryDate) : null,
        productionDate: config.productionDate ? new Date(config.productionDate) : null,
        serialNumbers: step.serialNumbers ? step.serialNumbers : undefined,
        receivingMode: 'SKU',
        deviceType: 'PC',
        status: 'COMPLETED',
        receivedAt: new Date(),
        receivedBy: 'e2e-test',
      },
    })

    // 更新 ASN 状态和统计
    await prisma.asn.update({
      where: { id: asnId },
      data: {
        status: 'RECEIVING',
        totalReceivedQty: { increment: step.qty },
      },
    })
  }

  // 完成收货
  private async completeReceiving(asnId: string) {
    const asn = await prisma.asn.findUnique({
      where: { id: asnId },
      include: { asnLines: true },
    })
    if (!asn) throw new Error('ASN 不存在')

    // 检查是否全部收货完成
    await prisma.asn.update({
      where: { id: asnId },
      data: {
        status: 'RECEIVED',
        receivingEndAt: new Date(),
      },
    })

    // 更新明细状态
    for (const line of asn.asnLines) {
      await prisma.asnLine.update({
        where: { id: line.id },
        data: {
          status: 'RECEIVED',
        },
      })
    }
  }

  // 执行上架
  private async executePutaway(
    seedData: SeedData,
    asnId: string,
    step: PutawayStep,
    config: ScenarioConfig
  ) {
    const asn = await prisma.asn.findUnique({
      where: { id: asnId },
      include: { asnLines: true },
    })
    if (!asn) throw new Error('ASN 不存在')

    for (const item of step.items) {
      const sku = seedData.skus[item.skuType || config.skuType]
      const toBin = seedData.bins[item.toBin]

      if (!sku) throw new Error(`SKU 模板 ${item.skuType} 不存在`)
      if (!toBin) throw new Error(`库位 ${item.toBin} 不存在`)

      // 创建库存快照
      await prisma.inventorySnapshot.create({
        data: {
          tenantId: seedData.tenantId,
          clientId: seedData.clientId,
          warehouseId: seedData.warehouseId,
          zoneId: toBin.zoneId,
          locationId: toBin.id,
          skuId: sku.id,
          skuCode: sku.code,
          batchNumber: item.batchNumber ?? config.batchNumber ?? '',
          expiryDate: config.expiryDate ? new Date(config.expiryDate) : null,
          qtyAvailable: item.qty,
          totalOnHand: item.qty,
        },
      })
    }
  }

  // 验证结果
  private async verifyResult(
    asnId: string,
    seedData: SeedData,
    config: ScenarioConfig
  ): Promise<ScenarioExpected> {
    const asn = await prisma.asn.findUnique({
      where: { id: asnId },
      include: { asnLines: true },
    })
    if (!asn) throw new Error('ASN 不存在')

    const totalReceivedQty = asn.asnLines.reduce((sum, l) => sum + l.receivedQty, 0)

    // 获取收货记录统计
    const receivingRecords = await prisma.receivingRecord.findMany({
      where: { asnId },
    })
    const goodQty = receivingRecords.reduce((sum, r) => sum + r.goodQty, 0)
    const damagedQty = receivingRecords.reduce((sum, r) => sum + r.damagedQty, 0)

    // 获取库存
    const inventoryInBins: Array<{ binCode: string; qty: number }> = []
    if (config.putawaySteps?.length) {
      const sku = seedData.skus[config.skuType]
      const snapshots = await prisma.inventorySnapshot.findMany({
        where: {
          warehouseId: seedData.warehouseId,
          skuId: sku.id,
        },
        include: { location: true },
      })

      for (const snap of snapshots) {
        if (snap.location) {
          inventoryInBins.push({
            binCode: snap.location.locationCode,
            qty: snap.totalOnHand,
          })
        }
      }
    }

    return {
      asnStatus: asn.status,
      totalReceivedQty,
      goodQty: goodQty > 0 ? goodQty : undefined,
      damagedQty: damagedQty > 0 ? damagedQty : undefined,
      putawayStatus: config.putawaySteps?.length ? 'COMPLETED' : undefined,
      inventoryInBins: inventoryInBins.length > 0 ? inventoryInBins : undefined,
    }
  }

  // 对比结果
  private compareResult(actual: ScenarioExpected, expected: ScenarioExpected): boolean {
    // ASN 状态
    if (expected.asnStatus && actual.asnStatus !== expected.asnStatus) {
      return false
    }

    // 收货数量
    if (expected.totalReceivedQty !== undefined && actual.totalReceivedQty !== expected.totalReceivedQty) {
      return false
    }

    // 良品数量
    if (expected.goodQty !== undefined && actual.goodQty !== expected.goodQty) {
      return false
    }

    // 残品数量
    if (expected.damagedQty !== undefined && actual.damagedQty !== expected.damagedQty) {
      return false
    }

    // 上架状态
    if (expected.putawayStatus && actual.putawayStatus !== expected.putawayStatus) {
      return false
    }

    // 库存分布
    if (expected.inventoryInBins?.length) {
      for (const exp of expected.inventoryInBins) {
        const act = actual.inventoryInBins?.find((i) => i.binCode === exp.binCode)
        if (!act || act.qty !== exp.qty) {
          return false
        }
      }
    }

    return true
  }

  // 清理执行上下文
  clearContext() {
    this.executionContext.clear()
  }
}

// ==================== 保存执行结果 ====================

export async function saveExecutionResult(
  scenarioId: string,
  result: ExecutionResult,
  executedBy?: string
): Promise<E2eScenarioResult> {
  return prisma.e2eScenarioResult.create({
    data: {
      scenarioId,
      status: result.status,
      durationMs: result.durationMs,
      steps: result.steps as unknown as object,
      actual: result.actual as unknown as object,
      errorMessage: result.error,
      executedBy,
    },
  })
}

// ==================== 批量执行 ====================

export async function executeScenarios(
  scenarios: E2eScenario[],
  executedBy?: string
): Promise<Map<string, ExecutionResult>> {
  const executor = new ScenarioExecutor()
  const results = new Map<string, ExecutionResult>()

  // 按依赖关系排序
  const sorted = sortByDependencies(scenarios)

  for (const scenario of sorted) {
    const result = await executor.execute(scenario)
    results.set(scenario.code, result)

    // 保存执行结果
    await saveExecutionResult(scenario.id, result, executedBy)

    // 如果失败且有依赖此场景的其他场景，标记为阻塞
    if (!result.passed) {
      // 后续依赖此场景的都会因为依赖检查失败而报错
    }
  }

  return results
}

// 按依赖关系排序
function sortByDependencies(scenarios: E2eScenario[]): E2eScenario[] {
  const sorted: E2eScenario[] = []
  const visited = new Set<string>()
  const scenarioMap = new Map(scenarios.map((s) => [s.code, s]))

  function visit(scenario: E2eScenario) {
    if (visited.has(scenario.code)) return
    visited.add(scenario.code)

    const config = scenario.config as unknown as ScenarioConfig
    if (config.dependencies) {
      for (const dep of config.dependencies) {
        const depScenario = scenarioMap.get(dep)
        if (depScenario) {
          visit(depScenario)
        }
      }
    }

    sorted.push(scenario)
  }

  for (const scenario of scenarios) {
    visit(scenario)
  }

  return sorted
}
