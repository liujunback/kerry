/**
 * 分布式锁工具
 * 基于 Redis SET NX EX 实现
 */

import { getRedisClient } from '@/lib/db/redis'
import { randomUUID } from 'crypto'

export interface LockOptions {
  /** 锁超时时间（毫秒），默认 30000ms */
  ttlMs?: number
  /** 获取锁的重试次数，默认 3 */
  retryCount?: number
  /** 重试间隔（毫秒），默认 100ms */
  retryDelayMs?: number
  /** 锁前缀，用于区分不同业务 */
  prefix?: string
}

export interface LockResult {
  /** 是否成功获取锁 */
  acquired: boolean
  /** 锁的唯一标识（用于释放锁） */
  lockId: string | null
  /** 释放锁的函数 */
  release: () => Promise<boolean>
}

const DEFAULT_OPTIONS: Required<LockOptions> = {
  ttlMs: 30000,
  retryCount: 3,
  retryDelayMs: 100,
  prefix: 'lock',
}

const LOCK_PREFIX = 'wms:lock:'

/**
 * 获取分布式锁
 */
export async function acquireLock(
  key: string,
  options: LockOptions = {}
): Promise<LockResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const redis = getRedisClient()
  const lockKey = `${LOCK_PREFIX}${opts.prefix}:${key}`
  const lockId = randomUUID()
  const ttlSeconds = Math.ceil(opts.ttlMs / 1000)

  const release = async (): Promise<boolean> => {
    return releaseLock(lockKey, lockId)
  }

  for (let attempt = 0; attempt <= opts.retryCount; attempt++) {
    const result = await redis.set(lockKey, lockId, 'EX', ttlSeconds, 'NX')

    if (result === 'OK') {
      return { acquired: true, lockId, release }
    }

    if (attempt < opts.retryCount) {
      await sleep(opts.retryDelayMs)
    }
  }

  return { acquired: false, lockId: null, release: async () => false }
}

/**
 * 释放分布式锁
 * 使用 Lua 脚本确保原子性：只有锁的持有者才能释放锁
 */
async function releaseLock(lockKey: string, lockId: string): Promise<boolean> {
  const redis = getRedisClient()

  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `

  const result = await redis.eval(script, 1, lockKey, lockId)
  return result === 1
}

/**
 * 使用分布式锁执行操作
 * 自动获取和释放锁
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const lock = await acquireLock(key, options)

  if (!lock.acquired) {
    throw new LockAcquisitionError(key)
  }

  try {
    return await fn()
  } finally {
    await lock.release()
  }
}

export class LockAcquisitionError extends Error {
  public readonly lockKey: string

  constructor(key: string) {
    super(`Failed to acquire lock for key: ${key}`)
    this.name = 'LockAcquisitionError'
    this.lockKey = key
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 锁键生成器 - 订单创建
 * 锁粒度：租户 + 仓库 + 日期
 */
export function getOrderCreationLockKey(
  tenantId: string,
  warehouseCode: string
): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `order:create:${tenantId}:${warehouseCode}:${today}`
}

/**
 * 锁键生成器 - 外部参考号
 * 锁粒度：租户 + 客户 + 参考号
 */
export function getReferenceNumberLockKey(
  tenantId: string,
  clientId: string,
  referenceNumber: string
): string {
  return `order:ref:${tenantId}:${clientId}:${referenceNumber}`
}

/**
 * 锁键生成器 - ASN外部单号写入
 * 锁粒度：租户 + 客户 + 外部单号
 */
export function getAsnExternalNumberLockKey(
  tenantId: string,
  clientId: string,
  externalNumber: string
): string {
  return `asn:external:${tenantId}:${clientId}:${externalNumber}`
}

/**
 * 锁键生成器 - ASN明细写入
 * 锁粒度：ASN
 */
export function getAsnLinesLockKey(asnId: string): string {
  return `asn:lines:${asnId}`
}

/**
 * 锁键生成器 - 后台任务编号创建
 * 锁粒度：租户 + 日期
 */
export function getJobCreationLockKey(tenantId: string): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `job:create:${tenantId}:${today}`
}

/**
 * 锁键生成器 - 波次策略执行
 * 锁粒度：租户 + 仓库
 */
export function getWaveStrategyExecutionLockKey(
  tenantId: string,
  warehouseId: string
): string {
  return `wave:execute:${tenantId}:${warehouseId}`
}
