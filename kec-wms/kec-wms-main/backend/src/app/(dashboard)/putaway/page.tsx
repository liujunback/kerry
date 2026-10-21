'use client'

import { Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { PutawayManagementPage } from '@/components/putaway'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

function PutawayPageContent() {
  const t = useTranslations('menuGroup')
  const tPutaway = useTranslations('putaway')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: t('inbound') }, { label: t('putawayGroup') }],
    module: { label: tPutaway('orderList'), href: '/putaway' },
  })

  return (
    <div className="flex flex-col h-full gap-2">
      <Breadcrumb items={breadcrumb.list()} />
      <div className="flex-1 min-h-0">
        <PutawayManagementPage />
      </div>
    </div>
  )
}

export default function PutawayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PutawayPageContent />
    </Suspense>
  )
}
