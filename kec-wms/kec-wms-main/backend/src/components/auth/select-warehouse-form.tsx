'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Building2, Loader2 } from 'lucide-react'
import {
  persistWarehouseSelection,
  type WarehouseBinding,
} from '@/contexts/warehouse-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SelectWarehouseFormProps {
  tenantId: string
  userId: string
  username: string
  warehouses: WarehouseBinding[]
}

export function SelectWarehouseForm({
  tenantId,
  userId,
  username,
  warehouses,
}: SelectWarehouseFormProps) {
  const t = useTranslations('auth')
  const router = useRouter()
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    persistWarehouseSelection(tenantId, userId, '')
  }, [tenantId, userId])

  const handleSubmit = async () => {
    if (!selectedWarehouseId) {
      setError(t('selectWarehouseFirst'))
      return
    }

    setSubmitting(true)
    setError('')
    persistWarehouseSelection(tenantId, userId, selectedWarehouseId)
    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <Card className="w-full max-w-lg border-border/60 shadow-lg">
      <CardHeader className="space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl">{t('selectWarehouseTitle')}</CardTitle>
          <CardDescription>
            {t('selectWarehouseSubtitle', { username })}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">{t('selectWarehouseLabel')}</div>
          <Select
            value={selectedWarehouseId}
            onValueChange={(value) => {
              setSelectedWarehouseId(value)
              if (error) setError('')
            }}
            disabled={submitting}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder={t('selectWarehousePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.warehouseId} value={warehouse.warehouseId}>
                  {warehouse.warehouseCode} · {warehouse.warehouseName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground">{t('selectWarehouseHelp')}</p>

        {error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Button className="h-11 w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('selectWarehouseSubmitting')}
            </>
          ) : (
            t('selectWarehouseButton')
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
