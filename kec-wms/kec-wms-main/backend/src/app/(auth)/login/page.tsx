import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { resolveLocale } from '@/i18n/request'
import { LoginForm } from '@/components/auth/login-form'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ThemeSettings } from '@/components/theme-settings'
import { Warehouse, Package, Truck, BarChart3 } from 'lucide-react'

export default async function LoginPage() {
  const cookieStore = await cookies()
  const locale = resolveLocale(cookieStore.get('locale')?.value)
  const t = await getTranslations('auth')

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Warehouse className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">KEC WMS</h1>
                <p className="text-white/80 text-sm">{t('brandSubtitle')}</p>
              </div>
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
              {t('heroTitleLine1')}<br />{t('heroTitleLine2')}
            </h2>
            <p className="text-lg text-white/80 max-w-md">
              {t('heroDescription')}
            </p>
          </div>

          {/* Feature Icons */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="flex items-center gap-3 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <Package className="h-8 w-8 text-white/90" />
              <div>
                <p className="font-semibold">{t('features.inventory.title')}</p>
                <p className="text-sm text-white/70">{t('features.inventory.description')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <Truck className="h-8 w-8 text-white/90" />
              <div>
                <p className="font-semibold">{t('features.flow.title')}</p>
                <p className="text-sm text-white/70">{t('features.flow.description')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <BarChart3 className="h-8 w-8 text-white/90" />
              <div>
                <p className="font-semibold">{t('features.analytics.title')}</p>
                <p className="text-sm text-white/70">{t('features.analytics.description')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <Warehouse className="h-8 w-8 text-white/90" />
              <div>
                <p className="font-semibold">{t('features.multiWarehouse.title')}</p>
                <p className="text-sm text-white/70">{t('features.multiWarehouse.description')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen bg-background">
        {/* Top Bar */}
        <div className="flex justify-end items-center p-4 gap-2">
          <ThemeSettings />
          <LanguageSwitcher currentLocale={locale} />
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="p-3 bg-primary rounded-xl">
                <Warehouse className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">KEC WMS</h1>
                <p className="text-muted-foreground text-sm">{t('mobileSubtitle')}</p>
              </div>
            </div>

            <LoginForm />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-sm text-muted-foreground">
          © 2024 KEC WMS. All rights reserved.
        </div>
      </div>
    </div>
  )
}
