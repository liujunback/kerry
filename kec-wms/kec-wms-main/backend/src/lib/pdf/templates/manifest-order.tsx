import React from 'react'
import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'
import { formatDateTime } from '@/lib/utils/date-formatter'

// 注册中文字体
try {
  const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansSC-Regular.otf')
  if (fs.existsSync(fontPath)) {
    Font.register({
      family: 'NotoSansSC',
      src: fontPath,
      fontStyle: 'normal',
      fontWeight: 'normal',
    })
  } else {
    console.warn('Font file not found:', fontPath)
  }
} catch (error) {
  console.error('Failed to register font:', error)
}

const styles = StyleSheet.create({
  page: {
    padding: '15mm',
    fontFamily: 'NotoSansSC',
    fontSize: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottom: '1px solid #000',
    paddingBottom: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    width: '50%',
    marginBottom: 6,
  },
  infoLabel: {
    width: '80px',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontWeight: 'bold',
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    padding: 6,
    fontWeight: 'bold',
    borderBottom: '1px solid #000',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottom: '0.5px solid #ddd',
  },
  col1: { width: '10%' },
  col2: { width: '30%' },
  col3: { width: '20%' },
  col4: { width: '20%' },
  col5: { width: '20%' },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    right: 15,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
  },
})

interface CheckoutOrder {
  checkoutNumber: string
  checkoutType: string
  orderCount: number
  parcelCount: number
}

interface ManifestOrderData {
  manifestNumber: string
  status: string
  warehouseName: string | null
  channelName: string | null
  clientName: string | null
  orderCount: number
  parcelCount: number
  containerCount: number
  totalWeightKg: string | null
  createdAt: Date
  completedAt: Date | null
  checkoutOrders: CheckoutOrder[]
}

interface ManifestOrderPdfProps {
  data: ManifestOrderData
}

export const ManifestOrderPdf: React.FC<ManifestOrderPdfProps> = ({ data }) => {
  const statusMap: Record<string, string> = {
    CREATED: '待完结',
    IN_PROGRESS: '进行中',
    COMPLETED: '已完结',
    CANCELLED: '已取消',
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>出库总单</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本信息</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>总单号:</Text>
              <Text style={styles.infoValue}>{data.manifestNumber}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>状态:</Text>
              <Text style={styles.infoValue}>{statusMap[data.status] || data.status}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>仓库:</Text>
              <Text style={styles.infoValue}>{data.warehouseName || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>渠道:</Text>
              <Text style={styles.infoValue}>{data.channelName || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>客户:</Text>
              <Text style={styles.infoValue}>{data.clientName || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>订单数量:</Text>
              <Text style={styles.infoValue}>{data.orderCount}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>包裹数量:</Text>
              <Text style={styles.infoValue}>{data.parcelCount}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>板/袋数量:</Text>
              <Text style={styles.infoValue}>{data.containerCount}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>总重量:</Text>
              <Text style={styles.infoValue}>{data.totalWeightKg ? `${data.totalWeightKg} kg` : '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>创建时间:</Text>
              <Text style={styles.infoValue}>{formatDateTime(data.createdAt)}</Text>
            </View>
            {data.completedAt && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>完结时间:</Text>
                <Text style={styles.infoValue}>{formatDateTime(data.completedAt)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>签出单列表</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>序号</Text>
              <Text style={styles.col2}>签出单号</Text>
              <Text style={styles.col3}>类型</Text>
              <Text style={styles.col4}>订单数</Text>
              <Text style={styles.col5}>包裹数</Text>
            </View>
            {data.checkoutOrders.map((checkout, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>{index + 1}</Text>
                <Text style={styles.col2}>{checkout.checkoutNumber}</Text>
                <Text style={styles.col3}>{checkout.checkoutType}</Text>
                <Text style={styles.col4}>{checkout.orderCount}</Text>
                <Text style={styles.col5}>{checkout.parcelCount}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          打印时间: {formatDateTime(new Date())}
        </Text>
      </Page>
    </Document>
  )
}
