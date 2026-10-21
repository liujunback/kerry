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
    padding: '8mm',
    fontFamily: 'NotoSansSC',
    fontSize: 9,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '2px solid #000',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    width: '30mm',
  },
  barcodeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barcode: {
    width: '70mm',
    height: 24,
  },
  infoSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1px dashed #999',
  },
  infoItem: {
    flexDirection: 'row',
    width: '33%',
    marginBottom: 3,
  },
  infoLabel: {
    width: '18mm',
    color: '#666',
  },
  infoValue: {
    flex: 1,
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
    width: '5%',
    textAlign: 'center',
  },
  tableCellLocation: {
    width: '12%',
  },
  tableCellSkuBarcode: {
    width: '15%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skuBarcode: {
    width: '25mm',
    height: 16,
  },
  tableCellSku: {
    width: '13%',
  },
  tableCellSkuName: {
    width: '20%',
  },
  tableCellBatch: {
    width: '10%',
  },
  tableCellExpiry: {
    width: '10%',
  },
  tableCellLpn: {
    width: '10%',
  },
  tableCellQty: {
    width: '5%',
    textAlign: 'right',
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
  skuBarcode: string
  batchNumber: string
  expiryDate: string
  lpn: string
  expectedQty: number
}

interface WavePickListPdfProps {
  waveNumber: string
  warehouseName: string
  waveType: string
  pickStrategy: string
  totalOrders: number
  totalLines: number
  totalQty: number
  createdAt: string
  lines: PickLine[]
  barcodeImage: string
}

export function WavePickListPdf({
  waveNumber,
  warehouseName,
  waveType,
  pickStrategy,
  totalOrders,
  totalLines,
  totalQty,
  createdAt,
  lines,
  barcodeImage,
}: WavePickListPdfProps) {
  const maxLinesPerPage = 20
  const pages: PickLine[][] = []
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage))
  }
  if (pages.length === 0) pages.push([])

  return (
    <Document>
      {pages.map((pageLines, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>拣货清单</Text>
            <View style={styles.barcodeContainer}>
              <Image src={barcodeImage} style={styles.barcode} />
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>波次号:</Text>
              <Text style={styles.infoValue}>{waveNumber}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>仓库:</Text>
              <Text style={styles.infoValue}>{warehouseName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>创建时间:</Text>
              <Text style={styles.infoValue}>{formatDateTime(createdAt)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>波次类型:</Text>
              <Text style={styles.infoValue}>{waveType}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>拣货策略:</Text>
              <Text style={styles.infoValue}>{pickStrategy}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>订单/行/数量:</Text>
              <Text style={styles.infoValue}>{totalOrders}/{totalLines}/{totalQty}</Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableCellNo]}>#</Text>
              <Text style={[styles.tableCell, styles.tableCellLocation]}>库位</Text>
              <Text style={[styles.tableCell, styles.tableCellSkuBarcode]}>SKU条码</Text>
              <Text style={[styles.tableCell, styles.tableCellSku]}>SKU</Text>
              <Text style={[styles.tableCell, styles.tableCellSkuName]}>名称</Text>
              <Text style={[styles.tableCell, styles.tableCellBatch]}>批次</Text>
              <Text style={[styles.tableCell, styles.tableCellExpiry]}>效期</Text>
              <Text style={[styles.tableCell, styles.tableCellLpn]}>LPN</Text>
              <Text style={[styles.tableCell, styles.tableCellQty]}>数量</Text>
            </View>
            {pageLines.map((line, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableCellNo]}>
                  {pageIndex * maxLinesPerPage + index + 1}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellLocation]}>{line.locationCode || '-'}</Text>
                <View style={[styles.tableCell, styles.tableCellSkuBarcode]}>
                  {line.skuBarcode ? (
                    <Image src={line.skuBarcode} style={styles.skuBarcode} />
                  ) : (
                    <Text>-</Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.tableCellSku]}>{line.skuCode}</Text>
                <Text style={[styles.tableCell, styles.tableCellSkuName]}>{line.skuName || '-'}</Text>
                <Text style={[styles.tableCell, styles.tableCellBatch]}>{line.batchNumber || '-'}</Text>
                <Text style={[styles.tableCell, styles.tableCellExpiry]}>{line.expiryDate || '-'}</Text>
                <Text style={[styles.tableCell, styles.tableCellLpn]}>{line.lpn || '-'}</Text>
                <Text style={[styles.tableCell, styles.tableCellQty]}>{line.expectedQty}</Text>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text>第 {pageIndex + 1} / {pages.length} 页</Text>
            <Text>共 {lines.length} 行</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
