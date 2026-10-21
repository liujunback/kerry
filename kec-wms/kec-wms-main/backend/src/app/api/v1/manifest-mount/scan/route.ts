import { createAuthHandler } from '@/lib/api/create-handler'
import { handleManifestMountScan } from '@/lib/manifest-mount/scan-handler'

export const POST = createAuthHandler(async (request, auth) => {
  return handleManifestMountScan(request, auth)
})
