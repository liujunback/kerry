import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'
import { formatDateTime } from '@/lib/utils/date-formatter'

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
    padding: '12mm',
    fontFamily: 'NotoSansSC',
    fontSize: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottom: '2px solid #111',
    paddingBottom: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    width: '38mm',
  },
  barcodeBox: {
    flex: 1,
    alignItems: 'center',
  },
  barcode: {
    width: '80mm',
    height: 28,
  },
  barcodeText: {
    marginTop: 2,
    fontSize: 9,
  },
  info: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottom: '1px dashed #999',
    paddingBottom: 8,
    marginBottom: 10,
  },
  infoItem: {
    width: '33%',
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '22mm',
    color: '#666',
  },
  value: {
    flex: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: '#111',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    minHeight: 24,
    alignItems: 'center',
  },
  head: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  cell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  skuCell: {
    width: '30%',
  },
  locationCell: {
    width: '24%',
  },
  batchCell: {
    width: '22%',
  },
  qtyCell: {
    width: '12%',
    textAlign: 'right',
  },
  signBox: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})

interface SupplementPickOrderPdfProps {
  supplementPickNo: string
  orderNumber: string
  warehouseName: string
  allocationMethod: string
  totalSupplementQty: number
  createdAt: string | Date
  barcodeImage: string
  lines: Array<{
    skuCode: string
    sourceLocationCode: string
    batchNumber: string
    supplementQty: number
  }>
}

export function SupplementPickOrderPdf({
  supplementPickNo,
  orderNumber,
  warehouseName,
  allocationMethod,
  totalSupplementQty,
  createdAt,
  barcodeImage,
  lines,
}: SupplementPickOrderPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>补拣单</Text>
          <View style={styles.barcodeBox}>
            <Image style={styles.barcode} src={barcodeImage} />
            <Text style={styles.barcodeText}>{supplementPickNo}</Text>
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.infoItem}>
            <Text style={styles.label}>补拣单号</Text>
            <Text style={styles.value}>{supplementPickNo}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>订单号</Text>
            <Text style={styles.value}>{orderNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>仓库</Text>
            <Text style={styles.value}>{warehouseName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>分配方式</Text>
            <Text style={styles.value}>{allocationMethod}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>补拣数量</Text>
            <Text style={styles.value}>{totalSupplementQty}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.label}>生成时间</Text>
            <Text style={styles.value}>{formatDateTime(createdAt)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.head]}>
            <Text style={[styles.cell, styles.skuCell]}>SKU</Text>
            <Text style={[styles.cell, styles.locationCell]}>来源库位</Text>
            <Text style={[styles.cell, styles.batchCell]}>批次</Text>
            <Text style={[styles.cell, styles.qtyCell]}>数量</Text>
            <Text style={[styles.cell, styles.qtyCell]}>实拣</Text>
          </View>
          {lines.map((line, index) => (
            <View key={`${line.skuCode}-${index}`} style={styles.row}>
              <Text style={[styles.cell, styles.skuCell]}>{line.skuCode}</Text>
              <Text style={[styles.cell, styles.locationCell]}>{line.sourceLocationCode}</Text>
              <Text style={[styles.cell, styles.batchCell]}>{line.batchNumber || '-'}</Text>
              <Text style={[styles.cell, styles.qtyCell]}>{line.supplementQty}</Text>
              <Text style={[styles.cell, styles.qtyCell]} />
            </View>
          ))}
        </View>

        <View style={styles.signBox}>
          <Text>拣货员：____________</Text>
          <Text>复核：____________</Text>
          <Text>时间：____________</Text>
        </View>
      </Page>
    </Document>
  )
}
