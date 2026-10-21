'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { EntitySelect, EnumFilterSelect, ListFilterCard, type EntitySelectOption } from '@/components/list-filters'
import { createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { formatDate, formatDateTime } from '@/lib/utils/date-formatter'

interface AuditLog {
  id: string
  operationType: string
  operatorName: string | null
  description: string | null
  entityType: string
  createdAt: string
}

interface BatchRow {
  id: string
  batchNumber: string
  batchType: string
  status: string
  clientName: string | null
  scopeSummary: string
  counterUserId: string | null
  counterUserName: string | null
  reviewerUserId: string | null
  reviewerUserName: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface PendingDetailRow {
  id: string
  batchId: string | null
  countBatchNumber: string | null
  detailNumber: string
  clientName: string | null
  locationId: string
  locationCode: string
  skuId: string
  skuCode: string
  batchNumber: string
  lpn: string
  bucketType: string
  expiryDate: string | null
  bookQuantity: number
  firstCountQuantity: number | null
  firstCountedAt: string | null
  firstCounterUserId: string | null
  firstCounterUserName: string | null
  recountQuantity: number | null
  recountedAt: string | null
  recountUserId: string | null
  recountUserName: string | null
  finalQuantity: number | null
  diffQuantity: number | null
  adjustmentId: string | null
  adjustmentNumber: string | null
  adjustmentStatus: string | null
  adjustmentQuantity: number | null
  disposalId: string | null
  disposalNumber: string | null
  disposalStatus: string | null
  disposalQuantity: number | null
  disposalType: string | null
  disposalSourceLocationCode: string | null
  disposalTargetLocationCode: string | null
  disposalSourceAdjustmentId: string | null
  lastRecordId: string | null
  status: string
  createdAt: string
}

interface SubmitDialogState {
  open: boolean
  detail: (PendingDetailRow | PendingDetailSummaryRow) | null
  countedQuantity: string
  isEmptyLocation: boolean
  exceptionReasonCode: string
  remark: string
}

interface AssigneeDialogState {
  open: boolean
  mode: 'single' | 'bulk'
  batch: BatchRow | null
  assigneeUserId: string
}

interface CompleteDisposalDialogState {
  open: boolean
  detail: PendingDetailRow | null
  targetLocationCode: string
}

interface UserOption {
  id: string
  username: string
  fullName: string | null
  employeeId?: string | null
}

interface RecordRow {
  id: string
  detailId: string
  countBatchNumber: string
  detailNumber: string
  locationCode: string
  skuCode: string
  roundType: string
  sourceType: string
  countedQuantity: number
  diffQuantity: number | null
  actorUserName: string | null
  remark: string | null
  submittedAt: string
  createdAt: string
}

interface InventoryCountDetailData {
  id: string
  orderNumber: string
  orderType: string
  countMode: string
  status: string
  warehouseName: string
  plannedAt: string
  remark: string | null
  ownerScopeMode: string
  ownerScopeSummary: string
  ownerScopeConfigJson: {
    clientNames?: string[]
  }
  scopeConfigJson: Record<string, unknown>
  executionConfigJson: Record<string, unknown>
  totalBatchCount: number
  completedBatchCount: number
  totalDetailCount: number
  diffDetailCount: number
  pendingRecountCount: number
  pendingAdjustCount: number
  createdAt: string
  updatedAt: string
  createdByName: string | null
  progressPercent: number
  auditLogs: AuditLog[]
  batches: BatchRow[]
  batchStats?: Record<string, { total: number; completed: number }>
  pendingDetails: PendingDetailRow[]
  records: RecordRow[]
}

interface BinLocationOption {
  id: string
  locationCode: string
  zone?: {
    zoneCode: string
    zoneName: string
  } | null
}

interface PendingDetailSummaryRow {
  id: string
  details: PendingDetailRow[]
  detailCount: number
  countBatchNumber: string | null
  locationId: string
  locationCode: string
  skuId: string
  skuCode: string
  expiryDate: string | null
  lpn: string
  batchNumber: string
  bucketType: string
  scope: {
    locationId: string
    skuId: string
    batchNumber: string
    lpn: string
    bucketType: string
    expiryDateKey: string
  }
  bookQuantity: number
  firstCountQuantity: number | null
  firstCounterUserName: string | null
  recountQuantity: number | null
  recountUserName: string | null
  finalQuantity: number | null
  diffQuantity: number | null
  status: string
  statusCounts: Record<string, number>
}

const isPendingDetailSummaryRow = (
  detail: PendingDetailRow | PendingDetailSummaryRow
): detail is PendingDetailSummaryRow => 'details' in detail

const statusColorMap: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_SCOPE: 'bg-amber-100 text-amber-700',
  READY: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-emerald-100 text-emerald-700',
  PENDING_ADJUST: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
}

const detailStatusDisplayOrder = [
  'PENDING',
  'RECOUNT_PENDING',
  'RECOUNTED',
  'CONFIRMED',
  'ADJUST_CREATED',
  'ADJUSTED',
]

const getExpiryDateKey = (value: string | null | undefined) => {
  if (!value) {
    return '1000-01-01'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '1000-01-01' : date.toISOString().slice(0, 10)
}

const MULTIPLE_VALUES_TOKEN = '__MULTIPLE_VALUES__'

const getUniqueValue = (values: Array<string | null | undefined>) => {
  const uniqueValues = Array.from(new Set(values.filter((value): value is string => !!value)))
  if (uniqueValues.length === 0) {
    return null
  }
  return uniqueValues.length === 1 ? uniqueValues[0] : MULTIPLE_VALUES_TOKEN
}

const sumNullable = (details: PendingDetailRow[], selector: (detail: PendingDetailRow) => number | null) => {
  let hasValue = false
  const total = details.reduce((sum, detail) => {
    const value = selector(detail)
    if (value === null) {
      return sum
    }
    hasValue = true
    return sum + value
  }, 0)
  return hasValue ? total : null
}

const getMergedStatus = (details: PendingDetailRow[]) => {
  const statuses = Array.from(new Set(details.map((detail) => detail.status)))
  return statuses.length === 1 ? statuses[0] : 'MIXED'
}

const getStatusCounts = (details: PendingDetailRow[]) => details.reduce<Record<string, number>>((acc, detail) => {
  acc[detail.status] = (acc[detail.status] || 0) + 1
  return acc
}, {})

const buildSummaryRowForDetails = (
  source: PendingDetailSummaryRow,
  details: PendingDetailRow[]
): PendingDetailSummaryRow => ({
  ...source,
  id: `${source.id}:${details.map((detail) => detail.id).join(',')}`,
  details,
  detailCount: details.length,
  bookQuantity: details.reduce((sum, detail) => sum + detail.bookQuantity, 0),
  firstCountQuantity: sumNullable(details, (detail) => detail.firstCountQuantity),
  firstCounterUserName: getUniqueValue(details.map((detail) => detail.firstCounterUserName)),
  recountQuantity: sumNullable(details, (detail) => detail.recountQuantity),
  recountUserName: getUniqueValue(details.map((detail) => detail.recountUserName)),
  finalQuantity: sumNullable(details, (detail) => detail.finalQuantity),
  diffQuantity: sumNullable(details, (detail) => detail.diffQuantity),
  status: getMergedStatus(details),
  statusCounts: getStatusCounts(details),
})

export default function InventoryCountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [id, setId] = useState('')
  const [data, setData] = useState<InventoryCountDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailSearch, setDetailSearch] = useState('')
  const [detailBucketType, setDetailBucketType] = useState('')
  const [recordSearch, setRecordSearch] = useState('')
  const [recordSourceType, setRecordSourceType] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [stagingLocations, setStagingLocations] = useState<BinLocationOption[]>([])
  const [stagingLocationsLoading, setStagingLocationsLoading] = useState(false)
  const [batchSelection, setBatchSelection] = useState<Record<string, boolean>>({})
  const [submitDialog, setSubmitDialog] = useState<SubmitDialogState>({
    open: false,
    detail: null,
    countedQuantity: '',
    isEmptyLocation: false,
    exceptionReasonCode: '',
    remark: '',
  })
  const [assigneeDialog, setAssigneeDialog] = useState<AssigneeDialogState>({
    open: false,
    mode: 'single',
    batch: null,
    assigneeUserId: '',
  })
  const [completeDisposalDialog, setCompleteDisposalDialog] = useState<CompleteDisposalDialogState>({
    open: false,
    detail: null,
    targetLocationCode: '',
  })
  const router = useRouter()
  const t = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const tCount = useTranslations('inventory.count')
  const tAudit = useTranslations('audit')
  const userOptions: EntitySelectOption[] = useMemo(
    () => users.map((user) => ({
      value: user.id,
      label: user.fullName || user.username,
      keywords: [user.username, user.employeeId || ''].filter(Boolean),
    })),
    [users]
  )
  const stagingLocationOptions: EntitySelectOption[] = useMemo(
    () => stagingLocations.map((location) => ({
      value: location.locationCode,
      label: location.zone?.zoneName
        ? `${location.locationCode} / ${location.zone.zoneName}`
        : location.locationCode,
      keywords: [location.zone?.zoneCode || ''].filter(Boolean),
    })),
    [stagingLocations]
  )

  useEffect(() => {
    params.then((value) => setId(value.id))
  }, [params])

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/v1/users?pageSize=100&status=ACTIVE')
        const result = await response.json()
        if (result.success) {
          setUsers(result.data || [])
        }
      } catch (error) {
        console.error('Failed to load inventory count users:', error)
      }
    }

    void loadUsers()
  }, [])

  useEffect(() => {
    if (!id) {
      return
    }

    void loadDetail(id)
  }, [id])

  useEffect(() => {
    if (!completeDisposalDialog.open) {
      return
    }

    const loadStagingLocations = async () => {
      try {
        setStagingLocationsLoading(true)
        const params = new URLSearchParams({
          locationType: 'STAGING',
          status: 'ACTIVE',
          lockStatus: 'UNLOCKED',
          pageSize: '100',
          sortBy: 'locationCode',
          sortOrder: 'asc',
        })
        const response = await fetch(`/api/v1/bin-locations?${params.toString()}`)
        const result = await response.json()
        setStagingLocations(result.success ? result.data || [] : [])
      } catch (error) {
        console.error('Failed to load staging locations:', error)
        setStagingLocations([])
      } finally {
        setStagingLocationsLoading(false)
      }
    }

    void loadStagingLocations()
  }, [completeDisposalDialog.open])

  const loadDetail = async (targetId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/inventory/counts/${targetId}`)
      const result = await response.json()
      if (result.success) {
        setData(result.data)
        setBatchSelection({})
      } else {
        setData(null)
      }
    } catch (error) {
      console.error('Failed to fetch inventory count detail:', error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const postAction = async (url: string, options: { body?: unknown; successMessage: string; loadingKey: string }) => {
    try {
      setActionLoading(options.loadingKey)
      const response = await fetch(url, {
        method: 'POST',
        headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || tCount('operationFailed'))
      }

      setData(result.data)
      toast.success(options.successMessage)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : tCount('operationFailed')
      toast.error(message)
      return false
    } finally {
      setActionLoading('')
    }
  }

  const openSubmitDialog = (detail: PendingDetailRow | PendingDetailSummaryRow) => {
    setSubmitDialog({
      open: true,
      detail,
      countedQuantity: detail.finalQuantity === null ? String(detail.bookQuantity) : String(detail.finalQuantity),
      isEmptyLocation: false,
      exceptionReasonCode: '',
      remark: '',
    })
  }

  const closeSubmitDialog = () => {
    setSubmitDialog((current) => ({ ...current, open: false }))
  }

  const handleSubmitLine = async () => {
    const detail = submitDialog.detail
    if (!id || !detail) {
      toast.error(tCount('detailScopeMissing'))
      return
    }

    const countedQuantity = Number(submitDialog.countedQuantity)
    if (!Number.isInteger(countedQuantity) || countedQuantity < 0) {
      toast.error(tCount('countedQtyNonNegative'))
      return
    }

    const targetDetails = isPendingDetailSummaryRow(detail) ? detail.details : [detail]
    const hasRecountPending = targetDetails.some((item) => item.status === 'RECOUNT_PENDING')
    const success = await postAction(
      `/api/v1/inventory/counts/${id}/lines/submit`,
      {
        body: {
          countedQuantity,
          isEmptyLocation: submitDialog.isEmptyLocation,
          exceptionReasonCode: submitDialog.exceptionReasonCode || undefined,
          remark: submitDialog.remark || undefined,
          scope: isPendingDetailSummaryRow(detail)
            ? detail.scope
            : {
                locationId: detail.locationId,
                skuId: detail.skuId,
                batchNumber: detail.batchNumber || '',
                lpn: detail.lpn || '',
                bucketType: detail.bucketType,
                expiryDateKey: getExpiryDateKey(detail.expiryDate),
              },
          roundType: hasRecountPending ? 'RECOUNT' : 'FIRST',
        },
        successMessage: tCount('submitDetailSuccess'),
        loadingKey: `submit:${detail.id}`,
      }
    )

    if (success) {
      closeSubmitDialog()
    }
  }

  const isBatchAssigneeEditable = (batch: BatchRow) => !['COMPLETED', 'CANCELLED'].includes(batch.status)
  const getBatchAssigneeName = (batch: BatchRow) => (
    batch.batchType === 'RECOUNT' ? batch.reviewerUserName : batch.counterUserName
  )
  const getBatchAssigneeUserId = (batch: BatchRow) => (
    batch.batchType === 'RECOUNT' ? batch.reviewerUserId : batch.counterUserId
  )
  const getBatchAssigneeLabel = (batch: BatchRow | null) => (
    batch?.batchType === 'RECOUNT' ? tCount('reviewerUser') : tCount('counterUser')
  )

  const openSingleAssigneeDialog = (batch: BatchRow) => {
    if (!isBatchAssigneeEditable(batch)) {
      toast.error(tCount('batchAssigneeLocked'))
      return
    }

    setAssigneeDialog({
      open: true,
      mode: 'single',
      batch,
      assigneeUserId: getBatchAssigneeUserId(batch) || '',
    })
  }

  const openBulkAssigneeDialog = () => {
    const selected = data?.batches.filter((batch) => batchSelection[batch.id]) || []
    if (selected.length === 0) {
      toast.error(tCount('selectBatchesForAssignee'))
      return
    }
    if (selected.some((batch) => !isBatchAssigneeEditable(batch))) {
      toast.error(tCount('batchAssigneeLocked'))
      return
    }

    setAssigneeDialog({
      open: true,
      mode: 'bulk',
      batch: null,
      assigneeUserId: '',
    })
  }

  const closeAssigneeDialog = () => {
    setAssigneeDialog((current) => ({ ...current, open: false }))
  }

  const openCompleteDisposalDialog = (detail: PendingDetailRow) => {
    setCompleteDisposalDialog({
      open: true,
      detail,
      targetLocationCode: detail.disposalTargetLocationCode || '',
    })
  }

  const closeCompleteDisposalDialog = () => {
    setCompleteDisposalDialog((current) => ({ ...current, open: false }))
  }

  const handleUpdateAssignee = async () => {
    if (!id) return

    const assigneeUserId = assigneeDialog.assigneeUserId || null
    const selectedBatchIds = Object.keys(batchSelection).filter((batchId) => batchSelection[batchId])
    const isBulk = assigneeDialog.mode === 'bulk'
    const success = await postAction(
      isBulk
        ? `/api/v1/inventory/counts/${id}/batches/assignees`
        : `/api/v1/inventory/counts/${id}/batches/${assigneeDialog.batch?.id}/assignee`,
      {
        body: isBulk
          ? { batchIds: selectedBatchIds, assigneeUserId }
          : { assigneeUserId },
        successMessage: isBulk ? tCount('assigneeBulkUpdateSuccess') : tCount('assigneeUpdateSuccess'),
        loadingKey: isBulk ? 'batch-assignee:bulk' : `batch-assignee:${assigneeDialog.batch?.id}`,
      }
    )

    if (success) {
      closeAssigneeDialog()
      if (isBulk) {
        setBatchSelection({})
      }
    }
  }

  const handleGenerateRecounts = () => {
    if (!id) return
    void postAction(`/api/v1/inventory/counts/${id}/recounts/generate`, {
      body: {},
      successMessage: tCount('generateRecountSuccess'),
      loadingKey: 'generate-recounts',
    })
  }

  const handleConfirmDifferences = () => {
    if (!id) return
    void postAction(`/api/v1/inventory/counts/${id}/differences/confirm`, {
      body: {},
      successMessage: tCount('confirmDifferencesSuccess'),
      loadingKey: 'confirm-differences',
    })
  }

  const breadcrumb = useMemo(() => createBreadcrumbFactory({
    parents: [{ label: tMenuGroup('inventory') }],
    module: { label: tCount('title'), href: '/inventory/counts' },
  }), [tCount, tMenuGroup])

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{t('loading')}</div>
  }

  if (!data) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{tCount('detailNotFound')}</div>
  }

  const executionConfig = data.executionConfigJson || {}
  const scopeConfig = data.scopeConfigJson || {}
  const normalizedDetailSearch = detailSearch.trim().toLowerCase()
  const normalizedRecordSearch = recordSearch.trim().toLowerCase()
  const batchById = new Map(data.batches.map((batch) => [batch.id, batch]))
  const editableBatches = data.batches.filter(isBatchAssigneeEditable)
  const selectedBatchIds = Object.keys(batchSelection).filter((batchId) => batchSelection[batchId])
  const selectedEditableBatchCount = editableBatches.filter((batch) => batchSelection[batch.id]).length
  const allEditableBatchesSelected = editableBatches.length > 0 && selectedEditableBatchCount === editableBatches.length
  const batchStats = data.batchStats || data.batches.reduce<Record<string, { total: number; completed: number }>>((acc, batch) => {
    acc[batch.id] = { total: 0, completed: 0 }
    return acc
  }, {})

  const filteredPendingDetails = data.pendingDetails.filter((detail) => {
    const matchesSearch = !normalizedDetailSearch || [
      detail.countBatchNumber || '',
      detail.skuCode,
      detail.locationCode,
      formatDate(detail.expiryDate),
      getExpiryDateKey(detail.expiryDate),
      detail.lpn || '',
      detail.batchNumber || '',
      detail.bucketType,
    ].some((value) => value.toLowerCase().includes(normalizedDetailSearch))
    const matchesBucketType = !detailBucketType || detail.bucketType === detailBucketType
    return matchesSearch && matchesBucketType
  })
  const pendingDetailGroups = new Map<string, PendingDetailRow[]>()
  for (const detail of filteredPendingDetails) {
    const key = JSON.stringify([
      detail.locationId,
      detail.skuId,
      detail.batchNumber || '',
      detail.lpn || '',
      detail.bucketType,
      getExpiryDateKey(detail.expiryDate),
    ])
    const group = pendingDetailGroups.get(key)
    if (group) {
      group.push(detail)
    } else {
      pendingDetailGroups.set(key, [detail])
    }
  }
  const groupedPendingDetails: PendingDetailSummaryRow[] = Array.from(pendingDetailGroups.entries()).map(([key, details]) => {
    const first = details[0]!
    return {
      id: key,
      details,
      detailCount: details.length,
      countBatchNumber: getUniqueValue(details.map((detail) => detail.countBatchNumber)),
      locationId: first.locationId,
      skuCode: first.skuCode,
      skuId: first.skuId,
      locationCode: first.locationCode,
      expiryDate: first.expiryDate,
      lpn: first.lpn,
      batchNumber: first.batchNumber,
      bucketType: first.bucketType,
      scope: {
        locationId: first.locationId,
        skuId: first.skuId,
        batchNumber: first.batchNumber || '',
        lpn: first.lpn || '',
        bucketType: first.bucketType,
        expiryDateKey: getExpiryDateKey(first.expiryDate),
      },
      bookQuantity: details.reduce((sum, detail) => sum + detail.bookQuantity, 0),
      firstCountQuantity: sumNullable(details, (detail) => detail.firstCountQuantity),
      firstCounterUserName: getUniqueValue(details.map((detail) => detail.firstCounterUserName)),
      recountQuantity: sumNullable(details, (detail) => detail.recountQuantity),
      recountUserName: getUniqueValue(details.map((detail) => detail.recountUserName)),
      finalQuantity: sumNullable(details, (detail) => detail.finalQuantity),
      diffQuantity: sumNullable(details, (detail) => detail.diffQuantity),
      status: getMergedStatus(details),
      statusCounts: getStatusCounts(details),
    }
  })

  const filteredRecords = data.records.filter((record) => {
    const matchesSearch = !normalizedRecordSearch || [
      record.countBatchNumber,
      record.locationCode,
      record.skuCode,
    ].some((value) => value.toLowerCase().includes(normalizedRecordSearch))
    const matchesSourceType = !recordSourceType || record.sourceType === recordSourceType
    return matchesSearch && matchesSourceType
  })
  const disposalDetails = data.pendingDetails.filter((detail) => detail.disposalNumber)
  const adjustmentDetails = data.pendingDetails.filter((detail) => detail.adjustmentNumber)
  const getDetailBatch = (detail: PendingDetailRow) => detail.batchId ? batchById.get(detail.batchId) || null : null
  const isSubmitEnabled = (detail: PendingDetailRow) => {
    const batch = getDetailBatch(detail)
    if (!batch) {
      return false
    }
    if (detail.status === 'PENDING') {
      return batch.batchType === 'FIRST' && ['READY', 'IN_PROGRESS'].includes(batch.status)
    }
    if (detail.status === 'RECOUNT_PENDING') {
      return batch.batchType === 'RECOUNT' && ['READY', 'RECOUNTING'].includes(batch.status)
    }
    return false
  }
  const isRecountGenerationRequired = (detail: PendingDetailRow) => {
    const batch = getDetailBatch(detail)
    return detail.status === 'RECOUNT_PENDING' && batch?.batchType === 'FIRST'
  }
  const getDetailStatusLabel = (status: string) => tCount(`detailStatuses.${status}`)
  const getStatusSummaryLabel = (statusCounts: Record<string, number>) => (
    Object.entries(statusCounts)
      .sort(([leftStatus], [rightStatus]) => {
        const leftIndex = detailStatusDisplayOrder.indexOf(leftStatus)
        const rightIndex = detailStatusDisplayOrder.indexOf(rightStatus)
        if (leftIndex !== -1 || rightIndex !== -1) {
          return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex)
            - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
        }
        return leftStatus.localeCompare(rightStatus)
      })
      .map(([status, count]) => (count > 1 ? `${getDetailStatusLabel(status)} ${count}` : getDetailStatusLabel(status)))
      .join(' / ')
  )
  const hasRecountableDetails = data.pendingDetails.some((detail) => isRecountGenerationRequired(detail))
  const hasConfirmableDifferences = data.pendingDetails.some(
    (detail) => detail.status === 'RECOUNTED' && (detail.diffQuantity || 0) !== 0
  )
  const canFinalizeWithoutDifferences =
    data.status !== 'COMPLETED' &&
    data.totalBatchCount > 0 &&
    data.completedBatchCount === data.totalBatchCount &&
    data.pendingRecountCount === 0 &&
    data.diffDetailCount === 0
  const canConfirmDifferences = hasConfirmableDifferences || canFinalizeWithoutDifferences
  const handleGenerateRecountForDetails = (details: PendingDetailRow[], loadingKey: string) => {
    if (!id) return
    void postAction(`/api/v1/inventory/counts/${id}/recounts/generate`, {
      body: { detailIds: details.map((detail) => detail.id) },
      successMessage: tCount('generateRecountSuccess'),
      loadingKey: `generate-recount:${loadingKey}`,
    })
  }
  const handleStartDisposal = (detail: PendingDetailRow) => {
    if (!id || !detail.disposalId) return
    void postAction(`/api/v1/inventory/counts/${id}/disposals/${detail.disposalId}/start`, {
      successMessage: tCount('disposalStartSuccess'),
      loadingKey: `start-disposal:${detail.disposalId}`,
    })
  }
  const handleCompleteDisposal = (detail: PendingDetailRow) => {
    if (!id || !detail.disposalId) return
    openCompleteDisposalDialog(detail)
  }

  const submitCompleteDisposal = async () => {
    const detail = completeDisposalDialog.detail
    const targetLocationCode = completeDisposalDialog.targetLocationCode.trim()
    if (!id || !detail?.disposalId) return
    if (!targetLocationCode) {
      toast.error(tCount('targetStagingLocationRequired'))
      return
    }

    const success = await postAction(
      `/api/v1/inventory/counts/${id}/disposals/${detail.disposalId}/complete`,
      {
        body: { targetLocationCode },
        successMessage: tCount('disposalCompleteSuccess'),
        loadingKey: `complete-disposal:${detail.disposalId}`,
      }
    )

    if (success) {
      closeCompleteDisposalDialog()
    }
  }
  const countDetailBucketTypeOptions = [
    { value: 'AVAILABLE', label: tCount('countableBucketTypes.AVAILABLE') },
    { value: 'DEFECTIVE', label: tCount('countableBucketTypes.DEFECTIVE') },
    { value: 'FROZEN', label: tCount('countableBucketTypes.FROZEN') },
  ]
  const getCountDetailBucketTypeLabel = (bucketType: string) => {
    const option = countDetailBucketTypeOptions.find((item) => item.value === bucketType)
    return option?.label || bucketType
  }
  const formatMergedValue = (value: string | null | undefined) => {
    if (value === MULTIPLE_VALUES_TOKEN) return tCount('multipleValues')
    return value || '-'
  }
  const getTranslatedCountValue = (group: string, value: string | null | undefined) => {
    if (!value) return '-'
    const key = `${group}.${value}`
    return ('has' in tCount && typeof tCount.has === 'function' && tCount.has(key)) ? tCount(key) : value
  }
  const getAuditOperationLabel = (operationType: string) => {
    const key = `operations.${operationType}`
    return ('has' in tAudit && typeof tAudit.has === 'function' && tAudit.has(key)) ? tAudit(key) : operationType
  }
  const getAuditEntityLabel = (entityType: string) => {
    const key = `entities.${entityType}`
    return ('has' in tAudit && typeof tAudit.has === 'function' && tAudit.has(key)) ? tAudit(key) : entityType
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Breadcrumb items={breadcrumb.current(data.orderNumber)} />
          <Badge className={statusColorMap[data.status] || 'bg-muted text-foreground'}>
            {tCount(`statuses.${data.status}`)}
          </Badge>
        </div>
        <Button variant="outline" onClick={() => router.push('/inventory/counts')}>
          {t('back')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2">
        <div className="mr-auto text-sm text-muted-foreground">
          {tCount('workbenchHint')}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasRecountableDetails || actionLoading === 'generate-recounts'}
          onClick={handleGenerateRecounts}
        >
          {actionLoading === 'generate-recounts' ? tCount('generating') : tCount('generateRecountBatch')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canConfirmDifferences || actionLoading === 'confirm-differences'}
          onClick={handleConfirmDifferences}
        >
          {actionLoading === 'confirm-differences' ? tCount('confirming') : tCount('confirmDifferences')}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: tCount('totalBatchCount'), value: data.totalBatchCount },
          { label: tCount('completedBatchCount'), value: data.completedBatchCount },
          { label: tCount('totalDetailCount'), value: data.totalDetailCount },
          { label: tCount('diffDetailCount'), value: data.diffDetailCount },
          { label: tCount('pendingRecountCount'), value: data.pendingRecountCount },
          { label: tCount('pendingAdjustCount'), value: data.pendingAdjustCount },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="px-5 py-4">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="mt-1 text-[30px] font-semibold leading-none">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <CardTitle>{tCount('basicInfo')}</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setDetailsExpanded((current) => !current)}
          >
            {detailsExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {detailsExpanded ? t('collapse') : t('expand')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {detailsExpanded ? (
            <>
          <div className="grid gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">{tCount('orderNumber')}</div>
              <div className="font-medium">{data.orderNumber}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{tCount('orderType')}</div>
              <div className="font-medium">{tCount(`types.${data.orderType}`)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{tCount('countMode')}</div>
              <div className="font-medium">{tCount(`countModes.${data.countMode}`)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('warehouse')}</div>
              <div className="font-medium">{data.warehouseName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{tCount('ownerScope')}</div>
              <div className="font-medium">{data.ownerScopeSummary}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{tCount('plannedAt')}</div>
              <div className="font-medium">{formatDateTime(data.plannedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{tCount('progress')}</div>
              <div className="font-medium">{data.progressPercent}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{tCount('creator')}</div>
              <div className="font-medium">{data.createdByName || '-'}</div>
            </div>
          <div>
            <div className="text-xs text-muted-foreground">{t('createdAt')}</div>
            <div className="font-medium">{formatDateTime(data.createdAt)}</div>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <div className="text-xs text-muted-foreground">{tCount('remark')}</div>
            <div className="font-medium">{data.remark || '-'}</div>
          </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-lg border bg-muted/15 px-4 py-3">
              <div className="mb-2 text-sm font-medium">{tCount('scopeConfig')}</div>
              <div className="space-y-2 text-sm">
                {data.orderType === 'FULL' && (
                  <div>{tCount('inventoryStatuses')}: {((scopeConfig.inventoryStatuses as string[] | undefined) || []).join('、') || '-'}</div>
                )}
                {data.orderType === 'LOCATION' && (
                  <>
                    <div>{tCount('zone')}: {String(scopeConfig.zoneName || '-')}</div>
                    <div>{tCount('aisle')}: {String(scopeConfig.aisle || '-')}</div>
                    <div>{tCount('rack')}: {String(scopeConfig.rack || '-')}</div>
                    <div>{tCount('shelfRange')}: {String(scopeConfig.shelfStart || '-')}-{String(scopeConfig.shelfEnd || '-')}</div>
                  </>
                )}
                {data.orderType === 'SKU' && (
                  <div>{tCount('skuCodes')}: {((scopeConfig.skuCodes as string[] | undefined) || []).join('、') || '-'}</div>
                )}
                {data.orderType === 'CYCLE' && (
                  <>
                    <div>{tCount('cycleDays')}: {String(scopeConfig.cycleDays || '-')}</div>
                    <div>{tCount('calendarCode')}: {String(scopeConfig.calendarCode || '-')}</div>
                    <div>{tCount('timeWindow')}: {String(scopeConfig.timeWindow || '-')}</div>
                    <div>{tCount('maxLocationsPerBatch')}: {String(scopeConfig.maxLocationsPerBatch || '-')}</div>
                    <div>{tCount('excludeRules')}: {String(scopeConfig.excludeRules || '-')}</div>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/15 px-4 py-3">
              <div className="mb-2 text-sm font-medium">{tCount('executionConfig')}</div>
              <div className="grid gap-x-6 gap-y-2 md:grid-cols-2 text-sm">
                <div>{tCount('splitRule')}: {tCount(`splitRules.${String(executionConfig.splitRule || 'BY_LOCATION')}`)}</div>
                <div>{tCount('pdaMode')}: {tCount(`countModes.${String(executionConfig.pdaMode || data.countMode)}`)}</div>
                <div>{tCount('counterUser')}: {String(executionConfig.counterUserName || '-')}</div>
                <div>{tCount('reviewerUser')}: {String(executionConfig.reviewerUserName || '-')}</div>
              </div>
            </div>
          </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span>{tCount('orderType')}: {tCount(`types.${data.orderType}`)}</span>
              <span>{tCount('plannedAt')}: {formatDateTime(data.plannedAt)}</span>
              <span>{tCount('progress')}: {data.progressPercent}%</span>
              <span>{tCount('splitRule')}: {tCount(`splitRules.${String(executionConfig.splitRule || 'BY_LOCATION')}`)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="pendingDetails" className="w-full">
        <TabsList>
          <TabsTrigger value="pendingDetails">{tCount('pendingDetailsTab')}</TabsTrigger>
          <TabsTrigger value="batches">{tCount('batchesTab')}</TabsTrigger>
          <TabsTrigger value="records">{tCount('recordsTab')}</TabsTrigger>
          <TabsTrigger value="disposals">{tCount('disposalsTab')}</TabsTrigger>
          <TabsTrigger value="adjustments">{tCount('adjustmentsTab')}</TabsTrigger>
          <TabsTrigger value="logs">{tCount('logsTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pendingDetails">
          <ListFilterCard mode="compact" className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-end">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t('search')}</div>
                <Input
                  value={detailSearch}
                  onChange={(event) => setDetailSearch(event.target.value)}
                  placeholder={tCount('detailSearchPlaceholder')}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{tCount('bucketType')}</div>
                <EnumFilterSelect
                  value={detailBucketType}
                  onValueChange={setDetailBucketType}
                  allLabel={t('all')}
                  options={countDetailBucketTypeOptions}
                />
              </div>
            </div>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tCount('countBatchNumber')}</TableHead>
                    <TableHead>{tCount('skuCode')}</TableHead>
                    <TableHead>{tCount('locationCode')}</TableHead>
                    <TableHead>{tCount('expiryDate')}</TableHead>
                    <TableHead>{tCount('lpn')}</TableHead>
                    <TableHead>{tCount('batchNumberField')}</TableHead>
                    <TableHead>{tCount('bucketTypeField')}</TableHead>
                    <TableHead>{tCount('bookQuantity')}</TableHead>
                    <TableHead>{tCount('firstCountQuantity')}</TableHead>
                    <TableHead>{tCount('recountQuantity')}</TableHead>
                    <TableHead>{tCount('finalQuantity')}</TableHead>
                    <TableHead>{tCount('diffQuantity')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedPendingDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center text-muted-foreground">
                        {t('noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedPendingDetails.map((detail) => {
                      const recountableDetails = detail.details.filter((item) => isRecountGenerationRequired(item))
                      const submittableDetails = detail.details.filter((item) => isSubmitEnabled(item))
                      return (
                        <TableRow key={detail.id}>
                          <TableCell>{formatMergedValue(detail.countBatchNumber)}</TableCell>
                          <TableCell>{detail.skuCode}</TableCell>
                          <TableCell>{detail.locationCode}</TableCell>
                          <TableCell>{formatDate(detail.expiryDate) || '-'}</TableCell>
                          <TableCell>{detail.lpn || '-'}</TableCell>
                          <TableCell>{detail.batchNumber || '-'}</TableCell>
                          <TableCell>{getCountDetailBucketTypeLabel(detail.bucketType)}</TableCell>
                          <TableCell>{detail.bookQuantity}</TableCell>
                          <TableCell>
                            {detail.firstCountQuantity ?? '-'}
                            {detail.firstCounterUserName && (
                              <div className="text-xs text-muted-foreground">{formatMergedValue(detail.firstCounterUserName)}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {detail.recountQuantity ?? '-'}
                            {detail.recountUserName && (
                              <div className="text-xs text-muted-foreground">{formatMergedValue(detail.recountUserName)}</div>
                            )}
                          </TableCell>
                          <TableCell>{detail.finalQuantity ?? '-'}</TableCell>
                          <TableCell>
                            <span className={(detail.diffQuantity || 0) !== 0 ? 'font-semibold text-red-500' : undefined}>
                              {detail.diffQuantity ?? '-'}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusSummaryLabel(detail.statusCounts)}</TableCell>
                          <TableCell className="text-right">
                            {recountableDetails.length > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={actionLoading === `generate-recount:${detail.id}`}
                                onClick={() => handleGenerateRecountForDetails(recountableDetails, detail.id)}
                              >
                                {actionLoading === `generate-recount:${detail.id}` ? tCount('generating') : tCount('generateRecount')}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={submittableDetails.length === 0 || actionLoading === `submit:${detail.id}`}
                                onClick={() => openSubmitDialog(buildSummaryRowForDetails(detail, submittableDetails))}
                              >
                                {actionLoading === `submit:${detail.id}` ? tCount('submitting') : submittableDetails.some((item) => item.status === 'RECOUNT_PENDING') ? tCount('submitRecount') : tCount('submitFirstCount')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </ListFilterCard>
        </TabsContent>

        <TabsContent value="batches">
          <ListFilterCard mode="compact" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                {tCount('selectedBatchesHint', { count: selectedBatchIds.length })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedBatchIds.length === 0 || actionLoading === 'batch-assignee:bulk'}
                onClick={openBulkAssigneeDialog}
              >
                {actionLoading === 'batch-assignee:bulk' ? tCount('changing') : tCount('bulkChangeAssignee')}
              </Button>
            </div>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allEditableBatchesSelected || (selectedEditableBatchCount > 0 && 'indeterminate')}
                        onCheckedChange={(value) => {
                          const checked = !!value
                          setBatchSelection((current) => {
                            const next = { ...current }
                            for (const batch of editableBatches) {
                              next[batch.id] = checked
                            }
                            return next
                          })
                        }}
                        aria-label={tCount('selectAllEditableBatches')}
                      />
                    </TableHead>
                    <TableHead>{tCount('batchNumber')}</TableHead>
                    <TableHead>{tCount('batchType')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{tCount('scopeSummary')}</TableHead>
                    <TableHead>{tCount('counterUser')}</TableHead>
                    <TableHead>{tCount('reviewerUser')}</TableHead>
                    <TableHead>{tCount('progress')}</TableHead>
                    <TableHead>{t('createdAt')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.batches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        {t('noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.batches.map((batch) => {
                      const editable = isBatchAssigneeEditable(batch)
                      const stat = batchStats[batch.id] || { total: 0, completed: 0 }
                      const progress = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
                      return (
                        <TableRow key={batch.id}>
                          <TableCell>
                            <Checkbox
                              checked={!!batchSelection[batch.id]}
                              disabled={!editable}
                              onCheckedChange={(value) => {
                                setBatchSelection((current) => ({
                                  ...current,
                                  [batch.id]: !!value,
                                }))
                              }}
                              aria-label={tCount('selectBatch', { batchNumber: batch.batchNumber })}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{batch.batchNumber}</TableCell>
                          <TableCell>{tCount(`batchTypes.${batch.batchType}`)}</TableCell>
                          <TableCell>{tCount(`batchStatuses.${batch.status}`)}</TableCell>
                          <TableCell className="max-w-[220px] truncate">{batch.scopeSummary || '-'}</TableCell>
                          <TableCell>{batch.counterUserName || '-'}</TableCell>
                          <TableCell>{batch.reviewerUserName || '-'}</TableCell>
                          <TableCell className="tabular-nums">{stat.completed}/{stat.total} ({progress}%)</TableCell>
                          <TableCell>{formatDateTime(batch.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!editable || actionLoading === `batch-assignee:${batch.id}`}
                              onClick={() => openSingleAssigneeDialog(batch)}
                            >
                              {actionLoading === `batch-assignee:${batch.id}` ? tCount('changing') : tCount('changeAssignee')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </ListFilterCard>
        </TabsContent>

        <TabsContent value="disposals">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCount('disposalNumber')}</TableHead>
                  <TableHead>{tCount('detailNumber')}</TableHead>
                  <TableHead>{tCount('locationCode')}</TableHead>
                  <TableHead>{tCount('skuCode')}</TableHead>
                  <TableHead>{tCount('disposalType')}</TableHead>
                  <TableHead>{tCount('disposalQuantity')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disposalDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">{t('noData')}</TableCell>
                  </TableRow>
                ) : (
                  disposalDetails.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell className="font-mono">{detail.disposalNumber}</TableCell>
                      <TableCell>{detail.detailNumber}</TableCell>
                      <TableCell>{detail.locationCode}</TableCell>
                      <TableCell>{detail.skuCode}</TableCell>
                      <TableCell>{getTranslatedCountValue('disposalTypes', detail.disposalType)}</TableCell>
                      <TableCell>{detail.disposalQuantity ?? '-'}</TableCell>
                      <TableCell>{getTranslatedCountValue('disposalStatuses', detail.disposalStatus)}</TableCell>
                      <TableCell className="text-right">
                        {detail.disposalId && detail.disposalStatus !== 'DONE' ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={detail.disposalStatus !== 'PENDING' || actionLoading === `start-disposal:${detail.disposalId}`}
                              onClick={() => handleStartDisposal(detail)}
                            >
                              {actionLoading === `start-disposal:${detail.disposalId}` ? tCount('starting') : tCount('startProcessing')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!['PENDING', 'PROCESSING'].includes(detail.disposalStatus || '') || actionLoading === `complete-disposal:${detail.disposalId}`}
                              onClick={() => handleCompleteDisposal(detail)}
                            >
                              {actionLoading === `complete-disposal:${detail.disposalId}` ? tCount('completing') : tCount('completeProcessing')}
                            </Button>
                          </div>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="adjustments">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCount('adjustmentNumber')}</TableHead>
                  <TableHead>{tCount('detailNumber')}</TableHead>
                  <TableHead>{tCount('locationCode')}</TableHead>
                  <TableHead>{tCount('skuCode')}</TableHead>
                  <TableHead>{tCount('adjustmentQuantity')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustmentDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">{t('noData')}</TableCell>
                  </TableRow>
                ) : (
                  adjustmentDetails.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell className="font-mono">{detail.adjustmentNumber}</TableCell>
                      <TableCell>{detail.detailNumber}</TableCell>
                      <TableCell>{detail.locationCode}</TableCell>
                      <TableCell>{detail.skuCode}</TableCell>
                      <TableCell>{detail.adjustmentQuantity ?? '-'}</TableCell>
                      <TableCell>{getTranslatedCountValue('adjustmentStatuses', detail.adjustmentStatus)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="records">
          <ListFilterCard mode="compact" className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-end">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{t('search')}</div>
                <Input
                  value={recordSearch}
                  onChange={(event) => setRecordSearch(event.target.value)}
                  placeholder={`${tCount('batchNumber')} / ${tCount('locationCode')} / ${tCount('skuCode')}`}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{tCount('sourceType')}</div>
                <EnumFilterSelect
                  value={recordSourceType}
                  onValueChange={setRecordSourceType}
                  allLabel={t('all')}
                  options={[
                    { value: 'PDA', label: tCount('sourceTypes.PDA') },
                    { value: 'WEB', label: tCount('sourceTypes.WEB') },
                    { value: 'IMPORT', label: tCount('sourceTypes.IMPORT') },
                  ]}
                />
              </div>
            </div>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tCount('batchNumber')}</TableHead>
                    <TableHead>{tCount('locationCode')}</TableHead>
                    <TableHead>{tCount('skuCode')}</TableHead>
                    <TableHead>{tCount('roundType')}</TableHead>
                    <TableHead>{tCount('sourceType')}</TableHead>
                    <TableHead>{tCount('countedQuantity')}</TableHead>
                    <TableHead>{tCount('diffQuantity')}</TableHead>
                    <TableHead>{tCount('counterUser')}</TableHead>
                    <TableHead>{tCount('remark')}</TableHead>
                    <TableHead>{tCount('submittedAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        {t('noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.countBatchNumber}</TableCell>
                        <TableCell>{record.locationCode}</TableCell>
                        <TableCell>{record.skuCode}</TableCell>
                        <TableCell>{tCount(`roundTypes.${record.roundType}`)}</TableCell>
                        <TableCell>{tCount(`sourceTypes.${record.sourceType}`)}</TableCell>
                        <TableCell>{record.countedQuantity}</TableCell>
                        <TableCell>{record.diffQuantity ?? '-'}</TableCell>
                        <TableCell>{record.actorUserName || '-'}</TableCell>
                        <TableCell>{record.remark || '-'}</TableCell>
                        <TableCell>{formatDateTime(record.submittedAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ListFilterCard>
        </TabsContent>

        <TabsContent value="logs">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tAudit('time')}</TableHead>
                  <TableHead>{tAudit('operation')}</TableHead>
                  <TableHead>{tAudit('operator')}</TableHead>
                  <TableHead>{tAudit('entity')}</TableHead>
                  <TableHead>{tCount('operationDescription')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {t('noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  data.auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                      <TableCell>{getAuditOperationLabel(log.operationType)}</TableCell>
                      <TableCell>{log.operatorName || '-'}</TableCell>
                      <TableCell>{getAuditEntityLabel(log.entityType)}</TableCell>
                      <TableCell>{log.description || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={completeDisposalDialog.open} onOpenChange={(open) => {
        if (!open) {
          closeCompleteDisposalDialog()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCount('completeDisposalTitle')}</DialogTitle>
            <DialogDescription>
              {completeDisposalDialog.detail
                ? tCount('completeDisposalDescription', {
                    disposalNumber: completeDisposalDialog.detail.disposalNumber || '-',
                    skuCode: completeDisposalDialog.detail.skuCode,
                    quantity: completeDisposalDialog.detail.disposalQuantity ?? 0,
                  })
                : tCount('completeDisposalHint')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {completeDisposalDialog.detail && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{tCount('sourceLocation')}</div>
                  <div className="font-mono">
                    {completeDisposalDialog.detail.disposalSourceLocationCode || completeDisposalDialog.detail.locationCode}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tCount('skuCode')}</div>
                  <div className="font-mono">{completeDisposalDialog.detail.skuCode}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tCount('disposalType')}</div>
                  <div>{getTranslatedCountValue('disposalTypes', completeDisposalDialog.detail.disposalType)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tCount('disposalQuantity')}</div>
                  <div>{completeDisposalDialog.detail.disposalQuantity ?? '-'}</div>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{tCount('targetStagingLocation')} <span className="text-destructive">*</span></Label>
              <EntitySelect
                value={completeDisposalDialog.targetLocationCode}
                onValueChange={(value) => setCompleteDisposalDialog((current) => ({
                  ...current,
                  targetLocationCode: value,
                }))}
                options={stagingLocationOptions}
                searchPlaceholder={tCount('searchStagingLocation')}
                emptyText={tCount('noStagingLocations')}
                placeholder={tCount('selectStagingLocation')}
                loading={stagingLocationsLoading}
              />
              <p className="text-xs text-muted-foreground">{tCount('targetStagingLocationHint')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCompleteDisposalDialog}>
              {t('cancel')}
            </Button>
            <Button
              onClick={submitCompleteDisposal}
              disabled={
                !completeDisposalDialog.targetLocationCode ||
                actionLoading === `complete-disposal:${completeDisposalDialog.detail?.disposalId}`
              }
            >
              {actionLoading === `complete-disposal:${completeDisposalDialog.detail?.disposalId}`
                ? tCount('completing')
                : tCount('completeProcessing')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={submitDialog.open} onOpenChange={(open) => setSubmitDialog((current) => ({ ...current, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tCount('submitDetailTitle')}</DialogTitle>
            <DialogDescription>
              {submitDialog.detail
                ? tCount('submitDetailDescription', {
                    batchNumber: formatMergedValue(submitDialog.detail.countBatchNumber),
                    skuCode: submitDialog.detail.skuCode,
                    locationCode: submitDialog.detail.locationCode,
                    count: isPendingDetailSummaryRow(submitDialog.detail) ? submitDialog.detail.detailCount : 1,
                  })
                : tCount('enterCountResult')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm md:grid-cols-2">
              <div>{tCount('bookQuantity')}: {submitDialog.detail?.bookQuantity ?? '-'}</div>
              <div>{tCount('currentStatus')}: {submitDialog.detail ? (
                isPendingDetailSummaryRow(submitDialog.detail)
                  ? getStatusSummaryLabel(submitDialog.detail.statusCounts)
                  : getDetailStatusLabel(submitDialog.detail.status)
              ) : '-'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">{tCount('countedQuantity')}</div>
              <Input
                type="number"
                min={0}
                step={1}
                value={submitDialog.countedQuantity}
                onChange={(event) => setSubmitDialog((current) => ({ ...current, countedQuantity: event.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={submitDialog.isEmptyLocation}
                onCheckedChange={(checked) => setSubmitDialog((current) => ({ ...current, isEmptyLocation: checked === true }))}
              />
              {tCount('emptyLocationConfirmed')}
            </label>
            <div className="space-y-1">
              <div className="text-sm font-medium">{tCount('exceptionReason')}</div>
              <Input
                value={submitDialog.exceptionReasonCode}
                onChange={(event) => setSubmitDialog((current) => ({ ...current, exceptionReasonCode: event.target.value }))}
                placeholder={tCount('exceptionReasonPlaceholder')}
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">{tCount('remark')}</div>
              <Textarea
                value={submitDialog.remark}
                onChange={(event) => setSubmitDialog((current) => ({ ...current, remark: event.target.value }))}
                placeholder={tCount('remarkPlaceholder')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeSubmitDialog}>{t('cancel')}</Button>
            <Button onClick={handleSubmitLine} disabled={!!submitDialog.detail && actionLoading === `submit:${submitDialog.detail.id}`}>
              {!!submitDialog.detail && actionLoading === `submit:${submitDialog.detail.id}` ? t('submitting') : t('submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assigneeDialog.open} onOpenChange={(open) => setAssigneeDialog((current) => ({ ...current, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {assigneeDialog.mode === 'bulk' ? tCount('bulkChangeAssignee') : tCount('changeAssignee')}
            </DialogTitle>
            <DialogDescription>
              {assigneeDialog.mode === 'bulk'
                ? tCount('bulkAssigneeDescription', { count: selectedBatchIds.length })
                : assigneeDialog.batch
                  ? `${assigneeDialog.batch.batchNumber} / ${tCount(`batchTypes.${assigneeDialog.batch.batchType}`)} / ${getBatchAssigneeLabel(assigneeDialog.batch)}`
                  : tCount('selectNewAssignee')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {assigneeDialog.batch && (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                {tCount('currentAssignee', {
                  label: getBatchAssigneeLabel(assigneeDialog.batch),
                  name: getBatchAssigneeName(assigneeDialog.batch) || tCount('noAssignee'),
                })}
              </div>
            )}
            <div className="space-y-1">
              <div className="text-sm font-medium">
                {assigneeDialog.mode === 'bulk'
                  ? tCount('targetAssignee')
                  : tCount('newAssignee', { label: getBatchAssigneeLabel(assigneeDialog.batch) })}
              </div>
              <EntitySelect
                value={assigneeDialog.assigneeUserId}
                onValueChange={(value) => setAssigneeDialog((current) => ({ ...current, assigneeUserId: value }))}
                options={userOptions}
                placeholder={tCount('selectUser')}
                searchPlaceholder={tCount('searchUser')}
                emptyText={tCount('noUserFound')}
                showAll
                allLabel={tCount('noAssignee')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAssigneeDialog}>{t('cancel')}</Button>
            <Button
              onClick={handleUpdateAssignee}
              disabled={
                assigneeDialog.mode === 'bulk'
                  ? actionLoading === 'batch-assignee:bulk'
                  : actionLoading === `batch-assignee:${assigneeDialog.batch?.id}`
              }
            >
              {(
                assigneeDialog.mode === 'bulk'
                  ? actionLoading === 'batch-assignee:bulk'
                  : actionLoading === `batch-assignee:${assigneeDialog.batch?.id}`
              ) ? tCount('changing') : tCount('confirmChange')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
