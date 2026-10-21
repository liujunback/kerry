'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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

interface InventoryQuantityAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItem: InventoryBucketItem | null
  onSuccess?: () => void
}

// 表单验证schema
const adjustmentFormSchema = z.object({
  adjustmentType: z.enum(['INCREASE', 'DECREASE']),
  adjustmentQuantity: z.coerce.number().int().positive(),
  adjustmentReason: z.enum(['SURPLUS', 'SHORTAGE', 'DAMAGE', 'OTHER']),
  notes: z.string().max(500).optional(),
})

type AdjustmentFormData = z.infer<typeof adjustmentFormSchema>

export function InventoryQuantityAdjustmentDialog({
  open,
  onOpenChange,
  inventoryItem,
  onSuccess,
}: InventoryQuantityAdjustmentDialogProps) {
  const t = useTranslations('common')
  const tAdj = useTranslations('inventory.adjustment')
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      adjustmentType: 'INCREASE',
      adjustmentQuantity: 1,
      adjustmentReason: 'SURPLUS',
      notes: '',
    },
  })

  const adjustmentType = watch('adjustmentType')
  const adjustmentQuantity = watch('adjustmentQuantity')

  // 计算调整后数量
  const quantityAfter = inventoryItem
    ? adjustmentType === 'INCREASE'
      ? inventoryItem.quantity + (adjustmentQuantity || 0)
      : inventoryItem.quantity - (adjustmentQuantity || 0)
    : 0

  // 重置表单
  useEffect(() => {
    if (open) {
      reset({
        adjustmentType: 'INCREASE',
        adjustmentQuantity: 1,
        adjustmentReason: 'SURPLUS',
        notes: '',
      })
    }
  }, [open, reset])

  const onSubmit = async (data: AdjustmentFormData) => {
    if (!inventoryItem) return

    // 验证减少数量不能超过当前库存
    if (data.adjustmentType === 'DECREASE' && data.adjustmentQuantity > inventoryItem.quantity) {
      toast.error(tAdj('createFailed'), {
        description: tAdj('quantityExceedsStock'),
      })
      return
    }

    setSubmitting(true)

    try {
      // 计算调整数量（增加为正，减少为负）
      const adjustQuantity = data.adjustmentType === 'INCREASE'
        ? data.adjustmentQuantity
        : -data.adjustmentQuantity

      // 调用API创建调整单
      const response = await fetch('/api/v1/inventory/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouseId: inventoryItem.warehouseId,
          adjustmentType: 'QUANTITY_ADJUST',
          reason: tAdj(`adjustmentReasons.${data.adjustmentReason}`),
          notes: data.notes || '',
          lines: [
            {
              inventoryId: inventoryItem.id,
              skuId: inventoryItem.skuId,
              locationId: inventoryItem.location.id,
              batchNumber: inventoryItem.batchNumber || undefined,
              lpn: inventoryItem.lpn || undefined,
              asnNumber: inventoryItem.asnNumber || undefined,
              expiryDate: inventoryItem.expiryDate || undefined,
              productionDate: inventoryItem.productionDate || undefined,
              bucketType: inventoryItem.bucketType,
              adjustQuantity,
              reason: tAdj(`adjustmentReasons.${data.adjustmentReason}`),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{tAdj('quantityAdjust')}</DialogTitle>
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
                <Label className="text-xs text-muted-foreground">{tAdj('location')}</Label>
                <div className="font-medium mt-0.5">{inventoryItem.location.locationCode}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tAdj('batchNumber')}</Label>
                <div className="font-medium mt-0.5">{inventoryItem.batchNumber || '-'}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tAdj('bucketType')}</Label>
                <div className="font-medium mt-0.5">{tAdj(`bucketTypes.${inventoryItem.bucketType}`)}</div>
              </div>
            </div>

            {/* 数量对比 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                <Label className="text-xs text-blue-700 dark:text-blue-400">{tAdj('quantityBefore')}</Label>
                <div className="font-bold text-xl mt-1 text-blue-900 dark:text-blue-300">{inventoryItem.quantity}</div>
              </div>
              <div className={`p-3 rounded-lg border ${
                quantityAfter < 0
                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                  : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
              }`}>
                <Label className={`text-xs ${
                  quantityAfter < 0
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-green-700 dark:text-green-400'
                }`}>{tAdj('quantityAfter')}</Label>
                <div className={`font-bold text-xl mt-1 ${
                  quantityAfter < 0
                    ? 'text-red-900 dark:text-red-300'
                    : 'text-green-900 dark:text-green-300'
                }`}>
                  {quantityAfter}
                </div>
              </div>
            </div>
          </div>

          {/* 调整类型 */}
          <div className="space-y-2">
            <Label htmlFor="adjustmentType">{tAdj('adjustmentType')}</Label>
            <Select
              value={adjustmentType}
              onValueChange={(value) => setValue('adjustmentType', value as 'INCREASE' | 'DECREASE')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCREASE">{tAdj('adjustmentTypes.INCREASE')}</SelectItem>
                <SelectItem value="DECREASE">{tAdj('adjustmentTypes.DECREASE')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 调整数量 */}
          <div className="space-y-2">
            <Label htmlFor="adjustmentQuantity">{tAdj('adjustmentQuantity')}</Label>
            <Input
              id="adjustmentQuantity"
              type="number"
              min="1"
              {...register('adjustmentQuantity')}
              className={errors.adjustmentQuantity ? 'border-red-500' : ''}
            />
            {errors.adjustmentQuantity && (
              <p className="text-sm text-red-500">{errors.adjustmentQuantity.message}</p>
            )}
          </div>

          {/* 调整原因 */}
          <div className="space-y-2">
            <Label htmlFor="adjustmentReason">{tAdj('adjustmentReason')}</Label>
            <Select
              value={watch('adjustmentReason')}
              onValueChange={(value) => setValue('adjustmentReason', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SURPLUS">{tAdj('adjustmentReasons.SURPLUS')}</SelectItem>
                <SelectItem value="SHORTAGE">{tAdj('adjustmentReasons.SHORTAGE')}</SelectItem>
                <SelectItem value="DAMAGE">{tAdj('adjustmentReasons.DAMAGE')}</SelectItem>
                <SelectItem value="OTHER">{tAdj('adjustmentReasons.OTHER')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 备注 */}
          <div className="space-y-2">
            <Label htmlFor="notes">{tAdj('notes')}</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder={tAdj('optional')}
              rows={3}
            />
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
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
