'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ClipboardList, Save, Send, Settings2, Target, X } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Textarea } from '@/components/ui/textarea'
import { WarehouseSelect } from '@/components/warehouses/warehouse-select'
import { EntitySelect, type EntitySelectOption } from '@/components/list-filters'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

interface ClientOption {
  id: string
  clientCode: string
  clientName: string
}

interface UserOption {
  id: string
  username: string
  fullName: string
}

interface ZoneOption {
  id: string
  zoneCode: string
  zoneName: string
}

interface LocationScopeOptions {
  aisles: string[]
  racks: string[]
  shelves: string[]
}

export interface InventoryCountFormInitialData {
  id?: string
  orderType: string
  countMode: string
  warehouseId: string
  plannedAt: string
  remark: string
  ownerScopeMode: string
  clientIds: string[]
  inventoryStatuses: string[]
  startLocationCode: string
  endLocationCode: string
  zoneId: string
  aisle: string
  rack: string
  shelfStart: string
  shelfEnd: string
  skuCodesText: string
  cycleDays: string
  calendarCode: string
  timeWindow: string
  excludeRules: string
  maxLocationsPerBatch: string
  counterUserId: string
  reviewerUserId: string
  allowPrint: boolean
}

interface InventoryCountFormProps {
  mode: 'create' | 'edit'
  initialData?: InventoryCountFormInitialData
}

const inventoryStatusOptions = [
  { value: 'AVAILABLE', label: '良品' },
  { value: 'FROZEN', label: '冻结' },
  { value: 'DEFECTIVE', label: '不良品' },
]

function getDefaultPlannedAt() {
  const date = new Date()
  date.setHours(date.getHours() + 1)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function buildDefaultInitialData(): InventoryCountFormInitialData {
  return {
    orderType: 'FULL',
    countMode: 'BLIND',
    warehouseId: '',
    plannedAt: getDefaultPlannedAt(),
    remark: '',
    ownerScopeMode: 'ALL',
    clientIds: [],
    inventoryStatuses: ['AVAILABLE'],
    startLocationCode: '',
    endLocationCode: '',
    zoneId: '',
    aisle: '',
    rack: '',
    shelfStart: '',
    shelfEnd: '',
    skuCodesText: '',
    cycleDays: '30',
    calendarCode: '',
    timeWindow: '',
    excludeRules: '',
    maxLocationsPerBatch: '50',
    counterUserId: '',
    reviewerUserId: '',
    allowPrint: false,
  }
}

export function InventoryCountForm({ mode, initialData }: InventoryCountFormProps) {
  const t = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const tCount = useTranslations('inventory.count')
  const router = useRouter()
  const breadcrumb = createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tCount('title'), href: '/inventory/counts' },
  })

  const [submitting, setSubmitting] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [zones, setZones] = useState<ZoneOption[]>([])
  const [locationScopeOptions, setLocationScopeOptions] = useState<LocationScopeOptions>({
    aisles: [],
    racks: [],
    shelves: [],
  })

  const effectiveInitialData = initialData || buildDefaultInitialData()

  const [orderType, setOrderType] = useState(effectiveInitialData.orderType)
  const [countMode, setCountMode] = useState(effectiveInitialData.countMode)
  const [warehouseId, setWarehouseId] = useState(effectiveInitialData.warehouseId)
  const [plannedAt, setPlannedAt] = useState(effectiveInitialData.plannedAt)
  const [remark, setRemark] = useState(effectiveInitialData.remark)
  const [ownerScopeMode, setOwnerScopeMode] = useState(effectiveInitialData.ownerScopeMode)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(effectiveInitialData.clientIds)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(effectiveInitialData.inventoryStatuses)
  const [startLocationCode, setStartLocationCode] = useState(effectiveInitialData.startLocationCode)
  const [endLocationCode, setEndLocationCode] = useState(effectiveInitialData.endLocationCode)
  const [zoneId, setZoneId] = useState(effectiveInitialData.zoneId)
  const [aisle, setAisle] = useState(effectiveInitialData.aisle)
  const [rack, setRack] = useState(effectiveInitialData.rack)
  const [shelfStart, setShelfStart] = useState(effectiveInitialData.shelfStart)
  const [shelfEnd, setShelfEnd] = useState(effectiveInitialData.shelfEnd)
  const [skuCodesText, setSkuCodesText] = useState(effectiveInitialData.skuCodesText)
  const [cycleDays, setCycleDays] = useState(effectiveInitialData.cycleDays)
  const [calendarCode, setCalendarCode] = useState(effectiveInitialData.calendarCode)
  const [timeWindow, setTimeWindow] = useState(effectiveInitialData.timeWindow)
  const [excludeRules, setExcludeRules] = useState(effectiveInitialData.excludeRules)
  const [maxLocationsPerBatch, setMaxLocationsPerBatch] = useState(effectiveInitialData.maxLocationsPerBatch)
  const [counterUserId, setCounterUserId] = useState(effectiveInitialData.counterUserId)
  const [reviewerUserId, setReviewerUserId] = useState(effectiveInitialData.reviewerUserId)
  const [allowPrint, setAllowPrint] = useState(effectiveInitialData.allowPrint)

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [clientsResponse, usersResponse, zonesResponse] = await Promise.all([
          fetch('/api/v1/clients?pageSize=100&isActive=true'),
          fetch('/api/v1/users?pageSize=100&status=ACTIVE'),
          fetch('/api/v1/zones?pageSize=100&status=ACTIVE'),
        ])

        const [clientsResult, usersResult, zonesResult] = await Promise.all([
          clientsResponse.json(),
          usersResponse.json(),
          zonesResponse.json(),
        ])

        if (clientsResult.success) {
          setClients(clientsResult.data || [])
        }
        if (usersResult.success) {
          setUsers(usersResult.data || [])
        }
        if (zonesResult.success) {
          setZones(zonesResult.data || [])
        }
      } catch (error) {
        console.error('Failed to load inventory count options:', error)
      }
    }

    loadOptions()
  }, [])

  useEffect(() => {
    if (!initialData) {
      return
    }

    setOrderType(initialData.orderType)
    setCountMode(initialData.countMode)
    setWarehouseId(initialData.warehouseId)
    setPlannedAt(initialData.plannedAt)
    setRemark(initialData.remark)
    setOwnerScopeMode(initialData.ownerScopeMode)
    setSelectedClientIds(initialData.clientIds)
    setSelectedStatuses(initialData.inventoryStatuses)
    setStartLocationCode(initialData.startLocationCode)
    setEndLocationCode(initialData.endLocationCode)
    setZoneId(initialData.zoneId)
    setAisle(initialData.aisle)
    setRack(initialData.rack)
    setShelfStart(initialData.shelfStart)
    setShelfEnd(initialData.shelfEnd)
    setSkuCodesText(initialData.skuCodesText)
    setCycleDays(initialData.cycleDays)
    setCalendarCode(initialData.calendarCode)
    setTimeWindow(initialData.timeWindow)
    setExcludeRules(initialData.excludeRules)
    setMaxLocationsPerBatch(initialData.maxLocationsPerBatch)
    setCounterUserId(initialData.counterUserId)
    setReviewerUserId(initialData.reviewerUserId)
    setAllowPrint(initialData.allowPrint)
  }, [initialData])

  useEffect(() => {
    if (!warehouseId || !zoneId || orderType !== 'LOCATION') {
      setLocationScopeOptions({ aisles: [], racks: [], shelves: [] })
      return
    }

    const loadLocationScopeOptions = async () => {
      try {
        const params = new URLSearchParams({ warehouseId, zoneId })
        if (aisle) params.set('aisle', aisle)
        if (rack) params.set('rack', rack)
        const response = await fetch(`/api/v1/bin-locations/scope-options?${params.toString()}`)
        const result = await response.json()
        if (result.success) {
          setLocationScopeOptions(result.data)
        }
      } catch (error) {
        console.error('Failed to load location scope options:', error)
      }
    }

    loadLocationScopeOptions()
  }, [warehouseId, zoneId, aisle, rack, orderType])

  const userOptions: EntitySelectOption[] = useMemo(
    () => users.map((user) => ({
      value: user.id,
      label: user.fullName || user.username,
      keywords: [user.fullName, user.username].filter(Boolean),
    })),
    [users]
  )

  const zoneOptions: EntitySelectOption[] = useMemo(
    () => zones.map((zone) => ({
      value: zone.id,
      label: `${zone.zoneCode} · ${zone.zoneName}`,
      keywords: [zone.zoneCode, zone.zoneName],
    })),
    [zones]
  )

  const orderTypeOptions = [
    { value: 'FULL', label: tCount('types.FULL') },
    { value: 'LOCATION', label: tCount('types.LOCATION') },
    { value: 'SKU', label: tCount('types.SKU') },
    ...(mode === 'edit' ? [{ value: 'CYCLE', label: tCount('types.CYCLE') }] : []),
  ]

  const toggleInventoryStatus = (value: string) => {
    setSelectedStatuses((current) => (
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    ))
  }

  const buildPayload = (saveMode: 'DRAFT' | 'PENDING_SCOPE') => ({
    saveMode,
    orderType,
    countMode,
    warehouseId,
    plannedAt: new Date(plannedAt).toISOString(),
    remark: remark || undefined,
    ownerScopeMode,
    clientIds: ownerScopeMode === 'PARTIAL' ? selectedClientIds : [],
    scopeConfig: {
      inventoryStatuses: selectedStatuses,
      startLocationCode: startLocationCode || undefined,
      endLocationCode: endLocationCode || undefined,
      zoneId: zoneId || undefined,
      aisle: aisle || undefined,
      rack: rack || undefined,
      shelfStart: shelfStart || undefined,
      shelfEnd: shelfEnd || undefined,
      skuCodes: skuCodesText
        .split(/[\n,，]/)
        .map((item) => item.trim())
        .filter(Boolean),
      cycleDays: cycleDays ? Number(cycleDays) : undefined,
      calendarCode: calendarCode || undefined,
      timeWindow: timeWindow || undefined,
      excludeRules: excludeRules || undefined,
      maxLocationsPerBatch: maxLocationsPerBatch ? Number(maxLocationsPerBatch) : undefined,
    },
    executionConfig: {
      splitRule: 'BY_LOCATION',
      counterUserId: counterUserId || undefined,
      reviewerUserId: reviewerUserId || undefined,
      allowPrint,
      pdaMode: countMode,
    },
  })

  const handleSubmit = async (saveMode: 'DRAFT' | 'PENDING_SCOPE') => {
    if (counterUserId && reviewerUserId && counterUserId === reviewerUserId) {
      toast.error(tCount('counterReviewerCannotSame'))
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(
        mode === 'edit' && initialData?.id ? `/api/v1/inventory/counts/${initialData.id}` : '/api/v1/inventory/counts',
        {
          method: mode === 'edit' ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildPayload(saveMode)),
        }
      )

      const result = await response.json()
      if (!result.success) {
        toast.error(result.message || (mode === 'edit' ? tCount('updateFailed') : tCount('createFailed')))
        return
      }

      toast.success(mode === 'edit' ? tCount('updateSuccess') : tCount('createSuccess'))
      router.push('/inventory/counts')
    } catch (error) {
      console.error(`Failed to ${mode === 'edit' ? 'update' : 'create'} inventory count order:`, error)
      toast.error(mode === 'edit' ? tCount('updateFailed') : tCount('createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumb.current(mode === 'edit' ? t('edit') : tCount('create'))} />

      <Card className="overflow-hidden rounded-lg shadow-sm">
        <CardContent className="p-0">
          <section className="space-y-3 border-b p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              {tCount('basicInfo')}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>{tCount('orderType')}</Label>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={orderType} onChange={(event) => setOrderType(event.target.value)}>
                  {orderTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('warehouse')}</Label>
                <WarehouseSelect value={warehouseId} onValueChange={setWarehouseId} />
              </div>
              <div className="space-y-2">
                <Label>{tCount('plannedAt')}</Label>
                <Input type="datetime-local" value={plannedAt} onChange={(event) => setPlannedAt(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{tCount('countMode')}</Label>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={countMode} onChange={(event) => setCountMode(event.target.value)}>
                  <option value="BLIND">{tCount('countModes.BLIND')}</option>
                  <option value="OPEN">{tCount('countModes.OPEN')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{tCount('ownerScope')}</Label>
                <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={ownerScopeMode} onChange={(event) => setOwnerScopeMode(event.target.value)}>
                  <option value="ALL">{tCount('ownerScopeModes.ALL')}</option>
                  <option value="PARTIAL">{tCount('ownerScopeModes.PARTIAL')}</option>
                </select>
              </div>
              {ownerScopeMode === 'PARTIAL' && (
                <div className="space-y-2">
                  <Label>{tCount('selectClients')}</Label>
                  <SearchableSelect
                    mode="multiple"
                    value={selectedClientIds}
                    onChange={(value) => setSelectedClientIds(Array.isArray(value) ? value : [value].filter(Boolean))}
                    options={clients}
                    getOptionValue={(client) => client.id}
                    getOptionLabel={(client) => `${client.clientCode} · ${client.clientName}`}
                    placeholder={tCount('selectClients')}
                    searchPlaceholder={tCount('searchClient')}
                    emptyText={tCount('noClientFound')}
                    selectedTextFormatter={(count) => tCount('selectedClientsCount', { count })}
                    className="h-9 w-full"
                    contentClassName="w-[360px]"
                  />
                </div>
              )}
              <div className="space-y-2 md:col-span-2">
                <Label>{tCount('remark')}</Label>
                <Textarea value={remark} onChange={(event) => setRemark(event.target.value)} rows={1} className="min-h-9" />
              </div>
            </div>
          </section>

          <section className="space-y-3 border-b p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-muted-foreground" />
              {tCount('scopeConfig')}
            </div>
            {orderType === 'FULL' && (
              <div className="space-y-2">
                <Label>{tCount('inventoryStatuses')}</Label>
                <div className="flex flex-wrap gap-4 rounded-md border bg-muted/20 px-3 py-2">
                  {inventoryStatusOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedStatuses.includes(option.value)}
                        onCheckedChange={() => toggleInventoryStatus(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {orderType === 'LOCATION' && (
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <div className="space-y-2">
                  <Label>{tCount('zone')}</Label>
                  <EntitySelect
                    value={zoneId}
                    onValueChange={(value) => {
                      setZoneId(value)
                      setAisle('')
                      setRack('')
                      setShelfStart('')
                      setShelfEnd('')
                    }}
                    options={zoneOptions}
                    placeholder={tCount('selectZone')}
                    searchPlaceholder={tCount('searchZone')}
                    emptyText={tCount('noZoneFound')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tCount('aisle')}</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={aisle}
                    onChange={(event) => {
                      setAisle(event.target.value)
                      setRack('')
                      setShelfStart('')
                      setShelfEnd('')
                    }}
                    disabled={!zoneId}
                  >
                    <option value="">{tCount('selectAisle')}</option>
                    {locationScopeOptions.aisles.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{tCount('rack')}</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={rack}
                    onChange={(event) => {
                      setRack(event.target.value)
                      setShelfStart('')
                      setShelfEnd('')
                    }}
                    disabled={!aisle}
                  >
                    <option value="">{tCount('selectRack')}</option>
                    {locationScopeOptions.racks.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{tCount('shelfStart')}</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={shelfStart}
                    onChange={(event) => setShelfStart(event.target.value)}
                    disabled={!rack}
                  >
                    <option value="">{tCount('allShelves')}</option>
                    {locationScopeOptions.shelves.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>{tCount('shelfEnd')}</Label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                    value={shelfEnd}
                    onChange={(event) => setShelfEnd(event.target.value)}
                    disabled={!rack}
                  >
                    <option value="">{tCount('allShelves')}</option>
                    {locationScopeOptions.shelves.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {orderType === 'SKU' && (
              <div className="space-y-2">
                <Label>{tCount('skuCodes')}</Label>
                <Textarea
                  value={skuCodesText}
                  onChange={(event) => setSkuCodesText(event.target.value)}
                  rows={4}
                  placeholder={tCount('skuCodesPlaceholder')}
                />
              </div>
            )}

            {orderType === 'CYCLE' && (
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label>{tCount('cycleDays')}</Label>
                  <Input value={cycleDays} onChange={(event) => setCycleDays(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{tCount('calendarCode')}</Label>
                  <Input value={calendarCode} onChange={(event) => setCalendarCode(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{tCount('timeWindow')}</Label>
                  <Input value={timeWindow} onChange={(event) => setTimeWindow(event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-3 xl:col-span-4">
                  <Label>{tCount('excludeRules')}</Label>
                  <Textarea value={excludeRules} onChange={(event) => setExcludeRules(event.target.value)} rows={2} />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              {tCount('executionConfig')}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2">
                <Label>{tCount('splitRule')}</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
                  {tCount('splitRules.BY_LOCATION')}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tCount('maxLocationsPerBatch')}</Label>
                <Input value={maxLocationsPerBatch} onChange={(event) => setMaxLocationsPerBatch(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{tCount('pdaMode')}</Label>
                <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
                  {countMode === 'BLIND' ? tCount('countModes.BLIND') : tCount('countModes.OPEN')}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tCount('counterUser')}</Label>
                <EntitySelect
                  value={counterUserId}
                  onValueChange={setCounterUserId}
                  options={userOptions}
                  placeholder={tCount('selectUser')}
                  searchPlaceholder={tCount('searchUser')}
                  emptyText={tCount('noUserFound')}
                  showAll
                  allLabel={tCount('noAssignee')}
                />
              </div>
              <div className="space-y-2">
                <Label>{tCount('reviewerUser')}</Label>
                <EntitySelect
                  value={reviewerUserId}
                  onValueChange={setReviewerUserId}
                  options={userOptions}
                  placeholder={tCount('selectUser')}
                  searchPlaceholder={tCount('searchUser')}
                  emptyText={tCount('noUserFound')}
                  showAll
                  allLabel={tCount('noAssignee')}
                />
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/inventory/counts')}>
          <X className="mr-2 h-4 w-4" />
          {t('cancel')}
        </Button>
        <Button variant="outline" onClick={() => handleSubmit('DRAFT')} disabled={submitting}>
          <Save className="mr-2 h-4 w-4" />
          {tCount('saveDraft')}
        </Button>
        <Button onClick={() => handleSubmit('PENDING_SCOPE')} disabled={submitting}>
          <Send className="mr-2 h-4 w-4" />
          {submitting ? t('saving') : mode === 'edit' ? t('save') : tCount('savePendingScope')}
        </Button>
      </div>
    </div>
  )
}
