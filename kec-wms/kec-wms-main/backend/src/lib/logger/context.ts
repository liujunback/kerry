import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID } from 'crypto'
import { auditContext } from '@/lib/db/audit-extension'

export interface LogContext {
  request_id?: string
  user_id?: string
  tenant_id?: string
  ip?: string
  path?: string
  method?: string
}

// request_id 独立存储（auditContext 中没有此字段）
const requestIdStorage = new AsyncLocalStorage<string>()

/**
 * 从现有 auditContext AsyncLocalStorage 中提取日志上下文
 * 零额外开销，直接复用审计中间件注入的数据
 */
export function getLogContext(): Omit<LogContext, 'request_id'> {
  const ctx = auditContext.getStore()
  if (!ctx) return {}
  return {
    user_id: ctx.operatorId,
    tenant_id: ctx.tenantId,
    ip: ctx.ipAddress,
    path: ctx.requestPath,
    method: ctx.requestMethod,
  }
}

export function getRequestId(): string | undefined {
  return requestIdStorage.getStore()
}

/**
 * 在 API Route 入口包裹，自动生成并注入 request_id
 * 用法：return withRequestId(() => withAuditContext(request, handler))
 */
export function withRequestId<T>(fn: () => Promise<T>): Promise<T> {
  return requestIdStorage.run(randomUUID(), fn)
}

/**
 * 为 Worker / 定时任务等无 HTTP 上下文的场景手动注入上下文
 */
export function withLogContext<T>(
  ctx: LogContext,
  fn: () => Promise<T>
): Promise<T> {
  return auditContext.run(
    {
      operatorId: ctx.user_id,
      tenantId: ctx.tenant_id,
      ipAddress: ctx.ip,
      requestPath: ctx.path,
      requestMethod: ctx.method,
    },
    () => requestIdStorage.run(ctx.request_id || randomUUID(), fn)
  )
}
