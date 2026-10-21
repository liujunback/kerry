import { NextRequest } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { buildReturnAuth, fail, ok } from '@/lib/returns/api-utils'
import { listReturnPutawayCandidates } from '@/lib/returns/return-service'

export const GET = createAuthHandler(async (_request: NextRequest, auth) => {
  try {
    const data = await listReturnPutawayCandidates(buildReturnAuth(auth.user))
    return ok(data)
  } catch (error) {
    return fail(error)
  }
})
