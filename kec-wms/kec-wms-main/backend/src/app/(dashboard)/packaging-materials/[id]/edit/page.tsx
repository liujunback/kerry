import { PackagingMaterialForm } from '@/components/packaging-materials/packaging-material-form'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { notFound,redirect } from 'next/navigation'
interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditPackagingMaterialPage({ params }: PageProps) {
  const session = await auth()
  const t = await getTranslations('packagingMaterial')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [
      { label: tMenuGroup('outbound') },
      { label: tMenuGroup('packagingMaterial') },
    ],
    module: { label: t('title'), href: '/packaging-materials' },
  })

  if (!session) {
    redirect('/login')
  }

  const { id } = await params

  const material = await prisma.packagingMaterial.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  if (!material) {
    notFound()
  }

  const initialData = {
    id: material.id,
    materialCode: material.materialCode,
    materialName: material.materialName,
    materialType: material.materialType,
    specification: material.specification || '',
    lengthCm: material.lengthCm ? String(material.lengthCm) : '',
    widthCm: material.widthCm ? String(material.widthCm) : '',
    heightCm: material.heightCm ? String(material.heightCm) : '',
    weightKg: material.weightKg ? String(material.weightKg) : '',
    maxLoadWeightKg: material.maxLoadWeightKg ? String(material.maxLoadWeightKg) : '',
    unit: material.unit,
    unitPrice: material.unitPrice ? String(material.unitPrice) : '',
    currency: material.currency || 'CNY',
    supplierName: material.supplierName || '',
    barcode: material.barcode || '',
    source: material.source,
    isReusable: material.isReusable,
    notes: material.notes || '',
  }

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={breadcrumb.append([
          { label: t('detail'), href: `/packaging-materials/${id}` },
          { label: t('edit') },
        ])}
      />
      <PackagingMaterialForm mode="edit" initialData={initialData} />
    </div>
  )
}
