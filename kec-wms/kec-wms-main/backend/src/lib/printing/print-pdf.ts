'use client'

import { usePrintStore, type DeviceConfig } from '@/stores/print-store'
import type { PrintScenarioType } from '@/lib/printing/print-config'

export type PrintLabelType = PrintScenarioType

interface PrintTemplateResponse {
  id: string
  scenarioType?: PrintScenarioType
  labelSpecCode?: string | null
  warehouseId?: string | null
  defaultDevice?: {
    id: string
    name: string
    connectionType: DeviceConfig['connectionType']
    printerName?: string | null
    ipAddress?: string | null
    port?: number | null
  } | null
}

interface PrintPdfOptions {
  pdfUrl?: string
  pdfBlob?: Blob
  jobIdPrefix: string
  scenarioType?: PrintScenarioType
  labelType?: PrintLabelType
  warehouseId?: string
  relatedIds?: string[]
  relatedType?: string
  copies?: number
  pageCount?: number
  allowBrowserFallback?: boolean
}

interface PrintPdfResult {
  mode: 'agent' | 'browser'
  fallbackReason?: string
}

export async function printPdfWithAgentFallback({
  pdfUrl,
  pdfBlob: initialPdfBlob,
  jobIdPrefix,
  scenarioType,
  labelType,
  warehouseId,
  relatedIds = [],
  relatedType,
  copies = 1,
  pageCount,
  allowBrowserFallback = true,
}: PrintPdfOptions): Promise<PrintPdfResult> {
  let pdfBlob: Blob | null = initialPdfBlob ?? null

  const getPdfBlob = async () => {
    if (pdfBlob) return pdfBlob
    if (!pdfUrl) {
      throw new Error('缺少打印 PDF 数据')
    }

    const response = await fetch(pdfUrl)
    if (!response.ok) {
      throw new Error('生成打印 PDF 失败')
    }

    pdfBlob = await response.blob()
    return pdfBlob
  }

  const { isConnected } = usePrintStore.getState()
  let fallbackReason: string | undefined
  const effectiveScenarioType = scenarioType ?? labelType

  if (isConnected && effectiveScenarioType) {
    try {
      const blob = await getPdfBlob()
      const template = await fetchDefaultPrintTemplate(effectiveScenarioType, warehouseId)
      const defaultDevice = template?.defaultDevice

      if (!defaultDevice) {
        throw new Error('未配置默认打印设备')
      }

      const pdfBase64 = await blobToBase64(blob)
      const { print } = usePrintStore.getState()
      const status = await print({
        jobId: `${jobIdPrefix}-${Date.now()}`,
        deviceConfig: {
          connectionType: defaultDevice.connectionType,
          printerName: defaultDevice.printerName,
          ipAddress: defaultDevice.ipAddress,
          port: defaultDevice.port,
        },
        pdfBase64,
        copies,
      })

      if (status !== 'SUCCESS') {
        throw new Error('打印代理执行失败')
      }

      await recordPrintHistory({
        deviceId: defaultDevice.id,
        templateId: template?.id,
        scenarioType: effectiveScenarioType,
        labelSpecCode: template?.labelSpecCode ?? undefined,
        labelType: (template?.labelSpecCode ?? effectiveScenarioType) as PrintLabelType,
        warehouseId: template?.warehouseId ?? warehouseId,
        relatedIds,
        relatedType,
        pageCount: pageCount ?? (relatedIds.length || 1),
        status: 'SUCCESS',
      })

      return { mode: 'agent' }
    } catch (error) {
      fallbackReason = error instanceof Error ? error.message : '打印代理不可用'
      console.warn('print-agent 打印失败，准备回退浏览器打印:', error)
    }
  } else if (!isConnected) {
    fallbackReason = '打印代理未连接'
  } else if (!effectiveScenarioType) {
    fallbackReason = '未配置打印模板类型'
  }

  if (!allowBrowserFallback) {
    throw new Error(fallbackReason || '打印失败')
  }

  await printBlobViaBrowser(await getPdfBlob())
  return { mode: 'browser', fallbackReason }
}

async function fetchDefaultPrintTemplate(scenarioType: PrintScenarioType, warehouseId?: string) {
  const scopedUrl = warehouseId
    ? `/api/v1/print-templates?scenarioType=${scenarioType}&warehouseId=${warehouseId}&isDefault=true&pageSize=1`
    : `/api/v1/print-templates?scenarioType=${scenarioType}&isDefault=true&pageSize=1`
  let response = await fetch(scopedUrl)
  if (!response.ok) {
    throw new Error('查询默认打印模板失败')
  }

  let result = await response.json()
  if (!result.success) {
    throw new Error(result.message || '查询默认打印模板失败')
  }

  if (warehouseId && (!result.data || result.data.length === 0)) {
    response = await fetch(`/api/v1/print-templates?scenarioType=${scenarioType}&isDefault=true&pageSize=1`)
    if (!response.ok) {
      throw new Error('查询默认打印模板失败')
    }

    result = await response.json()
    if (!result.success) {
      throw new Error(result.message || '查询默认打印模板失败')
    }
  }

  return (result.data?.[0] || null) as PrintTemplateResponse | null
}

async function recordPrintHistory(payload: {
  deviceId: string
  templateId?: string
  labelType: string
  scenarioType: PrintScenarioType
  labelSpecCode?: string
  warehouseId?: string
  relatedIds: string[]
  relatedType?: string
  pageCount: number
  status: 'SUCCESS' | 'FAILED'
}) {
  try {
    await fetch('/api/v1/print-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.error('记录打印历史失败:', error)
  }
}

async function printBlobViaBrowser(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank')

  if (!printWindow) {
    URL.revokeObjectURL(url)
    throw new Error('浏览器阻止了打印窗口')
  }

  printWindow.onload = () => {
    printWindow.print()
  }

  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

async function blobToBase64(blob: Blob) {
  const reader = new FileReader()
  return await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const base64 = reader.result as string
      resolve(base64.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
