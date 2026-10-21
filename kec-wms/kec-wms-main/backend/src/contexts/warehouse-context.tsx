'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Loader2 } from 'lucide-react'

const STORAGE_PREFIX = 'wms:selectedWarehouse:web:'
const TERMINAL_HEADER = 'X-WMS-Terminal-Type'
const WAREHOUSE_HEADER = 'X-WMS-Warehouse-Id'
const UNBOUND_WAREHOUSE_MESSAGE = '当前账号未绑定可操作仓库，请联系管理员配置'

const WAREHOUSE_SCOPED_PREFIXES = [
  '/api/v1/asn',
  '/api/v1/bin-locations',
  '/api/v1/checkout',
  '/api/v1/containers',
  '/api/v1/inventory',
  '/api/v1/jobs',
  '/api/v1/manifest-orders',
    '/api/v1/outbound-orders',
    '/api/v1/packaging-material-inventory',
    '/api/v1/packaging-material-transactions',
    '/api/v1/packaging-materials',
    '/api/v1/packing',
    '/api/v1/pick-assignment-rules',
    '/api/v1/pick-orders',
    '/api/v1/picker-profiles',
  '/api/v1/putaway',
  '/api/v1/returns',
  '/api/v1/reports',
  '/api/v1/shelving',
  '/api/v1/sorting-walls',
  '/api/v1/waves',
  '/api/v1/zones',
]

export interface WarehouseBinding {
  id: string
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  isDefault: boolean
  isActive: boolean
}

interface WarehouseProfile {
  userId: string
  tenantId: string
  warehouseBindings: WarehouseBinding[]
  defaultWarehouseId: string | null
}

interface WarehouseContextValue {
  loading: boolean
  initialized: boolean
  bindings: WarehouseBinding[]
  defaultWarehouseId: string | null
  selectedWarehouseId: string
  currentWarehouse: WarehouseBinding | null
  setSelectedWarehouseId: (warehouseId: string) => void
}

const WarehouseContext = createContext<WarehouseContextValue | null>(null)

function getStorageKey(tenantId: string, userId: string): string {
  return `${STORAGE_PREFIX}${tenantId}:${userId}`
}

export function persistWarehouseSelection(tenantId: string, userId: string, warehouseId: string): void {
  writeStoredWarehouseId(getStorageKey(tenantId, userId), warehouseId)
}

function readStoredWarehouseId(storageKey: string): string {
  if (typeof window === 'undefined') return ''

  try {
    return localStorage.getItem(storageKey) || ''
  } catch {
    return ''
  }
}

function writeStoredWarehouseId(storageKey: string, warehouseId: string): void {
  if (typeof window === 'undefined') return

  try {
    if (warehouseId) {
      localStorage.setItem(storageKey, warehouseId)
    } else {
      localStorage.removeItem(storageKey)
    }
  } catch {
    // ignore storage write failures
  }
}

function pickInitialWarehouseId(profile: WarehouseProfile, storedWarehouseId: string): string {
  if (storedWarehouseId && profile.warehouseBindings.some((binding) => binding.warehouseId === storedWarehouseId)) {
    return storedWarehouseId
  }

  if (profile.warehouseBindings.length > 1) {
    return ''
  }

  if (profile.defaultWarehouseId) {
    return profile.defaultWarehouseId
  }

  return profile.warehouseBindings[0]?.warehouseId || ''
}

function isWarehouseScopedRequest(url: string): boolean {
  return WAREHOUSE_SCOPED_PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`))
}

export function WarehouseProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [profile, setProfile] = useState<WarehouseProfile | null>(null)
  const [selectedWarehouseId, setSelectedWarehouseIdState] = useState('')
  const storageKeyRef = useRef('')

  const setSelectedWarehouseId = useCallback((warehouseId: string) => {
    if (warehouseId === selectedWarehouseId) {
      return
    }

    setSelectedWarehouseIdState(warehouseId)
    if (storageKeyRef.current) {
      writeStoredWarehouseId(storageKeyRef.current, warehouseId)
    }
  }, [selectedWarehouseId])

  useEffect(() => {
    let active = true

    async function bootstrap() {
      try {
        const response = await fetch('/api/v1/auth/me')
        const result = await response.json()
        if (!active || !result.success || !result.data) return

        const nextProfile: WarehouseProfile = {
          userId: result.data.id,
          tenantId: result.data.tenant?.id || '',
          warehouseBindings: result.data.warehouseBindings || [],
          defaultWarehouseId: result.data.defaultWarehouseId || null,
        }

        const storageKey = getStorageKey(nextProfile.tenantId, nextProfile.userId)
        storageKeyRef.current = storageKey

        const initialWarehouseId = pickInitialWarehouseId(
          nextProfile,
          readStoredWarehouseId(storageKey)
        )

        setProfile(nextProfile)
        setSelectedWarehouseIdState(initialWarehouseId)
        writeStoredWarehouseId(storageKey, initialWarehouseId)
      } catch (error) {
        console.error('Failed to initialize warehouse context:', error)
      } finally {
        if (active) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!initialized || loading) return

    const requiresWarehouseSelection =
      (profile?.warehouseBindings.length || 0) > 1 && !selectedWarehouseId

    if (!requiresWarehouseSelection || pathname === '/select-warehouse') {
      return
    }

    router.replace('/select-warehouse')
  }, [initialized, loading, pathname, profile, router, selectedWarehouseId])

  useEffect(() => {
    if (!profile || !storageKeyRef.current) return

    const normalizedWarehouseId =
      selectedWarehouseId &&
      profile.warehouseBindings.some((binding) => binding.warehouseId === selectedWarehouseId)
        ? selectedWarehouseId
        : pickInitialWarehouseId(profile, '')

    if (normalizedWarehouseId !== selectedWarehouseId) {
      setSelectedWarehouseIdState(normalizedWarehouseId)
      return
    }

    writeStoredWarehouseId(storageKeyRef.current, normalizedWarehouseId)
  }, [profile, selectedWarehouseId])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return

    const originalFetch = window.fetch.bind(window)
    const hasBindings = (profile?.warehouseBindings.length || 0) > 0

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url

      const isApiRequest =
        requestUrl.startsWith('/api/') ||
        requestUrl.startsWith(`${window.location.origin}/api/`)

      if (!isApiRequest) {
        return originalFetch(input, init)
      }

      const normalizedApiUrl = requestUrl.startsWith(window.location.origin)
        ? requestUrl.slice(window.location.origin.length)
        : requestUrl

      if (!hasBindings && isWarehouseScopedRequest(normalizedApiUrl)) {
        return new Response(
          JSON.stringify({
            success: false,
            message: UNBOUND_WAREHOUSE_MESSAGE,
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      }

      const headers = new Headers(input instanceof Request ? input.headers : init?.headers)
      headers.set(TERMINAL_HEADER, 'WEB')
      if (selectedWarehouseId) {
        headers.set(WAREHOUSE_HEADER, selectedWarehouseId)
      }

      if (input instanceof Request) {
        return originalFetch(new Request(input, { ...init, headers }))
      }

      return originalFetch(input, { ...init, headers })
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [profile, selectedWarehouseId])

  const currentWarehouse = useMemo(
    () => profile?.warehouseBindings.find((binding) => binding.warehouseId === selectedWarehouseId) || null,
    [profile, selectedWarehouseId]
  )

  const value = useMemo<WarehouseContextValue>(
    () => ({
      loading,
      initialized,
      bindings: profile?.warehouseBindings || [],
      defaultWarehouseId: profile?.defaultWarehouseId || null,
      selectedWarehouseId,
      currentWarehouse,
      setSelectedWarehouseId,
    }),
    [currentWarehouse, initialized, loading, profile, selectedWarehouseId, setSelectedWarehouseId]
  )

  const requiresWarehouseSelection =
    (profile?.warehouseBindings.length || 0) > 1 && !selectedWarehouseId

  if (!initialized || loading || requiresWarehouseSelection) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <WarehouseContext.Provider value={value}>
      {children}
    </WarehouseContext.Provider>
  )
}

export function useWarehouseContext() {
  const context = useContext(WarehouseContext)
  if (!context) {
    throw new Error('useWarehouseContext must be used within WarehouseProvider')
  }
  return context
}

export function useOptionalWarehouseContext() {
  return useContext(WarehouseContext)
}

export function clearWarehouseSelectionCache() {
  if (typeof window === 'undefined') return

  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // ignore storage cleanup failures
  }
}
