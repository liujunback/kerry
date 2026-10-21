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
import { ZoneFilter } from './zone-filter'
import { ZoneTable } from './zone-table'

interface Zone {
  id: string
  zoneCode: string
  zoneName: string | null
  zoneType: string
  qualityType: string
  capacityUnits: number | null
  currentUnits: number
  status: string
  createdAt: string
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  _count: {
    binLocations: number
  }
}

function ZonesContent() {
  const t = useTranslations('zone')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/zones' },
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
  const sortBy = searchParams.get('sortBy') || ''
  const sortOrder = searchParams.get('sortOrder') || ''

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : []

  const fetchZones = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      if (!params.has('page')) params.set('page', '1')

      const response = await fetch(`/api/v1/zones?${params}`)
      const result = await response.json()

      if (result.success) {
        setZones(result.data)
        setTotal(result.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch zones:', error)
    } finally {
      setLoading(false)
    }
  }, [pageSize, searchParams])

  useEffect(() => {
    fetchZones()
  }, [fetchZones])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/zones?${params.toString()}`)
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

    router.push(`/zones?${params.toString()}`)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchZones}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Link href="/zones/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('create')}
            </Button>
          </Link>
        </div>
      </div>

      <ZoneFilter />

      <ZoneTable
        zones={zones}
        total={total}
        pagination={pagination}
        sorting={sorting}
        loading={loading}
        onRefresh={fetchZones}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
      />
    </div>
  )
}

export function ZonesPageContent() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ZonesContent />
    </Suspense>
  )
}
