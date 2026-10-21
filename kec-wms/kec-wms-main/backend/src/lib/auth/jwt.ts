import { jwtVerify, SignJWT } from 'jose'
import { getAuthSecret } from '@/lib/auth/secret'

export interface JWTPayload {
  id: string
  tenantId: string
  tenantCode: string
  username: string
  userType: string
}

/**
 * 生成 JWT token
 */
export async function generateToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getAuthSecret())
}

/**
 * 验证 JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret())
    return payload as unknown as JWTPayload
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

/**
 * 从请求头中提取 token
 */
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null

  // 支持 "Bearer <token>" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // 直接返回 token
  return authHeader
}
