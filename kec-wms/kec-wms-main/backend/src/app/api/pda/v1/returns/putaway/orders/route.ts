import { NextRequest } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { buildReturnAuth, fail, ok } from '@/lib/returns/api-utils'
import { requireReturnPdaPermission } from '@/lib/returns/pda-api-utils'
import { listReturnPutawayOrders } from '@/lib/returns/return-service'

export const GET = createAuthHandler(async (_request: NextRequest, auth) => {
  const permissionResponse = await requireReturnPdaPermission(auth.user, 'return:putaway:execute')
  if (permissionResponse) return permissionResponse

  try {
    const data = await listReturnPutawayOrders(buildReturnAuth(auth.user))
    return ok(data)
  } catch (error) {
    return fail(error)
  }
})
