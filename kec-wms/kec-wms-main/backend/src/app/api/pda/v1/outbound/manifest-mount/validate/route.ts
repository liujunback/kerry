import { createAuthHandler } from '@/lib/api/create-handler'
import { handleManifestMountValidate } from '@/lib/manifest-mount/validate-handler'

export const POST = createAuthHandler(async (request, auth) => {
  return handleManifestMountValidate(request, auth, { requirePermission: true })
})
