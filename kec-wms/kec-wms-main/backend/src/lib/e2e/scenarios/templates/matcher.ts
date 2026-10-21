/**
 * 场景模板注册表 + 匹配引擎
 * 根据输入数据自动推断最佳模板和参数
 */

import type { ScenarioTemplate, InputData, MatchResult, MatchFeatures } from './types'
import { INBOUND_TEMPLATES } from './inbound'
import { OUTBOUND_TEMPLATES } from './outbound'

// ==================== 注册表 ====================

export const ALL_TEMPLATES: ScenarioTemplate[] = [
  ...INBOUND_TEMPLATES,
  ...OUTBOUND_TEMPLATES,
]

export interface ParsedInputResult {
  parsedInput: InputData
  warnings: string[]
  missingFields: string[]
}

function extractNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return Number(match[1])
    }
  }
  return undefined
}

function extractText(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }
  return undefined
}

function inferBusinessType(text: string): InputData['businessType'] {
  if (/(签出|出库复核|发货)/.test(text)) return 'checkout'
  if (/(打包|包装)/.test(text)) return 'pack'
  if (/(拣货|拣选)/.test(text)) return 'pick'
  if (/(出库|订单)/.test(text)) return 'outbound'
  if (/(上架|入库上架)/.test(text)) return 'putaway'
  return 'asn'
}

function inferExceptionType(text: string): string | undefined {
  if (/(缺批次|没有批次|无批次)/.test(text)) return 'no_batch_number'
  if (/(缺效期|没有效期|无效期)/.test(text)) return 'no_expiry_date'
  if (/(过期)/.test(text)) return 'expired'
  if (/(序列号.*不匹配|序列号.*缺失|没传序列号)/.test(text)) return 'serial_count_mismatch'
  if (/(超收)/.test(text)) return 'over_receive'
  if (/(欠收|少收)/.test(text)) return 'under_receive'
  if (/(重复)/.test(text)) return 'duplicate'
  if (/(冲突)/.test(text)) return 'conflict'
  if (/(禁用容器)/.test(text)) return 'container_disabled'
  if (/(占用容器)/.test(text)) return 'container_occupied'
  return undefined
}

export function parseInputText(inputText: string): ParsedInputResult {
  const text = inputText.trim()
  const warnings: string[] = []
  const missingFields: string[] = []

  const parsedInput: InputData = {
    businessType: inferBusinessType(text),
  }

  const skuType = (() => {
    if (/(全属性)/.test(text)) return 'full'
    if (/(序列号)/.test(text)) return 'serial'
    if (/(效期)/.test(text)) return 'expiry'
    if (/(批次)/.test(text)) return 'batch'
    return 'normal'
  })()

  parsedInput.hasBatchNumber = skuType === 'batch' || skuType === 'expiry' || skuType === 'serial' || skuType === 'full'
  parsedInput.hasExpiryDate = skuType === 'expiry' || skuType === 'full'
  parsedInput.hasSerialNumbers = skuType === 'serial' || skuType === 'full'

  parsedInput.batchNumber = extractText(text, [
    /批次号[:：]?\s*([A-Za-z0-9_-]+)/,
    /批次[:：]?\s*([A-Za-z0-9_-]+)/,
  ])
  parsedInput.expiryDate = extractText(text, [
    /效期[:：]?\s*(\d{4}-\d{2}-\d{2})/,
    /到期[:：]?\s*(\d{4}-\d{2}-\d{2})/,
  ])
  parsedInput.containerCode = extractText(text, [
    /容器号[:：]?\s*([A-Za-z0-9_-]+)/,
    /容器[:：]?\s*([A-Za-z0-9_-]+)/,
  ])

  parsedInput.expectedQty = extractNumber(text, [
    /(?:期望|预计|应收|应出|数量)\s*(\d+)/,
    /(\d+)\s*(?:件|个|箱|PCS|pcs)/,
  ])
  parsedInput.actualQty = extractNumber(text, [
    /(?:实际|收货|出库|打包|拣货)\s*(\d+)/,
    /(?:超收|欠收)\s*(\d+)/,
  ])

  if (/(超收\s*20%|超收20%)/.test(text) && parsedInput.expectedQty) {
    parsedInput.actualQty = Math.floor(parsedInput.expectedQty * 1.2)
  }
  if (/(欠收\s*50%|欠收50%)/.test(text) && parsedInput.expectedQty) {
    parsedInput.actualQty = Math.floor(parsedInput.expectedQty * 0.5)
  }

  if (/(全残|全部残品)/.test(text)) {
    parsedInput.qualityStatus = 'DAMAGED'
    parsedInput.damagedQty = parsedInput.expectedQty
  } else if (/(混合|良品.*残品|残品.*良品)/.test(text)) {
    parsedInput.goodQty = extractNumber(text, [/良品\s*(\d+)/]) ?? undefined
    parsedInput.damagedQty = extractNumber(text, [/残品\s*(\d+)/]) ?? undefined
  } else if (/(残品|破损)/.test(text)) {
    parsedInput.qualityStatus = 'DAMAGED'
  } else {
    parsedInput.qualityStatus = 'GOOD'
  }

  if (/(容器收货|容器模式|按容器)/.test(text)) {
    parsedInput.receivingMode = 'CONTAINER'
  } else if (parsedInput.businessType === 'asn' || parsedInput.businessType === 'putaway') {
    parsedInput.receivingMode = 'SKU'
  }

  parsedInput.isNegativeTest = /(失败|报错|异常|校验|缺少|缺失|无效|不匹配|超收|欠收|冲突|重复)/.test(text)
  parsedInput.exceptionType = inferExceptionType(text)

  if (!parsedInput.expectedQty && ['asn', 'putaway', 'outbound', 'pick', 'pack', 'checkout'].includes(parsedInput.businessType)) {
    missingFields.push('quantity')
    warnings.push('未明确识别数量，系统会使用模板默认值。')
  }

  if (/(混合|良品.*残品|残品.*良品)/.test(text) && (!parsedInput.goodQty || !parsedInput.damagedQty)) {
    missingFields.push('qualityBreakdown')
    warnings.push('识别到混合收货，但未完整识别良品/残品数量。')
  }

  if (parsedInput.receivingMode === 'CONTAINER' && !parsedInput.containerCode) {
    missingFields.push('containerCode')
    warnings.push('识别到容器模式，但未提取到容器号。')
  }

  if (parsedInput.hasBatchNumber && !parsedInput.batchNumber && /(批次号|指定批次)/.test(text)) {
    missingFields.push('batchNumber')
  }

  if (parsedInput.hasExpiryDate && !parsedInput.expiryDate && /(效期|到期)/.test(text)) {
    missingFields.push('expiryDate')
  }

  return {
    parsedInput,
    warnings,
    missingFields,
  }
}

// ==================== 特征提取 ====================

function extractFeatures(input: InputData): Partial<MatchFeatures> & { domain?: string } {
  const domain = input.businessType === 'asn' ? 'inbound'
    : input.businessType === 'putaway' ? 'putaway'
    : 'outbound'

  const skuTypes = (() => {
    if (input.hasSerialNumbers && input.hasBatchNumber && input.hasExpiryDate) return ['full']
    if (input.hasSerialNumbers) return ['serial']
    if (input.hasBatchNumber && input.hasExpiryDate) return ['full']
    if (input.hasExpiryDate) return ['expiry']
    if (input.hasBatchNumber) return ['batch']
    return ['normal']
  })() as MatchFeatures['skuTypes']

  const quantityDirection = (() => {
    if (!input.expectedQty || !input.actualQty) return undefined
    if (input.actualQty > input.expectedQty) return 'over' as const
    if (input.actualQty < input.expectedQty) return 'under' as const
    return 'exact' as const
  })()

  const qualityStatus = (() => {
    if (input.goodQty && input.damagedQty) return 'mixed' as const
    if (input.qualityStatus === 'DAMAGED') return 'damaged' as const
    return 'good' as const
  })()

  return {
    domain,
    skuTypes,
    quantityDirection,
    qualityStatus,
    operationMode: input.receivingMode === 'CONTAINER' ? 'container' : 'sku',
    isNegative: input.isNegativeTest ?? false,
    exceptionType: input.exceptionType as MatchFeatures['exceptionType'],
  }
}

// ==================== 匹配评分 ====================

function scoreTemplate(
  template: ScenarioTemplate,
  features: ReturnType<typeof extractFeatures>,
): { score: number; matched: string[]; missing: string[] } {
  const matched: string[] = []
  const missing: string[] = []
  let score = 0

  // domain 必须匹配
  if (template.domain !== features.domain) return { score: 0, matched, missing: ['domain'] }
  matched.push('domain')
  score += 30

  const f = template.matchFeatures

  // isNegative 必须匹配
  if (f.isNegative !== undefined && f.isNegative !== features.isNegative) {
    return { score: 0, matched, missing: ['isNegative'] }
  }
  matched.push('isNegative')
  score += 20

  // skuTypes 匹配
  if (f.skuTypes && features.skuTypes) {
    const overlap = f.skuTypes.some(t => features.skuTypes!.includes(t))
    if (overlap) { matched.push('skuTypes'); score += 20 }
    else missing.push('skuTypes')
  }

  // quantityDirection 匹配
  if (f.quantityDirection && features.quantityDirection) {
    if (f.quantityDirection === features.quantityDirection) { matched.push('quantityDirection'); score += 15 }
    else missing.push('quantityDirection')
  }

  // qualityStatus 匹配
  if (f.qualityStatus && features.qualityStatus) {
    if (f.qualityStatus === features.qualityStatus) { matched.push('qualityStatus'); score += 10 }
    else missing.push('qualityStatus')
  }

  // operationMode 匹配
  if (f.operationMode && features.operationMode) {
    if (f.operationMode === features.operationMode) { matched.push('operationMode'); score += 10 }
    else missing.push('operationMode')
  }

  // exceptionType 匹配
  if (f.exceptionType && features.exceptionType) {
    if (f.exceptionType === features.exceptionType) { matched.push('exceptionType'); score += 10 }
    else missing.push('exceptionType')
  }

  // 加权
  score = Math.round(score * (f.weight / 100))

  return { score, matched, missing }
}

// ==================== 参数推断 ====================

function inferParams(template: ScenarioTemplate, input: InputData): Record<string, unknown> {
  const params: Record<string, unknown> = {}

  // 从 schema 填充默认值
  for (const [key, schema] of Object.entries(template.parameters)) {
    if (schema.default !== undefined) params[key] = schema.default
  }

  // 从 input 推断
  if ('skuType' in template.parameters) {
    if (input.hasSerialNumbers && input.hasBatchNumber && input.hasExpiryDate) params.skuType = 'full'
    else if (input.hasSerialNumbers) params.skuType = 'serial'
    else if (input.hasExpiryDate && input.hasBatchNumber) params.skuType = 'full'
    else if (input.hasExpiryDate) params.skuType = 'expiry'
    else if (input.hasBatchNumber) params.skuType = 'batch'
    else params.skuType = 'normal'
  }

  if ('quantity' in template.parameters && input.expectedQty) params.quantity = input.expectedQty
  if ('expectedQty' in template.parameters && input.expectedQty) params.expectedQty = input.expectedQty
  if ('actualQty' in template.parameters && input.actualQty) params.actualQty = input.actualQty
  if ('goodQty' in template.parameters && input.goodQty) params.goodQty = input.goodQty
  if ('damagedQty' in template.parameters && input.damagedQty) params.damagedQty = input.damagedQty
  if ('exceptionType' in template.parameters && input.exceptionType) params.exceptionType = input.exceptionType
  if ('isNegative' in template.parameters) params.isNegative = input.isNegativeTest ?? false

  if ('direction' in template.parameters && input.expectedQty && input.actualQty) {
    if (input.actualQty > input.expectedQty) params.direction = 'over'
    else if (input.actualQty < input.expectedQty) params.direction = 'under'
    else params.direction = 'exact'
  }

  if ('batchNumber' in template.parameters && input.batchNumber) params.batchNumber = input.batchNumber
  if ('expiryDate' in template.parameters && input.expiryDate) params.expiryDate = input.expiryDate

  return params
}

// ==================== 主匹配函数 ====================

export function matchTemplate(input: InputData): MatchResult[] {
  const features = extractFeatures(input)

  return ALL_TEMPLATES
    .map(template => {
      const { score, matched, missing } = scoreTemplate(template, features)
      if (score === 0) return null
      const inferredParams = inferParams(template, input)
      return {
        template,
        inferredParams,
        confidence: score,
        matchedFeatures: matched,
        missingFeatures: missing,
        generatedConfig: template.buildConfig(inferredParams),
        generatedExpected: template.buildExpected(inferredParams),
      } satisfies MatchResult
    })
    .filter((r): r is MatchResult => r !== null)
    .sort((a, b) => b.confidence - a.confidence)
}

export function bestMatch(input: InputData): MatchResult | null {
  return matchTemplate(input)[0] ?? null
}
