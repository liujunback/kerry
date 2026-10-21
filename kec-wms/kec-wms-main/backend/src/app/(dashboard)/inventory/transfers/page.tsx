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
import { Search, Plus, RefreshCw, ArrowLeftRight } from 'lucide-react'
import Link from 'next/link'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface Transfer {
  id: string
  transferNumber: string
  transferType: string
  status: string
  reason: string
  totalItems: number
  totalQuantity: number
  createdAt: string
  approvedAt: string | null
  executedAt: string | null
  warehouse: {
    code: string
    name: string
  }
  createdByUser: {
    name: string
  }
  approvedByUser: {
    name: string
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
  IN_TRANSIT: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

export default function TransfersPage() {
  const t = useTranslations('common')
  const tTrf = useTranslations('inventory.transfer')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tTrf('title'), href: '/inventory/transfers' },
  })

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [transferType, setTransferType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  useEffect(() => {
    fetchTransfers()
  }, [status, transferType, page])

  const fetchTransfers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (search) params.append('search', search)
      if (status && status !== 'all') params.append('status', status)
      if (transferType && transferType !== 'all') params.append('transferType', transferType)

      const response = await fetch(`/api/v1/inventory/transfers?${params}`)
      const result = await response.json()

      if (result.data) {
        setTransfers(result.data)
        setTotal(result.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch transfers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchTransfers()
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
          <Button variant="outline" onClick={fetchTransfers}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('refresh')}
          </Button>
          <Link href="/inventory/transfers/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {tTrf('create')}
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
                placeholder={tTrf('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tTrf('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tTrf('allStatus')}</SelectItem>
                <SelectItem value="DRAFT">{tTrf('statuses.DRAFT')}</SelectItem>
                <SelectItem value="PENDING">{tTrf('statuses.PENDING')}</SelectItem>
                <SelectItem value="APPROVED">{tTrf('statuses.APPROVED')}</SelectItem>
                <SelectItem value="REJECTED">{tTrf('statuses.REJECTED')}</SelectItem>
                <SelectItem value="IN_TRANSIT">{tTrf('statuses.IN_TRANSIT')}</SelectItem>
                <SelectItem value="COMPLETED">{tTrf('statuses.COMPLETED')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={transferType} onValueChange={(v) => { setTransferType(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tTrf('filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tTrf('allTypes')}</SelectItem>
                <SelectItem value="BIN_TRANSFER">{tTrf('types.BIN_TRANSFER')}</SelectItem>
                <SelectItem value="STATUS_TRANSFER">{tTrf('types.STATUS_TRANSFER')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              {t('search')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transfers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            {tTrf('list')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tTrf('transferNumber')}</TableHead>
                <TableHead>{tTrf('type')}</TableHead>
                <TableHead>{tTrf('status')}</TableHead>
                <TableHead>{tTrf('warehouse')}</TableHead>
                <TableHead>{tTrf('totalQuantity')}</TableHead>
                <TableHead>{tTrf('reason')}</TableHead>
                <TableHead>{tTrf('createdBy')}</TableHead>
                <TableHead>{tTrf('createdAt')}</TableHead>
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
              ) : transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    {t('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.transferNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tTrf(`types.${item.transferType}` as const)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[item.status] || ''}>
                        {tTrf(`statuses.${item.status}` as const)}
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
                      <Link href={`/inventory/transfers/${item.id}`}>
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
