import { SortingPage } from '@/components/sorting/sorting-page'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'

export default async function SortingPageRoute() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  await requirePermission('sorting-wall:read')

  return <SortingPage />
}
