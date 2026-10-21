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
import { Search, Plus, RefreshCw, Snowflake } from 'lucide-react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface Freeze {
  id: string
  freezeNumber: string
  freezeType: string
  status: string
  reason: string
  totalItems: number
  totalQuantity: number
  createdAt: string
  releasedAt: string | null
  warehouse: {
    code: string
    name: string
  }
  createdByUser: {
    name: string
  }
  releasedByUser: {
    name: string
  } | null
  _count: {
    lines: number
  }
}

const statusColors: Record<string, string> = {
  FROZEN: 'bg-blue-100 text-blue-800',
  RELEASED: 'bg-green-100 text-green-800',
}

const typeColors: Record<string, string> = {
  QC_HOLD: 'bg-yellow-100 text-yellow-800',
  DEFECTIVE_HOLD: 'bg-red-100 text-red-800',
  EXPIRY_HOLD: 'bg-orange-100 text-orange-800',
  RECALL_HOLD: 'bg-purple-100 text-purple-800',
  COUNT_HOLD: 'bg-gray-100 text-gray-800',
  MANUAL_HOLD: 'bg-blue-100 text-blue-800',
}

export default function FreezesPage() {
  const t = useTranslations('common')
  const tFrz = useTranslations('inventory.freeze')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tFrz('title'), href: '/inventory/freezes' },
  })

  const [freezes, setFreezes] = useState<Freeze[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [freezeType, setFreezeType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  useEffect(() => {
    fetchFreezes()
  }, [status, freezeType, page])

  const fetchFreezes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (search) params.append('search', search)
      if (status && status !== 'all') params.append('status', status)
      if (freezeType && freezeType !== 'all') params.append('freezeType', freezeType)

      const response = await fetch(`/api/v1/inventory/freezes?${params}`)
      const result = await response.json()

      if (result.data) {
        setFreezes(result.data)
        setTotal(result.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch freezes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchFreezes()
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
          <Button variant="outline" onClick={fetchFreezes}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh')}
          </Button>
          <Link href="/inventory/freezes/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {tFrz('create')}
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
                placeholder={tFrz('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tFrz('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFrz('allStatus')}</SelectItem>
                <SelectItem value="FROZEN">{tFrz('statuses.FROZEN')}</SelectItem>
                <SelectItem value="RELEASED">{tFrz('statuses.RELEASED')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={freezeType} onValueChange={(v) => { setFreezeType(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tFrz('filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFrz('allTypes')}</SelectItem>
                <SelectItem value="QC_HOLD">{tFrz('types.QC_HOLD')}</SelectItem>
                <SelectItem value="DEFECTIVE_HOLD">{tFrz('types.DEFECTIVE_HOLD')}</SelectItem>
                <SelectItem value="EXPIRY_HOLD">{tFrz('types.EXPIRY_HOLD')}</SelectItem>
                <SelectItem value="RECALL_HOLD">{tFrz('types.RECALL_HOLD')}</SelectItem>
                <SelectItem value="COUNT_HOLD">{tFrz('types.COUNT_HOLD')}</SelectItem>
                <SelectItem value="MANUAL_HOLD">{tFrz('types.MANUAL_HOLD')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              {t('search')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Freezes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Snowflake className="h-5 w-5" />
            {tFrz('list')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tFrz('freezeNumber')}</TableHead>
                <TableHead>{tFrz('type')}</TableHead>
                <TableHead>{tFrz('status')}</TableHead>
                <TableHead>{tFrz('warehouse')}</TableHead>
                <TableHead>{tFrz('quantity')}</TableHead>
                <TableHead>{tFrz('reason')}</TableHead>
                <TableHead>{tFrz('createdBy')}</TableHead>
                <TableHead>{tFrz('createdAt')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    {t('loading')}
                  </TableCell>
                </TableRow>
              ) : freezes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    {t('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                freezes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.freezeNumber}</TableCell>
                    <TableCell>
                      <Badge className={typeColors[item.freezeType] || ''}>
                        {tFrz(`types.${item.freezeType}` as const)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[item.status] || ''}>
                        {tFrz(`statuses.${item.status}` as const)}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.warehouse?.name}</TableCell>
                    <TableCell>{item.totalQuantity}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.reason}>
                      {item.reason}
                    </TableCell>
                    <TableCell>{item.createdByUser?.name}</TableCell>
                    <TableCell>{formatDate(item.createdAt) || '-'}</TableCell>
                    <TableCell>
                      <Link href={`/inventory/freezes/${item.id}`}>
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
