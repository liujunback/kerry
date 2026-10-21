'use server'

import { createAuthHandler } from '@/lib/api/create-handler'
import { generateManifestOrderPdf } from '@/lib/services/pdf/manifest-order'
import { prisma } from '@/lib/db/prisma'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import * as fs from 'fs'
import { NextRequest,NextResponse } from 'next/server'
import * as path from 'path'

export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const tenantId = auth.user.tenantId
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const manifest = await prisma.manifestOrder.findFirst({
      where: {
        id,
        tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      select: { id: true },
    })

    if (!manifest) {
      return NextResponse.json(
        { success: false, error: 'Manifest order not found' },
        { status: 404 }
      )
    }

    const { buffer, filename } = await generateManifestOrderPdf(tenantId, id)

    // 保存PDF到public目录
    const publicDir = path.join(process.cwd(), 'public', 'temp', 'pdfs')

    // 确保目录存在
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    // 使用时间戳和随机字符串生成唯一文件名，避免中文字符
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const safeFilename = `manifest-${timestamp}-${randomStr}.pdf`
    const filePath = path.join(publicDir, safeFilename)

    // 写入文件
    await fs.promises.writeFile(filePath, buffer)

    // 返回URL
    const fileUrl = `/temp/pdfs/${safeFilename}`

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        filename: filename,
      },
    })
  } catch (error) {
    console.error('Failed to print manifest order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to print manifest order' },
      { status: 500 }
    )
  }
})
