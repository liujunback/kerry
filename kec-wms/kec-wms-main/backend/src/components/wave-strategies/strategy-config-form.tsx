'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { HelpCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { WarehouseSelect } from '@/components/warehouses/warehouse-select'
import { useCachedOptions } from '@/lib/hooks/use-cached-options'

type FormMode = 'create' | 'edit'
type PickMode = 'BY_ORDER' | 'SKU_BATCH' | 'MIXED_BATCH' | 'PICK_AND_SORT'
type DownstreamMode = 'PACK_DIRECT' | 'SORT_THEN_PACK'
type FilterFieldCode = 'orderBusinessType' | 'platform' | 'shippingMethod' | 'clientId' | 'zoneId' | 'expectedOutboundTime'
type WaveTypeCode =
  | 'SINGLE_ONE_HOT'
  | 'SINGLE_ONE_NORMAL'
  | 'SINGLE_MULTI_HOT'
  | 'SINGLE_MULTI_NORMAL'
  | 'MULTI_FIXED_COMBO'
  | 'MULTI_NON_FIXED'

const filterFieldCodes: FilterFieldCode[] = ['orderBusinessType', 'platform', 'shippingMethod', 'clientId', 'zoneId', 'expectedOutboundTime']
const orderBusinessTypes = ['STANDARD', 'EXPRESS', 'B2B', 'TRANSFER', 'SAMPLE', 'RETURN_TO_VENDOR'] as const
const expectedOutboundTimePresetOptions = ['T', 'T-1', 'T-2'] as const
const sortingWallLimitedWaveTypes: WaveTypeCode[] = ['SINGLE_MULTI_NORMAL', 'MULTI_NON_FIXED']

interface WaveStrategyFilterOptionSet {
  platforms: string[]
  shippingMethods: string[]
}

interface ClientOption {
  id: string
  clientCode: string
  clientName: string
}

interface ZoneOption {
  id: string
  zoneCode: string
  zoneName: string | null
  zoneType: string
}

interface StrategyConfigFormProps {
  mode: FormMode
  strategyId?: string
}

interface WaveTypeItem {
  code: WaveTypeCode
  name: string
  enabled: boolean
  minOrdersPerWave: string
  maxOrdersPerWave: string
  pickMode: PickMode
  downstreamMode: DownstreamMode
  configurableDownstream: boolean
  hotSkuIdsText: string
  fixedCombosText: string
}

interface FilterConditionItem {
  id: string
  groupNo: number
  logicOp: 'AND' | 'OR'
  fieldCode: FilterFieldCode
  value: string
  valueTo?: string
  expectedOutboundTimeMode?: 'preset' | 'custom'
}

interface StrategyRuleSet {
  triggerConfigJson: { modes: string[]; cronExpression?: string | null; scheduleTimes?: string[] | null }
  filterConfigJson: {
    orderBusinessTypes: string[]
    clientIds: string[]
    platforms: string[]
    shippingMethods: string[]
    zoneIds: string[]
    groupJoinMode?: 'AND' | 'OR'
    expectedOutboundTime?: { from?: string | null; to?: string | null } | null
    conditionGroups?: FilterConditionItem[]
  }
  executionConfigJson: {
    enableOrderLimit: boolean
    maxOrdersPerRun?: number | null
    batchSortField: 'expectedOutboundTime' | 'createdAt'
    batchSortDirection: 'asc' | 'desc'
  }
  waveTypeConfigJson: Array<{
    code: WaveTypeCode
    enabled: boolean
    minOrdersPerWave: number
    maxOrdersPerWave: number
    pickMode: PickMode
    downstreamMode: DownstreamMode
    identifyRule?: {
      hotSkuIds?: string[]
      fixedCombos?: Array<Array<{ skuId: string; qty: number }>>
    }
  }>
  pickConfigJson: {
    crossZoneSplitMode: 'BY_ZONE' | 'NO_SPLIT'
    enableMaxOrderLimit: boolean
    maxOrdersPerPickOrder?: number | null
  }
  releaseConfigJson: {
    releaseMode: 'IMMEDIATE' | 'MANUAL'
    autoAssignPicker: boolean
  }
}

interface StrategyDetail {
  id: string
  warehouseId: string
  strategyCode: string
  strategyName: string
  description: string | null
  priority: number
  status: 'DRAFT' | 'ENABLED' | 'DISABLED' | 'ARCHIVED'
  priorityConflictSummary?: {
    higherPriorityCount: number
    samePriorityCount: number
    lowerPriorityCount: number
    higherPriorityStrategies: Array<{ id: string; strategyCode: string; strategyName: string; priority: number }>
    samePriorityStrategies: Array<{ id: string; strategyCode: string; strategyName: string; priority: number }>
    lowerPriorityStrategies: Array<{ id: string; strategyCode: string; strategyName: string; priority: number }>
  }
  currentVersion?: {
    versionNo: number
    versionStatus: string
    ruleSet?: StrategyRuleSet | null
  } | null
}

interface FormState {
  warehouseId: string
  strategyName: string
  strategyCode: string
  description: string
  status: 'DRAFT' | 'ENABLED' | 'DISABLED' | 'ARCHIVED'
  priority: string
  allowManual: boolean
  allowScheduled: boolean
  cronExpression: string
  scheduleTimes: string[]
  groupJoinMode: 'AND' | 'OR'
  filterConditions: FilterConditionItem[]
  enableOrderLimit: boolean
  maxOrdersPerRun: string
  batchSortField: 'expectedOutboundTime' | 'createdAt'
  batchSortDirection: 'asc' | 'desc'
  sortingWallCells: string
  waveTypes: WaveTypeItem[]
  crossZoneSplitMode: 'BY_ZONE' | 'NO_SPLIT'
  enableMaxOrdersPerPick: boolean
  maxOrdersPerPickOrder: string
  releaseMode: 'IMMEDIATE' | 'MANUAL'
  autoAssignPicker: boolean
}

const stepKeys = ['basicInfo', 'trigger', 'filter', 'execution', 'waveTypes', 'pickRules', 'packRules', 'releaseRules'] as const
const maxStep = stepKeys.length

function defaultWaveTypes(): WaveTypeItem[] {
  return [
    { code: 'SINGLE_ONE_HOT', name: 'SINGLE_ONE_HOT', enabled: true, minOrdersPerWave: '5', maxOrdersPerWave: '5', pickMode: 'SKU_BATCH', downstreamMode: 'PACK_DIRECT', configurableDownstream: false, hotSkuIdsText: '', fixedCombosText: '' },
    { code: 'SINGLE_ONE_NORMAL', name: 'SINGLE_ONE_NORMAL', enabled: true, minOrdersPerWave: '50', maxOrdersPerWave: '50', pickMode: 'MIXED_BATCH', downstreamMode: 'PACK_DIRECT', configurableDownstream: false, hotSkuIdsText: '', fixedCombosText: '' },
    { code: 'SINGLE_MULTI_HOT', name: 'SINGLE_MULTI_HOT', enabled: true, minOrdersPerWave: '80', maxOrdersPerWave: '80', pickMode: 'SKU_BATCH', downstreamMode: 'PACK_DIRECT', configurableDownstream: false, hotSkuIdsText: '', fixedCombosText: '' },
    { code: 'SINGLE_MULTI_NORMAL', name: 'SINGLE_MULTI_NORMAL', enabled: true, minOrdersPerWave: '48', maxOrdersPerWave: '48', pickMode: 'MIXED_BATCH', downstreamMode: 'SORT_THEN_PACK', configurableDownstream: false, hotSkuIdsText: '', fixedCombosText: '' },
    { code: 'MULTI_FIXED_COMBO', name: 'MULTI_FIXED_COMBO', enabled: true, minOrdersPerWave: '5', maxOrdersPerWave: '5', pickMode: 'MIXED_BATCH', downstreamMode: 'PACK_DIRECT', configurableDownstream: false, hotSkuIdsText: '', fixedCombosText: '' },
    { code: 'MULTI_NON_FIXED', name: 'MULTI_NON_FIXED', enabled: true, minOrdersPerWave: '48', maxOrdersPerWave: '48', pickMode: 'MIXED_BATCH', downstreamMode: 'SORT_THEN_PACK', configurableDownstream: false, hotSkuIdsText: '', fixedCombosText: '' },
  ]
}

function parseWaveOrderCount(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0
}

function getWaveMinOrders(item: Pick<WaveTypeItem, 'minOrdersPerWave'>) {
  return parseWaveOrderCount(item.minOrdersPerWave)
}

function getWaveMaxOrders(item: Pick<WaveTypeItem, 'maxOrdersPerWave'>) {
  return parseWaveOrderCount(item.maxOrdersPerWave)
}

function getFixedPickMode(code: WaveTypeCode): PickMode {
  switch (code) {
    case 'SINGLE_ONE_HOT':
    case 'SINGLE_MULTI_HOT':
      return 'SKU_BATCH'
    case 'SINGLE_ONE_NORMAL':
    case 'SINGLE_MULTI_NORMAL':
    case 'MULTI_FIXED_COMBO':
    case 'MULTI_NON_FIXED':
    default:
      return 'MIXED_BATCH'
  }
}

function waveTypeLabel(code: WaveTypeCode, t: ReturnType<typeof useTranslations>) {
  return t(`waveTypes.codes.${code}`)
}

function createDefaultFilterConditions(): FilterConditionItem[] {
  return [
    { id: crypto.randomUUID(), groupNo: 1, logicOp: 'AND', fieldCode: 'orderBusinessType', value: '' },
    { id: crypto.randomUUID(), groupNo: 1, logicOp: 'AND', fieldCode: 'platform', value: '' },
    { id: crypto.randomUUID(), groupNo: 1, logicOp: 'AND', fieldCode: 'shippingMethod', value: '' },
  ]
}

function initialState(): FormState {
  return {
    warehouseId: '',
    strategyName: '',
    strategyCode: '',
    description: '',
    status: 'DRAFT',
    priority: '100',
    allowManual: true,
    allowScheduled: false,
    cronExpression: '',
    scheduleTimes: [],
    groupJoinMode: 'AND',
    filterConditions: createDefaultFilterConditions(),
    enableOrderLimit: false,
    maxOrdersPerRun: '200',
    batchSortField: 'expectedOutboundTime',
    batchSortDirection: 'asc',
    sortingWallCells: '48',
    waveTypes: defaultWaveTypes(),
    crossZoneSplitMode: 'BY_ZONE',
    enableMaxOrdersPerPick: false,
    maxOrdersPerPickOrder: '20',
    releaseMode: 'IMMEDIATE',
    autoAssignPicker: false,
  }
}

function normalizeScheduleTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return ''
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return ''
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function sortScheduleTimes(values: string[]) {
  return Array.from(new Set(values.map(normalizeScheduleTime).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right))
}

function parseScheduleTimesFromCronExpression(expression?: string | null) {
  if (!expression) return []
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 6) return []
  const [seconds, minutes, hours, dayOfMonth, month, dayOfWeek] = parts
  if (seconds !== '0' || dayOfMonth !== '*' || month !== '*' || dayOfWeek !== '*') return []
  if (minutes.includes('/') || minutes.includes('-') || hours.includes('/') || hours.includes('-')) return []

  const minuteValues = minutes.split(',').map((item) => item.trim()).filter(Boolean)
  const hourValues = hours.split(',').map((item) => item.trim()).filter(Boolean)
  if (minuteValues.some((item) => !/^\d{1,2}$/.test(item)) || hourValues.some((item) => !/^\d{1,2}$/.test(item))) return []

  const result: string[] = []
  for (const hourText of hourValues) {
    for (const minuteText of minuteValues) {
      const normalized = normalizeScheduleTime(`${hourText}:${minuteText.padStart(2, '0')}`)
      if (normalized) result.push(normalized)
    }
  }
  return sortScheduleTimes(result)
}

function splitCsv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function toLocalInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${mm}`
}

function stringifyFixedCombos(combos?: Array<Array<{ skuId: string; qty: number }>>) {
  if (!combos || combos.length === 0) return ''
  return combos
    .map((combo) => combo.map((item) => `${item.skuId}:${item.qty}`).join('+'))
    .join('\n')
}

function parseFixedCombos(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .split('+')
        .map((segment) => segment.trim())
        .filter(Boolean)
        .map((segment) => {
          const [skuId, qtyText] = segment.split(':').map((item) => item.trim())
          return {
            skuId,
            qty: Number(qtyText || '0'),
          }
        })
        .filter((item) => item.skuId && item.qty > 0)
    )
    .filter((combo) => combo.length > 0)
}

function normalizeGroupJoinMode() {
  return 'AND' as const
}

function normalizeLogicOp() {
  return 'AND' as const
}

function normalizeFilterGroupNo() {
  return 1
}

function buildFilterConditions(rules: StrategyRuleSet | null | undefined): FilterConditionItem[] {
  const conditions: FilterConditionItem[] = []
  if (!rules) return createDefaultFilterConditions()

  const savedGroups = (rules.filterConfigJson as StrategyRuleSet['filterConfigJson'] & {
    conditionGroups?: FilterConditionItem[]
  }).conditionGroups
  if (savedGroups && savedGroups.length > 0) {
    return savedGroups.map((item) => ({
      id: item.id || crypto.randomUUID(),
      groupNo: normalizeFilterGroupNo(),
      logicOp: normalizeLogicOp(),
      fieldCode: item.fieldCode,
      value: item.value || '',
      valueTo: item.valueTo,
      expectedOutboundTimeMode: item.fieldCode === 'expectedOutboundTime'
        ? (item.valueTo || /^\d{4}-\d{2}-\d{2}T/.test(item.value || '') ? 'custom' : 'preset')
        : undefined,
    }))
  }

  rules.filterConfigJson.orderBusinessTypes.forEach((value) => {
    conditions.push({ id: crypto.randomUUID(), groupNo: 1, logicOp: 'AND', fieldCode: 'orderBusinessType', value })
  })
  rules.filterConfigJson.platforms.forEach((value) => {
    conditions.push({ id: crypto.randomUUID(), groupNo: 1, logicOp: 'AND', fieldCode: 'platform', value })
  })
  rules.filterConfigJson.shippingMethods.forEach((value) => {
    conditions.push({ id: crypto.randomUUID(), groupNo: 1, logicOp: 'AND', fieldCode: 'shippingMethod', value })
  })
  rules.filterConfigJson.clientIds.forEach((value) => {
    conditions.push({ id: crypto.randomUUID(), groupNo: 1, logicOp: 'AND', fieldCode: 'clientId', value })
  })
  rules.filterConfigJson.zoneIds.forEach((value) => {
    conditions.push({ id: crypto.randomUUID(), groupNo: 1, logicOp: 'AND', fieldCode: 'zoneId', value })
  })
  if (rules.filterConfigJson.expectedOutboundTime?.from || rules.filterConfigJson.expectedOutboundTime?.to) {
    conditions.push({
      id: crypto.randomUUID(),
      groupNo: 1,
      logicOp: 'AND',
      fieldCode: 'expectedOutboundTime',
      value: toLocalInput(rules.filterConfigJson.expectedOutboundTime?.from),
      valueTo: toLocalInput(rules.filterConfigJson.expectedOutboundTime?.to),
      expectedOutboundTimeMode: 'custom',
    })
  }

  return conditions.length > 0 ? conditions : createDefaultFilterConditions()
}

function fromDetail(detail: StrategyDetail): FormState {
  const next = initialState()
  const rules = detail.currentVersion?.ruleSet
  const waveTypes = defaultWaveTypes().map((item) => {
    const found = rules?.waveTypeConfigJson?.find((candidate) => candidate.code === item.code)
    return found
      ? {
          ...item,
          enabled: found.enabled,
          minOrdersPerWave: String(found.minOrdersPerWave),
          maxOrdersPerWave: String(found.maxOrdersPerWave),
          pickMode: getFixedPickMode(item.code),
          downstreamMode: found.downstreamMode,
          hotSkuIdsText: found.identifyRule?.hotSkuIds?.join(', ') || '',
          fixedCombosText: stringifyFixedCombos(found.identifyRule?.fixedCombos),
        }
      : item
  })

  return {
    ...next,
    warehouseId: detail.warehouseId,
    strategyName: detail.strategyName,
    strategyCode: detail.strategyCode,
    description: detail.description || '',
    status: detail.status,
    priority: String(detail.priority),
    allowManual: rules?.triggerConfigJson.modes.includes('MANUAL') ?? true,
    allowScheduled: rules?.triggerConfigJson.modes.includes('SCHEDULED') ?? false,
    cronExpression: rules?.triggerConfigJson.cronExpression || next.cronExpression,
    scheduleTimes: sortScheduleTimes(rules?.triggerConfigJson.scheduleTimes || parseScheduleTimesFromCronExpression(rules?.triggerConfigJson.cronExpression)),
    groupJoinMode: normalizeGroupJoinMode(),
    filterConditions: buildFilterConditions(rules),
    enableOrderLimit: rules?.executionConfigJson.enableOrderLimit ?? false,
    maxOrdersPerRun: rules?.executionConfigJson.maxOrdersPerRun ? String(rules.executionConfigJson.maxOrdersPerRun) : next.maxOrdersPerRun,
    batchSortField: rules?.executionConfigJson.batchSortField ?? next.batchSortField,
    batchSortDirection: rules?.executionConfigJson.batchSortDirection ?? next.batchSortDirection,
    waveTypes,
    crossZoneSplitMode: rules?.pickConfigJson.crossZoneSplitMode ?? next.crossZoneSplitMode,
    enableMaxOrdersPerPick: rules?.pickConfigJson.enableMaxOrderLimit ?? false,
    maxOrdersPerPickOrder: rules?.pickConfigJson.maxOrdersPerPickOrder ? String(rules.pickConfigJson.maxOrdersPerPickOrder) : next.maxOrdersPerPickOrder,
    releaseMode: 'IMMEDIATE',
    autoAssignPicker: rules?.releaseConfigJson.autoAssignPicker ?? false,
  }
}

function downstreamLabel(mode: DownstreamMode, t: ReturnType<typeof useTranslations>) {
  return mode === 'PACK_DIRECT' ? t('waveTypes.downstreamModes.PACK_DIRECT') : t('waveTypes.downstreamModes.SORT_THEN_PACK')
}

function pickModeLabel(mode: PickMode, t: ReturnType<typeof useTranslations>) {
  switch (mode) {
    case 'BY_ORDER':
      return t('waveTypes.pickModes.BY_ORDER')
    case 'SKU_BATCH':
      return t('waveTypes.pickModes.SKU_BATCH')
    case 'MIXED_BATCH':
      return t('waveTypes.pickModes.MIXED_BATCH')
    case 'PICK_AND_SORT':
      return t('waveTypes.pickModes.PICK_AND_SORT')
    default:
      return mode
  }
}

export function StrategyConfigForm({ mode, strategyId }: StrategyConfigFormProps) {
  const t = useTranslations('waveStrategyConfigForm')
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [maxReachableStep, setMaxReachableStep] = useState(mode === 'edit' ? maxStep : 1)
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [form, setForm] = useState<FormState>(initialState())
  const [scheduledTimeDraft, setScheduledTimeDraft] = useState('08:00')
  const [versionText, setVersionText] = useState(t('versionText.create'))
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [priorityConflictSummary, setPriorityConflictSummary] = useState<StrategyDetail['priorityConflictSummary'] | null>(null)

  useEffect(() => {
    if (mode !== 'edit' || !strategyId) return
    let mounted = true
    setLoading(true)
    void fetch(`/api/v1/wave-strategies/${strategyId}`)
      .then((response) => response.json())
      .then((result) => {
        if (!mounted) return
        if (!result.success) {
          throw new Error(result.message || t('validation.loadFailed'))
        }
        const detail = result.data as StrategyDetail
        setForm(fromDetail(detail))
        setMaxReachableStep(maxStep)
        setPriorityConflictSummary(detail.priorityConflictSummary || null)
        if (detail.currentVersion) {
          setVersionText(t('versionText.current', {
            version: detail.currentVersion.versionNo,
            status: detail.currentVersion.versionStatus,
          }))
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : t('validation.loadFailed'))
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [mode, strategyId, t])

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const addScheduleTime = () => {
    const normalized = normalizeScheduleTime(scheduledTimeDraft)
    if (!normalized) return
    setForm((current) => ({
      ...current,
      cronExpression: '',
      scheduleTimes: sortScheduleTimes([...current.scheduleTimes, normalized]),
    }))
  }

  const removeScheduleTime = (value: string) => {
    setForm((current) => ({
      ...current,
      cronExpression: '',
      scheduleTimes: current.scheduleTimes.filter((item) => item !== value),
    }))
  }

  const updateWaveType = <K extends keyof WaveTypeItem>(code: WaveTypeCode, key: K, value: WaveTypeItem[K]) => {
    setForm((current) => ({
      ...current,
      waveTypes: current.waveTypes.map((item) => item.code === code ? { ...item, [key]: value } : item),
    }))
  }

  const addFilterCondition = () => {
    setForm((current) => {
      const usedFieldCodes = new Set(current.filterConditions.map((item) => item.fieldCode))
      const nextFieldCode = filterFieldCodes.find((fieldCode) => !usedFieldCodes.has(fieldCode))

      if (!nextFieldCode) {
        toast.error(t('validation.filterConditionDuplicate'))
        return current
      }

      return {
        ...current,
        filterConditions: [
          ...current.filterConditions,
          { id: crypto.randomUUID(), groupNo: normalizeFilterGroupNo(), logicOp: 'AND', fieldCode: nextFieldCode, value: '' },
        ],
      }
    })
  }

  const updateFilterCondition = <K extends keyof FilterConditionItem>(id: string, key: K, value: FilterConditionItem[K]) => {
    setForm((current) => ({
      ...current,
      filterConditions: current.filterConditions.map((item) => item.id === id ? { ...item, [key]: value } : item),
    }))
  }

  const removeFilterCondition = (id: string) => {
    setForm((current) => ({
      ...current,
      filterConditions: current.filterConditions.filter((item) => item.id !== id),
    }))
  }

  const applyDefaultFilterTemplate = () => {
    setForm((current) => ({
      ...current,
      filterConditions: [
        { id: crypto.randomUUID(), groupNo: 1, logicOp: 'AND', fieldCode: 'orderBusinessType', value: 'STANDARD' },
        { id: crypto.randomUUID(), groupNo: 1, logicOp: 'AND', fieldCode: 'platform', value: 'SHOPIFY' },
      ],
    }))
  }

  const summary = useMemo(() => {
    const enabled = form.waveTypes.filter((item) => item.enabled)
    const maxOrdersPerPick = form.enableMaxOrdersPerPick ? Number(form.maxOrdersPerPickOrder) || 0 : 0
    const estimatedPickOrders = maxOrdersPerPick > 0
      ? enabled.reduce((sum, item) => sum + Math.ceil(getWaveMaxOrders(item) / maxOrdersPerPick), 0)
      : enabled.length
    const risks = [
      form.crossZoneSplitMode === 'NO_SPLIT' ? t('summary.risks.noSplit') : null,
      !form.enableMaxOrdersPerPick ? t('summary.risks.noMaxOrdersPerPick') : null,
      form.enableMaxOrdersPerPick && maxOrdersPerPick > 0 && enabled.some((item) => getWaveMaxOrders(item) > maxOrdersPerPick)
        ? t('summary.risks.pickSplitNeeded')
        : null,
    ].filter(Boolean) as string[]
    return {
      enabledCount: enabled.length,
      sortingCount: enabled.filter((item) => item.downstreamMode === 'SORT_THEN_PACK').length,
      releaseMode: t('summary.releaseModeImmediate'),
      triggerModes: [form.allowManual ? t('trigger.manual') : null, form.allowScheduled ? t('trigger.scheduled') : null].filter(Boolean).join(' / ') || '-',
      groupJoinModeLabel: t('filter.groupJoinModeAnd'),
      minOrdersPerWave: enabled.length > 0 ? Math.min(...enabled.map((item) => getWaveMinOrders(item)).filter((v) => v > 0)) : 0,
      estimatedPickOrders,
      risks,
    }
  }, [form, t])

  const availableFilterFieldsById = useMemo(() => {
    const selectedById = new Map(form.filterConditions.map((item) => [item.id, item.fieldCode]))

    return new Map(
      form.filterConditions.map((condition) => {
        const availableFields = filterFieldCodes.filter((fieldCode) => {
          if (fieldCode === condition.fieldCode) return true
          for (const [id, selectedFieldCode] of selectedById.entries()) {
            if (id !== condition.id && selectedFieldCode === fieldCode) {
              return false
            }
          }
          return true
        })

        return [condition.id, availableFields]
      })
    )
  }, [form.filterConditions])

  const canAddFilterCondition = form.filterConditions.length < filterFieldCodes.length

  const validateStep = useCallback((targetStep: number) => {
    if (!form.warehouseId || !form.strategyName.trim() || !form.strategyCode.trim()) {
      return targetStep === 1 ? t('validation.basicInfoRequired') : null
    }
    if (!form.allowManual && !form.allowScheduled) {
      return targetStep === 2 ? t('validation.triggerRequired') : null
    }
    if (form.allowScheduled && form.scheduleTimes.length === 0 && !form.cronExpression.trim()) {
      return targetStep === 2 ? t('validation.cronRequired') : null
    }
    if (form.enableOrderLimit && (!form.maxOrdersPerRun || Number(form.maxOrdersPerRun) <= 0)) {
      return targetStep === 4 ? t('validation.maxOrdersRequired') : null
    }
    if (form.enableMaxOrdersPerPick && (!form.maxOrdersPerPickOrder || Number(form.maxOrdersPerPickOrder) <= 0)) {
      return targetStep === 6 ? t('validation.maxOrdersPerPickRequired') : null
    }
    if (targetStep === 5) {
      for (const item of form.waveTypes) {
        if (!item.enabled) continue
        const minOrdersPerWave = getWaveMinOrders(item)
        const maxOrdersPerWave = getWaveMaxOrders(item)
        if (minOrdersPerWave <= 0 || maxOrdersPerWave <= 0) {
          return t('validation.waveOrdersRangeRequired')
        }
        if (minOrdersPerWave > maxOrdersPerWave) {
          return t('validation.waveOrdersRangeInvalid', { name: waveTypeLabel(item.code, t) })
        }
        if (sortingWallLimitedWaveTypes.includes(item.code) && maxOrdersPerWave > Number(form.sortingWallCells)) {
          return t('validation.sortingWallLimit', { name: waveTypeLabel(item.code, t) })
        }
      }
    }
    if (new Set(form.filterConditions.map((item) => item.fieldCode)).size !== form.filterConditions.length) {
      return targetStep === 3 ? t('validation.filterConditionDuplicate') : null
    }
    return null
  }, [form, t])

  const validate = useCallback(() => {
    for (let targetStep = 1; targetStep <= maxStep; targetStep += 1) {
      const validation = validateStep(targetStep)
      if (validation) return validation
    }
    return null
  }, [validateStep])

  const goToNextStep = () => {
    for (let targetStep = 1; targetStep <= step; targetStep += 1) {
      const validation = validateStep(targetStep)
      if (validation) {
        toast.error(validation)
        return
      }
    }
    const nextStep = Math.min(maxStep, step + 1)
    setMaxReachableStep((current) => Math.max(current, nextStep))
    setStep(nextStep)
  }

  const publishChecks = useMemo(() => {
    const checks: Array<{ label: string; passed: boolean; level: 'pass' | 'warn' }> = []
    checks.push({ label: t('publishDialog.checks.basicInfo'), passed: !!form.warehouseId && !!form.strategyName.trim() && !!form.strategyCode.trim(), level: 'pass' })
    checks.push({ label: t('publishDialog.checks.triggerRequired'), passed: form.allowManual || form.allowScheduled, level: 'pass' })
    checks.push({ label: t('publishDialog.checks.cronConfigured'), passed: !form.allowScheduled || form.scheduleTimes.length > 0 || !!form.cronExpression.trim(), level: 'pass' })
    checks.push({ label: t('publishDialog.checks.waveTypeEnabled'), passed: form.waveTypes.some((item) => item.enabled), level: 'pass' })
    checks.push({
      label: t('publishDialog.checks.sortingWallLimit'),
      passed: form.waveTypes
        .filter((item) => item.enabled && sortingWallLimitedWaveTypes.includes(item.code))
        .every((item) => getWaveMaxOrders(item) <= Number(form.sortingWallCells)),
      level: 'pass',
    })
    checks.push({ label: t('publishDialog.checks.manualRelease'), passed: true, level: 'pass' })
    checks.push({ label: t('publishDialog.checks.packDirectExists'), passed: form.waveTypes.some((item) => item.enabled && item.downstreamMode === 'PACK_DIRECT'), level: 'warn' })
    checks.push({ label: t('publishDialog.checks.overrideLowerPriority'), passed: (priorityConflictSummary?.lowerPriorityCount || 0) === 0, level: 'warn' })
    checks.push({ label: t('publishDialog.checks.samePriorityExists'), passed: (priorityConflictSummary?.samePriorityCount || 0) === 0, level: 'warn' })
    return checks
  }, [form, priorityConflictSummary, t])

  const buildPayload = () => ({
    warehouseId: form.warehouseId,
    strategyCode: form.strategyCode.trim(),
    strategyName: form.strategyName.trim(),
    description: form.description.trim() || null,
    priority: Number(form.priority),
    status: form.status,
    rules: {
      triggerConfig: {
        modes: [...(form.allowManual ? ['MANUAL'] : []), ...(form.allowScheduled ? ['SCHEDULED'] : [])],
        cronExpression: form.allowScheduled ? form.cronExpression.trim() || null : null,
        scheduleTimes: form.allowScheduled ? sortScheduleTimes(form.scheduleTimes) : [],
      },
      filterConfig: {
        orderBusinessTypes: form.filterConditions.filter((item) => item.fieldCode === 'orderBusinessType').flatMap((item) => splitCsv(item.value)),
        clientIds: form.filterConditions.filter((item) => item.fieldCode === 'clientId').flatMap((item) => splitCsv(item.value)),
        platforms: form.filterConditions.filter((item) => item.fieldCode === 'platform').flatMap((item) => splitCsv(item.value)),
        shippingMethods: form.filterConditions.filter((item) => item.fieldCode === 'shippingMethod').flatMap((item) => splitCsv(item.value)),
        zoneIds: form.filterConditions.filter((item) => item.fieldCode === 'zoneId').flatMap((item) => splitCsv(item.value)),
        groupJoinMode: normalizeGroupJoinMode(),
        expectedOutboundTime: (() => {
          const row = form.filterConditions.find((item) => item.fieldCode === 'expectedOutboundTime' && item.expectedOutboundTimeMode === 'custom' && (item.value || item.valueTo))
          if (!row) return null
          return {
            from: row.value ? new Date(row.value).toISOString() : null,
            to: row.valueTo ? new Date(row.valueTo).toISOString() : null,
          }
        })(),
        conditionGroups: form.filterConditions.map((item) => ({
          id: item.id,
          groupNo: normalizeFilterGroupNo(),
          logicOp: normalizeLogicOp(),
          fieldCode: item.fieldCode,
          value: item.value,
          valueTo: item.valueTo,
        })),
      },
      executionConfig: {
        enableOrderLimit: form.enableOrderLimit,
        maxOrdersPerRun: form.enableOrderLimit ? Number(form.maxOrdersPerRun) || null : null,
        batchSortField: form.batchSortField,
        batchSortDirection: form.batchSortDirection,
      },
      waveTypeConfig: form.waveTypes.map((item) => ({
        code: item.code,
        enabled: item.enabled,
        minOrdersPerWave: getWaveMinOrders(item),
        maxOrdersPerWave: getWaveMaxOrders(item),
        pickMode: getFixedPickMode(item.code),
        downstreamMode: item.downstreamMode,
        identifyRule: {
          hotSkuIds: splitCsv(item.hotSkuIdsText),
          fixedCombos: parseFixedCombos(item.fixedCombosText),
        },
      })),
      pickConfig: {
        crossZoneSplitMode: form.crossZoneSplitMode,
        enableMaxOrderLimit: form.enableMaxOrdersPerPick,
        maxOrdersPerPickOrder: form.enableMaxOrdersPerPick ? Number(form.maxOrdersPerPickOrder) || null : null,
        pathOptimizeMode: 'LOCATION_ASC',
      },
      releaseConfig: {
        releaseMode: 'IMMEDIATE',
        autoAssignPicker: form.autoAssignPicker,
      },
    },
  })

  const saveDraft = async () => {
    const validation = validate()
    if (validation) {
      toast.error(validation)
      return
    }

    setSaving(true)
    try {
      const response = await fetch(mode === 'create' ? '/api/v1/wave-strategies' : `/api/v1/wave-strategies/${strategyId}`, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || t('validation.saveFailed'))
      }
      toast.success(t('validation.saveSuccess'))
      setPriorityConflictSummary(result.data.priorityConflictSummary || null)
      if (mode === 'create') {
        router.replace(`/wave-strategies/${result.data.id}/edit`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('validation.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const performPublish = async () => {
    const validation = validate()
    if (validation) {
      toast.error(validation)
      return
    }

    let targetId = strategyId
    if (!targetId) {
      setSaving(true)
      try {
        const response = await fetch('/api/v1/wave-strategies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        })
        const result = await response.json()
        if (!result.success) {
          throw new Error(result.message || t('validation.saveFailed'))
        }
        targetId = result.data.id
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('validation.saveFailed'))
        setSaving(false)
        return
      } finally {
        setSaving(false)
      }
    } else {
      await saveDraft()
    }

    if (!targetId) return
    setPublishing(true)
    try {
      const response = await fetch(`/api/v1/wave-strategies/${targetId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeSummary: t('validation.publishSummary') }),
      })
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || t('validation.publishFailed'))
      }
      toast.success(t('validation.publishSuccess'))
      router.push('/wave-strategies')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('validation.publishFailed'))
    } finally {
      setPublishing(false)
    }
  }

  const publish = async () => {
    const validation = validate()
    if (validation) {
      toast.error(validation)
      return
    }
    setPublishDialogOpen(true)
  }

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)_320px]">
      <Card className="h-fit sticky top-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t('stepsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stepKeys.map((stepKey, index) => {
            const targetStep = index + 1
            const disabled = mode === 'create' && targetStep > maxReachableStep
            return (
              <button
                key={stepKey}
                type="button"
                onClick={() => {
                  if (disabled) return
                  setStep(targetStep)
                }}
                disabled={disabled}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                  step === targetStep
                    ? 'border-primary bg-primary/5 text-primary'
                    : disabled
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-muted'
                }`}
              >
                <span>{targetStep}. {t(`steps.${stepKey}`)}</span>
                {step === targetStep ? <Badge variant="outline">{t('current')}</Badge> : null}
              </button>
            )
          })}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'create' ? t('titles.create') : t('titles.edit')}</CardTitle>
            <CardDescription>{versionText}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <StepSection
              step={step}
              form={form}
              canAddFilterCondition={canAddFilterCondition}
              availableFilterFieldsById={availableFilterFieldsById}
              scheduledTimeDraft={scheduledTimeDraft}
              setScheduledTimeDraft={setScheduledTimeDraft}
              updateForm={updateForm}
              addScheduleTime={addScheduleTime}
              removeScheduleTime={removeScheduleTime}
              updateWaveType={updateWaveType}
              addFilterCondition={addFilterCondition}
              updateFilterCondition={updateFilterCondition}
              removeFilterCondition={removeFilterCondition}
              applyDefaultFilterTemplate={applyDefaultFilterTemplate}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push('/wave-strategies')}>{t('actions.backToList')}</Button>
          <Button variant="outline" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>{t('actions.prev')}</Button>
          <Button variant="outline" onClick={goToNextStep} disabled={step === maxStep}>{t('actions.next')}</Button>
          <Button variant="outline" onClick={saveDraft} disabled={saving || publishing}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('actions.saveDraft')}
          </Button>
          <Button onClick={publish} disabled={saving || publishing}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('actions.publish')}
          </Button>
        </div>
      </div>

      <Card className="h-fit sticky top-4">
        <CardHeader>
          <CardTitle className="text-base">{t('summary.title')}</CardTitle>
          <CardDescription>{t('summary.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <SummaryRow label={t('summary.enabledWaveTypes')} value={String(summary.enabledCount)} />
          <SummaryRow label={t('summary.sortingTypes')} value={String(summary.sortingCount)} />
          <SummaryRow label={t('summary.minOrdersPerWave')} value={summary.minOrdersPerWave ? String(summary.minOrdersPerWave) : '-'} />
          <SummaryRow label={t('summary.estimatedPickOrders')} value={String(summary.estimatedPickOrders)} />
          <SummaryRow label={t('summary.triggerModes')} value={summary.triggerModes} />
          <SummaryRow label={t('summary.releaseMode')} value={summary.releaseMode} />
          {summary.risks.length > 0 ? (
            <div className="pt-2 border-t">
              <div className="text-xs font-medium mb-2">{t('summary.riskTitle')}</div>
              <div className="space-y-2">
                {summary.risks.map((risk) => (
                  <div key={risk} className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {risk}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('publishDialog.title')}</DialogTitle>
            <DialogDescription>{t('publishDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {publishChecks.map((check) => (
              <div key={check.label} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>{check.label}</span>
                <Badge className={
                  check.level === 'warn'
                    ? 'bg-amber-100 text-amber-700'
                    : check.passed
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                }>
                  {check.level === 'warn'
                    ? (check.passed ? t('publishDialog.status.pass') : t('publishDialog.status.hint'))
                    : (check.passed ? t('publishDialog.status.pass') : t('publishDialog.status.fail'))}
                </Badge>
              </div>
            ))}
            {priorityConflictSummary?.lowerPriorityStrategies?.length ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
                <div className="font-medium">{t('publishDialog.lowerPriorityTitle')}</div>
                <div className="mt-2 space-y-1">
                  {priorityConflictSummary.lowerPriorityStrategies.map((item) => (
                    <Link key={item.id} href={`/wave-strategies/${item.id}/edit`} className="block rounded-md border border-amber-200 bg-white px-3 py-2 hover:bg-amber-100">
                      {item.strategyCode} / {item.strategyName} / {t('publishDialog.priorityLabel', { value: item.priority })}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            {priorityConflictSummary?.samePriorityStrategies?.length ? (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
                <div className="font-medium">{t('publishDialog.samePriorityTitle')}</div>
                <div className="mt-2 space-y-1">
                  {priorityConflictSummary.samePriorityStrategies.map((item) => (
                    <Link key={item.id} href={`/wave-strategies/${item.id}/edit`} className="block rounded-md border bg-white px-3 py-2 hover:bg-muted">
                      {item.strategyCode} / {item.strategyName} / {t('publishDialog.priorityLabel', { value: item.priority })}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>{t('publishDialog.cancel')}</Button>
            <Button
              onClick={async () => {
                setPublishDialogOpen(false)
                await performPublish()
              }}
              disabled={publishing}
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('publishDialog.continuePublish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function WaveTypeHelpIcon({ code, t }: { code: WaveTypeCode; t: ReturnType<typeof useTranslations> }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={`${waveTypeLabel(code, t)} ${t('waveTypes.help')}`}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 bg-background text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="center"
        className="w-80 max-w-[calc(100vw-2rem)] whitespace-normal break-words px-3 py-2 text-xs leading-5"
      >
        {t(`waveTypes.autoIdentifyRules.${code}`)}
      </TooltipContent>
    </Tooltip>
  )
}

function StepSection({
  step,
  form,
  canAddFilterCondition,
  availableFilterFieldsById,
  scheduledTimeDraft,
  setScheduledTimeDraft,
  updateForm,
  addScheduleTime,
  removeScheduleTime,
  updateWaveType,
  addFilterCondition,
  updateFilterCondition,
  removeFilterCondition,
  applyDefaultFilterTemplate,
}: {
  step: number
  form: FormState
  canAddFilterCondition: boolean
  availableFilterFieldsById: Map<string, FilterFieldCode[]>
  scheduledTimeDraft: string
  setScheduledTimeDraft: (value: string) => void
  updateForm: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  addScheduleTime: () => void
  removeScheduleTime: (value: string) => void
  updateWaveType: <K extends keyof WaveTypeItem>(code: WaveTypeCode, key: K, value: WaveTypeItem[K]) => void
  addFilterCondition: () => void
  updateFilterCondition: <K extends keyof FilterConditionItem>(id: string, key: K, value: FilterConditionItem[K]) => void
  removeFilterCondition: (id: string) => void
  applyDefaultFilterTemplate: () => void
}) {
  const t = useTranslations('waveStrategyConfigForm')
  const tOutboundOrder = useTranslations('outbound.order')
  const { options: dynamicFilterOptions, loading: dynamicFilterOptionsLoading } = useCachedOptions<WaveStrategyFilterOptionSet>({
    cacheKey: form.warehouseId ? `wave-strategy:filter-options:${form.warehouseId}:last7days` : 'wave-strategy:filter-options:empty',
    fetcher: async () => {
      if (!form.warehouseId) {
        return [{ platforms: [], shippingMethods: [] }]
      }

      const response = await fetch(`/api/v1/wave-strategies/filter-options?warehouseId=${form.warehouseId}`)
      const result = await response.json()
      return result.success ? [result.data as WaveStrategyFilterOptionSet] : [{ platforms: [], shippingMethods: [] }]
    },
  })
  const filterOptionSet = dynamicFilterOptions[0] || { platforms: [], shippingMethods: [] }
  const { options: clientOptions, loading: clientOptionsLoading } = useCachedOptions<ClientOption>({
    cacheKey: 'wave-strategy:clients:active',
    fetcher: async () => {
      const response = await fetch('/api/v1/clients?pageSize=100&isActive=true')
      const result = await response.json()
      return result.success ? (result.data || []) : []
    },
  })
  const { options: zoneOptions, loading: zoneOptionsLoading } = useCachedOptions<ZoneOption>({
    cacheKey: form.warehouseId ? `wave-strategy:zones:active:${form.warehouseId}` : 'wave-strategy:zones:empty',
    fetcher: async () => {
      if (!form.warehouseId) return []
      const params = new URLSearchParams({
        warehouseId: form.warehouseId,
        pageSize: '100',
        status: 'ACTIVE',
      })
      const response = await fetch(`/api/v1/zones?${params.toString()}`)
      const result = await response.json()
      return result.success
        ? (result.data || []).filter((item: ZoneOption) => item.zoneType === 'STORAGE' || item.zoneType === 'PICKING')
        : []
    },
  })

  if (step === 1) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t('basicInfo.warehouse')} required><WarehouseSelect value={form.warehouseId} onValueChange={(value) => updateForm('warehouseId', value)} /></Field>
        <Field label={t('basicInfo.priority')} required>
          <div className="space-y-2">
            <Input type="number" min="1" value={form.priority} onChange={(e) => updateForm('priority', e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {t('basicInfo.priorityHint')}
            </p>
          </div>
        </Field>
        <Field label={t('basicInfo.strategyName')} required><Input value={form.strategyName} onChange={(e) => updateForm('strategyName', e.target.value)} /></Field>
        <Field label={t('basicInfo.strategyCode')} required><Input value={form.strategyCode} onChange={(e) => updateForm('strategyCode', e.target.value)} /></Field>
        <Field label={t('basicInfo.status')} required>
          <Select value={form.status} onValueChange={(value) => updateForm('status', value as FormState['status'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">{t('basicInfo.statusOptions.DRAFT')}</SelectItem>
              <SelectItem value="ENABLED">{t('basicInfo.statusOptions.ENABLED')}</SelectItem>
              <SelectItem value="DISABLED">{t('basicInfo.statusOptions.DISABLED')}</SelectItem>
              <SelectItem value="ARCHIVED">{t('basicInfo.statusOptions.ARCHIVED')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={t('basicInfo.description')} className="md:col-span-2"><Textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} /></Field>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <RequiredLabel>{t('trigger.triggerModes')}</RequiredLabel>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.allowManual} onCheckedChange={(v) => updateForm('allowManual', !!v)} />{t('trigger.manual')}</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.allowScheduled} onCheckedChange={(v) => updateForm('allowScheduled', !!v)} />{t('trigger.scheduled')}</label>
          </div>
        </div>
        <Field label={t('trigger.cronExpression')} required={form.allowScheduled}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-[180px]">
                <Input
                  type="time"
                  step={60}
                  value={scheduledTimeDraft}
                  onChange={(e) => setScheduledTimeDraft(e.target.value)}
                />
              </div>
              <Button type="button" variant="outline" onClick={addScheduleTime}>
                {t('trigger.addScheduleTime')}
              </Button>
            </div>
            {form.scheduleTimes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {form.scheduleTimes.map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                    <span>{item}</span>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => removeScheduleTime(item)}
                    >
                      {t('trigger.removeScheduleTime')}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {form.allowScheduled && form.scheduleTimes.length === 0 && form.cronExpression.trim() ? (
              <div className="rounded-md border border-dashed px-3 py-2 text-xs leading-5 text-muted-foreground">
                {t('trigger.legacyCronHint', { value: form.cronExpression })}
              </div>
            ) : null}
            <div className="rounded-md bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
              {t('trigger.cronExpressionHelp')}
            </div>
          </div>
        </Field>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          {t('filter.defaultHint')}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={applyDefaultFilterTemplate}>{t('filter.defaultTemplate')}</Button>
          <Button variant="outline" size="sm" onClick={addFilterCondition} disabled={!canAddFilterCondition}>{t('filter.addCondition')}</Button>
        </div>
        <div className="rounded-lg border">
          <div className="grid grid-cols-[110px_140px_1fr_1fr_72px] gap-3 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
            <div>{t('filter.columns.logic')}</div>
            <div>{t('filter.columns.field')}</div>
            <div>{t('filter.columns.value')}</div>
            <div>{t('filter.columns.extraValue')}</div>
            <div>{t('filter.columns.actions')}</div>
          </div>
          {form.filterConditions.map((condition) => (
            <div key={condition.id} className="grid grid-cols-[110px_140px_1fr_1fr_72px] gap-3 border-t px-4 py-3 first:border-t-0">
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground">AND</span>
              </div>
              <Select value={condition.fieldCode} onValueChange={(value) => {
                const nextFieldCode = value as FilterFieldCode
                if (!availableFilterFieldsById.get(condition.id)?.includes(nextFieldCode)) {
                  toast.error(t('validation.filterConditionDuplicate'))
                  return
                }
                updateFilterCondition(condition.id, 'fieldCode', nextFieldCode)
                updateFilterCondition(condition.id, 'value', '')
                updateFilterCondition(condition.id, 'valueTo', '')
                if (nextFieldCode === 'expectedOutboundTime') {
                  updateFilterCondition(condition.id, 'expectedOutboundTimeMode', 'preset')
                } else {
                  updateFilterCondition(condition.id, 'expectedOutboundTimeMode', undefined)
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filterFieldCodes.map((fieldCode) => (
                    <SelectItem
                      key={fieldCode}
                      value={fieldCode}
                      disabled={!availableFilterFieldsById.get(condition.id)?.includes(fieldCode)}
                    >
                      {t(`filter.fieldOptions.${fieldCode}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {condition.fieldCode === 'orderBusinessType' ? (
                <SearchableSelect
                  mode="single"
                  options={orderBusinessTypes.map((item) => ({ value: item, label: tOutboundOrder(`types.${item}`) }))}
                  value={condition.value}
                  onChange={(value) => updateFilterCondition(condition.id, 'value', Array.isArray(value) ? value[0] || '' : value)}
                  getOptionValue={(option) => option.value}
                  getOptionLabel={(option) => option.label}
                  placeholder={t('filter.valuePlaceholder')}
                  searchPlaceholder={t('filter.searchPlaceholder')}
                  emptyText={t('filter.noOptions')}
                  selectedTextFormatter={(count) => t('filter.selectedCount', { count })}
                  className="h-10 w-full justify-between"
                  contentClassName="w-[280px]"
                />
              ) : condition.fieldCode === 'platform' ? (
                <SearchableSelect
                  mode="multiple"
                  options={filterOptionSet.platforms.map((item) => ({ value: item, label: item }))}
                  value={splitCsv(condition.value)}
                  onChange={(value) => updateFilterCondition(condition.id, 'value', Array.isArray(value) ? value.join(',') : value)}
                  getOptionValue={(option) => option.value}
                  getOptionLabel={(option) => option.label}
                  placeholder={t('filter.valuePlaceholder')}
                  searchPlaceholder={t('filter.searchPlaceholder')}
                  emptyText={t('filter.noOptions')}
                  loading={dynamicFilterOptionsLoading}
                  selectedTextFormatter={(count) => t('filter.selectedCount', { count })}
                  className="h-10 w-full justify-between"
                  contentClassName="w-[280px]"
                  disabled={!form.warehouseId}
                />
              ) : condition.fieldCode === 'shippingMethod' ? (
                <SearchableSelect
                  mode="multiple"
                  options={filterOptionSet.shippingMethods.map((item) => ({ value: item, label: item }))}
                  value={splitCsv(condition.value)}
                  onChange={(value) => updateFilterCondition(condition.id, 'value', Array.isArray(value) ? value.join(',') : value)}
                  getOptionValue={(option) => option.value}
                  getOptionLabel={(option) => option.label}
                  placeholder={t('filter.valuePlaceholder')}
                  searchPlaceholder={t('filter.searchPlaceholder')}
                  emptyText={t('filter.noOptions')}
                  loading={dynamicFilterOptionsLoading}
                  selectedTextFormatter={(count) => t('filter.selectedCount', { count })}
                  className="h-10 w-full justify-between"
                  contentClassName="w-[280px]"
                  disabled={!form.warehouseId}
                />
              ) : condition.fieldCode === 'clientId' ? (
                <SearchableSelect
                  mode="multiple"
                  options={clientOptions.map((item) => ({ value: item.id, label: `${item.clientCode} - ${item.clientName}` }))}
                  value={splitCsv(condition.value)}
                  onChange={(value) => updateFilterCondition(condition.id, 'value', Array.isArray(value) ? value.join(',') : value)}
                  getOptionValue={(option) => option.value}
                  getOptionLabel={(option) => option.label}
                  placeholder={t('filter.valuePlaceholder')}
                  searchPlaceholder={t('filter.searchPlaceholder')}
                  emptyText={t('filter.noOptions')}
                  loading={clientOptionsLoading}
                  selectedTextFormatter={(count) => t('filter.selectedCount', { count })}
                  className="h-10 w-full justify-between"
                  contentClassName="w-[320px]"
                />
              ) : condition.fieldCode === 'zoneId' ? (
                <SearchableSelect
                  mode="multiple"
                  options={zoneOptions.map((item) => ({ value: item.id, label: `${item.zoneCode}${item.zoneName ? ` - ${item.zoneName}` : ''}` }))}
                  value={splitCsv(condition.value)}
                  onChange={(value) => updateFilterCondition(condition.id, 'value', Array.isArray(value) ? value.join(',') : value)}
                  getOptionValue={(option) => option.value}
                  getOptionLabel={(option) => option.label}
                  placeholder={t('filter.valuePlaceholder')}
                  searchPlaceholder={t('filter.searchPlaceholder')}
                  emptyText={t('filter.noOptions')}
                  loading={zoneOptionsLoading}
                  selectedTextFormatter={(count) => t('filter.selectedCount', { count })}
                  className="h-10 w-full justify-between"
                  contentClassName="w-[320px]"
                  disabled={!form.warehouseId}
                />
              ) : condition.fieldCode === 'expectedOutboundTime' ? (
                <div className="space-y-2">
                  <Select
                    value={condition.expectedOutboundTimeMode || 'preset'}
                    onValueChange={(value) => {
                      updateFilterCondition(condition.id, 'expectedOutboundTimeMode', value as 'preset' | 'custom')
                      updateFilterCondition(condition.id, 'value', '')
                      updateFilterCondition(condition.id, 'valueTo', '')
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preset">{t('filter.expectedOutboundTimeModePreset')}</SelectItem>
                      <SelectItem value="custom">{t('filter.expectedOutboundTimeModeCustom')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {condition.expectedOutboundTimeMode === 'custom' ? (
                    <Input type="datetime-local" value={condition.value} onChange={(e) => updateFilterCondition(condition.id, 'value', e.target.value)} />
                  ) : null}
                </div>
              ) : (
                <Input value={condition.value} onChange={(e) => updateFilterCondition(condition.id, 'value', e.target.value)} placeholder={t('filter.valuePlaceholder')} />
              )}

              {condition.fieldCode === 'expectedOutboundTime' ? (
                condition.expectedOutboundTimeMode === 'custom' ? (
                  <Input type="datetime-local" value={condition.valueTo || ''} onChange={(e) => updateFilterCondition(condition.id, 'valueTo', e.target.value)} />
                ) : (
                  <SearchableSelect
                    mode="multiple"
                    options={expectedOutboundTimePresetOptions.map((item) => ({ value: item, label: item }))}
                    value={splitCsv(condition.value)}
                    onChange={(value) => updateFilterCondition(condition.id, 'value', Array.isArray(value) ? value.join(',') : value)}
                    getOptionValue={(option) => option.value}
                    getOptionLabel={(option) => option.label}
                    placeholder={t('filter.valuePlaceholder')}
                    searchPlaceholder={t('filter.searchPlaceholder')}
                    emptyText={t('filter.noOptions')}
                    selectedTextFormatter={(count) => t('filter.selectedCount', { count })}
                    className="h-10 w-full justify-between"
                    contentClassName="w-[220px]"
                  />
                )
              ) : (
                <div className="flex items-center text-xs text-muted-foreground">{t('filter.singleValue')}</div>
              )}
              <div>
                <Button variant="outline" size="sm" onClick={() => removeFilterCondition(condition.id)}>{t('filter.delete')}</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (step === 4) {
    return (
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.enableOrderLimit} onCheckedChange={(v) => updateForm('enableOrderLimit', !!v)} />{t('execution.enableOrderLimit')}</label>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={t('execution.maxOrdersPerRun')} required={form.enableOrderLimit}><Input type="number" min="1" value={form.maxOrdersPerRun} onChange={(e) => updateForm('maxOrdersPerRun', e.target.value)} disabled={!form.enableOrderLimit} /></Field>
          <Field label={t('execution.batchSortField')} required>
            <Select value={form.batchSortField} onValueChange={(value) => updateForm('batchSortField', value as FormState['batchSortField'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expectedOutboundTime">{t('execution.sortFieldOptions.expectedOutboundTime')}</SelectItem>
                <SelectItem value="createdAt">{t('execution.sortFieldOptions.createdAt')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('execution.batchSortDirection')} required>
            <Select value={form.batchSortDirection} onValueChange={(value) => updateForm('batchSortDirection', value as FormState['batchSortDirection'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">{t('execution.sortDirectionOptions.asc')}</SelectItem>
                <SelectItem value="desc">{t('execution.sortDirectionOptions.desc')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
    )
  }

  if (step === 5) {
    return (
      <div className="space-y-4">
        <TooltipProvider delayDuration={120}>
          <Tabs defaultValue={form.waveTypes[0]?.code}>
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-lg border bg-muted/60 p-2 shadow-inner lg:grid-cols-3">
              {form.waveTypes.map((item) => (
                <TabsTrigger
                  key={item.code}
                  value={item.code}
                  className="min-h-12 justify-between gap-2 rounded-md border border-transparent bg-background/80 px-3 py-2 text-left text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-background hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-md"
                >
                  <span className="min-w-0 truncate">{waveTypeLabel(item.code, t)}</span>
                  <WaveTypeHelpIcon code={item.code} t={t} />
                </TabsTrigger>
              ))}
            </TabsList>
            {form.waveTypes.map((item) => (
              <TabsContent key={item.code} value={item.code}>
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        {waveTypeLabel(item.code, t)}
                        <WaveTypeHelpIcon code={item.code} t={t} />
                      </div>
                      <div className="text-xs text-muted-foreground">{item.code}</div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={item.enabled} onCheckedChange={(v) => updateWaveType(item.code, 'enabled', !!v)} />
                      {t('waveTypes.enabled')}
                    </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label={t('waveTypes.ordersPerWave')} required={item.enabled}>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <Input type="number" min="1" placeholder={t('waveTypes.minPlaceholder')} value={item.minOrdersPerWave} onChange={(e) => updateWaveType(item.code, 'minOrdersPerWave', e.target.value)} />
                        <span className="text-sm text-muted-foreground">~</span>
                        <Input type="number" min="1" placeholder={t('waveTypes.maxPlaceholder')} value={item.maxOrdersPerWave} onChange={(e) => updateWaveType(item.code, 'maxOrdersPerWave', e.target.value)} />
                      </div>
                      {sortingWallLimitedWaveTypes.includes(item.code) ? (
                        <div className={`text-xs ${getWaveMaxOrders(item) > Number(form.sortingWallCells) ? 'text-amber-700' : 'text-muted-foreground'}`}>
                          {t('waveTypes.ordersPerWaveLimitHint')}
                        </div>
                      ) : null}
                    </div>
                  </Field>
                  <Field label={t('waveTypes.pickMode')} required={item.enabled}>
                    <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm">
                      {pickModeLabel(getFixedPickMode(item.code), t)}
                    </div>
                  </Field>
                </div>
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{t('waveTypes.currentEffect')}</div>
                  <div className="mt-1 text-muted-foreground">
                    {item.enabled
                      ? t('waveTypes.effectSummary', {
                          ordersPerWave: `${item.minOrdersPerWave || '-'}~${item.maxOrdersPerWave || '-'}`,
                          pickMode: pickModeLabel(item.pickMode, t),
                          downstream: downstreamLabel(item.downstreamMode, t),
                        })
                      : t('waveTypes.disabled')}
                  </div>
                </div>
                <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  {t(`waveTypes.autoIdentifyRules.${item.code}`)}
                </div>
              </div>
            </TabsContent>
          ))}
          </Tabs>
        </TooltipProvider>
      </div>
    )
  }

  if (step === 6) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('pickRules.crossZoneSplitMode')} required>
            <Select value={form.crossZoneSplitMode} onValueChange={(value) => updateForm('crossZoneSplitMode', value as FormState['crossZoneSplitMode'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BY_ZONE">{t('pickRules.splitByZone')}</SelectItem>
                <SelectItem value="NO_SPLIT">{t('pickRules.noSplit')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('pickRules.pathOptimize')} required>
            <Select value="LOCATION_ASC" onValueChange={() => undefined}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="LOCATION_ASC">{t('pickRules.pathOptimizeLocationAsc')}</SelectItem></SelectContent>
            </Select>
          </Field>
          <div className="md:col-span-2 space-y-2">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.enableMaxOrdersPerPick} onCheckedChange={(v) => updateForm('enableMaxOrdersPerPick', !!v)} />{t('pickRules.maxOrdersPerPick')}</label>
            <div className="space-y-2">
              <RequiredLabel required={form.enableMaxOrdersPerPick}>{t('pickRules.maxOrdersPerPickValue')}</RequiredLabel>
              <Input type="number" min="1" value={form.maxOrdersPerPickOrder} onChange={(e) => updateForm('maxOrdersPerPickOrder', e.target.value)} disabled={!form.enableMaxOrdersPerPick} />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-dashed p-4">
          <div className="font-medium mb-2">{t('pickRules.riskTitle')}</div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>{form.crossZoneSplitMode === 'NO_SPLIT' ? t('pickRules.noSplitHint') : t('pickRules.splitByZoneHint')}</div>
            <div>{form.enableMaxOrdersPerPick ? t('pickRules.maxOrdersEnabledHint', { value: form.maxOrdersPerPickOrder || '-' }) : t('pickRules.maxOrdersDisabledHint')}</div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 7) {
    const configurableWaveTypes = form.waveTypes.filter((item) => item.configurableDownstream)
    return (
      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <div className="font-medium mb-3">{t('packRules.fixedRuleMatrix')}</div>
          <div className="space-y-2 text-sm">
            {form.waveTypes.filter((item) => !item.configurableDownstream).map((item) => (
              <div key={item.code} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <span>{waveTypeLabel(item.code, t)}</span>
                <Badge variant="outline">{downstreamLabel(item.downstreamMode, t)}</Badge>
              </div>
            ))}
          </div>
        </div>
        {configurableWaveTypes.length > 0 ? (
          <div className="rounded-lg border">
            <div className="grid grid-cols-[1.4fr_0.8fr_1.2fr] gap-3 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
              <div>{t('packRules.waveType')}</div>
              <div>{t('packRules.ruleType')}</div>
              <div>{t('packRules.finalResult')}</div>
            </div>
            {configurableWaveTypes.map((item) => (
              <div key={item.code} className="grid grid-cols-[1.4fr_0.8fr_1.2fr] gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                <div>{waveTypeLabel(item.code, t)}</div>
                <div>{t('packRules.configurable')}</div>
                <div>
                  <Select value={item.downstreamMode} onValueChange={(value) => updateWaveType(item.code, 'downstreamMode', value as DownstreamMode)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SORT_THEN_PACK">{t('packRules.sortThenPack')}</SelectItem>
                      <SelectItem value="PACK_DIRECT">{t('packRules.packDirect')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          {t('packRules.description')}
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={t('releaseRules.releaseMode')} required>
        <div className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm">
          {t('releaseRules.immediate')}
        </div>
      </Field>
      <div className="flex items-end pb-2">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.autoAssignPicker} onCheckedChange={(v) => updateForm('autoAssignPicker', !!v)} />{t('releaseRules.autoAssignPicker')}</label>
      </div>
    </div>
  )
}

function Field({
  label,
  required = false,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <RequiredLabel required={required}>{label}</RequiredLabel>
      {children}
    </div>
  )
}

function RequiredLabel({
  children,
  required = true,
}: {
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <Label className="inline-flex items-center gap-1">
      <span>{children}</span>
      {required ? <span aria-hidden="true" className="text-destructive">*</span> : null}
    </Label>
  )
}
