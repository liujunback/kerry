import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { RecentActivities } from '@/components/dashboard/recent-activities'
import { InventoryAlerts } from '@/components/dashboard/inventory-alerts'
import { DashboardTrends } from '@/components/dashboard/dashboard-trends'

export default async function DashboardPage() {
  const session = await auth()
  const t = await getTranslations('dashboard')
  const tAuth = await getTranslations('auth')

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="space-y-4">
      {/* 欢迎信息 */}
      <div className="bg-card rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3 text-card-foreground">
          {t('welcome', { name: session.user.name || session.user.username })}
        </h2>

        {session.user.passwordExpired && (
          <div className="mb-3 p-3 bg-accent border border-border rounded-md">
            <p className="text-sm text-accent-foreground">{tAuth('passwordExpired')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <h3 className="text-sm font-medium text-primary">{t('tenantInfo')}</h3>
            <p className="text-xs text-primary/80 mt-1">
              {session.user.tenantCode} - {session.user.tenantName}
            </p>
          </div>
          <div className="p-3 bg-secondary rounded-lg">
            <h3 className="text-sm font-medium text-secondary-foreground">{t('usernameLabel')}</h3>
            <p className="text-xs text-secondary-foreground/80 mt-1">{session.user.username}</p>
          </div>
          <div className="p-3 bg-accent rounded-lg">
            <h3 className="text-sm font-medium text-accent-foreground">{t('userType')}</h3>
            <p className="text-xs text-accent-foreground/80 mt-1">
              {t(`userTypes.${session.user.userType}`, { defaultValue: session.user.userType })}
            </p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <DashboardStats />

      {/* 业务趋势图表 */}
      <DashboardTrends />

      {/* 预警和最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InventoryAlerts />
        <RecentActivities />
      </div>
    </div>
  )
}
