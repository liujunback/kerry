import { NextRequest } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { buildReturnAuth, fail, ok, readJson } from '@/lib/returns/api-utils'
import { createReturnPutawayOrder, listReturnPutawayOrders } from '@/lib/returns/return-service'
import { createReturnPutawayOrderSchema } from '@/lib/validations/returns'

export const GET = createAuthHandler(async (_request: NextRequest, auth) => {
  try {
    const data = await listReturnPutawayOrders(buildReturnAuth(auth.user))
    return ok(data)
  } catch (error) {
    return fail(error)
  }
})

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const parseResult = createReturnPutawayOrderSchema.safeParse(await readJson(request))
    if (!parseResult.success) {
      return fail(new Error(parseResult.error.errors[0]?.message || '参数错误'), 400)
    }

    const data = await createReturnPutawayOrder(buildReturnAuth(auth.user), parseResult.data)
    return ok(data, '退件上架单已生成')
  } catch (error) {
    return fail(error)
  }
})
