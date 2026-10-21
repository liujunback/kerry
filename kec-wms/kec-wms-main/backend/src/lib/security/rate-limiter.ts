import { getRedisClient } from '@/lib/db/redis'

const RATE_LIMIT_PREFIX = 'rate_limit:'
const LOGIN_ATTEMPT_PREFIX = 'login_attempt:'

// 登录限流配置
const LOGIN_RATE_LIMIT = {
  maxAttempts: 10,      // 每分钟最多10次请求
  windowSeconds: 60,    // 时间窗口：60秒
}

// 账号锁定配置
const ACCOUNT_LOCK = {
  maxFailedAttempts: 5,  // 最大失败次数
  lockDurationSeconds: 1800, // 锁定时长：30分钟
}

/**
 * 检查 IP 是否被限流
 */
export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `${RATE_LIMIT_PREFIX}${ip}`
  const redis = getRedisClient()
  const current = await redis.incr(key)

  if (current === 1) {
    await redis.expire(key, LOGIN_RATE_LIMIT.windowSeconds)
  }

  const allowed = current <= LOGIN_RATE_LIMIT.maxAttempts
  const remaining = Math.max(0, LOGIN_RATE_LIMIT.maxAttempts - current)

  return { allowed, remaining }
}

/**
 * 记录登录失败次数
 */
export async function recordLoginFailure(tenantId: string, username: string): Promise<number> {
  const key = `${LOGIN_ATTEMPT_PREFIX}${tenantId}:${username}`
  const redis = getRedisClient()
  const attempts = await redis.incr(key)

  if (attempts === 1) {
    await redis.expire(key, ACCOUNT_LOCK.lockDurationSeconds)
  }

  return attempts
}

/**
 * 获取登录失败次数
 */
export async function getLoginFailureCount(tenantId: string, username: string): Promise<number> {
  const key = `${LOGIN_ATTEMPT_PREFIX}${tenantId}:${username}`
  const redis = getRedisClient()
  const count = await redis.get(key)
  return count ? parseInt(count, 10) : 0
}

/**
 * 清除登录失败记录（登录成功后调用）
 */
export async function clearLoginFailures(tenantId: string, username: string): Promise<void> {
  const key = `${LOGIN_ATTEMPT_PREFIX}${tenantId}:${username}`
  const redis = getRedisClient()
  await redis.del(key)
}

/**
 * 检查账号是否应该被锁定
 */
export async function shouldLockAccount(tenantId: string, username: string): Promise<boolean> {
  const failures = await getLoginFailureCount(tenantId, username)
  return failures >= ACCOUNT_LOCK.maxFailedAttempts
}

/**
 * 获取账号锁定剩余时间（秒）
 */
export async function getAccountLockTTL(tenantId: string, username: string): Promise<number> {
  const key = `${LOGIN_ATTEMPT_PREFIX}${tenantId}:${username}`
  const redis = getRedisClient()
  const ttl = await redis.ttl(key)
  return ttl > 0 ? ttl : 0
}

export const LOCK_CONFIG = ACCOUNT_LOCK
