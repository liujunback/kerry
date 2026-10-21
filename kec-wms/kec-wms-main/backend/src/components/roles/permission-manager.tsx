'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Search, X, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/contexts/permission-context'

interface Permission {
  id: string
  permissionCode: string
  permissionName: string
  description: string | null
  resourceType: string
  action: string
  category: string
}

interface PermissionCategory {
  category: string
  permissions: Permission[]
}

interface PermissionManagerProps {
  roleId: string
  initialPermissionIds?: string[]
  onUpdate?: () => void
}

export function PermissionManager({ roleId, initialPermissionIds = [], onUpdate }: PermissionManagerProps) {
  const t = useTranslations('permissions')
  const tCommon = useTranslations('common')
  const { refreshPermissions } = usePermissions()
  const [categories, setCategories] = useState<PermissionCategory[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialPermissionIds))
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPermissions()
  }, [])

  useEffect(() => {
    setSelectedIds(new Set(initialPermissionIds))
  }, [initialPermissionIds])

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/v1/permissions')
      const data = await response.json()
      if (data.success) {
        setCategories(data.data.categories)
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTogglePermission = (permissionId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId)
    } else {
      newSelected.add(permissionId)
    }
    setSelectedIds(newSelected)
  }

  const handleToggleCategory = (category: PermissionCategory) => {
    const categoryPermissionIds = category.permissions.map((p) => p.id)
    const allSelected = categoryPermissionIds.every((id) => selectedIds.has(id))

    const newSelected = new Set(selectedIds)
    if (allSelected) {
      categoryPermissionIds.forEach((id) => newSelected.delete(id))
    } else {
      categoryPermissionIds.forEach((id) => newSelected.add(id))
    }
    setSelectedIds(newSelected)
  }

  const handleSelectAll = () => {
    const allIds = categories.flatMap((c) => c.permissions.map((p) => p.id))
    setSelectedIds(new Set(allIds))
  }

  const handleDeselectAll = () => {
    setSelectedIds(new Set())
  }

  // 搜索过滤逻辑
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories

    return categories
      .map(category => ({
        ...category,
        permissions: category.permissions.filter(p =>
          p.permissionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.permissionCode.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }))
      .filter(category => category.permissions.length > 0)
  }, [categories, searchTerm])

  // 折叠控制函数
  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryKey)) {
        newSet.delete(categoryKey)
      } else {
        newSet.add(categoryKey)
      }
      return newSet
    })
  }

  const expandAll = () => {
    setExpandedCategories(new Set(filteredCategories.map(c => c.category)))
  }

  const collapseAll = () => {
    setExpandedCategories(new Set())
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/v1/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: Array.from(selectedIds) }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success(t('updateSuccess'))
        // 强制刷新当前用户的权限缓存
        await refreshPermissions()
        onUpdate?.()
      } else {
        toast.error(data.message || tCommon('error'))
      }
    } catch (error) {
      console.error('Failed to save permissions:', error)
      toast.error(tCommon('error'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {t('selectAll')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            {t('deselectAll')}
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={expandAll}>
            {t('expandAll')}
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            {t('collapseAll')}
          </Button>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {tCommon('save')}
        </Button>
      </div>

      {/* 搜索结果提示 */}
      {searchTerm && (
        <div className="text-sm text-muted-foreground">
          {t('searchResult', { count: filteredCategories.reduce((acc, c) => acc + c.permissions.length, 0) })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => {
          const categoryPermissionIds = category.permissions.map((p) => p.id)
          const selectedCount = categoryPermissionIds.filter((id) => selectedIds.has(id)).length
          const allSelected = selectedCount === categoryPermissionIds.length && categoryPermissionIds.length > 0
          const isExpanded = expandedCategories.has(category.category)

          return (
            <Card
              key={category.category}
              className="overflow-hidden transition-shadow duration-200 hover:shadow-md"
            >
              <CardHeader
                className={cn(
                  "pb-3 cursor-pointer select-none transition-colors hover:bg-muted/50",
                  isExpanded && "border-b"
                )}
                onClick={() => toggleCategory(category.category)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-sm font-medium">
                      {category.category}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {selectedCount}/{categoryPermissionIds.length}
                    </span>
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => handleToggleCategory(category)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </CardHeader>
              <div
                className={cn(
                  "grid transition-all duration-200",
                  isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <CardContent className="pt-3 space-y-1">
                    {category.permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <label
                          htmlFor={permission.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {permission.permissionName}
                        </label>
                        <Checkbox
                          id={permission.id}
                          checked={selectedIds.has(permission.id)}
                          onCheckedChange={() => handleTogglePermission(permission.id)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? t('noSearchResult') : t('noPermissions')}
        </div>
      )}
    </div>
  )
}
