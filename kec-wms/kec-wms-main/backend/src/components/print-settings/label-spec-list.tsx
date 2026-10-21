'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PRINT_SCENARIO_LABELS } from '@/lib/printing/print-config'

interface LabelSpec {
  id: string
  code: string
  name: string
  widthMm: number
  heightMm: number
  orientation: 'portrait' | 'landscape'
  isSystem: boolean
  isActive: boolean
}

interface Template {
  id: string
  name: string
  scenarioType: string | null
  labelSpecCode: string | null
  isDefault: boolean
  isActive: boolean
  defaultDevice?: {
    id: string
    name: string
  } | null
}

interface SpecFormState {
  id?: string
  name: string
  widthMm: number
  heightMm: number
  orientation: 'portrait' | 'landscape'
}

const emptyForm: SpecFormState = {
  name: '',
  widthMm: 75,
  heightMm: 50,
  orientation: 'landscape',
}

export function LabelSpecList() {
  const [specs, setSpecs] = useState<LabelSpec[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formState, setFormState] = useState<SpecFormState>(emptyForm)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [specRes, templateRes] = await Promise.all([
        fetch('/api/v1/print-label-specs?pageSize=100'),
        fetch('/api/v1/print-templates?pageSize=100'),
      ])
      const [specJson, templateJson] = await Promise.all([specRes.json(), templateRes.json()])
      if (specJson.success) setSpecs(specJson.data)
      if (templateJson.success) setTemplates(templateJson.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreateDialog = () => {
    setFormState(emptyForm)
    setDialogOpen(true)
  }

  const openEditDialog = (spec: LabelSpec) => {
    setFormState({
      id: spec.id,
      name: spec.name,
      widthMm: Number(spec.widthMm),
      heightMm: Number(spec.heightMm),
      orientation: spec.orientation,
    })
    setDialogOpen(true)
  }

  const submitSpec = async () => {
    const url = formState.id ? `/api/v1/print-label-specs/${formState.id}` : '/api/v1/print-label-specs'
    const method = formState.id ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formState.name,
        widthMm: formState.widthMm,
        heightMm: formState.heightMm,
        orientation: formState.orientation,
      }),
    })
    const json = await res.json()

    if (json.success) {
      toast.success(formState.id ? '标签规格已更新' : '标签规格已创建')
      setDialogOpen(false)
      fetchData()
    } else {
      toast.error(json.message || '保存标签规格失败')
    }
  }

  const deleteSpec = async (spec: LabelSpec) => {
    if (!confirm(`确认删除标签规格「${spec.name}」？`)) return

    const res = await fetch(`/api/v1/print-label-specs/${spec.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast.success('标签规格已删除')
      fetchData()
    } else {
      toast.error(json.message || '删除标签规格失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreateDialog} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          新增自定义规格
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>标签规格</TableHead>
              <TableHead>规格编码</TableHead>
              <TableHead>尺寸</TableHead>
              <TableHead>方向</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>使用业务</TableHead>
              <TableHead>默认打印机</TableHead>
              <TableHead className="w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  加载中...
                </TableCell>
              </TableRow>
            ) : (
              specs.map((spec) => {
                const specTemplates = templates.filter((item) => item.labelSpecCode === spec.code && item.isActive)
                const defaultTemplates = specTemplates.filter((item) => item.isDefault)
                return (
                  <TableRow key={spec.id}>
                    <TableCell className="font-medium">{spec.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{spec.code}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {spec.widthMm} × {spec.heightMm} mm
                    </TableCell>
                    <TableCell className="text-sm">
                      {spec.orientation === 'portrait' ? '纵向' : '横向'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={spec.isSystem ? 'secondary' : 'outline'}>
                        {spec.isSystem ? '系统内置' : '自定义'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {specTemplates.length > 0
                        ? specTemplates
                            .map((item) =>
                              item.scenarioType
                                ? PRINT_SCENARIO_LABELS[item.scenarioType as keyof typeof PRINT_SCENARIO_LABELS] ?? item.scenarioType
                                : item.name
                            )
                            .join('、')
                        : '未使用'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {defaultTemplates.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {defaultTemplates.map((template) => (
                            <Badge key={template.id} variant="outline" className="text-blue-600 border-blue-600">
                              {template.defaultDevice?.name ?? '未设置'}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">未设置</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!spec.isSystem && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(spec)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteSpec(spec)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        标签规格只负责纸张尺寸和方向；模板负责把业务标签绑定到某个规格和默认打印机。
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{formState.id ? '编辑自定义规格' : '新增自定义规格'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">规格名称</label>
              <Input
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="如：标签 75 × 50 mm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">宽度 (mm)</label>
                <Input
                  type="number"
                  value={formState.widthMm}
                  onChange={(event) => setFormState((prev) => ({ ...prev, widthMm: Number(event.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">高度 (mm)</label>
                <Input
                  type="number"
                  value={formState.heightMm}
                  onChange={(event) => setFormState((prev) => ({ ...prev, heightMm: Number(event.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">方向</label>
              <Select
                value={formState.orientation}
                onValueChange={(value) =>
                  setFormState((prev) => ({ ...prev, orientation: value as SpecFormState['orientation'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">纵向</SelectItem>
                  <SelectItem value="landscape">横向</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button type="button" onClick={submitSpec}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
