'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useWarehouseContext } from '@/contexts/warehouse-context'
import { usePermissions } from '@/contexts/permission-context'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react'

type PickerProfileRecord = {
  id: string
  userId: string
  maxActiveTasks: number
  sequenceNo: number
  isEnabled: boolean
  allowPdaExecution: boolean
  activeTaskCount: number
  updatedAt: string
  user: {
    id: string
    username: string
    fullName: string
    employeeId: string | null
    status: string
    isActive: boolean
  }
  zones: Array<{
    zoneId: string
    zone: {
      id: string
      zoneCode: string
      zoneName: string | null
      zoneType: string
    }
  }>
}

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

type PickerOption = {
  id: string
  username: string
  fullName: string
  employeeId: string | null
}

type ZoneOption = {
  id: string
  zoneCode: string
  zoneName: string | null
  zoneType: string
}

type ProfileFormState = {
  userId: string
  maxActiveTasks: string
  sequenceNo: string
  isEnabled: boolean
  allowPdaExecution: boolean
  zoneIds: string[]
}

const EMPTY_FORM: ProfileFormState = {
  userId: '',
  maxActiveTasks: '3',
  sequenceNo: '1',
  isEnabled: true,
  allowPdaExecution: true,
  zoneIds: [],
}

function formatUserLabel(user: PickerOption | PickerProfileRecord['user']) {
  const employeePart = user.employeeId ? ` / ${user.employeeId}` : ''
  return `${user.fullName} (${user.username}${employeePart})`
}

function formatZoneLabel(zone: ZoneOption | PickerProfileRecord['zones'][number]['zone']) {
  return `${zone.zoneCode}${zone.zoneName ? ` / ${zone.zoneName}` : ''}`
}

function toFormState(profile?: PickerProfileRecord | null): ProfileFormState {
  if (!profile) {
    return EMPTY_FORM
  }

  return {
    userId: profile.userId,
    maxActiveTasks: String(profile.maxActiveTasks),
    sequenceNo: String(profile.sequenceNo),
    isEnabled: profile.isEnabled,
    allowPdaExecution: profile.allowPdaExecution,
    zoneIds: profile.zones.map((item) => item.zoneId),
  }
}

export function PickerProfilesPageContent() {
  const { currentWarehouse, selectedWarehouseId } = useWarehouseContext()
  const { hasPermission } = usePermissions()
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = useMemo(() => createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('operationRules')),
    module: { label: '拣货员管理', href: '/picker-profiles' },
  }), [tMenuGroup])
  const canCreate = hasPermission('picker-profile:create')
  const canUpdate = hasPermission('picker-profile:update')
  const canDelete = hasPermission('picker-profile:delete')

  const [profiles, setProfiles] = useState<PickerProfileRecord[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [enabledFilter, setEnabledFilter] = useState<'ALL' | 'true' | 'false'>('ALL')
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [pickerOptions, setPickerOptions] = useState<PickerOption[]>([])
  const [zoneOptions, setZoneOptions] = useState<ZoneOption[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<PickerProfileRecord | null>(null)
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PickerProfileRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchProfiles = useCallback(async () => {
    if (!selectedWarehouseId) {
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        warehouseId: selectedWarehouseId,
        ...(search ? { search } : {}),
        ...(enabledFilter !== 'ALL' ? { isEnabled: enabledFilter } : {}),
      })

      const response = await fetch(`/api/v1/picker-profiles?${params}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || '加载失败')
      }

      setProfiles(result.data || [])
      if (result.pagination) {
        setPagination(result.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch picker profiles:', error)
      toast.error(error instanceof Error ? error.message : '加载拣货员档案失败')
    } finally {
      setLoading(false)
    }
  }, [enabledFilter, pagination.page, pagination.pageSize, search, selectedWarehouseId])

  const fetchOptions = useCallback(async () => {
    if (!selectedWarehouseId) {
      return
    }

    setOptionsLoading(true)
    try {
      const response = await fetch(`/api/v1/picker-profiles/options?warehouseId=${selectedWarehouseId}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || '加载失败')
      }

      setPickerOptions(result.data?.users || [])
      setZoneOptions(result.data?.zones || [])
    } catch (error) {
      console.error('Failed to fetch picker profile options:', error)
      toast.error(error instanceof Error ? error.message : '加载拣货员可选项失败')
    } finally {
      setOptionsLoading(false)
    }
  }, [selectedWarehouseId])

  useEffect(() => {
    void fetchProfiles()
  }, [fetchProfiles])

  useEffect(() => {
    void fetchOptions()
  }, [fetchOptions])

  const openCreateDialog = () => {
    setEditingProfile(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (profile: PickerProfileRecord) => {
    setEditingProfile(profile)
    setForm(toFormState(profile))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!selectedWarehouseId) {
      toast.error('当前未选择仓库')
      return
    }

    if (!form.userId) {
      toast.error('请选择拣货员')
      return
    }

    const maxActiveTasks = Number(form.maxActiveTasks)
    const sequenceNo = Number(form.sequenceNo)

    if (!Number.isInteger(maxActiveTasks) || maxActiveTasks <= 0) {
      toast.error('最大活跃任务数必须为正整数')
      return
    }

    if (!Number.isInteger(sequenceNo) || sequenceNo <= 0) {
      toast.error('轮询顺序号必须为正整数')
      return
    }

    setSaving(true)
    try {
      const payload = editingProfile
        ? {
            maxActiveTasks,
            sequenceNo,
            isEnabled: form.isEnabled,
            allowPdaExecution: form.allowPdaExecution,
            zones: form.zoneIds.map((zoneId) => ({ zoneId })),
          }
        : {
            warehouseId: selectedWarehouseId,
            userId: form.userId,
            maxActiveTasks,
            sequenceNo,
            isEnabled: form.isEnabled,
            allowPdaExecution: form.allowPdaExecution,
            zones: form.zoneIds.map((zoneId) => ({ zoneId })),
          }

      const response = await fetch(
        editingProfile ? `/api/v1/picker-profiles/${editingProfile.id}` : '/api/v1/picker-profiles',
        {
          method: editingProfile ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || '保存失败')
      }

      toast.success(editingProfile ? '拣货员档案已更新' : '拣货员档案已创建')
      setDialogOpen(false)
      await fetchProfiles()
    } catch (error) {
      console.error('Failed to save picker profile:', error)
      toast.error(error instanceof Error ? error.message : '保存拣货员档案失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/v1/picker-profiles/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || '删除失败')
      }

      toast.success('拣货员档案已删除')
      setDeleteTarget(null)
      await fetchProfiles()
    } catch (error) {
      console.error('Failed to delete picker profile:', error)
      toast.error(error instanceof Error ? error.message : '删除拣货员档案失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
        {canCreate ? (
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            新建拣货员
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">当前仓库</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline">{currentWarehouse?.warehouseCode || '-'}</Badge>
          <span className="text-muted-foreground">{currentWarehouse?.warehouseName || '未选择仓库'}</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
                placeholder="搜索姓名、用户名、工号"
                className="pl-9"
              />
            </div>
            <Select
              value={enabledFilter}
              onValueChange={(value) => {
                setEnabledFilter(value as 'ALL' | 'true' | 'false')
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
            >
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部状态</SelectItem>
                <SelectItem value="true">已启用</SelectItem>
                <SelectItem value="false">已停用</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPagination((prev) => ({ ...prev, page: 1 }))
                void Promise.all([fetchProfiles(), fetchOptions()])
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>拣货员</TableHead>
                    <TableHead>轮询顺序</TableHead>
                    <TableHead>任务负载</TableHead>
                    <TableHead>负责区域</TableHead>
                    <TableHead>PDA 执行</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead className="w-[120px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        当前仓库暂无拣货员档案
                      </TableCell>
                    </TableRow>
                  ) : (
                    profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <div className="font-medium">{profile.user.fullName}</div>
                            <div className="text-xs text-muted-foreground">
                              {profile.user.username}
                              {profile.user.employeeId ? ` / ${profile.user.employeeId}` : ''}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{profile.sequenceNo}</TableCell>
                        <TableCell>{profile.activeTaskCount} / {profile.maxActiveTasks}</TableCell>
                        <TableCell className="max-w-[260px] whitespace-normal">
                          {profile.zones.length > 0
                            ? profile.zones.map((item) => formatZoneLabel(item.zone)).join('，')
                            : <span className="text-muted-foreground">未绑定区域</span>}
                        </TableCell>
                        <TableCell>{profile.allowPdaExecution ? '允许' : '禁止'}</TableCell>
                        <TableCell>
                          <Badge variant={profile.isEnabled ? 'default' : 'secondary'}>
                            {profile.isEnabled ? '启用' : '停用'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateTime(profile.updatedAt) || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {canUpdate ? (
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(profile)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {canDelete ? (
                              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(profile)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">共 {pagination.total} 条</div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    第 {pagination.page} / {Math.max(1, pagination.totalPages)} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProfile ? '编辑拣货员档案' : '新建拣货员档案'}</DialogTitle>
            <DialogDescription>
              当前仓库：{currentWarehouse?.warehouseCode || '-'} / {currentWarehouse?.warehouseName || '-'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>拣货员</Label>
              <SearchableSelect
                options={pickerOptions}
                value={form.userId}
                onChange={(value) => setForm((prev) => ({ ...prev, userId: String(value) }))}
                getOptionValue={(option) => option.id}
                getOptionLabel={formatUserLabel}
                placeholder={optionsLoading ? '加载中...' : '请选择拣货员'}
                searchPlaceholder="搜索拣货员"
                emptyText="暂无可选拣货员"
                disabled={optionsLoading || Boolean(editingProfile)}
                loading={optionsLoading}
                className="h-9 w-full justify-between"
                contentClassName="w-[420px]"
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sequenceNo">轮询顺序号</Label>
                <Input
                  id="sequenceNo"
                  type="number"
                  min={1}
                  value={form.sequenceNo}
                  onChange={(event) => setForm((prev) => ({ ...prev, sequenceNo: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxActiveTasks">最大活跃任务数</Label>
                <Input
                  id="maxActiveTasks"
                  type="number"
                  min={1}
                  value={form.maxActiveTasks}
                  onChange={(event) => setForm((prev) => ({ ...prev, maxActiveTasks: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>负责区域</Label>
              <SearchableSelect
                options={zoneOptions}
                value={form.zoneIds}
                onChange={(value) => setForm((prev) => ({ ...prev, zoneIds: value as string[] }))}
                getOptionValue={(option) => option.id}
                getOptionLabel={formatZoneLabel}
                mode="multiple"
                placeholder={optionsLoading ? '加载中...' : '请选择负责区域'}
                searchPlaceholder="搜索库区"
                emptyText="暂无可选库区"
                disabled={optionsLoading}
                loading={optionsLoading}
                className="h-9 w-full justify-between"
                contentClassName="w-[420px]"
                selectedTextFormatter={(count) => `已选择 ${count} 个区域`}
              />
            </div>

            <div className="grid gap-3 rounded-md border p-3 md:grid-cols-2">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">启用档案</div>
                  <div className="text-xs text-muted-foreground">关闭后不会参与自动分配</div>
                </div>
                <Switch
                  checked={form.isEnabled}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isEnabled: checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-medium">允许 PDA 执行</div>
                  <div className="text-xs text-muted-foreground">关闭后 PDA 仅能看到无权限提示，不能执行拣货</div>
                </div>
                <Switch
                  checked={form.allowPdaExecution}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, allowPdaExecution: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving || optionsLoading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除拣货员档案</DialogTitle>
            <DialogDescription>
              确定删除拣货员“{deleteTarget?.user.fullName}”的档案吗？删除后该用户不会再参与自动分配，PDA 拣货权限也会一并失效。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
