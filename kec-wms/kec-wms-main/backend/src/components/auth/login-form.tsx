'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff, Building2, User, Lock } from 'lucide-react'
import { clearPermissionCache } from '@/contexts/permission-context'
import {
  clearWarehouseSelectionCache,
  persistWarehouseSelection,
} from '@/contexts/warehouse-context'

const AUTH_ERROR_CODE_SEPARATOR = ':'

function getAuthErrorMessage(
  error: string | undefined,
  code: string | undefined,
  t: ReturnType<typeof useTranslations>
) {
  if (code) {
    const [key, detail] = code.split(AUTH_ERROR_CODE_SEPARATOR)

    switch (key) {
      case 'pleaseInputComplete':
        return t('pleaseInputComplete')
      case 'tooManyRequests':
        return t('tooManyRequests')
      case 'tenantNotFound':
        return t('tenantNotFound')
      case 'userNotFound':
        return t('userNotFound')
      case 'accountDisabled':
        return t('accountDisabled')
      case 'accountLocked':
        return t('accountLocked')
      case 'accountSuspended':
        return t('accountSuspended')
      case 'accountLockedMinutes':
        return t('accountLockedMinutes', { minutes: detail ?? '0' })
      case 'wrongPassword':
        return t('wrongPassword', { remaining: detail ?? '0' })
      default:
        break
    }
  }

  if (error === 'CredentialsSignin') {
    return t('userNotFound')
  }

  return t('loginFailed')
}

export function LoginForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    tenantCode: 'DEFAULT',
    username: '',
    password: '',
  })

  const routeAfterLogin = async () => {
    const profileResponse = await fetch('/api/v1/auth/me')
    const profileResult = await profileResponse.json()

    if (!profileResponse.ok || !profileResult.success || !profileResult.data) {
      throw new Error('Failed to fetch auth profile')
    }

    const warehouseBindings = profileResult.data.warehouseBindings || []

    clearPermissionCache()
    clearWarehouseSelectionCache()

    if (warehouseBindings.length > 1) {
      router.replace('/select-warehouse')
      router.refresh()
      return
    }

    const tenantId = profileResult.data.tenant?.id
    const userId = profileResult.data.id
    const warehouseId = profileResult.data.defaultWarehouseId || warehouseBindings[0]?.warehouseId || ''

    if (tenantId && userId && warehouseId) {
      persistWarehouseSelection(tenantId, userId, warehouseId)
    }

    router.replace('/dashboard')
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        tenantCode: formData.tenantCode,
        username: formData.username,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError(getAuthErrorMessage(result.error, result.code, t))
      } else {
        await routeAfterLogin()
      }
    } catch (err) {
      setError(t('loginFailed'))
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t('loginTitle')}</h1>
        <p className="text-muted-foreground">{t('loginSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tenantCode" className="text-sm font-medium">
            {t('tenantCode')}
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="tenantCode"
              name="tenantCode"
              placeholder={t('tenantCodePlaceholder')}
              value={formData.tenantCode}
              onChange={handleInputChange}
              disabled={isLoading}
              className="h-11 pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium">
            {t('username')}
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="username"
              name="username"
              placeholder={t('usernamePlaceholder')}
              value={formData.username}
              onChange={handleInputChange}
              disabled={isLoading}
              autoComplete="username"
              className="h-11 pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            {t('password')}
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder={t('passwordPlaceholder')}
              value={formData.password}
              onChange={handleInputChange}
              disabled={isLoading}
              autoComplete="current-password"
              className="h-11 pl-10 pr-10"
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
            {error}
          </div>
        )}

        <Button type="submit" className="h-11 w-full text-base font-medium" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('loggingIn')}
            </>
          ) : (
            t('loginButton')
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('secureLogin')}</span>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">{t('securityNotice')}</p>
    </div>
  )
}
