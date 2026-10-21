'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface FirstReceivingSkuInfo {
  id: string
  skuCode: string
  skuName: string
  barcode: string | null
  isSelfPackaged: boolean
  length?: number | null
  width?: number | null
  height?: number | null
  weight?: number | null
}

interface FirstReceivingDialogProps {
  open: boolean
  sku: FirstReceivingSkuInfo | null
  onSuccess: () => void
  onCancel?: () => void
}

export function FirstReceivingDialog({
  open,
  sku,
  onSuccess,
  onCancel,
}: FirstReceivingDialogProps) {
  const [skuDimensions, setSkuDimensions] = useState({
    isSelfPackaged: false,
    length: '',
    width: '',
    height: '',
    weight: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  // 初始化表单数据
  const initForm = useCallback((skuInfo: FirstReceivingSkuInfo | null) => {
    if (skuInfo) {
      setSkuDimensions({
        isSelfPackaged: skuInfo.isSelfPackaged,
        length: skuInfo.length?.toString() || '',
        width: skuInfo.width?.toString() || '',
        height: skuInfo.height?.toString() || '',
        weight: skuInfo.weight?.toString() || '',
      })
    } else {
      setSkuDimensions({
        isSelfPackaged: false,
        length: '',
        width: '',
        height: '',
        weight: '',
      })
    }
  }, [])

  // 当弹框打开且SKU变化时，重置表单
  useEffect(() => {
    if (open && sku) {
      initForm(sku)
    }
  }, [open, sku, initForm])

  // 保存SKU信息
  const handleSave = useCallback(async () => {
    if (!sku) return

    // 验证必填字段
    if (!skuDimensions.length || !skuDimensions.width || !skuDimensions.height || !skuDimensions.weight) {
      toast.error('请填写完整的长宽高重量信息')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/v1/sku/${sku.id}/capture-dimensions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSelfPackaged: skuDimensions.isSelfPackaged,
          lengthCm: parseFloat(skuDimensions.length),
          widthCm: parseFloat(skuDimensions.width),
          heightCm: parseFloat(skuDimensions.height),
          weightKg: parseFloat(skuDimensions.weight),
        }),
      })

      const result = await response.json()

      if (!result.success) {
        toast.error(result.message || '保存SKU信息失败')
        return
      }

      toast.success('SKU信息已保存')
      initForm(null)
      onSuccess()
    } catch {
      toast.error('保存SKU信息失败')
    } finally {
      setIsSaving(false)
    }
  }, [sku, skuDimensions, onSuccess, initForm])

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>新品信息补全</DialogTitle>
          <DialogDescription>
            该SKU为首次收货，请补全商品尺寸和重量信息
          </DialogDescription>
        </DialogHeader>
        {sku && (
          <div className="space-y-4">
            {/* SKU基本信息展示 */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">SKU编码</span>
                <span className="font-medium">{sku.skuCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">商品名称</span>
                <span className="font-medium">{sku.skuName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">条码</span>
                <span className="font-medium">{sku.barcode || '-'}</span>
              </div>
            </div>

            {/* 尺寸重量输入 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sku-is-self-packaged"
                  checked={skuDimensions.isSelfPackaged}
                  onCheckedChange={(checked) =>
                    setSkuDimensions((prev) => ({ ...prev, isSelfPackaged: checked === true }))
                  }
                />
                <Label htmlFor="sku-is-self-packaged">是否自带物流包装</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku-length">长度 (cm) <span className="text-red-500">*</span></Label>
                <Input
                  id="sku-length"
                  type="number"
                  step="0.01"
                  min="0"
                  value={skuDimensions.length}
                  onChange={(e) => setSkuDimensions((prev) => ({ ...prev, length: e.target.value }))}
                  placeholder="长度"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku-width">宽度 (cm) <span className="text-red-500">*</span></Label>
                <Input
                  id="sku-width"
                  type="number"
                  step="0.01"
                  min="0"
                  value={skuDimensions.width}
                  onChange={(e) => setSkuDimensions((prev) => ({ ...prev, width: e.target.value }))}
                  placeholder="宽度"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku-height">高度 (cm) <span className="text-red-500">*</span></Label>
                <Input
                  id="sku-height"
                  type="number"
                  step="0.01"
                  min="0"
                  value={skuDimensions.height}
                  onChange={(e) => setSkuDimensions((prev) => ({ ...prev, height: e.target.value }))}
                  placeholder="高度"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku-weight">重量 (kg) <span className="text-red-500">*</span></Label>
                <Input
                  id="sku-weight"
                  type="number"
                  step="0.001"
                  min="0"
                  value={skuDimensions.weight}
                  onChange={(e) => setSkuDimensions((prev) => ({ ...prev, weight: e.target.value }))}
                  placeholder="重量"
                />
              </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              取消
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存并继续收货'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
