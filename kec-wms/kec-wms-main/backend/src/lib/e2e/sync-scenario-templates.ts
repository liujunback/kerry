/**
 * 场景模板同步脚本
 * 将 templates/ 下的模板同步到数据库，统一入库和出库场景管理
 *
 * 使用方式：
 *   npx ts-node -r tsconfig-paths/register src/lib/e2e/sync-scenario-templates.ts
 */

import { prisma as appPrisma } from '@/lib/db/prisma'
import { ALL_TEMPLATES } from './scenarios/templates'
import type { ScenarioTemplate } from './scenarios/templates/types'

// ==================== 分类定义 ====================

const TEMPLATE_CATEGORIES = [
  // 入库
  { code: 'INBOUND-RECV', name: '入库-收货', description: '收货相关场景', sortOrder: 10, domain: 'inbound', templatePrefix: 'RECV-' },
  { code: 'INBOUND-PUT', name: '入库-上架', description: '上架相关场景', sortOrder: 20, domain: 'putaway', templatePrefix: 'PUT-' },
  { code: 'INBOUND-FULL', name: '入库-完整流程', description: '端到端入库流程', sortOrder: 30, domain: 'inbound', templatePrefix: 'INBOUND-' },
  // 出库
  { code: 'OUTBOUND-ORDER', name: '出库-订单', description: '订单创建相关场景', sortOrder: 40, domain: 'outbound', templatePrefix: 'OUT-' },
  { code: 'OUTBOUND-PICK', name: '出库-拣货', description: '拣货相关场景', sortOrder: 50, domain: 'outbound', templatePrefix: 'PICK' },
  { code: 'OUTBOUND-PACK', name: '出库-打包', description: '打包相关场景', sortOrder: 60, domain: 'outbound', templatePrefix: 'PACK' },
  { code: 'OUTBOUND-CHECKOUT', name: '出库-签出', description: '签出相关场景', sortOrder: 70, domain: 'outbound', templatePrefix: 'CHECKOUT' },
  { code: 'OUTBOUND-FULL', name: '出库-完整流程', description: '端到端出库流程', sortOrder: 80, domain: 'outbound', templatePrefix: 'OUTBOUND-' },
]

const LEGACY_SEED_CATEGORY_CODES = [
  'RECEIVING',
  'PUTAWAY',
  'INBOUND',
  'NEGATIVE',
  'OUTBOUND_ORDER',
  'PICKING',
  'PACKING',
  'CHECKOUT',
  'OUTBOUND_FULL',
  'OUTBOUND_NEGATIVE',
]

interface ScenarioSyncPrisma {
  e2eScenarioCategory: {
    findMany: (...args: any[]) => Promise<any[]>
    findUnique: (...args: any[]) => Promise<any>
    upsert: (...args: any[]) => Promise<any>
    deleteMany: (...args: any[]) => Promise<{ count: number }>
  }
  e2eScenario: {
    findMany: (...args: any[]) => Promise<any[]>
    upsert: (...args: any[]) => Promise<any>
    deleteMany: (...args: any[]) => Promise<{ count: number }>
  }
  e2eScenarioResult: {
    deleteMany: (...args: any[]) => Promise<{ count: number }>
  }
}

// ==================== 预设参数组合 ====================

interface PresetConfig {
  suffix: string
  name: string
  params: Record<string, unknown>
}

const SKU_TYPE_PRESETS: PresetConfig[] = [
  { suffix: 'NORMAL', name: '普通SKU', params: { skuType: 'normal' } },
  { suffix: 'BATCH', name: '批次SKU', params: { skuType: 'batch' } },
  { suffix: 'EXPIRY', name: '效期SKU', params: { skuType: 'expiry' } },
  { suffix: 'SERIAL', name: '序列号SKU', params: { skuType: 'serial' } },
  { suffix: 'FULL', name: '全属性SKU', params: { skuType: 'full' } },
]

const QUANTITY_PRESETS: PresetConfig[] = [
  { suffix: 'EXACT', name: '正常数量', params: { direction: 'exact', actualQty: 100, expectedQty: 100 } },
  { suffix: 'OVER-20PCT', name: '超收20%', params: { direction: 'over', actualQty: 120, expectedQty: 100 } },
  { suffix: 'UNDER-50PCT', name: '欠收50%', params: { direction: 'under', actualQty: 50, expectedQty: 100 } },
]

// ==================== 生成场景实例 ====================

function generateScenarioInstances(template: ScenarioTemplate): Array<{
  code: string
  name: string
  params: Record<string, unknown>
}> {
  const instances: Array<{ code: string; name: string; params: Record<string, unknown> }> = []

  // 根据模板类型生成不同的预设组合
  if (template.code === 'RECV-NORMAL' || template.code === 'PUT-NORMAL' || template.code === 'OUTBOUND-FULL') {
    // SKU 类型变体
    for (const preset of SKU_TYPE_PRESETS) {
      instances.push({
        code: `${template.code}-${preset.suffix}`,
        name: `${template.name}-${preset.name}`,
        params: { ...preset.params, quantity: 10 },
      })
    }
  } else if (template.code === 'RECV-QUANTITY') {
    // 数量变体
    for (const preset of QUANTITY_PRESETS) {
      instances.push({
        code: `${template.code}-${preset.suffix}`,
        name: `${template.name}-${preset.name}`,
        params: preset.params,
      })
    }
  } else if (template.code === 'RECV-QUALITY') {
    // 质量比例变体
    instances.push({ code: `${template.code}-73`, name: `${template.name}-良品70%`, params: { goodQty: 70, damagedQty: 30, expectedQty: 100 } })
    instances.push({ code: `${template.code}-37`, name: `${template.name}-良品30%`, params: { goodQty: 30, damagedQty: 70, expectedQty: 100 } })
    instances.push({ code: `${template.code}-DAMAGED`, name: `${template.name}-全残`, params: { goodQty: 0, damagedQty: 100, expectedQty: 100 } })
  } else if (template.code === 'RECV-NEGATIVE' || template.code === 'PUT-FAIL') {
    // 异常类型变体
    const exceptionTypes = template.parameters.exceptionType?.enum || []
    for (const exType of exceptionTypes.slice(0, 5)) { // 取前5个常用的
      instances.push({
        code: `${template.code}-${exType.toUpperCase().replace(/_/g, '-')}`,
        name: `${template.name}-${exType}`,
        params: { exceptionType: exType },
      })
    }
  } else {
    // 默认：只生成一个基础实例
    instances.push({
      code: template.code,
      name: template.name,
      params: {},
    })
  }

  return instances
}

// ==================== 同步函数 ====================

async function cleanupLegacySeedScenarios(db: ScenarioSyncPrisma): Promise<{
  categoriesDeleted: number
  scenariosDeleted: number
  resultsDeleted: number
}> {
  const legacyCategories = await db.e2eScenarioCategory.findMany({
    where: { code: { in: LEGACY_SEED_CATEGORY_CODES } },
    select: { id: true },
  })

  if (legacyCategories.length === 0) {
    return { categoriesDeleted: 0, scenariosDeleted: 0, resultsDeleted: 0 }
  }

  const legacyCategoryIds = legacyCategories.map((category) => category.id)
  const legacyScenarios = await db.e2eScenario.findMany({
    where: { categoryId: { in: legacyCategoryIds } },
    select: { id: true },
  })

  const legacyScenarioIds = legacyScenarios.map((scenario) => scenario.id)
  const resultsDeleted = legacyScenarioIds.length > 0
    ? (await db.e2eScenarioResult.deleteMany({ where: { scenarioId: { in: legacyScenarioIds } } })).count
    : 0

  const scenariosDeleted = (await db.e2eScenario.deleteMany({
    where: { categoryId: { in: legacyCategoryIds } },
  })).count

  const categoriesDeleted = (await db.e2eScenarioCategory.deleteMany({
    where: { id: { in: legacyCategoryIds } },
  })).count

  return { categoriesDeleted, scenariosDeleted, resultsDeleted }
}

export async function syncScenarioTemplates(
  db: ScenarioSyncPrisma = appPrisma,
  options: { cleanupLegacySeedData?: boolean } = {},
): Promise<{
  categoriesCreated: number
  scenariosSynced: number
  categoriesDeleted: number
  scenariosDeleted: number
  resultsDeleted: number
}> {
  console.log('\n' + '='.repeat(60))
  console.log('🔄 同步场景模板到数据库')
  console.log('='.repeat(60))
  console.log(`📦 模板总数: ${ALL_TEMPLATES.length}`)

  let categoriesCreated = 0
  let scenariosSynced = 0
  let categoriesDeleted = 0
  let scenariosDeleted = 0
  let resultsDeleted = 0

  if (options.cleanupLegacySeedData) {
    const cleanupResult = await cleanupLegacySeedScenarios(db)
    categoriesDeleted = cleanupResult.categoriesDeleted
    scenariosDeleted = cleanupResult.scenariosDeleted
    resultsDeleted = cleanupResult.resultsDeleted

    if (categoriesDeleted || scenariosDeleted || resultsDeleted) {
      console.log(
        `🧹 已清理旧 seed 场景: ${categoriesDeleted} 分类 / ${scenariosDeleted} 场景 / ${resultsDeleted} 结果`,
      )
    }
  }

  // 1. 创建/更新分类
  for (const cat of TEMPLATE_CATEGORIES) {
    await db.e2eScenarioCategory.upsert({
      where: { code: cat.code },
      create: { code: cat.code, name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
      update: { name: cat.name, description: cat.description, sortOrder: cat.sortOrder },
    })
    categoriesCreated++
  }
  console.log(`✅ 分类同步完成: ${categoriesCreated} 个`)

  // 2. 为每个模板生成场景实例
  for (const template of ALL_TEMPLATES) {
    const category = TEMPLATE_CATEGORIES.find(c =>
      template.code.startsWith(c.templatePrefix) ||
      (c.domain === template.domain && template.code.startsWith(c.templatePrefix.split('-')[0]))
    )
    if (!category) {
      console.warn(`⚠️ 模板 ${template.code} 未找到匹配分类，跳过`)
      continue
    }

    const categoryRecord = await db.e2eScenarioCategory.findUnique({ where: { code: category.code } })
    if (!categoryRecord) continue

    const instances = generateScenarioInstances(template)

    for (const instance of instances) {
      const config = template.buildConfig(instance.params)
      const expected = template.buildExpected(instance.params)

      await db.e2eScenario.upsert({
        where: { code: instance.code },
        create: {
          categoryId: categoryRecord.id,
          code: instance.code,
          name: instance.name,
          description: `${template.description} [模板: ${template.code}]`,
          config: config as any,
          expected: expected as any,
          sortOrder: scenariosSynced,
          isActive: true,
        },
        update: {
          name: instance.name,
          description: `${template.description} [模板: ${template.code}]`,
          config: config as any,
          expected: expected as any,
        },
      })
      scenariosSynced++
    }
    console.log(`  📝 ${template.code}: ${instances.length} 个实例`)
  }

  console.log('='.repeat(60))
  console.log(`✅ 同步完成: ${categoriesCreated} 分类, ${scenariosSynced} 场景`)
  console.log('='.repeat(60) + '\n')

  return { categoriesCreated, scenariosSynced, categoriesDeleted, scenariosDeleted, resultsDeleted }
}

// 直接运行
if (require.main === module) {
  syncScenarioTemplates()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1) })
}
