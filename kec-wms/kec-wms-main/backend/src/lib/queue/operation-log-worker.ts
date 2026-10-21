/**
 * 操作日志 Worker（状态机日志）
 * 独立进程运行，从 Redis 队列消费操作日志并写入数据库
 *
 * 运行方式：
 * npx ts-node src/lib/queue/operation-log-worker.ts
 * 或
 * node dist/lib/queue/operation-log-worker.js
 */

import { PrismaClient } from '@prisma/client'
import { popOperationLogsFromQueue, getOperationLogQueueLength, OperationLogQueueItem } from './operation-log-queue'

// Worker 专用的 Prisma 客户端（独立连接池）
const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Worker 配置
const BATCH_SIZE = 100 // 操作日志量大，批量更多
const POLL_TIMEOUT = 5

let isRunning = true

/**
 * 批量写入操作日志到数据库
 */
async function flushOperationLogs(items: OperationLogQueueItem[]): Promise<void> {
  if (items.length === 0) return

  const records = items
    .filter((item) => item.tenantId)
    .map((item) => ({
      tenantId: item.tenantId,
      entityType: item.entityType,
      entityId: item.entityId,
      entityNumber: item.entityNumber,
      operationType: item.operationType,
      operationName: item.operationName,
      beforeStatus: item.beforeStatus,
      afterStatus: item.afterStatus,
      operatorId: item.operatorId,
      operatorName: item.operatorName,
      createdAt: new Date(item.timestamp),
    }))

  if (records.length === 0) return

  try {
    await prisma.operationLog.createMany({
      data: records,
      skipDuplicates: true,
    })
    console.log(`[Operation Log Worker] Wrote ${records.length} records`)
  } catch (error) {
    console.error('[Operation Log Worker] Failed to write:', error)
  }
}

/**
 * Worker 主循环
 */
async function runWorker(): Promise<void> {
  console.log('[Operation Log Worker] Starting...')

  while (isRunning) {
    try {
      const items = await popOperationLogsFromQueue(BATCH_SIZE, POLL_TIMEOUT)
      await flushOperationLogs(items)

      const queueLength = await getOperationLogQueueLength()
      if (queueLength > 1000) {
        console.warn(`[Operation Log Worker] Queue backlog: ${queueLength}`)
      }
    } catch (error) {
      console.error('[Operation Log Worker] Error:', error)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  console.log('[Operation Log Worker] Stopped')
}

/**
 * 优雅关闭
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`[Operation Log Worker] Received ${signal}, shutting down...`)
  isRunning = false
  await new Promise((resolve) => setTimeout(resolve, 2000))
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

runWorker().catch((error) => {
  console.error('[Operation Log Worker] Fatal error:', error)
  process.exit(1)
})
