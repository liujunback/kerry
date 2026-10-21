'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Eye, Pencil, MoreHorizontal, Trash2, Power, PowerOff, Pause, KeyRound, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TenantStatusBadge } from './tenant-status-badge'

interface Tenant {
  id: string
  tenantCode: string
  tenantName: string
  contactPerson?: string | null
  contactPhone?: string | null
  status: string
  createdAt: string
  _count: {
    users: number
    warehouses: number
    clients: number
  }
}

interface TenantTableProps {
  tenants: Tenant[]
  onRefresh?: () => void
}

interface ResetPasswordResult {
  username: string
  password: string
  fullName: string
}

export function TenantTable({ tenants, onRefresh }: TenantTableProps) {
  const router = useRouter()
  const t = useTranslations('tenant')
  const tCommon = useTranslations('common')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [resetPasswordResult, setResetPasswordResult] = useState<ResetPasswordResult | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleResetPassword = async (tenantId: string) => {
    setLoadingId(tenantId)
    try {
      const response = await fetch(`/api/v1/tenants/${tenantId}/reset-password`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        setResetPasswordResult(result.data)
        setResetPasswordDialogOpen(true)
        toast.success(t('resetPasswordSuccess'))
      } else {
        toast.error(result.message || tCommon('error'))
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoadingId(null)
    }
  }

  const handleStatusChange = async (tenantId: string, status: string) => {
    setLoadingId(tenantId)
    try {
      const response = await fetch(`/api/v1/tenants/${tenantId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
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
    if (!tenantToDelete) return

    setLoadingId(tenantToDelete.id)
    try {
      const response = await fetch(`/api/v1/tenants/${tenantToDelete.id}`, {
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
      setTenantToDelete(null)
    }
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('code')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('contactPerson')}</TableHead>
              <TableHead>{t('contactPhone')}</TableHead>
              <TableHead>{t('userCount')}</TableHead>
              <TableHead>{t('warehouseCount')}</TableHead>
              <TableHead>{t('clientCount')}</TableHead>
              <TableHead>{t('statusLabel')}</TableHead>
              <TableHead className="text-right">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.tenantCode}</TableCell>
                  <TableCell>{tenant.tenantName}</TableCell>
                  <TableCell>{tenant.contactPerson || '-'}</TableCell>
                  <TableCell>{tenant.contactPhone || '-'}</TableCell>
                  <TableCell>{tenant._count.users}</TableCell>
                  <TableCell>{tenant._count.warehouses}</TableCell>
                  <TableCell>{tenant._count.clients}</TableCell>
                  <TableCell>
                    <TenantStatusBadge status={tenant.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingId === tenant.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/tenants/${tenant.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {tCommon('view')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/tenants/${tenant.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {tCommon('edit')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Power className="h-4 w-4 mr-2" />
                            {t('changeStatus')}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(tenant.id, 'ACTIVE')}
                              disabled={tenant.status === 'ACTIVE'}
                            >
                              <Power className="h-4 w-4 mr-2 text-green-500" />
                              {t('status.ACTIVE')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(tenant.id, 'INACTIVE')}
                              disabled={tenant.status === 'INACTIVE'}
                            >
                              <PowerOff className="h-4 w-4 mr-2 text-gray-500" />
                              {t('status.INACTIVE')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(tenant.id, 'SUSPENDED')}
                              disabled={tenant.status === 'SUSPENDED'}
                            >
                              <Pause className="h-4 w-4 mr-2 text-red-500" />
                              {t('status.SUSPENDED')}
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem onClick={() => handleResetPassword(tenant.id)}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          {t('resetPassword')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setTenantToDelete(tenant)
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
              {t('confirmDeleteDesc', { name: tenantToDelete?.tenantName || '' })}
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

      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('resetPasswordTitle')}</DialogTitle>
            <DialogDescription>
              {t('resetPasswordDescription')}
            </DialogDescription>
          </DialogHeader>
          {resetPasswordResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('adminUsername')}</Label>
                <div className="flex items-center gap-2">
                  <Input value={resetPasswordResult.username} readOnly className="font-mono" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(resetPasswordResult.username, 'username')}
                  >
                    {copiedField === 'username' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('newPassword')}</Label>
                <div className="flex items-center gap-2">
                  <Input value={resetPasswordResult.password} readOnly className="font-mono" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(resetPasswordResult.password, 'password')}
                  >
                    {copiedField === 'password' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-amber-600">
                {t('passwordWarning')}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResetPasswordDialogOpen(false)}>{tCommon('confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
