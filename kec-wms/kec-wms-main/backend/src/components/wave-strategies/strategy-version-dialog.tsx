'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { History, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface StrategyVersionItem {
  id: string
  versionNo: number
  versionStatus: string
  isCurrent: boolean
  changeSummary: string | null
  configSnapshot?: unknown
  publishedAt: string | null
  publishedBy: string | null
  createdAt: string
}

interface SnapshotShape {
  strategy?: {
    strategyCode?: string
    strategyName?: string
    warehouseId?: string
    priority?: number
  }
  triggerConfig?: {
    modes?: string[]
    cronExpression?: string | null
    scheduleTimes?: string[] | null
  }
  filterConfig?: {
    orderBusinessTypes?: string[]
    clientIds?: string[]
    platforms?: string[]
    shippingMethods?: string[]
    zoneIds?: string[]
    groupJoinMode?: string
    conditionGroups?: Array<{ groupNo?: number; logicOp?: string; fieldCode?: string; value?: string; valueTo?: string }>
  }
  executionConfig?: {
    enableOrderLimit?: boolean
    maxOrdersPerRun?: number | null
    batchSortField?: string
    batchSortDirection?: string
  }
  waveTypeConfig?: Array<{
    code?: string
    enabled?: boolean
    ordersPerWave?: number
    pickMode?: string
    downstreamMode?: string
  }>
  pickConfig?: {
    crossZoneSplitMode?: string
    enableMaxOrderLimit?: boolean
    maxOrdersPerPickOrder?: number | null
    pathOptimizeMode?: string
  }
  releaseConfig?: {
    releaseMode?: string
    autoAssignPicker?: boolean
  }
}

interface StrategyVersionDialogProps {
  open: boolean
  strategyId: string | null
  strategyName: string
  versions: StrategyVersionItem[]
  onOpenChange: (open: boolean) => void
  onReload: () => Promise<void> | void
}

const versionStatusColors: Record<string, string> = {
  EDITING: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  ROLLED_BACK: 'bg-amber-100 text-amber-700',
  ABANDONED: 'bg-zinc-100 text-zinc-700',
}

const versionStatusLabels: Record<string, string> = {
  EDITING: '编辑中',
  PUBLISHED: '已发布',
  ROLLED_BACK: '已回滚',
  ABANDONED: '已废弃',
}

function getVersionStatusLabel(version: Pick<StrategyVersionItem, 'versionStatus' | 'isCurrent'>) {
  if (version.isCurrent) return '当前版本'
  return versionStatusLabels[version.versionStatus] || version.versionStatus
}

function getTriggerScheduleLabel(triggerConfig?: SnapshotShape['triggerConfig']) {
  if (triggerConfig?.scheduleTimes?.length) {
    return triggerConfig.scheduleTimes.join(' / ')
  }
  return triggerConfig?.cronExpression || '-'
}

export function StrategyVersionDialog({
  open,
  strategyId,
  strategyName,
  versions,
  onOpenChange,
  onReload,
}: StrategyVersionDialogProps) {
  const [rollingBackVersionId, setRollingBackVersionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'history' | 'snapshot'>('history')

  const sortedVersions = useMemo(
    () => [...versions].sort((left, right) => right.versionNo - left.versionNo),
    [versions]
  )
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)

  const selectedVersion = useMemo(() => {
    return sortedVersions.find((item) => item.id === selectedVersionId) || sortedVersions[0] || null
  }, [selectedVersionId, sortedVersions])

  useEffect(() => {
    if (open && sortedVersions.length > 0 && !selectedVersionId) {
      setSelectedVersionId(sortedVersions[0].id)
    }
    if (!open) {
      setSelectedVersionId(null)
      setActiveTab('history')
    }
  }, [open, selectedVersionId, sortedVersions])

  const handleRollback = async (versionId: string, versionNo: number) => {
    if (!strategyId) return
    setRollingBackVersionId(versionId)
    try {
      const response = await fetch(`/api/v1/wave-strategies/${strategyId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || '回滚失败')
      }
      toast.success(`已回滚为 V${versionNo}`)
      await onReload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '回滚失败')
    } finally {
      setRollingBackVersionId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col overflow-hidden p-0 sm:rounded-xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 px-6 pt-6">
            <History className="h-5 w-5" />
            版本历史
          </DialogTitle>
          <DialogDescription className="px-6 pb-4">{strategyName || '波次策略'} 的版本记录与回滚入口。</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'history' | 'snapshot')} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 px-6">
            <TabsList>
            <TabsTrigger value="history">历史</TabsTrigger>
            <TabsTrigger value="snapshot">配置快照</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
            <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className="flex min-h-0 flex-col rounded-lg border">
                <div className="border-b px-4 py-3">
                  <div className="font-medium">版本列表</div>
                  <div className="text-xs text-muted-foreground">共 {sortedVersions.length} 个版本</div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {sortedVersions.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">暂无版本记录</div>
                  ) : (
                    <div className="space-y-3">
                      {sortedVersions.map((version) => (
                        <button
                          key={version.id}
                          type="button"
                          onClick={() => setSelectedVersionId(version.id)}
                          className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${selectedVersion?.id === version.id ? 'border-primary bg-muted/40 ring-1 ring-border' : 'hover:bg-muted/30'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold">V{version.versionNo}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {formatDateTime(version.publishedAt || version.createdAt) || '-'}
                              </div>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Badge className={versionStatusColors[version.versionStatus] || 'bg-slate-100 text-slate-700'}>
                                {getVersionStatusLabel(version)}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-3 text-sm text-muted-foreground line-clamp-2">
                            {version.changeSummary || '无变更说明'}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto rounded-lg border p-4">
                {selectedVersion ? (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-semibold">V{selectedVersion.versionNo}</span>
                          <Badge className={versionStatusColors[selectedVersion.versionStatus] || 'bg-slate-100 text-slate-700'}>
                            {getVersionStatusLabel(selectedVersion)}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">{selectedVersion.changeSummary || '无变更说明'}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!selectedVersion.isCurrent ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRollback(selectedVersion.id, selectedVersion.versionNo)}
                            disabled={rollingBackVersionId === selectedVersion.id}
                          >
                            <RotateCcw className="h-4 w-4" />
                            回滚到此版本
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('snapshot')}>
                          查看完整快照
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard title="发布时间" value={formatDateTime(selectedVersion.publishedAt || selectedVersion.createdAt) || '-'} />
                      <MetricCard title="发布人" value={selectedVersion.publishedBy || '-'} />
                      <MetricCard title="触发方式" value={(selectedVersion.configSnapshot as SnapshotShape)?.triggerConfig?.modes?.join(' / ') || '-'} />
                      <MetricCard title="运行时间" value={getTriggerScheduleLabel((selectedVersion.configSnapshot as SnapshotShape)?.triggerConfig)} />
                    </div>

                    <SnapshotSummary snapshot={selectedVersion.configSnapshot as SnapshotShape} />
                  </div>
                ) : (
                  <div className="py-10 text-center text-sm text-muted-foreground">请选择一个版本查看详情</div>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="snapshot" className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
            <div className="space-y-3">
              {sortedVersions.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">暂无版本记录</div>
              ) : null}
              <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <div className="font-medium">{selectedVersion ? `V${selectedVersion.versionNo}` : '未选择版本'}</div>
                  <div className="text-xs text-muted-foreground">{selectedVersion?.changeSummary || '无变更说明'}</div>
                </div>
                <Badge className={selectedVersion ? (versionStatusColors[selectedVersion.versionStatus] || 'bg-slate-100 text-slate-700') : 'bg-slate-100 text-slate-700'}>
                  {selectedVersion ? getVersionStatusLabel(selectedVersion) : '未选择'}
                </Badge>
              </div>
              {selectedVersion ? (
                <SnapshotSummary snapshot={selectedVersion.configSnapshot as SnapshotShape} />
              ) : null}
              {selectedVersion ? (
                <SnapshotStepPreview snapshot={selectedVersion.configSnapshot as SnapshotShape} />
              ) : null}
              <pre className="max-h-[320px] overflow-auto rounded-lg border bg-muted/30 p-4 text-xs leading-6">
                {selectedVersion ? JSON.stringify(selectedVersion.configSnapshot || {}, null, 2) : '暂无配置快照'}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function SnapshotSummary({ snapshot }: { snapshot: SnapshotShape }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SummaryBlock
        title="基本信息"
        rows={[
          ['策略编码', snapshot.strategy?.strategyCode || '-'],
          ['策略名称', snapshot.strategy?.strategyName || '-'],
          ['优先级', String(snapshot.strategy?.priority ?? '-')],
        ]}
      />
      <SummaryBlock
        title="触发条件"
        rows={[
          ['触发方式', snapshot.triggerConfig?.modes?.join(' / ') || '-'],
          ['运行时间', getTriggerScheduleLabel(snapshot.triggerConfig)],
        ]}
      />
      <SummaryBlock
        title="筛选条件"
        rows={[
          ['出库类型', snapshot.filterConfig?.orderBusinessTypes?.join(', ') || '-'],
          ['平台', snapshot.filterConfig?.platforms?.join(', ') || '-'],
          ['物流渠道', snapshot.filterConfig?.shippingMethods?.join(', ') || '-'],
          ['条件组关系', snapshot.filterConfig?.groupJoinMode || '-'],
          ['条件行数', String(snapshot.filterConfig?.conditionGroups?.length ?? 0)],
        ]}
      />
      <SummaryBlock
        title="执行控制"
        rows={[
          ['启用批次上限', snapshot.executionConfig?.enableOrderLimit ? '是' : '否'],
          ['每批最大订单数', String(snapshot.executionConfig?.maxOrdersPerRun ?? '-')],
          ['排序字段', snapshot.executionConfig?.batchSortField || '-'],
        ]}
      />
      <SummaryBlock
        title="波次类型"
        rows={[
          ['类型数量', String(snapshot.waveTypeConfig?.length ?? 0)],
          ['启用数量', String(snapshot.waveTypeConfig?.filter((item) => item.enabled).length ?? 0)],
          ['需系统分拣', String(snapshot.waveTypeConfig?.filter((item) => item.downstreamMode === 'SORT_THEN_PACK').length ?? 0)],
        ]}
      />
      <SummaryBlock
        title="释放规则"
        rows={[
          ['释放模式', snapshot.releaseConfig?.releaseMode || '-'],
          ['自动分配', snapshot.releaseConfig?.autoAssignPicker ? '是' : '否'],
          ['跨区拆分', snapshot.pickConfig?.crossZoneSplitMode || '-'],
        ]}
      />
    </div>
  )
}

function SummaryBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="font-medium">{title}</div>
      <div className="mt-3 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-2 text-sm font-medium leading-6">{value}</div>
    </div>
  )
}

function SnapshotStepPreview({ snapshot }: { snapshot: SnapshotShape }) {
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">按步骤只读回显</div>
      <div className="grid gap-3 md:grid-cols-2">
        <StepPreview title="1. 基本信息" lines={[
          ['策略编码', snapshot.strategy?.strategyCode || '-'],
          ['策略名称', snapshot.strategy?.strategyName || '-'],
          ['优先级', String(snapshot.strategy?.priority ?? '-')],
        ]} />
        <StepPreview title="2. 触发条件" lines={[
          ['触发方式', snapshot.triggerConfig?.modes?.join(' / ') || '-'],
          ['运行时间', getTriggerScheduleLabel(snapshot.triggerConfig)],
        ]} />
        <StepPreview title="3. 订单筛选条件" lines={[
          ['条件组关系', snapshot.filterConfig?.groupJoinMode || '-'],
          ['条件行数', String(snapshot.filterConfig?.conditionGroups?.length ?? 0)],
          ['出库类型', snapshot.filterConfig?.orderBusinessTypes?.join(', ') || '-'],
        ]} />
        <StepPreview title="4. 策略执行控制" lines={[
          ['启用批次上限', snapshot.executionConfig?.enableOrderLimit ? '是' : '否'],
          ['每批最大订单数', String(snapshot.executionConfig?.maxOrdersPerRun ?? '-')],
          ['排序', `${snapshot.executionConfig?.batchSortField || '-'} / ${snapshot.executionConfig?.batchSortDirection || '-'}`],
        ]} />
        <StepPreview title="5. 波次类型配置" lines={[
          ['类型数', String(snapshot.waveTypeConfig?.length ?? 0)],
          ['启用数', String(snapshot.waveTypeConfig?.filter((item) => item.enabled).length ?? 0)],
          ['需系统分拣', String(snapshot.waveTypeConfig?.filter((item) => item.downstreamMode === 'SORT_THEN_PACK').length ?? 0)],
        ]} />
        <StepPreview title="6. 拆单与拣货单生成规则" lines={[
          ['跨区拆分', snapshot.pickConfig?.crossZoneSplitMode || '-'],
          ['启用拣货单上限', snapshot.pickConfig?.enableMaxOrderLimit ? '是' : '否'],
          ['单张上限', String(snapshot.pickConfig?.maxOrdersPerPickOrder ?? '-')],
        ]} />
        <StepPreview title="7. 打包衔接规则" lines={[
          ['直接打包类型', String(snapshot.waveTypeConfig?.filter((item) => item.downstreamMode === 'PACK_DIRECT').length ?? 0)],
          ['系统分拣类型', String(snapshot.waveTypeConfig?.filter((item) => item.downstreamMode === 'SORT_THEN_PACK').length ?? 0)],
        ]} />
        <StepPreview title="8. 释放规则" lines={[
          ['释放模式', snapshot.releaseConfig?.releaseMode || '-'],
          ['自动分配', snapshot.releaseConfig?.autoAssignPicker ? '是' : '否'],
        ]} />
      </div>
    </div>
  )
}

function StepPreview({ title, lines }: { title: string; lines: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="font-medium">{title}</div>
      <div className="mt-3 space-y-2 text-sm">
        {lines.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
