import { NextRequest } from 'next/server'
import { createAuthHandler, type RouteContext } from '@/lib/api/create-handler'
import { buildReturnAuth, fail, ok } from '@/lib/returns/api-utils'
import { requireReturnPdaPermission } from '@/lib/returns/pda-api-utils'
import { completeReturnCounting } from '@/lib/returns/return-service'

export const POST = createAuthHandler<RouteContext<{ id: string }>>(async (
  _request: NextRequest,
  auth,
  context
) => {
  const permissionResponse = await requireReturnPdaPermission(auth.user, 'return:count')
  if (permissionResponse) return permissionResponse

  try {
    const { id } = await context.params
    const data = await completeReturnCounting(buildReturnAuth(auth.user), id)
    return ok(data, '清点完成')
  } catch (error) {
    return fail(error)
  }
})
