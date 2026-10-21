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
    width: '100mm',
    height: '150mm',
    padding: '3mm',
    fontFamily: 'NotoSansSC',
    fontSize: 9,
  },
  container: {
    width: '100%',
    height: '100%',
    border: '1px solid #000',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '2mm',
    borderBottom: '1px solid #000',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    padding: '2mm',
    borderBottom: '1px solid #000',
  },
  sectionTitle: {
    fontSize: 8,
    color: '#666',
    marginBottom: 1,
  },
  sectionValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recipientName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  recipientPhone: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  recipientAddress: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 1.4,
  },
  barcodeSection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2mm',
  },
  barcode: {
    maxWidth: '100%',
    height: 'auto',
  },
  printTime: {
    borderTop: '1px solid #000',
    padding: '1mm',
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
  infoLabel: {
    color: '#666',
    fontSize: 8,
  },
  infoValue: {
    fontWeight: 'bold',
    fontSize: 10,
  },
})

export interface ShipmentLabelData {
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
  barcodeImage: string
  printTime: string
}

export function ShipmentLabelPdf({
  shipmentNumber,
  orderNumber,
  referenceNumber,
  recipientName,
  recipientPhone,
  recipientAddress,
  recipientPostalCode,
  warehouseName,
  weight,
  packageCount,
  barcodeImage,
  printTime,
}: ShipmentLabelData) {
  return (
    <Document>
      <Page size={{ width: '100mm', height: '150mm' }} style={styles.page}>
        <View style={styles.container}>
          <Text style={styles.header}>发货单</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>发货单号</Text>
            <Text style={styles.sectionValue}>{shipmentNumber}</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.infoRow}>
              <View>
                <Text style={styles.sectionTitle}>订单号</Text>
                <Text style={styles.sectionValue}>{orderNumber}</Text>
              </View>
              {referenceNumber && (
                <View>
                  <Text style={styles.sectionTitle}>参考号</Text>
                  <Text style={styles.sectionValue}>{referenceNumber}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>收货人</Text>
            <Text style={styles.recipientName}>{recipientName}</Text>
            <Text style={styles.recipientPhone}>{recipientPhone}</Text>
            <Text style={styles.recipientAddress}>{recipientAddress}</Text>
            {recipientPostalCode && (
              <Text style={{ fontSize: 10 }}>{recipientPostalCode}</Text>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>重量: </Text>
                <Text style={styles.infoValue}>{weight} kg</Text>
              </View>
              <View>
                <Text style={styles.infoLabel}>件数: </Text>
                <Text style={styles.infoValue}>{packageCount}</Text>
              </View>
            </View>
            <View style={{ marginTop: 1 }}>
              <Text style={styles.infoLabel}>发货仓: </Text>
              <Text style={{ fontSize: 9 }}>{warehouseName}</Text>
            </View>
          </View>

          <View style={styles.barcodeSection}>
            <Image src={barcodeImage} style={styles.barcode} />
          </View>

          <Text style={styles.printTime}>
            打印时间: {formatDateTime(printTime)}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
