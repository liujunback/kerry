import { NextRequest } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { buildReturnAuth, fail, ok, readJson } from '@/lib/returns/api-utils'
import { executeReturnPutaway } from '@/lib/returns/return-service'
import { executeReturnPutawaySchema } from '@/lib/validations/returns'

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const parseResult = executeReturnPutawaySchema.safeParse(await readJson(request))
    if (!parseResult.success) {
      return fail(new Error(parseResult.error.errors[0]?.message || '参数错误'), 400)
    }

    const data = await executeReturnPutaway(buildReturnAuth(auth.user), parseResult.data)
    return ok(data, '退件上架成功')
  } catch (error) {
    return fail(error)
  }
})
