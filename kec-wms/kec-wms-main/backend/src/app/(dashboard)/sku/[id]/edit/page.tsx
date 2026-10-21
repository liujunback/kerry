import { SkuForm } from '@/components/sku/sku-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { notFound,redirect } from 'next/navigation'
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditSkuPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('sku')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/sku' },
  })

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const sku = await prisma.sku.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  if (!sku) {
    notFound()
  }

  const initialData = {
    id: sku.id,
    skuCode: sku.skuCode,
    skuName: sku.skuName,
    barcode: sku.barcode || '',
    clientId: sku.clientId,
    categoryId: sku.categoryId || '',
    unit: sku.unit,
    lengthCm: sku.lengthCm?.toString() || '',
    widthCm: sku.widthCm?.toString() || '',
    heightCm: sku.heightCm?.toString() || '',
    weightKg: sku.weightKg?.toString() || '',
    unitPrice: sku.unitPrice?.toString() || '',
    currency: sku.currency || 'CNY',
    storageCondition: sku.storageCondition || 'NORMAL',
    isBatchManaged: sku.isBatchManaged,
    isSerialManaged: sku.isSerialManaged,
    isExpiryManaged: sku.isExpiryManaged,
    isSelfPackaged: sku.isSelfPackaged,
    notes: sku.notes || '',
    isFirstReceiving: sku.isFirstReceiving,
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(t('edit'))} />
      <SkuForm initialData={initialData} />
    </div>
  )
}
