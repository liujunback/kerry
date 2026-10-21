'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { usePrintStore } from '@/stores/print-store'
import { printPdfWithAgentFallback } from '@/lib/printing/print-pdf'

export interface LabelData {
  labelSize: { width: number; height: number }
  shipmentId: string
  shipmentNumber: string
  orderNumber: string
  referenceNumber?: string | null
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  recipientPostalCode?: string
  warehouseName: string
  weight: number
  packageCount: number
  barcodeType: string
  barcodeContent: string
  barcodeImage: string
  printTime: string
}

interface ShipmentLabelPrintProps {
  labelData: LabelData[] | null
  onPrintComplete?: () => void
}

export function ShipmentLabelPrint({ labelData, onPrintComplete }: ShipmentLabelPrintProps) {
  const t = useTranslations('packing.print')
  const printedRef = useRef<string | null>(null)
  const connect = usePrintStore((state) => state.connect)

  useEffect(() => {
    connect()
  }, [connect])

  useEffect(() => {
    if (!labelData || labelData.length === 0) {
      printedRef.current = null
      return
    }

    const shipmentIds = labelData.map((item) => item.shipmentId).join(',')
    if (printedRef.current === shipmentIds) {
      return
    }

    const printLabel = async () => {
      printedRef.current = shipmentIds
      await printShipmentLabels(labelData, t)
      onPrintComplete?.()
    }

    printLabel()
  }, [labelData, onPrintComplete, t])

  return null
}

async function printShipmentLabels(labelData: LabelData[], t: (key: string, values?: Record<string, number>) => string) {
  const shipmentIds = labelData.map((item) => item.shipmentId)
  const pdfUrl = `/api/v1/files/shipment-label/batch?ids=${shipmentIds.join(',')}`

  try {
    const result = await printPdfWithAgentFallback({
      pdfUrl,
      jobIdPrefix: 'shipment-label',
      scenarioType: 'SHIPMENT_LABEL',
      relatedIds: shipmentIds,
      relatedType: 'SHIPMENT',
      pageCount: shipmentIds.length,
    })

    if (result.mode === 'agent') {
      toast.success(t('sentToAgent', { count: shipmentIds.length }))
    } else {
      toast.warning(t('browserFallback'))
    }
  } catch (error) {
    console.error(t('failedLog'), error)
    toast.error(t('failed'))
  }
}
