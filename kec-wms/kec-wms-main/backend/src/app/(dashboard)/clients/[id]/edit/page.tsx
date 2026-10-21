import { ClientForm } from '@/components/clients/client-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { notFound,redirect } from 'next/navigation'
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('client')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/clients' },
  })

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const client = await prisma.client.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  if (!client) {
    notFound()
  }

  const initialData = {
    id: client.id,
    clientCode: client.clientCode,
    clientName: client.clientName,
    shortName: client.shortName || '',
    clientType: client.clientType,
    contactPerson: client.contactPerson || '',
    contactPhone: client.contactPhone || '',
    contactEmail: client.contactEmail || '',
    address: client.address || '',
    city: client.city || '',
    province: client.province || '',
    country: client.country,
    postalCode: client.postalCode || '',
    taxNumber: client.taxNumber || '',
    bankName: client.bankName || '',
    bankAccount: client.bankAccount || '',
    creditLimit: client.creditLimit ? client.creditLimit.toString() : '',
    paymentTerms: client.paymentTerms.toString(),
    notes: client.notes || '',
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('edit'))} />
      <ClientForm mode="edit" initialData={initialData} />
    </div>
  )
}
