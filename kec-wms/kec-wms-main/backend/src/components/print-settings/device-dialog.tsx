'use client'

import { useEffect } from 'react'
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
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const formSchema = z.object({
  name: z.string().min(1, '请输入设备名称'),
  deviceType: z.enum(['THERMAL', 'LASER', 'INKJET', 'PORTABLE', 'VIRTUAL']),
  connectionType: z.enum(['NETWORK', 'USB', 'BLUETOOTH', 'VIRTUAL']),
  printerName: z.string().optional(),
  ipAddress: z.string().optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  location: z.string().optional(),
  charset: z.string().default('UTF-8'),
  dpi: z.coerce.number().int().positive().default(203),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  device: { id: string; name: string; deviceType: string; connectionType: string; printerName: string | null; ipAddress: string | null; port: number | null; location: string | null; charset: string; dpi: number } | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DeviceDialog({ open, device, onOpenChange, onSuccess }: Props) {
  const isEdit = !!device

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '', deviceType: 'THERMAL', connectionType: 'NETWORK',
      printerName: '', ipAddress: '', port: 9100, location: '', charset: 'UTF-8', dpi: 203,
    },
  })

  const connectionType = form.watch('connectionType')

  useEffect(() => {
    if (open) {
      form.reset(device ? {
        name: device.name,
        deviceType: device.deviceType as FormValues['deviceType'],
        connectionType: device.connectionType as FormValues['connectionType'],
        printerName: device.printerName ?? '',
        ipAddress: device.ipAddress ?? '',
        port: device.port ?? 9100,
        location: device.location ?? '',
        charset: device.charset,
        dpi: device.dpi,
      } : {
        name: '', deviceType: 'THERMAL', connectionType: 'NETWORK',
        printerName: '', ipAddress: '', port: 9100, location: '', charset: 'UTF-8', dpi: 203,
      })
    }
  }, [open, device, form])

  const onSubmit = async (values: FormValues) => {
    const url = isEdit ? `/api/v1/print-devices/${device!.id}` : '/api/v1/print-devices'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()

    if (json.success) {
      toast.success(isEdit ? '设备已更新' : '设备已添加')
      onSuccess()
    } else {
      toast.error(json.message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑设备' : '添加设备'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>设备名称</FormLabel>
                <FormControl><Input placeholder="如：发货区热敏打印机" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="deviceType" render={({ field }) => (
                <FormItem>
                  <FormLabel>设备类型</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="THERMAL">热敏打印机</SelectItem>
                      <SelectItem value="LASER">激光打印机</SelectItem>
                      <SelectItem value="INKJET">喷墨打印机</SelectItem>
                      <SelectItem value="PORTABLE">便携打印机</SelectItem>
                      <SelectItem value="VIRTUAL">虚拟打印机</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="connectionType" render={({ field }) => (
                <FormItem>
                  <FormLabel>连接方式</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="NETWORK">网络</SelectItem>
                      <SelectItem value="USB">USB</SelectItem>
                      <SelectItem value="BLUETOOTH">蓝牙</SelectItem>
                      <SelectItem value="VIRTUAL">虚拟</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {connectionType === 'NETWORK' && (
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="ipAddress" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>IP 地址</FormLabel>
                    <FormControl><Input placeholder="192.168.1.100" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="port" render={({ field }) => (
                  <FormItem>
                    <FormLabel>端口</FormLabel>
                    <FormControl><Input type="number" placeholder="9100" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {(connectionType === 'USB' || connectionType === 'BLUETOOTH') && (
              <FormField control={form.control} name="printerName" render={({ field }) => (
                <FormItem>
                  <FormLabel>系统打印机名称</FormLabel>
                  <FormControl><Input placeholder="如：KM-200" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>物理位置（可选）</FormLabel>
                <FormControl><Input placeholder="如：发货区A110" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="charset" render={({ field }) => (
                <FormItem>
                  <FormLabel>字符集</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="UTF-8">UTF-8</SelectItem>
                      <SelectItem value="GBK">GBK</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="dpi" render={({ field }) => (
                <FormItem>
                  <FormLabel>分辨率 (DPI)</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="203">203 DPI</SelectItem>
                      <SelectItem value="300">300 DPI</SelectItem>
                      <SelectItem value="600">600 DPI</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

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
