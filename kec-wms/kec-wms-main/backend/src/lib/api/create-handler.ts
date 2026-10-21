import { NextRequest } from 'next/server'
import { requireAuth, type AuthUser } from '@/lib/auth/middleware'
import { withAuditContext } from '@/middleware/audit-context'

export type RouteContext<TParams extends Record<string, string> = Record<string, string>> = {
  params: Promise<TParams>
}

export type RouteHandler<TContext extends RouteContext | undefined = RouteContext | undefined> = (
  request: NextRequest,
  context: TContext
) => Promise<Response>

export type AuthenticatedRouteHandler<TContext extends RouteContext | undefined = RouteContext | undefined> = (
  request: NextRequest,
  auth: { user: AuthUser },
  context: TContext
) => Promise<Response>

/**
 * Wraps a route with audit context only.
 */
export function createHandler<TContext extends RouteContext | undefined = RouteContext | undefined>(
  handler: RouteHandler<TContext>
): RouteHandler<TContext> {
  return async (request: NextRequest, context: TContext) => {
    console.log('[createHandler] Called for:', request.nextUrl.pathname)
    return withAuditContext(request, () => handler(request, context))
  }
}

/**
 * Wraps a route with audit context and mandatory authentication.
 */
export function createAuthHandler<TContext extends RouteContext | undefined = RouteContext | undefined>(
  handler: AuthenticatedRouteHandler<TContext>
): RouteHandler<TContext> {
  return createHandler(async (request, context) => {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) {
      return authResult
    }

    return handler(request, authResult, context)
  })
}

export const h = createHandler
export const ah = createAuthHandler
