'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Eye, Pencil, MoreHorizontal, Trash2, Power, PowerOff } from 'lucide-react'
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
import { PackagingMaterialStatusBadge } from './packaging-material-status-badge'
import { PackagingTypeBadge } from './packaging-type-badge'
import { PackagingSourceBadge } from './packaging-source-badge'

interface PackagingMaterial {
  id: string
  materialCode: string
  materialName: string
  materialType: string
  specification?: string | null
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  weightKg?: number | null
  unit: string
  unitPrice?: number | null
  currency?: string | null
  barcode?: string | null
  source: string
  isReusable: boolean
  isActive: boolean
  createdAt: string
}

interface PackagingMaterialTableProps {
  materials: PackagingMaterial[]
  onRefresh?: () => void
}

export function PackagingMaterialTable({ materials, onRefresh }: PackagingMaterialTableProps) {
  const router = useRouter()
  const t = useTranslations('packagingMaterial')
  const tCommon = useTranslations('common')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [materialToDelete, setMaterialToDelete] = useState<PackagingMaterial | null>(null)

  const handleStatusChange = async (materialId: string, isActive: boolean) => {
    setLoadingId(materialId)
    try {
      const response = await fetch(`/api/v1/packaging-materials/${materialId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
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

  const handleDelete = async () => {
    if (!materialToDelete) return

    setLoadingId(materialToDelete.id)
    try {
      const response = await fetch(`/api/v1/packaging-materials/${materialToDelete.id}`, {
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
      setMaterialToDelete(null)
    }
  }

  const formatDimensions = (material: PackagingMaterial) => {
    if (material.lengthCm && material.widthCm && material.heightCm) {
      return `${material.lengthCm}×${material.widthCm}×${material.heightCm}`
    }
    return '-'
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('code')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('type')}</TableHead>
              <TableHead>{t('source')}</TableHead>
              <TableHead>{t('dimensions')}</TableHead>
              <TableHead>{t('unitPrice')}</TableHead>
              <TableHead>{t('statusLabel')}</TableHead>
              <TableHead className="text-right">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.materialCode}</TableCell>
                  <TableCell>{material.materialName}</TableCell>
                  <TableCell>
                    <PackagingTypeBadge type={material.materialType} />
                  </TableCell>
                  <TableCell>
                    <PackagingSourceBadge source={material.source} />
                  </TableCell>
                  <TableCell>{formatDimensions(material)}</TableCell>
                  <TableCell>
                    {material.unitPrice
                      ? `${material.unitPrice} ${material.currency || 'CNY'}`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <PackagingMaterialStatusBadge isActive={material.isActive} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingId === material.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/packaging-materials/${material.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {tCommon('view')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/packaging-materials/${material.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {tCommon('edit')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {material.isActive ? (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(material.id, false)}
                          >
                            <PowerOff className="h-4 w-4 mr-2" />
                            {t('disable')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(material.id, true)}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {t('enable')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setMaterialToDelete(material)
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
              {t('confirmDeleteDesc', { name: materialToDelete?.materialName || '' })}
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
