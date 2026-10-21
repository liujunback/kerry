import React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'

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
    width: '90mm',
    height: '130mm',
    padding: '5mm',
    fontFamily: 'NotoSansSC',
    backgroundColor: '#ffffff',
  },
  card: {
    height: '100%',
    border: '1px solid #111111',
    borderRadius: 8,
    padding: '5mm',
    alignItems: 'center',
  },
  brand: {
    fontSize: 10,
    color: '#f97316',
    marginBottom: '2mm',
  },
  title: {
    fontSize: 15,
    marginBottom: '2mm',
  },
  subtitle: {
    fontSize: 8,
    color: '#666666',
    marginBottom: '4mm',
  },
  userBlock: {
    alignItems: 'center',
    marginBottom: '3mm',
  },
  label: {
    fontSize: 8,
    color: '#666666',
  },
  userName: {
    fontSize: 11,
    marginTop: '1mm',
  },
  qrcodeBox: {
    width: '54mm',
    height: '54mm',
    border: '1px solid #dddddd',
    padding: '2mm',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '3mm',
  },
  qrcode: {
    width: '50mm',
    height: '50mm',
  },
  expiry: {
    fontSize: 8,
    color: '#333333',
    marginBottom: '2mm',
  },
  hint: {
    width: '64mm',
    fontSize: 7,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 1.3,
  },
})

export interface PdaLoginQrcodePdfData {
  fullName: string
  username: string
  expiresAtText: string
  qrCodeImage: string
}

export function PdaLoginQrcodePdf({
  fullName,
  username,
  expiresAtText,
  qrCodeImage,
}: PdaLoginQrcodePdfData) {
  return (
    <Document>
      <Page size={{ width: '90mm', height: '130mm' }} style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.brand}>KEC WMS</Text>
          <Text style={styles.title}>PDA 快捷登录二维码</Text>
          <Text style={styles.subtitle}>使用 PDA 扫描此二维码可自动登录</Text>

          <View style={styles.userBlock}>
            <Text style={styles.label}>登录用户</Text>
            <Text style={styles.userName}>{fullName} ({username})</Text>
          </View>

          <View style={styles.qrcodeBox}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={qrCodeImage} style={styles.qrcode} />
          </View>

          <Text style={styles.expiry}>过期时间：{expiresAtText}</Text>
          <Text style={styles.hint}>
            请妥善保管此二维码。二维码过期后需在用户管理页重新生成。
          </Text>
        </View>
      </Page>
    </Document>
  )
}
