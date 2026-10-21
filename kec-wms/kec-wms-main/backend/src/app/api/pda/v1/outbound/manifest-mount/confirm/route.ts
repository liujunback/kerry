import { createAuthHandler } from '@/lib/api/create-handler'
import { handleManifestMountConfirm } from '@/lib/manifest-mount/confirm-handler'

export const POST = createAuthHandler(async (request, auth) => {
  return handleManifestMountConfirm(request, auth, { requirePermission: true })
})
