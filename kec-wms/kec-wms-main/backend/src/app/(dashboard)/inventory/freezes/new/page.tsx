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
import { Plus, Trash2, Snowflake } from 'lucide-react'
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

interface FreezeLine {
  skuId: string
  skuCode: string
  skuName: string
  locationId: string
  locationCode: string
  batchNumber: string
  quantity: number
  reason: string
}

export default function NewFreezePage() {
  const t = useTranslations('common')
  const tFrz = useTranslations('inventory.freeze')
  const tMenuGroup = useTranslations('menuGroup')
  const router = useRouter()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tFrz('title'), href: '/inventory/freezes' },
  })

  const [skus, setSkus] = useState<SKU[]>([])
  const [locations, setLocations] = useState<BinLocation[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [warehouseId, setWarehouseId] = useState('')
  const [freezeType, setFreezeType] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<FreezeLine[]>([])

  // New line state
  const [newLine, setNewLine] = useState<Partial<FreezeLine>>({
    skuId: '',
    locationId: '',
    batchNumber: '',
    quantity: 0,
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
    if (!newLine.skuId || !newLine.locationId || !newLine.quantity) {
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
      quantity: newLine.quantity || 0,
      reason: newLine.reason || '',
    }])

    setNewLine({
      skuId: '',
      locationId: '',
      batchNumber: '',
      quantity: 0,
      reason: '',
    })
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!warehouseId || !freezeType || !reason) {
      toast.error('请填写必填项')
      return
    }

    if (lines.length === 0) {
      toast.error('请添加至少一条冻结明细')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v1/inventory/freezes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId,
          freezeType,
          reason,
          notes,
          lines: lines.map(l => ({
            skuId: l.skuId,
            locationId: l.locationId,
            batchNumber: l.batchNumber || undefined,
            quantity: l.quantity,
            reason: l.reason || undefined,
          })),
        }),
      })

      const result = await response.json()

      if (result.data) {
        toast.success(tFrz('createSuccess'))
        router.push('/inventory/freezes')
      } else {
        toast.error(result.error || '创建失败')
      }
    } catch (error) {
      console.error('Failed to create freeze:', error)
      toast.error('创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(tFrz('create'))} />

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tFrz('warehouse')} *</Label>
              <WarehouseSelect value={warehouseId} onValueChange={setWarehouseId} />
            </div>
            <div className="space-y-2">
              <Label>{tFrz('type')} *</Label>
              <Select value={freezeType} onValueChange={setFreezeType}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择冻结类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QC_HOLD">{tFrz('types.QC_HOLD')}</SelectItem>
                  <SelectItem value="DEFECTIVE_HOLD">{tFrz('types.DEFECTIVE_HOLD')}</SelectItem>
                  <SelectItem value="EXPIRY_HOLD">{tFrz('types.EXPIRY_HOLD')}</SelectItem>
                  <SelectItem value="RECALL_HOLD">{tFrz('types.RECALL_HOLD')}</SelectItem>
                  <SelectItem value="COUNT_HOLD">{tFrz('types.COUNT_HOLD')}</SelectItem>
                  <SelectItem value="MANUAL_HOLD">{tFrz('types.MANUAL_HOLD')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tFrz('reason')} *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入冻结原因"
            />
          </div>
          <div className="space-y-2">
            <Label>{tFrz('notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="请输入备注"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Freeze Lines */}
      <Card>
        <CardHeader>
          <CardTitle>{tFrz('line.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new line form */}
          <div className="grid grid-cols-6 gap-2 items-end border-b pb-4">
            <div className="space-y-1">
              <Label className="text-xs">{tFrz('line.sku')}</Label>
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
              <Label className="text-xs">{tFrz('line.location')}</Label>
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
              <Label className="text-xs">{tFrz('line.batchNumber')}</Label>
              <Input
                value={newLine.batchNumber}
                onChange={(e) => setNewLine({ ...newLine, batchNumber: e.target.value })}
                placeholder="批次号"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tFrz('line.quantity')}</Label>
              <Input
                type="number"
                value={newLine.quantity}
                onChange={(e) => setNewLine({ ...newLine, quantity: parseInt(e.target.value) || 0 })}
                placeholder="数量"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tFrz('line.reason')}</Label>
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
                <TableHead>{tFrz('line.location')}</TableHead>
                <TableHead>{tFrz('line.batchNumber')}</TableHead>
                <TableHead className="text-right">{tFrz('line.quantity')}</TableHead>
                <TableHead>{tFrz('line.reason')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    请添加冻结明细
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
                    <TableCell className="text-right font-medium">{line.quantity}</TableCell>
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
        <Button variant="outline" onClick={() => router.push('/inventory/freezes')}>
          {t('cancel')}
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          <Snowflake className="mr-2 h-4 w-4" />
          {tFrz('create')}
        </Button>
      </div>
    </div>
  )
}
