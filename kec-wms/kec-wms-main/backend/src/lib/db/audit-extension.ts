import { AsyncLocalStorage } from 'async_hooks'
import { Prisma, PrismaClient } from '@prisma/client'
import { pushAuditToQueue } from '../queue/audit-queue'

// 用于审计扩展内部查询的独立 Prisma Client（避免循环依赖）
let internalPrisma: PrismaClient | null = null
function getInternalPrisma(): PrismaClient {
  if (!internalPrisma) {
    internalPrisma = new PrismaClient({ log: ['error'] })
  }
  return internalPrisma
}

// 请求上下文类型
export interface AuditContext {
  tenantId?: string
  operatorId?: string
  operatorName?: string
  ipAddress?: string
  userAgent?: string
  requestPath?: string
  requestMethod?: string
  disableEntityAudit?: boolean
}

// 全局单例，避免 Next.js 热重载导致创建多个实例
const globalForAuditContext = globalThis as unknown as {
  auditContext: AsyncLocalStorage<AuditContext> | undefined
}

// 用于存储请求上下文的 AsyncLocalStorage（全局单例）
export const auditContext = globalForAuditContext.auditContext ?? new AsyncLocalStorage<AuditContext>()

// 保存到全局，确保热重载后仍是同一个实例
if (!globalForAuditContext.auditContext) {
  globalForAuditContext.auditContext = auditContext
  console.log('[Audit Context] Created new AsyncLocalStorage instance')
}

/**
 * 为 Worker/后台任务设置审计上下文
 * 使用方式:
 * await withWorkerAuditContext({ tenantId, operatorId, operatorName }, async () => {
 *   // 业务逻辑
 * })
 */
export async function withWorkerAuditContext<T>(
  ctx: AuditContext,
  handler: () => Promise<T>
): Promise<T> {
  return auditContext.run(ctx, handler)
}

// 需要排除的表（不记录审计日志）
const EXCLUDED_MODELS = new Set([
  'Audit', // 审计表自身
  'LoginHistory', // 登录历史
  'OperationLog', // 操作日志
  'BackgroundJob', // 后台任务
  'OutboundOrderSequence', // 订单号序列（高频技术表，不需要审计）
  'ScheduledTaskLog', // 定时任务日志
  'ApiKey', // API 密钥（每次请求都会更新 lastUsedAt，产生大量日志）
  'SkuInventorySummary', // SKU 库存汇总快照（高频更新，不需要审计）
  'LocationInventorySnapshot', // 库位库存快照（高频更新，不需要审计）
])

/**
 * 展开复合唯一索引语法为单独字段
 * Prisma upsert 支持 `field1_field2: { field1: ..., field2: ... }` 语法
 * 但 findFirst 不支持，需要展开为 `{ field1: ..., field2: ... }`
 */
function expandCompositeKey(where: Record<string, any>): Record<string, any> {
  if (!where || typeof where !== 'object') return where

  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(where)) {
    // 检测复合键语法：键名包含下划线且值是对象
    if (
      key.includes('_') &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      // 检查值对象的所有键是否都包含在复合键名中
      const keyParts = key.split('_')
      const valueKeys = Object.keys(value)
      const isCompositeKey = valueKeys.every(vk => keyParts.includes(vk))

      if (isCompositeKey && valueKeys.length > 0) {
        // 展开复合键：将值对象的字段合并到结果中
        Object.assign(result, value)
        continue
      }
    }

    // 非复合键，直接保留
    result[key] = value
  }

  return result
}

// 敏感字段（需要脱敏）
const SENSITIVE_FIELDS = new Set(['password', 'passwordHash', 'apiKey', 'apiSecret', 'token', 'keyHash'])

/**
 * 提取实体名称（用于显示）
 */
function extractEntityName(entityType: string, data: any): string | null {
  if (!data) return null

  // 根据不同实体类型提取合适的名称字段
  const nameFields = [
    'name',
    'username',
    'tenantName',
    'warehouseName',
    'skuCode',
    'externalNumber',
    'orderNumber',
    'asnNumber',
    'code',
    'title',
  ]

  for (const field of nameFields) {
    if (data[field]) return String(data[field])
  }

  return data.id || null
}

// 关键字段列表（用于 CREATE/DELETE 操作的精简记录）
const KEY_FIELDS = [
  'id',
  'name',
  'username',
  'tenantName',
  'warehouseName',
  'skuCode',
  'externalNumber',
  'orderNumber',
  'asnNumber',
  'code',
  'title',
  'status',
  'roleCode',
  'roleName',
]

/**
 * 提取关键字段（用于 CREATE/DELETE 操作的精简记录）
 */
function extractKeyFields(data: any): Record<string, any> {
  if (!data || typeof data !== 'object') return {}

  const result: Record<string, any> = {}
  for (const field of KEY_FIELDS) {
    if (data[field] !== undefined && data[field] !== null) {
      result[field] = data[field]
    }
  }
  return result
}

/**
 * 对数据进行脱敏处理（同时序列化 BigInt 等特殊类型）
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return serializeValue(data)

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELDS.has(key)) {
      result[key] = '***REDACTED***'
    } else {
      result[key] = serializeValue(value)
    }
  }
  return result
}

/**
 * 安全的 JSON 序列化，处理 BigInt 和 Decimal 类型
 */
function safeStringify(value: any): string {
  return JSON.stringify(value, (_, v) => {
    if (typeof v === 'bigint') return v.toString()
    if (v && typeof v === 'object' && v.constructor?.name === 'Decimal') return v.toString()
    return v
  })
}

/**
 * 转换值为可存储格式（BigInt -> string）
 */
function serializeValue(value: any): any {
  if (typeof value === 'bigint') return value.toString()
  if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(serializeValue)
  if (value && typeof value === 'object') {
    const result: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = serializeValue(v)
    }
    return result
  }
  return value
}

/**
 * 对比两个对象，提取变更的字段，分别返回旧值和新值对象
 */
function extractChanges(oldData: any, newData: any): {
  fields: string[]
  oldValues: Record<string, any>
  newValues: Record<string, any>
} {
  if (!oldData || !newData) return { fields: [], oldValues: {}, newValues: {} }

  const fields: string[] = []
  const oldValues: Record<string, any> = {}
  const newValues: Record<string, any> = {}
  const oldKeys = Object.keys(oldData)
  const newKeys = Object.keys(newData)
  const allKeys = Array.from(new Set([...oldKeys, ...newKeys]))

  for (const key of allKeys) {
    // 跳过系统字段
    if (key === 'updatedAt' || key === 'createdAt') continue

    const oldValue = oldData[key]
    const newValue = newData[key]

    // 深度比较（使用安全序列化）
    if (safeStringify(oldValue) !== safeStringify(newValue)) {
      fields.push(key)
      // 脱敏处理 + 序列化
      oldValues[key] = SENSITIVE_FIELDS.has(key) ? '***REDACTED***' : serializeValue(oldValue)
      newValues[key] = SENSITIVE_FIELDS.has(key) ? '***REDACTED***' : serializeValue(newValue)
    }
  }

  return { fields, oldValues, newValues }
}

// 是否启用调试日志
const DEBUG_AUDIT = process.env.DEBUG_AUDIT === 'true'

/**
 * 捕获审计信息并推送到队列
 * 优化：只记录变更字段的新旧值，减少数据量
 * @param capturedCtx 预先捕获的上下文（解决 AsyncLocalStorage 在 Prisma 回调中丢失的问题）
 */
async function captureAudit(
  operationType: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: string,
  newData: any,
  oldData?: any,
  capturedCtx?: AuditContext
): Promise<void> {
  try {
    if (capturedCtx?.disableEntityAudit) {
      return
    }

    // 跳过排除的表
    if (EXCLUDED_MODELS.has(entityType)) {
      if (DEBUG_AUDIT) console.log(`[Audit] Skipped excluded model: ${entityType}`)
      return
    }

    // 使用预先捕获的上下文（优先），或尝试从 AsyncLocalStorage 获取，最后从数据中提取 tenantId
    const ctx = capturedCtx || auditContext.getStore()
    const tenantId = ctx?.tenantId || newData?.tenantId || oldData?.tenantId

    if (DEBUG_AUDIT) {
      console.log(`[Audit] ${operationType} ${entityType}`, {
        hasContext: !!ctx,
        tenantId,
        entityId: newData?.id || oldData?.id,
      })
    }

    if (!tenantId) {
      if (DEBUG_AUDIT) console.warn(`[Audit] Skipped - no tenantId for ${entityType}`)
      return // 没有租户信息则跳过
    }

    // 根据操作类型构建精简的审计数据
    let auditOldData: any = null
    let auditNewData: any = null
    let changedFields: string[] = []

    if (operationType === 'CREATE') {
      // CREATE：记录完整数据（脱敏处理）
      auditNewData = sanitizeData(newData)
    } else if (operationType === 'DELETE') {
      // DELETE：只记录关键字段
      auditOldData = { deleted: extractKeyFields(oldData) }
    } else if (operationType === 'UPDATE') {
      // UPDATE：旧值放 oldData，新值放 newData，方便前端分别显示
      const { fields, oldValues, newValues } = extractChanges(oldData, newData)
      changedFields = fields
      if (fields.length > 0) {
        auditOldData = oldValues
        auditNewData = newValues
      } else {
        // 没有实际变更，跳过记录
        return
      }
    }

    // 推送到队列
    await pushAuditToQueue({
      operationType,
      entityType,
      entityId: (newData?.id || oldData?.id) as string,
      entityName: extractEntityName(entityType, newData || oldData),
      oldData: auditOldData,
      newData: auditNewData,
      changedFields,
      tenantId,
      operatorId: ctx?.operatorId,
      operatorName: ctx?.operatorName,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      requestPath: ctx?.requestPath,
      requestMethod: ctx?.requestMethod,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    // 审计失败不应该影响主业务，只记录错误
    console.error('[Audit Extension] Failed to capture audit:', error)
  }
}

/**
 * Prisma 审计扩展
 * 自动拦截所有数据库的 create/update/delete 操作
 */
export const auditExtension = Prisma.defineExtension({
  name: 'audit',
  query: {
    $allModels: {
      // 拦截 create 操作
      async create({ args, query, model }) {
        const ctx = auditContext.getStore()
        if (EXCLUDED_MODELS.has(model) || ctx?.disableEntityAudit) {
          return query(args)
        }
        // 在调用 query 之前捕获上下文（解决 AsyncLocalStorage 在 Prisma 回调中丢失的问题）
        const result = await query(args)
        // 审计异步投递，不阻塞主业务响应
        void captureAudit('CREATE', model, result, undefined, ctx)
        return result
      },

      // 拦截 update 操作
      async update({ args, query, model }) {
        // 在调用 query 之前捕获上下文
        const ctx = auditContext.getStore()
        if (EXCLUDED_MODELS.has(model) || ctx?.disableEntityAudit) {
          return query(args)
        }

        // 先查询旧数据
        let oldData = null
        try {
          const prisma = getInternalPrisma()
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1)
          // @ts-expect-error - 动态模型访问
          oldData = await prisma[modelKey].findFirst({ where: args.where })
        } catch (error) {
          console.error(`[Audit Extension] Failed to fetch old data for ${model}:`, error)
        }

        const result = await query(args)
        // 审计异步投递，不阻塞主业务响应
        void captureAudit('UPDATE', model, result, oldData, ctx)
        return result
      },

      // 拦截 delete 操作
      async delete({ args, query, model }) {
        // 在调用 query 之前捕获上下文
        const ctx = auditContext.getStore()
        if (EXCLUDED_MODELS.has(model) || ctx?.disableEntityAudit) {
          return query(args)
        }

        // 先查询要删除的数据
        let oldData = null
        try {
          const prisma = getInternalPrisma()
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1)
          // @ts-expect-error - 动态模型访问
          oldData = await prisma[modelKey].findFirst({ where: args.where })
        } catch (error) {
          console.error(`[Audit Extension] Failed to fetch old data for ${model}:`, error)
        }

        const result = await query(args)
        // 审计异步投递，不阻塞主业务响应
        void captureAudit('DELETE', model, null, oldData, ctx)
        return result
      },

      // 拦截 upsert 操作
      async upsert({ args, query, model }) {
        // 在调用 query 之前捕获上下文
        const ctx = auditContext.getStore()
        if (EXCLUDED_MODELS.has(model) || ctx?.disableEntityAudit) {
          return query(args)
        }

        // 先查询是否存在
        // 注意：upsert 的 where 可能使用复合唯一索引语法，需要展开
        let existing = null
        try {
          const prisma = getInternalPrisma()
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1)
          // 展开复合键语法，使其兼容 findFirst
          const expandedWhere = expandCompositeKey(args.where)
          // @ts-expect-error - 动态模型访问
          existing = await prisma[modelKey].findFirst({ where: expandedWhere })
        } catch (error) {
          console.error(`[Audit Extension] Failed to fetch existing data for ${model}:`, error)
        }

        const result = await query(args)

        if (existing) {
          // 审计异步投递，不阻塞主业务响应
          void captureAudit('UPDATE', model, result, existing, ctx)
        } else {
          // 审计异步投递，不阻塞主业务响应
          void captureAudit('CREATE', model, result, undefined, ctx)
        }

        return result
      },
    },
  },
})
