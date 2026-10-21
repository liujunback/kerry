import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// GET /api/v1/asn/[id]/serial-numbers - 获取ASN的序列号列表
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    // 验证ASN存在
    const asn = await prisma.asn.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!asn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在' },
        { status: 404 }
      )
    }

    // 获取序列号列表
    const serialNumbers = await prisma.serialNumber.findMany({
      where: {
        receivedAsnId: id,
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        skuId: true,
        serialNumber: true,
        sku: {
          select: {
            skuCode: true,
            skuName: true,
            barcode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: serialNumbers.map((sn) => ({
        id: sn.id,
        skuCode: sn.sku?.skuCode || '-',
        skuName: sn.sku?.skuName || '-',
        barcode: sn.sku?.barcode || '-',
        serialNumber: sn.serialNumber,
      })),
    })
  } catch (error) {
    console.error('获取序列号列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取序列号列表失败' },
      { status: 500 }
    )
  }
})
