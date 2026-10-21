'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Eye,
  MoreHorizontal,
  RotateCcw,
  CheckCircle2,
  Package,
  Copy,
  PackageOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AsnStatusBadge } from './asn-status-badge'
import { AsnTypeBadge } from './asn-type-badge'
import { formatDate } from '@/lib/utils/date-formatter'

interface Asn {
  id: string
  asnNumber: string
  externalNumber?: string | null
  asnType: string
  receiving_method?: string | null
  status: string
  expectedArrivalDate?: string | null
  actualArrivalAt?: string | null
  receivingEndAt?: string | null
  totalExpectedQty: number
  totalReceivedQty: number
  totalPutawayQty: number
  createdAt: string
  client?: {
    clientCode: string
    clientName: string
  } | null
  warehouse?: {
    warehouseCode: string
    warehouseName: string
  } | null
}

interface AsnTableProps {
  asns: Asn[]
  onRefresh?: () => void
}

type DialogType = 'rollback' | 'forceReceiving' | 'forcePutaway' | null

export function AsnTable({ asns, onRefresh }: AsnTableProps) {
  const router = useRouter()
  const t = useTranslations('asn')
  const tCommon = useTranslations('common')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [dialogType, setDialogType] = useState<DialogType>(null)
  const [selectedAsn, setSelectedAsn] = useState<Asn | null>(null)

  const openDialog = (type: DialogType, asn: Asn) => {
    setSelectedAsn(asn)
    setDialogType(type)
  }

  const closeDialog = () => {
    setDialogType(null)
    setSelectedAsn(null)
  }

  const handleRollback = async () => {
    if (!selectedAsn) return
    setLoadingId(selectedAsn.id)
    try {
      const response = await fetch(`/api/v1/asn/${selectedAsn.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User rollback' }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('rollbackSuccess'))
        onRefresh?.()
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
      closeDialog()
    }
  }

  const handleForceCompleteReceiving = async () => {
    if (!selectedAsn) return
    setLoadingId(selectedAsn.id)
    try {
      const response = await fetch(`/api/v1/asn/${selectedAsn.id}/force-complete-receiving`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Force complete by user' }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('forceCompleteReceivingSuccess'))
        onRefresh?.()
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
      closeDialog()
    }
  }

  const handleForceCompletePutaway = async () => {
    if (!selectedAsn) return
    setLoadingId(selectedAsn.id)
    try {
      const response = await fetch(`/api/v1/asn/${selectedAsn.id}/force-complete-putaway`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Force complete by user' }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('forceCompletePutawaySuccess'))
        onRefresh?.()
        router.refresh()
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
      closeDialog()
    }
  }

  const canRollback = (status: string) => ['CANCELLED'].includes(status)
  const canForceReceiving = (status: string) => ['RECEIVING'].includes(status)
  const canForcePutaway = (status: string) => ['PUTTING_AWAY'].includes(status)
  const canStartReceiving = (status: string) => ['PENDING_RECEIVING', 'RECEIVING'].includes(status)

  // 根据收货方式获取跳转路径
  const getReceivingPath = (asn: Asn) => {
    const baseParams = `?asn=${asn.asnNumber}`
    if (asn.receiving_method === 'SKU') {
      return `/receiving/sku${baseParams}`
    } else if (asn.receiving_method === 'CONTAINER') {
      return `/receiving/container${baseParams}`
    }
    // 未选择收货方式，跳转到选择页面
    return `/receiving${baseParams}`
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('number')}</TableHead>
              <TableHead>{t('asnType')}</TableHead>
              <TableHead>{t('status')}</TableHead>
              <TableHead>{t('receivingMethod')}</TableHead>
              <TableHead>{t('client')}</TableHead>
              <TableHead>{t('warehouse')}</TableHead>
              <TableHead>{t('quantities')}</TableHead>
              <TableHead>{t('date')}</TableHead>
              <TableHead className="text-right">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {asns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              asns.map((asn) => (
                <TableRow key={asn.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      <div>
                        <Link
                          href={`/asn/${asn.id}`}
                          className="text-primary hover:underline"
                        >
                          {asn.asnNumber}
                        </Link>
                        {asn.externalNumber && (
                          <div className="text-xs text-muted-foreground">{asn.externalNumber}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigator.clipboard.writeText(asn.asnNumber)
                          toast.success(tCommon('copySuccess'))
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <AsnTypeBadge type={asn.asnType} />
                  </TableCell>
                  <TableCell>
                    <AsnStatusBadge status={asn.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">
                      {asn.receiving_method ? t(`receivingMethods.${asn.receiving_method}`) : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs truncate max-w-[100px]">{asn.client?.clientName || '-'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs truncate max-w-[100px]">{asn.warehouse?.warehouseName || '-'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs tabular-nums">
                      <span className="font-medium">{asn.totalExpectedQty}</span>
                      <span className="text-muted-foreground mx-0.5">/</span>
                      <span className="font-medium">{asn.totalReceivedQty}</span>
                      <span className="text-muted-foreground mx-0.5">/</span>
                      <span className="font-medium">{asn.totalPutawayQty}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      <div>{formatDate(asn.createdAt)}</div>
                      {asn.actualArrivalAt && <div>{formatDate(asn.actualArrivalAt)}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canStartReceiving(asn.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={getReceivingPath(asn)}>
                            <PackageOpen className="h-4 w-4 mr-1" />
                            {t('actions.startReceiving')}
                          </Link>
                        </Button>
                      )}
                      <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingId === asn.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/asn/${asn.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {tCommon('view')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {canRollback(asn.status) && (
                          <DropdownMenuItem onClick={() => openDialog('rollback', asn)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {t('actions.rollback')}
                          </DropdownMenuItem>
                        )}
                        {canForceReceiving(asn.status) && (
                          <DropdownMenuItem onClick={() => openDialog('forceReceiving', asn)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t('actions.forceCompleteReceiving')}
                          </DropdownMenuItem>
                        )}
                        {canForcePutaway(asn.status) && (
                          <DropdownMenuItem onClick={() => openDialog('forcePutaway', asn)}>
                            <Package className="h-4 w-4 mr-2" />
                            {t('actions.forceCompletePutaway')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Rollback Dialog */}
      <AlertDialog open={dialogType === 'rollback'} onOpenChange={() => closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmRollback')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmRollbackDesc', { name: selectedAsn?.asnNumber || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback}>
              {tCommon('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Complete Receiving Dialog */}
      <AlertDialog open={dialogType === 'forceReceiving'} onOpenChange={() => closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmForceCompleteReceiving')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmForceCompleteReceivingDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceCompleteReceiving}>
              {tCommon('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Complete Putaway Dialog */}
      <AlertDialog open={dialogType === 'forcePutaway'} onOpenChange={() => closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmForceCompletePutaway')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmForceCompletePutawayDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceCompletePutaway}>
              {tCommon('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
