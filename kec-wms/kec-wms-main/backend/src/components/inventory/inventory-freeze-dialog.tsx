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
import { Loader2, Snowflake } from 'lucide-react'
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

interface InventoryFreezeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventoryItem: InventoryBucketItem | null
  onSuccess?: () => void
}

// 表单验证schema
const freezeFormSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  reason: z.string().min(1).max(500),
})

type FreezeFormData = z.infer<typeof freezeFormSchema>

export function InventoryFreezeDialog({
  open,
  onOpenChange,
  inventoryItem,
  onSuccess,
}: InventoryFreezeDialogProps) {
  const t = useTranslations('common')
  const tInv = useTranslations('inventory.adjustment')
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FreezeFormData>({
    resolver: zodResolver(freezeFormSchema),
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

  const onSubmit = async (data: FreezeFormData) => {
    if (!inventoryItem) return

    // 验证冻结数量不能超过可用库存
    if (data.quantity > inventoryItem.quantity) {
      toast.error(tInv('freezeFailed'), {
        description: tInv('freezeQuantityExceedsStock'),
      })
      return
    }

    // 只能冻结 AVAILABLE 类型的库存
    if (inventoryItem.bucketType !== 'AVAILABLE') {
      toast.error(tInv('freezeFailed'), {
        description: tInv('canOnlyFreezeAvailable'),
      })
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/v1/inventory/freezes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warehouseId: inventoryItem.warehouseId,
          freezeType: 'MANUAL_HOLD',
          reason: data.reason,
          lines: [
            {
              skuId: inventoryItem.skuId,
              locationId: inventoryItem.location.id,
              batchNumber: inventoryItem.batchNumber || undefined,
              lpn: inventoryItem.lpn || undefined,
              asnNumber: inventoryItem.asnNumber || undefined,
              expiryDate: inventoryItem.expiryDate || undefined,
              quantity: data.quantity,
              reason: data.reason,
            },
          ],
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success(tInv('freezeSuccess'), {
          description: tInv('frozenItems', { count: data.quantity }),
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(tInv('freezeFailed'), {
          description: result.error || tInv('operationFailed'),
        })
      }
    } catch (error) {
      console.error('冻结库存失败:', error)
      toast.error(tInv('freezeFailed'), {
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
            <Snowflake className="h-5 w-5 text-blue-500" />
            {tInv('freezeTitle')}
          </DialogTitle>
          <DialogDescription>
            {tInv('freezeDescription')}
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
                <Label className="text-xs text-muted-foreground">{tInv('availableQuantity')}</Label>
                <div className="font-medium mt-0.5 text-green-600">{inventoryItem.quantity}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{tInv('status')}</Label>
                <div className="font-medium mt-0.5">{tInv(`bucketTypes.${inventoryItem.bucketType}`)}</div>
              </div>
            </div>

            {/* 冻结提示 */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-2 text-sm">
                <Snowflake className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-blue-900 dark:text-blue-300">
                  <div className="font-medium mb-1">{tInv('freezeInstructions')}</div>
                  <ul className="text-xs space-y-1 text-blue-700 dark:text-blue-400">
                    <li>• {tInv('freezeInstruction1')}</li>
                    <li>• {tInv('freezeInstruction2')}</li>
                    <li>• {tInv('freezeInstruction3')}</li>
                    <li>• {tInv('freezeInstruction4')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 冻结数量 */}
          <div className="space-y-2">
            <Label htmlFor="quantity">{tInv('freezeQuantity')}</Label>
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

          {/* 冻结原因 */}
          <div className="space-y-2">
            <Label htmlFor="reason">{tInv('freezeReason')}</Label>
            <Textarea
              id="reason"
              {...register('reason')}
              placeholder={tInv('freezeReasonPlaceholder')}
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
              {tInv('confirmFreeze')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
