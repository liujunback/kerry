import { ZonesPageContent } from '@/components/zones/zones-page-content'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'

export default async function ZonesPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  await requirePermission('zone:read')
  return <ZonesPageContent />
}
