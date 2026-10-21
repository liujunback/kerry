/**
 * 定时任务调度器
 * 基于数据库配置的可管理定时任务系统
 */

import { ScheduledTask } from 'node-cron'
import cron from 'node-cron'
import { prisma } from '@/lib/db/prisma'
import { taskHandlers, TaskHandler } from './handlers'

// 存储所有运行中的定时任务
const runningTasks = new Map<string, ScheduledTask>()

// 调度器是否已初始化
let isInitialized = false

/**
 * 初始化调度器
 * 从数据库加载所有启用的定时任务并启动
 */
export async function initScheduler(): Promise<boolean> {
  if (isInitialized) {
    console.log('[Scheduler] 调度器已初始化，跳过')
    return true
  }

  console.log('[Scheduler] 正在初始化调度器...')

  try {
    // 加载所有启用的定时任务
    const tasks = await prisma.scheduledTask.findMany({
      where: { isActive: true },
    })

    console.log(`[Scheduler] 找到 ${tasks.length} 个启用的定时任务`)

    for (const task of tasks) {
      await scheduleTask(task)
    }

    isInitialized = true
    console.log('[Scheduler] 调度器初始化完成')
    return true
  } catch (error) {
    console.error('[Scheduler] 调度器初始化失败:', error)
    return false
  }
}

/**
 * 关闭调度器
 */
export async function shutdownScheduler(): Promise<void> {
  console.log('[Scheduler] 正在关闭调度器...')

  for (const [taskId, scheduledTask] of runningTasks) {
    scheduledTask.stop()
    console.log(`[Scheduler] 已停止任务: ${taskId}`)
  }

  runningTasks.clear()
  isInitialized = false
  console.log('[Scheduler] 调度器已关闭')
}

interface ScheduledTaskRecord {
  id: string
  tenantId: string
  taskCode: string
  taskName: string
  cronExpression: string
  timezone: string
  handler: string
  params: unknown
}

/**
 * 调度单个任务
 */
async function scheduleTask(task: ScheduledTaskRecord): Promise<void> {
  // 验证 cron 表达式
  if (!cron.validate(task.cronExpression)) {
    console.error(`[Scheduler] 无效的 cron 表达式: ${task.cronExpression} (任务: ${task.taskCode})`)
    return
  }

  // 获取处理器
  const handler = taskHandlers.get(task.handler)
  if (!handler) {
    console.error(`[Scheduler] 未找到处理器: ${task.handler} (任务: ${task.taskCode})`)
    return
  }

  // 如果任务已在运行，先停止
  if (runningTasks.has(task.id)) {
    runningTasks.get(task.id)?.stop()
    runningTasks.delete(task.id)
  }

  // 创建定时任务
  const scheduledTask = cron.schedule(
    task.cronExpression,
    async () => {
      await executeTask(task, handler)
    },
    {
      timezone: task.timezone,
    }
  )

  runningTasks.set(task.id, scheduledTask)

  // 计算下次执行时间并更新
  const nextRun = getNextRunTime(task.cronExpression, task.timezone)
  await prisma.scheduledTask.update({
    where: { id: task.id },
    data: { nextRunAt: nextRun },
  })

  console.log(`[Scheduler] 已调度任务: ${task.taskCode} (${task.cronExpression})`)
}

/**
 * 执行任务
 */
async function executeTask(
  task: ScheduledTaskRecord,
  handler: TaskHandler
): Promise<void> {
  const startTime = Date.now()
  let logId: string | null = null

  try {
    // 创建执行日志
    const log = await prisma.scheduledTaskLog.create({
      data: {
        tenantId: task.tenantId,
        taskId: task.id,
        taskCode: task.taskCode,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    })
    logId = log.id

    console.log(`[Scheduler] 开始执行任务: ${task.taskCode}`)

    // 执行处理器
    const result = await handler({
      tenantId: task.tenantId,
      taskId: task.id,
      taskCode: task.taskCode,
      params: task.params as Record<string, unknown> | null,
    })

    const duration = Date.now() - startTime
    const nextRun = getNextRunTime(task.cronExpression, task.timezone)

    // 更新任务状态
    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: 'SUCCESS',
        lastRunMessage: result.message,
        lastRunDuration: duration,
        nextRunAt: nextRun,
        runCount: { increment: 1 },
      },
    })

    // 更新日志
    await prisma.scheduledTaskLog.update({
      where: { id: logId },
      data: {
        status: 'SUCCESS',
        message: result.message,
        duration,
        completedAt: new Date(),
      },
    })

    console.log(`[Scheduler] 任务执行成功: ${task.taskCode} (耗时: ${duration}ms)`)
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined

    // 更新任务状态
    await prisma.scheduledTask.update({
      where: { id: task.id },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: 'FAILED',
        lastRunMessage: errorMessage,
        lastRunDuration: duration,
        runCount: { increment: 1 },
        failCount: { increment: 1 },
      },
    })

    // 更新日志
    if (logId) {
      await prisma.scheduledTaskLog.update({
        where: { id: logId },
        data: {
          status: 'FAILED',
          message: errorMessage,
          errorStack,
          duration,
          completedAt: new Date(),
        },
      })
    }

    console.error(`[Scheduler] 任务执行失败: ${task.taskCode}`, error)
  }
}

/**
 * 计算下次执行时间
 */
function getNextRunTime(cronExpression: string, timezone: string): Date {
  const interval = cron.schedule(cronExpression, () => {}, { timezone })
  // node-cron 没有直接获取下次执行时间的方法，使用简单估算
  interval.stop()

  // 简单实现：返回当前时间 + 1分钟作为估算
  // 实际项目中可以使用 cron-parser 库精确计算
  return new Date(Date.now() + 60000)
}

/**
 * 重新加载单个任务
 */
export async function reloadTask(taskId: string): Promise<void> {
  const task = await prisma.scheduledTask.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    // 任务被删除，停止运行
    if (runningTasks.has(taskId)) {
      runningTasks.get(taskId)?.stop()
      runningTasks.delete(taskId)
    }
    return
  }

  if (task.isActive) {
    await scheduleTask(task)
  } else {
    // 任务被禁用，停止运行
    if (runningTasks.has(taskId)) {
      runningTasks.get(taskId)?.stop()
      runningTasks.delete(taskId)
      console.log(`[Scheduler] 已停止任务: ${task.taskCode}`)
    }
  }
}

/**
 * 手动触发任务执行
 */
export async function triggerTask(taskId: string): Promise<void> {
  const task = await prisma.scheduledTask.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    throw new Error('任务不存在')
  }

  if (!task.isActive) {
    throw new Error('任务已禁用，不能手动触发')
  }

  const handler = taskHandlers.get(task.handler)
  if (!handler) {
    throw new Error(`未找到处理器: ${task.handler}`)
  }

  await executeTask(task, handler)
}

export { taskHandlers } from './handlers'
