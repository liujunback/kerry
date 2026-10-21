'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Star } from 'lucide-react'
import { TemplateDialog } from './template-dialog'
import { toast } from 'sonner'
import { PRINT_SCENARIO_LABELS } from '@/lib/printing/print-config'

interface Template {
  id: string
  name: string
  labelType: string
  scenarioType: string | null
  labelSpecCode: string | null
  warehouseId: string | null
  widthMm: number
  heightMm: number
  orientation: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  defaultDevice?: {
    id: string
    name: string
  } | null
  warehouse?: {
    id: string
    warehouseName: string
    warehouseCode: string
  } | null
}

export function TemplateList() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/print-templates?pageSize=100')
      const json = await res.json()
      if (json.success) setTemplates(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该模板？')) return
    const res = await fetch(`/api/v1/print-templates/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast.success('模板已删除')
      fetchTemplates()
    } else {
      toast.error(json.message)
    }
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setDialogOpen(true)
  }

  const handleAdd = () => {
    setEditingTemplate(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          新建模板
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>模板名称</TableHead>
              <TableHead>业务标签</TableHead>
              <TableHead>适用仓库</TableHead>
              <TableHead>尺寸</TableHead>
              <TableHead>方向</TableHead>
              <TableHead>默认打印机</TableHead>
              <TableHead>状态</TableHead>
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
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  暂无模板，点击右上角新建
                </TableCell>
              </TableRow>
            ) : (
              templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium flex items-center gap-1">
                    {t.isDefault && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                    {t.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {t.scenarioType
                        ? PRINT_SCENARIO_LABELS[t.scenarioType as keyof typeof PRINT_SCENARIO_LABELS] ?? t.scenarioType
                        : '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.warehouse
                      ? `${t.warehouse.warehouseCode} - ${t.warehouse.warehouseName}`
                      : '全局默认'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.widthMm} × {t.heightMm} mm
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.orientation === 'portrait' ? '纵向' : '横向'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.defaultDevice ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-600">
                        {t.defaultDevice.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">未设置</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.isActive ? 'default' : 'secondary'}>
                      {t.isActive ? '启用' : '停用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TemplateDialog
        open={dialogOpen}
        template={editingTemplate}
        onOpenChange={setDialogOpen}
        onSuccess={() => { setDialogOpen(false); fetchTemplates() }}
      />
    </div>
  )
}
