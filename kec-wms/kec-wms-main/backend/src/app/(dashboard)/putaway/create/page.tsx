import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth/config'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { CreatePutawayPage } from '@/components/putaway/create-putaway-page'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

export default async function CreatePutawayOrderPage() {
  const session = await auth()
  const t = await getTranslations('menuGroup')
  const tPutaway = await getTranslations('putaway')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: t('inbound') }, { label: t('putawayGroup') }],
    module: { label: tPutaway('orderList'), href: '/putaway' },
  })

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <Breadcrumb items={breadcrumb.current(tPutaway('createPutawayOrder'))} />
      <div className="flex-1 min-h-0">
        <CreatePutawayPage />
      </div>
    </div>
  )
}
