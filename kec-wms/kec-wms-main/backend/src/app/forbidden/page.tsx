import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ShieldX, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function ForbiddenPage() {
  const t = await getTranslations('permission')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-destructive/10 rounded-full">
            <ShieldX className="h-16 w-16 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">403</h1>
          <p className="text-xl text-muted-foreground">{t('noAccess')}</p>
          <p className="text-sm text-muted-foreground">{t('contactAdmin')}</p>
        </div>
        <Link href="/dashboard">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回首页
          </Button>
        </Link>
      </div>
    </div>
  )
}
