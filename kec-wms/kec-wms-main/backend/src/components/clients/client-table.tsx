'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Eye, MoreHorizontal, Trash2, Power, PowerOff, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditClientDialog } from './edit-client-dialog'
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
import { ClientStatusBadge } from './client-status-badge'
import { ClientTypeBadge } from './client-type-badge'

interface Client {
  id: string
  clientCode: string
  clientName: string
  shortName?: string | null
  clientType: string
  contactPerson?: string | null
  contactPhone?: string | null
  city?: string | null
  isActive: boolean
  createdAt: string
  _count: {
    clientWarehouses: number
    inventoryBuckets: number
  }
}

interface ClientTableProps {
  clients: Client[]
  onRefresh?: () => void
}

export function ClientTable({ clients, onRefresh }: ClientTableProps) {
  const router = useRouter()
  const t = useTranslations('client')
  const tCommon = useTranslations('common')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)

  const handleStatusChange = async (clientId: string, isActive: boolean) => {
    setLoadingId(clientId)
    try {
      const response = await fetch(`/api/v1/clients/${clientId}/status`, {
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
    if (!clientToDelete) return

    setLoadingId(clientToDelete.id)
    try {
      const response = await fetch(`/api/v1/clients/${clientToDelete.id}`, {
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
      setClientToDelete(null)
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
              <TableHead>{t('type')}</TableHead>
              <TableHead>{t('contactPerson')}</TableHead>
              <TableHead>{t('contactPhone')}</TableHead>
              <TableHead>{t('warehouseCount')}</TableHead>
              <TableHead>{t('statusLabel')}</TableHead>
              <TableHead className="text-right">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {client.clientCode}
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(client.clientCode)
                          toast.success(tCommon('copySuccess'))
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{client.clientName}</TableCell>
                  <TableCell>
                    <ClientTypeBadge type={client.clientType} />
                  </TableCell>
                  <TableCell>{client.contactPerson || '-'}</TableCell>
                  <TableCell>{client.contactPhone || '-'}</TableCell>
                  <TableCell>{client._count.clientWarehouses}</TableCell>
                  <TableCell>
                    <ClientStatusBadge isActive={client.isActive} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingId === client.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            {tCommon('view')}
                          </Link>
                        </DropdownMenuItem>
                        <EditClientDialog clientId={client.id} />
                        <DropdownMenuSeparator />
                        {client.isActive ? (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(client.id, false)}
                          >
                            <PowerOff className="h-4 w-4 mr-2" />
                            {t('status.INACTIVE')}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(client.id, true)}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {t('status.ACTIVE')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setClientToDelete(client)
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
              {t('confirmDeleteDesc', { name: clientToDelete?.clientName || '' })}
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

