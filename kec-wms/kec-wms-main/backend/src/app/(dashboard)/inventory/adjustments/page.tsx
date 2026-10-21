'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, RefreshCw, ClipboardEdit } from 'lucide-react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface Adjustment {
  id: string
  adjustmentNumber: string
  adjustmentType: string
  status: string
  reason: string
  createdAt: string
  approvedAt: string | null
  executedAt: string | null
  warehouse: {
    warehouseCode: string
    warehouseName: string
  }
  createdByUser: {
    username: string
    fullName: string
  }
  approvedByUser: {
    username: string
    fullName: string
  } | null
  _count: {
    lines: number
  }
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXECUTED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

const adjustmentTypes = ['QUANTITY_ADJUST', 'LOCATION_ADJUST', 'QUALITY_ADJUST'] as const

export default function AdjustmentsPage() {
  const t = useTranslations('common')
  const tAdj = useTranslations('inventory.adjustment')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tAdj('title'), href: '/inventory/adjustments' },
  })

  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [adjustmentType, setAdjustmentType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  useEffect(() => {
    fetchAdjustments()
  }, [status, adjustmentType, page])

  const fetchAdjustments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (search) params.append('search', search)
      if (status && status !== 'all') params.append('status', status)
      if (adjustmentType && adjustmentType !== 'all') params.append('adjustmentType', adjustmentType)

      const response = await fetch(`/api/v1/inventory/adjustments?${params}`)
      const result = await response.json()

      if (result.success) {
        setAdjustments(result.data)
        setTotal(result.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch adjustments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchAdjustments()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return formatDateTime(dateStr)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAdjustments}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh')}
          </Button>
          <Link href="/inventory/adjustments/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {tAdj('create')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder={tAdj('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tAdj('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAdj('allStatus')}</SelectItem>
                <SelectItem value="DRAFT">{tAdj('statuses.DRAFT')}</SelectItem>
                <SelectItem value="PENDING">{tAdj('statuses.PENDING')}</SelectItem>
                <SelectItem value="APPROVED">{tAdj('statuses.APPROVED')}</SelectItem>
                <SelectItem value="REJECTED">{tAdj('statuses.REJECTED')}</SelectItem>
                <SelectItem value="EXECUTED">{tAdj('statuses.EXECUTED')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={adjustmentType} onValueChange={(v) => { setAdjustmentType(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tAdj('filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAdj('allTypes')}</SelectItem>
                {adjustmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {tAdj(`types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              {t('search')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Adjustments List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardEdit className="h-5 w-5" />
            {tAdj('list')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tAdj('adjustmentNumber')}</TableHead>
                <TableHead>{tAdj('type')}</TableHead>
                <TableHead>{tAdj('status')}</TableHead>
                <TableHead>{tAdj('warehouse')}</TableHead>
                <TableHead>{tAdj('reason')}</TableHead>
                <TableHead>{tAdj('createdBy')}</TableHead>
                <TableHead>{tAdj('createdAt')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {t('loading')}
                  </TableCell>
                </TableRow>
              ) : adjustments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    {t('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                adjustments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.adjustmentNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tAdj(`types.${item.adjustmentType}` as const)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[item.status] || ''}>
                        {tAdj(`statuses.${item.status}` as const)}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.warehouse?.warehouseName}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.reason}>
                      {item.reason}
                    </TableCell>
                    <TableCell>{item.createdByUser?.fullName || item.createdByUser?.username}</TableCell>
                    <TableCell>{formatDate(item.createdAt) || '-'}</TableCell>
                    <TableCell>
                      <Link href={`/inventory/adjustments/${item.id}`}>
                        <Button variant="ghost" size="sm">
                          {t('view')}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {t('total', { count: total })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t('back')}
              </Button>
              <span className="text-sm">{t('page', { current: page, total: Math.ceil(total / pageSize) || 1 })}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= total}
                onClick={() => setPage(page + 1)}
              >
                {t('confirm')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
