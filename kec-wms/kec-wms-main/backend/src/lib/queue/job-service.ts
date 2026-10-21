/**
 * 任务服务 - 任务 CRUD 操作
 */

import { Prisma } from '@prisma/client'
import { prisma, prismaRead } from '@/lib/db/prisma'
import { getQueue } from './queues'
import {
  QUEUE_NAMES,
  JOB_TYPES,
  JOB_STATUS,
  JobType,
  QueueName,
  DataUploadSubType,
} from './config'
import { CreateJobRequest, JobQueryParams } from './types'
import { generateJobNumber } from './utils/job-number-generator'

const JOB_NUMBER_CREATE_MAX_RETRIES = 5
const JOB_QUEUE_ADD_MAX_RETRIES = 5

function isJobNumberConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false
  }

  const target = error.meta?.target
  if (Array.isArray(target)) {
    return target.includes('jobNumber') || target.includes('tenantId')
  }

  if (typeof target === 'string') {
    return target.includes('job_number') || target.includes('background_job')
  }

  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 根据任务类型获取队列名称
 */
function getQueueNameByJobType(jobType: JobType): QueueName {
  switch (jobType) {
    case JOB_TYPES.INVENTORY_ALLOCATION:
      return QUEUE_NAMES.INVENTORY_ALLOCATION
    case JOB_TYPES.INVENTORY_COUNT_SCOPE:
      return QUEUE_NAMES.INVENTORY_COUNT_SCOPE
    case JOB_TYPES.WAVE_STRATEGY_EXECUTE:
      return QUEUE_NAMES.WAVE_STRATEGY_EXECUTE
    case JOB_TYPES.WAVE_RELEASE:
      return QUEUE_NAMES.WAVE_RELEASE
    case JOB_TYPES.REPORT_EXPORT:
      return QUEUE_NAMES.REPORT_EXPORT
    case JOB_TYPES.DATA_UPLOAD:
      return QUEUE_NAMES.DATA_UPLOAD
    case JOB_TYPES.SHIPMENT_STATUS_PUSH:
      return QUEUE_NAMES.SHIPMENT_STATUS_PUSH
    case JOB_TYPES.INVENTORY_EVENT_PUSH:
      return QUEUE_NAMES.INVENTORY_EVENT_PUSH
    default:
      throw new Error(`未知的任务类型: ${jobType}`)
  }
}

/**
 * 创建任务
 */
export async function createJob(
  request: CreateJobRequest,
  tenantId: string,
  userId: string
): Promise<{ id: string; jobNumber: string }> {
  let job: Awaited<ReturnType<typeof prisma.backgroundJob.create>> | null = null
  for (let attempt = 0; attempt < JOB_NUMBER_CREATE_MAX_RETRIES; attempt++) {
    const jobNumber = await generateJobNumber(tenantId)

    try {
      job = await prisma.backgroundJob.create({
        data: {
          tenantId,
          jobNumber,
          jobType: request.jobType,
          jobSubType: request.jobSubType,
          jobName: request.jobName,
          description: request.description,
          priority: request.priority || 5,
          inputData: request.inputData as object,
          warehouseId: request.warehouseId,
          clientId: request.clientId,
          scheduledAt: request.scheduledAt,
          status: JOB_STATUS.PENDING,
          createdBy: userId,
        },
      })
      break
    } catch (error) {
      if (!isJobNumberConflict(error) || attempt === JOB_NUMBER_CREATE_MAX_RETRIES - 1) {
        throw error
      }

      await sleep(20 * (attempt + 1))
    }
  }

  if (!job) {
    throw new Error('创建后台任务失败：任务编号重试耗尽')
  }

  // 获取对应的队列
  const queueName = getQueueNameByJobType(request.jobType)
  const queue = getQueue(queueName)

  let bullJob: Awaited<ReturnType<typeof queue.add>> | null = null
  let lastQueueError: unknown
  for (let attempt = 0; attempt < JOB_QUEUE_ADD_MAX_RETRIES; attempt++) {
    try {
      bullJob = await queue.add(
        request.jobType,
        {
          tenantId,
          userId,
          jobId: job.id,
          ...request.inputData,
        },
        {
          priority: request.priority || 5,
          attempts: request.attempts,
          delay: request.scheduledAt
            ? new Date(request.scheduledAt).getTime() - Date.now()
            : undefined,
        }
      )
      break
    } catch (error) {
      lastQueueError = error
      if (attempt === JOB_QUEUE_ADD_MAX_RETRIES - 1) {
        break
      }

      await sleep(100 * (attempt + 1))
    }
  }

  if (!bullJob) {
    const errorMessage =
      lastQueueError instanceof Error ? lastQueueError.message : '未知队列错误'

    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: JOB_STATUS.FAILED,
        completedAt: new Date(),
        errorMessage: `加入 BullMQ 队列失败: ${errorMessage}`,
      },
    })

    throw lastQueueError instanceof Error
      ? lastQueueError
      : new Error('加入 BullMQ 队列失败')
  }

  // 更新 BullMQ 任务 ID
  await prisma.backgroundJob.update({
    where: { id: job.id },
    data: { bullJobId: bullJob.id },
  })

  return { id: job.id, jobNumber: job.jobNumber }
}

/**
 * 获取任务详情
 */
export async function getJob(jobId: string, tenantId: string) {
  return prismaRead.backgroundJob.findFirst({
    where: { id: jobId, tenantId },
  })
}

/**
 * 查询任务列表
 */
export async function listJobs(params: JobQueryParams) {
  const {
    tenantId,
    jobType,
    status,
    warehouseId,
    clientId,
    createdBy,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
  } = params

  const where: Record<string, unknown> = { tenantId }

  if (jobType) where.jobType = jobType
  if (status) where.status = status
  if (warehouseId) where.warehouseId = warehouseId
  if (clientId) where.clientId = clientId
  if (createdBy) where.createdBy = createdBy

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate
  }

  const [total, items] = await Promise.all([
    prismaRead.backgroundJob.count({ where }),
    prismaRead.backgroundJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * 取消任务
 */
export async function cancelJob(
  jobId: string,
  tenantId: string
): Promise<boolean> {
  const job = await prisma.backgroundJob.findFirst({
    where: { id: jobId, tenantId },
  })

  if (!job) {
    throw new Error('任务不存在')
  }

  if (job.status !== JOB_STATUS.PENDING) {
    throw new Error('只能取消待处理的任务')
  }

  // 从队列中移除
  if (job.bullJobId) {
    const queueName = getQueueNameByJobType(job.jobType as JobType)
    const queue = getQueue(queueName)
    const bullJob = await queue.getJob(job.bullJobId)
    if (bullJob) {
      await bullJob.remove()
    }
  }

  // 更新状态
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: JOB_STATUS.CANCELLED,
      completedAt: new Date(),
    },
  })

  return true
}

/**
 * 重试任务
 */
export async function retryJob(
  jobId: string,
  tenantId: string,
  userId: string
): Promise<{ id: string; jobNumber: string }> {
  const job = await prisma.backgroundJob.findFirst({
    where: { id: jobId, tenantId },
  })

  if (!job) {
    throw new Error('任务不存在')
  }

  if (job.status !== JOB_STATUS.FAILED) {
    throw new Error('只能重试失败的任务')
  }

  // 创建新任务
  return createJob(
    {
      jobType: job.jobType as JobType,
      jobSubType: job.jobSubType as DataUploadSubType | undefined,
      jobName: `${job.jobName} (重试)`,
      description: job.description || undefined,
      priority: job.priority,
      inputData: job.inputData as Record<string, unknown>,
      warehouseId: job.warehouseId || undefined,
      clientId: job.clientId || undefined,
    },
    tenantId,
    userId
  )
}
