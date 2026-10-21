import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'

// 注册中文字体 - 使用 Buffer 方式加载
const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansSC-Regular.otf')
if (fs.existsSync(fontPath)) {
  Font.register({
    family: 'NotoSansSC',
    src: fontPath,
    fontStyle: 'normal',
    fontWeight: 'normal',
  })
}

// 样式定义
const styles = StyleSheet.create({
  page: {
    width: '150mm',
    height: '100mm',
    padding: '3mm',
    fontFamily: 'NotoSansSC',
    fontSize: 9,
  },
  // 标题和条码区域 - 同一行
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: '1px solid #000',
  },
  title: {
    fontSize: 14,
    width: '20mm',
  },
  barcodeContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barcode: {
    width: '70mm',
    height: 22,
  },
  // 信息区域 - 多列布局
  infoSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: '1px dashed #999',
  },
  infoItem: {
    flexDirection: 'row',
    width: '50%',
    marginBottom: 2,
  },
  infoLabel: {
    width: '15mm',
  },
  infoValue: {
    flex: 1,
  },
  // 明细区域
  detailHeader: {
    fontSize: 10,
    marginBottom: 4,
  },
  table: {
    fontSize: 8,
    borderTop: '1px solid #000',
    borderLeft: '1px solid #000',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#eee',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    padding: 2,
    borderRight: '1px solid #000',
    borderBottom: '1px solid #000',
  },
  tableCellSku: {
    width: '22%',
  },
  tableCellName: {
    width: '33%',
  },
  tableCellQty: {
    width: '15%',
    textAlign: 'right',
  },
  tableCellLocation: {
    width: '30%',
  },
  moreText: {
    textAlign: 'center',
    fontSize: 8,
    padding: 2,
  },
})

interface Task {
  skuCode: string
  skuName: string | null
  quantity: number
  targetLocation: string | null
}

interface PutawayOrderPdfProps {
  orderNumber: string
  asnNumber: string
  warehouseName: string
  clientName: string
  totalQty: number
  skuCount: number
  tasks: Task[]
  barcodeImage: string
}

export function PutawayOrderPdf({
  orderNumber,
  asnNumber,
  warehouseName,
  clientName,
  totalQty,
  skuCount,
  tasks,
  barcodeImage,
}: PutawayOrderPdfProps) {
  const displayTasks = tasks.slice(0, 8)
  const hasMore = tasks.length > 8

  return (
    <Document>
      <Page size={[425.2, 283.5]} style={styles.page}>
        {/* 标题和条码在同一行 */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>上架单</Text>
          <View style={styles.barcodeContainer}>
            <Image src={barcodeImage} style={styles.barcode} />
          </View>
        </View>

        {/* 信息区域 - 两列布局 */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>单号:</Text>
            <Text style={styles.infoValue}>{orderNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>ASN:</Text>
            <Text style={styles.infoValue}>{asnNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>仓库:</Text>
            <Text style={styles.infoValue}>{warehouseName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>客户:</Text>
            <Text style={styles.infoValue}>{clientName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>总数量:</Text>
            <Text style={styles.infoValue}>{totalQty}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>SKU数:</Text>
            <Text style={styles.infoValue}>{skuCount}</Text>
          </View>
        </View>

        {/* 明细区域 */}
        <View style={styles.table}>
          {/* 表头 */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableCellSku]}>SKU</Text>
            <Text style={[styles.tableCell, styles.tableCellName]}>名称</Text>
            <Text style={[styles.tableCell, styles.tableCellQty]}>数量</Text>
            <Text style={[styles.tableCell, styles.tableCellLocation]}>目标库位</Text>
          </View>
          {/* 数据行 */}
          {displayTasks.map((task, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellSku]}>{task.skuCode}</Text>
              <Text style={[styles.tableCell, styles.tableCellName]}>
                {(task.skuName || '-').substring(0, 10)}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellQty]}>{task.quantity}</Text>
              <Text style={[styles.tableCell, styles.tableCellLocation]}>
                {task.targetLocation || '-'}
              </Text>
            </View>
          ))}
          {hasMore && (
            <Text style={styles.moreText}>... 共 {tasks.length} 条</Text>
          )}
        </View>
      </Page>
    </Document>
  )
}
