import { createAuthHandler, type RouteContext } from '@/lib/api/create-handler'
import { postBindPickingContainer } from '@/lib/picking/pda-handler'

type PickingTaskRouteContext = RouteContext<{ id: string }>

export const POST = createAuthHandler<PickingTaskRouteContext>(async (request, auth, context) => {
  return postBindPickingContainer(request, auth, context)
})
