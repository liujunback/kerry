'use client'

import { ReactNode } from 'react'
import { PermissionProvider } from '@/contexts/permission-context'
import { WarehouseProvider, useWarehouseContext } from '@/contexts/warehouse-context'
import { Sidebar } from '@/components/sidebar'
// import { FloatingQuickAccess } from '@/components/floating-quick-access'

interface DashboardClientProps {
  children: ReactNode
}

function WarehouseScopedContent({ children }: DashboardClientProps) {
  const { selectedWarehouseId } = useWarehouseContext()

  return (
    <div key={selectedWarehouseId || 'no-warehouse'} className="contents">
      {children}
    </div>
  )
}

export function DashboardClient({ children }: DashboardClientProps) {
  return (
    <PermissionProvider>
      <WarehouseProvider>
        <div className="flex h-screen bg-background">
          {/* 左侧菜单 */}
          <Sidebar />

          {/* 右侧内容区 */}
          <WarehouseScopedContent>{children}</WarehouseScopedContent>

          {/* 浮动快捷入口 */}
          {/* <FloatingQuickAccess /> */}
        </div>
      </WarehouseProvider>
    </PermissionProvider>
  )
}
