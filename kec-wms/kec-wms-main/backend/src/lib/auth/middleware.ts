import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { extractToken, verifyToken } from '@/lib/auth/jwt'
import { AUTH_TOKEN_COOKIE_NAME } from '@/lib/auth/token-cookie'
import {
  WMS_TERMINAL_HEADER,
  WMS_WAREHOUSE_HEADER,
  isWarehouseScopedApiPath,
  listUserWarehouseBindings,
  normalizeTerminalType,
  type TerminalType,
} from '@/lib/auth/user-warehouse'

export interface AuthUser {
  id: string
  tenantId: string
  tenantCode: string
  username: string
  name?: string
  userType: string
  warehouseId?: string
  terminalType?: TerminalType
}

function readAuthHeader(request: NextRequest): string | null {
  return (
    request.headers.get('Authorization') ||
    request.headers.get('authorization') ||
    request.headers.get('x-authorization') ||
    request.headers.get('x-forwarded-authorization')
  )
}

function readAuthTokens(request: NextRequest): string[] {
  const tokens = [
    extractToken(readAuthHeader(request)),
    request.cookies.get(AUTH_TOKEN_COOKIE_NAME)?.value || null,
    request.cookies.get('auth_token')?.value || null,
  ].filter((token): token is string => !!token)

  return [...new Set(tokens)]
}

/**
 * 统一认证中间件
 * 支持两种认证方式：
 * 1. NextAuth Session (Web端)
 * 2. JWT Token (PDA端)
 */
export async function authenticate(
  request: NextRequest
): Promise<{ user: AuthUser | null; error: string | null; status?: number }> {
  // 1. 尝试从请求头或 cookie 获取 JWT token
  const tokens = readAuthTokens(request)
  let sawInvalidToken = false

  for (const token of tokens) {
    const payload = await verifyToken(token)
    if (payload) {
      const user: AuthUser = {
        id: payload.id,
        tenantId: payload.tenantId,
        tenantCode: payload.tenantCode,
        username: payload.username,
        name: payload.username,
        userType: payload.userType,
      }
      return resolveWarehouseContext(request, user, 'PDA')
    }
    sawInvalidToken = true
  }

  if (sawInvalidToken) {
    return { user: null, error: 'Invalid token', status: 401 }
  }

  // 2. 尝试使用 NextAuth session
  const session = await auth()
  if (session?.user) {
    const user: AuthUser = {
      id: session.user.id,
      tenantId: session.user.tenantId,
      tenantCode: session.user.tenantCode || '',
      username: session.user.username || '',
      name: session.user.name || undefined,
      userType: session.user.userType || 'INTERNAL',
    }
    return resolveWarehouseContext(request, user, 'WEB')
  }

  return { user: null, error: 'Unauthorized', status: 401 }
}

/**
 * 要求认证的中间件
 * 如果未认证，返回 401 错误
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthUser } | Response> {
  const { user, error, status } = await authenticate(request)

  if (!user) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error || '未登录',
      }),
      {
        status: status || 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return { user }
}

async function resolveWarehouseContext(
  request: NextRequest,
  user: AuthUser,
  defaultTerminalType: TerminalType
): Promise<{ user: AuthUser | null; error: string | null; status?: number }> {
  const terminalType =
    normalizeTerminalType(request.headers.get(WMS_TERMINAL_HEADER)) || defaultTerminalType

  const nextUser: AuthUser = {
    ...user,
    terminalType,
  }

  if (!isWarehouseScopedApiPath(request.nextUrl.pathname)) {
    return {
      user: nextUser,
      error: null,
    }
  }

  const warehouseBindings = await listUserWarehouseBindings(user.tenantId, user.id)
  if (warehouseBindings.length === 0) {
    return {
      user: null,
      error: '当前账号未绑定可操作仓库，请联系管理员配置',
      status: 403,
    }
  }

  const requestedWarehouseId = request.headers.get(WMS_WAREHOUSE_HEADER)?.trim()
  if (!requestedWarehouseId) {
    return {
      user: null,
      error: '仓库域请求缺少 X-WMS-Warehouse-Id',
      status: 400,
    }
  }

  const hasWarehouseAccess = warehouseBindings.some(
    (binding) => binding.warehouseId === requestedWarehouseId
  )
  if (!hasWarehouseAccess) {
    return {
      user: null,
      error: '当前账号无权访问该仓库',
      status: 403,
    }
  }

  const legacyWarehouseId = await readLegacyWarehouseId(request)
  if (legacyWarehouseId && legacyWarehouseId !== requestedWarehouseId) {
    return {
      user: null,
      error: '请求中的 warehouseId 与当前仓库头不一致',
      status: 400,
    }
  }

  return {
    user: {
      ...nextUser,
      warehouseId: requestedWarehouseId,
    },
    error: null,
  }
}

async function readLegacyWarehouseId(request: NextRequest): Promise<string | null> {
  const queryWarehouseId = request.nextUrl.searchParams.get('warehouseId')?.trim()
  if (queryWarehouseId) {
    return queryWarehouseId
  }

  const method = request.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD') {
    return null
  }

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return null
  }

  try {
    const body = await request.clone().json() as unknown
    if (body && typeof body === 'object' && 'warehouseId' in body) {
      const warehouseId = (body as { warehouseId?: unknown }).warehouseId
      if (typeof warehouseId === 'string' && warehouseId.trim()) {
        return warehouseId.trim()
      }
    }
  } catch {
    return null
  }

  return null
}
