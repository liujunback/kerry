import { PickAssignmentRulesPageContent } from '@/components/pick-assignment/pick-assignment-rules-page'
import { requirePermission } from '@/lib/auth/permissions'

export default async function PickAssignmentRulesPage() {
  await requirePermission('pick-assignment-rule:read')

  return <PickAssignmentRulesPageContent />
}
