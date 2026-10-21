import { prisma } from '@/lib/db/prisma'
import { createJob } from '@/lib/queue'
import { JOB_STATUS, JOB_TYPES } from '@/lib/queue/config'
import type { AuthUser } from '@/lib/auth/middleware'

const enqueueAllowedStatuses = ['DRAFT', 'PENDING_SCOPE', 'SCOPE_FAILED']

export async function enqueueInventoryCountScopeJob(
  authUser: AuthUser,
  orderId: string,
  warehouseId?: string
) {
  const order = await prisma.inventoryCountOrder.findFirst({
    where: {
      id: orderId,
      tenantId: authUser.tenantId,
      ...(warehouseId ? { warehouseId } : {}),
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      warehouseId: true,
    },
  })

  if (!order) {
    throw new Error('盘点单不存在')
  }

  const runningJobs = await prisma.backgroundJob.findMany({
    where: {
      tenantId: authUser.tenantId,
      jobType: JOB_TYPES.INVENTORY_COUNT_SCOPE,
      status: {
        in: [JOB_STATUS.PENDING, JOB_STATUS.PROCESSING],
      },
    },
    select: {
      id: true,
      jobNumber: true,
      inputData: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
  const runningJob = runningJobs.find((job) => (
    job.inputData
    && typeof job.inputData === 'object'
    && !Array.isArray(job.inputData)
    && (job.inputData as Record<string, unknown>).orderId === order.id
  ))

  if (runningJob) {
    return {
      jobId: runningJob.id,
      jobNumber: runningJob.jobNumber,
    }
  }

  if (!enqueueAllowedStatuses.includes(order.status)) {
    throw new Error(`当前盘点单状态不允许生成范围：${order.status}`)
  }

  const updated = await prisma.inventoryCountOrder.updateMany({
    where: {
      id: order.id,
      tenantId: authUser.tenantId,
      status: {
        in: enqueueAllowedStatuses,
      },
    },
    data: {
      status: 'GENERATING_SCOPE',
      updatedBy: authUser.id,
    },
  })

  if (updated.count === 0) {
    throw new Error('盘点范围生成任务已提交或当前状态不允许生成')
  }

  try {
    const job = await createJob(
      {
        jobType: JOB_TYPES.INVENTORY_COUNT_SCOPE,
        jobName: `生成盘点范围：${order.orderNumber}`,
        description: `异步生成盘点单 ${order.orderNumber} 的范围、批次和明细`,
        priority: 5,
        warehouseId: order.warehouseId,
        inputData: {
          orderId: order.id,
          warehouseId: order.warehouseId,
        },
      },
      authUser.tenantId,
      authUser.id
    )

    return {
      jobId: job.id,
      jobNumber: job.jobNumber,
    }
  } catch (error) {
    await prisma.inventoryCountOrder.updateMany({
      where: {
        id: order.id,
        tenantId: authUser.tenantId,
        status: 'GENERATING_SCOPE',
      },
      data: {
        status: 'SCOPE_FAILED',
        updatedBy: authUser.id,
      },
    })
    throw error
  }
}
