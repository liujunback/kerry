import { prisma } from '@/lib/db/prisma'
import { OperationEntityType } from '@/lib/constants/operation-types'
import { pushOperationLogToQueue, OperationLogQueueItem } from '@/lib/queue/operation-log-queue'

// 是否使用 Redis 队列（推荐生产环境使用）
const USE_REDIS_QUEUE = process.env.OPERATION_LOG_USE_REDIS_QUEUE === 'true'

// 操作上下文
export interface OperatorContext {
  tenantId: string
  userId: string
  userName?: string
}

// 锁策略
export type LockStrategy = 'pessimistic' | 'optimistic' | 'none'

// 状态转换配置
export interface TransitionConfig<TStatus extends string> {
  from: TStatus[]
  to: TStatus
  operationType: string
  operationName: string
}

// 状态变更回调参数
export interface StatusChangeEvent<TStatus extends string> {
  entityType: OperationEntityType
  entityId: string
  entityNumber: string
  previousStatus: TStatus
  newStatus: TStatus
  action: string
  ctx: OperatorContext
}

// 实体配置
export interface EntityConfig<TStatus extends string, TAction extends string> {
  entityType: OperationEntityType
  tableName: string // Prisma model 名（如 Asn）
  dbTableName: string // 数据库实际表名（如 asn）
  numberField: string
  dbNumberField: string // 数据库实际字段名（如 asn_number）
  transitions: Record<TAction, TransitionConfig<TStatus>>
  /**
   * 锁策略：
   * - pessimistic: 悲观锁（SELECT FOR UPDATE），适合低并发场景
   * - optimistic: 乐观锁（版本检查），适合高并发场景
   * - none: 无锁，适合状态变更不频繁且可接受最终一致性的场景
   */
  lockStrategy?: LockStrategy
  /**
   * 状态变更后的回调（可选）
   * 用于推送通知、触发后续流程等
   */
  onStatusChange?: (event: StatusChangeEvent<TStatus>) => void | Promise<void>
}

// 状态机结果
export interface TransitionResult<TStatus> {
  success: boolean
  previousStatus: TStatus
  newStatus: TStatus
}

/**
 * 通用状态机类
 * 支持不同实体类型的状态管理和不同的锁策略
 */
export class StateMachine<TStatus extends string, TAction extends string> {
  private lockStrategy: LockStrategy

  constructor(private config: EntityConfig<TStatus, TAction>) {
    this.lockStrategy = config.lockStrategy || 'pessimistic'
  }

  /**
   * 执行状态转换
   */
  async transition(
    entityId: string,
    action: TAction,
    ctx: OperatorContext,
    additionalData?: Record<string, unknown>
  ): Promise<TransitionResult<TStatus>> {
    const transitionConfig = this.config.transitions[action]

    if (!transitionConfig) {
      throw new Error(`未知的操作类型: ${action}`)
    }

    if (this.lockStrategy === 'optimistic') {
      return this.transitionWithOptimisticLock(entityId, action, transitionConfig, ctx, additionalData)
    } else if (this.lockStrategy === 'pessimistic') {
      return this.transitionWithPessimisticLock(entityId, action, transitionConfig, ctx, additionalData)
    } else {
      return this.transitionWithoutLock(entityId, action, transitionConfig, ctx, additionalData)
    }
  }

  /**
   * 悲观锁方式（SELECT FOR UPDATE）
   * 适合：低并发、需要强一致性的场景（如 ASN）
   */
  private async transitionWithPessimisticLock(
    entityId: string,
    action: TAction,
    transitionConfig: TransitionConfig<TStatus>,
    ctx: OperatorContext,
    additionalData?: Record<string, unknown>
  ): Promise<TransitionResult<TStatus>> {
    const result = await prisma.$transaction(async (tx) => {
      // 使用 FOR UPDATE 锁定行（MySQL 语法）
      const query = `
        SELECT id, status, \`${this.config.dbNumberField}\` as entityNumber
        FROM \`${this.config.dbTableName}\`
        WHERE id = ? AND \`tenant_id\` = ?
        FOR UPDATE
      `
      const rows = await tx.$queryRawUnsafe<Array<{ id: string; status: string; entityNumber: string }>>(
        query,
        entityId,
        ctx.tenantId
      )

      const entity = rows[0]
      if (!entity) {
        throw new Error(`${this.config.entityType}不存在`)
      }

      const currentStatus = entity.status as TStatus
      this.validateTransition(currentStatus, action, transitionConfig)

      await this.updateEntity(tx, entityId, transitionConfig.to, ctx.userId, additionalData)
      await this.createOperationLog(tx, entityId, entity.entityNumber, transitionConfig, currentStatus, ctx)

      return { previousStatus: currentStatus, newStatus: transitionConfig.to as TStatus, entityNumber: entity.entityNumber }
    })

    // 触发状态变更回调
    this.triggerStatusChangeCallback(entityId, result.entityNumber, action, result.previousStatus, result.newStatus, ctx)

    return { success: true, previousStatus: result.previousStatus, newStatus: result.newStatus }
  }

  /**
   * 乐观锁方式（版本检查）
   * 适合：高并发、可接受重试的场景（如出库单）
   */
  private async transitionWithOptimisticLock(
    entityId: string,
    action: TAction,
    transitionConfig: TransitionConfig<TStatus>,
    ctx: OperatorContext,
    additionalData?: Record<string, unknown>
  ): Promise<TransitionResult<TStatus>> {
    // 1. 先查询当前状态和版本（updatedAt）
    // 使用原始查询获取精确的 updatedAt（包含毫秒），绕过 timezone-extension
    const query = `
      SELECT id, status, updated_at as updatedAt, \`${this.config.dbNumberField}\` as entityNumber
      FROM \`${this.config.dbTableName}\`
      WHERE id = ? AND \`tenant_id\` = ?
    `
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; status: string; updatedAt: Date; entityNumber: string }>>(
      query,
      entityId,
      ctx.tenantId
    )

    const entity = rows[0]
    if (!entity) {
      throw new Error(`${this.config.entityType}不存在`)
    }

    const currentStatus = entity.status as TStatus
    const entityNumber = entity.entityNumber
    this.validateTransition(currentStatus, action, transitionConfig)

    // 使用原始查询获取的 Date 对象，保留完整精度（包含毫秒）
    const updatedAtForComparison = entity.updatedAt

    // 2. 使用 updateMany 带条件更新（乐观锁）
    const modelName = this.config.tableName.charAt(0).toLowerCase() + this.config.tableName.slice(1)
    const model = (prisma as unknown as Record<string, unknown>)[modelName] as {
      updateMany: (args: unknown) => Promise<{ count: number }>
    }

    const updateResult = await model.updateMany({
      where: {
        id: entityId,
        tenantId: ctx.tenantId,
        status: { in: transitionConfig.from }, // 状态必须在允许的范围内
        updatedAt: updatedAtForComparison, // 版本检查
      },
      data: {
        status: transitionConfig.to,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
        ...additionalData,
      },
    })

    if (updateResult.count === 0) {
      throw new Error('状态已被其他操作修改，请重试')
    }

    // 3. 记录操作日志（异步）
    this.logStatusChangeAsync(entityId, entityNumber, transitionConfig, currentStatus, ctx)

    // 4. 触发状态变更回调
    this.triggerStatusChangeCallback(entityId, entityNumber, action, currentStatus, transitionConfig.to as TStatus, ctx)

    return {
      success: true,
      previousStatus: currentStatus,
      newStatus: transitionConfig.to as TStatus,
    }
  }

  /**
   * 无锁方式
   * 适合：状态变更不频繁、可接受最终一致性的场景
   */
  private async transitionWithoutLock(
    entityId: string,
    action: TAction,
    transitionConfig: TransitionConfig<TStatus>,
    ctx: OperatorContext,
    additionalData?: Record<string, unknown>
  ): Promise<TransitionResult<TStatus>> {
    const result = await prisma.$transaction(async (tx) => {
      const modelName = this.config.tableName.charAt(0).toLowerCase() + this.config.tableName.slice(1)
      const model = (tx as Record<string, unknown>)[modelName] as {
        findFirst: (args: unknown) => Promise<{ id: string; status: string; [key: string]: unknown } | null>
        update: (args: unknown) => Promise<unknown>
      }

      const entity = await model.findFirst({
        where: { id: entityId, tenantId: ctx.tenantId },
        select: { id: true, status: true, [this.config.numberField]: true },
      })

      if (!entity) {
        throw new Error(`${this.config.entityType}不存在`)
      }

      const currentStatus = entity.status as TStatus
      const entityNumber = entity[this.config.numberField] as string
      this.validateTransition(currentStatus, action, transitionConfig)

      await model.update({
        where: { id: entityId },
        data: {
          status: transitionConfig.to,
          updatedBy: ctx.userId,
          ...additionalData,
        },
      })

      await this.createOperationLog(tx, entityId, entityNumber, transitionConfig, currentStatus, ctx)

      return { previousStatus: currentStatus, newStatus: transitionConfig.to as TStatus, entityNumber }
    })

    // 触发状态变更回调
    this.triggerStatusChangeCallback(entityId, result.entityNumber, action, result.previousStatus, result.newStatus, ctx)

    return { success: true, previousStatus: result.previousStatus, newStatus: result.newStatus }
  }

  private validateTransition(currentStatus: TStatus, action: TAction, config: TransitionConfig<TStatus>): void {
    if (!config.from.includes(currentStatus)) {
      throw new Error(
        `无法从 ${currentStatus} 状态执行 ${action} 操作，允许的状态: ${config.from.join(', ')}`
      )
    }
  }

  private async updateEntity(
    tx: unknown,
    entityId: string,
    newStatus: TStatus,
    userId: string,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    const modelName = this.config.tableName.charAt(0).toLowerCase() + this.config.tableName.slice(1)
    const model = (tx as Record<string, unknown>)[modelName] as {
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>
    }

    await model.update({
      where: { id: entityId },
      data: {
        status: newStatus,
        updatedBy: userId,
        ...additionalData,
      },
    })
  }

  private async createOperationLog(
    tx: unknown,
    entityId: string,
    entityNumber: string,
    config: TransitionConfig<TStatus>,
    previousStatus: TStatus,
    ctx: OperatorContext
  ): Promise<void> {
    const txTyped = tx as { operationLog: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> } }
    await txTyped.operationLog.create({
      data: {
        tenantId: ctx.tenantId,
        entityType: this.config.entityType,
        entityId,
        entityNumber,
        operationType: config.operationType,
        operationName: config.operationName,
        beforeStatus: previousStatus,
        afterStatus: config.to,
        operatorId: ctx.userId,
        operatorName: ctx.userName,
      },
    })
  }

  private logStatusChangeAsync(
    entityId: string,
    entityNumber: string,
    config: TransitionConfig<TStatus>,
    previousStatus: TStatus,
    ctx: OperatorContext
  ): void {
    // 使用 Redis 队列
    if (USE_REDIS_QUEUE) {
      const item: OperationLogQueueItem = {
        tenantId: ctx.tenantId,
        entityType: this.config.entityType,
        entityId,
        entityNumber,
        operationType: config.operationType,
        operationName: config.operationName,
        beforeStatus: previousStatus,
        afterStatus: config.to,
        operatorId: ctx.userId,
        operatorName: ctx.userName,
        timestamp: new Date().toISOString(),
      }
      pushOperationLogToQueue(item).catch((err) => {
        console.error(`[StateMachine] Failed to push operation log to queue:`, err)
      })
      return
    }

    // 直接写入数据库（备用方案）
    prisma.operationLog.create({
      data: {
        tenantId: ctx.tenantId,
        entityType: this.config.entityType,
        entityId,
        entityNumber,
        operationType: config.operationType,
        operationName: config.operationName,
        beforeStatus: previousStatus,
        afterStatus: config.to,
        operatorId: ctx.userId,
        operatorName: ctx.userName,
      },
    }).catch((err) => {
      console.error(`[StateMachine] Failed to log status change:`, err)
    })
  }

  /**
   * 检查是否可以执行操作
   */
  canTransition(currentStatus: TStatus, action: TAction): boolean {
    const config = this.config.transitions[action]
    return config ? config.from.includes(currentStatus) : false
  }

  /**
   * 获取可执行的操作列表
   */
  getAvailableActions(currentStatus: TStatus): TAction[] {
    return (Object.keys(this.config.transitions) as TAction[]).filter((action) =>
      this.config.transitions[action].from.includes(currentStatus)
    )
  }

  /**
   * 仅记录状态变更日志（用于事务中已更新状态的场景）
   */
  logStatusChange(
    entityId: string,
    entityNumber: string,
    action: TAction,
    previousStatus: TStatus,
    newStatus: TStatus,
    ctx: OperatorContext
  ): void {
    const config = this.config.transitions[action]
    if (!config) return

    // 使用 Redis 队列
    if (USE_REDIS_QUEUE) {
      const item: OperationLogQueueItem = {
        tenantId: ctx.tenantId,
        entityType: this.config.entityType,
        entityId,
        entityNumber,
        operationType: config.operationType,
        operationName: config.operationName,
        beforeStatus: previousStatus,
        afterStatus: newStatus,
        operatorId: ctx.userId,
        operatorName: ctx.userName,
        timestamp: new Date().toISOString(),
      }
      pushOperationLogToQueue(item).catch((err) => {
        console.error(`[StateMachine] Failed to push operation log to queue:`, err)
      })
      return
    }

    // 直接写入数据库（备用方案）
    prisma.operationLog.create({
      data: {
        tenantId: ctx.tenantId,
        entityType: this.config.entityType,
        entityId,
        entityNumber,
        operationType: config.operationType,
        operationName: config.operationName,
        beforeStatus: previousStatus,
        afterStatus: newStatus,
        operatorId: ctx.userId,
        operatorName: ctx.userName,
      },
    }).catch((err) => {
      console.error(`[StateMachine] Failed to log status change for ${this.config.entityType}:`, err)
    })
  }

  /**
   * 触发状态变更回调
   */
  private triggerStatusChangeCallback(
    entityId: string,
    entityNumber: string,
    action: TAction,
    previousStatus: TStatus,
    newStatus: TStatus,
    ctx: OperatorContext
  ): void {
    if (!this.config.onStatusChange) return

    const event: StatusChangeEvent<TStatus> = {
      entityType: this.config.entityType,
      entityId,
      entityNumber,
      previousStatus,
      newStatus,
      action: action as string,
      ctx,
    }

    // 异步执行回调，不阻塞主流程
    Promise.resolve(this.config.onStatusChange(event)).catch((err) => {
      console.error(`[StateMachine] Status change callback failed for ${this.config.entityType}:`, err)
    })
  }
}
