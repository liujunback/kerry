/**
 * 统一认证工具
 * 支持 Session 认证和 API Key 认证
 */

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { validateApiKey } from '@/lib/external-api/auth/api-key-validator'
import {
  WMS_TERMINAL_HEADER,
  WMS_WAREHOUSE_HEADER,
  isWarehouseScopedApiPath,
  listUserWarehouseBindings,
  normalizeTerminalType,
  type TerminalType,
} from '@/lib/auth/user-warehouse'

export interface AuthContext {
  type: 'session' | 'apiKey'
  tenantId: string
  userId?: string
  clientId?: string
  warehouseId?: string
  scopes?: string[]
  terminalType?: TerminalType
}

export interface AuthResult {
  success: boolean
  context?: AuthContext
  error?: string
  status?: number
}

/**
 * 统一认证函数
 * 优先使用 API Key 认证，如果没有则使用 Session 认证
 *
 * @returns AuthResult - 包含认证结果和错误信息
 */
export async function authenticate(request: NextRequest): Promise<AuthResult> {
  // 1. 尝试 API Key 认证
  const apiKeyResult = await validateApiKey(request)

  // 如果提供了 API Key 但验证失败，直接返回错误（不再尝试 Session）
  if (apiKeyResult.hasApiKey && !apiKeyResult.success) {
    return {
      success: false,
      error: apiKeyResult.error || 'API Key 认证失败',
      status: 401,
    }
  }

  // 如果 API Key 验证成功
  if (apiKeyResult.success && apiKeyResult.context) {
    return {
      success: true,
      context: {
        type: 'apiKey',
        tenantId: apiKeyResult.context.tenantId,
        clientId: apiKeyResult.context.clientId,
        warehouseId: apiKeyResult.context.warehouseId,
        scopes: apiKeyResult.context.scopes,
        terminalType:
          normalizeTerminalType(request.headers.get(WMS_TERMINAL_HEADER)) || 'WEB',
      },
    }
  }

  // 2. 尝试 Session 认证（仅当没有提供 API Key 时）
  const session = await auth()
  if (session?.user?.tenantId) {
    return resolveSessionWarehouseContext(request, {
      type: 'session',
      tenantId: session.user.tenantId,
      userId: session.user.id,
      terminalType:
        normalizeTerminalType(request.headers.get(WMS_TERMINAL_HEADER)) || 'WEB',
    })
  }

  // 两种认证方式都失败
  return {
    success: false,
    error: '未授权访问',
    status: 401,
  }
}

/**
 * 检查是否有指定权限（用于 API Key 认证）
 */
export function hasApiScope(context: AuthContext, scope: string): boolean {
  // Session 认证默认有所有权限（权限由前端控制）
  if (context.type === 'session') {
    return true
  }

  // API Key 认证检查 scopes
  if (!context.scopes || context.scopes.length === 0) {
    return true // 空 scopes 表示有所有权限
  }

  // 精确匹配
  if (context.scopes.includes(scope)) {
    return true
  }

  // 通配符匹配
  const [resource] = scope.split(':')
  if (context.scopes.includes(`${resource}:*`) || context.scopes.includes('*')) {
    return true
  }

  return false
}

/**
 * 便捷函数：获取认证上下文（向后兼容）
 * @deprecated 建议使用 authenticate() 并检查 success 字段
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const result = await authenticate(request)
  return result.success ? result.context! : null
}

async function resolveSessionWarehouseContext(
  request: NextRequest,
  context: AuthContext
): Promise<AuthResult> {
  if (!isWarehouseScopedApiPath(request.nextUrl.pathname)) {
    return {
      success: true,
      context,
    }
  }

  const warehouseBindings = await listUserWarehouseBindings(context.tenantId, context.userId!)
  if (warehouseBindings.length === 0) {
    return {
      success: false,
      error: '当前账号未绑定可操作仓库，请联系管理员配置',
      status: 403,
    }
  }

  const requestedWarehouseId = request.headers.get(WMS_WAREHOUSE_HEADER)?.trim()
  if (!requestedWarehouseId) {
    return {
      success: false,
      error: '仓库域请求缺少 X-WMS-Warehouse-Id',
      status: 400,
    }
  }

  const hasWarehouseAccess = warehouseBindings.some(
    (binding) => binding.warehouseId === requestedWarehouseId
  )
  if (!hasWarehouseAccess) {
    return {
      success: false,
      error: '当前账号无权访问该仓库',
      status: 403,
    }
  }

  const legacyWarehouseId = await readLegacyWarehouseId(request)
  if (legacyWarehouseId && legacyWarehouseId !== requestedWarehouseId) {
    return {
      success: false,
      error: '请求中的 warehouseId 与当前仓库头不一致',
      status: 400,
    }
  }

  return {
    success: true,
    context: {
      ...context,
      warehouseId: requestedWarehouseId,
    },
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
