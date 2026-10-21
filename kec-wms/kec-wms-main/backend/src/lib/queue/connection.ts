/**
 * BullMQ Redis 连接
 */

import IORedis, { RedisOptions } from 'ioredis'

let queueConnection: IORedis | null = null

/**
 * 获取 Redis 连接配置
 */
function getRedisConfig(): RedisOptions {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: null, // BullMQ 必需
    enableReadyCheck: false,
  }
}

/**
 * 获取队列 Redis 连接（单例）
 */
export function getQueueConnection(): IORedis {
  if (!queueConnection) {
    const redisUrl = process.env.REDIS_URL

    if (redisUrl) {
      queueConnection = new IORedis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      })
    } else {
      queueConnection = new IORedis(getRedisConfig())
    }
  }

  return queueConnection
}

/**
 * 创建新的队列连接（用于 Worker）
 */
export function createQueueConnection(): IORedis {
  const redisUrl = process.env.REDIS_URL

  if (redisUrl) {
    return new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }

  return new IORedis(getRedisConfig())
}

/**
 * 关闭队列连接
 */
export async function closeQueueConnection(): Promise<void> {
  if (queueConnection) {
    await queueConnection.quit()
    queueConnection = null
  }
}

/**
 * 获取分布式锁
 * @param key 锁的键名
 * @param ttlSeconds 锁的过期时间（秒）
 * @returns 锁的唯一标识（用于释放锁），获取失败返回 null
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number = 30
): Promise<string | null> {
  const redis = getQueueConnection()
  const lockValue = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const result = await redis.set(key, lockValue, 'EX', ttlSeconds, 'NX')
  return result === 'OK' ? lockValue : null
}

/**
 * 释放分布式锁
 * @param key 锁的键名
 * @param lockValue 锁的唯一标识
 */
export async function releaseLock(
  key: string,
  lockValue: string
): Promise<boolean> {
  const redis = getQueueConnection()
  // 使用 Lua 脚本确保原子性：只有持有锁的人才能释放
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `
  const result = await redis.eval(script, 1, key, lockValue)
  return result === 1
}

// ============ 公平队列相关函数 ============

const FAIR_QUEUE_PREFIX = 'fair-queue:'

/**
 * 加入公平队列
 * 使用 Redis ZSET，以时间戳为分数，保证先到先得
 * @param queueKey 队列键名
 * @param memberId 成员ID（通常是订单ID）
 * @returns 加入队列的时间戳
 */
export async function joinFairQueue(
  queueKey: string,
  memberId: string
): Promise<number> {
  const redis = getQueueConnection()
  const score = Date.now()
  await redis.zadd(`${FAIR_QUEUE_PREFIX}${queueKey}`, score, memberId)
  return score
}

/**
 * 离开公平队列
 * @param queueKey 队列键名
 * @param memberId 成员ID
 */
export async function leaveFairQueue(
  queueKey: string,
  memberId: string
): Promise<void> {
  const redis = getQueueConnection()
  await redis.zrem(`${FAIR_QUEUE_PREFIX}${queueKey}`, memberId)
}

/**
 * 检查是否轮到自己（是否排在队列最前面）
 * @param queueKey 队列键名
 * @param memberId 成员ID
 * @returns 是否轮到自己
 */
export async function isMyTurn(
  queueKey: string,
  memberId: string
): Promise<boolean> {
  const redis = getQueueConnection()
  // 获取队列中排名第一的成员
  const first = await redis.zrange(`${FAIR_QUEUE_PREFIX}${queueKey}`, 0, 0)
  return first.length > 0 && first[0] === memberId
}

/**
 * 获取在队列中的位置
 * @param queueKey 队列键名
 * @param memberId 成员ID
 * @returns 位置（从0开始），不在队列中返回 -1
 */
export async function getQueuePosition(
  queueKey: string,
  memberId: string
): Promise<number> {
  const redis = getQueueConnection()
  const rank = await redis.zrank(`${FAIR_QUEUE_PREFIX}${queueKey}`, memberId)
  return rank === null ? -1 : rank
}
