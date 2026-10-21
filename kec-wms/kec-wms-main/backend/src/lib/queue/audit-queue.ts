/**
 * 审计日志 Redis 队列
 * 使用 Redis List 作为队列，独立 Worker 消费写入数据库
 * 如果 Redis 不可用，会 fallback 到同步写入数据库
 */

import { Prisma, PrismaClient } from '@prisma/client'
import { getQueueConnection } from './connection'

// 队列键名
const AUDIT_QUEUE_KEY = 'audit:queue'

// 是否使用同步写入模式（Redis 不可用时自动切换）
let useSyncMode = process.env.AUDIT_SYNC_MODE === 'true'

// 用于同步写入的 Prisma 客户端（懒加载）
let syncPrisma: PrismaClient | null = null
function getSyncPrisma(): PrismaClient {
  if (!syncPrisma) {
    syncPrisma = new PrismaClient({ log: ['error'] })
  }
  return syncPrisma
}

// 审计日志数据结构
export interface AuditQueueItem {
  operationType: 'CREATE' | 'UPDATE' | 'DELETE'
  entityType: string
  entityId: string
  entityName: string | null
  oldData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
  changedFields: string[]
  tenantId: string
  operatorId?: string
  operatorName?: string
  ipAddress?: string
  userAgent?: string
  requestPath?: string
  requestMethod?: string
  timestamp: string
}

/**
 * 自定义 JSON 序列化函数，处理 BigInt 和 Decimal 类型
 */
function safeJsonStringify(obj: unknown): string {
  return JSON.stringify(obj, (key, value) => {
    // 处理 BigInt 类型
    if (typeof value === 'bigint') {
      return value.toString()
    }
    // 处理 Prisma Decimal 类型
    if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
      return (value as Prisma.Decimal).toString()
    }
    return value
  })
}

// 是否启用调试日志
const DEBUG_AUDIT = process.env.DEBUG_AUDIT === 'true'

/**
 * 同步写入审计日志到数据库（fallback 模式）
 */
async function syncWriteAudit(item: AuditQueueItem): Promise<void> {
  if (!item.tenantId) return

  const prisma = getSyncPrisma()
  await prisma.audit.create({
    data: {
      tenantId: item.tenantId,
      operationType: item.operationType,
      entityType: item.entityType,
      entityId: item.entityId,
      entityName: item.entityName,
      oldData: item.oldData ? JSON.parse(JSON.stringify(item.oldData)) : Prisma.JsonNull,
      newData: item.newData ? JSON.parse(JSON.stringify(item.newData)) : Prisma.JsonNull,
      changedFields: item.changedFields.length > 0 ? item.changedFields : Prisma.JsonNull,
      operatorId: item.operatorId,
      operatorName: item.operatorName,
      ipAddress: item.ipAddress,
      userAgent: item.userAgent,
      requestPath: item.requestPath,
      requestMethod: item.requestMethod,
      createdAt: new Date(item.timestamp),
    },
  })
  if (DEBUG_AUDIT) {
    console.log(`[Audit Sync] Wrote: ${item.operationType} ${item.entityType} ${item.entityId}`)
  }
}

/**
 * 推送审计日志到 Redis 队列
 * 如果 Redis 不可用或配置了同步模式，会直接写入数据库
 */
export async function pushAuditToQueue(item: AuditQueueItem): Promise<void> {
  // 同步模式：直接写入数据库
  if (useSyncMode) {
    try {
      await syncWriteAudit(item)
    } catch (error) {
      console.error('[Audit Sync] Failed to write audit log:', error)
    }
    return
  }

  // 异步模式：推送到 Redis 队列
  try {
    const redis = getQueueConnection()
    await redis.lpush(AUDIT_QUEUE_KEY, safeJsonStringify(item))
    if (DEBUG_AUDIT) {
      console.log(`[Audit Queue] Pushed: ${item.operationType} ${item.entityType} ${item.entityId}`)
    }
  } catch (error) {
    console.error('[Audit Queue] Redis failed, falling back to sync mode:', error)
    // Redis 失败时切换到同步模式
    useSyncMode = true
    try {
      await syncWriteAudit(item)
    } catch (syncError) {
      console.error('[Audit Sync] Fallback write failed:', syncError)
    }
  }
}

/**
 * 批量推送审计日志到 Redis 队列
 */
export async function pushAuditsToQueue(items: AuditQueueItem[]): Promise<void> {
  if (items.length === 0) return

  try {
    const redis = getQueueConnection()
    const pipeline = redis.pipeline()
    for (const item of items) {
      pipeline.lpush(AUDIT_QUEUE_KEY, safeJsonStringify(item))
    }
    await pipeline.exec()
  } catch (error) {
    console.error('[Audit Queue] Failed to push audit logs:', error)
  }
}

/**
 * 从队列中取出审计日志（供 Worker 使用）
 * @param batchSize 批量取出的数量
 * @param timeout 阻塞等待超时（秒），0 表示永久等待
 */
export async function popAuditsFromQueue(
  batchSize: number = 50,
  timeout: number = 5
): Promise<AuditQueueItem[]> {
  const redis = getQueueConnection()
  const items: AuditQueueItem[] = []

  // 先尝试非阻塞批量取出
  for (let i = 0; i < batchSize; i++) {
    const data = await redis.rpop(AUDIT_QUEUE_KEY)
    if (!data) break
    try {
      items.push(JSON.parse(data))
    } catch {
      console.error('[Audit Queue] Failed to parse audit log:', data)
    }
  }

  // 如果没有数据，阻塞等待
  if (items.length === 0 && timeout > 0) {
    const data = await redis.brpop(AUDIT_QUEUE_KEY, timeout)
    if (data) {
      try {
        items.push(JSON.parse(data[1]))
      } catch {
        console.error('[Audit Queue] Failed to parse audit log:', data[1])
      }
    }
  }

  return items
}

/**
 * 获取队列长度
 */
export async function getAuditQueueLength(): Promise<number> {
  const redis = getQueueConnection()
  return redis.llen(AUDIT_QUEUE_KEY)
}
