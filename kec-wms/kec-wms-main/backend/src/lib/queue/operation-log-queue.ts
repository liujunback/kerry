/**
 * 操作日志 Redis 队列
 * 状态机的操作日志通过 Redis 队列异步写入
 * 减少主进程的数据库连接压力
 *
 * 环境变量：
 * - OPERATION_LOG_ENABLED=true 启用操作日志（默认禁用）
 */

import { getQueueConnection } from './connection'
import { OperationEntityType } from '@/lib/constants/operation-types'

// 队列键名
const OPERATION_LOG_QUEUE_KEY = 'operation-log:queue'

// 是否启用操作日志
const isEnabled = () => process.env.OPERATION_LOG_ENABLED === 'true'

// 操作日志数据结构
export interface OperationLogQueueItem {
  tenantId: string
  entityType: OperationEntityType
  entityId: string
  entityNumber: string
  operationType: string
  operationName: string
  beforeStatus: string
  afterStatus: string
  operatorId: string
  operatorName?: string
  timestamp: string
}

/**
 * 推送操作日志到 Redis 队列
 */
export async function pushOperationLogToQueue(item: OperationLogQueueItem): Promise<void> {
  if (!isEnabled()) return

  try {
    const redis = getQueueConnection()
    await redis.lpush(OPERATION_LOG_QUEUE_KEY, JSON.stringify(item))
  } catch (error) {
    console.error('[Operation Log Queue] Failed to push:', error)
  }
}

/**
 * 从队列中取出操作日志（供 Worker 使用）
 */
export async function popOperationLogsFromQueue(
  batchSize: number = 50,
  timeout: number = 5
): Promise<OperationLogQueueItem[]> {
  const redis = getQueueConnection()
  const items: OperationLogQueueItem[] = []

  // 非阻塞批量取出
  for (let i = 0; i < batchSize; i++) {
    const data = await redis.rpop(OPERATION_LOG_QUEUE_KEY)
    if (!data) break
    try {
      items.push(JSON.parse(data))
    } catch {
      console.error('[Operation Log Queue] Failed to parse:', data)
    }
  }

  // 如果没有数据，阻塞等待
  if (items.length === 0 && timeout > 0) {
    const data = await redis.brpop(OPERATION_LOG_QUEUE_KEY, timeout)
    if (data) {
      try {
        items.push(JSON.parse(data[1]))
      } catch {
        console.error('[Operation Log Queue] Failed to parse:', data[1])
      }
    }
  }

  return items
}

/**
 * 获取队列长度
 */
export async function getOperationLogQueueLength(): Promise<number> {
  const redis = getQueueConnection()
  return redis.llen(OPERATION_LOG_QUEUE_KEY)
}
