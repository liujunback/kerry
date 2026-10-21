import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { requirePermission } from '@/lib/auth/permissions'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StrategyConfigForm } from '@/components/wave-strategies/strategy-config-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditWaveStrategyPage({ params }: PageProps) {
  const session = await auth()
  const tPage = await getTranslations('waveStrategyPage')
  const tConfig = await getTranslations('waveStrategyConfigForm')
  if (!session) {
    redirect('/login')
  }

  await requirePermission('wave:update')
  const { id } = await params

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: tPage('breadcrumb.outbound'), href: '/orders' }, { label: tPage('title'), href: '/wave-strategies' }, { label: tConfig('titles.edit') }]} />
      <StrategyConfigForm mode="edit" strategyId={id} />
    </div>
  )
}
