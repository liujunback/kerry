'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Play, Pause, Clock, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { formatDateTime } from '@/lib/utils/date-formatter'

interface ScheduledTask {
  id: string
  taskCode: string
  taskName: string
  description: string | null
  cronExpression: string
  handler: string
  isActive: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  lastRunStatus: string | null
  lastRunDuration: number | null
  runCount: number
  failCount: number
  createdAt: string
}

interface Handler {
  name: string
  description: string
}

const TASK_TYPES = [
  { value: 'INVENTORY_ALERT', label: 'scheduledTask.taskTypes.INVENTORY_ALERT' },
  { value: 'DATA_SYNC', label: 'scheduledTask.taskTypes.DATA_SYNC' },
  { value: 'REPORT_GENERATE', label: 'scheduledTask.taskTypes.REPORT_GENERATE' },
  { value: 'DATA_CLEANUP', label: 'scheduledTask.taskTypes.DATA_CLEANUP' },
  { value: 'CUSTOM', label: 'scheduledTask.taskTypes.CUSTOM' },
]

export function ScheduledTasksPage() {
  const t = useTranslations('scheduledTask')
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('operationRules')),
    module: { label: t('title'), href: '/scheduled-tasks' },
  })
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [handlers, setHandlers] = useState<Handler[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    taskCode: '',
    taskName: '',
    description: '',
    cronExpression: '0 0 * * *',
    handler: '',
    isActive: true,
  })

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/scheduled-tasks')
      const data = await res.json()
      if (data.success) {
        setTasks(data.data)
      } else {
        toast.error(data.message || t('fetchFailed'))
      }
    } catch {
      toast.error(t('fetchFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  const fetchHandlers = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/scheduled-tasks/handlers')
      const data = await res.json()
      if (data.success) {
        setHandlers(data.data)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchTasks()
    fetchHandlers()
  }, [fetchTasks, fetchHandlers])

  const handleToggle = async (task: ScheduledTask) => {
    setActionLoading(task.id)
    try {
      const res = await fetch(`/api/v1/scheduled-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !task.isActive }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(task.isActive ? t('disableSuccess') : t('enableSuccess'))
        fetchTasks()
      } else {
        toast.error(data.message || t('operationFailed'))
      }
    } catch {
      toast.error(t('operationFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleTrigger = async (task: ScheduledTask) => {
    if (!task.isActive) {
      toast.error(t('disabledTriggerBlocked'))
      return
    }
    setActionLoading(task.id)
    try {
      const res = await fetch(`/api/v1/scheduled-tasks/${task.id}/trigger`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t('triggerSuccess'))
        fetchTasks()
      } else {
        toast.error(data.message || t('triggerFailed'))
      }
    } catch {
      toast.error(t('triggerFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreate = async () => {
    if (!formData.taskCode || !formData.taskName || !formData.handler) {
      toast.error(t('requiredFields'))
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/v1/scheduled-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t('createSuccess'))
        setCreateDialogOpen(false)
        setFormData({
          taskCode: '',
          taskName: '',
          description: '',
          cronExpression: '0 0 * * *',
          handler: '',
          isActive: true,
        })
        fetchTasks()
      } else {
        toast.error(data.message || t('createFailed'))
      }
    } catch {
      toast.error(t('createFailed'))
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return formatDateTime(dateStr)
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">{t('status.NOT_EXECUTED')}</Badge>
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="default" className="bg-green-500">{t('status.SUCCESS')}</Badge>
      case 'FAILED':
        return <Badge variant="destructive">{t('status.FAILED')}</Badge>
      case 'RUNNING':
        return <Badge variant="default" className="bg-blue-500">{t('status.RUNNING')}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Breadcrumb items={breadcrumb.list()} />
            <h1 className="text-2xl font-bold">{t('title')}</h1>
          </div>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('taskName')}</TableHead>
                <TableHead>{t('cronExpression')}</TableHead>
                <TableHead>{t('isActive')}</TableHead>
                <TableHead>{t('lastRunAt')}</TableHead>
                <TableHead>{t('nextRunAt')}</TableHead>
                <TableHead>{t('executionStats')}</TableHead>
                <TableHead>{tCommon('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumb items={breadcrumb.list()} />
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchTasks()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {tCommon('refresh')}
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('create')}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('taskName')}</TableHead>
              <TableHead>{t('cronExpression')}</TableHead>
              <TableHead>{t('isActive')}</TableHead>
              <TableHead>{t('lastRunAt')}</TableHead>
              <TableHead>{t('nextRunAt')}</TableHead>
              <TableHead>{t('executionStats')}</TableHead>
              <TableHead className="w-[150px]">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {t('noTasks')}
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{task.taskName}</div>
                      <div className="text-sm text-muted-foreground">{task.description || task.taskCode}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">{task.cronExpression}</code>
                  </TableCell>
                  <TableCell>
                    {task.isActive ? (
                      <Badge variant="default" className="bg-green-500">{t('enabled')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('disabled')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatDate(task.lastRunAt) || '-'}</div>
                      {task.lastRunStatus && (
                        <div className="mt-1">{getStatusBadge(task.lastRunStatus)}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(task.nextRunAt) || '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="text-green-600">{task.runCount} {t('times')}</span>
                      {task.failCount > 0 && (
                        <span className="text-red-600 ml-2">({task.failCount} {t('failed')})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(task)}
                        disabled={actionLoading === task.id}
                        title={task.isActive ? t('disable') : t('enable')}
                      >
                        {task.isActive ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTrigger(task)}
                        disabled={actionLoading === task.id || !task.isActive}
                        title={task.isActive ? t('trigger') : t('disabledTriggerTitle')}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 创建任务对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('createDialog')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="taskCode">{t('taskCode')} *</Label>
              <Input
                id="taskCode"
                value={formData.taskCode}
                onChange={(e) => setFormData({ ...formData, taskCode: e.target.value })}
                placeholder={t('taskCodePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taskName">{t('taskName')} *</Label>
              <Input
                id="taskName"
                value={formData.taskName}
                onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                placeholder={t('taskNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('descriptionPlaceholder')}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handler">{t('handler')} *</Label>
              <Select
                value={formData.handler}
                onValueChange={(value) => setFormData({ ...formData, handler: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('handlerPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {handlers.map((handler) => (
                    <SelectItem key={handler.name} value={handler.name}>
                      {handler.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cronExpression">{t('cronExpression')} *</Label>
              <Input
                id="cronExpression"
                value={formData.cronExpression}
                onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                placeholder={t('cronExpressionPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('cronExpressionHelp')}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">{t('enableImmediately')}</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? tCommon('submitting') : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
