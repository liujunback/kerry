import { PickingExceptionsPageContent } from '@/components/picking-exceptions/picking-exceptions-page-content'
import { requireAnyPermission } from '@/lib/auth/permissions'

export default async function PickingExceptionsPage() {
  await requireAnyPermission(['picking-exception:read', 'picking:read'])

  return <PickingExceptionsPageContent />
}
