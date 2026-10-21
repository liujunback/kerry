import { prisma } from '@/lib/db/prisma'
import type { OperationEntityType } from '@/lib/constants/operation-types'

// 记录操作日志的参数
export interface LogOperationParams {
  tenantId: string
  entityType: OperationEntityType
  entityId: string
  entityNumber: string
  operationType: string
  operationName: string
  beforeStatus?: string
  afterStatus?: string
  remark?: string
  operatorId?: string
  operatorName?: string
  metadata?: Record<string, unknown>
}

// 查询参数
export interface QueryOperationLogsParams {
  tenantId: string
  entityType?: OperationEntityType
  entityId?: string
  operationType?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}

class OperationLogService {
  /**
   * 记录操作日志
   */
  async logOperation(params: LogOperationParams): Promise<void> {
    try {
      await prisma.operationLog.create({
        data: {
          tenantId: params.tenantId,
          entityType: params.entityType,
          entityId: params.entityId,
          entityNumber: params.entityNumber,
          operationType: params.operationType,
          operationName: params.operationName,
          beforeStatus: params.beforeStatus,
          afterStatus: params.afterStatus,
          remark: params.remark,
          operatorId: params.operatorId,
          operatorName: params.operatorName,
          metadata: params.metadata as object | undefined,
        },
      })
    } catch (error) {
      // 日志记录失败不应影响主业务
      console.error('[OperationLog] Failed to log operation:', error)
    }
  }

  /**
   * 查询实体的操作历史
   */
  async getEntityOperationLogs(
    tenantId: string,
    entityType: OperationEntityType,
    entityId: string
  ) {
    return prisma.operationLog.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  /**
   * 分页查询操作日志
   */
  async queryOperationLogs(params: QueryOperationLogsParams) {
    const {
      tenantId,
      entityType,
      entityId,
      operationType,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = params

    const where: Record<string, unknown> = { tenantId }

    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (operationType) where.operationType = operationType
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate
    }

    const [logs, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.operationLog.count({ where }),
    ])

    return {
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }
}

export const operationLogService = new OperationLogService()
