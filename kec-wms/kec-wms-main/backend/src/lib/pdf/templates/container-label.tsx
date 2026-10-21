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
  title: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  typeBadge: {
    fontSize: 7,
    padding: '1mm 2mm',
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
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
  footer: {
    borderTop: '1px solid #000',
    padding: '1mm 2mm',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
  },
  footerItem: {
    flexDirection: 'row',
  },
  footerLabel: {
    color: '#666',
  },
  footerValue: {
    fontWeight: 'bold',
  },
})

export interface ContainerLabelData {
  containerCode: string
  containerType: string
  containerTypeLabel: string
  warehouseName: string
  weightCapacityKg?: number | null
  barcodeImage: string
}

export function ContainerLabelPdf({
  containerCode,
  containerTypeLabel,
  warehouseName,
  weightCapacityKg,
  barcodeImage,
}: ContainerLabelData) {
  return (
    <Document>
      <Page size={{ width: '60mm', height: '40mm' }} style={styles.page}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{containerCode}</Text>
            <Text style={styles.typeBadge}>{containerTypeLabel}</Text>
          </View>

          <View style={styles.barcodeSection}>
            <Image src={barcodeImage} style={styles.barcode} />
          </View>

          <View style={styles.footer}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>仓库: </Text>
              <Text style={styles.footerValue}>{warehouseName}</Text>
            </View>
            {weightCapacityKg && (
              <View style={styles.footerItem}>
                <Text style={styles.footerLabel}>承重: </Text>
                <Text style={styles.footerValue}>{weightCapacityKg}kg</Text>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}
