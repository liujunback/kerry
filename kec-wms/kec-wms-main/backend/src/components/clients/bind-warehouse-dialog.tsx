'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Warehouse, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

interface WarehouseItem {
  id: string
  warehouseCode: string
  warehouseName: string
  warehouseType: string
  city: string | null
  status: string
}

interface BoundWarehouse {
  id: string
  warehouseId: string
  isDefault: boolean
}

interface BindWarehouseDialogProps {
  clientId: string
  clientName: string
  onSuccess?: () => void
}

export function BindWarehouseDialog({
  clientId,
  clientName,
  onSuccess,
}: BindWarehouseDialogProps) {
  const t = useTranslations('client')
  const tCommon = useTranslations('common')

  const [open, setOpen] = useState(false)
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([])
  const [boundWarehouseIds, setBoundWarehouseIds] = useState<Set<string>>(new Set())
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([])
  const [defaultWarehouse, setDefaultWarehouse] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  // 加载数据
  useEffect(() => {
    if (open) {
      fetchData()
    } else {
      // 重置状态
      setSelectedWarehouses([])
      setDefaultWarehouse('')
    }
  }, [open])

  const fetchData = async () => {
    setFetching(true)
    try {
      const [warehousesRes, boundRes] = await Promise.all([
        fetch('/api/v1/warehouses?pageSize=100&status=ACTIVE'),
        fetch(`/api/v1/clients/${clientId}/warehouses`),
      ])

      const warehousesData = await warehousesRes.json()
      const boundData = await boundRes.json()

      if (warehousesData.success) {
        setWarehouses(warehousesData.data)
      }

      if (boundData.success) {
        const boundIds = new Set<string>(
          boundData.data.map((item: BoundWarehouse) => item.warehouseId)
        )
        setBoundWarehouseIds(boundIds)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error(t('fetchFailed'))
    } finally {
      setFetching(false)
    }
  }

  const handleCheckboxChange = (warehouseId: string, checked: boolean) => {
    if (checked) {
      setSelectedWarehouses([...selectedWarehouses, warehouseId])
      // 如果是第一个选中的，自动设为默认
      if (selectedWarehouses.length === 0) {
        setDefaultWarehouse(warehouseId)
      }
    } else {
      setSelectedWarehouses(selectedWarehouses.filter((id) => id !== warehouseId))
      // 如果取消的是默认仓库，清除默认标记
      if (defaultWarehouse === warehouseId) {
        setDefaultWarehouse('')
      }
    }
  }

  const handleSubmit = async () => {
    if (selectedWarehouses.length === 0) {
      toast.error(t('selectWarehouses'))
      return
    }

    setLoading(true)
    try {
      let successCount = 0
      for (const warehouseId of selectedWarehouses) {
        const res = await fetch(`/api/v1/clients/${clientId}/warehouses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouseId,
            isDefault: warehouseId === defaultWarehouse,
          }),
        })

        const data = await res.json()
        if (data.success) {
          successCount++
        }
      }

      if (successCount > 0) {
        toast.success(t('bindSuccess'))
        setOpen(false)
        onSuccess?.()
      }
    } catch (error) {
      console.error('Failed to bind warehouses:', error)
      toast.error(t('bindFailed'))
    } finally {
      setLoading(false)
    }
  }

  const availableWarehouses = warehouses.filter(
    (w) => !boundWarehouseIds.has(w.id)
  )

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
      >
        <Warehouse className="mr-2 h-4 w-4" />
        {t('bindWarehouse')}
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t('bindWarehouse')} - {clientName}
            </DialogTitle>
          </DialogHeader>

          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">{tCommon('loading')}</div>
            </div>
          ) : (
            <div className="space-y-4">
              {warehouses.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {t('noWarehousesAvailable')}
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    {availableWarehouses.length > 0
                      ? t('selectWarehouses')
                      : t('allWarehousesBound')}
                  </div>
                  <div className="space-y-2">
                    {warehouses.map((warehouse) => {
                      const isBound = boundWarehouseIds.has(warehouse.id)
                      const isSelected = selectedWarehouses.includes(warehouse.id)
                      const isDefault = defaultWarehouse === warehouse.id

                      return (
                        <div
                          key={warehouse.id}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={isBound}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(warehouse.id, checked as boolean)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{warehouse.warehouseName}</span>
                              <span className="text-xs text-muted-foreground">
                                ({warehouse.warehouseCode})
                              </span>
                              {isBound && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('alreadyBound')}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {warehouse.warehouseType} {warehouse.city && `· ${warehouse.city}`}
                            </div>
                          </div>
                          {isSelected && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setDefaultWarehouse(warehouse.id)}
                              title={t('setAsDefault')}
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  isDefault ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                                }`}
                              />
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedWarehouses.length === 0 || loading || fetching}
            >
              {loading ? tCommon('submitting') : tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
