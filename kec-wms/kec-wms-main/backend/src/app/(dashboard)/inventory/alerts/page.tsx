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
import { Search, RefreshCw, Bell, Check, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface Alert {
  id: string
  alertType: string
  severity: string
  status: string
  message: string
  threshold: number | null
  currentQuantity: number
  createdAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  warehouse: {
    code: string
    name: string
  }
  sku: {
    code: string
    name: string
  }
  acknowledgedByUser: {
    name: string
  } | null
}

interface AlertStats {
  critical: number
  warning: number
  info: number
  low: number
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-red-100 text-red-800',
  ACKNOWLEDGED: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
}

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500 text-white',
  WARNING: 'bg-orange-500 text-white',
  INFO: 'bg-blue-500 text-white',
  LOW: 'bg-gray-500 text-white',
}

const severityIcons: Record<string, React.ReactNode> = {
  CRITICAL: <AlertCircle className="h-4 w-4" />,
  WARNING: <AlertTriangle className="h-4 w-4" />,
  INFO: <Info className="h-4 w-4" />,
  LOW: <Info className="h-4 w-4" />,
}

export default function AlertsPage() {
  const t = useTranslations('common')
  const tAlert = useTranslations('inventory.alert')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tAlert('title'), href: '/inventory/alerts' },
  })

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [stats, setStats] = useState<AlertStats>({ critical: 0, warning: 0, info: 0, low: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [alertType, setAlertType] = useState<string>('all')
  const [severity, setSeverity] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  useEffect(() => {
    fetchAlerts()
  }, [status, alertType, severity, page])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (search) params.append('search', search)
      if (status && status !== 'all') params.append('status', status)
      if (alertType && alertType !== 'all') params.append('alertType', alertType)
      if (severity && severity !== 'all') params.append('severity', severity)

      const response = await fetch(`/api/v1/inventory/alerts?${params}`)
      const result = await response.json()

      if (result.data) {
        setAlerts(result.data)
        setTotal(result.pagination?.total || 0)
        setStats(result.stats || { critical: 0, warning: 0, info: 0, low: 0 })
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchAlerts()
  }

  const handleAcknowledge = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/inventory/alerts/${id}/acknowledge`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.data) {
        toast.success(tAlert('acknowledgeSuccess'))
        fetchAlerts()
      } else {
        toast.error(result.error || '操作失败')
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
      toast.error('操作失败')
    }
  }

  const handleResolve = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/inventory/alerts/${id}/resolve`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.data) {
        toast.success('预警已解决')
        fetchAlerts()
      } else {
        toast.error(result.error || '操作失败')
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
      toast.error('操作失败')
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return formatDateTime(dateStr)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
        <Button variant="outline" onClick={fetchAlerts}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('refresh')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">紧急</div>
                <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">警告</div>
                <div className="text-2xl font-bold text-orange-600">{stats.warning}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">提示</div>
                <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
              </div>
              <Info className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">低</div>
                <div className="text-2xl font-bold text-gray-600">{stats.low}</div>
              </div>
              <Info className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder={tAlert('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tAlert('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAlert('allStatus')}</SelectItem>
                <SelectItem value="ACTIVE">{tAlert('statuses.ACTIVE')}</SelectItem>
                <SelectItem value="ACKNOWLEDGED">{tAlert('statuses.ACKNOWLEDGED')}</SelectItem>
                <SelectItem value="RESOLVED">{tAlert('statuses.RESOLVED')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={alertType} onValueChange={(v) => { setAlertType(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tAlert('filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAlert('allTypes')}</SelectItem>
                <SelectItem value="OUT_OF_STOCK">{tAlert('types.OUT_OF_STOCK')}</SelectItem>
                <SelectItem value="LOW_STOCK">{tAlert('types.LOW_STOCK')}</SelectItem>
                <SelectItem value="NEAR_EXPIRY">{tAlert('types.NEAR_EXPIRY')}</SelectItem>
                <SelectItem value="EXPIRED">{tAlert('types.EXPIRED')}</SelectItem>
                <SelectItem value="OVERSTOCK">{tAlert('types.OVERSTOCK')}</SelectItem>
                <SelectItem value="SLOW_MOVING">{tAlert('types.SLOW_MOVING')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="筛选严重程度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有级别</SelectItem>
                <SelectItem value="CRITICAL">{tAlert('severities.CRITICAL')}</SelectItem>
                <SelectItem value="WARNING">{tAlert('severities.WARNING')}</SelectItem>
                <SelectItem value="INFO">{tAlert('severities.INFO')}</SelectItem>
                <SelectItem value="LOW">{tAlert('severities.LOW')}</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              {t('search')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {tAlert('list')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>级别</TableHead>
                <TableHead>{tAlert('type')}</TableHead>
                <TableHead>{tAlert('status')}</TableHead>
                <TableHead>{tAlert('sku')}</TableHead>
                <TableHead>{tAlert('warehouse')}</TableHead>
                <TableHead>{tAlert('message')}</TableHead>
                <TableHead>{tAlert('currentQty')}</TableHead>
                <TableHead>{tAlert('createdAt')}</TableHead>
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
              ) : alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    {t('noData')}
                  </TableCell>
                </TableRow>
              ) : (
                alerts.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge className={severityColors[item.severity] || ''}>
                        <span className="flex items-center gap-1">
                          {severityIcons[item.severity]}
                          {tAlert(`severities.${item.severity}` as const)}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tAlert(`types.${item.alertType}` as const)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[item.status] || ''}>
                        {tAlert(`statuses.${item.status}` as const)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.sku?.code}</div>
                      <div className="text-sm text-muted-foreground">{item.sku?.name}</div>
                    </TableCell>
                    <TableCell>{item.warehouse?.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.message}>
                      {item.message}
                    </TableCell>
                    <TableCell>{item.currentQuantity}</TableCell>
                    <TableCell>{formatDate(item.createdAt) || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {item.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcknowledge(item.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status !== 'RESOLVED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolve(item.id)}
                          >
                            解决
                          </Button>
                        )}
                      </div>
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
