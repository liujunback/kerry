'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { PaginationState, SortingState } from '@tanstack/react-table'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { WarehouseFilter } from './warehouse-filter'
import { WarehouseTable } from './warehouse-table'

interface Warehouse {
  id: string
  warehouseCode: string
  warehouseName: string
  warehouseType: string
  address?: string | null
  city?: string | null
  region?: string | null
  warehouseArea?: number | null
  status: string
  createdAt: string
  _count: {
    zones: number
    binLocations: number
  }
}

function WarehousesContent() {
  const t = useTranslations('warehouse')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/warehouses' },
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const sortBy = searchParams.get('sortBy') || ''
  const sortOrder = searchParams.get('sortOrder') || ''

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : []

  const fetchWarehouses = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      if (!params.has('page')) params.set('page', '1')

      const response = await fetch(`/api/v1/warehouses?${params}`)
      const result = await response.json()

      if (result.success) {
        setWarehouses(result.data)
        setTotal(result.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
    } finally {
      setLoading(false)
    }
  }, [pageSize, searchParams])

  useEffect(() => {
    fetchWarehouses()
  }, [fetchWarehouses])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/warehouses?${params.toString()}`)
  }

  const handleSortingChange = (newSorting: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')

    if (newSorting.length > 0) {
      params.set('sortBy', newSorting[0].id)
      params.set('sortOrder', newSorting[0].desc ? 'desc' : 'asc')
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }

    router.push(`/warehouses?${params.toString()}`)
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchWarehouses}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/warehouses/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('create')}
            </Button>
          </Link>
        </div>
      </div>

      <WarehouseFilter />

      <div className="flex-1 min-h-0">
        <WarehouseTable
          warehouses={warehouses}
          total={total}
          pagination={pagination}
          sorting={sorting}
          loading={loading}
          onRefresh={fetchWarehouses}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
        />
      </div>
    </div>
  )
}

export function WarehousesPageContent() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <WarehousesContent />
    </Suspense>
  )
}
