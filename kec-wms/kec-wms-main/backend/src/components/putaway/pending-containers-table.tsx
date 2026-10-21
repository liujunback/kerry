'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { formatDate, formatInShanghaiTZ } from '@/lib/utils/date-formatter'

export interface PendingContainer {
  id: string
  containerId: string
  containerCode: string
  asnNumber: string
  skuCode: string
  skuName: string | null
  barcode: string | null
  warehouse: {
    warehouseCode: string
    warehouseName: string
  } | null
  client: {
    clientCode: string
    clientName: string
  } | null
  expiryDate: string | null
  batchNumber: string | null
  quantity: number
  qualityType: string
  closedAt: string | null
  receivedBy: string
}

interface PendingContainersTableProps {
  containers: PendingContainer[]
  selectedContainers: PendingContainer[]
  onSelectionChange: (containers: PendingContainer[]) => void
  isLoading?: boolean
  total?: number
}

export function PendingContainersTable({
  containers,
  selectedContainers,
  onSelectionChange,
  isLoading,
  total,
}: PendingContainersTableProps) {
  const t = useTranslations('putaway')

  // 定义表格列
  const columns: ColumnDef<PendingContainer>[] = useMemo(
    () => [
      // 选择列（固定在左侧）
      {
        id: 'select',
        size: 40,
        header: () => {
          // 获取唯一的容器ID列表
          const uniqueContainerIds = [...new Set(containers.map((c) => c.containerId))]
          const selectedContainerIds = new Set(selectedContainers.map(c => c.containerId))
          const allSelected = uniqueContainerIds.length > 0 && uniqueContainerIds.every(id => selectedContainerIds.has(id))
          const someSelected = uniqueContainerIds.some(id => selectedContainerIds.has(id))

          return (
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = someSelected && !allSelected
                }
              }}
              onChange={(e) => {
                if (e.target.checked) {
                  // 选中当前页所有容器的所有项
                  const existingSelections = selectedContainers.filter(c => !containers.some(item => item.containerId === c.containerId))
                  onSelectionChange([...existingSelections, ...containers])
                } else {
                  // 取消选中当前页的所有容器
                  const currentContainerIds = new Set(containers.map(c => c.containerId))
                  onSelectionChange(selectedContainers.filter(c => !currentContainerIds.has(c.containerId)))
                }
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
          )
        },
        cell: ({ row }) => {
          const item = row.original
          const selectedContainerIds = new Set(selectedContainers.map(c => c.containerId))
          return (
            <input
              type="checkbox"
              checked={selectedContainerIds.has(item.containerId)}
              onChange={(e) => {
                if (e.target.checked) {
                  // 添加该容器的所有项
                  const containerItems = containers.filter(c => c.containerId === item.containerId)
                  const existingSelections = selectedContainers.filter(c => c.containerId !== item.containerId)
                  onSelectionChange([...existingSelections, ...containerItems])
                } else {
                  // 移除该容器的所有项
                  onSelectionChange(selectedContainers.filter(c => c.containerId !== item.containerId))
                }
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
          )
        },
        enableSorting: false,
        enableHiding: false,
        meta: { sticky: 'left' as const },
      },
      {
        accessorKey: 'asnNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.asn')} />,
        size: 180,
        cell: ({ row }) => <span className="font-mono text-xs font-medium">{row.original.asnNumber}</span>,
      },
      {
        accessorKey: 'containerCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('containerTable.containerCode')} />,
        size: 140,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.containerCode}</span>,
      },
      {
        id: 'sku',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.skuCode')} />,
        size: 200,
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="min-w-0 leading-tight">
              <div className="font-mono text-xs truncate" title={item.skuCode}>{item.skuCode}</div>
              {item.barcode && <div className="font-mono text-[10px] text-muted-foreground truncate" title={item.barcode}>{item.barcode}</div>}
              {item.skuName && <div className="text-[10px] text-muted-foreground truncate" title={item.skuName}>{item.skuName}</div>}
            </div>
          )
        },
      },
      {
        accessorKey: 'quantity',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('create.pendingQty')} />,
        size: 80,
        cell: ({ row }) => <div className="font-medium text-primary tabular-nums">{row.original.quantity}</div>,
      },
      {
        accessorKey: 'qualityType',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('create.quality')} />,
        size: 70,
        cell: ({ row }) => (
          row.original.qualityType === 'GOOD'
            ? <span className="text-xs text-green-600">{t('qualityTypes.GOOD')}</span>
            : <span className="text-xs text-red-600">{t('qualityTypes.DAMAGED')}</span>
        ),
      },
      {
        accessorKey: 'expiryDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.expiryDate')} />,
        size: 90,
        cell: ({ row }) => <span className="text-xs">{formatDate(row.original.expiryDate) || '-'}</span>,
      },
      {
        accessorKey: 'batchNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.batchNo')} />,
        size: 100,
        cell: ({ row }) => <span className="text-xs truncate block max-w-[100px]">{row.original.batchNumber || '-'}</span>,
      },
      {
        accessorKey: 'client.clientName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.client')} />,
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs truncate block max-w-[100px]" title={row.original.client?.clientName || ''}>
            {row.original.client?.clientName || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'warehouse.warehouseName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.warehouse')} />,
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs truncate block max-w-[100px]" title={row.original.warehouse?.warehouseName || ''}>
            {row.original.warehouse?.warehouseName || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'closedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('containerTable.closedAt')} />,
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.closedAt ? formatInShanghaiTZ(row.original.closedAt, 'yy-MM-dd HH:mm') : '-'}
          </span>
        ),
      },
    ],
    [containers, selectedContainers, onSelectionChange, t]
  )

  return (
    <DataTable
      tableId="pending-containers-table"
      columns={columns}
      data={containers}
      total={total || containers.length}
      loading={isLoading}
      enableSorting={false}
      enableColumnVisibility={false}
      enableRowSelection={false}
      manualPagination={false}
      maxHeight="100%"
    />
  )
}
