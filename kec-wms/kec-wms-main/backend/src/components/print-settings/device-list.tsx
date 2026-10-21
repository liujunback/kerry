'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Wifi, WifiOff, TestTube } from 'lucide-react'
import { DeviceDialog } from './device-dialog'
import { usePrintStore } from '@/stores/print-store'
import { toast } from 'sonner'

const DEVICE_TYPE_LABELS: Record<string, string> = {
  THERMAL: '热敏打印机',
  LASER: '激光打印机',
  INKJET: '喷墨打印机',
  PORTABLE: '便携打印机',
  VIRTUAL: '虚拟打印机',
}

const CONNECTION_TYPE_LABELS: Record<string, string> = {
  NETWORK: '网络',
  USB: 'USB',
  BLUETOOTH: '蓝牙',
}

interface Device {
  id: string
  name: string
  deviceType: string
  connectionType: string
  printerName: string | null
  ipAddress: string | null
  port: number | null
  location: string | null
  charset: string
  dpi: number
  isOnline: boolean
  lastOnlineAt: string | null
}

export function DeviceList() {
  const tCommon = useTranslations('common')
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const autoTestedDeviceIdsRef = useRef<Set<string>>(new Set())

  const { isConnected, testDevice } = usePrintStore()

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/print-devices?pageSize=100')
      const json = await res.json()
      if (json.success) setDevices(json.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDevices() }, [fetchDevices])

  const testAndPersistDeviceStatus = useCallback(async (device: Device, showToast: boolean) => {
    if (!isConnected) {
      if (showToast) toast.error(tCommon('printer.agentNotConnected'))
      return { success: false }
    }
    setTestingId(device.id)
    const result = await testDevice({
      connectionType: device.connectionType as 'NETWORK' | 'USB' | 'BLUETOOTH' | 'VIRTUAL',
      printerName: device.printerName || device.name,
      ipAddress: device.ipAddress,
      port: device.port,
    })
    const statusResponse = await fetch(`/api/v1/print-devices/${device.id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: result.success }),
    }).catch(() => null)

    const statusJson = await statusResponse?.json().catch(() => null)
    if (statusJson?.success) {
      setDevices((items) =>
        items.map((item) =>
          item.id === device.id
            ? {
                ...item,
                isOnline: statusJson.data.isOnline,
                lastOnlineAt: statusJson.data.lastOnlineAt,
              }
            : item
        )
      )
    }
    setTestingId(null)
    if (showToast && result.success) {
      toast.success(tCommon('printer.testSuccess', { latency: result.latencyMs ?? 0 }))
    } else if (showToast) {
      toast.error(tCommon('printer.testFailed', { error: result.error ?? '未知错误' }))
    }
    return result
  }, [isConnected, tCommon, testDevice])

  useEffect(() => {
    if (!isConnected) {
      autoTestedDeviceIdsRef.current.clear()
      return
    }

    if (loading) return

    devices.forEach((device) => {
      if (autoTestedDeviceIdsRef.current.has(device.id)) return
      autoTestedDeviceIdsRef.current.add(device.id)
      void testAndPersistDeviceStatus(device, false)
    })
  }, [devices, isConnected, loading, testAndPersistDeviceStatus])

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该设备？')) return
    const res = await fetch(`/api/v1/print-devices/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast.success('设备已删除')
      fetchDevices()
    } else {
      toast.error(json.message)
    }
  }

  const handleTest = async (device: Device) => {
    await testAndPersistDeviceStatus(device, true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingDevice(null); setDialogOpen(true) }} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          添加设备
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>设备名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>连接方式</TableHead>
              <TableHead>地址</TableHead>
              <TableHead>位置</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="w-32">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">加载中...</TableCell>
              </TableRow>
            ) : devices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">暂无设备</TableCell>
              </TableRow>
            ) : (
              devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{DEVICE_TYPE_LABELS[d.deviceType] ?? d.deviceType}</Badge>
                  </TableCell>
                  <TableCell>{CONNECTION_TYPE_LABELS[d.connectionType] ?? d.connectionType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {d.connectionType === 'NETWORK'
                      ? d.ipAddress ? `${d.ipAddress}:${d.port}` : '-'
                      : d.printerName || '-'}
                  </TableCell>
                  <TableCell className="text-sm">{d.location ?? '-'}</TableCell>
                  <TableCell>
                    {!isConnected ? (
                      <span className="flex items-center gap-1 text-muted-foreground text-sm">
                        <WifiOff className="h-3 w-3" /> 未检测
                      </span>
                    ) : d.isOnline ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <Wifi className="h-3 w-3" /> 在线
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground text-sm">
                        <WifiOff className="h-3 w-3" /> 离线
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost" size="icon"
                        disabled={testingId === d.id}
                        onClick={() => handleTest(d)}
                        title="测试连接"
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { setEditingDevice(d); setDialogOpen(true) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
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

      <DeviceDialog
        open={dialogOpen}
        device={editingDevice}
        onOpenChange={setDialogOpen}
        onSuccess={() => { setDialogOpen(false); fetchDevices() }}
      />
    </div>
  )
}
