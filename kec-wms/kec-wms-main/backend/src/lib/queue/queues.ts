/**
 * 队列定义
 */

import { Queue } from 'bullmq'
import { getQueueConnection } from './connection'
import { QUEUE_NAMES, QUEUE_CONFIG, QueueName } from './config'

const queues: Map<QueueName, Queue> = new Map()

/**
 * 获取指定队列
 */
export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const queue = new Queue(name, {
      connection: getQueueConnection(),
      defaultJobOptions: QUEUE_CONFIG.defaultJobOptions,
    })
    queues.set(name, queue)
  }

  return queues.get(name)!
}

/**
 * 获取所有队列
 */
export function getAllQueues(): Map<QueueName, Queue> {
  // 初始化所有队列
  Object.values(QUEUE_NAMES).forEach((name) => getQueue(name))
  return queues
}

/**
 * 关闭所有队列
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map((queue) =>
    queue.close()
  )
  await Promise.all(closePromises)
  queues.clear()
}
