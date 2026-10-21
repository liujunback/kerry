import { createAuthHandler } from '@/lib/api/create-handler'
import { getPickingTasks } from '@/lib/picking/pda-handler'

export const GET = createAuthHandler(async (request, auth) => {
  return getPickingTasks(request, auth)
})
