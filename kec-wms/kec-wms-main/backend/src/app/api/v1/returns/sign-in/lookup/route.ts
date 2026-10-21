import { NextRequest } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { buildReturnAuth, fail, ok, readJson } from '@/lib/returns/api-utils'
import { lookupReturnSignIn } from '@/lib/returns/return-service'
import { signInLookupSchema } from '@/lib/validations/returns'

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const parseResult = signInLookupSchema.safeParse(await readJson(request))
    if (!parseResult.success) {
      return fail(new Error(parseResult.error.errors[0]?.message || '参数错误'), 400)
    }

    const data = await lookupReturnSignIn(buildReturnAuth(auth.user), parseResult.data.logisticsNo)
    return ok(data)
  } catch (error) {
    return fail(error)
  }
})
