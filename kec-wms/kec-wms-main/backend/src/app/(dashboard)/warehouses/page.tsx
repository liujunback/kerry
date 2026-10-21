import { WarehousesPageContent } from '@/components/warehouses/warehouses-page-content'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'

export default async function WarehousesPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  await requirePermission('warehouse:read')

  return <WarehousesPageContent />
}
