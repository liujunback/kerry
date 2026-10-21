'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePackingStore } from '@/stores/packing-store'

interface PackingMaterialPanelProps {
  onCloseBox: () => void
  isSubmitting: boolean
  pendingOrderNumber?: string
}

export function PackingMaterialPanel({
  onCloseBox,
  isSubmitting,
  pendingOrderNumber,
}: PackingMaterialPanelProps) {
  const t = useTranslations('packing')
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('')
  const [materialInput, setMaterialInput] = useState('')
  const materialInputRef = useRef<HTMLInputElement>(null)
  const hasFocusedOnPendingRef = useRef(false)

  const {
    currentPickOrder,
    packagingMaterials,
    materialOptions,
    shouldFocusMaterial,
    addPackagingMaterial,
    removePackagingMaterial,
    updatePackagingMaterialQty,
    clearFocusMaterial,
    loadMaterialOptions,
  } = usePackingStore()

  // 监听聚焦包材输入框的触发
  useEffect(() => {
    if (shouldFocusMaterial) {
      setTimeout(() => materialInputRef.current?.focus(), 100)
      clearFocusMaterial()
    }
  }, [shouldFocusMaterial, clearFocusMaterial])

  // 当有待关箱订单时，聚焦到包材输入框（只聚焦一次）
  useEffect(() => {
    if (pendingOrderNumber && !hasFocusedOnPendingRef.current) {
      hasFocusedOnPendingRef.current = true
      setTimeout(() => materialInputRef.current?.focus(), 100)
    }
    // 当 pendingOrderNumber 变为空时，重置标记
    if (!pendingOrderNumber) {
      hasFocusedOnPendingRef.current = false
    }
  }, [pendingOrderNumber])

  // 加载包材列表（使用 store 统一管理）
  useEffect(() => {
    if (currentPickOrder) {
      loadMaterialOptions()
    }
  }, [currentPickOrder, loadMaterialOptions])

  // 添加包材（通过扫描输入）
  const handleMaterialScan = () => {
    if (!materialInput.trim()) return

    const code = materialInput.trim()
    const material = materialOptions.find(m => m.materialCode === code)
    if (!material) return

    // 检查是否已添加
    if (packagingMaterials.some(m => m.materialId === material.id)) {
      setMaterialInput('')
      return
    }

    addPackagingMaterial({
      materialId: material.id,
      materialCode: material.materialCode,
      materialName: material.materialName,
      quantity: 1,
    })
    setMaterialInput('')
  }

  if (!currentPickOrder) {
    return null
  }

  return (
    <div className="space-y-4 pt-4">
      {/* 包材选择 */}
      <div className="space-y-2">
        <Label>{t('materialTable')}</Label>
        <div className="flex gap-2">
          <Input
            ref={materialInputRef}
            value={materialInput}
            onChange={(e) => setMaterialInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleMaterialScan()}
            placeholder={t('materialPlaceholder')}
            className="flex-1"
          />
          <Select value={selectedMaterialId} onValueChange={(value) => {
            setSelectedMaterialId(value)
            // 选择后直接添加
            const material = materialOptions.find(m => m.id === value)
            if (material && !packagingMaterials.some(m => m.materialId === value)) {
              addPackagingMaterial({
                materialId: material.id,
                materialCode: material.materialCode,
                materialName: material.materialName,
                quantity: 1,
              })
            }
            setSelectedMaterialId('')
          }}>
            <SelectTrigger className="w-10 px-2">
              <ChevronDown className="h-4 w-4" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel className="text-muted-foreground">{t('selectMaterial')}</SelectLabel>
                {materialOptions.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.materialCode} - {material.materialName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 已选包材列表 */}
      {packagingMaterials.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.materialCode')}</TableHead>
                <TableHead>{t('table.materialName')}</TableHead>
                <TableHead className="w-32">{t('quantity')}</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packagingMaterials.map((material) => (
                <TableRow key={material.materialId}>
                  <TableCell className="font-mono">{material.materialCode}</TableCell>
                  <TableCell>{material.materialName}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={material.quantity}
                      onChange={(e) =>
                        updatePackagingMaterialQty(material.materialId, parseInt(e.target.value) || 1)
                      }
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePackagingMaterial(material.materialId)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 关箱按钮 */}
      {pendingOrderNumber && (
        <div className="space-y-2">
          <p className="text-sm text-orange-600 font-medium">{t('messages.pleaseCloseBox')}</p>
          <Button
            className="w-full"
            onClick={onCloseBox}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {t('confirmCloseBox')}
          </Button>
        </div>
      )}
    </div>
  )
}
