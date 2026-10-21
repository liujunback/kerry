'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Breadcrumb } from '@/components/ui/breadcrumb'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, RefreshCw, FileText, Eye } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface Audit {
  id: string
  operationType: string
  entityType: string
  entityId: string
  entityName: string | null
  oldData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
  changedFields: string[] | null
  operatorId: string | null
  operatorName: string | null
  ipAddress: string | null
  requestPath: string | null
  requestMethod: string | null
  description: string | null
  createdAt: string
}

const operationTypeColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
}

const entityTypes = [
  'Sku',
  'Warehouse',
  'Zone',
  'BinLocation',
  'Container',
  'Client',
  'Asn',
  'OutboundOrder',
  'User',
  'Role',
  'Inventory',
  'InventoryAdjustment',
  'InventoryFreeze',
  'InventoryCountOrder',
  'InventoryCountBatch',
  'InventoryCountDetail',
  'InventoryCountRecord',
  'InventoryCountLock',
  'InventoryCountDisposal',
]

export default function AuditsPage() {
  const t = useTranslations('common')
  const tAudit = useTranslations('audit')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: tAudit('title'), href: '/audits' },
  })

  const [audits, setAudits] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [operationType, setOperationType] = useState<string>('all')
  const [entityType, setEntityType] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const pageSize = 20

  useEffect(() => {
    fetchAudits()
  }, [operationType, entityType, page])

  const fetchAudits = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      })
      if (search) params.append('search', search)
      if (operationType && operationType !== 'all') params.append('operationType', operationType)
      if (entityType && entityType !== 'all') params.append('entityType', entityType)

      const response = await fetch(`/api/v1/audits?${params}`)
      const result = await response.json()

      if (result.success) {
        setAudits(result.data)
        setTotal(result.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch audits:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPage(1)
    fetchAudits()
  }

  const formatDate = (dateStr: string) => {
    return formatDateTime(dateStr)
  }

  const viewDetail = (audit: Audit) => {
    setSelectedAudit(audit)
    setDetailOpen(true)
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <Button variant="outline" onClick={fetchAudits}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="flex-shrink-0">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder={tAudit('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Select value={operationType} onValueChange={(v) => { setOperationType(v); setPage(1) }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tAudit('filterByOperation')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAudit('allOperations')}</SelectItem>
                <SelectItem value="CREATE">{tAudit('operations.CREATE')}</SelectItem>
                <SelectItem value="UPDATE">{tAudit('operations.UPDATE')}</SelectItem>
                <SelectItem value="DELETE">{tAudit('operations.DELETE')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1) }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={tAudit('filterByEntity')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAudit('allEntities')}</SelectItem>
                {entityTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {tAudit(`entities.${type}`)}
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

      {/* Audits List */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {tAudit('list')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tAudit('time')}</TableHead>
                  <TableHead>{tAudit('operation')}</TableHead>
                  <TableHead>{tAudit('entity')}</TableHead>
                  <TableHead>{tAudit('entityName')}</TableHead>
                  <TableHead>{tAudit('operator')}</TableHead>
                  <TableHead>{tAudit('changedFields')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {t('loading')}
                    </TableCell>
                  </TableRow>
                ) : audits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {t('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  audits.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(item.createdAt) || '-'}</TableCell>
                      <TableCell>
                        <Badge className={operationTypeColors[item.operationType] || ''}>
                          {tAudit(`operations.${item.operationType}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{tAudit(`entities.${item.entityType}`)}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={item.entityName || item.entityId}>
                        {item.entityName || item.entityId}
                      </TableCell>
                      <TableCell>{item.operatorName || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {item.changedFields?.join(', ') || '-'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => viewDetail(item)}>
                          <Eye className="h-4 w-4 mr-1" />
                          {t('view')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 flex-shrink-0">
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
                {t('prevPage')}
              </Button>
              <span className="text-sm">{t('page', { current: page, total: Math.ceil(total / pageSize) || 1 })}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= total}
                onClick={() => setPage(page + 1)}
              >
                {t('nextPage')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tAudit('detail')}</DialogTitle>
          </DialogHeader>
          {selectedAudit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{tAudit('time')}</label>
                  <p>{formatDate(selectedAudit.createdAt) || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{tAudit('operation')}</label>
                  <div className="mt-1">
                    <Badge className={operationTypeColors[selectedAudit.operationType] || ''}>
                      {tAudit(`operations.${selectedAudit.operationType}`)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{tAudit('entity')}</label>
                  <p>{tAudit(`entities.${selectedAudit.entityType}`)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{tAudit('entityName')}</label>
                  <p>{selectedAudit.entityName || selectedAudit.entityId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{tAudit('operator')}</label>
                  <p>{selectedAudit.operatorName || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{tAudit('ipAddress')}</label>
                  <p>{selectedAudit.ipAddress || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{tAudit('requestPath')}</label>
                  <p>{selectedAudit.requestPath || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{tAudit('requestMethod')}</label>
                  <p>{selectedAudit.requestMethod || '-'}</p>
                </div>
              </div>

              {selectedAudit.changedFields && selectedAudit.changedFields.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{tAudit('changedFields')}</label>
                  <p className="mt-1">{selectedAudit.changedFields.join(', ')}</p>
                </div>
              )}

              {selectedAudit.oldData && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{tAudit('oldData')}</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedAudit.oldData, null, 2)}
                  </pre>
                </div>
              )}

              {selectedAudit.newData && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{tAudit('newData')}</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedAudit.newData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
