import { createAuthHandler, type RouteContext } from '@/lib/api/create-handler'
import { postPickTaskLine } from '@/lib/picking/pda-handler'

type PickingTaskLineRouteContext = RouteContext<{ id: string; lineId: string }>

export const POST = createAuthHandler<PickingTaskLineRouteContext>(async (request, auth, context) => {
  return postPickTaskLine(request, auth, context)
})
