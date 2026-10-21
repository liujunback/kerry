'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ColumnDef, PaginationState } from '@tanstack/react-table'
import { MoreHorizontal, Search, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { StrategyVersionDialog } from '@/components/wave-strategies/strategy-version-dialog'
import { StrategySimulateDrawer } from '@/components/wave-strategies/strategy-simulate-drawer'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getReasonCodeTranslationKey } from '@/lib/wave-strategy/reason-codes'
import { useCachedOptions } from '@/lib/hooks/use-cached-options'

interface ClientOption {
  id: string
  clientCode: string
  clientName: string
}

interface WaveStrategyFilterOptionSet {
  platforms: string[]
  shippingMethods: string[]
}

interface WaveStrategyRow {
  id: string
  warehouseId: string
  strategyCode: string
  strategyName: string
  description: string | null
  priority: number
  status: 'DRAFT' | 'ENABLED' | 'DISABLED' | 'ARCHIVED'
  latestVersionNo: number
  createdAt: string
  updatedAt: string
  warehouse?: {
    warehouseName: string
    warehouseCode: string
  }
  currentVersion?: {
    id: string
    versionNo: number
    versionStatus: string
    publishedAt: string | null
    ruleSet?: {
      triggerConfigJson: {
        modes: string[]
      }
    } | null
  } | null
  versions?: Array<{
    id: string
    versionNo: number
    versionStatus: string
    isCurrent: boolean
    changeSummary: string | null
    configSnapshot?: unknown
    publishedAt: string | null
    publishedBy: string | null
    createdAt: string
  }>
  priorityConflictSummary?: {
    higherPriorityCount: number
    samePriorityCount: number
    lowerPriorityCount: number
    higherPriorityStrategies: Array<{ id: string; strategyCode: string; strategyName: string; priority: number }>
    samePriorityStrategies: Array<{ id: string; strategyCode: string; strategyName: string; priority: number }>
    lowerPriorityStrategies: Array<{ id: string; strategyCode: string; strategyName: string; priority: number }>
  }
  latestRunSummary?: {
    simulate?: {
      id: string
      runMode: 'SIMULATE'
      runStatus: string
      startedAt: string
      finishedAt: string | null
      candidateOrderCount: number
      matchedOrderCount: number
      claimedByHigherCount: number
      unclassifiedOrderCount: number
      createdWaveCount: number
      createdPickOrderCount: number
      reasonSummary: Array<{ reasonCode: string; count: number }>
    } | null
    execute?: {
      id: string
      runMode: 'EXECUTE'
      runStatus: string
      startedAt: string
      finishedAt: string | null
      candidateOrderCount: number
      matchedOrderCount: number
      claimedByHigherCount: number
      unclassifiedOrderCount: number
      createdWaveCount: number
      createdPickOrderCount: number
      reasonSummary: Array<{ reasonCode: string; count: number }>
    } | null
  }
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ENABLED: 'bg-emerald-100 text-emerald-700',
  DISABLED: 'bg-amber-100 text-amber-700',
  ARCHIVED: 'bg-zinc-100 text-zinc-700',
}

const riskBadgeClasses: Record<'HIGH' | 'MEDIUM' | 'LOW' | 'NONE', string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-sky-100 text-sky-700',
  NONE: 'bg-zinc-100 text-zinc-700',
}

type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
type StrategyRunItem = NonNullable<NonNullable<WaveStrategyRow['latestRunSummary']>['simulate']> | NonNullable<NonNullable<WaveStrategyRow['latestRunSummary']>['execute']>
const BELOW_MINIMUM_REASON_CODE = 'WAVE_SIZE_BELOW_MINIMUM'

function getRunCandidateOrderCount(run: StrategyRunItem) {
  return run.candidateOrderCount
    || run.matchedOrderCount + run.unclassifiedOrderCount + run.claimedByHigherCount
}

function getReasonCount(run: StrategyRunItem, reasonCode: string) {
  return run.reasonSummary?.find((item) => item.reasonCode === reasonCode)?.count || 0
}

function isBelowMinimumOnlyRun(run: StrategyRunItem) {
  return run.runStatus !== 'FAILED'
    && run.unclassifiedOrderCount > 0
    && run.claimedByHigherCount === 0
    && getReasonCount(run, BELOW_MINIMUM_REASON_CODE) >= run.unclassifiedOrderCount
}

function getRunRiskLevel(run: StrategyRunItem): RiskLevel {
  if (run.runStatus === 'FAILED') return 'HIGH'
  if (isBelowMinimumOnlyRun(run)) return 'LOW'

  const candidateOrderCount = getRunCandidateOrderCount(run)
  const unclassifiedRatio = candidateOrderCount > 0 ? run.unclassifiedOrderCount / candidateOrderCount : 0
  if (run.unclassifiedOrderCount > 50 || unclassifiedRatio > 0.05) return 'HIGH'
  if (run.unclassifiedOrderCount > 0) return 'MEDIUM'
  if (run.runStatus === 'PARTIAL_SUCCESS' || run.claimedByHigherCount > 0) return 'MEDIUM'

  return 'LOW'
}

function isProblemRun(run?: StrategyRunItem | null) {
  if (!run) return false
  return run.runStatus === 'FAILED'
    || run.runStatus === 'PARTIAL_SUCCESS'
    || run.unclassifiedOrderCount > 0
    || run.claimedByHigherCount > 0
}

function WaveStrategiesPageContent() {
  const tPage = useTranslations('waveStrategyPage')
  const tReasons = useTranslations('waveStrategyReasons')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<WaveStrategyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [clientId, setClientId] = useState(searchParams.get('clientId') || '')
  const [shippingMethod, setShippingMethod] = useState(searchParams.get('shippingMethod') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [activeStrategy, setActiveStrategy] = useState<WaveStrategyRow | null>(null)
  const [versionDialogOpen, setVersionDialogOpen] = useState(false)
  const [simulateDrawerOpen, setSimulateDrawerOpen] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copyTarget, setCopyTarget] = useState<WaveStrategyRow | null>(null)
  const [copyForm, setCopyForm] = useState({ strategyCode: '', strategyName: '' })

  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const pagination: PaginationState = { pageIndex: page - 1, pageSize }

  const { options: clientOptions, loading: clientOptionsLoading } = useCachedOptions<ClientOption>({
    cacheKey: 'wave-strategy:list:clients:active',
    fetcher: async () => {
      const response = await fetch('/api/v1/clients?pageSize=100&isActive=true')
      const result = await response.json()
      return result.success ? (result.data || []) : []
    },
  })

  const { options: filterOptions, loading: filterOptionsLoading } = useCachedOptions<WaveStrategyFilterOptionSet>({
    cacheKey: 'wave-strategy:list:filter-options',
    fetcher: async () => {
      const response = await fetch('/api/v1/wave-strategies/filter-options')
      const result = await response.json()
      return result.success
        ? [result.data as WaveStrategyFilterOptionSet]
        : [{ platforms: [], shippingMethods: [] }]
    },
  })
  const shippingMethodOptions = filterOptions[0]?.shippingMethods || []

  const copyText = useCallback(async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(successMessage)
    } catch {
      toast.error(tPage('messages.copyFailed'))
    }
  }, [tPage])

  const fetchStrategies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (search.trim()) params.set('search', search.trim())
      if (clientId) params.set('clientId', clientId)
      if (shippingMethod.trim()) params.set('shippingMethod', shippingMethod.trim())
      if (status !== 'all') params.set('status', status)

      const response = await fetch(`/api/v1/wave-strategies?${params.toString()}`)
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
  }, [clientId, page, pageSize, search, shippingMethod, status, tPage])

  useEffect(() => {
    fetchStrategies()
  }, [fetchStrategies])

  const handlePaginationChange = (nextPagination: PaginationState) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(nextPagination.pageIndex + 1))
    params.set('pageSize', String(nextPagination.pageSize))
    router.push(`/wave-strategies?${params.toString()}`)
  }

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (search.trim()) {
      params.set('search', search.trim())
    } else {
      params.delete('search')
    }
    if (clientId) {
      params.set('clientId', clientId)
    } else {
      params.delete('clientId')
    }
    if (shippingMethod.trim()) {
      params.set('shippingMethod', shippingMethod.trim())
    } else {
      params.delete('shippingMethod')
    }
    router.push(`/wave-strategies?${params.toString()}`)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (search.trim()) {
      params.set('search', search.trim())
    } else {
      params.delete('search')
    }
    if (clientId) {
      params.set('clientId', clientId)
    } else {
      params.delete('clientId')
    }
    if (shippingMethod.trim()) {
      params.set('shippingMethod', shippingMethod.trim())
    } else {
      params.delete('shippingMethod')
    }
    if (value === 'all') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    router.push(`/wave-strategies?${params.toString()}`)
  }

  const postAction = useCallback(async (url: string, body: Record<string, unknown> = {}, successMessage: string) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || successMessage)
    }
    toast.success(successMessage)
    await fetchStrategies()
  }, [fetchStrategies])

  const handlePublish = useCallback(async (row: WaveStrategyRow) => {
    try {
      await postAction(`/api/v1/wave-strategies/${row.id}/publish`, { changeSummary: tPage('publishSummary', { version: row.latestVersionNo }) }, tPage('messages.publishSuccess'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tPage('messages.publishFailed'))
    }
  }, [postAction, tPage])

  const loadStrategyDetail = useCallback(async (strategyId: string) => {
    const response = await fetch(`/api/v1/wave-strategies/${strategyId}`)
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.message || tPage('messages.loadDetailFailed'))
    }
    return result.data as WaveStrategyRow
  }, [tPage])

  const openVersionDialog = useCallback(async (row: WaveStrategyRow) => {
    try {
      const detail = await loadStrategyDetail(row.id)
      setActiveStrategy(detail)
      setVersionDialogOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tPage('messages.loadVersionsFailed'))
    }
  }, [loadStrategyDetail, tPage])

  const openSimulateDrawer = useCallback(async (row: WaveStrategyRow) => {
    try {
      const detail = await loadStrategyDetail(row.id)
      setActiveStrategy(detail)
      setSimulateDrawerOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tPage('messages.loadDetailFailed'))
    }
  }, [loadStrategyDetail, tPage])

  const handleExecute = useCallback(async (row: WaveStrategyRow) => {
    try {
      await postAction(`/api/v1/wave-strategies/${row.id}/execute`, { orderIds: [] }, tPage('messages.executeSuccess'))
      router.push(`/wave-strategy-runs?strategyId=${row.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tPage('messages.executeFailed'))
    }
  }, [postAction, router, tPage])

  const openCopyDialog = useCallback((row: WaveStrategyRow) => {
    setCopyTarget(row)
    setCopyForm({
      strategyCode: `${row.strategyCode}_COPY`,
      strategyName: `${row.strategyName}-${tPage('copySuffix')}`,
    })
    setCopyDialogOpen(true)
  }, [tPage])

  const handleCopy = useCallback(async () => {
    if (!copyTarget) return
    if (!copyForm.strategyCode.trim() || !copyForm.strategyName.trim()) {
      toast.error(tPage('messages.copyRequired'))
      return
    }
    setCopying(true)
    try {
      const response = await fetch(`/api/v1/wave-strategies/${copyTarget.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyCode: copyForm.strategyCode.trim(),
          strategyName: copyForm.strategyName.trim(),
        }),
      })
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || tPage('messages.copyFailed'))
      }
      toast.success(tPage('messages.copySuccess'))
      setCopyDialogOpen(false)
      setCopyTarget(null)
      await fetchStrategies()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tPage('messages.copyFailed'))
    } finally {
      setCopying(false)
    }
  }, [copyForm.strategyCode, copyForm.strategyName, copyTarget, fetchStrategies, tPage])

  const getLocalizedReasonCodeLabel = useCallback((reasonCode?: string | null) => {
    const key = getReasonCodeTranslationKey(reasonCode)
    return key ? tReasons(key) : (reasonCode || '-')
  }, [tReasons])

  const getStatusLabel = useCallback((value: WaveStrategyRow['status']) => {
    if (value === 'DRAFT') return tPage('filters.draft')
    if (value === 'ENABLED') return tPage('filters.enabled')
    if (value === 'DISABLED') return tPage('filters.disabled')
    if (value === 'ARCHIVED') return tPage('filters.archived')
    return value
  }, [tPage])

  const renderReasonDistribution = useCallback((
    items?: Array<{ reasonCode: string; count: number }>,
    options?: { strategyId: string; runMode: 'SIMULATE' | 'EXECUTE' }
  ) => {
    if (!items || items.length === 0) {
      return <div className="text-[11px] text-muted-foreground">{tPage('latest.noReasonData')}</div>
    }

    const visibleItems = items.slice(0, 2)
    const remainingCount = items.length - visibleItems.length

    return (
      <div className="space-y-1.5">
        {visibleItems.map((item) => (
          options ? (
            <Link
              key={item.reasonCode}
              href={`/wave-strategy-runs?strategyId=${options.strategyId}&runMode=${options.runMode}&reasonCode=${item.reasonCode}`}
              className="block text-[11px] leading-5 hover:text-primary"
            >
              <span className="font-mono">[{item.reasonCode}]</span>
              {' '}
              <span>{getLocalizedReasonCodeLabel(item.reasonCode)}</span>
              <span className="text-muted-foreground"> x {item.count}</span>
            </Link>
          ) : (
            <div key={item.reasonCode} className="text-[11px] leading-5">
              <span className="font-mono">[{item.reasonCode}]</span>
              {' '}
              <span>{getLocalizedReasonCodeLabel(item.reasonCode)}</span>
              <span className="text-muted-foreground"> x {item.count}</span>
            </div>
          )
        ))}
        {remainingCount > 0 ? (
          <div className="text-[11px] text-muted-foreground">
            {tPage('latest.moreReasons', { count: remainingCount })}
          </div>
        ) : null}
      </div>
    )
  }, [getLocalizedReasonCodeLabel, tPage])

  const renderLatestRunSummary = useCallback((strategyId: string, summary?: WaveStrategyRow['latestRunSummary']) => {
    const sections: Array<{ label: string; run: NonNullable<WaveStrategyRow['latestRunSummary']>['simulate'] | NonNullable<WaveStrategyRow['latestRunSummary']>['execute'] }> = [
      { label: tPage('latest.simulate'), run: summary?.simulate || null },
      { label: tPage('latest.execute'), run: summary?.execute || null },
    ]

    return (
      <div className="grid gap-2 xl:grid-cols-2">
        {sections.map((section) => (
          <div key={section.label} className="rounded-md border bg-muted/20 px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium">{section.label}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {section.run ? formatDateTime(section.run.finishedAt || section.run.startedAt) || '-' : tPage('latest.none')}
                </div>
              </div>
              <Link
                href={`/wave-strategy-runs?strategyId=${strategyId}${section.run ? `&runMode=${section.run.runMode}` : ''}`}
                className="shrink-0 text-[11px] text-muted-foreground hover:text-primary"
              >
                {tPage('actions.log')}
              </Link>
            </div>
            {section.run ? (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md bg-background px-2 py-1.5">
                    <div className="text-[10px] text-muted-foreground">{tPage('latest.matched')}</div>
                    <div className="mt-1 text-xs font-medium tabular-nums">{section.run.matchedOrderCount}</div>
                  </div>
                  <div className="rounded-md bg-background px-2 py-1.5">
                    <div className="text-[10px] text-muted-foreground">{tPage('latest.claimed')}</div>
                    <div className="mt-1 text-xs font-medium tabular-nums">{section.run.claimedByHigherCount}</div>
                  </div>
                  <div className="rounded-md bg-background px-2 py-1.5">
                    <div className="text-[10px] text-muted-foreground">{tPage('latest.unclassified')}</div>
                    <div className="mt-1 text-xs font-medium tabular-nums">{section.run.unclassifiedOrderCount}</div>
                  </div>
                </div>
                {renderReasonDistribution(section.run.reasonSummary, {
                  strategyId,
                  runMode: section.run.runMode,
                })}
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-muted-foreground">{tPage('latest.noRunRecords')}</div>
            )}
          </div>
        ))}
      </div>
    )
  }, [renderReasonDistribution, tPage])

  const getLatestProblemRun = useCallback((summary?: WaveStrategyRow['latestRunSummary']) => {
    return [summary?.simulate, summary?.execute]
      .filter((run): run is NonNullable<typeof run> => Boolean(run) && isProblemRun(run))
      .sort((left, right) => new Date(right.finishedAt || right.startedAt).getTime() - new Date(left.finishedAt || left.startedAt).getTime())[0] || null
  }, [])

  const getRiskMeta = useCallback((summary?: WaveStrategyRow['latestRunSummary']) => {
    const runs = [summary?.simulate, summary?.execute]
      .filter((run): run is NonNullable<typeof run> => Boolean(run))
      .sort((left, right) => new Date(right.finishedAt || right.startedAt).getTime() - new Date(left.finishedAt || left.startedAt).getTime())

    if (runs.length === 0) {
      return {
        level: 'NONE' as RiskLevel,
        levelLabel: tPage('risk.none'),
        detail: tPage('risk.noRunDetail'),
        latestRun: null,
      }
    }

    const latestRun = runs[0]
    const level = getRunRiskLevel(latestRun)

    const levelLabel = level === 'HIGH' ? tPage('risk.high') : level === 'MEDIUM' ? tPage('risk.medium') : tPage('risk.low')
    let detail = tPage('risk.stableDetail')
    if (latestRun.runStatus === 'FAILED') {
      detail = tPage('risk.failedDetail')
    } else if (isBelowMinimumOnlyRun(latestRun)) {
      detail = tPage('risk.belowMinimumDetail', { count: latestRun.unclassifiedOrderCount })
    } else if (latestRun.unclassifiedOrderCount > 0) {
      detail = tPage('risk.unclassifiedDetail', { count: latestRun.unclassifiedOrderCount })
    } else if (latestRun.claimedByHigherCount > 0) {
      detail = tPage('risk.claimedDetail', { count: latestRun.claimedByHigherCount })
    }

    return {
      level,
      levelLabel,
      detail,
      latestRun,
    }
  }, [tPage])

  const renderRiskStatus = useCallback((summary?: WaveStrategyRow['latestRunSummary']) => {
    const risk = getRiskMeta(summary)
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge className={riskBadgeClasses[risk.level]}>{risk.levelLabel}</Badge>
          {risk.latestRun ? (
            <span className="text-[11px] text-muted-foreground">
              {risk.latestRun.runMode === 'SIMULATE' ? tPage('latest.simulate') : tPage('latest.execute')}
            </span>
          ) : null}
        </div>
        <div className="text-[11px] text-muted-foreground">{risk.detail}</div>
        {risk.latestRun ? (
          <div className="text-[11px] text-muted-foreground">
            {formatDateTime(risk.latestRun.finishedAt || risk.latestRun.startedAt) || '-'}
          </div>
        ) : null}
      </div>
    )
  }, [getRiskMeta, tPage])

  const renderLatestProblemTime = useCallback((summary?: WaveStrategyRow['latestRunSummary']) => {
    const latestProblemRun = getLatestProblemRun(summary)
    if (!latestProblemRun) {
      return <span className="text-xs text-muted-foreground">-</span>
    }

    let problemLabel = tPage('risk.problem.partialSuccess')
    if (latestProblemRun.runStatus === 'FAILED') {
      problemLabel = tPage('risk.problem.failed')
    } else if (isBelowMinimumOnlyRun(latestProblemRun)) {
      problemLabel = tPage('risk.problem.belowMinimum', { count: latestProblemRun.unclassifiedOrderCount })
    } else if (latestProblemRun.unclassifiedOrderCount > 0) {
      problemLabel = tPage('risk.problem.unclassified', { count: latestProblemRun.unclassifiedOrderCount })
    } else if (latestProblemRun.claimedByHigherCount > 0) {
      problemLabel = tPage('risk.problem.claimed', { count: latestProblemRun.claimedByHigherCount })
    }

    return (
      <div className="space-y-1">
        <div className="text-xs whitespace-nowrap">{formatDateTime(latestProblemRun.finishedAt || latestProblemRun.startedAt) || '-'}</div>
        <div className="text-[11px] text-muted-foreground">{problemLabel}</div>
      </div>
    )
  }, [getLatestProblemRun, tPage])

  const copyStrategyProblemLink = useCallback(async (row: WaveStrategyRow) => {
    if (typeof window === 'undefined') return

    const latestRun = getLatestProblemRun(row.latestRunSummary)
      || [row.latestRunSummary?.simulate, row.latestRunSummary?.execute]
        .filter((run): run is NonNullable<typeof run> => Boolean(run))
        .sort((left, right) => new Date(right.finishedAt || right.startedAt).getTime() - new Date(left.finishedAt || left.startedAt).getTime())[0]

    const params = new URLSearchParams({
      strategyId: row.id,
    })

    if (latestRun) {
      params.set('runMode', latestRun.runMode)
      const primaryReasonCode = latestRun.reasonSummary?.[0]?.reasonCode
      if (primaryReasonCode) {
        params.set('reasonCode', primaryReasonCode)
      }
    }

    const link = new URL(`/wave-strategy-runs?${params.toString()}`, window.location.origin).toString()
    await copyText(link, tPage('messages.problemLinkCopied'))
  }, [copyText, getLatestProblemRun, tPage])

  const columns: ColumnDef<WaveStrategyRow>[] = useMemo(
    () => [
      {
        accessorKey: 'strategyName',
        id: 'strategy',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tPage('table.strategyInfo')} />,
        size: 320,
        cell: ({ row }) => (
          <div className="min-w-0 space-y-2 py-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-orange-50 px-2 py-1 font-mono text-[11px] text-orange-700 ring-1 ring-orange-100">
                {row.original.strategyCode}
              </span>
              <span className="text-[11px] text-muted-foreground">{row.original.warehouse?.warehouseName || '-'}</span>
            </div>
            <div className="min-w-0">
              <Link href={`/wave-strategies/${row.original.id}/edit`} className="block truncate font-medium hover:text-primary">
                {row.original.strategyName}
              </Link>
              <div className="truncate text-[11px] text-muted-foreground">
                {row.original.description || tPage('table.noDescription')}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'priority',
        id: 'ruleSummary',
        header: ({ column }) => <DataTableColumnHeader column={column} title={tPage('table.ruleSummary')} />,
        size: 260,
        cell: ({ row }) => (
          <div className="space-y-2 py-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-slate-100 text-slate-700">
                {tPage('table.priorityValue', { value: row.original.priority })}
              </Badge>
              {row.original.currentVersion?.ruleSet?.triggerConfigJson?.modes?.length
                ? row.original.currentVersion.ruleSet.triggerConfigJson.modes.map((mode) => (
                  <Badge key={mode} variant="outline" className="font-mono text-[11px]">
                    {mode}
                  </Badge>
                ))
                : <span className="text-[11px] text-muted-foreground">{tPage('table.noTriggerModes')}</span>}
            </div>
            {((row.original.priorityConflictSummary?.samePriorityCount || 0) > 0 || (row.original.priorityConflictSummary?.lowerPriorityCount || 0) > 0) ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {tPage('table.conflictSummary', {
                    same: row.original.priorityConflictSummary?.samePriorityCount || 0,
                    lower: row.original.priorityConflictSummary?.lowerPriorityCount || 0,
                  })}
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      {tPage('table.viewConflicts')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80">
                    <div className="space-y-3">
                      <div className="font-medium">{tPage('table.priorityImpact')}</div>
                      {(row.original.priorityConflictSummary?.samePriorityStrategies?.length || 0) > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">{tPage('table.samePriorityStrategies')}</div>
                          {row.original.priorityConflictSummary?.samePriorityStrategies.map((item) => (
                            <Link key={item.id} href={`/wave-strategies/${item.id}/edit`} className="block rounded-md border px-3 py-2 text-xs hover:bg-muted">
                              {item.strategyCode} / {item.strategyName} / {tPage('table.priorityLabel', { value: item.priority })}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                      {(row.original.priorityConflictSummary?.lowerPriorityStrategies?.length || 0) > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">{tPage('table.overriddenByCurrent')}</div>
                          {row.original.priorityConflictSummary?.lowerPriorityStrategies.map((item) => (
                            <Link key={item.id} href={`/wave-strategies/${item.id}/edit`} className="block rounded-md border px-3 py-2 text-xs hover:bg-muted">
                              {item.strategyCode} / {item.strategyName} / {tPage('table.priorityLabel', { value: item.priority })}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground">{tPage('table.noConflicts')}</span>
            )}
          </div>
        ),
      },
      {
        id: 'statusVersion',
        header: tPage('table.statusVersion'),
        size: 180,
        cell: ({ row }) => (
          <div className="space-y-2 py-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusColors[row.original.status] || 'bg-slate-100 text-slate-700'}>
                {getStatusLabel(row.original.status)}
              </Badge>
              <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium">
                V{row.original.currentVersion?.versionNo || row.original.latestVersionNo}
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <div>{tPage('table.lastUpdated')}</div>
              <div>{formatDateTime(row.original.updatedAt) || '-'}</div>
            </div>
          </div>
        ),
      },
      {
        id: 'runOverview',
        header: tPage('table.runOverview'),
        size: 520,
        cell: ({ row }) => (
          <div className="space-y-3 py-1">
            <div className="grid gap-2 lg:grid-cols-[180px_1fr]">
              <div className="rounded-md bg-muted/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{tPage('table.riskStatus')}</div>
                <div className="mt-2">{renderRiskStatus(row.original.latestRunSummary)}</div>
              </div>
              <div className="rounded-md bg-muted/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{tPage('table.latestProblem')}</div>
                <div className="mt-2">{renderLatestProblemTime(row.original.latestRunSummary)}</div>
              </div>
            </div>
            {renderLatestRunSummary(row.original.id, row.original.latestRunSummary)}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">{tPage('table.actions')}</div>,
        enableSorting: false,
        size: 180,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/wave-strategies/${row.original.id}/edit`}>{tPage('actions.edit')}</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => openSimulateDrawer(row.original)}>
              {getRiskMeta(row.original.latestRunSummary).level === 'HIGH' ? tPage('actions.resimulate') : tPage('actions.simulate')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => handleExecute(row.original)}>
                  {tPage('actions.execute')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePublish(row.original)}>
                  {tPage('actions.publish')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/wave-strategy-runs?strategyId=${row.original.id}`}>{tPage('actions.log')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openVersionDialog(row.original)}>
                  {tPage('actions.version')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openCopyDialog(row.original)}>
                  {tPage('actions.copy')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void copyStrategyProblemLink(row.original)}>
                  {tPage('actions.copyProblemLink')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [copyStrategyProblemLink, getRiskMeta, getStatusLabel, handleExecute, handlePublish, openCopyDialog, openSimulateDrawer, openVersionDialog, renderLatestProblemTime, renderLatestRunSummary, renderRiskStatus, tPage]
  )

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: tPage('breadcrumb.outbound'), href: '/orders' }, { label: tPage('title') }]} />

      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{tPage('title')}</h1>
            <p className="text-sm text-muted-foreground">{tPage('description')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/wave-strategy-runs">
                <Settings2 className="h-4 w-4" />
                {tPage('actions.runLogs')}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/wave-strategies/create">{tPage('actions.create')}</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/10 p-3 space-y-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_220px_auto]">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tPage('filters.searchPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <SearchableSelect
              mode="single"
              options={clientOptions}
              value={clientId}
              onChange={(value) => setClientId(Array.isArray(value) ? value[0] || '' : value)}
              getOptionValue={(option) => option.id}
              getOptionLabel={(option) => `${option.clientCode} / ${option.clientName}`}
              placeholder={tPage('filters.clientPlaceholder')}
              searchPlaceholder={tPage('filters.clientSearchPlaceholder')}
              emptyText={tPage('filters.noClientOptions')}
              loading={clientOptionsLoading}
              className="h-10 w-full justify-between"
              contentClassName="w-[320px]"
            />
            <SearchableSelect
              mode="single"
              options={shippingMethodOptions}
              value={shippingMethod}
              onChange={(value) => setShippingMethod(Array.isArray(value) ? value[0] || '' : value)}
              getOptionValue={(option) => option}
              getOptionLabel={(option) => option}
              placeholder={tPage('filters.shippingMethodPlaceholder')}
              searchPlaceholder={tPage('filters.shippingMethodSearchPlaceholder')}
              emptyText={tPage('filters.noShippingMethodOptions')}
              loading={filterOptionsLoading}
              className="h-10 w-full justify-between"
              contentClassName="w-[280px]"
            />
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder={tPage('filters.allStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tPage('filters.allStatus')}</SelectItem>
                <SelectItem value="DRAFT">{tPage('filters.draft')}</SelectItem>
                <SelectItem value="ENABLED">{tPage('filters.enabled')}</SelectItem>
                <SelectItem value="DISABLED">{tPage('filters.disabled')}</SelectItem>
                <SelectItem value="ARCHIVED">{tPage('filters.archived')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
                {tPage('actions.search')}
              </Button>
            </div>
          </div>

        </div>

        <DataTable
          tableId="wave-strategies"
          columns={columns}
          data={data}
          enableColumnVisibility={false}
          total={total}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          manualPagination
          loading={loading}
        />
      </div>

      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tPage('copyDialog.title')}</DialogTitle>
            <DialogDescription>
              {tPage('copyDialog.description', { name: copyTarget?.strategyName || '-' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">{tPage('copyDialog.strategyCode')}</div>
              <Input
                value={copyForm.strategyCode}
                onChange={(e) => setCopyForm((current) => ({ ...current, strategyCode: e.target.value }))}
                placeholder={tPage('copyDialog.strategyCodePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">{tPage('copyDialog.strategyName')}</div>
              <Input
                value={copyForm.strategyName}
                onChange={(e) => setCopyForm((current) => ({ ...current, strategyName: e.target.value }))}
                placeholder={tPage('copyDialog.strategyNamePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)} disabled={copying}>
              {tPage('copyDialog.cancel')}
            </Button>
            <Button onClick={() => void handleCopy()} disabled={copying}>
              {tPage('copyDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StrategyVersionDialog
        open={versionDialogOpen}
        strategyId={activeStrategy?.id || null}
        strategyName={activeStrategy?.strategyName || ''}
        versions={activeStrategy?.versions || []}
        onOpenChange={setVersionDialogOpen}
        onReload={async () => {
          await fetchStrategies()
          if (activeStrategy?.id) {
            const detail = await loadStrategyDetail(activeStrategy.id)
            setActiveStrategy(detail)
          }
        }}
      />

      <StrategySimulateDrawer
        open={simulateDrawerOpen}
        strategyId={activeStrategy?.id || null}
        strategyName={activeStrategy?.strategyName || ''}
        strategyPriority={activeStrategy?.priority ?? null}
        onOpenChange={setSimulateDrawerOpen}
        onExecuted={(strategyId) => {
          void fetchStrategies()
          void router.push(`/wave-strategy-runs?strategyId=${strategyId}`)
        }}
      />
    </div>
  )
}

export default function WaveStrategiesPage() {
  return <WaveStrategiesPageContent />
}
