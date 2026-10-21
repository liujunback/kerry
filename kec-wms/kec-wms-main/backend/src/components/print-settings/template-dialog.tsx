'use client'

import { useEffect, useState, useCallback, startTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  PRINT_SCENARIO_ALLOWED_SPECS,
  PRINT_SCENARIO_DEFAULT_SPEC,
  PRINT_SCENARIO_LABELS,
  PRINT_SCENARIO_TYPES,
} from '@/lib/printing/print-config'

const formSchema = z.object({
  name: z.string().min(1, '请输入模板名称'),
  scenarioType: z.enum(PRINT_SCENARIO_TYPES),
  labelSpecCode: z.string().min(1, '请选择标签规格'),
  warehouseId: z.string().optional(),
  widthMm: z.coerce.number().min(10).max(500),
  heightMm: z.coerce.number().min(10).max(500),
  orientation: z.enum(['portrait', 'landscape']),
  defaultDeviceId: z.string().optional(),
  isDefault: z.boolean(),
}).transform((data) => ({
  ...data,
  defaultDeviceId: data.defaultDeviceId === 'NONE' ? undefined : data.defaultDeviceId,
  warehouseId: data.warehouseId === 'GLOBAL' ? undefined : data.warehouseId,
}))

type FormValues = z.infer<typeof formSchema>

interface Device {
  id: string
  name: string
}

interface WarehouseOption {
  id: string
  warehouseName: string
  warehouseCode: string
}

interface LabelSpec {
  code: string
  name: string
  widthMm: number
  heightMm: number
  orientation: 'portrait' | 'landscape'
  isSystem: boolean
}

interface Props {
  open: boolean
  template: {
    id: string
    name: string
    scenarioType: string | null
    labelSpecCode: string | null
    warehouse?: { id: string; warehouseName: string; warehouseCode: string } | null
    widthMm: number
    heightMm: number
    orientation: string
    isDefault: boolean
    defaultDevice?: { id: string; name: string } | null
  } | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function TemplateDialog({ open, template, onOpenChange, onSuccess }: Props) {
  const isEdit = !!template
  const [devices, setDevices] = useState<Device[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([])
  const [labelSpecs, setLabelSpecs] = useState<LabelSpec[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      scenarioType: 'SHIPMENT_LABEL',
      labelSpecCode: 'LABEL_100X150',
      warehouseId: 'GLOBAL',
      widthMm: 100,
      heightMm: 150,
      orientation: 'portrait',
      defaultDeviceId: 'NONE',
      isDefault: false,
    },
  })
  const scenarioType = form.watch('scenarioType')
  const labelSpecCode = form.watch('labelSpecCode')
  const selectedSpec = labelSpecs.find((item) => item.code === labelSpecCode)
  const recommendedSpecCode = PRINT_SCENARIO_DEFAULT_SPEC[scenarioType]
  const allowedSpecCodes = PRINT_SCENARIO_ALLOWED_SPECS[scenarioType]
  const filteredLabelSpecs = labelSpecs.filter((spec) => {
    return allowedSpecCodes.includes(spec.code) || !spec.isSystem
  })
  const hasSingleLabelSpec = filteredLabelSpecs.length === 1
  const singleLabelSpecCode = hasSingleLabelSpec ? filteredLabelSpecs[0].code : null

  // 获取打印设备列表
  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/print-devices?pageSize=100')
      const json = await res.json()
      if (json.success) setDevices(json.data)
    } catch (error) {
      console.error('Failed to fetch devices:', error)
    }
  }, [])

  const fetchLabelSpecs = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/print-label-specs?pageSize=100')
      const json = await res.json()
      if (json.success) setLabelSpecs(json.data)
    } catch (error) {
      console.error('Failed to fetch label specs:', error)
    }
  }, [])

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/warehouses?pageSize=200')
      const json = await res.json()
      if (json.success) setWarehouses(json.data)
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
    }
  }, [])

  useEffect(() => {
    if (open) {
      startTransition(() => {
        fetchDevices()
        fetchLabelSpecs()
        fetchWarehouses()
        form.reset(template ? {
          name: template.name,
          scenarioType: (template.scenarioType || 'SHIPMENT_LABEL') as FormValues['scenarioType'],
          labelSpecCode: template.labelSpecCode || 'LABEL_100X150',
          warehouseId: template.warehouse?.id || 'GLOBAL',
          widthMm: template.widthMm,
          heightMm: template.heightMm,
          orientation: template.orientation as FormValues['orientation'],
          defaultDeviceId: template.defaultDevice?.id || 'NONE',
          isDefault: template.isDefault,
        } : {
          name: '',
          scenarioType: 'SHIPMENT_LABEL',
          labelSpecCode: 'LABEL_100X150',
          warehouseId: 'GLOBAL',
          widthMm: 100,
          heightMm: 150,
          orientation: 'portrait',
          defaultDeviceId: 'NONE',
          isDefault: false,
        })
      })
    }
  }, [open, template, form, fetchDevices, fetchLabelSpecs, fetchWarehouses])

  useEffect(() => {
    if (!open || !selectedSpec) return

    const widthMm = Number(selectedSpec.widthMm)
    const heightMm = Number(selectedSpec.heightMm)
    if (form.getValues('widthMm') !== widthMm) form.setValue('widthMm', widthMm)
    if (form.getValues('heightMm') !== heightMm) form.setValue('heightMm', heightMm)
    if (form.getValues('orientation') !== selectedSpec.orientation) {
      form.setValue('orientation', selectedSpec.orientation)
    }
  }, [form, open, selectedSpec])

  useEffect(() => {
    if (!open || !singleLabelSpecCode || labelSpecCode === singleLabelSpecCode) return

    form.setValue('labelSpecCode', singleLabelSpecCode)
  }, [form, labelSpecCode, open, singleLabelSpecCode])

  const handleScenarioChange = (value: FormValues['scenarioType']) => {
    form.setValue('scenarioType', value)
    form.setValue('labelSpecCode', PRINT_SCENARIO_DEFAULT_SPEC[value])
  }

  const onSubmit = async (values: FormValues) => {
    const url = isEdit ? `/api/v1/print-templates/${template!.id}` : '/api/v1/print-templates'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()

    if (json.success) {
      toast.success(isEdit ? '模板已更新' : '模板已创建')
      onSuccess()
    } else {
      toast.error(json.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑模板' : '新建模板'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>模板名称</FormLabel>
                <FormControl><Input placeholder="如：标准发货标签" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="scenarioType" render={({ field }) => (
              <FormItem>
                <FormLabel>业务标签</FormLabel>
                <Select onValueChange={handleScenarioChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {PRINT_SCENARIO_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {PRINT_SCENARIO_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="labelSpecCode" render={({ field }) => (
              <FormItem>
                <FormLabel>标签规格</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={hasSingleLabelSpec}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {filteredLabelSpecs.map((spec) => (
                      <SelectItem key={spec.code} value={spec.code}>
                        {spec.name}{spec.code === recommendedSpecCode ? '（推荐）' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="warehouseId" render={({ field }) => (
              <FormItem>
                <FormLabel>适用仓库</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="GLOBAL">全局默认</SelectItem>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id}>
                        {warehouse.warehouseCode} - {warehouse.warehouseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="widthMm" render={({ field }) => (
                <FormItem>
                  <FormLabel>宽度 (mm)</FormLabel>
                  <FormControl><Input type="number" disabled {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="heightMm" render={({ field }) => (
                <FormItem>
                  <FormLabel>高度 (mm)</FormLabel>
                  <FormControl><Input type="number" disabled {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <p className="text-xs text-muted-foreground">
              规格会根据业务标签动态加载；如需新增或调整自定义尺寸，请到“标签规格”页签维护。
            </p>

            <FormField control={form.control} name="orientation" render={({ field }) => (
              <FormItem>
                <FormLabel>方向</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="portrait">纵向</SelectItem>
                    <SelectItem value="landscape">横向</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="defaultDeviceId" render={({ field }) => (
              <FormItem>
                <FormLabel>默认打印机</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择打印机（可选）" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="NONE">不指定</SelectItem>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="isDefault" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="cursor-pointer">设为该类型的默认模板</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
