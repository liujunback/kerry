'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Download, Eye, Search } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { endOfDay, format, formatDateTime, startOfDay, subDays } from '@/lib/utils/date-formatter'
import {
  getReasonCategory,
  getReasonCategoryTranslationKey,
  getReasonCodeTranslationKey,
  reasonCodeTranslationKeys,
  resolveLocalizedText,
  type MatchedRuleSnapshotLike,
  type ReasonCategory,
} from '@/lib/wave-strategy/reason-codes'

interface WaveStrategyRunRow {
  id: string
  runMode: 'SIMULATE' | 'EXECUTE'
  triggerType: string
  runStatus: 'RUNNING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'
  candidateOrderCount: number
  matchedOrderCount: number
  claimedByHigherCount: number
  unclassifiedOrderCount: number
  createdWaveCount: number
  createdPickOrderCount: number
  startedAt: string
  finishedAt: string | null
  strategy: {
    strategyCode: string
    strategyName: string
    priority?: number
  }
  strategyVersion: {
    versionNo: number
  }
  reasonSummary?: Array<{
    reasonCode: string
    count: number
  }>
}

interface WaveStrategyRunDetail extends WaveStrategyRunRow {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  statusSummary: Record<'ALL' | 'MATCHED' | 'UNCLASSIFIED' | 'SKIPPED' | 'FAILED' | 'WAVED', number>
  batchSummary: {
    batchCount: number
    maxOrdersInBatch: number
    previewItems: Array<{
      batchNo: number
      count: number
    }>
  }
  reasonSummary: Array<{
    reasonCode: string
    count: number
  }>
  orders: Array<{
    id: string
    orderId: string
    order?: {
      orderNumber: string
      platformOrderId: string | null
    }
    batchNo: number
    matchedStrategy: boolean
    claimedByStrategyId: string | null
    waveTypeCode: string | null
    pickMode: string | null
    downstreamMode: string | null
    resultStatus: string
    waveId: string | null
    pickOrderId: string | null
    message: string | null
    matchedRuleSnapshot?: MatchedRuleSnapshotLike | null
    createdAt: string
  }>
}

const runStatusColors: Record<string, string> = {
  RUNNING: 'bg-blue-100 text-blue-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  PARTIAL_SUCCESS: 'bg-amber-100 text-amber-700',
  FAILED: 'bg-red-100 text-red-700',
}

const reasonCategories: ReasonCategory[] = ['ALL', 'CLAIMED', 'FILTER_MISS', 'HOT_SKU', 'FIXED_COMBO', 'NON_FIXED_COMBO', 'ORDER_STRUCTURE_CLASSIFY']
const reasonCodes = Object.keys(reasonCodeTranslationKeys)
type RunViewFilter = 'ALL' | 'FAILED' | 'PARTIAL_SUCCESS' | 'UNCLASSIFIED' | 'CLAIMED'
type TimePreset = 'all' | 'last24hours' | 'last7days' | 'last30days'
const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm:ss"
const detailPageSizeOptions = [20, 50, 100]

const formatDateTimeLocalValue = (value: Date) => format(value, DATETIME_LOCAL_FORMAT)

const normalizeBoundaryInputValue = (value: string, boundary: 'start' | 'end') => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return formatDateTimeLocalValue(boundary === 'end' ? endOfDay(parsed) : startOfDay(parsed))
}

function WaveStrategyRunsPageContent() {
  const tPage = useTranslations('waveStrategyRunsPage')
  const tReasons = useTranslations('waveStrategyReasons')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<WaveStrategyRunRow[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [strategyId, setStrategyId] = useState(searchParams.get('strategyId') || '')
  const [runMode, setRunMode] = useState(searchParams.get('runMode') || 'all')
  const [runStatus, setRunStatus] = useState(searchParams.get('runStatus') || 'all')
  const [reasonCode, setReasonCode] = useState(searchParams.get('reasonCode') || 'all')
  const [timePreset, setTimePreset] = useState<TimePreset>((searchParams.get('timePreset') as TimePreset) || 'all')
  const [startedAtFrom, setStartedAtFrom] = useState(searchParams.get('startedAtFrom') || '')
  const [startedAtTo, setStartedAtTo] = useState(searchParams.get('startedAtTo') || '')
  const [runViewFilter, setRunViewFilter] = useState<RunViewFilter>('ALL')
  const [selectedTrendDate, setSelectedTrendDate] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRunId, setDetailRunId] = useState<string | null>(null)
  const [detail, setDetail] = useState<WaveStrategyRunDetail | null>(null)
  const [detailReasonFilter, setDetailReasonFilter] = useState<ReasonCategory>('ALL')
  const [detailPage, setDetailPage] = useState(1)
  const [detailPageSize, setDetailPageSize] = useState(20)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const pagination: PaginationState = { pageIndex: page - 1, pageSize }
  const hasActiveFilters = Boolean(strategyId.trim()) || runMode !== 'all' || runStatus !== 'all' || reasonCode !== 'all' || timePreset !== 'all' || Boolean(startedAtFrom) || Boolean(startedAtTo)

  const getLocalizedReasonCodeLabel = useCallback((reasonCode?: string | null) => {
    const key = getReasonCodeTranslationKey(reasonCode)
    return key ? tReasons(key) : (reasonCode || '-')
  }, [tReasons])

  const getRunModeLabel = useCallback((value: WaveStrategyRunRow['runMode']) => {
    return value === 'SIMULATE' ? tPage('filters.simulate') : tPage('filters.execute')
  }, [tPage])

  const getRunStatusLabel = useCallback((value: WaveStrategyRunRow['runStatus']) => {
    if (value === 'RUNNING') return tPage('filters.running')
    if (value === 'SUCCESS') return tPage('filters.success')
    if (value === 'PARTIAL_SUCCESS') return tPage('filters.partialSuccess')
    if (value === 'FAILED') return tPage('filters.failed')
    return value
  }, [tPage])

  const getLocalizedText = (
    key?: string | null,
    params?: Record<string, string | number> | null,
    fallback?: string | null,
    empty = '-'
  ) => resolveLocalizedText(tReasons, key, params, fallback, empty)

  const getLocalizedRunMessage = (item: WaveStrategyRunDetail['orders'][number]) => getLocalizedText(
    item.matchedRuleSnapshot?.messageKey,
    item.matchedRuleSnapshot?.messageParams,
    item.message,
    ''
  )

  const copyText = useCallback(async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(successMessage)
    } catch {
      toast.error(tPage('messages.copyFailed'))
    }
  }, [tPage])

  const updateQuery = useCallback((next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    router.push(`/wave-strategy-runs?${params.toString()}`)
  }, [router, searchParams])

  const buildRunsPath = useCallback(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    if (strategyId.trim()) params.set('strategyId', strategyId.trim())
    if (runMode !== 'all') params.set('runMode', runMode)
    if (runStatus !== 'all') params.set('runStatus', runStatus)
    if (reasonCode !== 'all') params.set('reasonCode', reasonCode)
    if (timePreset !== 'all') params.set('timePreset', timePreset)
    if (startedAtFrom) params.set('startedAtFrom', startedAtFrom)
    if (startedAtTo) params.set('startedAtTo', startedAtTo)
    return `/wave-strategy-runs?${params.toString()}`
  }, [page, pageSize, strategyId, runMode, runStatus, reasonCode, timePreset, startedAtFrom, startedAtTo])

  const copyCurrentFilterLink = useCallback(async () => {
    if (typeof window === 'undefined') return
    const link = new URL(buildRunsPath(), window.location.origin).toString()
    await copyText(link, tPage('messages.filterLinkCopied'))
  }, [buildRunsPath, copyText, tPage])

  const applyReasonCodeFilter = useCallback((code?: string | null) => {
    if (!code) return
    setReasonCode(code)
    setRunViewFilter('ALL')
    setDetailOpen(false)
    updateQuery({ reasonCode: code })
  }, [updateQuery])

  const renderReasonSummary = useCallback((items?: Array<{ reasonCode: string; count: number }>) => {
    if (!items || items.length === 0) {
      return <span className="text-xs text-muted-foreground">-</span>
    }

    const visibleItems = items.slice(0, 2)
    const remainingCount = items.length - visibleItems.length

    return (
      <div className="space-y-1">
        {visibleItems.map((item) => (
          <button
            key={item.reasonCode}
            type="button"
            className="block text-left text-xs leading-5 hover:text-primary"
            onClick={() => {
              setReasonCode(item.reasonCode)
              updateQuery({ reasonCode: item.reasonCode })
            }}
          >
            <span className="font-mono">[{item.reasonCode}]</span>
            {' '}
            <span>{getLocalizedReasonCodeLabel(item.reasonCode)}</span>
            <span className="text-muted-foreground"> x {item.count}</span>
          </button>
        ))}
        {remainingCount > 0 ? (
          <div className="text-[11px] text-muted-foreground">{tPage('table.moreReasons', { count: remainingCount })}</div>
        ) : null}
      </div>
    )
  }, [getLocalizedReasonCodeLabel, tPage, updateQuery])

  const getReasonSummaryText = useCallback((items?: Array<{ reasonCode: string; count: number }>) => {
    if (!items || items.length === 0) return '-'
    return items
      .map((item) => `[${item.reasonCode}] ${getLocalizedReasonCodeLabel(item.reasonCode)} x ${item.count}`)
      .join(' | ')
  }, [getLocalizedReasonCodeLabel])

  const fetchRuns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (strategyId.trim()) params.set('strategyId', strategyId.trim())
      if (runMode !== 'all') params.set('runMode', runMode)
      if (runStatus !== 'all') params.set('runStatus', runStatus)
      if (reasonCode !== 'all') params.set('reasonCode', reasonCode)
      if (timePreset !== 'all') params.set('timePreset', timePreset)
      if (startedAtFrom) params.set('startedAtFrom', startedAtFrom)
      if (startedAtTo) params.set('startedAtTo', startedAtTo)

      const response = await fetch(`/api/v1/wave-strategy-runs?${params.toString()}`)
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || tPage('messages.loadFailed'))
      }
      setData(result.data || [])
      setTotal(result.pagination?.total || 0)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tPage('messages.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, strategyId, runMode, runStatus, reasonCode, timePreset, startedAtFrom, startedAtTo, tPage])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  const runOverview = useMemo(() => ({
    FAILED: data.filter((item) => item.runStatus === 'FAILED').length,
    PARTIAL_SUCCESS: data.filter((item) => item.runStatus === 'PARTIAL_SUCCESS').length,
    UNCLASSIFIED: data.filter((item) => item.unclassifiedOrderCount > 0).length,
    CLAIMED: data.filter((item) => item.claimedByHigherCount > 0).length,
  }), [data])

  const filteredRuns = useMemo(() => {
    switch (runViewFilter) {
      case 'FAILED':
        return data.filter((item) => item.runStatus === 'FAILED')
      case 'PARTIAL_SUCCESS':
        return data.filter((item) => item.runStatus === 'PARTIAL_SUCCESS')
      case 'UNCLASSIFIED':
        return data.filter((item) => item.unclassifiedOrderCount > 0)
      case 'CLAIMED':
        return data.filter((item) => item.claimedByHigherCount > 0)
      default:
        return data
    }
  }, [data, runViewFilter])

  const displayedRuns = useMemo(() => {
    if (!selectedTrendDate) return filteredRuns
    return filteredRuns.filter((item) => format(new Date(item.startedAt), 'yyyy-MM-dd') === selectedTrendDate)
  }, [filteredRuns, selectedTrendDate])

  const runViewLabel = useMemo(() => {
    if (runViewFilter === 'FAILED') return tPage('overview.failedRuns')
    if (runViewFilter === 'PARTIAL_SUCCESS') return tPage('overview.partialSuccessRuns')
    if (runViewFilter === 'UNCLASSIFIED') return tPage('overview.hasUnclassified')
    if (runViewFilter === 'CLAIMED') return tPage('overview.hasClaimed')
    return ''
  }, [runViewFilter, tPage])

  const currentPageReasonSummary = useMemo(() => {
    const counts = new Map<string, number>()

    for (const run of displayedRuns) {
      for (const item of run.reasonSummary || []) {
        counts.set(item.reasonCode, (counts.get(item.reasonCode) || 0) + item.count)
      }
    }

    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code))
      .slice(0, 6)
  }, [displayedRuns])

  const recentProblemTrendData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const date = subDays(new Date(), 6 - index)
      const key = format(date, 'yyyy-MM-dd')
      return {
        dateKey: key,
        dateLabel: format(date, 'MM-dd'),
        failedRuns: 0,
        unclassifiedRuns: 0,
        claimedRuns: 0,
      }
    })

    const bucketMap = new Map(buckets.map((item) => [item.dateKey, item]))
    for (const run of filteredRuns) {
      const key = format(new Date(run.startedAt), 'yyyy-MM-dd')
      const bucket = bucketMap.get(key)
      if (!bucket) continue
      if (run.runStatus === 'FAILED') bucket.failedRuns += 1
      if (run.unclassifiedOrderCount > 0) bucket.unclassifiedRuns += 1
      if (run.claimedByHigherCount > 0) bucket.claimedRuns += 1
    }

    return buckets
  }, [filteredRuns])

  const handleTrendChartClick = useCallback((state: unknown) => {
    if (!state || typeof state !== 'object') return
    const activePayload = 'activePayload' in state ? state.activePayload : undefined
    if (!Array.isArray(activePayload) || activePayload.length === 0) return
    const firstPayload = activePayload[0]
    if (!firstPayload || typeof firstPayload !== 'object') return
    const payload = 'payload' in firstPayload ? firstPayload.payload : undefined
    if (!payload || typeof payload !== 'object') return
    const dateKey = 'dateKey' in payload ? payload.dateKey : undefined
    if (typeof dateKey !== 'string' || !dateKey) return
    setSelectedTrendDate(dateKey)
  }, [])

  const exportFilteredRuns = useCallback(() => {
    if (displayedRuns.length === 0) {
      toast.error(tPage('messages.noExportData'))
      return
    }

    const rows = [
      ['strategyCode', 'strategyName', 'versionNo', 'runMode', 'runStatus', 'matchedOrderCount', 'claimedByHigherCount', 'unclassifiedOrderCount', 'createdWaveCount', 'createdPickOrderCount', 'reasonSummary', 'startedAt', 'finishedAt'],
      ...displayedRuns.map((item) => [
        item.strategy.strategyCode,
        item.strategy.strategyName,
        String(item.strategyVersion.versionNo),
        item.runMode,
        item.runStatus,
        String(item.matchedOrderCount),
        String(item.claimedByHigherCount),
        String(item.unclassifiedOrderCount),
        String(item.createdWaveCount),
        String(item.createdPickOrderCount),
        getReasonSummaryText(item.reasonSummary),
        formatDateTime(item.startedAt) || '-',
        formatDateTime(item.finishedAt) || '-',
      ]),
    ]

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wave-strategy-runs-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [displayedRuns, getReasonSummaryText, tPage])

  const detailReasonSummary = useMemo(() => {
    return detail?.reasonSummary || []
  }, [detail])

  const copyDetailSummary = useCallback(async () => {
    if (!detail) return

    const currentFilterLink = typeof window === 'undefined'
      ? buildRunsPath()
      : new URL(buildRunsPath(), window.location.origin).toString()

    const lines = [
      tPage('summary.strategy', { value: detail.strategy.strategyName }),
      tPage('summary.version', { value: detail.strategyVersion.versionNo }),
      tPage('summary.mode', { value: detail.runMode }),
      tPage('summary.status', { value: detail.runStatus }),
      tPage('summary.matched', { value: detail.matchedOrderCount }),
      tPage('summary.claimed', { value: detail.claimedByHigherCount }),
      tPage('summary.unclassified', { value: detail.unclassifiedOrderCount }),
      tPage('summary.wave', { value: detail.createdWaveCount }),
      tPage('summary.pickOrder', { value: detail.createdPickOrderCount }),
      tPage('summary.time', { value: formatDateTime(detail.finishedAt || detail.startedAt) || '-' }),
      tPage('summary.filterLink', { value: currentFilterLink }),
    ]

    if (detailReasonSummary.length > 0) {
      lines.push(tPage('summary.mainReasons'))
      for (const item of detailReasonSummary) {
        lines.push(`- ${item.reasonCode} / ${getLocalizedReasonCodeLabel(item.reasonCode)} x ${item.count}`)
      }
    }

    await copyText(lines.join('\n'), tPage('messages.summaryCopied'))
  }, [buildRunsPath, copyText, detail, detailReasonSummary, getLocalizedReasonCodeLabel, tPage])

  const handlePaginationChange = (nextPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(nextPagination.pageIndex + 1))
    params.set('pageSize', String(nextPagination.pageSize))
    router.push(`/wave-strategy-runs?${params.toString()}`)
  }

  const clearAllFilters = useCallback(() => {
    setStrategyId('')
    setRunMode('all')
    setRunStatus('all')
    setReasonCode('all')
    setTimePreset('all')
    setStartedAtFrom('')
    setStartedAtTo('')
    setRunViewFilter('ALL')
    setSelectedTrendDate(null)
    router.push('/wave-strategy-runs')
  }, [router])

  const openDetail = useCallback((runId: string) => {
    setDetail(null)
    setDetailRunId(runId)
    setDetailReasonFilter('ALL')
    setDetailPage(1)
    setDetailPageSize(20)
    setDetailOpen(true)
  }, [])

  const renderMatchReason = (item: WaveStrategyRunDetail['orders'][number]) => {
    if (item.matchedRuleSnapshot?.reasonKey || item.matchedRuleSnapshot?.reason) {
      return getLocalizedText(
        item.matchedRuleSnapshot?.reasonKey,
        item.matchedRuleSnapshot?.reasonParams,
        item.matchedRuleSnapshot?.reason
      )
    }

    const filterGroups = item.matchedRuleSnapshot?.filter?.groups || []
    const filterReason = filterGroups.length > 0
      ? filterGroups
          .map((group) => {
            const matchedConditions = group.conditions.filter((condition) => condition.matched)
            return tReasons('ui.groupSummary', {
              groupNo: group.groupNo,
              status: group.matched ? tReasons('ui.groupMatched') : tReasons('ui.groupMissed'),
              details: matchedConditions
                .map((condition) => getLocalizedText(condition.reasonKey, condition.reasonParams, condition.reason, ''))
                .filter(Boolean)
                .join(tReasons('ui.conditionSeparator')) || tReasons('ui.noMatchedConditions'),
            })
          })
          .join(' | ')
      : ''

    const classificationReason = getLocalizedText(
      item.matchedRuleSnapshot?.classification?.reasonKey,
      item.matchedRuleSnapshot?.classification?.reasonParams,
      item.matchedRuleSnapshot?.classification?.reason,
      ''
    )
    const reasonCode = item.matchedRuleSnapshot?.reasonCode || item.matchedRuleSnapshot?.classification?.reasonCode
    const reasonCodeLabel = getLocalizedReasonCodeLabel(reasonCode)
    return [reasonCode ? `[${reasonCode}]` : '', reasonCodeLabel, filterReason, classificationReason, getLocalizedRunMessage(item)].filter(Boolean).join(' | ') || '-'
  }

  const renderMatchReasonDetails = (item: WaveStrategyRunDetail['orders'][number]) => {
    const filter = item.matchedRuleSnapshot?.filter
    const classification = item.matchedRuleSnapshot?.classification
    const reasonCode = item.matchedRuleSnapshot?.reasonCode || item.matchedRuleSnapshot?.classification?.reasonCode

    return (
      <div className="space-y-3 text-xs">
        {filter?.groups?.length ? (
          <div className="space-y-2">
            <div className="font-medium">{tPage('detail.filterMatched')}</div>
            {filter.groups.map((group) => (
              <div key={group.groupNo} className="rounded-md border p-2">
                <div className="font-medium text-[11px]">
                  {tPage('detail.groupTitle', {
                    groupNo: group.groupNo,
                    status: group.matched ? tPage('detail.matched') : tPage('detail.notMatched'),
                  })}
                </div>
                <div className="mt-2 space-y-1 text-muted-foreground">
                  {group.conditions.map((condition, index) => (
                    <div key={`${group.groupNo}-${index}`}>
                      {getLocalizedText(condition.reasonKey, condition.reasonParams, condition.reason)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {classification ? (
          <div className="space-y-1">
            <div className="font-medium">{tPage('detail.classification')}</div>
            <div className="text-muted-foreground">{tPage('detail.targetType', { value: classification.targetCode || '-' })}</div>
            <div className="text-muted-foreground">{tPage('detail.orderStructure', { value: classification.orderType || '-' })}</div>
            <div className="text-muted-foreground">{tPage('detail.hotMatched', { value: classification.isHotMatched ? tPage('detail.yes') : tPage('detail.no') })}</div>
            <div className="text-muted-foreground">{tPage('detail.fixedComboMatched', { value: classification.fixedComboMatched ? tPage('detail.yes') : tPage('detail.no') })}</div>
            <div className="text-muted-foreground">
              {getLocalizedText(classification.reasonKey, classification.reasonParams, classification.reason)}
            </div>
          </div>
        ) : null}
        {(item.matchedRuleSnapshot?.reasonKey || item.matchedRuleSnapshot?.reason) ? (
          <div className="space-y-1">
            <div className="font-medium">{tPage('detail.additionalReason')}</div>
            <div className="text-muted-foreground">
              {getLocalizedText(
                item.matchedRuleSnapshot?.reasonKey,
                item.matchedRuleSnapshot?.reasonParams,
                item.matchedRuleSnapshot?.reason
              )}
            </div>
          </div>
        ) : null}
        {reasonCode ? (
          <div className="space-y-1">
            <div className="font-medium">{tPage('detail.reasonCode')}</div>
            <div className="text-muted-foreground font-mono">
              {reasonCode}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => applyReasonCodeFilter(reasonCode)}
            >
              {tPage('buttons.filterSameReason')}
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  useEffect(() => {
    if (!detailOpen || !detailRunId) return

    let cancelled = false

    const fetchDetail = async () => {
      try {
        const params = new URLSearchParams({
          page: String(detailPage),
          pageSize: String(detailPageSize),
        })
        if (detailReasonFilter !== 'ALL') params.set('reasonCategory', detailReasonFilter)

        const response = await fetch(`/api/v1/wave-strategy-runs/${detailRunId}?${params.toString()}`)
        const result = await response.json()
        if (!result.success) {
          throw new Error(result.message || tPage('messages.loadDetailFailed'))
        }

        if (!cancelled) {
          setDetail(result.data)
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : tPage('messages.loadDetailFailed'))
        }
      }
    }

    void fetchDetail()

    return () => {
      cancelled = true
    }
  }, [detailOpen, detailPage, detailPageSize, detailReasonFilter, detailRunId, tPage])

  const detailRangeStart = !detail || detail.pagination.total === 0 ? 0 : (detail.pagination.page - 1) * detail.pagination.pageSize + 1
  const detailRangeEnd = !detail || detail.pagination.total === 0 ? 0 : Math.min(detail.pagination.page * detail.pagination.pageSize, detail.pagination.total)

  const columns: ColumnDef<WaveStrategyRunRow>[] = useMemo(
    () => [
      {
        id: 'strategy',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tPage('table.strategyInfo')} />,
        accessorFn: (row) => row.strategy.strategyCode,
        size: 280,
        cell: ({ row }) => (
          <div className="min-w-0 space-y-2 py-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-orange-50 px-2 py-1 font-mono text-[11px] text-orange-700 ring-1 ring-orange-100">
                {row.original.strategy.strategyCode}
              </span>
              <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium">
                V{row.original.strategyVersion.versionNo}
              </span>
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium">{row.original.strategy.strategyName}</div>
              <div className="text-[11px] text-muted-foreground">
                {tPage('table.priority', { value: row.original.strategy.priority ?? '-' })}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'runInfo',
        header: tPage('table.runInfo'),
        size: 230,
        cell: ({ row }) => (
          <div className="space-y-2 py-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">
                {getRunModeLabel(row.original.runMode)}
              </Badge>
              <Badge className={runStatusColors[row.original.runStatus] || 'bg-slate-100 text-slate-700'}>
                {getRunStatusLabel(row.original.runStatus)}
              </Badge>
            </div>
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <div>{tPage('table.startedAtLabel', { value: formatDateTime(row.original.startedAt) || '-' })}</div>
              <div>{tPage('table.finishedAtLabel', { value: formatDateTime(row.original.finishedAt) || tPage('table.notFinished') })}</div>
            </div>
          </div>
        ),
      },
      {
        id: 'resultSummary',
        header: tPage('table.resultSummary'),
        size: 320,
        cell: ({ row }) => (
          <div className="grid grid-cols-2 gap-2 py-1">
            <div className="rounded-md bg-muted/20 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">{tPage('table.matchedShort')}</div>
              <div className="mt-1 text-xs font-medium tabular-nums">{row.original.matchedOrderCount}</div>
            </div>
            <div className="rounded-md bg-muted/20 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">{tPage('table.waveShort')}</div>
              <div className="mt-1 text-xs font-medium tabular-nums">{row.original.createdWaveCount}</div>
            </div>
            <div className="rounded-md bg-muted/20 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">{tPage('table.pickShort')}</div>
              <div className="mt-1 text-xs font-medium tabular-nums">{row.original.createdPickOrderCount}</div>
            </div>
            <div className="rounded-md bg-muted/20 px-3 py-2">
              <div className="text-[10px] text-muted-foreground">{tPage('table.candidateShort')}</div>
              <div className="mt-1 text-xs font-medium tabular-nums">{row.original.candidateOrderCount}</div>
            </div>
          </div>
        ),
      },
      {
        id: 'problemSummary',
        header: tPage('table.problemSummary'),
        size: 220,
        cell: ({ row }) => (
          <div className="space-y-2 py-1">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md bg-sky-50 px-2 py-1 text-[11px] text-sky-700 ring-1 ring-sky-100">
                {tPage('table.claimed', { count: row.original.claimedByHigherCount })}
              </span>
              <span className="rounded-md bg-orange-50 px-2 py-1 text-[11px] text-orange-700 ring-1 ring-orange-100">
                {tPage('table.unclassified', { count: row.original.unclassifiedOrderCount })}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {tPage('table.matched', { count: row.original.matchedOrderCount })}
            </div>
          </div>
        ),
      },
      {
        id: 'reasonSummary',
        header: tPage('table.mainReasons'),
        size: 240,
        cell: ({ row }) => renderReasonSummary(row.original.reasonSummary),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">{tPage('table.actions')}</div>,
        size: 120,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => openDetail(row.original.id)}>
              <Eye className="h-4 w-4" />
              {tPage('buttons.detail')}
            </Button>
          </div>
        ),
      },
    ],
    [getRunModeLabel, getRunStatusLabel, openDetail, renderReasonSummary, tPage]
  )

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: tPage('breadcrumb.outbound'), href: '/orders' }, { label: tPage('breadcrumb.strategies'), href: '/wave-strategies' }, { label: tPage('title') }]} />

      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{tPage('title')}</h1>
            <p className="text-sm text-muted-foreground">{tPage('description')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportFilteredRuns}>
              <Download className="h-4 w-4" />
              {tPage('buttons.exportCurrent')}
            </Button>
            <Button variant="outline" onClick={() => void copyCurrentFilterLink()}>
              {tPage('buttons.copyFilterLink')}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/wave-strategies">{tPage('buttons.backToStrategies')}</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_220px_220px] gap-3">
            <div className="flex gap-2">
              <Input
                value={strategyId}
                onChange={(e) => setStrategyId(e.target.value)}
                placeholder={tPage('filters.strategyIdPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && updateQuery({ strategyId })}
              />
              <Button variant="outline" onClick={() => updateQuery({ strategyId })}>
                <Search className="h-4 w-4" />
                {tPage('filters.search')}
              </Button>
            </div>
            <Select value={runMode} onValueChange={(value) => { setRunMode(value); updateQuery({ runMode: value }) }}>
              <SelectTrigger>
                <SelectValue placeholder={tPage('filters.allMode')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tPage('filters.allMode')}</SelectItem>
                <SelectItem value="SIMULATE">{tPage('filters.simulate')}</SelectItem>
                <SelectItem value="EXECUTE">{tPage('filters.execute')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={runStatus} onValueChange={(value) => { setRunStatus(value); updateQuery({ runStatus: value }) }}>
              <SelectTrigger>
                <SelectValue placeholder={tPage('filters.allStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tPage('filters.allStatus')}</SelectItem>
                <SelectItem value="RUNNING">{tPage('filters.running')}</SelectItem>
                <SelectItem value="SUCCESS">{tPage('filters.success')}</SelectItem>
                <SelectItem value="PARTIAL_SUCCESS">{tPage('filters.partialSuccess')}</SelectItem>
                <SelectItem value="FAILED">{tPage('filters.failed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)_1fr_auto] gap-3">
            <Select value={reasonCode} onValueChange={(value) => { setReasonCode(value); updateQuery({ reasonCode: value }) }}>
              <SelectTrigger>
                <SelectValue placeholder={tPage('filters.allReasonCode')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tPage('filters.allReasonCode')}</SelectItem>
                {reasonCodes.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code} / {getLocalizedReasonCodeLabel(code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'all', label: tPage('filters.allTime') },
                { value: 'last24hours', label: tPage('filters.last24hours') },
                { value: 'last7days', label: tPage('filters.last7days') },
                { value: 'last30days', label: tPage('filters.last30days') },
              ] as const).map((item) => (
                <Button
                  key={item.value}
                  variant={timePreset === item.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTimePreset(item.value)
                    setStartedAtFrom('')
                    setStartedAtTo('')
                    updateQuery({ timePreset: item.value })
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{tPage('filters.startedAtFrom')}</div>
                <Input
                  type="datetime-local"
                  value={startedAtFrom}
                  onChange={(e) => {
                    setTimePreset('all')
                    setStartedAtFrom(normalizeBoundaryInputValue(e.target.value, 'start'))
                  }}
                  step={1}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">{tPage('filters.startedAtTo')}</div>
                <Input
                  type="datetime-local"
                  value={startedAtTo}
                  onChange={(e) => {
                    setTimePreset('all')
                    setStartedAtTo(normalizeBoundaryInputValue(e.target.value, 'end'))
                  }}
                  step={1}
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => updateQuery({
                  timePreset: timePreset === 'all' ? null : timePreset,
                  startedAtFrom: startedAtFrom || null,
                  startedAtTo: startedAtTo || null,
                })}
              >
                {tPage('buttons.applyTime')}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{tPage('overview.kpiTitle')}</div>
                  <div className="text-[11px] text-muted-foreground">{tPage('overview.kpiDesc')}</div>
                </div>
                {runViewFilter !== 'ALL' ? (
                  <Button variant="ghost" size="sm" onClick={() => setRunViewFilter('ALL')}>
                    {tPage('buttons.clearRunView')}
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`rounded-md px-3 py-3 text-left ${runViewFilter === 'FAILED' ? 'bg-red-50 ring-1 ring-red-200' : 'bg-muted/30'}`}
                  onClick={() => setRunViewFilter('FAILED')}
                >
                  <div className="text-xs text-muted-foreground">{tPage('overview.failedRuns')}</div>
                  <div className="mt-1 text-lg font-semibold text-red-700">{runOverview.FAILED}</div>
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-3 text-left ${runViewFilter === 'PARTIAL_SUCCESS' ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-muted/30'}`}
                  onClick={() => setRunViewFilter('PARTIAL_SUCCESS')}
                >
                  <div className="text-xs text-muted-foreground">{tPage('overview.partialSuccessRuns')}</div>
                  <div className="mt-1 text-lg font-semibold text-amber-700">{runOverview.PARTIAL_SUCCESS}</div>
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-3 text-left ${runViewFilter === 'UNCLASSIFIED' ? 'bg-orange-50 ring-1 ring-orange-200' : 'bg-muted/30'}`}
                  onClick={() => setRunViewFilter('UNCLASSIFIED')}
                >
                  <div className="text-xs text-muted-foreground">{tPage('overview.hasUnclassified')}</div>
                  <div className="mt-1 text-lg font-semibold text-orange-700">{runOverview.UNCLASSIFIED}</div>
                </button>
                <button
                  type="button"
                  className={`rounded-md px-3 py-3 text-left ${runViewFilter === 'CLAIMED' ? 'bg-sky-50 ring-1 ring-sky-200' : 'bg-muted/30'}`}
                  onClick={() => setRunViewFilter('CLAIMED')}
                >
                  <div className="text-xs text-muted-foreground">{tPage('overview.hasClaimed')}</div>
                  <div className="mt-1 text-lg font-semibold text-sky-700">{runOverview.CLAIMED}</div>
                </button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="font-medium">{tPage('overview.currentViewTitle')}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{tPage('overview.currentViewDesc')}</div>
              <div className="mt-3 space-y-2 text-[12px]">
                <div className="rounded-md bg-muted/20 px-3 py-2">
                  {selectedTrendDate
                    ? tPage('overview.dayViewLabel', { date: selectedTrendDate })
                    : tPage('overview.dayViewAll')}
                </div>
                <div className="rounded-md bg-muted/20 px-3 py-2">
                  {runViewFilter !== 'ALL'
                    ? tPage('overview.runViewLabel', { label: runViewLabel })
                    : tPage('overview.runViewAll')}
                </div>
                <div className="rounded-md bg-muted/20 px-3 py-2">
                  {tPage('overview.currentRecords', { count: displayedRuns.length })}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedTrendDate ? (
                  <Button variant="outline" size="sm" onClick={() => setSelectedTrendDate(null)}>
                    {tPage('buttons.clearDayView')}
                  </Button>
                ) : null}
                {hasActiveFilters ? (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    {tPage('buttons.clearFilters')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{tPage('overview.summaryTitle')}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {tPage('overview.summaryDesc')}
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {tPage('overview.currentRecords', { count: displayedRuns.length })}
                </div>
              </div>

              {currentPageReasonSummary.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {currentPageReasonSummary.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className={`w-full rounded-md border px-3 py-2 text-left hover:bg-muted/40 ${reasonCode === item.code ? 'bg-muted/40 ring-1 ring-border' : ''}`}
                      onClick={() => {
                        setReasonCode(item.code)
                        updateQuery({ reasonCode: item.code })
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-mono text-xs">{item.code}</div>
                          <div className="truncate text-sm">{getLocalizedReasonCodeLabel(item.code)}</div>
                        </div>
                        <div className="text-sm font-semibold tabular-nums">{item.count}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-muted-foreground">{tPage('overview.noSummary')}</div>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{tPage('overview.trendTitle')}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {tPage('overview.trendDesc')}
                  </div>
                </div>
                {selectedTrendDate ? (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTrendDate(null)}>
                    {tPage('buttons.clearDayView')}
                  </Button>
                ) : null}
              </div>
              <div className="mt-4 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={recentProblemTrendData} onClick={handleTrendChartClick}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '12px' }} iconType="line" />
                    <Line
                      type="monotone"
                      dataKey="failedRuns"
                      name={tPage('chart.failedRuns')}
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="unclassifiedRuns"
                      name={tPage('chart.unclassifiedRuns')}
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ fill: '#f97316', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="claimedRuns"
                      name={tPage('chart.claimedRuns')}
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      dot={{ fill: '#0ea5e9', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {recentProblemTrendData.map((item) => (
                  <Button
                    key={item.dateKey}
                    variant={selectedTrendDate === item.dateKey ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTrendDate(item.dateKey)}
                  >
                    {item.dateLabel}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DataTable
          tableId="wave-strategy-runs"
          columns={columns}
          data={displayedRuns}
          enableColumnVisibility={false}
          total={runViewFilter === 'ALL' && !selectedTrendDate ? total : displayedRuns.length}
          pagination={runViewFilter === 'ALL' && !selectedTrendDate ? pagination : { pageIndex: 0, pageSize }}
          onPaginationChange={runViewFilter === 'ALL' && !selectedTrendDate ? handlePaginationChange : undefined}
          manualPagination={runViewFilter === 'ALL' && !selectedTrendDate}
          loading={loading}
        />
      </div>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) {
            setDetailRunId(null)
          }
        }}
      >
        <DialogContent className="flex max-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col overflow-hidden p-0 sm:rounded-xl">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>{tPage('detail.title')}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => void copyDetailSummary()}>
                  {tPage('buttons.copySummary')}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">{tPage('detail.strategy')}</div>
                  <div className="font-medium">{detail.strategy.strategyName}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">{tPage('detail.version')}</div>
                  <div className="font-medium">V{detail.strategyVersion.versionNo}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">{tPage('detail.mode')}</div>
                  <div className="font-medium">{getRunModeLabel(detail.runMode)}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">{tPage('detail.status')}</div>
                  <div className="font-medium">{getRunStatusLabel(detail.runStatus)}</div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                <div className="rounded-md border p-4 text-sm">
                  <div className="font-medium mb-2">{tPage('detail.priorityDecision')}</div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-md bg-muted/30 px-3 py-2">
                      <div className="text-muted-foreground">{tPage('detail.currentPriority')}</div>
                      <div className="font-medium">{detail.strategy.priority ?? '-'}</div>
                    </div>
                    <div className="rounded-md bg-muted/30 px-3 py-2">
                      <div className="text-muted-foreground">{tPage('detail.claimedByHigher')}</div>
                      <div className="font-medium">{detail.claimedByHigherCount}</div>
                    </div>
                    <div className="rounded-md bg-muted/30 px-3 py-2">
                      <div className="text-muted-foreground">{tPage('detail.matchedCurrent')}</div>
                      <div className="font-medium">{detail.matchedOrderCount}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-4 text-sm">
                  <div className="font-medium mb-2">结果概览</div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-md bg-muted/30 px-3 py-2">
                      <div className="text-muted-foreground">候选订单</div>
                      <div className="font-medium">{detail.candidateOrderCount}</div>
                    </div>
                    <div className="rounded-md bg-muted/30 px-3 py-2">
                      <div className="text-muted-foreground">命中订单</div>
                      <div className="font-medium">{detail.matchedOrderCount}</div>
                    </div>
                    <div className="rounded-md bg-muted/30 px-3 py-2">
                      <div className="text-muted-foreground">未归类</div>
                      <div className="font-medium">{detail.unclassifiedOrderCount}</div>
                    </div>
                    <div className="rounded-md bg-muted/30 px-3 py-2">
                      <div className="text-muted-foreground">生成波次</div>
                      <div className="font-medium">{detail.createdWaveCount}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 rounded-md border p-3">
                {reasonCategories.map((category) => (
                  <Button
                    key={category}
                    variant={detailReasonFilter === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setDetailPage(1)
                      setDetailReasonFilter(category)
                    }}
                  >
                    {tReasons(getReasonCategoryTranslationKey(category))}
                  </Button>
                ))}
              </div>

              <div className="rounded-md border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="font-medium">订单明细</div>
                  <div className="text-xs text-muted-foreground">
                    当前结果 {detail.pagination.total} 条 · 第 {detail.pagination.page}/{detail.pagination.totalPages} 页
                  </div>
                </div>
                <div className="space-y-3">
                  {detail.orders.map((item) => (
                    <div key={item.id} className="rounded-lg border bg-background p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-muted-foreground">订单号：{item.order?.orderNumber || item.orderId}</span>
                            {item.order?.platformOrderId ? (
                              <span className="font-mono text-xs text-muted-foreground">平台单号：{item.order.platformOrderId}</span>
                            ) : null}
                            <span className="rounded-md bg-muted px-2 py-1 text-[11px]">批次 {item.batchNo}</span>
                            <Badge variant="outline">
                              {item.claimedByStrategyId ? tPage('detail.claimedBadge') : item.matchedStrategy ? tPage('detail.matchedBadge') : tPage('detail.notMatchedBadge')}
                            </Badge>
                            <Badge variant="outline">{tReasons(getReasonCategoryTranslationKey(getReasonCategory(item.matchedRuleSnapshot)))}</Badge>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                            <div className="rounded-md bg-muted/20 px-3 py-2">
                              <div>{tPage('detail.waveType')}</div>
                              <div className="mt-1 font-medium text-foreground">{item.waveTypeCode || '-'}</div>
                            </div>
                            <div className="rounded-md bg-muted/20 px-3 py-2">
                              <div>{tPage('detail.downstreamMode')}</div>
                              <div className="mt-1 font-medium text-foreground">{item.downstreamMode || '-'}</div>
                            </div>
                            <div className="rounded-md bg-muted/20 px-3 py-2">
                              <div>{tPage('detail.status')}</div>
                              <div className="mt-1 font-medium text-foreground">{item.resultStatus}</div>
                            </div>
                          </div>
                        </div>

                        <div className="w-full xl:w-[48%] xl:min-w-[360px]">
                          <div className="text-xs leading-5 text-muted-foreground">
                            {[getLocalizedReasonCodeLabel(item.matchedRuleSnapshot?.reasonCode || item.matchedRuleSnapshot?.classification?.reasonCode), renderMatchReason(item)]
                              .filter((text) => text && text !== '-')
                              .join(' | ') || '-'}
                          </div>
                          <details className="mt-3 rounded-md border bg-muted/20 px-3 py-2">
                            <summary className="cursor-pointer text-[11px] text-primary">{tPage('detail.viewMatchDetail')}</summary>
                            <div className="mt-2">
                              {renderMatchReasonDetails(item)}
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  ))}
                  {detail.pagination.total === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">暂无明细数据</div>
                  ) : null}
                  {detail.pagination.total > 0 ? (
                    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>显示 {detailRangeStart}-{detailRangeEnd} / {detail.pagination.total}</span>
                        <span>每页</span>
                        <Select
                          value={detailPageSize.toString()}
                          onValueChange={(value) => {
                            setDetailPage(1)
                            setDetailPageSize(Number(value))
                          }}
                        >
                          <SelectTrigger className="h-8 w-[78px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {detailPageSizeOptions.map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>条</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={detail.pagination.page <= 1}
                          onClick={() => setDetailPage((current) => Math.max(1, current - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          上一页
                        </Button>
                        <span className="text-sm text-muted-foreground">第 {detail.pagination.page} / {detail.pagination.totalPages} 页</span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={detail.pagination.page >= detail.pagination.totalPages}
                          onClick={() => setDetailPage((current) => Math.min(detail.pagination.totalPages, current + 1))}
                        >
                          下一页
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function WaveStrategyRunsPage() {
  return <WaveStrategyRunsPageContent />
}
