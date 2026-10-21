'use client'

import { useState, useEffect, useCallback, useRef, startTransition } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  X,
  Zap,
  Settings,
  PackageCheck,
  ClipboardList,
  Package,
  Users,
  Warehouse,
  Tags,
  Building2,
  BarChart3,
  Check,
  Move,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/contexts/permission-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

// 快捷入口配置
export interface QuickAccessItem {
  key: string
  icon: React.ReactNode
  href: string
  permission?: string
  color?: string
}

// 预定义的快捷入口列表
const allQuickAccessItems: QuickAccessItem[] = [
  { key: 'receiving', icon: <PackageCheck className="h-5 w-5" />, href: '/receiving', permission: 'asn:read', color: 'bg-green-500' },
  { key: 'createOrder', icon: <ClipboardList className="h-5 w-5" />, href: '/orders/create', permission: 'order:create', color: 'bg-orange-500' },
  { key: 'inventory', icon: <Package className="h-5 w-5" />, href: '/inventory', permission: 'inventory:read', color: 'bg-purple-500' },
  { key: 'warehouses', icon: <Warehouse className="h-5 w-5" />, href: '/warehouses', permission: 'warehouse:read', color: 'bg-cyan-500' },
  { key: 'sku', icon: <Tags className="h-5 w-5" />, href: '/sku', permission: 'sku:read', color: 'bg-pink-500' },
  { key: 'clients', icon: <Building2 className="h-5 w-5" />, href: '/clients', permission: 'client:read', color: 'bg-indigo-500' },
  { key: 'users', icon: <Users className="h-5 w-5" />, href: '/users', permission: 'user:read', color: 'bg-amber-500' },
  { key: 'reports', icon: <BarChart3 className="h-5 w-5" />, href: '/reports', permission: 'report:read', color: 'bg-teal-500' },
]

const STORAGE_KEY = 'wms-quick-access-items'
const POSITION_STORAGE_KEY = 'wms-quick-access-position'
const DEFAULT_ITEMS = ['receiving', 'createOrder', 'inventory']

interface Position {
  x: number
  y: number
}

export function FloatingQuickAccess() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>(DEFAULT_ITEMS)
  const [tempSelectedItems, setTempSelectedItems] = useState<string[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const { hasPermission, loading } = usePermissions()
  const t = useTranslations('quickAccess')

  // 拖拽相关状态
  const [position, setPosition] = useState<Position>({ x: 24, y: 24 }) // 距离右下角的偏移
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 标记组件已挂载，用于避免 hydration mismatch
  useEffect(() => {
    startTransition(() => {
      setIsMounted(true)
    })
  }, [])

  // 从 localStorage 加载用户选择的快捷入口
  useEffect(() => {
    startTransition(() => {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedItems(parsed)
          }
        } catch {
          // 使用默认值
        }
      }

      // 加载保存的位置
      const savedPosition = localStorage.getItem(POSITION_STORAGE_KEY)
      if (savedPosition) {
        try {
          const parsed = JSON.parse(savedPosition)
          if (parsed.x !== undefined && parsed.y !== undefined) {
            setPosition({ x: parsed.x, y: parsed.y })
          }
        } catch {
          // 使用默认位置
        }
      }
    })
  }, [])

  // 保存用户选择到 localStorage
  const saveSelectedItems = useCallback((items: string[]) => {
    setSelectedItems(items)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [])

  // 保存位置到 localStorage
  const savePosition = useCallback((pos: Position) => {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(pos))
  }, [])

  // 使用 ref 存储最新位置，避免 effect 依赖 position
  const positionRef = useRef(position)
  useEffect(() => {
    positionRef.current = position
  }, [position])

  // 拖拽开始
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startPosX: positionRef.current.x,
      startPosY: positionRef.current.y,
    }
  }, [])

  // 拖拽移动
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

      const deltaX = dragRef.current.startX - clientX
      const deltaY = dragRef.current.startY - clientY

      // 边界限制：在整个 body 内自由拖动
      const buttonSize = 56 // 按钮大小
      const topPadding = 55 // 顶部留白（避免超出顶部导航栏）
      const bottomPadding = 20 // 底部留白（允许贴近底部）
      const sidePadding = 10 // 左右留白

      // right 范围：从贴近右边缘到贴近左边缘
      const minX = sidePadding
      const maxX = window.innerWidth - buttonSize - sidePadding

      // bottom 范围：从贴近底部边缘到顶部导航栏下方
      const minY = bottomPadding
      const maxY = window.innerHeight - buttonSize - topPadding

      const newX = Math.max(minX, Math.min(maxX, dragRef.current.startPosX + deltaX))
      const newY = Math.max(minY, Math.min(maxY, dragRef.current.startPosY + deltaY))
      const newPosition = { x: newX, y: newY }
      positionRef.current = newPosition
      setPosition(newPosition)
    }

    const handleEnd = () => {
      setIsDragging(false)
      dragRef.current = null
      savePosition(positionRef.current)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, savePosition])

  // 根据权限过滤可用的快捷入口
  const availableItems = allQuickAccessItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  // 获取用户选择的且有权限的快捷入口
  const visibleItems = selectedItems
    .map((key) => availableItems.find((item) => item.key === key))
    .filter((item): item is QuickAccessItem => item !== undefined)

  // 打开设置对话框时，初始化临时选择
  const handleOpenSettings = () => {
    setTempSelectedItems([...selectedItems])
    setIsSettingsOpen(true)
  }

  // 保存设置
  const handleSaveSettings = () => {
    saveSelectedItems(tempSelectedItems)
    setIsSettingsOpen(false)
  }

  // 切换选择
  const toggleItem = (key: string) => {
    setTempSelectedItems((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  // 计算展开方向：根据浮标位置决定展开方向（上、下、左、右）
  const getExpandDirection = useCallback((): 'up' | 'down' | 'left' | 'right' => {
    // 服务端或未挂载时返回默认值，避免 hydration mismatch
    if (!isMounted) return 'up'

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // 浮标实际位置
    const rightPosition = position.x // 距离右边缘的距离
    const bottomPosition = position.y // 距离底部的距离

    // 计算浮标中心点距离各边缘的空间
    const buttonSize = 56
    const spaceRight = rightPosition
    const spaceLeft = windowWidth - rightPosition - buttonSize
    const spaceBottom = bottomPosition
    const spaceTop = windowHeight - bottomPosition - buttonSize

    // 找出最大空间的方向
    const spaces = [
      { direction: 'up' as const, space: spaceTop },
      { direction: 'down' as const, space: spaceBottom },
      { direction: 'left' as const, space: spaceRight }, // 向左展开需要右边有空间
      { direction: 'right' as const, space: spaceLeft }, // 向右展开需要左边有空间
    ]

    // 按空间大小排序，选择空间最大的方向
    spaces.sort((a, b) => b.space - a.space)
    return spaces[0].direction
  }, [position.x, position.y, isMounted])

  const expandDirection = getExpandDirection()

  // 根据展开方向获取容器的 flex 方向
  const getContainerFlexClass = () => {
    switch (expandDirection) {
      case 'up':
        return 'flex-col-reverse'
      case 'down':
        return 'flex-col'
      case 'left':
        return 'flex-row-reverse'
      case 'right':
        return 'flex-row'
    }
  }

  // 根据展开方向获取动画的 translate 类
  const getTranslateClass = () => {
    switch (expandDirection) {
      case 'up':
        return 'translate-y-4'
      case 'down':
        return '-translate-y-4'
      case 'left':
        return 'translate-x-4'
      case 'right':
        return '-translate-x-4'
    }
  }

  if (loading) return null

  return (
    <>
      {/* 浮动按钮容器 */}
      <div
        ref={containerRef}
        className={cn(
          'fixed z-50 flex items-center gap-3 transition-opacity duration-300',
          getContainerFlexClass(),
          isDragging && 'cursor-grabbing',
          // 非活跃状态下半透明，悬停或展开时完全不透明
          !isOpen && !isDragging ? 'opacity-60 hover:opacity-100' : 'opacity-100'
        )}
        style={{
          right: `${position.x}px`,
          bottom: `${position.y}px`,
        }}
      >
        {/* 展开的快捷入口 */}
        <div
          className={cn(
            'flex gap-2 transition-all duration-300',
            getContainerFlexClass(),
            isOpen
              ? 'opacity-100'
              : cn('opacity-0 pointer-events-none', getTranslateClass())
          )}
        >
          {visibleItems.map((item, index) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-300 text-white hover:scale-110',
                item.color || 'bg-primary'
              )}
              style={{
                transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
              }}
              title={t(item.key)}
              onClick={() => setIsOpen(false)}
            >
              {item.icon}
            </Link>
          ))}

          {/* 设置按钮 */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <button
                className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground shadow-md hover:bg-muted/80 transition-colors"
                onClick={handleOpenSettings}
                title={t('settings')}
              >
                <Settings className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t('settingsTitle')}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  {t('settingsDescription')}
                </p>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {availableItems.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={tempSelectedItems.includes(item.key)}
                        onCheckedChange={() => toggleItem(item.key)}
                      />
                      <div
                        className={cn(
                          'flex items-center justify-center w-8 h-8 rounded-full text-white',
                          item.color || 'bg-primary'
                        )}
                      >
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium">{t(item.key)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleSaveSettings}>
                  <Check className="h-4 w-4 mr-2" />
                  {t('save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 主按钮区域 */}
        <div className="flex items-center gap-1">
          {/* 拖拽手柄 */}
          <button
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full bg-muted/80 text-muted-foreground shadow-md transition-all',
              'hover:bg-muted cursor-grab active:cursor-grabbing',
              isDragging && 'cursor-grabbing bg-muted'
            )}
            title={t('drag')}
          >
            <Move className="h-4 w-4" />
          </button>

          {/* 主按钮 */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300',
              isOpen
                ? 'bg-destructive text-destructive-foreground rotate-45'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
            title={isOpen ? t('close') : t('open')}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </>
  )
}
