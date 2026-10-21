import { DashboardClient } from '@/components/dashboard-client'
import { Header } from '@/components/header'
import { Watermark } from '@/components/watermark'
import { resolveLocale } from '@/i18n/request'
import { auth } from '@/lib/auth/config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const cookieStore = await cookies()
  const locale = resolveLocale(cookieStore.get('locale')?.value)

  if (!session) {
    redirect('/login')
  }

  // 水印基础文本：用户名 + 租户；日期时间由 Watermark 组件按客户端时间追加
  const watermarkText = `${session.user.username} · ${session.user.tenantCode}`

  return (
    <DashboardClient>
      <Watermark text={watermarkText} />

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        <Header
          user={{
            id: session.user.id,
            name: session.user.name,
            username: session.user.username,
            tenantName: session.user.tenantName,
          }}
          locale={locale}
        />

        {/* 主内容区 */}
        <main className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
          {children}
        </main>
      </div>
    </DashboardClient>
  )
}
