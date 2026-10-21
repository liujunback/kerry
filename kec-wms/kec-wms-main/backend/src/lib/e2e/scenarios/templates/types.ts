/**
 * 场景模板类型定义
 * 将 100+ 场景精简为 25 个参数化模板
 */

import type { ScenarioConfig, ScenarioExpected } from '../../scenario-executor-api'

// ==================== 基础类型 ====================

export type SkuType = 'normal' | 'batch' | 'expiry' | 'serial' | 'full'
export type Domain = 'inbound' | 'putaway' | 'outbound'
export type QualityStatus = 'good' | 'damaged' | 'mixed'
export type QuantityDirection = 'exact' | 'over' | 'under'

// ==================== 参数 Schema ====================

export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array'
  enum?: string[]
  default?: unknown
  required?: boolean
  description?: string
}

// ==================== 场景模板 ====================

export interface ScenarioTemplate {
  /** 模板编码 */
  code: string
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 业务域 */
  domain: Domain
  /** 优先级 */
  priority: 'P0' | 'P1' | 'P2' | 'P3'

  /** 参数 schema（用于校验和自动填充） */
  parameters: Record<string, ParameterSchema>

  /** 匹配特征（用于自动匹配） */
  matchFeatures: MatchFeatures

  /** 根据参数生成完整 config */
  buildConfig: (params: Record<string, unknown>) => ScenarioConfig

  /** 根据参数生成预期结果 */
  buildExpected: (params: Record<string, unknown>) => ScenarioExpected
}

// ==================== 匹配特征 ====================

export interface MatchFeatures {
  /** SKU 类型（支持多个） */
  skuTypes?: SkuType[]
  /** 数量方向 */
  quantityDirection?: QuantityDirection
  /** 数量阈值范围 */
  quantityThreshold?: { min?: number; max?: number }
  /** 质量状态 */
  qualityStatus?: QualityStatus
  /** 操作模式 */
  operationMode?: 'sku' | 'container'
  /** 是否负向测试 */
  isNegative?: boolean
  /** 异常类型 */
  exceptionType?: 'not_found' | 'invalid_status' | 'duplicate' | 'conflict' | 'validation'
  /** 匹配权重（用于多模板匹配时排序） */
  weight: number
}

// ==================== 输入数据 ====================

export interface InputData {
  /** 业务类型 */
  businessType: 'asn' | 'putaway' | 'outbound' | 'pick' | 'pack' | 'checkout'

  /** SKU 信息 */
  skuCode?: string
  hasBatchNumber?: boolean
  hasExpiryDate?: boolean
  hasSerialNumbers?: boolean
  batchNumber?: string
  expiryDate?: string
  serialNumbers?: string[]

  /** 数量信息 */
  expectedQty?: number
  actualQty?: number

  /** 质量状态 */
  qualityStatus?: 'GOOD' | 'DAMAGED'
  goodQty?: number
  damagedQty?: number

  /** 操作模式 */
  receivingMode?: 'SKU' | 'CONTAINER'
  containerCode?: string

  /** 异常场景标识 */
  isNegativeTest?: boolean
  exceptionType?: string
}

// ==================== 匹配结果 ====================

export interface MatchResult {
  /** 匹配的模板 */
  template: ScenarioTemplate
  /** 推断的参数 */
  inferredParams: Record<string, unknown>
  /** 匹配置信度 0-100 */
  confidence: number
  /** 匹配的特征 */
  matchedFeatures: string[]
  /** 缺失的特征 */
  missingFeatures: string[]
  /** 生成的配置 */
  generatedConfig: ScenarioConfig
  /** 生成的预期结果 */
  generatedExpected: ScenarioExpected
}
