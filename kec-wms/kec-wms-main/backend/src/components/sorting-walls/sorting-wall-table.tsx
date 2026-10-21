'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Trash2, Power, PowerOff, Eye, Unlock } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
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
import { SortingWallStatusBadge } from './sorting-wall-status-badge'

interface SortingWall {
  id: string
  wallCode: string
  wallName: string
  workstationCode: string
  horizontalCells: number
  verticalCells: number
  totalCells: number
  isActive: boolean
  sortStatus: string
  locationCode: string
  remarks: string | null
  createdAt: string
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
}

interface SortingWallTableProps {
  sortingWalls: SortingWall[]
}

export function SortingWallTable({ sortingWalls }: SortingWallTableProps) {
  const router = useRouter()
  const t = useTranslations('sortingWall')
  const tCommon = useTranslations('common')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [releaseId, setReleaseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/v1/sorting-walls/${deleteId}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('deleteSuccess'))
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
      setDeleteId(null)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/v1/sorting-walls/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error(tCommon('error'))
    }
  }

  const handleRelease = async () => {
    if (!releaseId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/v1/sorting-walls/${releaseId}/release`, {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('releaseSuccess'))
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
      setReleaseId(null)
    }
  }

  if (sortingWalls.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        {tCommon('noData')}
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('wallCode')}</TableHead>
              <TableHead>{t('wallName')}</TableHead>
              <TableHead>{t('warehouse')}</TableHead>
              <TableHead>{t('workstationCode')}</TableHead>
              <TableHead>{t('cellConfig')}</TableHead>
              <TableHead>{t('sortStatus')}</TableHead>
              <TableHead>{t('isActive')}</TableHead>
              <TableHead className="w-[100px]">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortingWalls.map((wall) => (
              <TableRow key={wall.id}>
                <TableCell className="font-mono">
                  <Link
                    href={`/sorting-walls/${wall.id}`}
                    className="text-primary hover:underline"
                  >
                    {wall.wallCode}
                  </Link>
                </TableCell>
                <TableCell>{wall.wallName}</TableCell>
                <TableCell>
                  {wall.warehouse.warehouseName} ({wall.warehouse.warehouseCode})
                </TableCell>
                <TableCell>{wall.workstationCode}</TableCell>
                <TableCell>
                  {wall.horizontalCells} × {wall.verticalCells} = {wall.totalCells}
                </TableCell>
                <TableCell>
                  <SortingWallStatusBadge status={wall.sortStatus} type="sort" />
                </TableCell>
                <TableCell>
                  <SortingWallStatusBadge
                    status={wall.isActive ? 'true' : 'false'}
                    type="active"
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/sorting-walls/${wall.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          {tCommon('view')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/sorting-walls/${wall.id}/edit`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {tCommon('edit')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleStatus(wall.id, wall.isActive)}
                        disabled={wall.sortStatus === 'SORTING' && wall.isActive}
                      >
                        {wall.isActive ? (
                          <>
                            <PowerOff className="h-4 w-4 mr-2" />
                            {t('disable')}
                          </>
                        ) : (
                          <>
                            <Power className="h-4 w-4 mr-2" />
                            {t('enable')}
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {wall.sortStatus === 'SORTED' && (
                        <DropdownMenuItem
                          onClick={() => setReleaseId(wall.id)}
                        >
                          <Unlock className="h-4 w-4 mr-2" />
                          {t('releaseWall')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeleteId(wall.id)}
                        disabled={wall.sortStatus === 'SORTING'}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {tCommon('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon('confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!releaseId} onOpenChange={() => setReleaseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('releaseWallConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('releaseWallDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRelease} disabled={loading}>
              {t('releaseWall')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
