import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'
import { auditContext, AuditContext } from '@/lib/db/audit-extension'
import { AuthContext } from '@/lib/auth/unified-auth'

// 是否启用调试日志
const DEBUG_AUDIT = process.env.DEBUG_AUDIT === 'true'

/**
 * 从请求中提取客户端 IP 地址
 * 优先级：x-forwarded-for > x-real-ip > cf-connecting-ip > 127.0.0.1
 */
function getClientIp(request: NextRequest): string {
  // 1. x-forwarded-for（反向代理，可能包含多个 IP，取第一个）
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim()
    if (firstIp) return firstIp
  }

  // 2. x-real-ip（Nginx 等反向代理）
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  // 3. cf-connecting-ip（Cloudflare）
  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  // 4. 本地开发环境 fallback
  return '127.0.0.1'
}

/**
 * 包装 API 处理函数，自动设置审计上下文
 * 使用方式:
 * export async function POST(request: NextRequest) {
 *   return withAuditContext(request, async () => {
 *     // 你的业务逻辑
 *   })
 * }
 */
export async function withAuditContext<T>(
  request: NextRequest,
  handler: () => Promise<T>
): Promise<T> {
  // 无条件日志，确认函数被调用
  console.log('[Audit Context] withAuditContext called for:', request.nextUrl.pathname)

  const session = await auth()

  const ctx: AuditContext = {
    tenantId: session?.user?.tenantId,
    operatorId: session?.user?.id,
    operatorName: session?.user?.name || session?.user?.username,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
    requestPath: request.nextUrl.pathname,
    requestMethod: request.method,
  }

  if (DEBUG_AUDIT) {
    console.log('[Audit Context] Set context:', {
      tenantId: ctx.tenantId,
      operatorId: ctx.operatorId,
      ipAddress: ctx.ipAddress,
      requestPath: ctx.requestPath,
      requestMethod: ctx.requestMethod,
    })
  }

  // 无条件日志，确认 auditContext.run 被调用
  console.log('[Audit Context] Running handler with context, tenantId:', ctx.tenantId)

  return auditContext.run(ctx, handler)
}

/**
 * 包装 API 处理函数，使用统一认证上下文设置审计上下文
 * 适用于外部 API（API Key 认证）
 * 使用方式:
 * export async function POST(request: NextRequest) {
 *   const authContext = await authenticate(request)
 *   return withUnifiedAuditContext(request, authContext, async () => {
 *     // 你的业务逻辑
 *   })
 * }
 */
export async function withUnifiedAuditContext<T>(
  request: NextRequest,
  authContext: AuthContext | null,
  handler: () => Promise<T>
): Promise<T> {
  const ctx: AuditContext = {
    tenantId: authContext?.tenantId,
    operatorId: authContext?.userId,
    operatorName: authContext?.type === 'apiKey' ? 'API Key' : undefined,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent') || undefined,
    requestPath: request.nextUrl.pathname,
    requestMethod: request.method,
  }

  if (DEBUG_AUDIT) {
    console.log('[Audit Context] Set unified context:', {
      tenantId: ctx.tenantId,
      operatorId: ctx.operatorId,
      ipAddress: ctx.ipAddress,
      requestPath: ctx.requestPath,
      requestMethod: ctx.requestMethod,
    })
  }

  return auditContext.run(ctx, handler)
}
