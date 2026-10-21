'use client'

import { useState, useEffect, use } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { RoleForm } from '@/components/roles/role-form'
import { PagePermissionGuard } from '@/components/ui/page-permission-guard'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { CreateRoleInput } from '@/lib/validations/role'

interface ParentRole {
  id: string
  roleName: string
  roleCode: string
}

interface RoleData {
  id: string
  roleCode: string
  roleName: string
  description: string | null
  roleLevel: number
  parentRoleId: string | null
  isSystem: boolean
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditRolePage({ params }: PageProps) {
  const { id } = use(params)
  const t = useTranslations('role')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: t('title'), href: '/roles' },
  })
  const router = useRouter()

  const [role, setRole] = useState<RoleData | null>(null)
  const [parentRoles, setParentRoles] = useState<ParentRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    Promise.all([fetchRole(), fetchParentRoles()])
  }, [id])

  const fetchRole = async () => {
    try {
      const response = await fetch(`/api/v1/roles/${id}`)
      const data = await response.json()
      if (data.success) {
        setRole(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch role:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchParentRoles = async () => {
    try {
      const response = await fetch('/api/v1/roles?all=true')
      const data = await response.json()
      if (data.success) {
        // 过滤掉当前角色，避免自己成为自己的父角色
        setParentRoles(data.data.filter((r: ParentRole) => r.id !== id))
      }
    } catch (error) {
      console.error('Failed to fetch parent roles:', error)
    }
  }

  const handleSubmit = async (data: CreateRoleInput) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/v1/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('updateSuccess'))
        router.push(`/roles/${id}`)
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch (error) {
      console.error('Failed to update role:', error)
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

  if (!role) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {tCommon('noData')}
      </div>
    )
  }

  return (
    <PagePermissionGuard permission="role:update">
      <div className="space-y-4">
        <Breadcrumb items={breadcrumb.current(t('edit'))} />

        <Card>
          <CardHeader>
            <CardTitle>{t('edit')}: {role.roleName}</CardTitle>
          </CardHeader>
          <CardContent>
            <RoleForm
              initialData={{
                roleCode: role.roleCode,
                roleName: role.roleName,
                description: role.description,
                roleLevel: role.roleLevel,
                parentRoleId: role.parentRoleId,
              }}
              parentRoles={parentRoles}
              onSubmit={handleSubmit}
              isLoading={isSaving}
            />
          </CardContent>
        </Card>
      </div>
    </PagePermissionGuard>
  )
}
