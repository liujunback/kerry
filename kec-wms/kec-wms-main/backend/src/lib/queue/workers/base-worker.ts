/**
 * 基础 Worker 类
 */

import { Worker, Job } from 'bullmq'
import { createQueueConnection } from '../connection'
import { prisma } from '@/lib/db/prisma'
import {
  withWorkerAuditContext,
  type AuditContext,
} from '@/lib/db/audit-extension'
import { JOB_STATUS } from '../config'
import { JobContext, ProgressUpdate } from '../types'

type JobErrorWithResultData = Error & {
  jobResultData?: Record<string, unknown>
}

export abstract class BaseWorker<TData, TResult> {
  protected worker: Worker<TData, TResult>

  constructor(
    protected queueName: string,
    protected concurrency: number = 1
  ) {
    this.worker = new Worker<TData, TResult>(
      queueName,
      async (job) => this.processJob(job),
      {
        connection: createQueueConnection(),
        concurrency,
      }
    )

    this.setupEventHandlers()
  }

  /**
   * 子类实现具体的任务处理逻辑
   */
  protected abstract process(
    job: Job<TData, TResult>,
    context: JobContext
  ): Promise<TResult>

  protected buildAuditContext(context: JobContext): AuditContext {
    return {
      tenantId: context.tenantId,
      operatorId: context.userId,
      operatorName: 'System Worker',
      requestPath: `worker:${this.queueName}`,
      requestMethod: 'JOB',
    }
  }

  /**
   * 处理任务
   */
  private async processJob(job: Job<TData, TResult>): Promise<TResult> {
    const { tenantId, userId, jobId } = job.data as unknown as JobContext

    // 更新任务状态为处理中（仅当有 backgroundJob 记录时）
    if (jobId) {
      await this.updateJobStatus(jobId, JOB_STATUS.PROCESSING, {
        startedAt: new Date(),
      })
    }

    // 在审计上下文中执行任务
    return withWorkerAuditContext(
      this.buildAuditContext({ tenantId, userId, jobId }),
      async () => {
        try {
          const result = await this.process(job, { tenantId, userId, jobId })

          // 更新任务状态为已完成
          if (jobId) {
            await this.updateJobStatus(jobId, JOB_STATUS.COMPLETED, {
              completedAt: new Date(),
              progress: 100,
              resultData: result as unknown as Record<string, unknown>,
            })
          }

          return result
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          const errorStack = error instanceof Error ? error.stack : undefined
          const resultData = error instanceof Error
            ? (error as JobErrorWithResultData).jobResultData
            : undefined

          // 更新任务状态为失败
          if (jobId) {
            await this.updateJobStatus(jobId, JOB_STATUS.FAILED, {
              completedAt: new Date(),
              errorMessage,
              errorStack,
              ...(resultData ? { resultData } : {}),
              retryCount: { increment: 1 },
            })
          }

          throw error
        }
      }
    )
  }

  /**
   * 更新任务进度
   */
  protected async updateProgress(
    jobId: string,
    update: ProgressUpdate
  ): Promise<void> {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        progress: update.progress,
        progressMessage: update.message,
        processedCount: update.processedCount,
        totalCount: update.totalCount,
        successCount: update.successCount,
        failedCount: update.failedCount,
      },
    })
  }

  /**
   * 更新任务状态
   */
  private async updateJobStatus(
    jobId: string,
    status: string,
    data: Record<string, unknown> = {}
  ): Promise<void> {
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status,
        ...data,
      },
    })
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`[${this.queueName}] 任务 ${job.id} 完成`)
    })

    this.worker.on('failed', (job, error) => {
      console.error(`[${this.queueName}] 任务 ${job?.id} 失败:`, error)
    })

    this.worker.on('error', (error) => {
      console.error(`[${this.queueName}] Worker 错误:`, error)
    })
  }

  /**
   * 关闭 Worker
   */
  async close(): Promise<void> {
    await this.worker.close()
  }
}
