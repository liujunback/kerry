'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ContainerScanPanel } from '@/components/receiving/container-scan-panel'
import { AsnHeaderCard, AsnLinesTable } from '@/components/receiving'
import { FirstReceivingDialog } from '@/components/sku/first-receiving-dialog'
import { SerialScanDialog } from '@/components/receiving/serial-scan-dialog'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  useReceivingStore,
  type AsnInfo,
  type AsnLineInfo,
  type SkuInfo,
  type ContainerInfo,
} from '@/stores/receiving-store'

export function ContainerReceivingPage() {
  const t = useTranslations('receiving')
  const tMenuGroup = useTranslations('menuGroup')
  const searchParams = useSearchParams()
  const initialAsnNumber = searchParams.get('asn')
  const [showSerialScanDialog, setShowSerialScanDialog] = useState(false)
  const {
    currentAsn,
    asnLines,
    currentItem,
    quantity,
    qualityStatus,
    batchNumber,
    expiryDate,
    serialNumbers,
    showFirstReceivingDialog,
    currentContainer,
    setAsn,
    setCurrentItem,
    setIsSubmitting,
    setShowFirstReceivingDialog,
    setReceivingBusinessMode,
    setCurrentContainer,
    setContainerItems,
    setBatchNumber,
    setExpiryDate,
    setSerialNumbers,
    clearAsn,
    resetCurrentItem,
    updateAsnLine,
    updateAsnTotals,
    updateAsnStatus,
  } = useReceivingStore()

  // 设置收货模式为容器
  useEffect(() => {
    setReceivingBusinessMode('container')
  }, [setReceivingBusinessMode])

  // 加载 ASN
  const handleAsnLoaded = useCallback(async (asnNumber: string) => {
    const response = await fetch(`/api/v1/asn/lookup?asnNumber=${encodeURIComponent(asnNumber)}&receivingMode=CONTAINER`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || t('asn.notFound'))
    }
    const data = await response.json()
    const asn = data.data

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

  // 刷新容器内物品
  const refreshContainerItems = useCallback(async (containerId: string) => {
    try {
      const response = await fetch(`/api/v1/containers/${containerId}/items`)
      if (response.ok) {
        const data = await response.json()
        setContainerItems(data.data?.items || [], data.data?.summary || null)
      }
    } catch {
      // 忽略错误
    }
  }, [setContainerItems])

  // 扫描容器
  const handleContainerScanned = useCallback(async (containerCode: string) => {
    if (!currentAsn) return

    const response = await fetch(
      `/api/v1/containers/lookup?containerCode=${encodeURIComponent(containerCode)}&warehouseId=${currentAsn.warehouseId}`
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || t('container.notFound'))
    }

    const data = await response.json()
    const container = data.data

    // 校验容器
    if (container.warehouseId !== currentAsn.warehouseId) {
      throw new Error(t('container.wrongWarehouse'))
    }
    if (container.purpose !== 'INBOUND') {
      throw new Error(t('container.wrongPurpose'))
    }
    // 校验容器是否已关箱
    if (container.status === 'CLOSED' || container.closedAt) {
      throw new Error(t('container.alreadyClosed'))
    }
    if (container.status !== 'IDLE' && container.status !== 'OCCUPIED') {
      throw new Error(t('container.wrongStatus'))
    }
    if (!container.isEnabled) {
      throw new Error(t('container.disabled'))
    }
    // 校验容器是否已被其他ASN占用
    if (container.currentAsnId && container.currentAsnId !== currentAsn.id) {
      // 检查容器是否真的有物品
      const itemsResponse = await fetch(`/api/v1/containers/${container.id}/items`)
      if (itemsResponse.ok) {
        const itemsData = await itemsResponse.json()
        const hasItems = itemsData.data && itemsData.data.length > 0

        if (hasItems) {
          // 容器内有物品，确实被占用
          throw new Error(t('container.occupiedByOtherAsn'))
        }

        // 容器已清空，自动清理状态（调用后端 API）
        await fetch(`/api/v1/containers/${container.id}/reset`, {
          method: 'POST'
        })
      }
    }

    const containerInfo: ContainerInfo = {
      id: container.id,
      containerCode: container.containerCode,
      containerType: container.containerType,
      usage: container.purpose,
      workStatus: container.status,
      enabledStatus: container.isEnabled ? 'ENABLED' : 'DISABLED',
      warehouseId: container.warehouseId,
    }

    setCurrentContainer(containerInfo)

    // 加载容器内物品
    await refreshContainerItems(container.id)
  }, [currentAsn, t, setCurrentContainer, refreshContainerItems])

  // 扫描 SKU
  const handleSkuScanned = useCallback(async (barcode: string) => {
    if (!currentAsn) return

    const response = await fetch(
      `/api/v1/asn/${currentAsn.id}/receiving/lookup-sku?barcode=${encodeURIComponent(barcode)}`
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || t('messages.skuNotInAsn'))
    }

    const data = await response.json()
    const { asnLine, sku } = data.data

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

    // 自动填充 ASN line 中的批次号和过期日期
    if (asnLine.batchNumber) {
      setBatchNumber(asnLine.batchNumber)
    }
    if (asnLine.expiryDate) {
      setExpiryDate(new Date(asnLine.expiryDate))
    }

    if (sku.isFirstReceiving) {
      setShowFirstReceivingDialog(true)
    }
  }, [currentAsn, t, setCurrentItem, setShowFirstReceivingDialog, setBatchNumber, setExpiryDate])

  // 保存收货
  const handleSave = useCallback(async (overrideSerialNumbers?: string[]) => {
    if (!currentAsn || !currentItem || !currentContainer || quantity <= 0) return

    if (currentItem.sku.isBatchManaged && !batchNumber?.trim()) {
      toast.error(t('messages.batchNumberRequired'))
      return
    }

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
          containerId: currentContainer.id,
          containerCode: currentContainer.containerCode,
          containerType: 'INTERNAL_MANAGED',
          receivingMode: 'CONTAINER',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '收货失败')
      }

      const data = await response.json()

      updateAsnLine(currentItem.asnLineId, {
        receivedQty: data.data.asnLine.receivedQty,
        receivedGoodQty: data.data.asnLine.receivedGoodQty,
        receivedDamagedQty: data.data.asnLine.receivedDamagedQty,
        status: data.data.asnLine.status,
      })

      const receivedLines = asnLines.filter(line => {
        if (line.id === currentItem.asnLineId) {
          return data.data.asnLine.receivedQty > 0
        }
        return line.receivedQty > 0
      }).length

      updateAsnTotals(quantity, receivedLines)

      // 刷新容器内物品
      await refreshContainerItems(currentContainer.id)

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
    currentContainer,
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
    resetCurrentItem,
    refreshContainerItems,
  ])

  // 关箱
  const handleCloseContainer = useCallback(async (): Promise<boolean> => {
    if (!currentContainer) return false

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/v1/containers/${currentContainer.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '关箱失败')
      }

      const data = await response.json()

      // 如果 ASN 收货完成，清空 ASN 并提示
      if (data.data?.asnUpdated) {
        toast.success(t('messages.completeSuccess'))
        clearAsn()
        return true // ASN 已完成并被清空
      } else {
        toast.success(t('container.closeSuccess'))
        // 只清空容器相关状态
        setCurrentContainer(null)
        setContainerItems([], null)
        resetCurrentItem()
        return false // ASN 未完成
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '关箱失败'
      toast.error(errorMessage)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [currentContainer, t, setIsSubmitting, setCurrentContainer, setContainerItems, resetCurrentItem, clearAsn])

  // 重新装箱
  const handleRepackContainer = useCallback(async () => {
    if (!currentContainer || !currentAsn) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/v1/containers/${currentContainer.id}/repack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asnId: currentAsn.id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || '重新装箱失败')
      }

      // 重新加载 ASN 以获取最新的收货数量
      await handleAsnLoaded(currentAsn.asnNumber)

      // 清空容器内物品
      setContainerItems([], null)
      resetCurrentItem()

      toast.success(t('container.repackSuccess'))
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '重新装箱失败'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [currentContainer, currentAsn, t, setIsSubmitting, setContainerItems, resetCurrentItem, handleAsnLoaded])

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
      setCurrentItem({
        ...currentItem,
        sku: {
          ...currentItem.sku,
          isFirstReceiving: false,
        },
      })
    }
  }, [currentItem, setShowFirstReceivingDialog, setCurrentItem])

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
          { label: t('landing.containerMode.title') },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧扫描区 */}
        <div className="lg:col-span-1">
          <ContainerScanPanel
            onAsnLoaded={handleAsnLoaded}
            onSkuScanned={handleSkuScanned}
            onSave={handleSave}
            onContainerScanned={handleContainerScanned}
            onCloseContainer={handleCloseContainer}
            onRepackContainer={handleRepackContainer}
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
