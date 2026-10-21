/**
 * 统一认证中间件
 * 用于外部 API 路由的认证和权限检查
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasApiScope, AuthContext } from '@/lib/auth/unified-auth'

export interface AuthMiddlewareOptions {
  /**
   * 是否仅允许 API Key 认证（排除 Session 认证）
   * 默认: false（允许两种认证方式）
   */
  apiKeyOnly?: boolean

  /**
   * 需要的权限范围（仅对 API Key 认证有效）
   * 例如: 'asn:read', 'sku:write'
   */
  requiredScope?: string

  /**
   * 是否仅允许 Session 认证（排除 API Key 认证）
   * 默认: false（允许两种认证方式）
   */
  sessionOnly?: boolean
}

/**
 * 认证中间件包装器
 *
 * 使用示例:
 * ```typescript
 * export const GET = withAuth(
 *   async (request, authContext, params) => {
 *     // 你的业务逻辑
 *     return NextResponse.json({ success: true, data: ... })
 *   },
 *   { apiKeyOnly: true, requiredScope: 'asn:read' }
 * )
 * ```
 */
export function withAuth<T = any>(
  handler: (
    request: NextRequest,
    authContext: AuthContext,
    params?: T
  ) => Promise<NextResponse>,
  options: AuthMiddlewareOptions = {}
) {
  return async (request: NextRequest, context?: { params: Promise<T> }) => {
    // 1. 执行认证
    const authResult = await authenticate(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: 401 }
      )
    }

    const authContext = authResult.context!

    // 2. 检查认证类型限制
    if (options.apiKeyOnly && authContext.type !== 'apiKey') {
      return NextResponse.json(
        { success: false, message: '此接口仅供外部 API 调用' },
        { status: 403 }
      )
    }

    if (options.sessionOnly && authContext.type !== 'session') {
      return NextResponse.json(
        { success: false, message: '此接口仅供内部使用' },
        { status: 403 }
      )
    }

    // 3. 检查权限范围（仅对 API Key 认证）
    if (options.requiredScope && authContext.type === 'apiKey') {
      if (!hasApiScope(authContext, options.requiredScope)) {
        return NextResponse.json(
          { success: false, message: '权限不足' },
          { status: 403 }
        )
      }
    }

    // 4. 解析 params（如果存在）
    const params = context?.params ? await context.params : undefined

    // 5. 执行业务逻辑
    return handler(request, authContext, params)
  }
}

/**
 * 外部 API 专用认证中间件（仅允许 API Key 认证）
 *
 * 使用示例:
 * ```typescript
 * export const GET = withExternalAuth(
 *   async (request, authContext, params) => {
 *     // 你的业务逻辑
 *   },
 *   'asn:read' // 可选：需要的权限范围
 * )
 * ```
 */
export function withExternalAuth<T = any>(
  handler: (
    request: NextRequest,
    authContext: AuthContext,
    params?: T
  ) => Promise<NextResponse>,
  requiredScope?: string
) {
  return withAuth(handler, {
    apiKeyOnly: true,
    requiredScope,
  })
}

/**
 * 内部 API 专用认证中间件（仅允许 Session 认证）
 *
 * 使用示例:
 * ```typescript
 * export const POST = withInternalAuth(
 *   async (request, authContext) => {
 *     // 你的业务逻辑
 *     // authContext.userId 保证存在
 *   }
 * )
 * ```
 */
export function withInternalAuth<T = any>(
  handler: (
    request: NextRequest,
    authContext: AuthContext,
    params?: T
  ) => Promise<NextResponse>
) {
  return withAuth(handler, {
    sessionOnly: true,
  })
}
