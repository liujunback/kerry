'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WarehouseSelect } from '@/components/warehouses/warehouse-select'

type RuleSet = {
  triggerConfig: {
    modes: Array<'MANUAL' | 'SCHEDULED' | 'API'>
    cronExpression?: string | null
  }
  filterConfig: {
    orderBusinessTypes: string[]
    clientIds: string[]
    platforms: string[]
    shippingMethods: string[]
    zoneIds: string[]
    expectedOutboundTime?: {
      from?: string | null
      to?: string | null
    } | null
  }
  executionConfig: {
    enableOrderLimit: boolean
    maxOrdersPerRun?: number | null
    batchSortField: 'expectedOutboundTime' | 'createdAt'
    batchSortDirection: 'asc' | 'desc'
  }
  waveTypeConfig: Array<{
    code: 'SINGLE_ONE_HOT' | 'SINGLE_ONE_NORMAL' | 'SINGLE_MULTI_HOT' | 'SINGLE_MULTI_NORMAL' | 'MULTI_FIXED_COMBO' | 'MULTI_NON_FIXED'
    enabled: boolean
    ordersPerWave: number
    pickMode: 'BY_ORDER' | 'SKU_BATCH' | 'MIXED_BATCH' | 'PICK_AND_SORT'
    downstreamMode: 'PACK_DIRECT' | 'SORT_THEN_PACK'
    identifyRule?: {
      hotSkuIds?: string[]
      fixedCombos?: Array<Array<{ skuId: string; qty: number }>>
    }
  }>
  pickConfig: {
    crossZoneSplitMode: 'BY_ZONE' | 'NO_SPLIT'
    enableMaxOrderLimit: boolean
    maxOrdersPerPickOrder?: number | null
    pathOptimizeMode: 'LOCATION_ASC'
  }
  releaseConfig: {
    releaseMode: 'IMMEDIATE' | 'MANUAL'
    autoAssignPicker: boolean
  }
}

export interface WaveStrategyDetail {
  id: string
  warehouseId: string
  strategyCode: string
  strategyName: string
  description: string | null
  priority: number
  status: 'DRAFT' | 'ENABLED' | 'DISABLED' | 'ARCHIVED'
  currentVersion?: {
    id: string
    versionNo: number
    versionStatus: string
    ruleSet?: {
      triggerConfigJson: RuleSet['triggerConfig']
      filterConfigJson: RuleSet['filterConfig']
      executionConfigJson: RuleSet['executionConfig']
      waveTypeConfigJson: RuleSet['waveTypeConfig']
      pickConfigJson: RuleSet['pickConfig']
      releaseConfigJson: RuleSet['releaseConfig']
    } | null
  } | null
}

interface StrategyDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  strategy?: WaveStrategyDetail | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface FormState {
  warehouseId: string
  strategyCode: string
  strategyName: string
  description: string
  priority: string
  status: 'DRAFT' | 'ENABLED' | 'DISABLED' | 'ARCHIVED'
  allowManual: boolean
  allowScheduled: boolean
  cronExpression: string
  enableOrderLimit: boolean
  maxOrdersPerRun: string
  releaseMode: 'IMMEDIATE' | 'MANUAL'
  autoAssignPicker: boolean
}

function createDefaultRules(form: FormState): RuleSet {
  return {
    triggerConfig: {
      modes: [
        ...(form.allowManual ? ['MANUAL' as const] : []),
        ...(form.allowScheduled ? ['SCHEDULED' as const] : []),
      ],
      cronExpression: form.allowScheduled && form.cronExpression.trim() ? form.cronExpression.trim() : null,
    },
    filterConfig: {
      orderBusinessTypes: [],
      clientIds: [],
      platforms: [],
      shippingMethods: [],
      zoneIds: [],
      expectedOutboundTime: null,
    },
    executionConfig: {
      enableOrderLimit: form.enableOrderLimit,
      maxOrdersPerRun: form.enableOrderLimit && form.maxOrdersPerRun ? Number(form.maxOrdersPerRun) : null,
      batchSortField: 'expectedOutboundTime',
      batchSortDirection: 'asc',
    },
    waveTypeConfig: [
      { code: 'SINGLE_ONE_HOT', enabled: true, ordersPerWave: 100, pickMode: 'SKU_BATCH', downstreamMode: 'PACK_DIRECT', identifyRule: { hotSkuIds: [], fixedCombos: [] } },
      { code: 'SINGLE_ONE_NORMAL', enabled: true, ordersPerWave: 50, pickMode: 'MIXED_BATCH', downstreamMode: 'PACK_DIRECT', identifyRule: { hotSkuIds: [], fixedCombos: [] } },
      { code: 'SINGLE_MULTI_HOT', enabled: true, ordersPerWave: 80, pickMode: 'SKU_BATCH', downstreamMode: 'PACK_DIRECT', identifyRule: { hotSkuIds: [], fixedCombos: [] } },
      { code: 'SINGLE_MULTI_NORMAL', enabled: true, ordersPerWave: 48, pickMode: 'MIXED_BATCH', downstreamMode: 'SORT_THEN_PACK', identifyRule: { hotSkuIds: [], fixedCombos: [] } },
      { code: 'MULTI_FIXED_COMBO', enabled: true, ordersPerWave: 60, pickMode: 'MIXED_BATCH', downstreamMode: 'PACK_DIRECT', identifyRule: { hotSkuIds: [], fixedCombos: [] } },
      { code: 'MULTI_NON_FIXED', enabled: true, ordersPerWave: 48, pickMode: 'MIXED_BATCH', downstreamMode: 'SORT_THEN_PACK', identifyRule: { hotSkuIds: [], fixedCombos: [] } },
    ],
    pickConfig: {
      crossZoneSplitMode: 'NO_SPLIT',
      enableMaxOrderLimit: false,
      maxOrdersPerPickOrder: null,
      pathOptimizeMode: 'LOCATION_ASC',
    },
    releaseConfig: {
      releaseMode: form.releaseMode,
      autoAssignPicker: form.autoAssignPicker,
    },
  }
}

function createInitialForm(): FormState {
  return {
    warehouseId: '',
    strategyCode: '',
    strategyName: '',
    description: '',
    priority: '100',
    status: 'DRAFT',
    allowManual: true,
    allowScheduled: false,
    cronExpression: '0 */30 * * * *',
    enableOrderLimit: false,
    maxOrdersPerRun: '200',
    releaseMode: 'MANUAL',
    autoAssignPicker: false,
  }
}

function buildFormFromStrategy(strategy: WaveStrategyDetail): FormState {
  const form = createInitialForm()
  const ruleSet = strategy.currentVersion?.ruleSet
  const triggerConfig = ruleSet?.triggerConfigJson
  const executionConfig = ruleSet?.executionConfigJson
  const releaseConfig = ruleSet?.releaseConfigJson

  return {
    warehouseId: strategy.warehouseId,
    strategyCode: strategy.strategyCode,
    strategyName: strategy.strategyName,
    description: strategy.description || '',
    priority: String(strategy.priority),
    status: strategy.status,
    allowManual: triggerConfig?.modes?.includes('MANUAL') ?? true,
    allowScheduled: triggerConfig?.modes?.includes('SCHEDULED') ?? false,
    cronExpression: triggerConfig?.cronExpression || form.cronExpression,
    enableOrderLimit: executionConfig?.enableOrderLimit ?? false,
    maxOrdersPerRun: executionConfig?.maxOrdersPerRun ? String(executionConfig.maxOrdersPerRun) : form.maxOrdersPerRun,
    releaseMode: releaseConfig?.releaseMode ?? 'MANUAL',
    autoAssignPicker: releaseConfig?.autoAssignPicker ?? false,
  }
}

export function StrategyDialog({
  open,
  mode,
  strategy,
  onOpenChange,
  onSuccess,
}: StrategyDialogProps) {
  const [form, setForm] = useState<FormState>(createInitialForm())
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && strategy) {
      setForm(buildFormFromStrategy(strategy))
      return
    }
    setForm(createInitialForm())
  }, [mode, open, strategy])

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!form.warehouseId || !form.strategyCode.trim() || !form.strategyName.trim()) {
      toast.error('请先填写仓库、策略编码和策略名称')
      return
    }

    if (!form.allowManual && !form.allowScheduled) {
      toast.error('至少选择一种触发方式')
      return
    }

    if (form.allowScheduled && !form.cronExpression.trim()) {
      toast.error('启用定时触发时必须填写 Cron 表达式')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        warehouseId: form.warehouseId,
        strategyCode: form.strategyCode.trim(),
        strategyName: form.strategyName.trim(),
        description: form.description.trim() || null,
        priority: Number(form.priority),
        status: form.status,
        rules: createDefaultRules(form),
      }

      const response = await fetch(
        mode === 'create' ? '/api/v1/wave-strategies' : `/api/v1/wave-strategies/${strategy?.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || '保存失败')
      }

      toast.success(mode === 'create' ? '波次策略创建成功' : '波次策略更新成功')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '新建波次策略' : '编辑波次策略'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>适用仓库</Label>
            <WarehouseSelect value={form.warehouseId} onValueChange={(value) => updateForm('warehouseId', value)} />
          </div>
          <div className="space-y-2">
            <Label>策略状态</Label>
            <Select value={form.status} onValueChange={(value) => updateForm('status', value as FormState['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">草稿</SelectItem>
                <SelectItem value="ENABLED">启用</SelectItem>
                <SelectItem value="DISABLED">禁用</SelectItem>
                <SelectItem value="ARCHIVED">归档</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>策略编码</Label>
            <Input
              value={form.strategyCode}
              onChange={(e) => updateForm('strategyCode', e.target.value)}
              placeholder="如 WAVE_STANDARD_001"
              disabled={mode === 'edit'}
            />
          </div>
          <div className="space-y-2">
            <Label>优先级</Label>
            <Input value={form.priority} onChange={(e) => updateForm('priority', e.target.value)} type="number" min="1" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>策略名称</Label>
            <Input value={form.strategyName} onChange={(e) => updateForm('strategyName', e.target.value)} placeholder="请输入策略名称" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>描述</Label>
            <Textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="可选，描述该策略适用场景" />
          </div>

          <div className="space-y-3 md:col-span-2 rounded-md border p-4">
            <div className="font-medium text-sm">触发与释放</div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.allowManual} onCheckedChange={(v) => updateForm('allowManual', !!v)} />
                手动触发
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.allowScheduled} onCheckedChange={(v) => updateForm('allowScheduled', !!v)} />
                定时触发
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.enableOrderLimit} onCheckedChange={(v) => updateForm('enableOrderLimit', !!v)} />
                启用批次订单上限
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Cron 表达式</Label>
                <Input value={form.cronExpression} onChange={(e) => updateForm('cronExpression', e.target.value)} placeholder="0 */30 * * * *" />
              </div>
              <div className="space-y-2">
                <Label>每批最大订单数</Label>
                <Input value={form.maxOrdersPerRun} onChange={(e) => updateForm('maxOrdersPerRun', e.target.value)} type="number" min="1" disabled={!form.enableOrderLimit} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>释放模式</Label>
                <Select value={form.releaseMode} onValueChange={(value) => updateForm('releaseMode', value as FormState['releaseMode'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">手动释放</SelectItem>
                    <SelectItem value="IMMEDIATE">立即释放</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.autoAssignPicker} onCheckedChange={(v) => updateForm('autoAssignPicker', !!v)} />
                  自动分配拣货员
                </label>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            当前表单提供策略入口的最小配置能力。筛选条件、波次类型细则、固定组合和热销 SKU 等高级配置暂使用系统默认规则，后续可继续扩展为完整八步配置页。
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === 'create' ? '创建策略' : '保存修改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
