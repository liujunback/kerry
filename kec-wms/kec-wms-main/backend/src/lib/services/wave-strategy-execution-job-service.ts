import { prisma } from '@/lib/db/prisma'
import { createJob } from '@/lib/queue'
import { JOB_STATUS, JOB_TYPES } from '@/lib/queue/config'

const systemWaveExecutionUserId = '00000000-0000-0000-0000-000000000000'
const runningJobTimeoutMinutes = Math.max(
  Number(process.env.WAVE_STRATEGY_EXECUTE_TIMEOUT_MINUTES) || 120,
  1
)

export type EnqueueWaveStrategyExecutionParams = {
  tenantId: string
  strategyId: string
  strategyName: string
  warehouseId: string
  runId: string
  operatorId?: string | null
  operatorName?: string | null
}

export type EnqueueWaveStrategyExecutionResult = {
  runId: string
  jobId: string
  jobNumber: string
  status: 'PENDING' | 'PROCESSING'
}

export type ActiveWaveStrategyExecutionJob = {
  warehouseId: string
  runId: string
  jobId: string
  jobNumber: string
  status: 'PENDING' | 'PROCESSING'
}

export async function enqueueWaveStrategyExecutionJob(
  params: EnqueueWaveStrategyExecutionParams
): Promise<EnqueueWaveStrategyExecutionResult> {
  const activeTimeoutCutoff = new Date(Date.now() - runningJobTimeoutMinutes * 60 * 1000)

  await expireStaleWaveExecutionJobs(params.tenantId, activeTimeoutCutoff)

  const job = await createJob(
    {
      jobType: JOB_TYPES.WAVE_STRATEGY_EXECUTE,
      jobName: `执行波次策略：${params.strategyName}`,
      description: `异步执行波次策略 ${params.strategyName}`,
      priority: 5,
      attempts: 1,
      warehouseId: params.warehouseId,
      inputData: {
        runId: params.runId,
        strategyId: params.strategyId,
        warehouseId: params.warehouseId,
        operatorName: params.operatorName || null,
      },
    },
    params.tenantId,
    params.operatorId || systemWaveExecutionUserId
  )

  return {
    runId: params.runId,
    jobId: job.id,
    jobNumber: job.jobNumber,
    status: 'PENDING',
  }
}

export async function findWaveStrategyExecutionJobByRunId(
  tenantId: string,
  runId: string
): Promise<EnqueueWaveStrategyExecutionResult | null> {
  const jobs = await prisma.backgroundJob.findMany({
    where: {
      tenantId,
      jobType: JOB_TYPES.WAVE_STRATEGY_EXECUTE,
      status: { in: [JOB_STATUS.PENDING, JOB_STATUS.PROCESSING] },
    },
    select: {
      id: true,
      jobNumber: true,
      status: true,
      inputData: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const job = jobs.find((item) => (
    item.inputData
    && typeof item.inputData === 'object'
    && !Array.isArray(item.inputData)
    && (item.inputData as Record<string, unknown>).runId === runId
  ))

  if (!job) return null

  return {
    runId,
    jobId: job.id,
    jobNumber: job.jobNumber,
    status: job.status === JOB_STATUS.PROCESSING ? 'PROCESSING' : 'PENDING',
  }
}

export async function findActiveWaveStrategyExecutionJobsByWarehouses(
  tenantId: string,
  warehouseIds: string[]
): Promise<Map<string, ActiveWaveStrategyExecutionJob>> {
  const dedupedWarehouseIds = Array.from(new Set(warehouseIds.filter(Boolean)))
  if (dedupedWarehouseIds.length === 0) {
    return new Map()
  }

  const activeTimeoutCutoff = new Date(Date.now() - runningJobTimeoutMinutes * 60 * 1000)
  await expireStaleWaveExecutionJobs(tenantId, activeTimeoutCutoff)

  const jobs = await prisma.backgroundJob.findMany({
    where: {
      tenantId,
      jobType: JOB_TYPES.WAVE_STRATEGY_EXECUTE,
      warehouseId: { in: dedupedWarehouseIds },
      status: { in: [JOB_STATUS.PENDING, JOB_STATUS.PROCESSING] },
    },
    select: {
      id: true,
      jobNumber: true,
      status: true,
      warehouseId: true,
      inputData: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = new Map<string, ActiveWaveStrategyExecutionJob>()
  for (const job of jobs) {
    if (!job.warehouseId || result.has(job.warehouseId)) continue
    if (!job.inputData || typeof job.inputData !== 'object' || Array.isArray(job.inputData)) continue
    const runId = (job.inputData as Record<string, unknown>).runId
    if (typeof runId !== 'string') continue

    result.set(job.warehouseId, {
      warehouseId: job.warehouseId,
      runId,
      jobId: job.id,
      jobNumber: job.jobNumber,
      status: job.status === JOB_STATUS.PROCESSING ? 'PROCESSING' : 'PENDING',
    })
  }

  return result
}

async function expireStaleWaveExecutionJobs(tenantId: string, cutoff: Date) {
  const staleJobs = await prisma.backgroundJob.findMany({
    where: {
      tenantId,
      jobType: JOB_TYPES.WAVE_STRATEGY_EXECUTE,
      status: { in: [JOB_STATUS.PENDING, JOB_STATUS.PROCESSING] },
      createdAt: { lte: cutoff },
    },
    select: {
      id: true,
      inputData: true,
    },
  })

  if (staleJobs.length === 0) {
    return
  }

  const runIds = staleJobs
    .map((job) => {
      if (!job.inputData || typeof job.inputData !== 'object' || Array.isArray(job.inputData)) {
        return null
      }
      const runId = (job.inputData as Record<string, unknown>).runId
      return typeof runId === 'string' ? runId : null
    })
    .filter((value): value is string => Boolean(value))

  await prisma.backgroundJob.updateMany({
    where: {
      id: { in: staleJobs.map((job) => job.id) },
    },
    data: {
      status: JOB_STATUS.FAILED,
      errorMessage: '波次策略执行超时，系统自动释放执行锁',
      completedAt: new Date(),
    },
  })

  if (runIds.length > 0) {
    await prisma.waveStrategyRun.updateMany({
      where: {
        id: { in: runIds },
        tenantId,
        runStatus: 'RUNNING',
      },
      data: {
        runStatus: 'FAILED',
        errorMessage: '波次策略执行超时，系统自动释放执行锁',
        finishedAt: new Date(),
      },
    })
  }
}
