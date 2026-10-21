import { Job } from 'bullmq'
import { BaseWorker } from './base-worker'
import {
  JobContext,
  WaveReleaseJobData,
  WaveReleaseResult,
} from '../types'
import type { AuditContext } from '@/lib/db/audit-extension'
import { processWaveReleaseJob } from '@/lib/services/wave-release-job-service'

export class WaveReleaseWorker extends BaseWorker<
  WaveReleaseJobData,
  WaveReleaseResult
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
    job: Job<WaveReleaseJobData, WaveReleaseResult>,
    context: JobContext
  ): Promise<WaveReleaseResult> {
    await this.updateProgress(context.jobId, {
      progress: 5,
      message: '准备释放波次...',
    })

    return processWaveReleaseJob({
      tenantId: context.tenantId,
      runId: job.data.runId,
      waveIds: job.data.waveIds,
      operatorId: job.data.operatorId || context.userId,
      operatorName: job.data.operatorName,
      onProgress: async (update) => this.updateProgress(context.jobId, update),
    })
  }
}
