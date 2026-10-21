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

interface TransferLine {
  skuId: string
  skuCode: string
  skuName: string
  sourceLocationId: string
  sourceLocationCode: string
  targetLocationId: string
  targetLocationCode: string
  batchNumber: string
  quantity: number
  reason: string
}

export default function NewTransferPage() {
  const t = useTranslations('common')
  const tTrf = useTranslations('inventory.transfer')
  const tMenuGroup = useTranslations('menuGroup')
  const router = useRouter()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tTrf('title'), href: '/inventory/transfers' },
  })

  const [skus, setSkus] = useState<SKU[]>([])
  const [locations, setLocations] = useState<BinLocation[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [warehouseId, setWarehouseId] = useState('')
  const [transferType, setTransferType] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<TransferLine[]>([])

  // New line state
  const [newLine, setNewLine] = useState<Partial<TransferLine>>({
    skuId: '',
    sourceLocationId: '',
    targetLocationId: '',
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
    if (!newLine.skuId || !newLine.sourceLocationId || !newLine.targetLocationId || !newLine.quantity) {
      toast.error('请填写完整的明细信息')
      return
    }

    if (newLine.sourceLocationId === newLine.targetLocationId) {
      toast.error('源库位和目标库位不能相同')
      return
    }

    const sku = skus.find(s => s.id === newLine.skuId)
    const sourceLocation = locations.find(l => l.id === newLine.sourceLocationId)
    const targetLocation = locations.find(l => l.id === newLine.targetLocationId)

    if (!sku || !sourceLocation || !targetLocation) return

    setLines([...lines, {
      skuId: newLine.skuId,
      skuCode: sku.skuCode,
      skuName: sku.skuName,
      sourceLocationId: newLine.sourceLocationId,
      sourceLocationCode: sourceLocation.locationCode,
      targetLocationId: newLine.targetLocationId,
      targetLocationCode: targetLocation.locationCode,
      batchNumber: newLine.batchNumber || '',
      quantity: newLine.quantity || 0,
      reason: newLine.reason || '',
    }])

    setNewLine({
      skuId: '',
      sourceLocationId: '',
      targetLocationId: '',
      batchNumber: '',
      quantity: 0,
      reason: '',
    })
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const handleSave = async (submit = false) => {
    if (!warehouseId || !transferType || !reason) {
      toast.error('请填写必填项')
      return
    }

    if (lines.length === 0) {
      toast.error('请添加至少一条转移明细')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/v1/inventory/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId,
          transferType,
          reason,
          notes,
          lines: lines.map(l => ({
            skuId: l.skuId,
            sourceLocationId: l.sourceLocationId,
            targetLocationId: l.targetLocationId,
            batchNumber: l.batchNumber || undefined,
            quantity: l.quantity,
            reason: l.reason || undefined,
          })),
        }),
      })

      const result = await response.json()

      if (result.data) {
        toast.success(tTrf('createSuccess'))

        if (submit && result.data?.id) {
          const submitResponse = await fetch(`/api/v1/inventory/transfers/${result.data.id}/submit`, {
            method: 'POST',
          })
          const submitResult = await submitResponse.json()
          if (submitResult.data) {
            toast.success(tTrf('submitSuccess'))
          }
        }

        router.push('/inventory/transfers')
      } else {
        toast.error(result.error || '创建失败')
      }
    } catch (error) {
      console.error('Failed to create transfer:', error)
      toast.error('创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(tTrf('create'))} />

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{tTrf('warehouse')} *</Label>
              <WarehouseSelect value={warehouseId} onValueChange={setWarehouseId} />
            </div>
            <div className="space-y-2">
              <Label>{tTrf('type')} *</Label>
              <Select value={transferType} onValueChange={setTransferType}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择转移类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BIN_TRANSFER">{tTrf('types.BIN_TRANSFER')}</SelectItem>
                  <SelectItem value="STATUS_TRANSFER">{tTrf('types.STATUS_TRANSFER')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tTrf('reason')} *</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入转移原因"
            />
          </div>
          <div className="space-y-2">
            <Label>{tTrf('notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="请输入备注"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transfer Lines */}
      <Card>
        <CardHeader>
          <CardTitle>{tTrf('line.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new line form */}
          <div className="grid grid-cols-7 gap-2 items-end border-b pb-4">
            <div className="space-y-1">
              <Label className="text-xs">{tTrf('line.sku')}</Label>
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
              <Label className="text-xs">{tTrf('line.sourceLocation')}</Label>
              <Select
                value={newLine.sourceLocationId}
                onValueChange={(v) => setNewLine({ ...newLine, sourceLocationId: v })}
                disabled={!warehouseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="源库位" />
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
              <Label className="text-xs">{tTrf('line.targetLocation')}</Label>
              <Select
                value={newLine.targetLocationId}
                onValueChange={(v) => setNewLine({ ...newLine, targetLocationId: v })}
                disabled={!warehouseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="目标库位" />
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
              <Label className="text-xs">{tTrf('line.batchNumber')}</Label>
              <Input
                value={newLine.batchNumber}
                onChange={(e) => setNewLine({ ...newLine, batchNumber: e.target.value })}
                placeholder="批次号"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tTrf('line.quantity')}</Label>
              <Input
                type="number"
                value={newLine.quantity}
                onChange={(e) => setNewLine({ ...newLine, quantity: parseInt(e.target.value) || 0 })}
                placeholder="数量"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tTrf('line.reason')}</Label>
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
                <TableHead>{tTrf('line.sourceLocation')}</TableHead>
                <TableHead>{tTrf('line.targetLocation')}</TableHead>
                <TableHead>{tTrf('line.batchNumber')}</TableHead>
                <TableHead className="text-right">{tTrf('line.quantity')}</TableHead>
                <TableHead>{tTrf('line.reason')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    请添加转移明细
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="font-medium">{line.skuCode}</div>
                      <div className="text-sm text-muted-foreground">{line.skuName}</div>
                    </TableCell>
                    <TableCell>{line.sourceLocationCode}</TableCell>
                    <TableCell>{line.targetLocationCode}</TableCell>
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
        <Button variant="outline" onClick={() => router.push('/inventory/transfers')}>
          {t('cancel')}
        </Button>
        <Button variant="outline" onClick={() => handleSave(false)} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          保存草稿
        </Button>
        <Button onClick={() => handleSave(true)} disabled={loading}>
          <Send className="mr-2 h-4 w-4" />
          {tTrf('submit')}
        </Button>
      </div>
    </div>
  )
}
