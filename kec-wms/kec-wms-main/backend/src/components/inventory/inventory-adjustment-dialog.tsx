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

interface InventoryItem {
  id: string
  skuCode: string
  skuId: string
  batchNumber: string | null
  asnNumber?: string | null
  quantityAvailable: number
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

interface InventoryAdjustmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItem: InventoryItem | null
  onSuccess?: () => void
}

// 表单验证schema
const adjustmentFormSchema = z.object({
  adjustmentType: z.enum(['INCREASE', 'DECREASE']),
  adjustmentQuantity: z.coerce.number().int().positive('调整数量必须为正整数'),
  adjustmentReason: z.enum(['SURPLUS', 'SHORTAGE', 'DAMAGE', 'OTHER']),
  notes: z.string().max(500).optional(),
})

type AdjustmentFormData = z.infer<typeof adjustmentFormSchema>

export function InventoryAdjustmentDialog({
  open,
  onOpenChange,
  inventoryItem,
  onSuccess,
}: InventoryAdjustmentDialogProps) {
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
      ? inventoryItem.quantityAvailable + (adjustmentQuantity || 0)
      : inventoryItem.quantityAvailable - (adjustmentQuantity || 0)
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

  // 调整原因映射
  const reasonMapping: Record<string, string> = {
    SURPLUS: '盘盈',
    SHORTAGE: '盘亏',
    DAMAGE: '损坏',
    OTHER: '其他',
  }

  // 调整类型映射到后端类型
  const typeMapping: Record<string, string> = {
    SURPLUS: 'INCREASE',
    SHORTAGE: 'DECREASE',
    DAMAGE: 'DAMAGE',
    OTHER: 'OTHER',
  }

  const onSubmit = async (data: AdjustmentFormData) => {
    if (!inventoryItem) return

    // 验证减少数量不能超过当前库存
    if (data.adjustmentType === 'DECREASE' && data.adjustmentQuantity > inventoryItem.quantityAvailable) {
      toast.error(tAdj('createFailed'), {
        description: '调整数量不能超过当前可用库存',
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
          adjustmentType: typeMapping[data.adjustmentReason],
          reason: reasonMapping[data.adjustmentReason],
          notes: data.notes || '',
          lines: [
            {
              inventoryId: inventoryItem.id,
              skuId: inventoryItem.skuId,
              locationId: inventoryItem.location.id,
              batchNumber: inventoryItem.batchNumber || undefined,
              asnNumber: inventoryItem.asnNumber || undefined,
              adjustQuantity,
              reason: reasonMapping[data.adjustmentReason],
            },
          ],
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(tAdj('createSuccess'), {
          description: `调整单号: ${result.data.adjustmentNumber}`,
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(tAdj('createFailed'), {
          description: result.message || '创建调整单失败',
        })
      }
    } catch (error) {
      console.error('创建调整单失败:', error)
      toast.error(tAdj('createFailed'), {
        description: '网络错误，请稍后重试',
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
          <DialogTitle>{tAdj('adjustmentDialog')}</DialogTitle>
          <DialogDescription>
            {tAdj('adjustmentInfo')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 库存信息展示 */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label className="text-muted-foreground">SKU</Label>
              <div className="font-medium">{inventoryItem.skuCode}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">客户</Label>
              <div className="font-medium">{inventoryItem.client?.clientName || '-'}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">库位</Label>
              <div className="font-medium">{inventoryItem.location.locationCode}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">批次号</Label>
              <div className="font-medium">{inventoryItem.batchNumber || '-'}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">{tAdj('quantityBefore')}</Label>
              <div className="font-medium text-lg">{inventoryItem.quantityAvailable}</div>
            </div>
            <div>
              <Label className="text-muted-foreground">{tAdj('quantityAfter')}</Label>
              <div className={`font-medium text-lg ${quantityAfter < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {quantityAfter}
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
              placeholder="可选"
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
