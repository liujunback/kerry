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
}

interface InventoryLocationAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItem: InventoryBucketItem | null
  onSuccess?: () => void
}

// 表单验证schema
const adjustmentFormSchema = z.object({
  adjustmentQuantity: z.coerce.number().int().positive(),
  toLocationId: z.string().min(1),
  reason: z.string().min(1).max(500),
})

type AdjustmentFormData = z.infer<typeof adjustmentFormSchema>

export function InventoryLocationAdjustmentDialog({
  open,
  onOpenChange,
  inventoryItem,
  onSuccess,
}: InventoryLocationAdjustmentDialogProps) {
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
    reset,
    control,
    formState: { errors },
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      adjustmentQuantity: 1,
      toLocationId: '',
      reason: '',
    },
  })

  const toLocationId = watch('toLocationId')

  const fetchLocations = async (searchTerm = '') => {
    if (!inventoryItem) return

    setLoadingLocations(true)
    try {
      const params = new URLSearchParams({
        warehouseId: inventoryItem.warehouseId,
        pageSize: '100',
      })
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
    if (!open || !inventoryItem) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      void fetchLocations(locationSearch)
    }, 200)

    return () => window.clearTimeout(timer)
  }, [open, inventoryItem, locationSearch])

  // 重置表单
  useEffect(() => {
    if (open) {
      reset({
        adjustmentQuantity: 1,
        toLocationId: '',
        reason: '',
      })
      setLocationSearch('')
    }
  }, [open, reset])

  const onSubmit = async (data: AdjustmentFormData) => {
    if (!inventoryItem) return

    // 验证调整数量不能超过当前库存
    if (data.adjustmentQuantity > inventoryItem.quantity) {
      toast.error(tAdj('createFailed'), {
        description: tAdj('quantityExceedsStock'),
      })
      return
    }

    // 验证调整后库位不能与调整前库位相同
    if (data.toLocationId === inventoryItem.location.id) {
      toast.error(tAdj('createFailed'), {
        description: tAdj('locationCannotBeSame'),
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
          adjustmentType: 'LOCATION_ADJUST',
          reason: data.reason,
          notes: data.reason,
          lines: [
            {
              inventoryId: inventoryItem.id,
              skuId: inventoryItem.skuId,
              fromLocationId: inventoryItem.location.id,
              fromLocationCode: inventoryItem.location.locationCode,
              toLocationId: data.toLocationId,
              toLocationCode: toLocation?.locationCode || '',
              batchNumber: inventoryItem.batchNumber || undefined,
              lpn: inventoryItem.lpn || undefined,
              asnNumber: inventoryItem.asnNumber || undefined,
              expiryDate: inventoryItem.expiryDate || undefined,
              productionDate: inventoryItem.productionDate || undefined,
              bucketType: inventoryItem.bucketType,
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
          <DialogTitle>{tAdj('locationAdjust')}</DialogTitle>
          <DialogDescription>
            {tAdj('adjustmentInfo')}
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
                <Label className="text-xs text-muted-foreground">{tAdj('batchNumber')}</Label>
                <div className="font-medium mt-0.5">{inventoryItem.batchNumber || '-'}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tAdj('bucketType')}</Label>
                <div className="font-medium mt-0.5">{tAdj(`bucketTypes.${inventoryItem.bucketType}`)}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tAdj('currentQuantity')}</Label>
                <div className="font-medium mt-0.5">{inventoryItem.quantity}</div>
              </div>
            </div>

            {/* 库位对比 */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <Label className="text-xs text-amber-700 dark:text-amber-400">{tAdj('locationBefore')}</Label>
                  <div className="font-bold text-base mt-1 text-amber-900 dark:text-amber-300">{inventoryItem.location.locationCode}</div>
                </div>
                <div className="text-amber-500 text-xl px-3">→</div>
                <div>
                  <Label className="text-xs text-amber-700 dark:text-amber-400">{tAdj('locationAfter')}</Label>
                  <div className="font-bold text-base mt-1 text-amber-900 dark:text-amber-300">
                    {selectedLocation ? selectedLocation.locationCode : tAdj('pleaseSelect')}
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

          {/* 调整后库位 */}
          <div className="space-y-2">
            <Label htmlFor="toLocationId">{tAdj('locationAfter')}</Label>
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
                      className={cn(
                        'w-full justify-between',
                        errors.toLocationId && 'border-red-500'
                      )}
                    >
                      {selectedLocation
                        ? selectedLocation.locationCode
                        : tAdj('selectLocation')}
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
                            {location.locationCode}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.toLocationId && (
              <p className="text-sm text-red-500">{errors.toLocationId.message}</p>
            )}
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
