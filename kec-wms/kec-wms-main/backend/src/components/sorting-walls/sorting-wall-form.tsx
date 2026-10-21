'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useOptionalWarehouseContext } from '@/contexts/warehouse-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface SortingWallFormData {
  wallCode: string
  wallName: string
  workstationCode: string
  horizontalCells: number
  verticalCells: number
  locationCode: string
  remarks: string
}

interface SortingWallFormProps {
  mode: 'create' | 'edit'
  warehouseLabel?: string
  initialData?: Partial<SortingWallFormData> & { id?: string; wallCode?: string; warehouseId?: string }
}

export function SortingWallForm({
  mode,
  warehouseLabel,
  initialData,
}: SortingWallFormProps) {
  const router = useRouter()
  const t = useTranslations('sortingWall')
  const tCommon = useTranslations('common')
  const warehouseContext = useOptionalWarehouseContext()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<SortingWallFormData>({
    wallCode: initialData?.wallCode || '',
    wallName: initialData?.wallName || '',
    workstationCode: initialData?.workstationCode || '',
    horizontalCells: initialData?.horizontalCells || 4,
    verticalCells: initialData?.verticalCells || 4,
    locationCode: initialData?.locationCode || '999.99.99',
    remarks: initialData?.remarks || '',
  })
  const resolvedWarehouseLabel =
    mode === 'create'
      ? (
          warehouseContext?.currentWarehouse
            ? `${warehouseContext.currentWarehouse.warehouseName} (${warehouseContext.currentWarehouse.warehouseCode})`
            : ''
        )
      : (warehouseLabel || '')

  const totalCells = formData.horizontalCells * formData.verticalCells

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (totalCells > 1000) {
      toast.error(t('totalCellsExceeded'))
      return
    }

    setLoading(true)
    try {
      const url =
        mode === 'create'
          ? '/api/v1/sorting-walls'
          : `/api/v1/sorting-walls/${initialData?.id}`

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t(mode === 'create' ? 'createSuccess' : 'updateSuccess'))
        router.push('/sorting-walls')
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch {
      toast.error(tCommon('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wallCode">{t('wallCode')} *</Label>
              <Input
                id="wallCode"
                value={formData.wallCode}
                onChange={(e) =>
                  setFormData({ ...formData, wallCode: e.target.value })
                }
                placeholder={t('wallCodePlaceholder')}
                maxLength={64}
                required
                disabled={mode === 'edit'}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('warehouse')} *</Label>
              <Input
                value={resolvedWarehouseLabel}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallName">{t('wallName')} *</Label>
              <Input
                id="wallName"
                value={formData.wallName}
                onChange={(e) =>
                  setFormData({ ...formData, wallName: e.target.value })
                }
                placeholder={t('wallNamePlaceholder')}
                maxLength={64}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workstationCode">{t('workstationCode')}</Label>
              <Input
                id="workstationCode"
                value={formData.workstationCode}
                onChange={(e) =>
                  setFormData({ ...formData, workstationCode: e.target.value })
                }
                placeholder={t('workstationCodePlaceholder')}
                maxLength={32}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('cellConfig')}</span>
              {mode === 'edit' && (
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
                  {t('cellConfigLocked')}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horizontalCells">{t('horizontalCells')} *</Label>
                <Input
                  id="horizontalCells"
                  type="number"
                  min={1}
                  max={50}
                  value={formData.horizontalCells}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      horizontalCells: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                  disabled={mode === 'edit'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verticalCells">{t('verticalCells')} *</Label>
                <Input
                  id="verticalCells"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.verticalCells}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      verticalCells: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                  disabled={mode === 'edit'}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('totalCells')}</Label>
                <Input
                  value={totalCells}
                  disabled
                  className={totalCells > 1000 ? 'border-destructive' : ''}
                />
                {totalCells > 1000 && (
                  <p className="text-sm text-destructive">
                    {t('totalCellsExceeded')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('otherInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="remarks">{t('remarks')}</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                placeholder={t('remarksPlaceholder')}
                maxLength={256}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading || totalCells > 1000}>
            {loading ? tCommon('saving') : tCommon('save')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/sorting-walls')}
          >
            {tCommon('cancel')}
          </Button>
        </div>
      </div>
    </form>
  )
}
