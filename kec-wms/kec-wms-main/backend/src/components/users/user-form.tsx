'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { readListContext } from '@/lib/navigation/list-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UserFormProps {
  user?: {
    id: string
    username: string
    fullName: string
    email?: string | null
    phone?: string | null
    employeeId?: string | null
    department?: string | null
    position?: string | null
    userType: string
  }
  mode: 'create' | 'edit'
  currentUserType?: string
}

const userTypes = ['INTERNAL', 'EXTERNAL', 'SYSTEM', 'API'] as const

export function UserForm({ user, mode, currentUserType }: UserFormProps) {
  const router = useRouter()
  const t = useTranslations('users')
  const tCommon = useTranslations('common')
  const safeReturnTo = readListContext('users', '/users')

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: user?.username || '',
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    employeeId: user?.employeeId || '',
    department: user?.department || '',
    position: user?.position || '',
    userType: user?.userType || 'INTERNAL',
    password: '',
  })

  // 根据当前用户权限过滤可用的用户类型
  // 只有 SYSTEM 类型的用户才能创建 SYSTEM 类型的账号
  const availableUserTypes = useMemo(() => {
    if (currentUserType === 'SYSTEM') {
      return userTypes
    }
    // 非系统管理员不能创建系统用户
    return userTypes.filter((type) => type !== 'SYSTEM')
  }, [currentUserType])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = mode === 'create' ? '/api/v1/users' : `/api/v1/users/${user?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const body = mode === 'create' ? formData : {
        username: formData.username,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        employeeId: formData.employeeId,
        department: formData.department,
        position: formData.position,
        userType: formData.userType,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(mode === 'create' ? t('createSuccess') : t('updateSuccess'))
        router.push(safeReturnTo)
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('username')} *</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder={t('usernamePlaceholder')}
                required
                disabled={mode === 'edit'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">{t('fullName')} *</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder={t('fullNamePlaceholder')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder={t('emailPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone')}</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder={t('phonePlaceholder')}
              />
            </div>
          </div>

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')} *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder={t('passwordPlaceholder')}
                required
              />
              <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('workInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">{t('employeeId')}</Label>
              <Input
                id="employeeId"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                placeholder={t('employeeIdPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">{t('department')}</Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder={t('departmentPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">{t('position')}</Label>
              <Input
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                placeholder={t('positionPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userType">{t('userType')} *</Label>
              <Select
                value={formData.userType}
                onValueChange={(value) => handleSelectChange('userType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('userTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {availableUserTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`userTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.push(safeReturnTo)}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? tCommon('loading') : tCommon('save')}
        </Button>
      </div>
    </form>
  )
}
