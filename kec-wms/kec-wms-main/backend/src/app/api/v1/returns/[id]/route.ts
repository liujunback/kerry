import { NextRequest } from 'next/server'
import { createAuthHandler, type RouteContext } from '@/lib/api/create-handler'
import { buildReturnAuth, fail, ok } from '@/lib/returns/api-utils'
import { getReturnOrderDetail } from '@/lib/returns/return-service'

export const GET = createAuthHandler<RouteContext<{ id: string }>>(async (
  _request: NextRequest,
  auth,
  context
) => {
  try {
    const { id } = await context.params
    const data = await getReturnOrderDetail(buildReturnAuth(auth.user), id)
    return ok(data)
  } catch (error) {
    return fail(error, 404)
  }
})
