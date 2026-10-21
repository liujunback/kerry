import { NextRequest } from 'next/server'
import { createAuthHandler, type RouteContext } from '@/lib/api/create-handler'
import { buildReturnAuth, fail, ok, readJson } from '@/lib/returns/api-utils'
import { saveReturnCountLine } from '@/lib/returns/return-service'
import { saveCountLineSchema } from '@/lib/validations/returns'

export const POST = createAuthHandler<RouteContext<{ id: string }>>(async (
  request: NextRequest,
  auth,
  context
) => {
  try {
    const { id } = await context.params
    const parseResult = saveCountLineSchema.safeParse(await readJson(request))
    if (!parseResult.success) {
      return fail(new Error(parseResult.error.errors[0]?.message || '参数错误'), 400)
    }

    const data = await saveReturnCountLine(buildReturnAuth(auth.user), id, parseResult.data)
    return ok(data, '清点明细已保存')
  } catch (error) {
    return fail(error)
  }
})
