import { createAuthHandler } from '@/lib/api/create-handler'
import { ASN_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { operationLogService } from '@/lib/services/operation-log-service'
import { cancelAsnSchema } from '@/lib/validations/asn'
import { NextResponse } from 'next/server'

// POST /api/v1/asn/[id]/cancel - 取消ASN
export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = cancelAsnSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { reason } = validationResult.data

    // 检查ASN是否存在
    const existingAsn = await prisma.asn.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingAsn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 只有待收货状态的ASN可以取消
    if (!['CREATED', 'PENDING_RECEIVING'].includes(existingAsn.status)) {
      return NextResponse.json(
        {
          success: false,
          message: '只有已创建或待收货状态的ASN可以取消',
          code: 'ASN_STATUS_INVALID',
        },
        { status: 400 }
      )
    }

    // 更新ASN状态为取消，同时更新所有明细状态
    const asn = await prisma.$transaction(async (tx) => {
      // 更新ASN状态
      const updatedAsn = await tx.asn.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: existingAsn.notes
            ? `${existingAsn.notes}\n取消原因: ${reason}`
            : `取消原因: ${reason}`,
          updatedBy: auth.user.id,
        },
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              clientName: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              warehouseCode: true,
              warehouseName: true,
            },
          },
        },
      })

      // 更新所有明细状态为取消
      await tx.asnLine.updateMany({
        where: { asnId: id },
        data: {
          status: 'CANCELLED',
          updatedBy: auth.user.id,
        },
      })

      return updatedAsn
    })

    // 记录操作日志
    operationLogService.logOperation({
      tenantId: auth.user.tenantId,
      entityType: 'ASN',
      entityId: id,
      entityNumber: existingAsn.asnNumber,
      operationType: ASN_OPERATION_TYPES.CANCEL.type,
      operationName: ASN_OPERATION_TYPES.CANCEL.name,
      beforeStatus: existingAsn.status,
      afterStatus: 'CANCELLED',
      remark: reason,
      operatorId: auth.user.id,
      operatorName: auth.user.name || undefined,
    })

    return NextResponse.json({
      success: true,
      data: asn,
      message: 'ASN取消成功',
    })
  } catch (error) {
    console.error('取消ASN失败:', error)
    return NextResponse.json(
      { success: false, message: '取消ASN失败' },
      { status: 500 }
    )
  }
})
