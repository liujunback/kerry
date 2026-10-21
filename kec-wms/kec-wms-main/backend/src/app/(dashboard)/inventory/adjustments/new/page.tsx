'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { WarehouseSelect } from '@/components/warehouses/warehouse-select'
import { Plus, Trash2, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface SKU {
  id: string
  skuCode: string
  skuName: string
}

interface BinLocation {
  id: string
  locationCode: string
}

interface AdjustmentLine {
  skuId: string
  skuCode: string
  skuName: string
  locationId: string
  locationCode: string
  batchNumber: string
  asnNumber: string
  adjustQuantity: number
  reason: string
}

const creatableAdjustmentTypes = ['QUANTITY_ADJUST'] as const

export default function NewAdjustmentPage() {
  const t = useTranslations('common')
  const tAdj = useTranslations('inventory.adjustment')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tAdj('title'), href: '/inventory/adjustments' },
  })
  const router = useRouter()

  const [skus, setSkus] = useState<SKU[]>([])
  const [locations, setLocations] = useState<BinLocation[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [warehouseId, setWarehouseId] = useState('')
  const [adjustmentType, setAdjustmentType] = useState('QUANTITY_ADJUST')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<AdjustmentLine[]>([])

  // New line state
  const [newLine, setNewLine] = useState<Partial<AdjustmentLine>>({
    skuId: '',
    locationId: '',
    batchNumber: '',
    asnNumber: '',
    adjustQuantity: 0,
    reason: '',
  })

  useEffect(() => {
    fetchSkus()
  }, [])

  useEffect(() => {
    if (warehouseId) {
      fetchLocations(warehouseId)
    }
  }, [warehouseId])

  const fetchSkus = async () => {
    try {
      const response = await fetch('/api/v1/skus?pageSize=1000')
      const result = await response.json()
      if (result.success) {
        setSkus(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch SKUs:', error)
    }
  }

  const fetchLocations = async (whId: string) => {
    try {
      const response = await fetch(`/api/v1/bin-locations?warehouseId=${whId}&pageSize=1000`)
      const result = await response.json()
      if (result.success) {
        setLocations(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    }
  }

  const addLine = () => {
    if (!newLine.skuId || !newLine.locationId || !newLine.adjustQuantity) {
      toast.error('请填写完整的明细信息')
      return
    }

    const sku = skus.find(s => s.id === newLine.skuId)
    const location = locations.find(l => l.id === newLine.locationId)

    if (!sku || !location) return

    setLines([...lines, {
      skuId: newLine.skuId,
      skuCode: sku.skuCode,
      skuName: sku.skuName,
      locationId: newLine.locationId,
      locationCode: location.locationCode,
      batchNumber: newLine.batchNumber || '',
      asnNumber: newLine.asnNumber || '',
      adjustQuantity: newLine.adjustQuantity || 0,
      reason: newLine.reason || '',
    }])

    setNewLine({
      skuId: '',
      locationId: '',
      batchNumber: '',
      asnNumber: '',
      adjustQuantity: 0,
      reason: '',
    })
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const handleSave = async (submit = false) => {
    if (!warehouseId || !adjustmentType || !reason) {
      toast.error('请填写必填项')
      return
    }

    if (lines.length === 0) {
      toast.error('请添加至少一条调整明细')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v1/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId,
          adjustmentType,
          reason,
          notes,
          lines: lines.map(l => ({
            skuId: l.skuId,
            locationId: l.locationId,
            batchNumber: l.batchNumber || undefined,
            asnNumber: l.asnNumber || undefined,
            adjustQuantity: l.adjustQuantity,
            reason: l.reason || undefined,
          })),
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(tAdj('createSuccess'))

        if (submit && result.data?.id) {
          // Submit for approval
          const submitResponse = await fetch(`/api/v1/inventory/adjustments/${result.data.id}/submit`, {
            method: 'POST',
          })
          const submitResult = await submitResponse.json()
          if (submitResult.success) {
            toast.success(tAdj('submitSuccess'))
          }
        }

        router.push('/inventory/adjustments')
      } else {
        toast.error(result.message || '创建失败')
      }
    } catch (error) {
      console.error('Failed to create adjustment:', error)
      toast.error('创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(tAdj('create'))} />

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tAdj('warehouse')} *</Label>
              <WarehouseSelect value={warehouseId} onValueChange={setWarehouseId} />
            </div>
            <div className="space-y-2">
              <Label>{tAdj('type')} *</Label>
              <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择调整类型" />
                </SelectTrigger>
                <SelectContent>
                  {creatableAdjustmentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tAdj(`types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tAdj('reason')} *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入调整原因"
            />
          </div>
          <div className="space-y-2">
            <Label>{tAdj('notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="请输入备注"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Adjustment Lines */}
      <Card>
        <CardHeader>
          <CardTitle>{tAdj('line.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new line form */}
          <div className="grid grid-cols-7 gap-2 items-end border-b pb-4">
            <div className="space-y-1">
              <Label className="text-xs">{tAdj('line.sku')}</Label>
              <Select value={newLine.skuId} onValueChange={(v) => setNewLine({ ...newLine, skuId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择SKU" />
                </SelectTrigger>
                <SelectContent>
                  {skus.map((sku) => (
                    <SelectItem key={sku.id} value={sku.id}>
                      {sku.skuCode} - {sku.skuName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAdj('line.location')}</Label>
              <Select
                value={newLine.locationId}
                onValueChange={(v) => setNewLine({ ...newLine, locationId: v })}
                disabled={!warehouseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择库位" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.locationCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAdj('line.batchNumber')}</Label>
              <Input
                value={newLine.batchNumber}
                onChange={(e) => setNewLine({ ...newLine, batchNumber: e.target.value })}
                placeholder="批次号"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ASN号</Label>
              <Input
                value={newLine.asnNumber}
                onChange={(e) => setNewLine({ ...newLine, asnNumber: e.target.value })}
                placeholder="ASN号"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAdj('line.adjustQty')}</Label>
              <Input
                type="number"
                value={newLine.adjustQuantity}
                onChange={(e) => setNewLine({ ...newLine, adjustQuantity: parseInt(e.target.value) || 0 })}
                placeholder="数量"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAdj('line.reason')}</Label>
              <Input
                value={newLine.reason}
                onChange={(e) => setNewLine({ ...newLine, reason: e.target.value })}
                placeholder="原因"
              />
            </div>
            <Button onClick={addLine} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lines table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>{tAdj('line.location')}</TableHead>
                <TableHead>{tAdj('line.batchNumber')}</TableHead>
                <TableHead>ASN号</TableHead>
                <TableHead className="text-right">{tAdj('line.adjustQty')}</TableHead>
                <TableHead>{tAdj('line.reason')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    请添加调整明细
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="font-medium">{line.skuCode}</div>
                      <div className="text-sm text-muted-foreground">{line.skuName}</div>
                    </TableCell>
                    <TableCell>{line.locationCode}</TableCell>
                    <TableCell>{line.batchNumber || '-'}</TableCell>
                    <TableCell>{line.asnNumber || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={line.adjustQuantity > 0 ? 'text-green-600' : 'text-red-600'}>
                        {line.adjustQuantity > 0 ? '+' : ''}{line.adjustQuantity}
                      </span>
                    </TableCell>
                    <TableCell>{line.reason || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => removeLine(index)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/inventory/adjustments')}>
          {t('cancel')}
        </Button>
        <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          保存草稿
        </Button>
        <Button onClick={() => handleSave(true)} disabled={loading}>
          <Send className="mr-2 h-4 w-4" />
          {tAdj('submit')}
        </Button>
      </div>
    </div>
  )
}
