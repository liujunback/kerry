import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// GET /api/v1/packaging-material-transactions/[id] - 获取流水详情
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const transaction = await prisma.packagingMaterialTransaction.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      include: {
        material: {
          select: {
            id: true,
            materialCode: true,
            materialName: true,
            materialType: true,
            specification: true,
            unit: true,
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: '流水记录不存在', code: 'TRANSACTION_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: transaction,
    })
  } catch (error) {
    console.error('获取流水详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取流水详情失败' },
      { status: 500 }
    )
  }
})
