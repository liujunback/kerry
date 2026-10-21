'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Pencil,
  Play,
  PlayCircle,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileSpreadsheet,
  Eye,
  Plus,
  Search,
  Save,
  Trash2,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { E2eScenarioCreateDialog } from '@/components/dev/e2e-scenario-create-dialog'

// 模块分类映射
const MODULE_CATEGORY_MAP: Record<string, string[]> = {
  all: [], // 空数组表示显示所有
  inbound: ['INBOUND-RECV', 'INBOUND-PUT', 'INBOUND-FULL'],
  outbound: ['OUTBOUND-ORDER', 'OUTBOUND-PICK', 'OUTBOUND-PACK', 'OUTBOUND-CHECKOUT', 'OUTBOUND-FULL'],
}

interface Category {
  id: string
  code: string
  name: string
  _count: { scenarios: number }
}

interface Scenario {
  id: string
  code: string
  name: string
  description: string | null
  config: Record<string, unknown>
  expected: Record<string, unknown>
  isActive: boolean
  category: { code: string; name: string }
  lastResult: {
    status: string
    durationMs: number
    executedAt: string
  } | null
}

interface ExecutionStep {
  name: string
  status: 'success' | 'error' | 'skipped'
  durationMs: number
  input?: unknown
  output?: unknown
  error?: string
}

interface ExecutionResult {
  scenarioCode: string
  scenarioName: string
  passed: boolean
  status: string
  durationMs: number
  steps: ExecutionStep[]
  actual?: Record<string, unknown>
  expected?: Record<string, unknown>
  error?: string
}

interface ScenarioExecutionHistory {
  id: string
  status: string
  durationMs: number
  steps?: unknown
  actual?: Record<string, unknown> | null
  errorMessage?: string | null
  executedAt: string
}

interface ScenarioDetail extends Scenario {
  results: ScenarioExecutionHistory[]
}

export default function E2eScenariosPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [moduleFilter, setModuleFilter] = useState<'all' | 'inbound' | 'outbound'>('all')
  const [search, setSearch] = useState('')
  const [executing, setExecuting] = useState<string | null>(null)
  const [executingBatch, setExecutingBatch] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [resultDialog, setResultDialog] = useState<ExecutionResult | null>(null)
  const [detailDialog, setDetailDialog] = useState<ScenarioDetail | null>(null)
  const [createDialog, setCreateDialog] = useState(false)
  const [detailPanels, setDetailPanels] = useState({
    config: false,
    expected: false,
  })
  const [editingScenario, setEditingScenario] = useState<ScenarioDetail | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Scenario | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [editForm, setEditForm] = useState({
    categoryCode: '',
    code: '',
    name: '',
    description: '',
    isActive: true,
    config: '{}',
    expected: '{}',
  })

  // 加载数据
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [catRes, scenRes] = await Promise.all([
        fetch('/api/v1/e2e/categories'),
        fetch('/api/v1/e2e/scenarios?pageSize=500'),
      ])
      const catData = await catRes.json()
      const scenData = await scenRes.json()

      console.log('Categories response:', catData)
      console.log('Scenarios response:', scenData)

      if (catData.success) {
        setCategories(catData.data)
      }
      if (scenData.success) {
        setScenarios(scenData.data)
      } else {
        console.error('Scenarios API error:', scenData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 执行单个场景
  const executeScenario = async (scenario: Scenario) => {
    setExecuting(scenario.id)
    try {
      const res = await fetch(`/api/v1/e2e/scenarios/${scenario.id}/execute`, {
        method: 'POST',
      })
      const data = await res.json()

      if (data.success) {
        setResultDialog(data.data)
        if (data.data.passed) {
          toast.success(`${scenario.name} 执行通过`)
        } else {
          toast.error(`${scenario.name} 执行失败`)
        }
        fetchData() // 刷新列表
      } else {
        toast.error(data.message || '执行失败')
      }
    } catch (error) {
      console.error('Execute failed:', error)
      toast.error('执行失败')
    } finally {
      setExecuting(null)
    }
  }

  const openScenarioDetail = async (scenario: Scenario) => {
    try {
      const res = await fetch(`/api/v1/e2e/scenarios/${scenario.id}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || '加载场景详情失败')
      }
      setDetailDialog(data.data as ScenarioDetail)
    } catch (error) {
      console.error('Load scenario detail failed:', error)
      toast.error(error instanceof Error ? error.message : '加载场景详情失败')
    }
  }

  const openEditScenario = async (scenario: Scenario) => {
    try {
      const res = await fetch(`/api/v1/e2e/scenarios/${scenario.id}`)
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || '加载编辑数据失败')
      }
      const detail = data.data as ScenarioDetail
      setEditingScenario(detail)
      setEditForm({
        categoryCode: detail.category.code,
        code: detail.code,
        name: detail.name,
        description: detail.description || '',
        isActive: detail.isActive,
        config: JSON.stringify(detail.config, null, 2),
        expected: JSON.stringify(detail.expected, null, 2),
      })
    } catch (error) {
      console.error('Open edit failed:', error)
      toast.error(error instanceof Error ? error.message : '加载编辑数据失败')
    }
  }

  const saveScenario = async () => {
    if (!editingScenario) return

    let config: Record<string, unknown>
    let expected: Record<string, unknown>
    try {
      config = JSON.parse(editForm.config) as Record<string, unknown>
      expected = JSON.parse(editForm.expected) as Record<string, unknown>
    } catch {
      toast.error('配置或预期结果 JSON 格式错误')
      return
    }

    setEditSaving(true)
    try {
      const res = await fetch(`/api/v1/e2e/scenarios/${editingScenario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryCode: editForm.categoryCode,
          name: editForm.name,
          description: editForm.description || null,
          config,
          expected,
          isActive: editForm.isActive,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || '保存失败')
      }
      toast.success('场景已更新')
      setEditingScenario(null)
      await fetchData()
    } catch (error) {
      console.error('Save scenario failed:', error)
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setEditSaving(false)
    }
  }

  const deleteScenario = async () => {
    if (!deleteTarget) return
    if (selectedIds.size > 0) {
      toast.warning('批量选择状态下不能删除单个场景，请先清空选择')
      return
    }
    if (deleteConfirmText.trim() !== deleteTarget.code) {
      toast.error('请输入完整场景编码以确认删除')
      return
    }

    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/e2e/scenarios/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || '删除失败')
      }
      toast.success('场景已删除')
      setDeleteTarget(null)
      setDeleteConfirmText('')
      if (detailDialog?.id === deleteTarget.id) {
        setDetailDialog(null)
      }
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(deleteTarget.id)
        return next
      })
      await fetchData()
    } catch (error) {
      console.error('Delete scenario failed:', error)
      toast.error(error instanceof Error ? error.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  // 批量执行
  const executeBatch = async () => {
    if (selectedIds.size === 0) {
      toast.warning('请先选择要执行的场景')
      return
    }

    setExecutingBatch(true)
    try {
      const res = await fetch('/api/v1/e2e/scenarios/execute-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioIds: Array.from(selectedIds) }),
      })
      const data = await res.json()

      if (data.success) {
        const { passed, failed, error } = data.data
        toast.success(`执行完成: ${passed} 通过, ${failed} 失败, ${error} 错误`)
        fetchData()
        setSelectedIds(new Set())
      } else {
        toast.error(data.message || '批量执行失败')
      }
    } catch (error) {
      console.error('Batch execute failed:', error)
      toast.error('批量执行失败')
    } finally {
      setExecutingBatch(false)
    }
  }

  // 执行分类下所有场景
  const executeCategory = async (categoryCode: string) => {
    setExecutingBatch(true)
    try {
      const res = await fetch('/api/v1/e2e/scenarios/execute-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryCode }),
      })
      const data = await res.json()

      if (data.success) {
        const { passed, failed, error } = data.data
        toast.success(`执行完成: ${passed} 通过, ${failed} 失败, ${error} 错误`)
        fetchData()
      } else {
        toast.error(data.message || '执行失败')
      }
    } catch (error) {
      console.error('Category execute failed:', error)
      toast.error('执行失败')
    } finally {
      setExecutingBatch(false)
    }
  }

  // 导出 Excel
  const exportExcel = async () => {
    try {
      const res = await fetch('/api/v1/e2e/scenarios/export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `e2e-scenarios-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('导出成功')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('导出失败')
    }
  }

  // 导入 Excel
  const importExcel = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/v1/e2e/scenarios/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (data.success) {
        const { created, updated, failed } = data.data
        toast.success(`导入完成: ${created} 新建, ${updated} 更新, ${failed} 失败`)
        fetchData()
      } else {
        toast.error(data.message || '导入失败')
      }
    } catch (error) {
      console.error('Import failed:', error)
      toast.error('导入失败')
    }
  }

  // 切换选择
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 全选分类
  const selectCategory = (categoryCode: string, selected: boolean) => {
    const categoryScenarios = scenarios.filter((s) => s.category.code === categoryCode)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const s of categoryScenarios) {
        if (selected) {
          next.add(s.id)
        } else {
          next.delete(s.id)
        }
      }
      return next
    })
  }

  // 获取状态图标
  const getStatusIcon = (status: string | null) => {
    if (!status) return <Clock className="h-4 w-4 text-muted-foreground" />
    if (status === 'PASSED') return <CheckCircle2 className="h-4 w-4 text-green-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  // 获取状态 Badge
  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">未执行</Badge>
    if (status === 'PASSED') return <Badge className="bg-green-500">通过</Badge>
    return <Badge variant="destructive">失败</Badge>
  }

  const getStatusStripClass = (status: string | null) => {
    if (status === 'PASSED') return 'bg-green-500'
    if (status === 'FAILED' || status === 'ERROR') return 'bg-red-500'
    return 'bg-slate-300'
  }

  const openLatestResult = (scenario: ScenarioDetail) => {
    const latest = scenario.results[0]
    if (!latest) {
      toast.warning('当前场景还没有执行记录')
      return
    }

    setResultDialog({
      scenarioCode: scenario.code,
      scenarioName: scenario.name,
      passed: latest.status === 'PASSED',
      status: latest.status,
      durationMs: latest.durationMs,
      steps: Array.isArray(latest.steps) ? latest.steps as ExecutionStep[] : [],
      actual: latest.actual || undefined,
      expected: scenario.expected,
      error: latest.errorMessage || undefined,
    })
  }

  const openResultHistoryEntry = (scenario: ScenarioDetail, history: ScenarioExecutionHistory) => {
    setResultDialog({
      scenarioCode: scenario.code,
      scenarioName: scenario.name,
      passed: history.status === 'PASSED',
      status: history.status,
      durationMs: history.durationMs,
      steps: Array.isArray(history.steps) ? history.steps as ExecutionStep[] : [],
      actual: history.actual || undefined,
      expected: scenario.expected,
      error: history.errorMessage || undefined,
    })
  }

  // 按分类分组场景（根据模块过滤）
  const filteredCategories = moduleFilter === 'all'
    ? categories
    : categories.filter((cat) => MODULE_CATEGORY_MAP[moduleFilter].includes(cat.code))

  const scenariosByCategory = filteredCategories.map((cat) => ({
    ...cat,
    scenarios: scenarios.filter((s) => {
      const matchesCategory = s.category.code === cat.code
      const keyword = search.trim().toLowerCase()
      const matchesSearch =
        !keyword ||
        s.code.toLowerCase().includes(keyword) ||
        s.name.toLowerCase().includes(keyword) ||
        (s.description || '').toLowerCase().includes(keyword)
      return matchesCategory && matchesSearch
    }),
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
    <div className="container mx-auto py-4 flex flex-col gap-4 h-full">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">E2E 测试场景管理</h1>
          <p className="text-muted-foreground">管理和执行入库模块的端到端测试场景</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="relative min-w-[260px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="搜索编码、名称、描述"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新建
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <label>
            <Input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importExcel(file)
                e.target.value = ''
              }}
            />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-1" />
                导入
              </span>
            </Button>
          </label>
          <Button
            size="sm"
            onClick={executeBatch}
            disabled={selectedIds.size === 0 || executingBatch}
          >
            {executingBatch ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-1" />
            )}
            执行选中 ({selectedIds.size})
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总场景数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scenarios.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">通过</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {scenarios.filter((s) => s.lastResult?.status === 'PASSED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">失败</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {scenarios.filter((s) => s.lastResult?.status === 'FAILED' || s.lastResult?.status === 'ERROR').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">未执行</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {scenarios.filter((s) => !s.lastResult).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 左右分栏布局 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 左侧分类导航 */}
        <Card className="w-64 flex-shrink-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">场景分类</CardTitle>
              <Tabs value={moduleFilter} onValueChange={(v) => setModuleFilter(v as typeof moduleFilter)}>
                <TabsList className="h-7">
                  <TabsTrigger value="all" className="text-xs px-2 h-6">全部</TabsTrigger>
                  <TabsTrigger value="inbound" className="text-xs px-2 h-6">入库</TabsTrigger>
                  <TabsTrigger value="outbound" className="text-xs px-2 h-6">出库</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-1 p-2">
                {scenariosByCategory.map((cat) => {
                  const isSelected = selectedCategory === cat.code
                  const passedCount = cat.scenarios.filter((s) => s.lastResult?.status === 'PASSED').length
                  const failedCount = cat.scenarios.filter((s) => s.lastResult?.status === 'FAILED' || s.lastResult?.status === 'ERROR').length

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.code)}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors',
                        isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate text-sm">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {passedCount > 0 && (
                          <Badge variant={isSelected ? 'secondary' : 'default'} className="bg-green-500 text-white text-xs px-1.5">
                            {passedCount}
                          </Badge>
                        )}
                        {failedCount > 0 && (
                          <Badge variant="destructive" className="text-xs px-1.5">
                            {failedCount}
                          </Badge>
                        )}
                        <Badge variant={isSelected ? 'secondary' : 'outline'} className="text-xs px-1.5">
                          {cat.scenarios.length}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 右侧场景列表 */}
        <Card className="flex-1 min-w-0">
          {selectedCategory ? (
            <>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">
                    {scenariosByCategory.find((c) => c.code === selectedCategory)?.name}
                  </CardTitle>
                  <Badge variant="outline">
                    {scenariosByCategory.find((c) => c.code === selectedCategory)?.scenarios.length} 个场景
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={(() => {
                      const cat = scenariosByCategory.find((c) => c.code === selectedCategory)
                      if (!cat) return false
                      const catScenarioIds = cat.scenarios.map((s) => s.id)
                      return catScenarioIds.length > 0 && catScenarioIds.every((id) => selectedIds.has(id))
                    })()}
                    onCheckedChange={(checked) => selectCategory(selectedCategory, checked === true)}
                  />
                  <span className="text-sm text-muted-foreground">全选</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => executeCategory(selectedCategory)}
                    disabled={executingBatch}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    执行全部
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <div className="divide-y">
                    {scenariosByCategory
                      .find((c) => c.code === selectedCategory)
                      ?.scenarios.map((scenario) => (
                        <div
                          key={scenario.id}
                          className="flex items-center justify-between py-2 px-4 hover:bg-muted/30"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Checkbox
                              checked={selectedIds.has(scenario.id)}
                              onCheckedChange={() => toggleSelect(scenario.id)}
                            />
                            <div className={cn('h-8 w-1.5 rounded-full', scenario.lastResult?.status === 'PASSED' ? 'bg-green-500' : scenario.lastResult ? 'bg-red-500' : 'bg-slate-300')} />
                            {getStatusIcon(scenario.lastResult?.status || null)}
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{scenario.code}</div>
                              <div className="text-xs text-muted-foreground truncate">{scenario.name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {scenario.lastResult?.executedAt
                                  ? `最后执行 ${new Date(scenario.lastResult.executedAt).toLocaleString()}`
                                  : '未执行'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {getStatusBadge(scenario.lastResult?.status || null)}
                            {scenario.lastResult && (
                              <span className="text-xs text-muted-foreground w-12 text-right">
                                {scenario.lastResult.durationMs}ms
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => void openScenarioDetail(scenario)}
                              title="查看详情"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => void openEditScenario(scenario)}
                              title="编辑"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                              onClick={() => setDeleteTarget(scenario)}
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => executeScenario(scenario)}
                              disabled={executing === scenario.id}
                              title="执行"
                            >
                              {executing === scenario.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>请在左侧选择一个分类查看场景</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* 执行结果弹窗 */}
      <Dialog open={!!resultDialog} onOpenChange={() => setResultDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {resultDialog?.passed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {resultDialog?.scenarioName}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="flex items-center gap-4 text-sm">
                <span>编码: {resultDialog?.scenarioCode}</span>
                <span>耗时: {resultDialog?.durationMs}ms</span>
                {resultDialog?.passed ? (
                  <Badge className="bg-green-500">通过</Badge>
                ) : (
                  <Badge variant="destructive">失败</Badge>
                )}
              </div>

              {/* 执行步骤 */}
              <div className="space-y-2">
                <h4 className="font-medium">执行步骤</h4>
                <div className="space-y-1">
                  {resultDialog?.steps.map((step, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded text-sm',
                        step.status === 'success' && 'bg-green-50',
                        step.status === 'error' && 'bg-red-50',
                        step.status === 'skipped' && 'bg-gray-50'
                      )}
                    >
                      {step.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {step.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                      {step.status === 'skipped' && <Clock className="h-4 w-4 text-gray-400" />}
                      <span className="flex-1">{step.name}</span>
                      <span className="text-muted-foreground">{step.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 错误信息 */}
              {resultDialog?.error && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-500">错误信息</h4>
                  <pre className="p-3 bg-red-50 rounded text-sm text-red-700 whitespace-pre-wrap">
                    {resultDialog.error}
                  </pre>
                </div>
              )}

              {/* 预期 vs 实际 */}
              {resultDialog?.actual && resultDialog?.expected && (
                <div className="space-y-2">
                  <h4 className="font-medium">预期 vs 实际</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">预期</div>
                      <pre className="p-2 bg-muted rounded text-xs">
                        {JSON.stringify(resultDialog.expected, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">实际</div>
                      <pre className="p-2 bg-muted rounded text-xs">
                        {JSON.stringify(resultDialog.actual, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 场景详情弹窗 */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="w-[min(760px,calc(100vw-32px))] max-w-none h-[calc(100vh-32px)] max-h-none left-auto right-4 top-4 translate-x-0 translate-y-0 rounded-2xl border p-0 gap-0 bg-background shadow-2xl [&>button]:right-4 [&>button]:top-4">
          <DialogHeader className="border-b px-5 py-4 pr-24">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {detailDialog?.name}
                </DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground truncate">{detailDialog?.code}</p>
              </div>
              {detailDialog && (
                <div className="flex items-center gap-2 pr-8">
                  <Button size="sm" variant="outline" onClick={() => openLatestResult(detailDialog)}>
                    <PlayCircle className="h-4 w-4 mr-1" />
                    最后结果
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void openEditScenario(detailDialog)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    编辑
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-5 px-5 py-5">
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-background border px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">编码</div>
                    <div className="mt-1 font-mono">{detailDialog?.code}</div>
                  </div>
                  <div className="rounded-lg bg-background border px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">分类</div>
                    <div className="mt-1">{detailDialog?.category.name}</div>
                  </div>
                  <div className="rounded-lg bg-background border px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">状态</div>
                    <div className="mt-1">
                      {detailDialog?.isActive ? (
                        <Badge className="bg-green-500 hover:bg-green-500">启用</Badge>
                      ) : (
                        <Badge variant="secondary">禁用</Badge>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-background border px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">最近执行</div>
                    <div className="mt-1">
                      {detailDialog?.results?.[0]
                        ? `${detailDialog.results[0].status} (${detailDialog.results[0].durationMs}ms)`
                        : '未执行'}
                    </div>
                  </div>
                </div>
                {detailDialog?.description && (
                  <div className="rounded-lg bg-background border px-3 py-3 text-sm">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">描述</div>
                    <div>{detailDialog.description}</div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">最近一次执行结果</h4>
                {detailDialog?.results?.[0] ? (
                  <div className="rounded-xl border bg-background p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(detailDialog.results[0].status)}
                        <span>{detailDialog.results[0].durationMs}ms</span>
                      </div>
                      <span className="text-muted-foreground">
                        {new Date(detailDialog.results[0].executedAt).toLocaleString()}
                      </span>
                    </div>
                    {detailDialog.results[0].errorMessage && (
                      <pre className="p-3 bg-red-50 rounded-lg text-sm text-red-700 whitespace-pre-wrap">
                        {detailDialog.results[0].errorMessage}
                      </pre>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    当前场景还没有执行记录
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">历史执行记录</h4>
                {detailDialog?.results?.length ? (
                  <div className="rounded-xl border overflow-hidden bg-background">
                    {detailDialog.results.map((history) => (
                      <button
                        key={history.id}
                        type="button"
                        onClick={() => openResultHistoryEntry(detailDialog, history)}
                        className="w-full flex items-start justify-between gap-4 px-4 py-3 text-left hover:bg-muted/40 border-b last:border-b-0"
                      >
                        <div className="flex gap-3 min-w-0">
                          <div className="flex flex-col items-center pt-1">
                            <div className={cn('h-3 w-3 rounded-full', getStatusStripClass(history.status))} />
                            <div className="w-px flex-1 bg-border mt-2 min-h-[20px]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(history.status)}
                              <span className="text-xs text-muted-foreground">{history.durationMs}ms</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(history.executedAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground mt-1" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    暂无历史执行记录
                  </div>
                )}
              </div>

              <Collapsible
                open={detailPanels.config}
                onOpenChange={(open) => setDetailPanels((prev) => ({ ...prev, config: open }))}
              >
                <div className="rounded-xl border bg-background">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="w-full flex items-center justify-between px-4 py-3 text-left">
                      <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">测试配置</span>
                      <span className="text-xs text-muted-foreground">{detailPanels.config ? '收起' : '展开'}</span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="px-4 pb-4 text-xs overflow-auto">
                      {JSON.stringify(detailDialog?.config, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Collapsible
                open={detailPanels.expected}
                onOpenChange={(open) => setDetailPanels((prev) => ({ ...prev, expected: open }))}
              >
                <div className="rounded-xl border bg-background">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="w-full flex items-center justify-between px-4 py-3 text-left">
                      <span className="text-sm font-medium uppercase tracking-wide text-muted-foreground">预期结果</span>
                      <span className="text-xs text-muted-foreground">{detailPanels.expected ? '收起' : '展开'}</span>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="px-4 pb-4 text-xs overflow-auto">
                      {JSON.stringify(detailDialog?.expected, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingScenario} onOpenChange={(open) => !open && setEditingScenario(null)}>
        <DialogContent className="w-[min(760px,calc(100vw-32px))] max-w-none h-[calc(100vh-32px)] max-h-none left-auto right-4 top-4 translate-x-0 translate-y-0 rounded-2xl border p-0 gap-0 bg-background shadow-2xl [&>button]:right-4 [&>button]:top-4">
          <DialogHeader className="border-b px-5 py-4 pr-24">
            <div className="space-y-2">
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                编辑测试场景
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{editForm.code}</span>
                <span>·</span>
                <span>{editForm.categoryCode || '未选择分类'}</span>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[calc(100vh-120px)]">
            <div className="space-y-5 px-5 py-5">
              <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>场景编码</Label>
                    <Input value={editForm.code} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>所属分类</Label>
                    <Select value={editForm.categoryCode} onValueChange={(value) => setEditForm((prev) => ({ ...prev, categoryCode: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.code} value={category.code}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>场景名称</Label>
                    <Input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="rounded-lg border bg-background px-3 py-3 flex items-center gap-2 self-end">
                    <Checkbox
                      checked={editForm.isActive}
                      onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, isActive: checked === true }))}
                    />
                    <Label className="cursor-pointer">启用场景</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>描述</Label>
                  <Input
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="场景描述"
                  />
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>测试配置 (JSON)</Label>
                  <span className="text-xs text-muted-foreground">config</span>
                </div>
                <Textarea
                  className="min-h-[260px] font-mono text-xs"
                  value={editForm.config}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, config: e.target.value }))}
                />
              </div>

              <div className="rounded-xl border bg-background p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label>预期结果 (JSON)</Label>
                  <span className="text-xs text-muted-foreground">expected</span>
                </div>
                <Textarea
                  className="min-h-[220px] font-mono text-xs"
                  value={editForm.expected}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, expected: e.target.value }))}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="border-t bg-background/95 backdrop-blur px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">修改将直接写入当前测试场景配置</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="min-w-[96px]" onClick={() => setEditingScenario(null)}>
                  取消
                </Button>
                <Button className="min-w-[128px]" onClick={() => void saveScenario()} disabled={editSaving}>
                  {editSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  保存修改
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
            setDeleteConfirmText('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除测试场景</AlertDialogTitle>
            <AlertDialogDescription>
              将删除场景 `{deleteTarget?.code}`，以及关联的执行结果记录。该操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">输入场景编码确认删除</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={deleteTarget?.code || '输入完整编码'}
            />
            {selectedIds.size > 0 && (
              <p className="text-xs text-amber-600">
                当前处于批量选择状态，请先取消所有勾选后再删除单个场景。
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault()
                void deleteScenario()
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <E2eScenarioCreateDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        categories={categories.map((category) => ({ id: category.id, code: category.code, name: category.name }))}
        onCreated={fetchData}
      />
    </div>
    </div>
  )
}
