/**
 * 审计日志 Worker
 * 独立进程运行，从 Redis 队列消费审计日志并写入数据库
 *
 * 运行方式：
 * npx ts-node src/lib/queue/audit-worker.ts
 * 或
 * node dist/lib/queue/audit-worker.js
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { popAuditsFromQueue, getAuditQueueLength, AuditQueueItem } from './audit-queue'

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
const BATCH_SIZE = 50
const POLL_TIMEOUT = 5

let isRunning = true

/**
 * 批量写入审计日志到数据库
 */
async function flushAudits(items: AuditQueueItem[]): Promise<void> {
  if (items.length === 0) return

  const records = items
    .filter((item) => item.tenantId)
    .map((item) => ({
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
    }))

  if (records.length === 0) return

  try {
    await prisma.audit.createMany({
      data: records,
      skipDuplicates: true,
    })
    console.log(`[Audit Worker] Wrote ${records.length} records`)
  } catch (error) {
    console.error('[Audit Worker] Failed to write:', error)
  }
}

/**
 * Worker 主循环
 */
async function runWorker(): Promise<void> {
  console.log('[Audit Worker] Starting...')

  while (isRunning) {
    try {
      const items = await popAuditsFromQueue(BATCH_SIZE, POLL_TIMEOUT)
      await flushAudits(items)

      const queueLength = await getAuditQueueLength()
      if (queueLength > 1000) {
        console.warn(`[Audit Worker] Queue backlog: ${queueLength}`)
      }
    } catch (error) {
      console.error('[Audit Worker] Error:', error)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }

  console.log('[Audit Worker] Stopped')
}

/**
 * 优雅关闭
 */
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`[Audit Worker] Received ${signal}, shutting down...`)
  isRunning = false
  await new Promise((resolve) => setTimeout(resolve, 2000))
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

runWorker().catch((error) => {
  console.error('[Audit Worker] Fatal error:', error)
  process.exit(1)
})
