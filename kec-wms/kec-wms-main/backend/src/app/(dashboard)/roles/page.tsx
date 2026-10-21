'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { RoleTable } from '@/components/roles/role-table'
import { PagePermissionGuard } from '@/components/ui/page-permission-guard'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
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
import { toast } from 'sonner'
import { Plus, Search, Loader2 } from 'lucide-react'

interface Role {
  id: string
  roleCode: string
  roleName: string
  description: string | null
  roleLevel: number
  isSystem: boolean
  isActive: boolean
  createdAt: Date | string
  _count: {
    userRoles: number
    rolePermissions: number
  }
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function RolesPage() {
  const t = useTranslations('role')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: t('title'), href: '/roles' },
  })
  const router = useRouter()

  const [roles, setRoles] = useState<Role[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [deleteRole, setDeleteRole] = useState<Role | null>(null)

  const fetchRoles = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        ...(search && { search }),
      })

      const response = await fetch(`/api/v1/roles?${params}`)
      const data = await response.json()

      if (data.success) {
        setRoles(data.data)
        if (data.pagination) {
          setPagination(data.pagination)
        }
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
      toast.error(tCommon('error'))
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize, search, tCommon])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchRoles()
  }

  const handleDelete = async () => {
    if (!deleteRole) return

    try {
      const response = await fetch(`/api/v1/roles/${deleteRole.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success(t('deleteSuccess'))
        fetchRoles()
      } else {
        toast.error(data.message || tCommon('error'))
      }
    } catch (error) {
      console.error('Failed to delete role:', error)
      toast.error(tCommon('error'))
    } finally {
      setDeleteRole(null)
    }
  }

  return (
    <PagePermissionGuard permission="role:read">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Breadcrumb items={breadcrumb.list()} />
          <Button onClick={() => router.push('/roles/create')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('create')}
          </Button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            {tCommon('search')}
          </Button>
        </form>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <RoleTable roles={roles} onDelete={setDeleteRole} />

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {tCommon('total', { count: pagination.total })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    上一页                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    下一页                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <AlertDialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('delete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('confirmDelete')}
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
      </div>
    </PagePermissionGuard>
  )
}

