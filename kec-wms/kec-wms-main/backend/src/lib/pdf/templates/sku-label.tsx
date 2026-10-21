import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'

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
    width: '60mm',
    height: '40mm',
    padding: '2mm',
    fontFamily: 'NotoSansSC',
    fontSize: 8,
  },
  container: {
    width: '100%',
    height: '100%',
    border: '1px solid #000',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '1mm 2mm',
    borderBottom: '1px solid #000',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skuCode: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  clientName: {
    fontSize: 7,
    color: '#666',
  },
  barcodeSection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1mm',
  },
  barcode: {
    maxWidth: '100%',
    height: 'auto',
  },
  skuName: {
    padding: '1mm 2mm',
    fontSize: 8,
    textAlign: 'center',
    borderTop: '1px solid #e0e0e0',
  },
  footer: {
    borderTop: '1px solid #000',
    padding: '1mm 2mm',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
  },
  specs: {
    color: '#666',
  },
  weight: {
    color: '#666',
  },
})

export interface SkuLabelData {
  skuCode: string
  skuName: string
  clientName?: string
  lengthCm?: number | null
  widthCm?: number | null
  heightCm?: number | null
  weightKg?: number | null
  barcodeImage: string
}

export function SkuLabelPdf({
  skuCode,
  skuName,
  clientName,
  lengthCm,
  widthCm,
  heightCm,
  weightKg,
  barcodeImage,
}: SkuLabelData) {
  // 格式化规格信息
  const specsText =
    lengthCm && widthCm && heightCm
      ? `${lengthCm}×${widthCm}×${heightCm}cm`
      : ''

  const weightText = weightKg ? `${weightKg}kg` : ''

  return (
    <Document>
      <Page size={{ width: '60mm', height: '40mm' }} style={styles.page}>
        <View style={styles.container}>
          {/* 顶部：SKU 编码 + 客户名称 */}
          <View style={styles.header}>
            <Text style={styles.skuCode}>{skuCode}</Text>
            {clientName && (
              <Text style={styles.clientName}>{clientName}</Text>
            )}
          </View>

          {/* 中间：条码 */}
          <View style={styles.barcodeSection}>
            <Image src={barcodeImage} style={styles.barcode} />
          </View>

          {/* SKU 名称 */}
          <Text style={styles.skuName}>{skuName}</Text>

          {/* 底部：规格信息 */}
          {(specsText || weightText) && (
            <View style={styles.footer}>
              {specsText && <Text style={styles.specs}>{specsText}</Text>}
              {weightText && <Text style={styles.weight}>{weightText}</Text>}
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}
