'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Eye, Pencil, MoreHorizontal, Power, PowerOff, Trash2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ContainerStatusBadge } from './container-status-badge'
import { ContainerTypeBadge } from './container-type-badge'
import { BatchStatusDialog } from './batch-status-dialog'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'

interface Container {
  id: string
  containerCode: string
  containerType: string
  containerTypeLabel: string
  usage: string
  usageLabel: string
  enabledStatus: string
  enabledStatusLabel: string
  workStatus: string
  workStatusLabel: string
  lastOccupiedTime?: Date | string | null
  weightCapacityKg?: number | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  warehouse?: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  createdAt: Date | string
}

interface ContainerTableProps {
  containers: Container[]
  onRefresh?: () => void
}

export function ContainerTable({ containers, onRefresh }: ContainerTableProps) {
  const router = useRouter()
  const t = useTranslations('containers')
  const tCommon = useTranslations('common')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchAction, setBatchAction] = useState<'ENABLED' | 'DISABLED'>('ENABLED')

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(containers.map((c) => c.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectContainer = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBatchSuccess = () => {
    setSelectedIds(new Set())
    onRefresh?.()
    router.refresh()
  }

  const printContainerLabels = async (ids: string[]) => {
    const pdfUrl = `/api/v1/files/container-label/batch?ids=${ids.join(',')}`
    return await printPdfWithAgentFallback({
      pdfUrl,
      jobIdPrefix: 'container-label',
      scenarioType: 'CONTAINER_LABEL',
      relatedIds: ids,
      relatedType: 'CONTAINER',
      pageCount: ids.length,
    })
  }

  const handleBatchPrint = async () => {
    const ids = Array.from(selectedIds)
    try {
      const result = await printContainerLabels(ids)
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }
    } catch {
      toast.error(t('printError'))
    }
  }

  const handleSinglePrint = async (containerId: string) => {
    try {
      const result = await printContainerLabels([containerId])
      if (result.mode === 'browser') {
        toast.warning('打印插件不可用，已回退浏览器打印')
      }
    } catch {
      toast.error(t('printError'))
    }
  }

  const handleStatusChange = async (id: string, enabledStatus: 'ENABLED' | 'DISABLED') => {
    setLoadingId(id)
    try {
      const response = await fetch(`/api/v1/containers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledStatus }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        onRefresh?.()
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDelete'))) return

    setLoadingId(id)
    try {
      const response = await fetch(`/api/v1/containers/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('deleteSuccess'))
        onRefresh?.()
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
    }
  }

  const formatDate = (dateValue: Date | string | null | undefined) => {
    if (!dateValue) return '-'
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
    return formatDateTime(date)
  }

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm">
            {t('selectedCount', { count: selectedIds.size })}
          </span>
          <Button
            size="sm"
            onClick={() => {
              setBatchAction('ENABLED')
              setBatchDialogOpen(true)
            }}
          >
            <Power className="h-4 w-4 mr-1" />
            {t('batchEnable')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setBatchAction('DISABLED')
              setBatchDialogOpen(true)
            }}
          >
            <PowerOff className="h-4 w-4 mr-1" />
            {t('batchDisable')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleBatchPrint}
          >
            <Printer className="h-4 w-4 mr-1" />
            {t('batchPrint')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
          >
            {tCommon('cancel')}
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={containers.length > 0 && selectedIds.size === containers.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>{t('containerCode')}</TableHead>
              <TableHead>{t('containerType')}</TableHead>
              <TableHead>{t('usage')}</TableHead>
              <TableHead>{t('enabledStatus')}</TableHead>
              <TableHead>{t('warehouse')}</TableHead>
              <TableHead>{t('weightCapacityKg')}</TableHead>
              <TableHead>{t('lastOccupiedTime')}</TableHead>
              <TableHead className="text-right">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {containers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              containers.map((container) => (
                <TableRow key={container.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(container.id)}
                      onCheckedChange={(checked) =>
                        handleSelectContainer(container.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{container.containerCode}</TableCell>
                  <TableCell>
                    <ContainerTypeBadge type={container.containerType} />
                  </TableCell>
                  <TableCell>{container.usageLabel}</TableCell>
                  <TableCell>
                    <ContainerStatusBadge
                      enabledStatus={container.enabledStatus}
                      workStatus={container.workStatus}
                    />
                  </TableCell>
                  <TableCell>{container.warehouse?.warehouseName || '-'}</TableCell>
                  <TableCell>
                    {container.weightCapacityKg ? `${container.weightCapacityKg} kg` : '-'}
                  </TableCell>
                  <TableCell>{formatDate(container.lastOccupiedTime) || '-'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingId === container.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/containers/${container.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {tCommon('view')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/containers/${container.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {tCommon('edit')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSinglePrint(container.id)}>
                          <Printer className="h-4 w-4 mr-2" />
                          {t('print')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {container.enabledStatus === 'ENABLED' ? (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(container.id, 'DISABLED')}
                            disabled={container.workStatus === 'OCCUPIED'}
                          >
                            <PowerOff className="h-4 w-4 mr-2" />
                            {t('enabledStatuses.DISABLED')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(container.id, 'ENABLED')}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {t('enabledStatuses.ENABLED')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(container.id)}
                          disabled={
                            container.enabledStatus !== 'DISABLED' ||
                            container.workStatus !== 'IDLE'
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {tCommon('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <BatchStatusDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        selectedContainerIds={Array.from(selectedIds)}
        targetStatus={batchAction}
        onSuccess={handleBatchSuccess}
      />
    </div>
  )
}
