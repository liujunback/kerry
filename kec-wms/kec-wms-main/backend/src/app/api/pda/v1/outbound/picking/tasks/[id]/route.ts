import { createAuthHandler, type RouteContext } from '@/lib/api/create-handler'
import { getPickingTaskDetail } from '@/lib/picking/pda-handler'

type PickingTaskRouteContext = RouteContext<{ id: string }>

export const GET = createAuthHandler<PickingTaskRouteContext>(async (request, auth, context) => {
  return getPickingTaskDetail(request, auth, context)
})
