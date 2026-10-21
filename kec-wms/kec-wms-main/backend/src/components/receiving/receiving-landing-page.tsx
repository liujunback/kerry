'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Package, Boxes } from 'lucide-react'

export function ReceivingLandingPage() {
  const t = useTranslations('receiving')
  const tMenuGroup = useTranslations('menuGroup')
  const searchParams = useSearchParams()
  const asnNumber = searchParams.get('asn')

  // 构建带ASN参数的链接
  const getHref = (basePath: string) => {
    return asnNumber ? `${basePath}?asn=${encodeURIComponent(asnNumber)}` : basePath
  }

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: tMenuGroup('inbound'), href: '/asn' },
          { label: t('title') },
        ]}
      />

      {asnNumber && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-3xl">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t('landing.asnSelected')}: <span className="font-mono font-medium">{asnNumber}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* SKU 收货卡片 */}
        <Link href={getHref('/receiving/sku')}>
          <Card className="hover:border-primary cursor-pointer transition-colors h-full">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex-shrink-0">
                <Package className="h-12 w-12 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t('landing.skuMode.title')}</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {t('landing.skuMode.description')}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 容器收货卡片 */}
        <Link href={getHref('/receiving/container')}>
          <Card className="hover:border-primary cursor-pointer transition-colors h-full">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex-shrink-0">
                <Boxes className="h-12 w-12 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t('landing.containerMode.title')}</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {t('landing.containerMode.description')}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
