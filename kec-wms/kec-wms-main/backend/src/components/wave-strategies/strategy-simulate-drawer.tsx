'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Download, FlaskConical, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateTime } from '@/lib/utils/date-formatter'
import {
  getReasonCategory,
  getReasonCategoryTranslationKey,
  getReasonCodeTranslationKey,
  resolveLocalizedText,
  type MatchedRuleSnapshotLike,
  type ReasonCategory,
} from '@/lib/wave-strategy/reason-codes'

interface SimulateOrderResult {
  id: string
  orderId: string
  order?: {
    orderNumber: string
    platformOrderId: string | null
  }
  batchNo: number
  waveTypeCode: string | null
  pickMode: string | null
  downstreamMode: string | null
  resultStatus: string
  message: string | null
  matchedRuleSnapshot?: MatchedRuleSnapshotLike | null
}

interface SimulateResult {
  id: string
  runMode: 'SIMULATE' | 'EXECUTE'
  runStatus: string
  candidateOrderCount: number
  matchedOrderCount: number
  claimedByHigherCount: number
  unclassifiedOrderCount: number
  createdWaveCount: number
  createdPickOrderCount: number
  startedAt: string
  finishedAt: string | null
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
  orders: SimulateOrderResult[]
}

interface StrategySimulateDrawerProps {
  open: boolean
  strategyId: string | null
  strategyName: string
  strategyPriority?: number | null
  onOpenChange: (open: boolean) => void
  onExecuted?: (strategyId: string) => void
}

const resultStatusColors: Record<string, string> = {
  MATCHED: 'bg-blue-100 text-blue-700',
  SKIPPED: 'bg-zinc-100 text-zinc-700',
  UNCLASSIFIED: 'bg-amber-100 text-amber-700',
  WAVED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
}

const resultStatusLabels: Record<string, string> = {
  MATCHED: '命中',
  SKIPPED: '被抢占',
  UNCLASSIFIED: '未归类',
  WAVED: '已生成波次',
  FAILED: '异常',
}

const resultFilterLabels: Record<'ALL' | 'MATCHED' | 'UNCLASSIFIED' | 'SKIPPED' | 'FAILED', string> = {
  ALL: '全部',
  MATCHED: '仅看命中',
  UNCLASSIFIED: '仅看未归类',
  SKIPPED: '仅看被抢占',
  FAILED: '仅看异常',
}

const reasonCategories: ReasonCategory[] = ['ALL', 'CLAIMED', 'FILTER_MISS', 'HOT_SKU', 'FIXED_COMBO', 'NON_FIXED_COMBO', 'ORDER_STRUCTURE_CLASSIFY']
const detailPageSizeOptions = [20, 50, 100]

export function StrategySimulateDrawer({
  open,
  strategyId,
  strategyName,
  strategyPriority,
  onOpenChange,
  onExecuted,
}: StrategySimulateDrawerProps) {
  const tReasons = useTranslations('waveStrategyReasons')
  const [orderIdsText, setOrderIdsText] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<SimulateResult | null>(null)
  const [resultFilter, setResultFilter] = useState<'ALL' | 'MATCHED' | 'UNCLASSIFIED' | 'SKIPPED' | 'FAILED'>('ALL')
  const [reasonFilter, setReasonFilter] = useState<ReasonCategory>('ALL')
  const [resultSearch, setResultSearch] = useState('')
  const [loadingResultPage, setLoadingResultPage] = useState(false)
  const [detailPage, setDetailPage] = useState(1)
  const [detailPageSize, setDetailPageSize] = useState(20)

  const orderIds = useMemo(
    () => orderIdsText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
    [orderIdsText]
  )

  const getLocalizedReasonCodeLabel = (reasonCode?: string | null) => {
    const key = getReasonCodeTranslationKey(reasonCode)
    return key ? tReasons(key) : (reasonCode || '-')
  }

  const getLocalizedText = (
    key?: string | null,
    params?: Record<string, string | number> | null,
    fallback?: string | null,
    empty = '-'
  ) => resolveLocalizedText(tReasons, key, params, fallback, empty)

  const getLocalizedRunMessage = (item: SimulateOrderResult) => getLocalizedText(
    item.matchedRuleSnapshot?.messageKey,
    item.matchedRuleSnapshot?.messageParams,
    item.message,
    ''
  )

  const runSimulation = async () => {
    if (!strategyId) return
    setSimulating(true)
    try {
      setResultFilter('ALL')
      setReasonFilter('ALL')
      setResultSearch('')
      setDetailPage(1)
      setDetailPageSize(20)
      const response = await fetch(`/api/v1/wave-strategies/${strategyId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      })
      const payload = await response.json()
      if (!payload.success) {
        throw new Error(payload.message || '模拟失败')
      }
      setResult(payload.data)
      toast.success('策略模拟完成')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '模拟失败')
    } finally {
      setSimulating(false)
    }
  }

  useEffect(() => {
    if (!result?.id) return

    let cancelled = false

    const fetchResultPage = async () => {
      setLoadingResultPage(true)
      try {
        const params = new URLSearchParams({
          page: String(detailPage),
          pageSize: String(detailPageSize),
        })
        if (resultFilter !== 'ALL') params.set('resultStatus', resultFilter)
        if (reasonFilter !== 'ALL') params.set('reasonCategory', reasonFilter)
        if (resultSearch.trim()) params.set('search', resultSearch.trim())

        const response = await fetch(`/api/v1/wave-strategy-runs/${result.id}?${params.toString()}`)
        const payload = await response.json()
        if (!payload.success) {
          throw new Error(payload.message || '加载模拟结果失败')
        }
        if (!cancelled) {
          setResult(payload.data)
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : '加载模拟结果失败')
        }
      } finally {
        if (!cancelled) {
          setLoadingResultPage(false)
        }
      }
    }

    void fetchResultPage()

    return () => {
      cancelled = true
    }
  }, [detailPage, detailPageSize, reasonFilter, result?.id, resultFilter, resultSearch])

  const batchPreviewText = useMemo(
    () => result?.batchSummary.previewItems.map((item) => `批次 ${item.batchNo}：${item.count} 单`).join(' · ') || '',
    [result]
  )

  const detailRangeStart = !result || result.pagination.total === 0 ? 0 : (result.pagination.page - 1) * result.pagination.pageSize + 1
  const detailRangeEnd = !result || result.pagination.total === 0
    ? 0
    : Math.min(result.pagination.page * result.pagination.pageSize, result.pagination.total)

  const exportResult = async () => {
    if (!result || result.pagination.total === 0) {
      toast.error('暂无可导出的模拟结果')
      return
    }

    const exportedOrders: SimulateOrderResult[] = []

    try {
      let page = 1
      let totalPages = 1

      while (page <= totalPages) {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '100',
        })
        if (resultFilter !== 'ALL') params.set('resultStatus', resultFilter)
        if (reasonFilter !== 'ALL') params.set('reasonCategory', reasonFilter)
        if (resultSearch.trim()) params.set('search', resultSearch.trim())

        const response = await fetch(`/api/v1/wave-strategy-runs/${result.id}?${params.toString()}`)
        const payload = await response.json()
        if (!payload.success) {
          throw new Error(payload.message || '导出失败')
        }

        exportedOrders.push(...(payload.data.orders || []))
        totalPages = payload.data.pagination?.totalPages || 1
        page += 1
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败')
      return
    }

    const rows = [
      ['orderId', 'batchNo', 'waveTypeCode', 'pickMode', 'downstreamMode', 'resultStatus', 'reasonCategory', 'reasonCode', 'reasonLabel', 'message'],
      ...exportedOrders.map((item) => [
        item.order?.orderNumber || item.orderId,
        String(item.batchNo),
        item.waveTypeCode || '',
        item.pickMode || '',
        item.downstreamMode || '',
        item.resultStatus,
        getReasonCategory(item.matchedRuleSnapshot),
        item.matchedRuleSnapshot?.reasonCode || item.matchedRuleSnapshot?.classification?.reasonCode || '',
        getLocalizedReasonCodeLabel(item.matchedRuleSnapshot?.reasonCode || item.matchedRuleSnapshot?.classification?.reasonCode),
        getLocalizedRunMessage(item),
      ]),
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `wave-strategy-simulate-${result.id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const renderMatchReason = (item: SimulateOrderResult) => {
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
    return [reasonCode ? `[${reasonCode}]` : '', reasonCodeLabel !== '-' ? reasonCodeLabel : '', filterReason, classificationReason, getLocalizedRunMessage(item)].filter(Boolean).join(' | ') || '-'
  }

  const renderMatchReasonDetails = (item: SimulateOrderResult) => {
    const filter = item.matchedRuleSnapshot?.filter
    const classification = item.matchedRuleSnapshot?.classification

    return (
      <div className="space-y-3 text-xs">
        {filter?.groups?.length ? (
          <div className="space-y-2">
            <div className="font-medium">筛选条件命中</div>
            {filter.groups.map((group) => (
              <div key={group.groupNo} className="rounded-md border p-2">
                <div className="font-medium text-[11px]">条件组 #{group.groupNo} · {group.matched ? '命中' : '未命中'}</div>
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
            <div className="font-medium">波次类型识别</div>
            <div className="text-muted-foreground">目标类型：{classification.targetCode || '-'}</div>
            <div className="text-muted-foreground">订单结构：{classification.orderType || '-'}</div>
            <div className="text-muted-foreground">爆款命中：{classification.isHotMatched ? '是' : '否'}</div>
            <div className="text-muted-foreground">固定组合命中：{classification.fixedComboMatched ? '是' : '否'}</div>
            <div className="text-muted-foreground">
              {getLocalizedText(classification.reasonKey, classification.reasonParams, classification.reason)}
            </div>
          </div>
        ) : null}

        {(item.matchedRuleSnapshot?.reasonKey || item.matchedRuleSnapshot?.reason) ? (
          <div className="space-y-1">
            <div className="font-medium">补充说明</div>
            <div className="text-muted-foreground">
              {getLocalizedText(
                item.matchedRuleSnapshot?.reasonKey,
                item.matchedRuleSnapshot?.reasonParams,
                item.matchedRuleSnapshot?.reason
              )}
            </div>
          </div>
        ) : null}
        {(item.matchedRuleSnapshot?.reasonCode || item.matchedRuleSnapshot?.classification?.reasonCode) ? (
          <div className="space-y-1">
            <div className="font-medium">原因代码</div>
            <div className="text-muted-foreground font-mono">
              {item.matchedRuleSnapshot?.reasonCode || item.matchedRuleSnapshot?.classification?.reasonCode}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const executeCurrentStrategy = async () => {
    if (!strategyId) return
    setExecuting(true)
    try {
      const response = await fetch(`/api/v1/wave-strategies/${strategyId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds }),
      })
      const payload = await response.json()
      if (!payload.success) {
        throw new Error(payload.message || '执行失败')
      }
      toast.success('已按当前策略执行')
      onOpenChange(false)
      onExecuted?.(strategyId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '执行失败')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col overflow-hidden p-0 sm:rounded-xl">
        <div className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              策略模拟
            </DialogTitle>
            <DialogDescription>{strategyName || '波次策略'} 的模拟抽屉，可用当前订单池或指定订单验证结果。</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <div className="font-medium">模拟范围</div>
                  <div className="mt-1 text-sm text-muted-foreground">留空表示使用当前订单池；填写后仅模拟指定订单 ID。</div>
                </div>
                <Textarea
                  value={orderIdsText}
                  onChange={(e) => setOrderIdsText(e.target.value)}
                  placeholder="按逗号或换行输入订单 ID"
                  className="min-h-[88px]"
                />
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="rounded-md bg-muted/30 px-3 py-3">
                  <div className="text-xs text-muted-foreground">已识别订单数</div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums">{orderIds.length}</div>
                </div>
                <div className="rounded-md bg-muted/30 px-3 py-3 text-xs leading-5 text-muted-foreground">
                  支持按逗号或换行输入多个订单 ID。未填写时，将使用当前订单池做全量模拟。
                </div>
                <Button className="w-full" onClick={runSimulation} disabled={simulating}>
                  {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  开始模拟
                </Button>
              </div>
            </div>

            {result ? (
              <>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      <SummaryCard title="命中订单（累计）" value={String(result.matchedOrderCount)} />
                      <SummaryCard title="未归类订单" value={String(result.unclassifiedOrderCount)} />
                      <SummaryCard title="预估波次（累计）" value={String(result.createdWaveCount)} />
                      <SummaryCard title="模拟批次" value={String(result.batchSummary.batchCount)} />
                      <SummaryCard title="单批峰值" value={result.batchSummary.maxOrdersInBatch > 0 ? `${result.batchSummary.maxOrdersInBatch} 单` : '-'} />
                      <SummaryCard title="执行时间" value={formatDateTime(result.finishedAt || result.startedAt) || '-'} />
                    </div>
                    {result.batchSummary.batchCount > 0 ? (
                      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                        当前模拟共分为 {result.batchSummary.batchCount} 批，单批最多 {result.batchSummary.maxOrdersInBatch} 单。
                        {batchPreviewText ? ` 示例：${batchPreviewText}` : ''}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="font-medium">优先级决策摘要</div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-md bg-muted/30 px-3 py-3">
                        <div className="text-muted-foreground">当前优先级</div>
                        <div className="mt-1 font-medium">{strategyPriority ?? '-'}</div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-3 py-3">
                        <div className="text-muted-foreground">被抢占</div>
                        <div className="mt-1 font-medium">{result.claimedByHigherCount}</div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-3 py-3">
                        <div className="text-muted-foreground">命中当前策略</div>
                        <div className="mt-1 font-medium">{result.matchedOrderCount}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex-1">
                      <Input
                        value={resultSearch}
                        onChange={(e) => {
                          setDetailPage(1)
                          setResultSearch(e.target.value)
                        }}
                        placeholder="按订单ID、波次类型或说明筛选"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={exportResult}>
                        <Download className="h-4 w-4" />
                        导出
                      </Button>
                      <Button size="sm" onClick={executeCurrentStrategy} disabled={executing}>
                        {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        直接执行当前版本
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(['ALL', 'MATCHED', 'UNCLASSIFIED', 'SKIPPED', 'FAILED'] as const).map((status) => (
                      <Button
                        key={status}
                        variant={resultFilter === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setDetailPage(1)
                          setResultFilter(status)
                        }}
                      >
                        {resultFilterLabels[status]}（{result.statusSummary[status]}）
                      </Button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {reasonCategories.map((category) => (
                      <Button
                        key={category}
                        variant={reasonFilter === category ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setDetailPage(1)
                          setReasonFilter(category)
                        }}
                      >
                        {tReasons(getReasonCategoryTranslationKey(category))}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="font-medium">模拟明细</div>
                    <div className="text-xs text-muted-foreground">
                      当前结果 {result.pagination.total} 条 · 第 {result.pagination.page}/{result.pagination.totalPages} 页
                    </div>
                  </div>
                  {result.pagination.total === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">暂无模拟明细</div>
                  ) : (
                    <div className="space-y-3">
                      {result.orders.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border bg-background p-4"
                        >
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-muted-foreground">订单号：{item.order?.orderNumber || item.orderId}</span>
                                {item.order?.platformOrderId ? (
                                  <span className="font-mono text-xs text-muted-foreground">平台单号：{item.order.platformOrderId}</span>
                                ) : null}
                                <span className="rounded-md bg-muted px-2 py-1 text-[11px]">批次 {item.batchNo}</span>
                                <Badge className={resultStatusColors[item.resultStatus] || 'bg-slate-100 text-slate-700'}>
                                  {resultStatusLabels[item.resultStatus] || item.resultStatus}
                                </Badge>
                                <Badge variant="outline">{tReasons(getReasonCategoryTranslationKey(getReasonCategory(item.matchedRuleSnapshot)))}</Badge>
                              </div>
                              <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                                <div className="rounded-md bg-muted/20 px-3 py-2">
                                  <div>波次类型</div>
                                  <div className="mt-1 font-medium text-foreground">{item.waveTypeCode || '-'}</div>
                                </div>
                                <div className="rounded-md bg-muted/20 px-3 py-2">
                                  <div>拣货方式</div>
                                  <div className="mt-1 font-medium text-foreground">{item.pickMode || '-'}</div>
                                </div>
                                <div className="rounded-md bg-muted/20 px-3 py-2">
                                  <div>下游处理</div>
                                  <div className="mt-1 font-medium text-foreground">{item.downstreamMode || '-'}</div>
                                </div>
                              </div>
                            </div>

                            <div className="w-full xl:w-[46%] xl:min-w-[320px]">
                              <div className="text-xs leading-5 text-muted-foreground">{renderMatchReason(item)}</div>
                              <details className="mt-3 rounded-md border bg-muted/20 px-3 py-2">
                                <summary className="cursor-pointer text-[11px] text-primary">查看命中详情</summary>
                                <div className="mt-2">
                                  {renderMatchReasonDetails(item)}
                                </div>
                              </details>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span>显示 {detailRangeStart}-{detailRangeEnd} / {result.pagination.total}</span>
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
                            disabled={result.pagination.page <= 1 || loadingResultPage}
                            onClick={() => setDetailPage((current) => Math.max(1, current - 1))}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            上一页
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            第 {result.pagination.page} / {result.pagination.totalPages} 页
                            {loadingResultPage ? ' · 加载中...' : ''}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={result.pagination.page >= result.pagination.totalPages || loadingResultPage}
                            onClick={() => setDetailPage((current) => Math.min(result.pagination.totalPages, current + 1))}
                          >
                            下一页
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  )
}
