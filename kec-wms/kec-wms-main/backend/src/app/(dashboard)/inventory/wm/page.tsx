'use client'

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Edit, ArrowUpDown, MapPin, CheckCircle, Snowflake, Sun, Loader2 } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { InventoryAdjustmentDialog } from '@/components/inventory/inventory-adjustment-dialog'
import { InventoryQuantityAdjustmentDialog } from '@/components/inventory/inventory-quantity-adjustment-dialog'
import { InventoryLocationAdjustmentDialog } from '@/components/inventory/inventory-location-adjustment-dialog'
import { InventoryQualityAdjustmentDialog } from '@/components/inventory/inventory-quality-adjustment-dialog'
import { InventoryFreezeDialog } from '@/components/inventory/inventory-freeze-dialog'
import { InventoryUnfreezeDialog } from '@/components/inventory/inventory-unfreeze-dialog'
import { InventoryWmFilter } from '@/components/inventory/inventory-wm-filter'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { formatDate } from '@/lib/utils/date-formatter'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface WMInventoryItem {
  id: string
  skuId: string
  skuCode: string
  skuName?: string
  batchNumber: string | null
  lpn: string | null
  asnNumber: string | null
  quantityAllocated: number
  quantityAvailable: number
  quantityPicking: number
  quantityFrozen: number
  quantityDefective: number
  quantityException: number
  quantityQcHold: number
  quantityCountHold: number
  quantityCountSurplus: number
  quantityCountShortage: number
  lockStatus: string
  expiryDate: string | null
  productionDate?: string | null
  receivedDate: string | null
  ageDays: number | null
  warehouseId: string
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  zone: {
    id: string
    zoneCode: string
    zoneName: string
  }
  location: {
    id: string
    locationCode: string
    locationName?: string
  }
  client?: {
    id: string
    clientCode: string
    clientName: string
  }
  _count: {
    serialNumbers: number
  }
}

function WMInventoryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const t = useTranslations('common')
  const tInv = useTranslations('inventory.detail')
  const tInvSummary = useTranslations('inventory.summary')
  const tMenuGroup = useTranslations('menuGroup')
  const tLock = useTranslations('inventory.lockStatuses')
  const tAdj = useTranslations('inventory.adjustment')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }, { label: tInvSummary('title'), href: '/inventory' }],
    module: { label: tInv('title'), href: '/inventory/wm' },
  })

  const [inventories, setInventories] = useState<WMInventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize,
  }

  // 库存调整对话框状态
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)
  const [quantityAdjustmentDialogOpen, setQuantityAdjustmentDialogOpen] = useState(false)
  const [locationAdjustmentDialogOpen, setLocationAdjustmentDialogOpen] = useState(false)
  const [qualityAdjustmentDialogOpen, setQualityAdjustmentDialogOpen] = useState(false)
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false)
  const [unfreezeDialogOpen, setUnfreezeDialogOpen] = useState(false)
  const [selectedInventory] = useState<WMInventoryItem | null>(null)
  const [selectedBucketInventory, setSelectedBucketInventory] = useState<any>(null)

  // 下拉选项数据

  const fetchInventories = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', pageSize.toString())
      if (!params.has('page')) params.set('page', '1')

      const response = await fetch(`/api/v1/inventory?${params}`)
      const result = await response.json()

      if (result.success) {
        setInventories(result.data)
        setTotal(result.pagination?.total || result.data.length)
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
    }
  }, [pageSize, searchParams])

  useEffect(() => {
    fetchInventories()
  }, [fetchInventories])

  const handlePaginationChange = (newPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', (newPagination.pageIndex + 1).toString())
    params.set('pageSize', newPagination.pageSize.toString())
    router.push(`/inventory/wm?${params.toString()}`)
  }


// 计算总库存数量
  const getTotalQuantity = (item: WMInventoryItem) => {
    return item.quantityAvailable + item.quantityAllocated + item.quantityPicking + item.quantityFrozen + item.quantityDefective + item.quantityException + item.quantityQcHold + item.quantityCountHold
  }

  // 打开库存调整对话框
  // 打开数量调整对话框
  const handleQuantityAdjustment = (item: WMInventoryItem, bucketType: string) => {
    // 将汇总数据转换为桶数据格式
    const bucketItem = {
      id: item.id,
      skuId: item.skuId,
      skuCode: item.skuCode,
      skuName: item.skuName,
      batchNumber: item.batchNumber,
      lpn: item.lpn || null,
      asnNumber: item.asnNumber || null,
      expiryDate: item.expiryDate,
      productionDate: item.productionDate,
      bucketType,
      quantity: getBucketQuantity(item, bucketType),
      warehouseId: item.warehouseId,
      warehouse: item.warehouse,
      location: item.location,
      client: item.client,
    }
    setSelectedBucketInventory(bucketItem)
    setQuantityAdjustmentDialogOpen(true)
  }

  // 打开库位调整对话框
  const handleLocationAdjustment = (item: WMInventoryItem, bucketType: string) => {
    const bucketItem = {
      id: item.id,
      skuId: item.skuId,
      skuCode: item.skuCode,
      skuName: item.skuName,
      batchNumber: item.batchNumber,
      lpn: item.lpn || null,
      asnNumber: item.asnNumber || null,
      expiryDate: item.expiryDate,
      productionDate: item.productionDate,
      bucketType,
      quantity: getBucketQuantity(item, bucketType),
      warehouseId: item.warehouseId,
      warehouse: item.warehouse,
      location: item.location,
      client: item.client,
    }
    setSelectedBucketInventory(bucketItem)
    setLocationAdjustmentDialogOpen(true)
  }

  // 打开质量调整对话框
  const handleQualityAdjustment = (item: WMInventoryItem, bucketType: string) => {
    const bucketItem = {
      id: item.id,
      skuId: item.skuId,
      skuCode: item.skuCode,
      skuName: item.skuName,
      batchNumber: item.batchNumber,
      lpn: item.lpn || null,
      asnNumber: item.asnNumber || null,
      expiryDate: item.expiryDate,
      productionDate: item.productionDate,
      bucketType,
      quantity: getBucketQuantity(item, bucketType),
      warehouseId: item.warehouseId,
      warehouse: item.warehouse,
      location: item.location,
      client: item.client,
    }
    setSelectedBucketInventory(bucketItem)
    setQualityAdjustmentDialogOpen(true)
  }

  const handleFreeze = (item: WMInventoryItem) => {
    const bucketItem = {
      id: item.id,
      skuId: item.skuId,
      skuCode: item.skuCode,
      skuName: item.skuName,
      batchNumber: item.batchNumber,
      lpn: item.lpn || null,
      asnNumber: item.asnNumber || null,
      expiryDate: item.expiryDate,
      productionDate: item.productionDate,
      bucketType: 'AVAILABLE',
      quantity: item.quantityAvailable,
      warehouseId: item.warehouseId,
      warehouse: item.warehouse,
      location: item.location,
      client: item.client,
    }
    setSelectedBucketInventory(bucketItem)
    setFreezeDialogOpen(true)
  }

  const handleUnfreeze = (item: WMInventoryItem) => {
    const bucketItem = {
      id: item.id,
      skuId: item.skuId,
      skuCode: item.skuCode,
      skuName: item.skuName,
      batchNumber: item.batchNumber,
      lpn: item.lpn || null,
      asnNumber: item.asnNumber || null,
      expiryDate: item.expiryDate,
      productionDate: item.productionDate,
      bucketType: 'FROZEN',
      quantity: item.quantityFrozen,
      warehouseId: item.warehouseId,
      warehouse: item.warehouse,
      location: item.location,
      client: item.client,
    }
    setSelectedBucketInventory(bucketItem)
    setUnfreezeDialogOpen(true)
  }

  // 根据桶类型获取数量
  const getBucketQuantity = (item: WMInventoryItem, bucketType: string): number => {
    switch (bucketType) {
      case 'AVAILABLE': return item.quantityAvailable
      case 'ALLOCATED': return item.quantityAllocated
      case 'PICKING': return item.quantityPicking
      case 'FROZEN': return item.quantityFrozen
      case 'DEFECTIVE': return item.quantityDefective
      case 'EXCEPTION': return item.quantityException
      case 'QC_HOLD': return item.quantityQcHold
      case 'COUNT_HOLD': return item.quantityCountHold
      case 'COUNT_SURPLUS': return item.quantityCountSurplus
      case 'COUNT_SHORTAGE': return item.quantityCountShortage
      default: return 0
    }
  }

  // 调整成功后刷新列表
  const handleAdjustmentSuccess = () => {
    fetchInventories()
  }

  const handleAsnClick = async (asnNumber: string) => {
    if (asnNumber.startsWith('RTN-')) {
      try {
        const response = await fetch(`/api/v1/returns?search=${encodeURIComponent(asnNumber)}&pageSize=1`)
        const result = await response.json()
        const returnOrder = Array.isArray(result.data?.items) ? result.data.items[0] : null

        if (result.success && returnOrder?.id) {
          router.push(`/returns/${returnOrder.id}`)
        } else {
          router.push(`/returns?search=${encodeURIComponent(asnNumber)}`)
        }
      } catch (error) {
        console.error('Failed to lookup return order:', error)
        router.push(`/returns?search=${encodeURIComponent(asnNumber)}`)
      }
      return
    }

    try {
      const response = await fetch(`/api/v1/asn?asnNumber=${encodeURIComponent(asnNumber)}&pageSize=1`)
      const result = await response.json()

      const asn = Array.isArray(result.data?.items) ? result.data.items[0] : null

      if (result.success && asn?.id) {
        router.push(`/asn/${asn.id}`)
      } else {
        // 如果查询失败，回退到列表页面筛选
        router.push(`/asn?asnNumber=${encodeURIComponent(asnNumber)}`)
      }
    } catch (error) {
      console.error('Failed to lookup ASN:', error)
      // 出错时回退到列表页面筛选
      router.push(`/asn?asnNumber=${encodeURIComponent(asnNumber)}`)
    }
  }

  const columns: ColumnDef<WMInventoryItem>[] = useMemo(
    () => [
      {
        accessorKey: 'skuCode',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tInv('skuCode')} />,
        size: 200,
        cell: ({ row }) => {
          const item = row.original
          const asnNumber = item.asnNumber
          return (
            <div className="min-w-0 text-xs">
              <div className="font-medium">{item.skuCode}</div>
              {asnNumber ? (
                <button
                  onClick={() => handleAsnClick(asnNumber)}
                  className="block max-w-full truncate text-left font-mono text-primary hover:underline"
                  title={asnNumber}
                >
                  ASN: {asnNumber}
                </button>
              ) : (
                <div className="text-muted-foreground">ASN: -</div>
              )}
            </div>
          )
        },
      },
      {
        id: 'scope',
        header: tInv('scope'),
        size: 130,
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="min-w-0 text-xs">
              <div className="truncate">{item.client?.clientName || '-'}</div>
              <div className="truncate text-muted-foreground">
                {item.warehouse?.warehouseName}
              </div>
            </div>
          )
        },
      },
      {
        id: 'zoneLocation',
        header: tInv('zoneLocation'),
        size: 120,
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="min-w-0 text-xs">
              <div className="truncate">{item.zone?.zoneName || item.zone?.zoneCode || '-'}</div>
              <div className="font-mono text-muted-foreground">{item.location?.locationCode}</div>
            </div>
          )
        },
      },
      {
        accessorKey: 'totalOnHand',
        header: tInv('onHandShort'),
        size: 44,
        cell: ({ row }) => <div className="text-xs font-bold">{getTotalQuantity(row.original)}</div>,
      },
      {
        accessorKey: 'quantityAvailable',
        header: tInv('availableShort'),
        size: 44,
        cell: ({ row }) => <div className="text-xs font-medium text-green-600">{row.original.quantityAvailable}</div>,
      },
      {
        accessorKey: 'quantityAllocated',
        header: tInv('allocatedShort'),
        size: 44,
        cell: ({ row }) => <div className="text-xs text-blue-600">{row.original.quantityAllocated}</div>,
      },
      {
        accessorKey: 'quantityPicking',
        header: tInv('pickedShort'),
        size: 44,
        cell: ({ row }) => <div className="text-xs text-purple-600">{row.original.quantityPicking}</div>,
      },
      {
        accessorKey: 'quantityException',
        header: tInv('exceptionShort'),
        size: 44,
        cell: ({ row }) => <div className="text-xs font-medium text-zinc-700">{row.original.quantityException}</div>,
      },
      {
        accessorKey: 'quantityFrozen',
        header: tInv('frozenShort'),
        size: 44,
        cell: ({ row }) => <div className="text-xs text-orange-600">{row.original.quantityFrozen}</div>,
      },
      {
        accessorKey: 'quantityDefective',
        header: tInv('defectiveShort'),
        size: 44,
        cell: ({ row }) => <div className="text-xs text-red-600">{row.original.quantityDefective}</div>,
      },
      {
        accessorKey: 'quantityCountSurplus',
        header: tInv('surplusShort'),
        size: 44,
        cell: ({ row }) => <div className="text-xs text-emerald-600">{row.original.quantityCountSurplus}</div>,
      },
      {
        accessorKey: 'quantityCountShortage',
        header: tInv('shortageShort'),
        size: 44,
        cell: ({ row }) => <div className="text-xs text-rose-600">{row.original.quantityCountShortage}</div>,
      },
      {
        id: 'batchExpiry',
        header: tInv('batchExpiry'),
        size: 92,
        enableSorting: false,
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="min-w-0 text-xs">
              <div className="truncate">{item.batchNumber || '-'}</div>
              <div className="text-muted-foreground">{formatDate(item.expiryDate) || '-'}</div>
            </div>
          )
        },
      },
      {
        accessorKey: 'ageDays',
        header: tInv('ageDays'),
        size: 52,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-xs">
            {row.original.ageDays ?? '-'}
          </div>
        ),
      },
      {
        accessorKey: 'lockStatus',
        header: tInv('lockStatus'),
        size: 58,
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.lockStatus === 'LOCKED' ? 'destructive' : 'outline'}>
            {tLock(row.original.lockStatus as keyof typeof tLock)}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-center">{t('actions')}</div>,
        size: 44,
        meta: { sticky: 'right' as const },
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="text-center">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tAdj('title')}</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      {tAdj('quantityAdjust')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {item.quantityAvailable > 0 && (
                        <DropdownMenuItem onClick={() => handleQuantityAdjustment(item, 'AVAILABLE')}>
                          {tAdj('bucketTypes.AVAILABLE')} ({item.quantityAvailable})
                        </DropdownMenuItem>
                      )}
                      {item.quantityFrozen > 0 && (
                        <DropdownMenuItem onClick={() => handleQuantityAdjustment(item, 'FROZEN')}>
                          {tAdj('bucketTypes.FROZEN')} ({item.quantityFrozen})
                        </DropdownMenuItem>
                      )}
                      {item.quantityDefective > 0 && (
                        <DropdownMenuItem onClick={() => handleQuantityAdjustment(item, 'DEFECTIVE')}>
                          {tAdj('bucketTypes.DEFECTIVE')} ({item.quantityDefective})
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <MapPin className="mr-2 h-4 w-4" />
                      {tAdj('locationAdjust')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {item.quantityAvailable > 0 && (
                        <DropdownMenuItem onClick={() => handleLocationAdjustment(item, 'AVAILABLE')}>
                          {tAdj('bucketTypes.AVAILABLE')} ({item.quantityAvailable})
                        </DropdownMenuItem>
                      )}
                      {item.quantityFrozen > 0 && (
                        <DropdownMenuItem onClick={() => handleLocationAdjustment(item, 'FROZEN')}>
                          {tAdj('bucketTypes.FROZEN')} ({item.quantityFrozen})
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {tAdj('qualityAdjust')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {item.quantityAvailable > 0 && (
                        <DropdownMenuItem onClick={() => handleQualityAdjustment(item, 'AVAILABLE')}>
                          {tAdj('bucketTypes.AVAILABLE')} ({item.quantityAvailable})
                        </DropdownMenuItem>
                      )}
                      {item.quantityDefective > 0 && (
                        <DropdownMenuItem onClick={() => handleQualityAdjustment(item, 'DEFECTIVE')}>
                          {tAdj('bucketTypes.DEFECTIVE')} ({item.quantityDefective})
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {item.quantityAvailable > 0 && (
                    <DropdownMenuItem onClick={() => handleFreeze(item)}>
                      <Snowflake className="mr-2 h-4 w-4" />
                      {tInv('freeze')}
                    </DropdownMenuItem>
                  )}
                  {item.quantityFrozen > 0 && (
                    <DropdownMenuItem onClick={() => handleUnfreeze(item)}>
                      <Sun className="mr-2 h-4 w-4" />
                      {tInv('unfreeze')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    [t, tInv, tAdj, tLock, handleAsnClick, handleLocationAdjustment, handleQualityAdjustment, handleQuantityAdjustment]
  )

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={breadcrumb.list()} />
        <Button variant="outline" size="icon" onClick={fetchInventories}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <InventoryWmFilter />

      {/* Inventory List */}
      <div className="flex-1 min-h-0">
        <DataTable
          tableId="inventory-wm"
          columns={columns}
          data={inventories}
          total={total}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          maxHeight="100%"
        />
      </div>

      {/* 库存调整对话框 */}
      <InventoryAdjustmentDialog
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        inventoryItem={selectedInventory}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* 数量调整对话框 */}
      <InventoryQuantityAdjustmentDialog
        open={quantityAdjustmentDialogOpen}
        onOpenChange={setQuantityAdjustmentDialogOpen}
        inventoryItem={selectedBucketInventory}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* 库位调整对话框 */}
      <InventoryLocationAdjustmentDialog
        open={locationAdjustmentDialogOpen}
        onOpenChange={setLocationAdjustmentDialogOpen}
        inventoryItem={selectedBucketInventory}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* 质量调整对话框 */}
      <InventoryQualityAdjustmentDialog
        open={qualityAdjustmentDialogOpen}
        onOpenChange={setQualityAdjustmentDialogOpen}
        inventoryItem={selectedBucketInventory}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* 冻结对话框 */}
      <InventoryFreezeDialog
        open={freezeDialogOpen}
        onOpenChange={setFreezeDialogOpen}
        inventoryItem={selectedBucketInventory}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* 解冻对话框 */}
      <InventoryUnfreezeDialog
        open={unfreezeDialogOpen}
        onOpenChange={setUnfreezeDialogOpen}
        inventoryItem={selectedBucketInventory}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* 数量调整对话框 */}
      <InventoryQuantityAdjustmentDialog
        open={quantityAdjustmentDialogOpen}
        onOpenChange={setQuantityAdjustmentDialogOpen}
        inventoryItem={selectedBucketInventory}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* 库位调整对话框 */}
      <InventoryLocationAdjustmentDialog
        open={locationAdjustmentDialogOpen}
        onOpenChange={setLocationAdjustmentDialogOpen}
        inventoryItem={selectedBucketInventory}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* 质量调整对话框 */}
      <InventoryQualityAdjustmentDialog
        open={qualityAdjustmentDialogOpen}
        onOpenChange={setQualityAdjustmentDialogOpen}
        inventoryItem={selectedBucketInventory}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* 冻结对话框 */}
      <InventoryFreezeDialog
        open={freezeDialogOpen}
        onOpenChange={setFreezeDialogOpen}
        inventoryItem={selectedBucketInventory}
        onSuccess={handleAdjustmentSuccess}
      />
      </div>
    </TooltipProvider>
  )
}

export default function WMInventoryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <WMInventoryContent />
    </Suspense>
  )
}
