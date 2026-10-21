'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Category {
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
  children: Category[]
}

interface SkuCategoryManagerProps {
  initialCategories: Category[]
}

interface FormData {
  categoryCode: string
  categoryName: string
  parentId: string
  sortOrder: string
  description: string
}

export function SkuCategoryManager({ initialCategories }: SkuCategoryManagerProps) {
  const router = useRouter()
  const t = useTranslations('sku')
  const tCommon = useTranslations('common')

  const categories = initialCategories
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    categoryCode: '',
    categoryName: '',
    parentId: '__none__',
    sortOrder: '0',
    description: '',
  })

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const flattenCategories = (cats: Category[], prefix = ''): { id: string; name: string }[] => {
    const result: { id: string; name: string }[] = []
    cats.forEach((cat) => {
      result.push({ id: cat.id, name: prefix + cat.categoryName })
      if (cat.children.length > 0) {
        result.push(...flattenCategories(cat.children, prefix + '  '))
      }
    })
    return result
  }

  const openCreateDialog = (parentId?: string) => {
    setEditingCategory(null)
    setFormData({
      categoryCode: '',
      categoryName: '',
      parentId: parentId || '__none__',
      sortOrder: '0',
      description: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      parentId: category.parentId || '__none__',
      sortOrder: category.sortOrder.toString(),
      description: category.description || '',
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const url = editingCategory
        ? `/api/v1/sku-categories/${editingCategory.id}`
        : '/api/v1/sku-categories'

      const response = await fetch(url, {
        method: editingCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sortOrder: parseInt(formData.sortOrder) || 0,
          parentId: formData.parentId === '__none__' ? null : formData.parentId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(editingCategory ? t('categories.updateSuccess') : t('categories.createSuccess'))
        setDialogOpen(false)
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return

    setLoading(true)
    try {
      const response = await fetch(`/api/v1/sku-categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('categories.deleteSuccess'))
        setDeleteDialogOpen(false)
        setCategoryToDelete(null)
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  const renderCategoryNode = (category: Category, depth = 0) => {
    const hasChildren = category.children.length > 0
    const isExpanded = expandedIds.has(category.id)

    return (
      <div key={category.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md group"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <button
            onClick={() => hasChildren && toggleExpand(category.id)}
            className="w-5 h-5 flex items-center justify-center"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : (
              <span className="w-4" />
            )}
          </button>

          <FolderTree className="h-4 w-4 text-muted-foreground" />

          <span className="font-medium">{category.categoryName}</span>
          <span className="text-sm text-muted-foreground">({category.categoryCode})</span>

          {!category.isActive && (
            <Badge variant="secondary">{t('status.INACTIVE')}</Badge>
          )}

          <span className="text-xs text-muted-foreground ml-auto mr-2">
            {category._count.skus} SKU
          </span>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openCreateDialog(category.id)}
              title={t('categories.addChild')}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDialog(category)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryToDelete(category)
                setDeleteDialogOpen(true)
              }}
              disabled={category._count.skus > 0 || category.children.length > 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const flatCategories = flattenCategories(categories)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('categories.list')}</CardTitle>
          <Button onClick={() => openCreateDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            {t('categories.create')}
          </Button>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('categories.empty')}
            </div>
          ) : (
            <div className="space-y-1">
              {categories.map((category) => renderCategoryNode(category))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('categories.edit') : t('categories.create')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('categories.parentCategory')}</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                disabled={!!editingCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('categories.selectParent')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('categories.noParent')}</SelectItem>
                  {flatCategories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('categories.code')} *</Label>
                <Input
                  value={formData.categoryCode}
                  onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value })}
                  placeholder={t('categories.codePlaceholder')}
                  disabled={!!editingCategory}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('categories.name')} *</Label>
                <Input
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  placeholder={t('categories.namePlaceholder')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('categories.sortOrder')}</Label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('categories.description')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('categories.descriptionPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? tCommon('loading') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('categories.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('categories.confirmDeleteDesc', { name: categoryToDelete?.categoryName || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {tCommon('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
