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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import { Loader2, Pencil, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'

type StrategyType = 'ROUND_ROBIN' | 'LEAST_ACTIVE_TASKS' | 'ZONE_FIRST'

type RuleRecord = {
  id: string
  ruleCode: string
  ruleName: string
  isDefault?: boolean
  config: {
    strategyType: StrategyType
  }
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

type PickerProfileRecord = {
  id: string
  userId: string
  maxActiveTasks: number
  sequenceNo: number
  isEnabled: boolean
  allowPdaExecution: boolean
  activeTaskCount: number
  user: {
    id: string
    username: string
    fullName: string
    employeeId: string | null
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

type EditablePickerProfile = {
  id?: string
  userId: string
  userLabel: string
  activeTaskCount: number
  maxActiveTasks: number
  isEnabled: boolean
  allowPdaExecution: boolean
  zoneIds: string[]
  zoneLabels: string[]
}

type PickerProfileDraftForm = {
  id?: string
  userId: string
  maxActiveTasks: string
  zoneIds: string[]
}

const STRATEGY_OPTIONS: Array<{
  value: StrategyType
  label: string
  description: string
}> = [
  {
    value: 'ROUND_ROBIN',
    label: '轮询分配',
    description: '拣货员按固定顺序循环接收任务，每次分配给下一个拣货员',
  },
  {
    value: 'LEAST_ACTIVE_TASKS',
    label: '最少任务优先',
    description: '优先分配给当前活跃任务最少的拣货员',
  },
  {
    value: 'ZONE_FIRST',
    label: '区域匹配优先',
    description: '优先分配给负责当前作业区域的拣货员，未命中时回退到最少任务优先',
  },
]

const DEFAULT_STRATEGY: StrategyType = 'ROUND_ROBIN'

function formatUserLabel(user: PickerOption | PickerProfileRecord['user']) {
  const employeePart = user.employeeId ? ` / ${user.employeeId}` : ''
  return `${user.fullName}${employeePart ? employeePart : ''}`
}

function formatZoneLabel(zone: ZoneOption | PickerProfileRecord['zones'][number]['zone']) {
  return zone.zoneName ? `${zone.zoneCode},${zone.zoneName}` : zone.zoneCode
}

function mapProfileToDraft(profile: PickerProfileRecord): EditablePickerProfile {
  return {
    id: profile.id,
    userId: profile.userId,
    userLabel: formatUserLabel(profile.user),
    activeTaskCount: profile.activeTaskCount,
    maxActiveTasks: profile.maxActiveTasks,
    isEnabled: profile.isEnabled,
    allowPdaExecution: profile.allowPdaExecution,
    zoneIds: profile.zones.map((item) => item.zoneId),
    zoneLabels: profile.zones.map((item) => formatZoneLabel(item.zone)),
  }
}

function arraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false
  }

  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()
  return sortedLeft.every((value, index) => value === sortedRight[index])
}

function buildRuleCreateCode(warehouseCode?: string, warehouseId?: string) {
  const normalizedCode = (warehouseCode || warehouseId || 'DEFAULT')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()

  return `PICK_ASSIGN_${normalizedCode || 'DEFAULT'}`
}

export function PickAssignmentRulesPageContent() {
  const { currentWarehouse, selectedWarehouseId } = useWarehouseContext()
  const { hasPermission } = usePermissions()
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = useMemo(() => createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('operationRules')),
    module: { label: '拣货单分配规则', href: '/pick-assignment-rules' },
  }), [tMenuGroup])

  const canCreateRule = hasPermission('pick-assignment-rule:create')
  const canUpdateRule = hasPermission('pick-assignment-rule:update')
  const canCreatePicker = hasPermission('picker-profile:create')
  const canUpdatePicker = hasPermission('picker-profile:update')
  const canDeletePicker = hasPermission('picker-profile:delete')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [strategy, setStrategy] = useState<StrategyType>(DEFAULT_STRATEGY)
  const [initialStrategy, setInitialStrategy] = useState<StrategyType>(DEFAULT_STRATEGY)
  const [rule, setRule] = useState<RuleRecord | null>(null)
  const [pickerProfiles, setPickerProfiles] = useState<EditablePickerProfile[]>([])
  const [initialPickerProfiles, setInitialPickerProfiles] = useState<EditablePickerProfile[]>([])
  const [pickerOptions, setPickerOptions] = useState<PickerOption[]>([])
  const [zoneOptions, setZoneOptions] = useState<ZoneOption[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [dialogForm, setDialogForm] = useState<PickerProfileDraftForm>({
    userId: '',
    maxActiveTasks: '3',
    zoneIds: [],
  })
  const canEditStrategy = rule ? canUpdateRule : canCreateRule

  const profileOptionsForDialog = useMemo(() => {
    const editingUserId = editingIndex !== null ? pickerProfiles[editingIndex]?.userId : null
    return pickerOptions.filter((option) => option.id === editingUserId || !pickerProfiles.some((profile) => profile.userId === option.id))
  }, [editingIndex, pickerOptions, pickerProfiles])

  const loadConfig = useCallback(async () => {
    if (!selectedWarehouseId) {
      return
    }

    setLoading(true)
    try {
      const [ruleResponse, profileResponse, optionResponse] = await Promise.all([
        fetch(`/api/v1/pick-assignment-rules?warehouseId=${selectedWarehouseId}&page=1&pageSize=100`),
        fetch(`/api/v1/picker-profiles?warehouseId=${selectedWarehouseId}&page=1&pageSize=100`),
        fetch(`/api/v1/picker-profiles/options?warehouseId=${selectedWarehouseId}`),
      ])

      const [ruleResult, profileResult, optionResult] = await Promise.all([
        ruleResponse.json(),
        profileResponse.json(),
        optionResponse.json(),
      ])

      if (!ruleResponse.ok || !ruleResult.success) {
        throw new Error(ruleResult.message || '加载分配策略失败')
      }

      if (!profileResponse.ok || !profileResult.success) {
        throw new Error(profileResult.message || '加载拣货员配置失败')
      }

      if (!optionResponse.ok || !optionResult.success) {
        throw new Error(optionResult.message || '加载拣货员可选项失败')
      }

      const allRules = (ruleResult.data || []) as RuleRecord[]
      const currentRule = allRules.find((item) => item.ruleName === '默认拣货分配规则') ||
        allRules.find((item) => item.isDefault) ||
        allRules[0] ||
        null
      const currentProfiles = ((profileResult.data || []) as PickerProfileRecord[]).map(mapProfileToDraft)

      setRule(currentRule)
      setStrategy(currentRule?.config.strategyType || DEFAULT_STRATEGY)
      setInitialStrategy(currentRule?.config.strategyType || DEFAULT_STRATEGY)
      setPickerProfiles(currentProfiles)
      setInitialPickerProfiles(currentProfiles)
      setPickerOptions(optionResult.data?.users || [])
      setZoneOptions(optionResult.data?.zones || [])
    } catch (error) {
      console.error('Failed to load pick assignment config:', error)
      toast.error(error instanceof Error ? error.message : '加载拣货分配配置失败')
    } finally {
      setLoading(false)
    }
  }, [selectedWarehouseId])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  const openCreateDialog = () => {
    setEditingIndex(null)
    setDialogForm({
      userId: '',
      maxActiveTasks: '3',
      zoneIds: [],
    })
    setDialogOpen(true)
  }

  const openEditDialog = (index: number) => {
    const profile = pickerProfiles[index]
    setEditingIndex(index)
    setDialogForm({
      id: profile.id,
      userId: profile.userId,
      maxActiveTasks: String(profile.maxActiveTasks),
      zoneIds: profile.zoneIds,
    })
    setDialogOpen(true)
  }

  const handleSavePickerDraft = () => {
    if (!dialogForm.userId) {
      toast.error('请选择拣货员')
      return
    }

    const maxActiveTasks = Number(dialogForm.maxActiveTasks)
    if (!Number.isInteger(maxActiveTasks) || maxActiveTasks <= 0) {
      toast.error('拣货单数量上限必须为正整数')
      return
    }

    const user = pickerOptions.find((item) => item.id === dialogForm.userId)
    if (!user) {
      toast.error('拣货员不存在')
      return
    }

    const selectedZones = zoneOptions.filter((zone) => dialogForm.zoneIds.includes(zone.id))

    const nextRecord: EditablePickerProfile = {
      id: dialogForm.id,
      userId: dialogForm.userId,
      userLabel: formatUserLabel(user),
      activeTaskCount: editingIndex !== null ? pickerProfiles[editingIndex].activeTaskCount : 0,
      maxActiveTasks,
      isEnabled: editingIndex !== null ? pickerProfiles[editingIndex].isEnabled : true,
      allowPdaExecution: editingIndex !== null ? pickerProfiles[editingIndex].allowPdaExecution : true,
      zoneIds: dialogForm.zoneIds,
      zoneLabels: selectedZones.map(formatZoneLabel),
    }

    setPickerProfiles((prev) => {
      if (editingIndex === null) {
        return [...prev, nextRecord]
      }

      return prev.map((item, index) => (index === editingIndex ? nextRecord : item))
    })
    setDialogOpen(false)
  }

  const handleRemovePicker = (index: number) => {
    setPickerProfiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleCancel = () => {
    setStrategy(initialStrategy)
    setPickerProfiles(initialPickerProfiles)
  }

  const hasDirtyState = useMemo(() => {
    if (strategy !== initialStrategy) {
      return true
    }

    if (pickerProfiles.length !== initialPickerProfiles.length) {
      return true
    }

    return pickerProfiles.some((profile, index) => {
      const initial = initialPickerProfiles[index]
      if (!initial) {
        return true
      }

      return (
        profile.userId !== initial.userId ||
        profile.maxActiveTasks !== initial.maxActiveTasks ||
        profile.isEnabled !== initial.isEnabled ||
        profile.allowPdaExecution !== initial.allowPdaExecution ||
        !arraysEqual(profile.zoneIds, initial.zoneIds)
      )
    })
  }, [initialPickerProfiles, initialStrategy, pickerProfiles, strategy])

  const handleSaveAll = async () => {
    if (!selectedWarehouseId) {
      toast.error('当前未选择仓库')
      return
    }

    setSaving(true)
    try {
      const rulePayload = {
        ruleName: '默认拣货分配规则',
        description: null,
        status: 'ENABLED',
        isDefault: true,
        config: {
          strategyType: strategy,
          areaMatchMode: strategy === 'ZONE_FIRST' ? 'PREFER' : 'PREFER',
          capacityCheckMode: 'STRICT',
          includeTaskStatusesInLoad: ['PENDING', 'IN_PROGRESS'],
          assignAtCreation: true,
          ...(strategy === 'ZONE_FIRST' ? { fallbackStrategyType: 'LEAST_ACTIVE_TASKS' } : {}),
        },
      }

      if (rule?.id) {
        if (canUpdateRule) {
          const response = await fetch(`/api/v1/pick-assignment-rules/${rule.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rulePayload),
          })
          const result = await response.json()
          if (!response.ok || !result.success) {
            throw new Error(result.message || '保存分配策略失败')
          }
        }
      } else if (canCreateRule) {
        const response = await fetch('/api/v1/pick-assignment-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouseId: selectedWarehouseId,
            ruleCode: buildRuleCreateCode(currentWarehouse?.warehouseCode, selectedWarehouseId),
            ...rulePayload,
          }),
        })
        const result = await response.json()
        if (!response.ok || !result.success) {
          throw new Error(result.message || '创建分配策略失败')
        }
      }

      const initialById = new Map(
        initialPickerProfiles
          .filter((profile): profile is EditablePickerProfile & { id: string } => Boolean(profile.id))
          .map((profile) => [profile.id, profile]),
      )

      for (let index = 0; index < pickerProfiles.length; index += 1) {
        const profile = pickerProfiles[index]
        const profilePayload = {
          maxActiveTasks: profile.maxActiveTasks,
          sequenceNo: index + 1,
          isEnabled: profile.isEnabled,
          allowPdaExecution: profile.allowPdaExecution,
          zones: profile.zoneIds.map((zoneId) => ({ zoneId })),
        }

        if (profile.id) {
          const initialProfile = initialById.get(profile.id)
          const changed = !initialProfile ||
            initialProfile.maxActiveTasks !== profile.maxActiveTasks ||
            initialPickerProfiles.findIndex((item) => item.id === profile.id) !== index ||
            initialProfile.isEnabled !== profile.isEnabled ||
            initialProfile.allowPdaExecution !== profile.allowPdaExecution ||
            !arraysEqual(initialProfile.zoneIds, profile.zoneIds)

          if (changed && canUpdatePicker) {
            const response = await fetch(`/api/v1/picker-profiles/${profile.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(profilePayload),
            })
            const result = await response.json()
            if (!response.ok || !result.success) {
              throw new Error(result.message || `保存拣货员 ${profile.userLabel} 失败`)
            }
          }
        } else if (canCreatePicker) {
          const response = await fetch('/api/v1/picker-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              warehouseId: selectedWarehouseId,
              userId: profile.userId,
              ...profilePayload,
            }),
          })
          const result = await response.json()
          if (!response.ok || !result.success) {
            throw new Error(result.message || `新增拣货员 ${profile.userLabel} 失败`)
          }
        }
      }

      const currentIds = new Set(pickerProfiles.map((profile) => profile.id).filter(Boolean))
      for (const initialProfile of initialPickerProfiles) {
        if (initialProfile.id && !currentIds.has(initialProfile.id) && canDeletePicker) {
          const response = await fetch(`/api/v1/picker-profiles/${initialProfile.id}`, {
            method: 'DELETE',
          })
          const result = await response.json()
          if (!response.ok || !result.success) {
            throw new Error(result.message || `删除拣货员 ${initialProfile.userLabel} 失败`)
          }
        }
      }

      toast.success('拣货分配配置已保存')
      await loadConfig()
    } catch (error) {
      console.error('Failed to save pick assignment config:', error)
      toast.error(error instanceof Error ? error.message : '保存拣货分配配置失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Breadcrumb items={breadcrumb.list()} />
        <Badge variant="outline">
          {currentWarehouse?.warehouseCode || '-'}
          {currentWarehouse?.warehouseName ? ` / ${currentWarehouse.warehouseName}` : ''}
        </Badge>
      </div>

      <Card className="border-2">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-base">系统管理→拣货单分配规则</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <section className="space-y-4 rounded-sm border p-4">
                <div className="text-lg font-medium">分配策略</div>
                <RadioGroup
                  value={strategy}
                  onValueChange={(value) => setStrategy(value as StrategyType)}
                  className="gap-3"
                >
                  {STRATEGY_OPTIONS.map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-start gap-3 text-sm">
                      <RadioGroupItem value={option.value} className="mt-1" disabled={!canEditStrategy} />
                      <div className="space-y-1">
                        <div>{option.label}</div>
                        <div className="text-muted-foreground">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </section>

              <section className="space-y-4 rounded-sm border p-4">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-medium">拣货员管理</div>
                  {canCreatePicker ? (
                    <Button type="button" variant="outline" size="sm" onClick={openCreateDialog}>
                      <Plus className="mr-1 h-4 w-4" />
                      添加
                    </Button>
                  ) : null}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>当前任务</TableHead>
                      <TableHead>拣货单数量上限</TableHead>
                      <TableHead>负责区域</TableHead>
                      <TableHead className="w-[120px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pickerProfiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                          暂无拣货员配置
                        </TableCell>
                      </TableRow>
                    ) : (
                      pickerProfiles.map((profile, index) => (
                        <TableRow key={profile.id || `${profile.userId}-${index}`}>
                          <TableCell>{profile.userLabel}</TableCell>
                          <TableCell>{profile.activeTaskCount}/{profile.maxActiveTasks}</TableCell>
                          <TableCell>{profile.maxActiveTasks}</TableCell>
                          <TableCell className="max-w-[320px] whitespace-normal">
                            {profile.zoneLabels.length > 0 ? profile.zoneLabels.join('，') : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {canUpdatePicker ? (
                                <Button type="button" size="sm" variant="outline" onClick={() => openEditDialog(index)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              ) : null}
                              {canDeletePicker ? (
                                <Button type="button" size="sm" variant="outline" onClick={() => handleRemovePicker(index)}>
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
              </section>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button type="button" onClick={handleSaveAll} disabled={saving || !hasDirtyState}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  保存
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={saving || !hasDirtyState}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  取消
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingIndex === null ? '添加拣货员' : '编辑拣货员'}</DialogTitle>
            <DialogDescription>只保留当前 UI（界面）需要的配置项：拣货员、上限、负责区域。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>姓名</Label>
              <SearchableSelect
                options={profileOptionsForDialog}
                value={dialogForm.userId}
                onChange={(value) => setDialogForm((prev) => ({ ...prev, userId: String(value) }))}
                getOptionValue={(option) => option.id}
                getOptionLabel={formatUserLabel}
                placeholder="请选择拣货员"
                searchPlaceholder="搜索拣货员"
                emptyText="暂无可选拣货员"
                disabled={editingIndex !== null}
                className="h-9 w-full justify-between"
                contentClassName="w-[420px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxActiveTasks">拣货单数量上限</Label>
              <Input
                id="maxActiveTasks"
                type="number"
                min={1}
                value={dialogForm.maxActiveTasks}
                onChange={(event) => setDialogForm((prev) => ({ ...prev, maxActiveTasks: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>负责区域</Label>
              <SearchableSelect
                options={zoneOptions}
                value={dialogForm.zoneIds}
                onChange={(value) => setDialogForm((prev) => ({ ...prev, zoneIds: value as string[] }))}
                getOptionValue={(option) => option.id}
                getOptionLabel={formatZoneLabel}
                mode="multiple"
                placeholder="请选择负责区域"
                searchPlaceholder="搜索库区"
                emptyText="暂无可选库区"
                className="h-9 w-full justify-between"
                contentClassName="w-[420px]"
                selectedTextFormatter={(count) => `已选择 ${count} 个区域`}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleSavePickerDraft}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
