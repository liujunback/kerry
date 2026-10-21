import { prisma } from '@/lib/db/prisma'
import { createJob, JOB_STATUS, JOB_TYPES } from '@/lib/queue'
import type { ProgressUpdate, WaveReleaseResult } from '@/lib/queue/types'
import { releaseWave } from '@/lib/services/wave-release-service'

const systemWaveReleaseUserId = '00000000-0000-0000-0000-000000000000'
const defaultReleaseBatchSize = Math.max(
  Number(process.env.WAVE_RELEASE_BATCH_SIZE) || 10,
  1
)

function chunkArray<T>(items: T[], size: number) {
  if (items.length === 0) return [] as T[][]
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

class WaveReleaseJobFailedError extends Error {
  jobResultData: Record<string, unknown>

  constructor(result: WaveReleaseResult) {
    super(
      `波次释放任务存在失败波次：${result.failedWaves.length}/${result.failedWaves.length + result.releasedWaveCount}`
    )
    this.name = 'WaveReleaseJobFailedError'
    this.jobResultData = result as unknown as Record<string, unknown>
  }
}

export async function enqueueWaveReleaseJobs(params: {
  tenantId: string
  warehouseId: string
  runId: string
  strategyName: string
  waveIds: string[]
  operatorId?: string | null
  operatorName?: string | null
}) {
  const waveIds = Array.from(new Set(params.waveIds.filter(Boolean)))
  if (waveIds.length === 0) {
    return []
  }

  const batches = chunkArray(waveIds, defaultReleaseBatchSize)
  const jobs = []
  for (let index = 0; index < batches.length; index += 1) {
    const job = await createJob(
      {
        jobType: JOB_TYPES.WAVE_RELEASE,
        jobName: `释放波次：${params.strategyName}（第 ${index + 1}/${batches.length} 批）`,
        description: `异步释放波次策略运行 ${params.runId} 的波次`,
        priority: 5,
        attempts: 1,
        warehouseId: params.warehouseId,
        inputData: {
          runId: params.runId,
          warehouseId: params.warehouseId,
          waveIds: batches[index],
          operatorId: params.operatorId || null,
          operatorName: params.operatorName || null,
        },
      },
      params.tenantId,
      params.operatorId || systemWaveReleaseUserId
    )

    jobs.push({
      id: job.id,
      jobNumber: job.jobNumber,
      waveIds: batches[index],
    })
  }

  return jobs
}

export async function enqueuePendingImmediateWaveReleaseJobsForRun(params: {
  tenantId: string
  warehouseId: string
  runId: string
  strategyName: string
  operatorId?: string | null
  operatorName?: string | null
}) {
  const pendingWaves = await prisma.wave.findMany({
    where: {
      tenantId: params.tenantId,
      warehouseId: params.warehouseId,
      strategyRunId: params.runId,
      releaseMode: 'IMMEDIATE',
      releaseStatus: { not: 'RELEASED' },
      status: 'CREATED',
    },
    select: { id: true },
  })

  const pendingWaveIds = pendingWaves.map((wave) => wave.id)
  if (pendingWaveIds.length === 0) {
    return []
  }

  const activeJobs = await prisma.backgroundJob.findMany({
    where: {
      tenantId: params.tenantId,
      jobType: JOB_TYPES.WAVE_RELEASE,
      status: { in: [JOB_STATUS.PENDING, JOB_STATUS.PROCESSING] },
    },
    select: {
      inputData: true,
    },
  })

  const activeWaveIds = new Set<string>()
  for (const job of activeJobs) {
    if (
      !job.inputData
      || typeof job.inputData !== 'object'
      || Array.isArray(job.inputData)
    ) {
      continue
    }

    const input = job.inputData as Record<string, unknown>
    if (input.runId !== params.runId || !Array.isArray(input.waveIds)) {
      continue
    }

    for (const waveId of input.waveIds) {
      if (typeof waveId === 'string') {
        activeWaveIds.add(waveId)
      }
    }
  }

  const waveIdsToEnqueue = pendingWaveIds.filter((waveId) => (
    !activeWaveIds.has(waveId)
  ))
  if (waveIdsToEnqueue.length === 0) {
    return []
  }

  return enqueueWaveReleaseJobs({
    ...params,
    waveIds: waveIdsToEnqueue,
  })
}

export async function processWaveReleaseJob(params: {
  tenantId: string
  runId: string
  waveIds: string[]
  operatorId?: string | null
  operatorName?: string | null
  onProgress?: (update: ProgressUpdate) => Promise<void>
}) {
  const waveIds = Array.from(new Set(params.waveIds.filter(Boolean)))
  let createdPickOrderCount = 0
  let releasedWaveCount = 0
  const failedWaveIds: string[] = []
  const failedWaves: WaveReleaseResult['failedWaves'] = []

  for (let index = 0; index < waveIds.length; index += 1) {
    const waveId = waveIds[index]
    try {
      const result = await releaseWave({
        tenantId: params.tenantId,
        waveId,
        operatorId: params.operatorId,
        operatorName: params.operatorName,
      })
      createdPickOrderCount += result.pickOrders.length
      releasedWaveCount += 1
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知释放错误'
      const errorStack = error instanceof Error ? error.stack : undefined
      failedWaveIds.push(waveId)
      failedWaves.push({
        waveId,
        errorMessage,
        ...(errorStack ? { errorStack } : {}),
      })
      console.error('异步释放波次失败:', waveId, error)
    }

    if (params.onProgress) {
      await params.onProgress({
        progress: Math.min(
          95,
          Math.round(((index + 1) / waveIds.length) * 100)
        ),
        message: `正在释放波次，第 ${index + 1}/${waveIds.length} 个`,
        totalCount: waveIds.length,
        processedCount: index + 1,
        successCount: releasedWaveCount,
        failedCount: failedWaveIds.length,
      })
    }
  }

  await prisma.waveStrategyRun.update({
    where: { id: params.runId },
    data: {
      createdPickOrderCount: {
        increment: createdPickOrderCount,
      },
    },
  })

  const result: WaveReleaseResult = {
    runId: params.runId,
    releasedWaveCount,
    createdPickOrderCount,
    failedWaveIds,
    failedWaves,
  }

  if (failedWaves.length > 0) {
    throw new WaveReleaseJobFailedError(result)
  }

  return result
}
