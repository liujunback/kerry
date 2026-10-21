'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { RoleForm } from '@/components/roles/role-form'
import { PagePermissionGuard } from '@/components/ui/page-permission-guard'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { toast } from 'sonner'
import type { CreateRoleInput } from '@/lib/validations/role'

interface ParentRole {
  id: string
  roleName: string
  roleCode: string
}

export default function CreateRolePage() {
  const t = useTranslations('role')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: t('title'), href: '/roles' },
  })
  const router = useRouter()

  const [parentRoles, setParentRoles] = useState<ParentRole[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchParentRoles()
  }, [])

  const fetchParentRoles = async () => {
    try {
      const response = await fetch('/api/v1/roles?all=true')
      const data = await response.json()
      if (data.success) {
        setParentRoles(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch parent roles:', error)
    }
  }

  const handleSubmit = async (data: CreateRoleInput) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('createSuccess'))
        router.push('/roles')
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch (error) {
      console.error('Failed to create role:', error)
      toast.error(tCommon('error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PagePermissionGuard permission="role:create">
      <div className="space-y-4">
        <Breadcrumb items={breadcrumb.current(t('create'))} />

        <Card>
          <CardHeader>
            <CardTitle>{t('create')}</CardTitle>
          </CardHeader>
          <CardContent>
            <RoleForm
              parentRoles={parentRoles}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </PagePermissionGuard>
  )
}
