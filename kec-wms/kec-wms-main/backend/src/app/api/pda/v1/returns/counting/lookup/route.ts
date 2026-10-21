import { NextRequest } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { buildReturnAuth, fail, ok, readJson } from '@/lib/returns/api-utils'
import { requireReturnPdaPermission } from '@/lib/returns/pda-api-utils'
import { lookupReturnCounting } from '@/lib/returns/return-service'
import { countingLookupSchema } from '@/lib/validations/returns'

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  const permissionResponse = await requireReturnPdaPermission(auth.user, 'return:count')
  if (permissionResponse) return permissionResponse

  try {
    const parseResult = countingLookupSchema.safeParse(await readJson(request))
    if (!parseResult.success) {
      return fail(new Error(parseResult.error.errors[0]?.message || '参数错误'), 400)
    }

    const data = await lookupReturnCounting(buildReturnAuth(auth.user), parseResult.data.logisticsNo)
    return ok(data)
  } catch (error) {
    return fail(error)
  }
})
