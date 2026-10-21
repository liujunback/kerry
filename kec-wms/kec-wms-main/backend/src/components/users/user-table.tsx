'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { Eye, Pencil, MoreHorizontal, Shield, QrCode, Warehouse, Unplug, Clock3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { saveListContext } from '@/lib/navigation/list-context'
import { UserStatusBadge } from './user-status-badge'
import { BatchRoleAssignDialog } from './batch-role-assign-dialog'
import { BatchBindWarehouseDialog } from './batch-bind-warehouse-dialog'
import { BatchUnbindWarehouseDialog } from './batch-unbind-warehouse-dialog'
import { BatchPdaQrcodeExpiryDialog } from './batch-pda-qrcode-expiry-dialog'
import { PdaLoginQrcodeDialog } from './pda-login-qrcode-dialog'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface UserRole {
  role: {
    id: string
    roleCode: string
    roleName: string
  }
  scopeType: string
}

interface UserWarehouse {
  warehouseId: string
  isDefault: boolean
  warehouse: {
    warehouseCode: string
    warehouseName: string
  }
}

interface User {
  id: string
  username: string
  fullName: string
  email?: string | null
  phone?: string | null
  employeeId?: string | null
  department?: string | null
  userType: string
  status: string
  lastLoginAt?: Date | string | null
  createdAt: Date | string
  userWarehouses: UserWarehouse[]
  userRoles: UserRole[]
}

interface UserTableProps {
  users: User[]
  total: number
  pagination: PaginationState
  sorting: SortingState
  onRefresh?: () => void
}

const statusOptions = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED', 'DISABLED'] as const

export function UserTable({ users, total, pagination, sorting, onRefresh }: UserTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('users')
  const tCommon = useTranslations('common')

  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchWarehouseDialogOpen, setBatchWarehouseDialogOpen] = useState(false)
  const [batchWarehouseUnbindDialogOpen, setBatchWarehouseUnbindDialogOpen] = useState(false)
  const [batchPdaQrcodeExpiryDialogOpen, setBatchPdaQrcodeExpiryDialogOpen] = useState(false)
  const [qrcodeDialogOpen, setQrcodeDialogOpen] = useState(false)
  const [qrcodeUser, setQrcodeUser] = useState<User | null>(null)
  const currentListUrl = useMemo(() => {
    const query = searchParams.toString()
    return query ? `/users?${query}` : '/users'
  }, [searchParams])

  const selectedCountOnPage = users.filter((user) => selectedUserIds.has(user.id)).length
  const allSelectedOnPage = users.length > 0 && selectedCountOnPage === users.length
  const hasSomeSelectedOnPage = selectedCountOnPage > 0 && selectedCountOnPage < users.length
  const hasSelectedUsers = selectedUserIds.size > 0

  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/users?${params.toString()}`)
  }, [router, searchParams])

  const handleSortingChange = useCallback((newSorting: SortingState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')

    if (newSorting.length > 0) {
      params.set('sortBy', newSorting[0].id)
      params.set('sortOrder', newSorting[0].desc ? 'desc' : 'asc')
    } else {
      params.delete('sortBy')
      params.delete('sortOrder')
    }

    router.push(`/users?${params.toString()}`)
  }, [router, searchParams])

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedUserIds(new Set(users.map((user) => user.id)))
      return
    }

    setSelectedUserIds(new Set())
  }, [users])

  const handleSelectUser = useCallback((userId: string, checked: boolean) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(userId)
      } else {
        next.delete(userId)
      }
      return next
    })
  }, [])

  const handleBatchSuccess = useCallback(() => {
    setSelectedUserIds(new Set())
    onRefresh?.()
    router.refresh()
  }, [onRefresh, router])

  const handleStatusChange = useCallback(async (userId: string, newStatus: string) => {
    setLoadingUserId(userId)
    try {
      const response = await fetch(`/api/v1/users/${userId}/status`, {
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
      setLoadingUserId(null)
    }
  }, [onRefresh, router, t, tCommon])

  const handleGeneratePdaQrcode = useCallback((user: User) => {
    setQrcodeUser(user)
    setQrcodeDialogOpen(true)
  }, [])

  const formatDateValue = useCallback((dateValue: Date | string | null | undefined) => {
    if (!dateValue) return '-'
    return formatDateTime(typeof dateValue === 'string' ? new Date(dateValue) : dateValue)
  }, [])

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        id: 'select',
        size: 48,
        enableSorting: false,
        header: () => (
          <Checkbox
            checked={allSelectedOnPage || (hasSomeSelectedOnPage && 'indeterminate')}
            onCheckedChange={(checked) => handleSelectAll(!!checked)}
            aria-label={tCommon('selectAll')}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedUserIds.has(row.original.id)}
            onCheckedChange={(checked) => handleSelectUser(row.original.id, !!checked)}
            aria-label={tCommon('select')}
          />
        ),
        meta: { sticky: 'left' as const },
      },
      {
        accessorKey: 'username',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('username')} />,
        size: 140,
        cell: ({ row }) => <span className="font-medium">{row.original.username}</span>,
      },
      {
        accessorKey: 'fullName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('fullName')} />,
        size: 140,
        cell: ({ row }) => <span>{row.original.fullName}</span>,
      },
      {
        accessorKey: 'department',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('department')} />,
        size: 140,
        cell: ({ row }) => <span>{row.original.department || '-'}</span>,
      },
      {
        accessorKey: 'userType',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('userType')} />,
        size: 120,
        cell: ({ row }) => (
          <span>{t(`userTypes.${row.original.userType}` as 'userTypes.INTERNAL' | 'userTypes.EXTERNAL' | 'userTypes.SYSTEM' | 'userTypes.API')}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('status')} />,
        size: 120,
        cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
      },
      {
        id: 'warehouses',
        header: tCommon('warehouse'),
        size: 240,
        enableSorting: false,
        cell: ({ row }) => {
          const displayDefaultWarehouseId = row.original.userWarehouses.find(
            (userWarehouse) => userWarehouse.isDefault
          )?.warehouseId

          return row.original.userWarehouses.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.original.userWarehouses.slice(0, 2).map((userWarehouse) => {
                const isDisplayDefault = userWarehouse.warehouseId === displayDefaultWarehouseId

                return (
                <span
                  key={userWarehouse.warehouseId}
                  className={isDisplayDefault
                    ? 'text-xs bg-primary/10 text-primary px-2 py-0.5 rounded'
                    : 'text-xs bg-muted px-2 py-0.5 rounded'}
                  title={`${userWarehouse.warehouse.warehouseCode} (${userWarehouse.warehouse.warehouseName})`}
                >
                  {userWarehouse.warehouse.warehouseCode}
                  {isDisplayDefault ? ` · ${t('defaultWarehouse')}` : ''}
                </span>
                )
              })}
              {row.original.userWarehouses.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{row.original.userWarehouses.length - 2}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{tCommon('warehouseUnconfigured')}</span>
          )
        },
      },
      {
        id: 'roles',
        header: t('roles'),
        size: 220,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.userRoles.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.original.userRoles.slice(0, 2).map((userRole) => (
                <span
                  key={userRole.role.id}
                  className="text-xs bg-muted px-2 py-0.5 rounded"
                >
                  {userRole.role.roleName}
                </span>
              ))}
              {row.original.userRoles.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{row.original.userRoles.length - 2}
                </span>
              )}
            </div>
          ) : (
            '-'
          ),
      },
      {
        accessorKey: 'lastLoginAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('lastLoginAt')} />,
        size: 180,
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap">
            {formatDateValue(row.original.lastLoginAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{tCommon('actions')}</div>,
        size: 72,
        enableSorting: false,
        meta: { sticky: 'right' as const },
        cell: ({ row }) => {
          const user = row.original
          return (
            <div className="text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={loadingUserId === user.id}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/users/${user.id}`}
                      onClick={() => saveListContext('users', currentListUrl)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {tCommon('view')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/users/${user.id}/edit`}
                      onClick={() => saveListContext('users', currentListUrl)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      {tCommon('edit')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleGeneratePdaQrcode(user)}
                    disabled={user.status !== 'ACTIVE'}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    {t('generatePdaQrcode')}
                  </DropdownMenuItem>
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
                      disabled={status === user.status || loadingUserId === user.id}
                      onClick={() => handleStatusChange(user.id, status)}
                    >
                      {t(`statuses.${status}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [
      allSelectedOnPage,
      hasSomeSelectedOnPage,
      loadingUserId,
      selectedUserIds,
      handleGeneratePdaQrcode,
      t,
      tCommon,
      currentListUrl,
      handleSelectAll,
      handleSelectUser,
      handleStatusChange,
      formatDateValue,
    ]
  )

  return (
    <div className="space-y-4 flex-1 min-h-0">
      <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
        <span className="text-sm text-muted-foreground">
          {t('selectedCount', { count: selectedUserIds.size })}
        </span>
        <Button
          size="sm"
          disabled={!hasSelectedUsers}
          onClick={() => setBatchDialogOpen(true)}
        >
          <Shield className="h-4 w-4 mr-1" />
          {t('batchAssignRole')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasSelectedUsers}
          onClick={() => setBatchWarehouseDialogOpen(true)}
        >
          <Warehouse className="h-4 w-4 mr-1" />
          {t('batchBindWarehouse')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasSelectedUsers}
          onClick={() => setBatchWarehouseUnbindDialogOpen(true)}
        >
          <Unplug className="h-4 w-4 mr-1" />
          {t('batchUnbindWarehouse')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasSelectedUsers}
          onClick={() => setBatchPdaQrcodeExpiryDialogOpen(true)}
        >
          <Clock3 className="h-4 w-4 mr-1" />
          {t('batchSetPdaQrcodeExpiry')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasSelectedUsers}
          onClick={() => setSelectedUserIds(new Set())}
        >
          {tCommon('cancel')}
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <DataTable
          tableId="users-list"
          columns={columns}
          data={users}
          total={total}
          pagination={pagination}
          sorting={sorting}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          enableSorting={true}
          enableColumnVisibility={false}
          maxHeight="100%"
        />
      </div>

      <BatchRoleAssignDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        selectedUserIds={Array.from(selectedUserIds)}
        onSuccess={handleBatchSuccess}
      />

      <BatchBindWarehouseDialog
        open={batchWarehouseDialogOpen}
        onOpenChange={setBatchWarehouseDialogOpen}
        selectedUserIds={Array.from(selectedUserIds)}
        onSuccess={handleBatchSuccess}
      />

      <BatchUnbindWarehouseDialog
        open={batchWarehouseUnbindDialogOpen}
        onOpenChange={setBatchWarehouseUnbindDialogOpen}
        selectedUserIds={Array.from(selectedUserIds)}
        onSuccess={handleBatchSuccess}
      />

      <BatchPdaQrcodeExpiryDialog
        open={batchPdaQrcodeExpiryDialogOpen}
        onOpenChange={setBatchPdaQrcodeExpiryDialogOpen}
        selectedUserIds={Array.from(selectedUserIds)}
        onSuccess={handleBatchSuccess}
      />

      {qrcodeUser && (
        <PdaLoginQrcodeDialog
          open={qrcodeDialogOpen}
          onOpenChange={setQrcodeDialogOpen}
          user={qrcodeUser}
        />
      )}
    </div>
  )
}
