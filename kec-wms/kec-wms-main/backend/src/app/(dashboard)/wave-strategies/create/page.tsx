import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StrategyConfigForm } from '@/components/wave-strategies/strategy-config-form'

export default async function CreateWaveStrategyPage() {
  const session = await auth()
  const tPage = await getTranslations('waveStrategyPage')
  const tConfig = await getTranslations('waveStrategyConfigForm')
  if (!session) {
    redirect('/login')
  }

  await requirePermission('wave:create')

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: tPage('breadcrumb.outbound'), href: '/orders' }, { label: tPage('title'), href: '/wave-strategies' }, { label: tConfig('titles.create') }]} />
      <StrategyConfigForm mode="create" />
    </div>
  )
}
