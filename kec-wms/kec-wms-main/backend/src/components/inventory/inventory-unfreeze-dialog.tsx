'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sun } from 'lucide-react'
import { toast } from 'sonner'

interface InventoryBucketItem {
  id: string
  skuId: string
  skuCode: string
  skuName?: string
  batchNumber: string | null
  lpn: string
  asnNumber: string | null
  expiryDate?: string | null
  quantity: number
  bucketType: string
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

interface InventoryUnfreezeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItem: InventoryBucketItem | null
  onSuccess?: () => void
}

// 表单验证schema
const unfreezeFormSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  reason: z.string().min(1).max(500),
})

type UnfreezeFormData = z.infer<typeof unfreezeFormSchema>

export function InventoryUnfreezeDialog({
  open,
  onOpenChange,
  inventoryItem,
  onSuccess,
}: InventoryUnfreezeDialogProps) {
  const t = useTranslations('common')
  const tInv = useTranslations('inventory.adjustment')
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UnfreezeFormData>({
    resolver: zodResolver(unfreezeFormSchema),
    defaultValues: {
      quantity: 1,
      reason: '',
    },
  })

  // 重置表单
  useState(() => {
    if (open && inventoryItem) {
      reset({
        quantity: inventoryItem.quantity,
        reason: '',
      })
    }
  })

  const onSubmit = async (data: UnfreezeFormData) => {
    if (!inventoryItem) return

    // 验证解冻数量不能超过冻结库存
    if (data.quantity > inventoryItem.quantity) {
      toast.error(tInv('unfreezeFailed'), {
        description: tInv('unfreezeQuantityExceedsStock'),
      })
      return
    }

    // 只能解冻 FROZEN 类型的库存
    if (inventoryItem.bucketType !== 'FROZEN') {
      toast.error(tInv('unfreezeFailed'), {
        description: tInv('canOnlyUnfreezeFrozen'),
      })
      return
    }

    setSubmitting(true)

    try {
      // 构建查询参数
      const queryParams = new URLSearchParams({
        warehouseId: inventoryItem.warehouseId,
        skuId: inventoryItem.skuId,
        locationId: inventoryItem.location.id,
        bucketType: 'FROZEN',
        pageSize: '1',
      })

      // 只有当 batchNumber 存在时才添加
      if (inventoryItem.batchNumber) {
        queryParams.append('batchNumber', inventoryItem.batchNumber)
      }
      if (inventoryItem.lpn) {
        queryParams.append('lpn', inventoryItem.lpn)
      }
      if (inventoryItem.asnNumber) {
        queryParams.append('asnNumber', inventoryItem.asnNumber)
      }

      // 先查询对应的 FROZEN bucket
      const bucketResponse = await fetch(`/api/v1/inventory?${queryParams.toString()}`)
      const bucketResult = await bucketResponse.json()

      if (!bucketResult.success || !bucketResult.data || bucketResult.data.length === 0) {
        toast.error(tInv('unfreezeFailed'), {
          description: tInv('frozenBucketNotFound'),
        })
        setSubmitting(false)
        return
      }

      const frozenBucket = bucketResult.data[0]

      // 调用解冻 API
      const response = await fetch(`/api/v1/inventory/freezes/${frozenBucket.id}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          releaseType: 'RELEASE',
          quantity: data.quantity,
          reason: data.reason,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(tInv('unfreezeSuccess'), {
          description: tInv('unfrozenItems', { count: data.quantity }),
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(tInv('unfreezeFailed'), {
          description: result.error || tInv('operationFailed'),
        })
      }
    } catch (error) {
      console.error('解冻库存失败:', error)
      toast.error(tInv('unfreezeFailed'), {
        description: tInv('networkError'),
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
          <DialogTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-orange-500" />
            {tInv('unfreezeTitle')}
          </DialogTitle>
          <DialogDescription>
            {tInv('unfreezeDescription')}
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
                <Label className="text-xs text-muted-foreground">{tInv('location')}</Label>
                <div className="font-medium mt-0.5">{inventoryItem.location.locationCode}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tInv('batchNumber')}</Label>
                <div className="font-medium mt-0.5">{inventoryItem.batchNumber || '-'}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tInv('frozenQuantity')}</Label>
                <div className="font-medium mt-0.5 text-blue-600">{inventoryItem.quantity}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tInv('status')}</Label>
                <div className="font-medium mt-0.5">{tInv(`bucketTypes.${inventoryItem.bucketType}`)}</div>
              </div>
            </div>

            {/* 解冻提示 */}
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
              <div className="flex items-start gap-2 text-sm">
                <Sun className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-orange-900 dark:text-orange-300">
                  <div className="font-medium mb-1">{tInv('unfreezeInstructions')}</div>
                  <ul className="text-xs space-y-1 text-orange-700 dark:text-orange-400">
                    <li>• {tInv('unfreezeInstruction1')}</li>
                    <li>• {tInv('unfreezeInstruction2')}</li>
                    <li>• {tInv('unfreezeInstruction3')}</li>
                    <li>• {tInv('unfreezeInstruction4')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 解冻数量 */}
          <div className="space-y-2">
            <Label htmlFor="quantity">{tInv('unfreezeQuantity')}</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={inventoryItem.quantity}
              {...register('quantity')}
              className={errors.quantity ? 'border-red-500' : ''}
            />
            {errors.quantity && (
              <p className="text-sm text-red-500">{errors.quantity.message}</p>
            )}
          </div>

          {/* 解冻原因 */}
          <div className="space-y-2">
            <Label htmlFor="reason">{tInv('unfreezeReason')}</Label>
            <Textarea
              id="reason"
              {...register('reason')}
              placeholder={tInv('unfreezeReasonPlaceholder')}
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
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tInv('confirmUnfreeze')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
