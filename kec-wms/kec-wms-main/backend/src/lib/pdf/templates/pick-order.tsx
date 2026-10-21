import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'
import { formatDateTime } from '@/lib/utils/date-formatter'

// 注册中文字体
const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansSC-Regular.otf')
if (fs.existsSync(fontPath)) {
  Font.register({
    family: 'NotoSansSC',
    src: fontPath,
    fontStyle: 'normal',
    fontWeight: 'normal',
  })
}

const styles = StyleSheet.create({
  page: {
    padding: '10mm',
    fontFamily: 'NotoSansSC',
    fontSize: 9,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '2px solid #000',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    width: '35mm',
  },
  barcodeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barcode: {
    width: '80mm',
    height: 28,
  },
  infoSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottom: '1px dashed #999',
  },
  infoItem: {
    flexDirection: 'row',
    width: '33%',
    marginBottom: 4,
  },
  infoLabel: {
    width: '20mm',
    color: '#666',
  },
  infoValue: {
    flex: 1,
  },
  statsSection: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  statLabel: {
    fontSize: 9,
    color: '#666',
    marginRight: 4,
  },
  statValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  table: {
    fontSize: 8,
    borderTop: '1px solid #000',
    borderLeft: '1px solid #000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    padding: 3,
    borderRight: '1px solid #000',
    borderBottom: '1px solid #000',
  },
  tableCellNo: {
    width: '6%',
    textAlign: 'center',
  },
  tableCellLocation: {
    width: '14%',
  },
  tableCellBarcode: {
    width: '15%',
  },
  tableCellSku: {
    width: '15%',
  },
  tableCellSkuName: {
    width: '25%',
  },
  tableCellBatch: {
    width: '12%',
  },
  tableCellExpiry: {
    width: '10%',
  },
  tableCellQty: {
    width: '8%',
    textAlign: 'right',
  },
  signatureSection: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
    borderTop: '1px solid #000',
    paddingTop: 5,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#666',
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#666',
  },
})

interface PickLine {
  lineNumber: number
  locationCode: string
  skuCode: string
  skuName: string
  barcode: string
  batchNumber: string
  expiryDate: string
  expectedQty: number
}

interface PickOrderPdfProps {
  layout?: 'A4_DOCUMENT' | 'LABEL_100X150'
  taskNumber: string
  taskType: string
  pickMode: string
  warehouseName: string
  waveNumber: string
  totalQty: number
  totalSkus: number
  totalLocations: number
  createdAt: string
  lines: PickLine[]
  barcodeImage: string
}

export function PickOrderPdf({
  layout = 'A4_DOCUMENT',
  taskNumber,
  taskType,
  pickMode,
  warehouseName,
  waveNumber,
  totalQty,
  totalSkus,
  totalLocations,
  createdAt,
  lines,
  barcodeImage,
}: PickOrderPdfProps) {
  const isCompact = layout === 'LABEL_100X150'
  const maxLinesPerPage = isCompact ? 7 : 20
  const pages: PickLine[][] = []
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage))
  }
  if (pages.length === 0) pages.push([])

  const taskTypeLabels: Record<string, string> = {
    SINGLE_ONE_HOT: '单品单件爆款',
    SINGLE_ONE_NORMAL: '单品单件非爆款',
    SINGLE_MULTI_HOT: '单品多件爆款',
    SINGLE_MULTI_NORMAL: '单品多件非爆款',
    MULTI_FIXED_COMBO: '多品固定组合',
    MULTI_NON_FIXED: '多品无固定组合',
    SINGLE_SKU_SINGLE: '单品单件(同款)',
    MULTI_SKU_SINGLE: '单品单件(不同款)',
    SINGLE_SKU_MULTI: '单品多件',
    MULTI_SKU_MULTI: '多品多件',
  }

  const pickModeLabels: Record<string, string> = {
    BY_ORDER: '按单拣货',
    SKU_BATCH: '单品批量',
    MIXED_BATCH: '混合批量',
    AGGREGATE: '汇总拣货',
    PICK_THEN_SORT: '先拣后分',
    PICK_AND_SORT: '边拣边分',
  }

  return (
    <Document>
      {pages.map((pageLines, pageIndex) => (
        <Page
          key={pageIndex}
          size={isCompact ? { width: '100mm', height: '150mm' } : 'A4'}
          style={isCompact ? {
            ...styles.page,
            padding: '4mm',
            fontSize: 7,
          } : styles.page}
        >
          <View style={styles.headerRow}>
            <Text style={isCompact ? { ...styles.title, fontSize: 13, width: '24mm' } : styles.title}>拣货单</Text>
            <View style={styles.barcodeContainer}>
              <Image src={barcodeImage} style={isCompact ? { width: '55mm', height: 18 } : styles.barcode} />
            </View>
          </View>

          <View style={isCompact ? { ...styles.infoSection, marginBottom: 6, paddingBottom: 4 } : styles.infoSection}>
            <View style={isCompact ? { ...styles.infoItem, width: '50%' } : styles.infoItem}>
              <Text style={styles.infoLabel}>拣货单号:</Text>
              <Text style={styles.infoValue}>{taskNumber}</Text>
            </View>
            <View style={isCompact ? { ...styles.infoItem, width: '50%' } : styles.infoItem}>
              <Text style={styles.infoLabel}>仓库:</Text>
              <Text style={styles.infoValue}>{warehouseName}</Text>
            </View>
            <View style={isCompact ? { ...styles.infoItem, width: '50%' } : styles.infoItem}>
              <Text style={styles.infoLabel}>创建时间:</Text>
              <Text style={styles.infoValue}>{formatDateTime(createdAt)}</Text>
            </View>
            <View style={isCompact ? { ...styles.infoItem, width: '50%' } : styles.infoItem}>
              <Text style={styles.infoLabel}>波次号:</Text>
              <Text style={styles.infoValue}>{waveNumber || '手动创建'}</Text>
            </View>
            <View style={isCompact ? { ...styles.infoItem, width: '50%' } : styles.infoItem}>
              <Text style={styles.infoLabel}>拣货单类型:</Text>
              <Text style={styles.infoValue}>{taskTypeLabels[taskType] || taskType}</Text>
            </View>
            <View style={isCompact ? { ...styles.infoItem, width: '50%' } : styles.infoItem}>
              <Text style={styles.infoLabel}>拣货模式:</Text>
              <Text style={styles.infoValue}>{pickModeLabels[pickMode] || pickMode || '-'}</Text>
            </View>
          </View>

          <View style={isCompact ? { ...styles.statsSection, marginBottom: 6 } : styles.statsSection}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>总数量:</Text>
              <Text style={styles.statValue}>{totalQty}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>SKU数:</Text>
              <Text style={styles.statValue}>{totalSkus}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>货位数:</Text>
              <Text style={styles.statValue}>{totalLocations}</Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {isCompact ? (
                <>
                  <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>#</Text>
                  <Text style={[styles.tableCell, { width: '24%' }]}>库位</Text>
                  <Text style={[styles.tableCell, { width: '24%' }]}>SKU</Text>
                  <Text style={[styles.tableCell, { width: '30%' }]}>名称</Text>
                  <Text style={[styles.tableCell, { width: '12%', textAlign: 'right' }]}>数量</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.tableCell, styles.tableCellNo]}>#</Text>
                  <Text style={[styles.tableCell, styles.tableCellLocation]}>库位</Text>
                  <Text style={[styles.tableCell, styles.tableCellBarcode]}>条码</Text>
                  <Text style={[styles.tableCell, styles.tableCellSku]}>SKU</Text>
                  <Text style={[styles.tableCell, styles.tableCellSkuName]}>名称</Text>
                  <Text style={[styles.tableCell, styles.tableCellBatch]}>批次</Text>
                  <Text style={[styles.tableCell, styles.tableCellExpiry]}>效期</Text>
                  <Text style={[styles.tableCell, styles.tableCellQty]}>数量</Text>
                </>
              )}
            </View>
            {pageLines.map((line, index) => (
              <View key={index} style={styles.tableRow}>
                {isCompact ? (
                  <>
                    <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>
                      {pageIndex * maxLinesPerPage + index + 1}
                    </Text>
                    <Text style={[styles.tableCell, { width: '24%' }]}>{line.locationCode || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '24%' }]}>{line.skuCode}</Text>
                    <Text style={[styles.tableCell, { width: '30%' }]}>{line.skuName || '-'}</Text>
                    <Text style={[styles.tableCell, { width: '12%', textAlign: 'right' }]}>{line.expectedQty}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.tableCell, styles.tableCellNo]}>
                      {pageIndex * maxLinesPerPage + index + 1}
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellLocation]}>{line.locationCode || '-'}</Text>
                    <Text style={[styles.tableCell, styles.tableCellBarcode]}>{line.barcode || '-'}</Text>
                    <Text style={[styles.tableCell, styles.tableCellSku]}>{line.skuCode}</Text>
                    <Text style={[styles.tableCell, styles.tableCellSkuName]}>{line.skuName || '-'}</Text>
                    <Text style={[styles.tableCell, styles.tableCellBatch]}>{line.batchNumber || '-'}</Text>
                    <Text style={[styles.tableCell, styles.tableCellExpiry]}>{line.expiryDate || '-'}</Text>
                    <Text style={[styles.tableCell, styles.tableCellQty]}>{line.expectedQty}</Text>
                  </>
                )}
              </View>
            ))}
          </View>

          {!isCompact && pageIndex === pages.length - 1 && (
            <View style={styles.signatureSection}>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>拣货人签名:</Text>
              </View>
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>拣货时间:</Text>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            <Text>第 {pageIndex + 1} / {pages.length} 页</Text>
            <Text>共 {lines.length} 行</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
