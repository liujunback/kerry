import { createAuthHandler, type RouteContext } from '@/lib/api/create-handler'
import { postCompletePickingTask } from '@/lib/picking/pda-handler'

type PickingTaskRouteContext = RouteContext<{ id: string }>

export const POST = createAuthHandler<PickingTaskRouteContext>(async (request, auth, context) => {
  return postCompletePickingTask(request, auth, context)
})
