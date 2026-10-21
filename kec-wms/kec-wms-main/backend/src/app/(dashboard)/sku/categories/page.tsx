import { SkuCategoryManager } from '@/components/sku/sku-category-manager'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SkuCategoriesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const t = await getTranslations('sku')
  const tMenuGroup = await getTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/sku' },
  })

  const categories = await prisma.skuCategory.findMany({
    where: {
      tenantId: session.user.tenantId,
    },
    select: {
      id: true,
      categoryCode: true,
      categoryName: true,
      parentId: true,
      level: true,
      path: true,
      sortOrder: true,
      isActive: true,
      description: true,
      createdAt: true,
      _count: {
        select: { skus: true },
      },
    },
    orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { categoryCode: 'asc' }],
  })

  // Build tree structure
  interface CategoryNode {
    id: string
    categoryCode: string
    categoryName: string
    parentId: string | null
    level: number
    path: string | null
    sortOrder: number
    isActive: boolean
    description: string | null
    createdAt: Date
    _count: { skus: number }
    children: CategoryNode[]
  }

  const buildTree = (items: Omit<CategoryNode, 'children'>[]): CategoryNode[] => {
    const map = new Map<string, CategoryNode>()
    const roots: CategoryNode[] = []

    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] })
    })

    items.forEach((item) => {
      const node = map.get(item.id)!
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    })

    return roots
  }

  const categoryTree = buildTree(categories)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.current(t('categories.title'))} />
      </div>

      <SkuCategoryManager initialCategories={categoryTree} />
    </div>
  )
}
