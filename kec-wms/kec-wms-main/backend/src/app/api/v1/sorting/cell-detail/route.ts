import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const sortingTaskId = searchParams.get('sortingTaskId')
    const cellCode = searchParams.get('cellCode')

    if (!sortingTaskId || !cellCode) {
      return NextResponse.json({ message: '参数不完整' }, { status: 400 })
    }

    const lines = await prisma.sortingTaskLine.findMany({
      where: {
        sortingTaskId,
        cellCode,
        tenantId: auth.user.tenantId,
      },
      include: {
        sku: { select: { skuName: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: lines.map((line) => ({
        id: line.id,
        skuCode: line.skuCode,
        skuName: line.sku.skuName,
        orderNumber: line.orderNumber,
        expectedQty: line.expectedQty,
        sortedQty: line.sortedQty,
        status: line.status,
      })),
    })
  } catch (error) {
    console.error('获取格口明细失败:', error)
    return NextResponse.json({ message: '获取格口明细失败' }, { status: 500 })
  }
})
