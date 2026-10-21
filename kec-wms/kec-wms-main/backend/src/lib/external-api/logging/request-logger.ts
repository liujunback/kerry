/**
 * 请求日志记录器
 */

import type { RequestLog } from '../types'
import { Log } from '@/lib/logger'

export class RequestLogger {
  private systemId: string
  private persistToDb: boolean

  constructor(systemId: string, persistToDb: boolean = false) {
    this.systemId = systemId
    this.persistToDb = persistToDb
  }

  /** 记录请求日志 */
  async log(logEntry: RequestLog): Promise<void> {
    const ctx = {
      type: 'external-api-request',
      target_system: logEntry.targetSystem,
      request_id: logEntry.requestId,
      method: logEntry.method,
      url: logEntry.url,
      status_code: logEntry.statusCode,
      duration_ms: logEntry.duration,
      retry_count: logEntry.retryCount,
      tags: logEntry.tags,
    }

    const message = `[${logEntry.targetSystem}] ${logEntry.method} ${logEntry.url} ${logEntry.statusCode ?? '-'} ${logEntry.duration}ms`

    if (logEntry.error) {
      Log.channel('file-external-api').error(message, { ...ctx, error_detail: logEntry.error })
    } else {
      Log.channel('file-external-api').info(message, ctx)
    }

    // 可选: 持久化到数据库
    if (this.persistToDb) {
      await this.persistLog(logEntry)
    }
  }

  /** 持久化日志到数据库 */
  private async persistLog(logEntry: RequestLog): Promise<void> {
    void logEntry

    try {
      // const { prisma } = await import('@/lib/db/prisma')
      // await prisma.externalApiLog.create({ data: { ... } })
    } catch (error) {
      Log.error('[RequestLogger] Failed to persist log', { error })
    }
  }

  /** 批量记录日志 */
  async logBatch(entries: RequestLog[]): Promise<void> {
    await Promise.all(entries.map((entry) => this.log(entry)))
  }
}
