'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface InventoryBucketItem {
  id: string
  skuId: string
  skuCode: string
  skuName?: string
  batchNumber: string | null
  lpn: string
  asnNumber: string | null
  expiryDate: string | null
  productionDate?: string | null
  bucketType: string
  quantity: number
  warehouseId: string
  warehouse: {
    id: string
    warehouseCode: string
    warehouseName: string
  }
  location: {
    id: string
    locationCode: string
  }
  client?: {
    id: string
    clientCode: string
    clientName: string
  }
}

interface Location {
  id: string
  locationCode: string
  locationName?: string
  zone?: {
    id: string
    zoneCode: string
    zoneName?: string
    qualityType: string
  }
}

interface InventoryQualityAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItem: InventoryBucketItem | null
  onSuccess?: () => void
}

// 桶类型选项（仅包含可以作为调整目标的类型）
// 只保留良品和不良品两个选项
const BUCKET_TYPES = [
  'AVAILABLE',
  'DEFECTIVE',
] as const

// 桶类型显示名称映射（备用，优先使用翻译）
const BUCKET_TYPE_LABELS: Record<typeof BUCKET_TYPES[number], string> = {
  AVAILABLE: '良品',
  DEFECTIVE: '不良品',
}

// 表单验证schema
const adjustmentFormSchema = z.object({
  adjustmentQuantity: z.coerce.number().int().positive(),
  toBucketType: z.string().min(1),
  toLocationId: z.string().optional(),
  reason: z.string().min(1).max(500),
})

type AdjustmentFormData = z.infer<typeof adjustmentFormSchema>

export function InventoryQualityAdjustmentDialog({
  open,
  onOpenChange,
  inventoryItem,
  onSuccess,
}: InventoryQualityAdjustmentDialogProps) {
  const t = useTranslations('common')
  const tAdj = useTranslations('inventory.adjustment')
  const [submitting, setSubmitting] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      adjustmentQuantity: 1,
      toBucketType: '',
      toLocationId: '',
      reason: '',
    },
  })

  const adjustmentQuantity = watch('adjustmentQuantity')
  const toBucketType = watch('toBucketType')
  const toLocationId = watch('toLocationId')

  void adjustmentQuantity

  const fetchLocations = async (searchTerm = '') => {
    if (!inventoryItem) return

    setLoadingLocations(true)
    try {
      // 如果已选择目标质量类型，则根据质量类型过滤库位
      const params = new URLSearchParams({
        warehouseId: inventoryItem.warehouseId,
        pageSize: '100',
      })
      if (toBucketType) {
        params.set('targetBucketType', toBucketType)
      }
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      }

      const response = await fetch(`/api/v1/bin-locations?${params.toString()}`)
      const result = await response.json()
      if (result.success) {
        setLocations(result.data)
      }
    } catch (error) {
      console.error('获取库位列表失败:', error)
    } finally {
      setLoadingLocations(false)
    }
  }

  // 获取库位列表
  useEffect(() => {
    if (!open || !inventoryItem || !toBucketType) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      void fetchLocations(locationSearch)
    }, 200)

    return () => window.clearTimeout(timer)
  }, [open, inventoryItem, toBucketType, locationSearch])

  // 重置表单
  useEffect(() => {
    if (open && inventoryItem) {
      reset({
        adjustmentQuantity: 1,
        toBucketType: '',
        toLocationId: inventoryItem.location.id, // 默认同原库位
        reason: '',
      })
      setLocationSearch('')
    }
  }, [open, inventoryItem, reset])

  const onSubmit = async (data: AdjustmentFormData) => {
    if (!inventoryItem) return

    // 验证调整数量不能超过当前库存
    if (data.adjustmentQuantity > inventoryItem.quantity) {
      toast.error(tAdj('createFailed'), {
        description: tAdj('quantityExceedsStock'),
      })
      return
    }

    // 验证调整后质量类型不能与调整前质量类型相同
    if (data.toBucketType === inventoryItem.bucketType) {
      toast.error(tAdj('createFailed'), {
        description: tAdj('qualityTypeCannotBeSame'),
      })
      return
    }

    setSubmitting(true)

    try {
      const toLocation = locations.find(loc => loc.id === data.toLocationId)

      // 调用API创建调整单
      const response = await fetch('/api/v1/inventory/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouseId: inventoryItem.warehouseId,
          adjustmentType: 'QUALITY_ADJUST',
          reason: data.reason,
          notes: data.reason,
          lines: [
            {
              inventoryId: inventoryItem.id,
              skuId: inventoryItem.skuId,
              locationId: inventoryItem.location.id,
              fromBucketType: inventoryItem.bucketType,
              toBucketType: data.toBucketType,
              toLocationId: data.toLocationId || inventoryItem.location.id,
              toLocationCode: toLocation?.locationCode || inventoryItem.location.locationCode,
              batchNumber: inventoryItem.batchNumber || undefined,
              lpn: inventoryItem.lpn || undefined,
              asnNumber: inventoryItem.asnNumber || undefined,
              expiryDate: inventoryItem.expiryDate || undefined,
              productionDate: inventoryItem.productionDate || undefined,
              adjustQuantity: data.adjustmentQuantity,
              reason: data.reason,
            },
          ],
        }),
      })

      const result = await response.json()

      if (result.success) {
        // 立即执行调整单
        const executeResponse = await fetch(`/api/v1/inventory/adjustments/${result.data.id}/execute`, {
          method: 'POST',
        })

        const executeResult = await executeResponse.json()

        if (executeResult.success) {
          toast.success(tAdj('createSuccess'), {
            description: `${tAdj('adjustmentNumberLabel')}${result.data.adjustmentNumber}`,
          })
          onOpenChange(false)
          onSuccess?.()
        } else {
          toast.error(tAdj('createFailed'), {
            description: executeResult.message || tAdj('executeFailed'),
          })
        }
      } else {
        toast.error(tAdj('createFailed'), {
          description: result.message || tAdj('createFailedMessage'),
        })
      }
    } catch (error) {
      console.error('创建调整单失败:', error)
      toast.error(tAdj('createFailed'), {
        description: tAdj('networkError'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!inventoryItem) return null

  const selectedLocation = locations.find(loc => loc.id === toLocationId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tAdj('qualityAdjust')}</DialogTitle>
          <DialogDescription>
            {tAdj('qualityAdjustDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 库存信息展示 */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 p-3 bg-muted/50 rounded-lg border text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">SKU</Label>
                <div className="font-medium mt-0.5">{inventoryItem.skuCode}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('client')}</Label>
                <div className="font-medium mt-0.5">{inventoryItem.client?.clientName || '-'}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tAdj('location')}</Label>
                <div className="font-medium mt-0.5">{inventoryItem.location.locationCode}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tAdj('batchNumber')}</Label>
                <div className="font-medium mt-0.5">{inventoryItem.batchNumber || '-'}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tAdj('currentQuantity')}</Label>
                <div className="font-medium mt-0.5">{inventoryItem.quantity}</div>
              </div>
            </div>

            {/* 质量类型对比 */}
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <Label className="text-xs text-purple-700 dark:text-purple-400">{tAdj('qualityTypeBefore')}</Label>
                  <div className="font-bold text-base mt-1 text-purple-900 dark:text-purple-300">
                    {tAdj(`bucketTypes.${inventoryItem.bucketType}`)}
                  </div>
                </div>
                <div className="text-purple-500 text-xl px-3">→</div>
                <div>
                  <Label className="text-xs text-purple-700 dark:text-purple-400">{tAdj('qualityTypeAfter')}</Label>
                  <div className="font-bold text-base mt-1 text-purple-900 dark:text-purple-300">
                    {toBucketType ? tAdj(`bucketTypes.${toBucketType}`) : tAdj('pleaseSelect')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 调整数量 */}
          <div className="space-y-2">
            <Label htmlFor="adjustmentQuantity">{tAdj('adjustmentQuantity')}</Label>
            <Input
              id="adjustmentQuantity"
              type="number"
              min="1"
              max={inventoryItem.quantity}
              {...register('adjustmentQuantity')}
              className={errors.adjustmentQuantity ? 'border-red-500' : ''}
            />
            {errors.adjustmentQuantity && (
              <p className="text-sm text-red-500">{errors.adjustmentQuantity.message}</p>
            )}
          </div>

          {/* 调整后质量类型 */}
          <div className="space-y-2">
            <Label htmlFor="toBucketType">{tAdj('qualityTypeAfter')}</Label>
            <Select
              value={toBucketType}
              onValueChange={(value) => setValue('toBucketType', value)}
            >
              <SelectTrigger className={errors.toBucketType ? 'border-red-500' : ''}>
                <SelectValue placeholder={tAdj('selectQualityType')} />
              </SelectTrigger>
              <SelectContent>
                {BUCKET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {tAdj(`bucketTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.toBucketType && (
              <p className="text-sm text-red-500">{errors.toBucketType.message}</p>
            )}
          </div>

          {/* 调整后库位（可选） */}
          <div className="space-y-2">
            <Label htmlFor="toLocationId">{tAdj('locationAfter')}{tAdj('optionalSuffix')}</Label>
            <Controller
              name="toLocationId"
              control={control}
              render={({ field }) => (
                <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={locationOpen}
                      className="w-full justify-between"
                    >
                      {selectedLocation
                        ? selectedLocation.locationCode
                        : inventoryItem.location.locationCode}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder={tAdj('searchLocation')}
                        value={locationSearch}
                        onValueChange={setLocationSearch}
                      />
                      <CommandEmpty>{tAdj('noLocationFound')}</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {locations.map((location) => (
                          <CommandItem
                            key={location.id}
                            value={location.locationCode}
                            onSelect={() => {
                              field.onChange(location.id)
                              setLocationOpen(false)
                              setLocationSearch('')
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                field.value === location.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{location.locationCode}</span>
                              {location.zone && (
                                <span className="text-xs text-muted-foreground">
                                  {location.zone.zoneCode} - {tAdj(`zoneQualityTypes.${location.zone.qualityType}`)}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          {/* 调整原因 */}
          <div className="space-y-2">
            <Label htmlFor="reason">{tAdj('adjustmentReason')}</Label>
            <Textarea
              id="reason"
              {...register('reason')}
              placeholder={tAdj('reasonPlaceholder')}
              rows={3}
              className={errors.reason ? 'border-red-500' : ''}
            />
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={submitting || loadingLocations}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
