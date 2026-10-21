'use client'

import React, { useState, useEffect } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ExpandedState,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
  PaginationState,
  Column,
  Table as TableType,
  Row,
} from '@tanstack/react-table'
import { useTranslations } from 'next-intl'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2,
  Settings2,
  Search,
  X,
} from 'lucide-react'

// 导出类型供外部使用
export type { ColumnDef, PaginationState, SortingState, ColumnFiltersState, VisibilityState, RowSelectionState }

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  // 表格标识（用于持久化列可见性）
  tableId?: string
  // 分页
  total?: number
  pagination?: PaginationState
  onPaginationChange?: (pagination: PaginationState) => void
  manualPagination?: boolean
  pageSizeOptions?: number[]
  // 状态
  loading?: boolean
  // 功能开关
  enableSorting?: boolean
  enableFiltering?: boolean
  enableColumnVisibility?: boolean
  enableRowSelection?: boolean
  enableGlobalFilter?: boolean
  enableExpanding?: boolean
  // 是否显示已选择数量提示
  showSelectionCount?: boolean
  // 表格最大高度（设置后表格区域内滚动）
  maxHeight?: string
  // 受控的行选择状态
  rowSelection?: RowSelectionState
  // 受控的排序状态
  sorting?: SortingState
  // 回调
  onRowSelectionChange?: (selection: RowSelectionState) => void
  onSortingChange?: (sorting: SortingState) => void
  // 子行渲染
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode
  getRowCanExpand?: (row: Row<TData>) => boolean
  // 获取行ID的函数
  getRowId?: (originalRow: TData, index: number) => string
}

// 排序图标组件
function SortingIcon<TData>({ column }: { column: Column<TData> }) {
  if (!column.getCanSort()) return null

  const sorted = column.getIsSorted()
  if (sorted === 'asc') return <ChevronUp className="ml-1 h-4 w-4" />
  if (sorted === 'desc') return <ChevronDown className="ml-1 h-4 w-4" />
  return <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />
}

// 列头组件（支持排序）
function DataTableColumnHeader<TData>({
  column,
  title,
  className,
}: {
  column: Column<TData>
  title: string
  className?: string
}) {
  if (!column.getCanSort()) {
    return <div className={className}>{title}</div>
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`-ml-3 h-8 ${className || ''}`}
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {title}
      <SortingIcon column={column} />
    </Button>
  )
}

// 列可见性控制组件
function DataTableViewOptions<TData>({ table }: { table: TableType<TData> }) {
  const tCommon = useTranslations('common')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Settings2 className="mr-2 h-4 w-4" />
          {tCommon('columns') || '列'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>{tCommon('toggleColumns') || '显示/隐藏列'}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// 分页数字生成
function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | string)[] = []
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push(1)
    pages.push('...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push('...')
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  }
  return pages
}

// 选择列定义（默认固定在左侧）
export function getSelectColumn<TData>(sticky: boolean = true): ColumnDef<TData> {
  return {
    id: 'select',
    size: 40,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: sticky ? { sticky: 'left' as const } : undefined,
  }
}

// 展开列定义
export function getExpandColumn<TData>(): ColumnDef<TData> {
  return {
    id: 'expand',
    header: () => null,
    cell: ({ row }) => {
      if (!row.getCanExpand()) return null
      return (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={row.getToggleExpandedHandler()}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      )
    },
    enableSorting: false,
    enableHiding: false,
  }
}

export function DataTable<TData, TValue>({
  columns,
  data,
  tableId,
  total,
  pagination: controlledPagination,
  onPaginationChange,
  manualPagination = true,
  pageSizeOptions = [10, 20, 50, 100, 200, 500, 1000],
  loading = false,
  enableSorting = true,
  enableFiltering = false,
  enableColumnVisibility = true,
  enableRowSelection = false,
  enableGlobalFilter = false,
  enableExpanding = false,
  showSelectionCount = false,
  maxHeight,
  rowSelection: controlledRowSelection,
  sorting: controlledSorting,
  onRowSelectionChange,
  onSortingChange,
  renderSubComponent,
  getRowCanExpand,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const tCommon = useTranslations('common')

  // 从 localStorage 读取列可见性
  const getStoredColumnVisibility = (): VisibilityState => {
    if (!tableId || typeof window === 'undefined') return {}
    try {
      const stored = localStorage.getItem(`table-visibility-${tableId}`)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  // 内部状态
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(getStoredColumnVisibility)
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})

  // 使用受控或非受控的排序状态
  const sorting = controlledSorting ?? internalSorting
  const setSorting = controlledSorting !== undefined
    ? (value: SortingState | ((prev: SortingState) => SortingState)) => {
        const newValue = typeof value === 'function' ? value(sorting) : value
        onSortingChange?.(newValue)
      }
    : setInternalSorting
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  // 使用受控或非受控的行选择状态
  const rowSelection = controlledRowSelection ?? internalRowSelection
  const setRowSelection = controlledRowSelection !== undefined
    ? (value: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => {
        const newValue = typeof value === 'function' ? value(rowSelection) : value
        onRowSelectionChange?.(newValue)
      }
    : setInternalRowSelection

  // 保存列可见性到 localStorage
  useEffect(() => {
    if (tableId && typeof window !== 'undefined') {
      localStorage.setItem(`table-visibility-${tableId}`, JSON.stringify(columnVisibility))
    }
  }, [tableId, columnVisibility])

  const pagination = controlledPagination || internalPagination
  const actualTotal = total ?? data.length

  const table = useReactTable<TData>({
    data,
    columns: columns as ColumnDef<TData, unknown>[],
    getCoreRowModel: getCoreRowModel(),
    // 行ID获取函数
    ...(getRowId && { getRowId }),
    // 排序
    ...(enableSorting && {
      getSortedRowModel: controlledSorting ? undefined : getSortedRowModel(), // 受控模式下不需要前端排序
      onSortingChange: (updater) => {
        const newSorting = typeof updater === 'function' ? updater(sorting) : updater
        setSorting(newSorting)
        if (!controlledSorting) {
          onSortingChange?.(newSorting)
        }
      },
    }),
    // 筛选
    ...(enableFiltering && {
      getFilteredRowModel: getFilteredRowModel(),
      onColumnFiltersChange: setColumnFilters,
    }),
    // 全局搜索
    ...(enableGlobalFilter && {
      onGlobalFilterChange: setGlobalFilter,
    }),
    // 展开
    ...(enableExpanding && {
      getExpandedRowModel: getExpandedRowModel(),
      onExpandedChange: setExpanded,
      getRowCanExpand: getRowCanExpand ? (row) => getRowCanExpand(row) : undefined,
    }),
    // 分页
    manualPagination,
    ...(!manualPagination && {
      getPaginationRowModel: getPaginationRowModel(),
    }),
    pageCount: manualPagination ? Math.ceil(actualTotal / pagination.pageSize) || 1 : undefined,
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater
      if (onPaginationChange) {
        onPaginationChange(newPagination)
      } else {
        setInternalPagination(newPagination)
      }
    },
    // 列可见性
    onColumnVisibilityChange: setColumnVisibility,
    // 行选择
    ...(enableRowSelection && {
      onRowSelectionChange: (updater) => {
        const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater
        setRowSelection(newSelection)
        // 非受控模式下才需要额外调用回调
        if (controlledRowSelection === undefined) {
          onRowSelectionChange?.(newSelection)
        }
      },
      enableRowSelection: true,
    }),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
      globalFilter,
      pagination,
    },
  })

  const pageCount = table.getPageCount()
  const currentPage = pagination.pageIndex + 1

  // 判断是否需要显示工具栏
  const hasSelectedRows = enableRowSelection && Object.keys(rowSelection).length > 0
  const showSelectionToolbar = showSelectionCount && hasSelectedRows
  const showToolbar = enableGlobalFilter || enableColumnVisibility || showSelectionToolbar

  return (
    <div className={maxHeight ? 'flex flex-col h-full gap-2' : 'space-y-2'}>
      {/* 工具栏 - 只在有内容时显示 */}
      {showToolbar && (
        <div className="flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* 全局搜索 */}
            {enableGlobalFilter && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={tCommon('search') || '搜索...'}
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="h-9 w-[200px] pl-8"
                />
                {globalFilter && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-7 w-7"
                    onClick={() => setGlobalFilter('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {/* 已选择数量 */}
            {showSelectionToolbar && (
              <span className="text-sm text-muted-foreground">
                {tCommon('selectedCount', { count: Object.keys(rowSelection).length }) ||
                  `已选择 ${Object.keys(rowSelection).length} 项`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 列可见性 */}
            {enableColumnVisibility && <DataTableViewOptions table={table} />}
          </div>
        </div>
      )}

      {/* 表格 */}
      <div
        className={`border rounded-lg ${maxHeight ? 'flex-1 min-h-0 overflow-auto' : 'overflow-x-auto'}`}
      >
        <Table>
          <TableHeader className={maxHeight ? 'sticky top-0 z-20 bg-muted shadow-[0_1px_0_0_hsl(var(--border))]' : undefined}>
            {table.getHeaderGroups().map((headerGroup) => {
              return (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as { sticky?: 'left' | 'right' } | undefined
                    const stickyClass = meta?.sticky === 'left'
                      ? 'sticky left-0 z-20 bg-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]'
                      : meta?.sticky === 'right'
                      ? 'sticky right-0 z-20 bg-muted shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]'
                      : ''
                    return (
                      <TableHead
                        key={header.id}
                        className={`${stickyClass} truncate`}
                        style={{ minWidth: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {tCommon('noData')}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                return (
                  <React.Fragment key={row.id}>
                    <TableRow data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map((cell) => {
                        const meta = cell.column.columnDef.meta as { sticky?: 'left' | 'right' } | undefined
                        const stickyClass = meta?.sticky === 'left'
                          ? 'sticky left-0 z-10 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]'
                          : meta?.sticky === 'right'
                          ? 'sticky right-0 z-10 bg-background shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.1)]'
                          : ''
                        return (
                          <TableCell
                            key={cell.id}
                            className={stickyClass}
                            style={{ minWidth: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                    {/* 展开行内容 */}
                    {enableExpanding && row.getIsExpanded() && renderSubComponent && (
                      <TableRow key={`${row.id}-expanded`}>
                        <TableCell colSpan={columns.length} className="bg-muted/50 p-4">
                          {renderSubComponent({ row })}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-2 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{tCommon('total', { count: actualTotal })}</span>
          <span className="mx-1">|</span>
          <span>{tCommon('perPage')}</span>
          <Select
            value={pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>{tCommon('items')}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* 首页 */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          {/* 上一页 */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {/* 页码 */}
          {generatePageNumbers(currentPage, pageCount).map((pageNum, idx) =>
            pageNum === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={pageNum === currentPage ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex((pageNum as number) - 1)}
              >
                {pageNum}
              </Button>
            )
          )}
          {/* 下一页 */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {/* 末页 */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// 导出列头组件供外部使用
export { DataTableColumnHeader }
