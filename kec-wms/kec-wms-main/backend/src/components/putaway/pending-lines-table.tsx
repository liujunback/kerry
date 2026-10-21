'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader, getSelectColumn } from '@/components/ui/data-table'
import { formatDate } from '@/lib/utils/date-formatter'

export interface PendingLine {
  id: string
  lineNumber: number
  skuCode: string
  skuName: string | null
  status: string
  receivedQty: number
  putawayQty: number
  pendingQty: number
  pendingGoodQty?: number
  pendingDamagedQty?: number
  totalGoodQty?: number
  totalDamagedQty?: number
  batchNumber: string | null
  expiryDate: string | null
  receivedAt: string | null
  receivedByName: string | null
  asn: {
    id: string
    asnNumber: string
    warehouse: {
      warehouseCode: string
      warehouseName: string
    } | null
    client: {
      clientCode: string
      clientName: string
    } | null
  }
  sku: {
    skuCode: string
    skuName: string
    barcode: string | null
  } | null
}

interface PendingLinesTableProps {
  lines: PendingLine[]
  selectedLines: PendingLine[]
  onSelectionChange: (lines: PendingLine[]) => void
  isLoading?: boolean
  total?: number
}

export function PendingLinesTable({
  lines,
  selectedLines,
  onSelectionChange,
  isLoading,
  total,
}: PendingLinesTableProps) {
  const t = useTranslations('putaway')
  const selectedLineIds = useMemo(() => new Set(selectedLines.map((line) => line.id)), [selectedLines])

  // 定义表格列
  const columns: ColumnDef<PendingLine>[] = useMemo(
    () => [
      // 选择列（固定在左侧）
      getSelectColumn<PendingLine>(),
      {
        accessorKey: 'asn.asnNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.asn')} />,
        size: 180,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-medium">{row.original.asn.asnNumber}</span>
        ),
      },
      {
        id: 'sku',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.skuCode')} />,
        size: 200,
        cell: ({ row }) => {
          const line = row.original
          const barcode = line.sku?.barcode
          const skuName = line.skuName || line.sku?.skuName
          return (
            <div className="min-w-0 leading-tight">
              <div className="font-mono text-xs truncate" title={line.skuCode}>{line.skuCode}</div>
              {barcode && <div className="font-mono text-[10px] text-muted-foreground truncate" title={barcode}>{barcode}</div>}
              {skuName && <div className="text-[10px] text-muted-foreground truncate" title={skuName}>{skuName}</div>}
            </div>
          )
        },
      },
      {
        id: 'quantities',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('create.pendingQty')} />,
        size: 80,
        cell: ({ row }) => (
          <div className="font-medium text-primary tabular-nums">{row.original.pendingQty}</div>
        ),
      },
      {
        id: 'quality',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('create.quality')} />,
        size: 80,
        cell: ({ row }) => {
          const good = row.original.pendingGoodQty ?? row.original.pendingQty
          const damaged = row.original.pendingDamagedQty ?? 0
          return (
            <div className="text-xs tabular-nums">
              <span className="text-green-600">{good}</span>
              {damaged > 0 && (
                <>
                  <span className="text-muted-foreground mx-0.5">/</span>
                  <span className="text-red-600">{damaged}</span>
                </>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'expiryDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.expiryDate')} />,
        size: 90,
        cell: ({ row }) => (
          <span className="text-xs">{formatDate(row.original.expiryDate) || '-'}</span>
        ),
      },
      {
        accessorKey: 'batchNumber',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.batchNo')} />,
        size: 120,
        cell: ({ row }) => (
          <span className="text-xs truncate block max-w-[120px]">{row.original.batchNumber || '-'}</span>
        ),
      },
      {
        accessorKey: 'asn.client.clientName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.client')} />,
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs truncate block max-w-[100px]" title={row.original.asn.client?.clientName || ''}>
            {row.original.asn.client?.clientName || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'asn.warehouse.warehouseName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('table.warehouse')} />,
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs truncate block max-w-[100px]" title={row.original.asn.warehouse?.warehouseName || ''}>
            {row.original.asn.warehouse?.warehouseName || '-'}
          </span>
        ),
      },
    ],
    [t]
  )

  return (
    <DataTable
      tableId="pending-lines-table"
      columns={columns}
      data={lines}
      total={total || lines.length}
      loading={isLoading}
      enableSorting={false}
      enableColumnVisibility={false}
      enableRowSelection={true}
      manualPagination={false}
      maxHeight="100%"
      getRowId={(row) => row.id}
      rowSelection={Object.fromEntries(
        lines
          .filter((line) => selectedLineIds.has(line.id))
          .map((line) => [line.id, true])
      )}
      onRowSelectionChange={(selection) => {
        const selectedIds = new Set(Object.keys(selection).filter((key) => selection[key]))
        const newSelectedLines = lines.filter((line) => selectedIds.has(line.id))
        // 保留不在当前页的已选中项
        const existingSelections = selectedLines.filter(line => !lines.some(l => l.id === line.id))
        onSelectionChange([...existingSelections, ...newSelectedLines])
      }}
    />
  )
}
