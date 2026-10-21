'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { RefreshCw, Copy, MoreHorizontal, Eye, Trash2, Loader2 } from 'lucide-react'
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
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
import { ClientFilter } from '@/components/clients/client-filter'
import { ClientTypeBadge } from '@/components/clients/client-type-badge'
import { CreateClientDialog } from '@/components/clients/create-client-dialog'
import { EditClientDialog } from '@/components/clients/edit-client-dialog'
import { BindWarehouseDialog } from '@/components/clients/bind-warehouse-dialog'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { formatDate } from '@/lib/utils/date-formatter'

interface Client {
  id: string
  clientCode: string
  clientName: string
  shortName: string | null
  clientType: string
  contactPerson: string | null
  contactPhone: string | null
  city: string | null
  isActive: boolean
  createdAt: string
  _count: {
    clientWarehouses: number
    inventoryBuckets: number
  }
}

function ClientsContent() {
  const t = useTranslations('client')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('baseData')),
    module: { label: t('title'), href: '/clients' },
  })
  const router = useRouter()
  const searchParams = useSearchParams()

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const sortBy = searchParams.get('sortBy') || ''
  const sortOrder = searchParams.get('sortOrder') || ''

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortOrder === 'desc' }]
    : []

  const fetchClients = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      if (!params.has('page')) params.set('page', '1')

      const res = await fetch(`/api/v1/clients?${params}`)
      const data = await res.json()
      if (data.success) {
        setClients(data.data)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [searchParams])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/clients?${params.toString()}`)
  }

  const handleSortingChange = (newSorting: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (newSorting.length > 0) {
      params.set('sortBy', newSorting[0].id)
      params.set('sortOrder', newSorting[0].desc ? 'desc' : 'asc')
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }
    router.push(`/clients?${params.toString()}`)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(tCommon('copySuccess'))
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
        fetchClients()
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

  const columns: ColumnDef<Client>[] = useMemo(
    () => [
      {
        accessorKey: 'clientCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('code')} />,
        size: 150,
        cell: ({ row }) => {
          const client = row.original
          return (
            <div className="flex items-center gap-1">
              <Link
                href={`/clients/${client.id}`}
                className="font-mono text-xs text-primary hover:underline"
              >
                {client.clientCode}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleCopy(client.clientCode)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      },
      {
        accessorKey: 'clientName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('name')} />,
        size: 180,
        cell: ({ row }) => <span className="text-xs">{row.original.clientName}</span>,
      },
      {
        accessorKey: 'shortName',
        header: t('shortName'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.shortName || '-'}</span>,
      },
      {
        accessorKey: 'clientType',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('type')} />,
        size: 100,
        cell: ({ row }) => <ClientTypeBadge type={row.original.clientType} />,
      },
      {
        accessorKey: 'contactPerson',
        header: t('contactPerson'),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.contactPerson || '-'}</span>,
      },
      {
        accessorKey: 'contactPhone',
        header: t('contactPhone'),
        size: 120,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.contactPhone || '-'}</span>,
      },
      {
        accessorKey: 'city',
        header: t('city'),
        size: 80,
        enableSorting: false,
        cell: ({ row }) => <span className="text-xs">{row.original.city || '-'}</span>,
      },
      {
        accessorKey: 'isActive',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('statusLabel')} />,
        size: 80,
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
            {row.original.isActive ? t('status.ACTIVE') : t('status.INACTIVE')}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tCommon('createdAt')} />,
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap">
            {formatDate(row.original.createdAt) || '-'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 60,
        meta: { sticky: 'right' as const },
        cell: ({ row }) => {
          const client = row.original
          return (
            <div className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={loadingId === client.id}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/clients/${client.id}`} className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      {tCommon('view')}
                    </Link>
                  </DropdownMenuItem>
                  <BindWarehouseDialog
                    clientId={client.id}
                    clientName={client.clientName}
                    onSuccess={fetchClients}
                  />
                  <EditClientDialog clientId={client.id} />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => { setClientToDelete(client); setDeleteDialogOpen(true) }}
                    disabled={client._count.inventoryBuckets > 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {tCommon('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [t, tCommon, loadingId]
  )

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchClients}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <CreateClientDialog />
        </div>
      </div>

      <ClientFilter />

      <div className="flex-1 min-h-0">
        <DataTable
          tableId="clients-list"
          columns={columns}
          data={clients}
          total={total}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          maxHeight="100%"
        />
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
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ClientsContent />
    </Suspense>
  )
}
