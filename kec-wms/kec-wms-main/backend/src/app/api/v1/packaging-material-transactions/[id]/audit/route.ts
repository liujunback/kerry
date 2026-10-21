import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { auditTransactionSchema } from '@/lib/validations/packaging-material-transaction'
import { NextResponse } from 'next/server'

// PUT /api/v1/packaging-material-transactions/[id]/audit - 审计流水
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = auditTransactionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const existingTransaction = await prisma.packagingMaterialTransaction.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { success: false, message: '流水记录不存在', code: 'TRANSACTION_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (existingTransaction.auditStatus !== 'UNAUDITED' && existingTransaction.auditStatus !== 'AUDITING') {
      return NextResponse.json(
        { success: false, message: '该流水已审核完成，无法再次审核', code: 'ALREADY_AUDITED' },
        { status: 400 }
      )
    }

    const { auditStatus, notes } = validationResult.data

    const transaction = await prisma.packagingMaterialTransaction.update({
      where: { id },
      data: {
        auditStatus,
        auditedAt: new Date(),
        auditedBy: auth.user.id,
        notes: notes || existingTransaction.notes,
      },
      select: {
        id: true,
        materialCode: true,
        materialName: true,
        transactionType: true,
        quantityChange: true,
        auditStatus: true,
        auditedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: transaction,
      message: auditStatus === 'APPROVED' ? '审核通过' : '审核拒绝',
    })
  } catch (error) {
    console.error('审计流水失败:', error)
    return NextResponse.json(
      { success: false, message: '审计流水失败' },
      { status: 500 }
    )
  }
})
