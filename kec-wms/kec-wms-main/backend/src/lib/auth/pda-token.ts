/**
 * PDA 登录令牌模块
 *
 * 用于生成和验证 PDA 扫码登录的一次性临时令牌。
 * 令牌使用 JWT 格式，配合 Redis 实现一次性使用。
 */

import { SignJWT, jwtVerify } from 'jose'
import { v4 as uuidv4 } from 'uuid'
import { getRedisClient } from '@/lib/db/redis'
import { getAuthSecret } from '@/lib/auth/secret'

// 默认令牌有效期：5 分钟（单位：秒）
const DEFAULT_TOKEN_TTL_SECONDS = 5 * 60

// Redis key 前缀
const REDIS_KEY_PREFIX = 'pda_login_token:'

/**
 * PDA 登录令牌的 payload 结构
 */
export interface PdaTokenPayload {
  /** 令牌唯一标识（用于一次性验证） */
  tokenId: string
  /** 用户 ID */
  userId: string
  /** 租户 ID */
  tenantId: string
  /** 租户代码 */
  tenantCode: string
  /** 用户名 */
  username: string
  /** 用户类型 */
  userType: string
}

/**
 * 二维码内容结构
 */
export interface QrCodeContent {
  /** 类型标识 */
  type: 'PDA_LOGIN'
  /** 版本号 */
  version: number
  /** JWT 令牌 */
  token: string
}

/**
 * 生成 PDA 登录令牌
 *
 * @param params - 用户信息参数
 * @returns 包含令牌和过期时间的对象
 */
export async function generatePdaLoginToken(params: {
  userId: string
  tenantId: string
  tenantCode: string
  username: string
  userType: string
  expiresAt?: Date | string
}): Promise<{
  token: string
  expiresAt: Date
  qrCodeData: string
}> {
  const tokenId = uuidv4()
  const now = Date.now()
  const expiresAt = params.expiresAt
    ? params.expiresAt instanceof Date
      ? new Date(params.expiresAt.getTime())
      : new Date(params.expiresAt)
    : new Date(now + DEFAULT_TOKEN_TTL_SECONDS * 1000)

  if (Number.isNaN(expiresAt.getTime())) {
    throw new Error('Invalid PDA login token expiration time')
  }

  const ttlSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000))

  // 构建 JWT payload
  const payload: PdaTokenPayload = {
    tokenId,
    userId: params.userId,
    tenantId: params.tenantId,
    tenantCode: params.tenantCode,
    username: params.username,
    userType: params.userType,
  }

  // 生成 JWT
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getAuthSecret())

  // 将 tokenId 存入 Redis（用于一次性验证）
  const redis = getRedisClient()
  const redisKey = `${REDIS_KEY_PREFIX}${tokenId}`
  await redis.setex(
    redisKey,
    ttlSeconds,
    JSON.stringify({
      userId: params.userId,
      tenantId: params.tenantId,
      used: false,
    })
  )

  // 构建二维码数据
  const qrCodeContent: QrCodeContent = {
    type: 'PDA_LOGIN',
    version: 1,
    token,
  }
  const qrCodeData = JSON.stringify(qrCodeContent)

  return {
    token,
    expiresAt,
    qrCodeData,
  }
}

/**
 * 验证并消费 PDA 登录令牌（一次性）
 *
 * @param token - JWT 令牌
 * @returns 验证成功返回 payload，失败返回 null
 */
export async function verifyPdaLoginToken(
  token: string
): Promise<PdaTokenPayload | null> {
  try {
    // 1. 验证 JWT 签名和有效期
    const { payload } = await jwtVerify(token, getAuthSecret())
    const pdaPayload = payload as unknown as PdaTokenPayload

    if (!pdaPayload.tokenId || !pdaPayload.userId) {
      console.error('PDA token missing required fields')
      return null
    }

    // 2. 检查 Redis 中的 tokenId 是否存在
    const redis = getRedisClient()
    const redisKey = `${REDIS_KEY_PREFIX}${pdaPayload.tokenId}`
    const redisValue = await redis.get(redisKey)

    if (!redisValue) {
      console.error('PDA token not found in Redis (expired or already used)')
      return null
    }

    const tokenData = JSON.parse(redisValue)
    if (tokenData.used) {
      console.error('PDA token already used')
      return null
    }

    // 3. 立即删除 Redis 中的 tokenId（确保一次性使用）
    await redis.del(redisKey)

    return pdaPayload
  } catch (error) {
    console.error('PDA token verification failed:', error)
    return null
  }
}

/**
 * 检查令牌是否仍然有效（不消费）
 * 用于前端检查令牌状态
 *
 * @param tokenId - 令牌 ID
 * @returns 是否有效
 */
export async function isPdaTokenValid(tokenId: string): Promise<boolean> {
  const redis = getRedisClient()
  const redisKey = `${REDIS_KEY_PREFIX}${tokenId}`
  const exists = await redis.exists(redisKey)
  return exists === 1
}
