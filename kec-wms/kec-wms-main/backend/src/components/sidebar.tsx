'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Boxes,
  Building2,
  CircleDot,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  Grid3X3,
  History,
  KeyRound,
  LayoutDashboard,
  Layers,
  ListChecks,
  Map as MapIcon,
  MapPin,
  Package,
  PackageCheck,
  PackageOpen,
  Pin,
  PinOff,
  Printer,
  ScanLine,
  Search,
  Settings,
  Shield,
  Tags,
  Truck,
  Undo2,
  Users,
  Warehouse,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/contexts/permission-context'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

const PINNED_MENU_STORAGE_KEY = 'wms-pinned-menu-items'
const MAX_PINNED_MENUS = 12

interface MenuItem {
  key: string
  href?: string
  permission?: string | string[]
  disabled?: boolean
}

interface MenuSection {
  key: string
  items: MenuItem[]
}

interface PrimaryMenu {
  key: string
  icon: ReactNode
  activePaths?: string[]
  sections: MenuSection[]
}

interface SearchableMenuItem {
  key: string
  href: string
  label: string
  primaryKey: string
  primaryLabel: string
  sectionKey: string
  sectionLabel: string
  searchText: string
}

const menuItemIcons: Record<string, ReactNode> = {
  asnList: <FileText className="h-3.5 w-3.5" />,
  createPutaway: <ClipboardCheck className="h-3.5 w-3.5" />,
  putawayOrders: <ClipboardList className="h-3.5 w-3.5" />,
  asnSignIn: <ScanLine className="h-3.5 w-3.5" />,
  receiving: <PackageCheck className="h-3.5 w-3.5" />,
  shelving: <PackageOpen className="h-3.5 w-3.5" />,
  orders: <FileText className="h-3.5 w-3.5" />,
  waves: <Layers className="h-3.5 w-3.5" />,
  waveStrategies: <ListChecks className="h-3.5 w-3.5" />,
  pickOrders: <ClipboardList className="h-3.5 w-3.5" />,
  checkoutOrders: <Truck className="h-3.5 w-3.5" />,
  manifestOrders: <FileText className="h-3.5 w-3.5" />,
  packagingMaterials: <Package className="h-3.5 w-3.5" />,
  packagingMaterialInventory: <Boxes className="h-3.5 w-3.5" />,
  packagingMaterialTransactions: <History className="h-3.5 w-3.5" />,
  sorting: <Grid3X3 className="h-3.5 w-3.5" />,
  packing: <PackageCheck className="h-3.5 w-3.5" />,
  checkout: <ScanLine className="h-3.5 w-3.5" />,
  returnList: <Undo2 className="h-3.5 w-3.5" />,
  returnSignIn: <ScanLine className="h-3.5 w-3.5" />,
  returnCounting: <ClipboardCheck className="h-3.5 w-3.5" />,
  returnPutaway: <PackageOpen className="h-3.5 w-3.5" />,
  inventorySummary: <Boxes className="h-3.5 w-3.5" />,
  inventoryDetail: <Package className="h-3.5 w-3.5" />,
  inventoryTransactions: <History className="h-3.5 w-3.5" />,
  serialNumbers: <ScanLine className="h-3.5 w-3.5" />,
  inventoryAdjustments: <ClipboardCheck className="h-3.5 w-3.5" />,
  createInventoryCount: <ClipboardCheck className="h-3.5 w-3.5" />,
  inventoryCounts: <ClipboardList className="h-3.5 w-3.5" />,
  inventoryAllocationExceptions: <AlertTriangle className="h-3.5 w-3.5" />,
  pickingExceptions: <AlertTriangle className="h-3.5 w-3.5" />,
  orderInterceptions: <Shield className="h-3.5 w-3.5" />,
  warehouses: <Warehouse className="h-3.5 w-3.5" />,
  zones: <MapIcon className="h-3.5 w-3.5" />,
  binLocations: <MapPin className="h-3.5 w-3.5" />,
  containers: <Archive className="h-3.5 w-3.5" />,
  sortingWalls: <Grid3X3 className="h-3.5 w-3.5" />,
  clients: <Building2 className="h-3.5 w-3.5" />,
  sku: <Tags className="h-3.5 w-3.5" />,
  jobs: <Clock3 className="h-3.5 w-3.5" />,
  scheduledTasks: <Clock3 className="h-3.5 w-3.5" />,
  pickAssignmentRules: <ListChecks className="h-3.5 w-3.5" />,
  users: <Users className="h-3.5 w-3.5" />,
  roles: <Shield className="h-3.5 w-3.5" />,
  tenants: <Building2 className="h-3.5 w-3.5" />,
  audits: <History className="h-3.5 w-3.5" />,
  apiKeys: <KeyRound className="h-3.5 w-3.5" />,
  printSettings: <Printer className="h-3.5 w-3.5" />,
  inboundDashboard: <LayoutDashboard className="h-3.5 w-3.5" />,
  inboundTimeoutDashboard: <LayoutDashboard className="h-3.5 w-3.5" />,
  outboundDashboard: <LayoutDashboard className="h-3.5 w-3.5" />,
  outboundTimeoutDashboard: <LayoutDashboard className="h-3.5 w-3.5" />,
  reportsOverview: <BarChart3 className="h-3.5 w-3.5" />,
  inventoryReports: <BarChart3 className="h-3.5 w-3.5" />,
  inboundReports: <BarChart3 className="h-3.5 w-3.5" />,
  outboundReports: <BarChart3 className="h-3.5 w-3.5" />,
}

function getMenuItemIcon(key: string) {
  return menuItemIcons[key] ?? <CircleDot className="h-3.5 w-3.5" />
}

const primaryMenus: PrimaryMenu[] = [
  {
    key: 'inbound',
    icon: <PackageCheck className="h-5 w-5" />,
    sections: [
      {
        key: 'asnOrderGroup',
        items: [
          { key: 'asnList', href: '/asn', permission: 'asn:read' },
        ],
      },
      {
        key: 'putawayGroup',
        items: [
          { key: 'createPutaway', href: '/putaway/create', permission: 'putaway:read' },
          { key: 'putawayOrders', href: '/putaway', permission: 'putaway:read' },
        ],
      },
      {
        key: 'receivingGroup',
        items: [
          { key: 'asnSignIn', href: '/asn-sign-in', permission: 'asn:sign-in' },
          { key: 'receiving', href: '/receiving', permission: 'receiving:read' },
          { key: 'shelving', href: '/shelving', permission: 'shelving:execute' },
        ],
      },
    ],
  },
  {
    key: 'outbound',
    icon: <Truck className="h-5 w-5" />,
    sections: [
      {
        key: 'outboundOrderManagement',
        items: [
          { key: 'orders', href: '/orders', permission: 'order:read' },
          { key: 'waves', href: '/waves', permission: 'wave:read' },
          { key: 'waveStrategies', href: '/wave-strategies', permission: 'wave:read' },
          { key: 'pickOrders', href: '/pick-orders', permission: 'picking:read' },
          { key: 'checkoutOrders', href: '/checkout-orders', permission: 'checkout:read' },
          { key: 'manifestOrders', href: '/manifest-orders', permission: 'manifest-order:read' },
        ],
      },
      {
        key: 'packagingMaterialsGroup',
        items: [
          { key: 'packagingMaterials', href: '/packaging-materials', permission: 'packaging-material:read' },
          { key: 'packagingMaterialInventory', href: '/packaging-material-inventory', permission: 'packaging-material-inventory:read' },
          { key: 'packagingMaterialTransactions', href: '/packaging-material-transactions', permission: 'packaging-material-transaction:read' },
        ],
      },
      {
        key: 'outboundOperation',
        items: [
          { key: 'sorting', href: '/sorting', permission: 'sorting-wall:read' },
          { key: 'packing', href: '/packing', permission: 'packing:execute' },
          { key: 'checkout', href: '/checkout', permission: 'checkout:execute' },
        ],
      },
    ],
  },
  {
    key: 'returns',
    icon: <Undo2 className="h-5 w-5" />,
    sections: [
      {
        key: 'returnsInbound',
        items: [
          { key: 'returnList', href: '/returns', permission: 'return:read' },
        ],
      },
      {
        key: 'returnsOperation',
        items: [
          { key: 'returnSignIn', href: '/returns/sign-in', permission: 'return:sign-in' },
          { key: 'returnCounting', href: '/returns/counting', permission: 'return:count' },
          { key: 'returnPutaway', href: '/returns/putaway', permission: 'return:putaway:execute' },
        ],
      },
    ],
  },
  {
    key: 'inventory',
    icon: <Package className="h-5 w-5" />,
    sections: [
      {
        key: 'inventoryQuery',
        items: [
          { key: 'inventorySummary', href: '/inventory', permission: 'inventory:read' },
          { key: 'inventoryDetail', href: '/inventory/wm', permission: 'inventory:read' },
          { key: 'inventoryTransactions', href: '/inventory/transactions', permission: 'inventory:read' },
          { key: 'serialNumbers', href: '/inventory/serial-numbers', permission: 'inventory:read' },
          { key: 'inventoryAdjustments', href: '/inventory/adjustments', permission: 'inventory:adjust' },
        ],
      },
      {
        key: 'inventoryCountManagement',
        items: [
          { key: 'createInventoryCount', href: '/inventory/counts/new', permission: 'inventory:count' },
          { key: 'inventoryCounts', href: '/inventory/counts', permission: 'inventory:count' },
        ],
      },
    ],
  },
  {
    key: 'exception',
    icon: <AlertTriangle className="h-5 w-5" />,
    sections: [
      {
        key: 'outboundException',
        items: [
          { key: 'inventoryAllocationExceptions', disabled: true },
          { key: 'pickingExceptions', href: '/picking-exceptions', permission: ['picking-exception:read', 'picking:read'] },
          { key: 'orderInterceptions', href: '/order-interceptions', permission: 'order-intercept:read' },
        ],
      },
    ],
  },
  {
    key: 'settings',
    icon: <Settings className="h-5 w-5" />,
    sections: [
      {
        key: 'baseData',
        items: [
          { key: 'warehouses', href: '/warehouses', permission: 'warehouse:read' },
          { key: 'zones', href: '/zones', permission: 'zone:read' },
          { key: 'binLocations', href: '/bin-locations', permission: 'bin:read' },
          { key: 'containers', href: '/containers', permission: 'container:read' },
          { key: 'sortingWalls', href: '/sorting-walls', permission: 'sorting-wall:read' },
          { key: 'clients', href: '/clients', permission: 'client:read' },
          { key: 'sku', href: '/sku', permission: 'sku:read' },
        ],
      },
      {
        key: 'operationRules',
        items: [
          { key: 'jobs', href: '/jobs', permission: 'job:read' },
          { key: 'scheduledTasks', href: '/scheduled-tasks', permission: 'scheduled-task:read' },
          { key: 'pickAssignmentRules', href: '/pick-assignment-rules', permission: 'pick-assignment-rule:read' },
        ],
      },
      {
        key: 'systemManagement',
        items: [
          { key: 'users', href: '/users', permission: 'user:read' },
          { key: 'roles', href: '/roles', permission: 'role:read' },
          { key: 'tenants', href: '/tenants', permission: 'tenant:read' },
          { key: 'audits', href: '/audits', permission: 'audit:read' },
          { key: 'apiKeys', href: '/api-keys', permission: 'api-key:read' },
        ],
      },
      {
        key: 'printSettingsGroup',
        items: [
          { key: 'printSettings', href: '/settings/print', permission: 'print:settings' },
        ],
      },
    ],
  },
  {
    key: 'dashboards',
    icon: <LayoutDashboard className="h-5 w-5" />,
    activePaths: ['/dashboard'],
    sections: [
      {
        key: 'dashboardEntries',
        items: [
          { key: 'inboundDashboard', href: '/dashboard/inbound', permission: 'report:read' },
          { key: 'inboundTimeoutDashboard', href: '/dashboard/inbound/timeout', permission: 'report:read' },
          { key: 'outboundDashboard', href: '/dashboard/outbound', permission: 'report:read' },
          { key: 'outboundTimeoutDashboard', href: '/dashboard/outbound/timeout', permission: 'report:read' },
        ],
      },
    ],
  },
  {
    key: 'reports',
    icon: <BarChart3 className="h-5 w-5" />,
    sections: [
      {
        key: 'reportEntries',
        items: [
          { key: 'reportsOverview', href: '/reports', permission: 'report:read' },
          { key: 'inventoryReports', href: '/reports/inventory', permission: 'report:read' },
          { key: 'inboundReports', href: '/reports/inbound', permission: 'report:read' },
          { key: 'outboundReports', href: '/reports/outbound', permission: 'report:read' },
        ],
      },
    ],
  },
]

const allMenuHrefs = primaryMenus
  .flatMap((primary) => primary.sections)
  .flatMap((section) => section.items)
  .map((item) => item.href)
  .filter((href): href is string => Boolean(href))

function isPathActive(pathname: string, itemHref: string) {
  if (pathname === itemHref) return true

  const hasMoreSpecificMatch = allMenuHrefs.some(
    (href) => href !== itemHref && href.startsWith(`${itemHref}/`) && pathname.startsWith(href)
  )
  if (hasMoreSpecificMatch) return false

  return pathname.startsWith(`${itemHref}/`)
}

function getPrimaryKeyByPath(pathname: string, menus: PrimaryMenu[]) {
  for (const primary of menus) {
    if (primary.activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return primary.key
    }

    const hasActiveItem = primary.sections.some((section) =>
      section.items.some((item) => item.href && isPathActive(pathname, item.href))
    )

    if (hasActiveItem) {
      return primary.key
    }
  }

  return null
}

function readPinnedMenuKeys() {
  if (typeof window === 'undefined') return []

  try {
    const rawValue = window.localStorage.getItem(PINNED_MENU_STORAGE_KEY)
    if (!rawValue) return []

    const parsed = JSON.parse(rawValue)
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : []
  } catch {
    return []
  }
}

function persistPinnedMenuKeys(keys: string[]) {
  try {
    window.localStorage.setItem(PINNED_MENU_STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // Ignore unavailable storage; the in-memory state still updates for this session.
  }
}

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('menu')
  const tGroup = useTranslations('menuGroup')
  const tMenuActions = useTranslations('menuActions')
  const { hasPermission, loading } = usePermissions()
  const sidebarRef = useRef<HTMLElement | null>(null)
  const initialPrimaryKey = getPrimaryKeyByPath(pathname, primaryMenus) ?? primaryMenus[0]?.key
  const [selectedPrimary, setSelectedPrimary] = useState(() => ({
    key: initialPrimaryKey,
    pathname,
  }))
  const [panelOpen, setPanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [pinnedOpen, setPinnedOpen] = useState(false)
  const [pinnedMenuKeys, setPinnedMenuKeys] = useState(readPinnedMenuKeys)

  const visibleMenus = useMemo(() => {
    return primaryMenus
      .map((primary) => ({
        ...primary,
        sections: primary.sections
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => {
              if (loading || item.disabled) return true
              return !item.permission || (
                Array.isArray(item.permission)
                  ? item.permission.some((permission) => hasPermission(permission))
                  : hasPermission(item.permission)
              )
            }),
          }))
          .filter((section) => section.items.length > 0),
      }))
      .filter((primary) => primary.sections.length > 0)
  }, [hasPermission, loading])

  const selectedPrimaryIsVisible = visibleMenus.some((primary) => primary.key === selectedPrimary.key)
  const routePrimaryKey = getPrimaryKeyByPath(pathname, visibleMenus)
  const activePrimaryKey =
    panelOpen && selectedPrimary.pathname === pathname && selectedPrimaryIsVisible
      ? selectedPrimary.key
      : routePrimaryKey ?? visibleMenus[0]?.key ?? ''
  const panelPrimaryKey = selectedPrimaryIsVisible ? selectedPrimary.key : activePrimaryKey
  const activePrimary = visibleMenus.find((primary) => primary.key === activePrimaryKey) ?? visibleMenus[0]
  const panelPrimary = visibleMenus.find((primary) => primary.key === panelPrimaryKey) ?? activePrimary
  const searchableMenus = useMemo(() => {
    return visibleMenus.flatMap((primary) => {
      const primaryLabel = tGroup(primary.key)

      return primary.sections.flatMap((section) => {
        const sectionLabel = tGroup(section.key)

        return section.items
          .filter((item): item is MenuItem & { href: string } => Boolean(item.href) && !item.disabled)
          .map((item) => {
            const label = t(item.key)
            const searchText = [
              label,
              primaryLabel,
              sectionLabel,
              item.key,
              primary.key,
              section.key,
              item.href,
            ].join(' ').toLowerCase()

            return {
              key: item.key,
              href: item.href,
              label,
              primaryKey: primary.key,
              primaryLabel,
              sectionKey: section.key,
              sectionLabel,
              searchText,
            }
          })
      })
    })
  }, [t, tGroup, visibleMenus])
  const searchableMenuByKey = useMemo(() => {
    return new Map(searchableMenus.map((item) => [item.key, item]))
  }, [searchableMenus])
  const pinnedMenus = pinnedMenuKeys
    .map((key) => searchableMenuByKey.get(key))
    .filter((item): item is SearchableMenuItem => Boolean(item))
  const pinnedMenuKeySet = new Set(pinnedMenus.map((item) => item.key))

  const navigateToMenu = (href: string) => {
    setSearchOpen(false)
    setPinnedOpen(false)
    setPanelOpen(false)
    router.push(href)
  }

  const togglePinnedMenu = (key: string) => {
    setPinnedMenuKeys((currentKeys) => {
      const nextKeys = currentKeys.includes(key)
        ? currentKeys.filter((currentKey) => currentKey !== key)
        : [...currentKeys, key].slice(-MAX_PINNED_MENUS)

      persistPinnedMenuKeys(nextKeys)
      return nextKeys
    })
  }

  useEffect(() => {
    if (!panelOpen && !pinnedOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!sidebarRef.current?.contains(event.target as Node)) {
        setPanelOpen(false)
        setPinnedOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [panelOpen, pinnedOpen])

  return (
    <>
      <aside
        ref={sidebarRef}
        className="relative z-40 h-screen w-20 shrink-0 overflow-visible border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm"
      >
        <div className="flex h-full w-20 flex-col">
        <div className="flex h-16 items-center justify-center border-b border-sidebar-border">
          <div className="text-center leading-none">
            <div className="text-lg font-black tracking-tight text-primary">KEC</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground/60">WMS</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 border-b border-sidebar-border p-2">
          <button
            type="button"
            title={tMenuActions('search')}
            aria-label={tMenuActions('search')}
            onClick={() => {
              setSearchOpen(true)
              setPinnedOpen(false)
              setPanelOpen(false)
            }}
            className="flex h-9 items-center justify-center rounded-lg text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            title={tMenuActions('pinned')}
            aria-label={tMenuActions('pinned')}
            aria-pressed={pinnedOpen}
            onClick={() => {
              setPinnedOpen((open) => !open)
              setPanelOpen(false)
            }}
            className={cn(
              'flex h-9 items-center justify-center rounded-lg transition-colors',
              pinnedOpen
                ? 'bg-primary/15 text-primary shadow-inner'
                : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <Pin className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="space-y-1 px-2">
            {visibleMenus.map((primary) => {
              const isActive = activePrimary?.key === primary.key
              return (
                <li key={primary.key}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    title={tGroup(primary.key)}
                    onClick={() => {
                      const isCurrentPanel =
                        panelOpen && selectedPrimary.key === primary.key && selectedPrimary.pathname === pathname
                      setSelectedPrimary({ key: primary.key, pathname })
                      setPanelOpen(!isCurrentPanel)
                      setPinnedOpen(false)
                    }}
                    className={cn(
                      'flex w-full flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[12px] font-medium transition-colors',
                      isActive
                        ? 'bg-primary/15 text-primary shadow-inner'
                        : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <span className="flex h-5 w-5 items-center justify-center">{primary.icon}</span>
                    <span className="leading-tight">{tGroup(primary.key)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        </div>

        {pinnedOpen && (
        <div className="absolute left-20 top-16 w-80 animate-in slide-in-from-left-2 duration-150 rounded-r-2xl border border-border bg-popover p-4 text-popover-foreground shadow-[18px_0_48px_rgba(15,23,42,0.18),6px_0_18px_rgba(15,23,42,0.10)] ring-1 ring-border/70">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {tMenuActions('pinned')}
              </p>
              <h2 className="mt-1 text-base font-semibold text-popover-foreground">
                {tMenuActions('pinnedMenus')}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {pinnedMenus.length}/{MAX_PINNED_MENUS}
            </span>
          </div>

          {pinnedMenus.length > 0 ? (
            <ul className="space-y-1">
              {pinnedMenus.map((item) => (
                <li key={item.key} className="group flex items-center gap-1 rounded-lg hover:bg-primary/10">
                  <button
                    type="button"
                    onClick={() => navigateToMenu(item.href)}
                    className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors group-hover:text-primary"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      {getMenuItemIcon(item.key)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.primaryLabel} · {item.sectionLabel}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    title={tMenuActions('unpin')}
                    aria-label={tMenuActions('unpin')}
                    onClick={() => togglePinnedMenu(item.key)}
                    className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-colors hover:bg-background hover:text-primary group-hover:opacity-100"
                  >
                    <PinOff className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {tMenuActions('noPinned')}
            </div>
          )}
        </div>
        )}

        {panelOpen && (
        <div className="absolute left-20 top-0 h-screen w-[560px] max-w-[calc(100vw-5rem)] animate-in slide-in-from-left-2 duration-150 overflow-y-auto border-r border-border bg-popover px-6 py-7 text-popover-foreground shadow-[18px_0_48px_rgba(15,23,42,0.18),6px_0_18px_rgba(15,23,42,0.10)] ring-1 ring-border/70 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="pointer-events-none absolute bottom-0 right-[-28px] top-0 w-7 bg-gradient-to-r from-black/10 to-transparent dark:from-black/35" />
          {panelPrimary ? (
            <>
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Menu</p>
                <h2 className="mt-2 text-xl font-semibold text-popover-foreground">{tGroup(panelPrimary.key)}</h2>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                {panelPrimary.sections.map((section) => (
                  <section key={section.key} className="min-w-0">
                    <div className="mb-3 border-b border-dashed border-border pb-2">
                      <h3 className="text-sm font-medium text-muted-foreground">{tGroup(section.key)}</h3>
                    </div>
                    <ul className="space-y-2.5">
                      {section.items.map((item) => {
                        const isActive = item.href ? isPathActive(pathname, item.href) : false

                        if (item.disabled || !item.href) {
                          return (
                            <li key={item.key}>
                              <span
                                className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground/45"
                                title={t(item.key)}
                                aria-disabled="true"
                              >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted/40">
                                  {getMenuItemIcon(item.key)}
                                </span>
                                <span className="min-w-0 leading-snug">{t(item.key)}</span>
                              </span>
                            </li>
                          )
                        }

                        return (
                          <li key={item.key} className="group flex items-center gap-1 rounded-md hover:bg-primary/10">
                            <Link
                              href={item.href}
                              aria-current={isActive ? 'page' : undefined}
                              onClick={() => setPanelOpen(false)}
                              className={cn(
                                'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-popover-foreground group-hover:text-primary'
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors',
                                  isActive
                                    ? 'bg-primary/15 text-primary'
                                    : 'group-hover:bg-primary/10 group-hover:text-primary'
                                )}
                              >
                                {getMenuItemIcon(item.key)}
                              </span>
                              <span className="min-w-0 leading-snug">{t(item.key)}</span>
                            </Link>
                            <button
                              type="button"
                              title={pinnedMenuKeySet.has(item.key) ? tMenuActions('pinned') : tMenuActions('pin')}
                              aria-label={pinnedMenuKeySet.has(item.key) ? tMenuActions('pinned') : tMenuActions('pin')}
                              onClick={() => {
                                if (!pinnedMenuKeySet.has(item.key)) {
                                  togglePinnedMenu(item.key)
                                }
                              }}
                              className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-colors hover:bg-background hover:text-primary group-hover:opacity-100',
                                pinnedMenuKeySet.has(item.key) && 'cursor-default text-primary opacity-100 hover:bg-transparent'
                              )}
                            >
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {tGroup('emptyMenu')}
            </div>
          )}
        </div>
        )}
      </aside>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder={tMenuActions('searchPlaceholder')} />
        <CommandList className="max-h-[520px]">
          <CommandEmpty>{tMenuActions('noSearchResults')}</CommandEmpty>
          {visibleMenus.map((primary) =>
            primary.sections.map((section) => {
              const sectionItems = section.items
                .map((item) => searchableMenuByKey.get(item.key))
                .filter((item): item is SearchableMenuItem => Boolean(item))

              if (sectionItems.length === 0) return null

              return (
                <CommandGroup
                  key={`${primary.key}-${section.key}`}
                  heading={`${tGroup(primary.key)} · ${tGroup(section.key)}`}
                >
                  {sectionItems.map((item) => (
                    <CommandItem
                      key={item.key}
                      value={item.searchText}
                      onSelect={() => navigateToMenu(item.href)}
                      className="gap-3"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        {getMenuItemIcon(item.key)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{item.label}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.primaryLabel} · {item.sectionLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        title={pinnedMenuKeySet.has(item.key) ? tMenuActions('pinned') : tMenuActions('pin')}
                        aria-label={pinnedMenuKeySet.has(item.key) ? tMenuActions('pinned') : tMenuActions('pin')}
                        onMouseDown={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                        }}
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          if (!pinnedMenuKeySet.has(item.key)) {
                            togglePinnedMenu(item.key)
                          }
                        }}
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-primary',
                          pinnedMenuKeySet.has(item.key) && 'cursor-default text-primary hover:bg-transparent'
                        )}
                      >
                        <Pin className="h-4 w-4" />
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
