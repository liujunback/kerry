'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Key, Copy, Check, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils/date-formatter'
import { buildSettingsBreadcrumbParents, createBreadcrumbFactory } from '@/lib/navigation/breadcrumbs'

// 可用的权限范围
const getScopeLabel = (t: (key: string) => string, scope: string) => {
  return t(`apiKey.scopeLabels.${scope}`)
}

const AVAILABLE_SCOPES = (t: (key: string) => string) => [
  { value: 'sku:read', label: getScopeLabel(t, 'sku:read'), group: t('apiKey.scopeGroups.SKU') },
  { value: 'sku:create', label: getScopeLabel(t, 'sku:create'), group: t('apiKey.scopeGroups.SKU') },
  { value: 'sku:write', label: getScopeLabel(t, 'sku:write'), group: t('apiKey.scopeGroups.SKU') },
  { value: 'sku:delete', label: getScopeLabel(t, 'sku:delete'), group: t('apiKey.scopeGroups.SKU') },
  { value: 'asn:read', label: getScopeLabel(t, 'asn:read'), group: t('apiKey.scopeGroups.ASN') },
  { value: 'asn:create', label: getScopeLabel(t, 'asn:create'), group: t('apiKey.scopeGroups.ASN') },
  { value: 'asn:write', label: getScopeLabel(t, 'asn:write'), group: t('apiKey.scopeGroups.ASN') },
  { value: 'asn:delete', label: getScopeLabel(t, 'asn:delete'), group: t('apiKey.scopeGroups.ASN') },
  { value: 'return:create', label: getScopeLabel(t, 'return:create'), group: t('apiKey.scopeGroups.RETURN') },
  { value: 'return:disposition', label: getScopeLabel(t, 'return:disposition'), group: t('apiKey.scopeGroups.RETURN') },
]

const AVAILABLE_WEBHOOK_EVENTS = (t: (key: string) => string) => [
  { value: 'inventory.event.created', label: t('apiKey.webhookEventInventoryCreated') },
]

type ApiKeyFormData = {
  name: string
  description: string
  rateLimit: number
  scopes: string[]
  webhookUrl: string
  webhookSecret: string
  webhookEvents: string[]
}

const DEFAULT_FORM_DATA: ApiKeyFormData = {
  name: '',
  description: '',
  rateLimit: 100,
  scopes: [],
  webhookUrl: '',
  webhookSecret: '',
  webhookEvents: [],
}

interface ApiKey {
  id: string
  name: string
  description?: string
  keyPrefix: string
  scopes: string[]
  webhookUrl?: string | null
  webhookEvents?: string[]
  rateLimit: number
  isActive: boolean
  expiresAt?: string
  lastUsedAt?: string
  createdAt: string
}

export default function ApiKeysPage() {
  const t = useTranslations()
  const tCommon = useTranslations('common')
  const tMenuGroup = useTranslations('menuGroup')
  const breadcrumb = createBreadcrumbFactory({
    parents: buildSettingsBreadcrumbParents(tMenuGroup('settings'), tMenuGroup('systemManagement')),
    module: { label: t('apiKey.title'), href: '/api-keys' },
  })
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [newKeyVisible, setNewKeyVisible] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState<ApiKeyFormData>(DEFAULT_FORM_DATA)

  // 获取可用的权限范围
  const availableScopes = AVAILABLE_SCOPES(t)
  const availableWebhookEvents = AVAILABLE_WEBHOOK_EVENTS(t)

  // 切换权限范围
  const toggleScope = (scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }))
  }

  const toggleWebhookEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      webhookEvents: prev.webhookEvents.includes(event)
        ? prev.webhookEvents.filter((item) => item !== event)
        : [...prev.webhookEvents, event],
    }))
  }

  const openEditDialog = (key: ApiKey) => {
    setSelectedKey(key)
    setFormData({
      name: key.name,
      description: key.description || '',
      rateLimit: key.rateLimit,
      scopes: key.scopes || [],
      webhookUrl: key.webhookUrl || '',
      webhookSecret: '',
      webhookEvents: key.webhookEvents || [],
    })
    setEditDialogOpen(true)
  }

  // 按组分组权限
  const scopeGroups = availableScopes.reduce((acc, scope) => {
    if (!acc[scope.group]) acc[scope.group] = []
    acc[scope.group].push(scope)
    return acc
  }, {} as Record<string, typeof availableScopes>)

  const renderForm = (mode: 'create' | 'edit') => {
    const prefix = mode === 'create' ? 'create' : 'edit'

    return (
      <div className="max-h-[72vh] overflow-y-auto pr-1">
        <div className="space-y-5 py-4">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">{t('apiKey.basicSection')}</h3>
              <p className="text-xs text-muted-foreground mt-1">{t('apiKey.basicSectionHint')}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`${prefix}-name`}>{t('apiKey.nameRequired')}</Label>
                <Input
                  id={`${prefix}-name`}
                  placeholder={t('apiKey.namePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`${prefix}-description`}>{t('apiKey.description')}</Label>
                <Textarea
                  id={`${prefix}-description`}
                  placeholder={t('apiKey.descriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[84px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${prefix}-rateLimit`}>{t('apiKey.rateLimit')}</Label>
                <Input
                  id={`${prefix}-rateLimit`}
                  type="number"
                  min={1}
                  max={10000}
                  value={formData.rateLimit}
                  onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) || 100 })}
                />
              </div>
              <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-3 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground">{t('apiKey.scopeSummary')}</span>
                <span className="mt-1 text-sm font-medium">
                  {formData.scopes.length === 0
                    ? t('apiKey.allScopes')
                    : t('apiKey.scopeSummarySelected', { count: formData.scopes.length })}
                </span>
              </div>
            </div>
          </section>

          <Separator />

          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.9fr]">
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">{t('apiKey.scopes')}</h3>
                <p className="text-xs text-muted-foreground mt-1">{t('apiKey.scopesHint')}</p>
              </div>
              <div className="border rounded-lg p-3 space-y-4 max-h-[320px] overflow-y-auto">
                {Object.entries(scopeGroups).map(([group, scopes]) => (
                  <div key={group} className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {scopes.map((scope) => (
                        <label
                          key={scope.value}
                          htmlFor={`${prefix}-${scope.value}`}
                          className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/40"
                        >
                          <Checkbox
                            id={`${prefix}-${scope.value}`}
                            checked={formData.scopes.includes(scope.value)}
                            onCheckedChange={() => toggleScope(scope.value)}
                          />
                          <span className="text-sm">{scope.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">{t('apiKey.webhookTitle')}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {mode === 'create' ? t('apiKey.webhookHint') : t('apiKey.webhookUpdateHint')}
                </p>
              </div>
              <div className="rounded-lg border p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${prefix}-webhookUrl`}>{t('apiKey.webhookUrl')}</Label>
                  <Input
                    id={`${prefix}-webhookUrl`}
                    placeholder={t('apiKey.webhookUrlPlaceholder')}
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${prefix}-webhookSecret`}>{t('apiKey.webhookSecret')}</Label>
                  <Input
                    id={`${prefix}-webhookSecret`}
                    placeholder={
                      mode === 'create'
                        ? t('apiKey.webhookSecretPlaceholder')
                        : t('apiKey.webhookSecretUpdatePlaceholder')
                    }
                    value={formData.webhookSecret}
                    onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('apiKey.webhookEvents')}</Label>
                  <div className="space-y-2">
                    {availableWebhookEvents.map((event) => (
                      <label
                        key={event.value}
                        htmlFor={`${prefix}-event-${event.value}`}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/40"
                      >
                        <Checkbox
                          id={`${prefix}-event-${event.value}`}
                          checked={formData.webhookEvents.includes(event.value)}
                          onCheckedChange={() => toggleWebhookEvent(event.value)}
                        />
                        <span className="text-sm">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    )
  }

  // 加载API密钥列表
  const loadApiKeys = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/v1/api-keys')
      const data = await res.json()
      if (data.success) {
        setApiKeys(data.data || [])
      }
    } catch (error) {
      console.error(t('apiKey.messages.loadFailed'), error)
      toast.error(t('apiKey.messages.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadApiKeys()
  }, [loadApiKeys])

  // 创建API密钥
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error(t('apiKey.messages.nameRequired'))
      return
    }

    try {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        setNewKey(data.data.key)
        setNewKeyVisible(true)
        setCreateDialogOpen(false)
        setFormData(DEFAULT_FORM_DATA)
        loadApiKeys()
        toast.success(t('apiKey.messages.createSuccess'))
      } else {
        toast.error(data.message || t('apiKey.messages.createFailed'))
      }
    } catch (error) {
      console.error(t('apiKey.messages.createError'), error)
      toast.error(t('apiKey.messages.createError'))
    }
  }

  const handleUpdate = async () => {
    if (!selectedKey) return
    if (!formData.name.trim()) {
      toast.error(t('apiKey.messages.nameRequired'))
      return
    }

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        description: formData.description,
        rateLimit: formData.rateLimit,
        scopes: formData.scopes,
        webhookUrl: formData.webhookUrl,
        webhookEvents: formData.webhookEvents,
      }

      if (formData.webhookSecret.trim()) {
        payload.webhookSecret = formData.webhookSecret
      }

      const res = await fetch(`/api/v1/api-keys/${selectedKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        setEditDialogOpen(false)
        setSelectedKey(null)
        setFormData(DEFAULT_FORM_DATA)
        loadApiKeys()
        toast.success(t('apiKey.messages.updateSuccess'))
      } else {
        toast.error(data.message || t('apiKey.messages.updateFailed'))
      }
    } catch (error) {
      console.error(t('apiKey.messages.updateError'), error)
      toast.error(t('apiKey.messages.updateError'))
    }
  }

  // 删除API密钥
  const handleDelete = async () => {
    if (!selectedKey) return

    try {
      const res = await fetch(`/api/v1/api-keys/${selectedKey.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t('apiKey.messages.deleteSuccess'))
        loadApiKeys()
      } else {
        toast.error(data.message || t('apiKey.messages.deleteFailed'))
      }
    } catch (error) {
      console.error(t('apiKey.messages.deleteError'), error)
      toast.error(t('apiKey.messages.deleteError'))
    } finally {
      setDeleteDialogOpen(false)
      setSelectedKey(null)
    }
  }

  // 复制密钥
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(t('apiKey.messages.copySuccess'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('apiKey.messages.copyFailed'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={breadcrumb.list()} />
          <p className="text-muted-foreground mt-1">{t('apiKey.description')}</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('apiKey.createButton')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{t('apiKey.createTitle')}</DialogTitle>
              <DialogDescription>
                {t('apiKey.createDescription')}
              </DialogDescription>
            </DialogHeader>
            {renderForm('create')}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleCreate}>{tCommon('create')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) {
              setSelectedKey(null)
              setFormData(DEFAULT_FORM_DATA)
            }
          }}
        >
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{t('apiKey.editTitle')}</DialogTitle>
              <DialogDescription>{t('apiKey.editDescription')}</DialogDescription>
            </DialogHeader>
            {renderForm('edit')}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                {tCommon('cancel')}
              </Button>
              <Button onClick={handleUpdate}>{tCommon('save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 新创建的密钥显示 */}
      {newKeyVisible && newKey && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                {t('apiKey.saveKeyTitle')}
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {t('apiKey.saveKeyDescription')}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <code className="flex-1 bg-yellow-100 dark:bg-yellow-900/40 px-3 py-2 rounded text-sm font-mono break-all">
                  {newKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newKey)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setNewKeyVisible(false)
                  setNewKey('')
                }}
              >
                {t('apiKey.savedButton')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* API密钥列表 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('apiKey.name')}</TableHead>
              <TableHead>{t('apiKey.keyPrefix')}</TableHead>
              <TableHead>{t('apiKey.scopes')}</TableHead>
              <TableHead>{t('apiKey.rateLimit')}</TableHead>
              <TableHead>{t('apiKey.status')}</TableHead>
              <TableHead>{t('apiKey.lastUsed')}</TableHead>
              <TableHead>{tCommon('createdAt')}</TableHead>
              <TableHead className="w-[100px]">{tCommon('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  {tCommon('loading')}
                </TableCell>
              </TableRow>
            ) : apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {t('apiKey.noKeys')}
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{key.name}</div>
                      {key.description && (
                        <div className="text-sm text-muted-foreground">{key.description}</div>
                      )}
                      {key.webhookUrl && (
                        <div className="text-xs text-muted-foreground mt-1 break-all">
                          {t('apiKey.webhookConfigured')}: {key.webhookUrl}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {key.keyPrefix}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {key.scopes.length === 0 ? (
                        <Badge variant="outline">{t('apiKey.allScopes')}</Badge>
                      ) : (
                        key.scopes.slice(0, 3).map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))
                      )}
                      {key.scopes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{key.scopes.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{key.rateLimit}{t('apiKey.perMinute')}</TableCell>
                  <TableCell>
                    <Badge variant={key.isActive ? 'default' : 'secondary'}>
                      {key.isActive ? t('apiKey.active') : t('apiKey.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {key.lastUsedAt
                      ? formatDateTime(key.lastUsedAt)
                      : t('apiKey.neverUsed')}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(key.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(key)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedKey(key)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 使用说明 */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium mb-2">{t('apiKey.usageTitle')}</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>1. {t('apiKey.usage1')} <code className="bg-muted px-1 rounded">X-API-Key: your-api-key</code></p>
          <p>2. {t('apiKey.usage2')}</p>
          <p>3. {t('apiKey.usage3')}</p>
          <p>4. {t('apiKey.usage4')}</p>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('apiKey.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('apiKey.deleteDescription', { name: selectedKey?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
