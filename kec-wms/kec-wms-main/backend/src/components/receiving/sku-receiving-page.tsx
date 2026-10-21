'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { SkuScanPanel } from '@/components/receiving/sku-scan-panel'
import { AsnHeaderCard, AsnLinesTable } from '@/components/receiving'
import { SerialScanDialog } from '@/components/receiving/serial-scan-dialog'
import { FirstReceivingDialog } from '@/components/sku/first-receiving-dialog'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  useReceivingStore,
  type AsnInfo,
  type AsnLineInfo,
  type SkuInfo,
} from '@/stores/receiving-store'

export function SkuReceivingPage() {
  const t = useTranslations('receiving')
  const tMenuGroup = useTranslations('menuGroup')
  const searchParams = useSearchParams()
  const initialAsnNumber = searchParams.get('asn')
  const [showSerialScanDialog, setShowSerialScanDialog] = useState(false)
  const {
    currentAsn,
    asnLines,
    currentItem,
    availableBatchLines,
    quantity,
    qualityStatus,
    batchNumber,
    expiryDate,
    serialNumbers,
    showFirstReceivingDialog,
    setAsn,
    setCurrentItem,
    setAvailableBatchLines,
    setIsSubmitting,
    setShowFirstReceivingDialog,
    setReceivingBusinessMode,
    setBatchNumber,
    setExpiryDate,
    setSerialNumbers,
    clearAsn,
    resetCurrentItem,
    updateAsnLine,
    updateAsnTotals,
    updateAsnStatus,
  } = useReceivingStore()

  // 设置收货模式为 SKU
  useEffect(() => {
    setReceivingBusinessMode('sku')
  }, [setReceivingBusinessMode])

  // 加载 ASN
  const handleAsnLoaded = useCallback(async (asnNumber: string) => {
    const response = await fetch(`/api/v1/asn/lookup?asnNumber=${encodeURIComponent(asnNumber)}&receivingMode=SKU`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || t('asn.notFound'))
    }
    const data = await response.json()
    const asn = data.data

    // 转换为 store 格式
    const asnInfo: AsnInfo = {
      id: asn.id,
      asnNumber: asn.asnNumber,
      externalNumber: asn.externalNumber,
      status: asn.status,
      clientName: asn.client?.clientName || null,
      warehouseName: asn.warehouse?.warehouseName || null,
      warehouseId: asn.warehouseId,
      createdAt: asn.createdAt,
      totalExpectedQty: asn.totalExpectedQty,
      totalReceivedQty: asn.totalReceivedQty,
      totalExpectedLines: asn.totalExpectedLines,
      totalReceivedLines: asn.totalReceivedLines,
    }

    const lines: AsnLineInfo[] = asn.asnLines?.map((line: Record<string, unknown>) => ({
      id: line.id as string,
      lineNumber: line.lineNumber as number,
      skuId: line.skuId as string,
      skuCode: line.skuCode as string,
      skuName: line.skuName as string,
      barcode: (line.sku as Record<string, unknown>)?.barcode as string | null,
      expectedQty: line.expectedQty as number,
      receivedQty: line.receivedQty as number,
      receivedGoodQty: line.receivedGoodQty as number,
      receivedDamagedQty: line.receivedDamagedQty as number,
      status: line.status as string,
      batchNumber: line.batchNumber as string | null,
      expiryDate: line.expiryDate as string | null,
    })) || []

    setAsn(asnInfo, lines)
  }, [t, setAsn])

  // 扫描 SKU
  const handleSkuScanned = useCallback(async (barcode: string) => {
    if (!currentAsn) return

    // 查找 ASN 中匹配的行项目
    const response = await fetch(
      `/api/v1/asn/${currentAsn.id}/receiving/lookup-sku?barcode=${encodeURIComponent(barcode)}`
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || t('messages.skuNotInAsn'))
    }

    const data = await response.json()
    const { asnLine, sku, availableBatchLines: batchLines } = data.data

    // 检查是否已全部收货
    const maxQty = asnLine.expectedQty - asnLine.receivedQty
    if (maxQty <= 0) {
      throw new Error(t('messages.skuCompleted'))
    }

    const skuInfo: SkuInfo = {
      id: sku.id,
      skuCode: sku.skuCode,
      skuName: sku.skuName,
      barcode: sku.barcode,
      isFirstReceiving: sku.isFirstReceiving,
      isSelfPackaged: sku.isSelfPackaged,
      isBatchManaged: sku.isBatchManaged,
      isSerialManaged: sku.isSerialManaged,
      isExpiryManaged: sku.isExpiryManaged,
      lengthCm: sku.lengthCm,
      widthCm: sku.widthCm,
      heightCm: sku.heightCm,
      weightKg: sku.weightKg,
    }

    setCurrentItem({
      asnLineId: asnLine.id,
      sku: skuInfo,
      maxQty,
    })

    // 设置可用批次行
    setAvailableBatchLines(batchLines || [])

    // 自动填充 ASN line 中的批次号和过期日期
    if (asnLine.batchNumber) {
      setBatchNumber(asnLine.batchNumber)
    }
    if (asnLine.expiryDate) {
      setExpiryDate(new Date(asnLine.expiryDate))
    }

    // 检查是否需要首次收货录入物理属性
    if (sku.isFirstReceiving) {
      setShowFirstReceivingDialog(true)
    }
  }, [currentAsn, t, setCurrentItem, setAvailableBatchLines, setShowFirstReceivingDialog, setBatchNumber, setExpiryDate])

  // 保存收货
  const handleSave = useCallback(async (overrideSerialNumbers?: string[]) => {
    if (!currentAsn || !currentItem || quantity <= 0) return

    // 验证批次号
    if (currentItem.sku.isBatchManaged && !batchNumber?.trim()) {
      toast.error(t('messages.batchNumberRequired'))
      return
    }

    // 验证过期时间
    if (currentItem.sku.isExpiryManaged && !expiryDate) {
      toast.error(t('messages.expiryDateRequired'))
      return
    }

    // 使用传入的序列号或 store 中的序列号
    const finalSerialNumbers = overrideSerialNumbers ?? serialNumbers

    // 验证序列号数量 - 如果不足，弹出序列号扫描对话框
    if (currentItem.sku.isSerialManaged && finalSerialNumbers.length !== quantity) {
      setShowSerialScanDialog(true)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/v1/asn/${currentAsn.id}/receiving/sku`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asnLineId: currentItem.asnLineId,
          receivedQty: quantity,
          qualityStatus,
          batchNumber,
          expiryDate: expiryDate?.toISOString(),
          serialNumbers: currentItem.sku.isSerialManaged ? finalSerialNumbers : [],
          containerId: null,
          containerCode: null,
          containerType: null,
          receivingMode: 'SKU',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '收货失败')
      }

      const data = await response.json()

      // 更新本地状态
      updateAsnLine(currentItem.asnLineId, {
        receivedQty: data.data.asnLine.receivedQty,
        receivedGoodQty: data.data.asnLine.receivedGoodQty,
        receivedDamagedQty: data.data.asnLine.receivedDamagedQty,
        status: data.data.asnLine.status,
      })

      // 计算已收货行数
      const receivedLines = asnLines.filter(line => {
        if (line.id === currentItem.asnLineId) {
          return data.data.asnLine.receivedQty > 0
        }
        return line.receivedQty > 0
      }).length

      updateAsnTotals(quantity, receivedLines)

      // 更新 ASN 状态
      if (data.data.newStatus) {
        updateAsnStatus(data.data.newStatus)

        // 如果收货完成，清空 ASN 让用户可以扫描下一个
        if (data.data.newStatus === 'RECEIVED') {
          toast.success(t('messages.asnCompleted'))
          clearAsn()
          return
        }
      }

      toast.success(t('messages.receiveSuccess'))
      resetCurrentItem()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '收货失败'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    currentAsn,
    currentItem,
    quantity,
    qualityStatus,
    batchNumber,
    expiryDate,
    serialNumbers,
    asnLines,
    t,
    setIsSubmitting,
    updateAsnLine,
    updateAsnTotals,
    updateAsnStatus,
    resetCurrentItem,
    clearAsn,
  ])

  // 继续扫描
  const handleContinue = useCallback(() => {
    resetCurrentItem()
  }, [resetCurrentItem])

  // 完成收货
  const handleComplete = useCallback(async () => {
    if (!currentAsn) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/v1/asn/${currentAsn.id}/receiving/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '完成收货失败')
      }

      toast.success(t('messages.completeSuccess'))
      clearAsn()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '完成收货失败'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [currentAsn, t, setIsSubmitting, clearAsn])

  // 首次收货物理属性录入完成
  const handleFirstReceivingComplete = useCallback(() => {
    setShowFirstReceivingDialog(false)
    if (currentItem) {
      // 保存当前的批次号和过期日期，因为 setCurrentItem 会重置它们
      const savedBatchNumber = batchNumber
      const savedExpiryDate = expiryDate

      setCurrentItem({
        ...currentItem,
        sku: {
          ...currentItem.sku,
          isFirstReceiving: false,
        },
      })

      // 恢复批次号和过期日期
      if (savedBatchNumber) {
        setBatchNumber(savedBatchNumber)
      }
      if (savedExpiryDate) {
        setExpiryDate(savedExpiryDate)
      }
    }
  }, [currentItem, batchNumber, expiryDate, setShowFirstReceivingDialog, setCurrentItem, setBatchNumber, setExpiryDate])

  // 序列号扫描完成
  const handleSerialScanConfirm = useCallback((scannedSerials: string[]) => {
    setSerialNumbers(scannedSerials)
    setShowSerialScanDialog(false)
    // 序列号已完整，直接传递序列号触发保存（避免状态更新延迟问题）
    handleSave(scannedSerials)
  }, [setSerialNumbers, handleSave])

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { label: tMenuGroup('inbound'), href: '/asn' },
          { label: t('title'), href: '/receiving' },
          { label: t('landing.skuMode.title') },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧扫描区 */}
        <div className="lg:col-span-1">
          <SkuScanPanel
            onAsnLoaded={handleAsnLoaded}
            onSkuScanned={handleSkuScanned}
            onSave={handleSave}
            onContinue={handleContinue}
            onOpenSerialDialog={() => setShowSerialScanDialog(true)}
            initialAsnNumber={initialAsnNumber}
          />
        </div>

        {/* 右侧详情区 */}
        <div className="lg:col-span-2 space-y-4">
          <AsnHeaderCard />
          <AsnLinesTable />
        </div>
      </div>

      {/* 首次收货物理属性录入弹窗 */}
      {currentItem && (
        <FirstReceivingDialog
          open={showFirstReceivingDialog}
          sku={{
            id: currentItem.sku.id,
            skuCode: currentItem.sku.skuCode,
            skuName: currentItem.sku.skuName,
            barcode: currentItem.sku.barcode || null,
            isSelfPackaged: currentItem.sku.isSelfPackaged,
            length: currentItem.sku.lengthCm,
            width: currentItem.sku.widthCm,
            height: currentItem.sku.heightCm,
            weight: currentItem.sku.weightKg,
          }}
          onSuccess={handleFirstReceivingComplete}
          onCancel={() => setShowFirstReceivingDialog(false)}
        />
      )}

      {/* 序列号扫描弹窗 */}
      {currentItem && currentItem.sku.isSerialManaged && (
        <SerialScanDialog
          open={showSerialScanDialog}
          skuCode={currentItem.sku.skuCode}
          skuName={currentItem.sku.skuName}
          requiredCount={quantity}
          initialSerialNumbers={serialNumbers}
          onConfirm={handleSerialScanConfirm}
          onCancel={() => setShowSerialScanDialog(false)}
        />
      )}
    </div>
  )
}
