import { Job } from 'bullmq'
import { BaseWorker } from './base-worker'
import {
  JobContext,
  WaveStrategyExecuteJobData,
  WaveStrategyExecuteResult,
} from '../types'
import type { AuditContext } from '@/lib/db/audit-extension'
import { processQueuedWaveStrategyRun } from '@/lib/services/wave-engine-service'

export class WaveStrategyExecuteWorker extends BaseWorker<
  WaveStrategyExecuteJobData,
  WaveStrategyExecuteResult
> {
  protected buildAuditContext(context: JobContext): AuditContext {
    return {
      tenantId: context.tenantId,
      operatorId: context.userId,
      operatorName: 'System Worker',
      requestPath: `worker:${this.queueName}`,
      requestMethod: 'JOB',
      disableEntityAudit: true,
    }
  }

  protected async process(
    job: Job<WaveStrategyExecuteJobData, WaveStrategyExecuteResult>,
    context: JobContext
  ): Promise<WaveStrategyExecuteResult> {
    await this.updateProgress(context.jobId, {
      progress: 5,
      message: '准备执行波次策略...',
    })

    return processQueuedWaveStrategyRun({
      tenantId: context.tenantId,
      userId: context.userId,
      runId: job.data.runId,
      operatorName: job.data.operatorName,
      onProgress: async (update) => this.updateProgress(context.jobId, update),
    })
  }
}
