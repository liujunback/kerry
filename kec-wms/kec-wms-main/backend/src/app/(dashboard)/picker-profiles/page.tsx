import { PickerProfilesPageContent } from '@/components/pick-assignment/picker-profiles-page'
import { requirePermission } from '@/lib/auth/permissions'

export default async function PickerProfilesPage() {
  await requirePermission('picker-profile:read')

  return <PickerProfilesPageContent />
}
