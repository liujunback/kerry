'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Eye, Pencil, MoreHorizontal, Trash2, Lock, Unlock } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { BinLocationStatusBadge } from './bin-location-status-badge'
import { BinLocationLockBadge } from './bin-location-lock-badge'

interface BinLocation {
  id: string
  locationCode: string
  aisle: string | null
  rack: string | null
  shelf: string | null
  bin: string | null
  locationType: string | null
  lockStatus: string
  isPickable: boolean
  isReceivable: boolean
  status: string
  createdAt: string
  zone: {
    id: string
    zoneCode: string
    zoneName: string | null
  }
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
}

interface BinLocationTableProps {
  binLocations: BinLocation[]
  onRefresh?: () => void
}

const statusOptions = ['ACTIVE', 'INACTIVE'] as const
const lockOptions = ['UNLOCKED', 'LOCKED'] as const

export function BinLocationTable({ binLocations, onRefresh }: BinLocationTableProps) {
  const router = useRouter()
  const t = useTranslations('binLocation')
  const tCommon = useTranslations('common')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [binToDelete, setBinToDelete] = useState<BinLocation | null>(null)

  const handleStatusChange = async (binId: string, newStatus: string) => {
    setLoadingId(binId)
    try {
      const response = await fetch(`/api/v1/bin-locations/${binId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('statusUpdateSuccess'))
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

  const handleLockChange = async (binId: string, newLockStatus: string) => {
    setLoadingId(binId)
    try {
      const response = await fetch(`/api/v1/bin-locations/${binId}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockStatus: newLockStatus }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('lockUpdateSuccess'))
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

  const handleDelete = async () => {
    if (!binToDelete) return

    setLoadingId(binToDelete.id)
    try {
      const response = await fetch(`/api/v1/bin-locations/${binToDelete.id}`, {
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
      setDeleteDialogOpen(false)
      setBinToDelete(null)
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('code')}</TableHead>
              <TableHead>{t('zone')}</TableHead>
              <TableHead>{t('location')}</TableHead>
              <TableHead>{t('type')}</TableHead>
              <TableHead>{t('flags')}</TableHead>
              <TableHead>{t('lock')}</TableHead>
              <TableHead>{t('statusLabel')}</TableHead>
              <TableHead className="text-right">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {binLocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              binLocations.map((bin) => (
                <TableRow key={bin.id}>
                  <TableCell className="font-medium">{bin.locationCode}</TableCell>
                  <TableCell>{bin.zone.zoneCode}</TableCell>
                  <TableCell>
                    {[bin.aisle, bin.rack, bin.shelf, bin.bin].filter(Boolean).join('-') || '-'}
                  </TableCell>
                  <TableCell>{bin.locationType || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {bin.isPickable && <Badge variant="outline">P</Badge>}
                      {bin.isReceivable && <Badge variant="outline">R</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <BinLocationLockBadge lockStatus={bin.lockStatus} />
                  </TableCell>
                  <TableCell>
                    <BinLocationStatusBadge status={bin.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingId === bin.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/bin-locations/${bin.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {tCommon('view')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/bin-locations/${bin.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {tCommon('edit')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-muted-foreground"
                          disabled
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          {t('changeLock')}
                        </DropdownMenuItem>
                        {lockOptions.map((lock) => (
                          <DropdownMenuItem
                            key={lock}
                            onClick={() => handleLockChange(bin.id, lock)}
                            disabled={bin.lockStatus === lock}
                          >
                            {lock === 'UNLOCKED' ? (
                              <Unlock className="h-4 w-4 mr-2" />
                            ) : (
                              <Lock className="h-4 w-4 mr-2" />
                            )}
                            {t(`lockStatus.${lock}`)}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-muted-foreground"
                          disabled
                        >
                          {t('changeStatus')}
                        </DropdownMenuItem>
                        {statusOptions.map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => handleStatusChange(bin.id, status)}
                            disabled={bin.status === status}
                          >
                            {t(`status.${status}`)}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setBinToDelete(bin)
                            setDeleteDialogOpen(true)
                          }}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteDesc', { name: binToDelete?.locationCode || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {tCommon('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
