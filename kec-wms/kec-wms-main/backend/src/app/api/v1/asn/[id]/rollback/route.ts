import { createAuthHandler } from '@/lib/api/create-handler'
import { ASN_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { operationLogService } from '@/lib/services/operation-log-service'
import { rollbackAsnSchema } from '@/lib/validations/asn'
import { NextResponse } from 'next/server'

// POST /api/v1/asn/[id]/rollback - 回滚ASN
export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = rollbackAsnSchema.safeParse(body)

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

    // 检查是否可以回滚
    // 可回滚状态：收货中、收货完成（当上架数量 = 0）
    const canRollback =
      existingAsn.status === 'RECEIVING' ||
      (existingAsn.status === 'RECEIVED' && existingAsn.totalPutawayQty === 0)

    if (!canRollback) {
      return NextResponse.json(
        {
          success: false,
          message: '当前状态不允许回滚，或已有上架数量',
          code: 'ASN_CANNOT_ROLLBACK',
        },
        { status: 400 }
      )
    }

    // 确定回滚目标状态
    let targetStatus: string
    if (existingAsn.status === 'RECEIVING') {
      targetStatus = 'PENDING_RECEIVING'
    } else {
      targetStatus = 'RECEIVING'
    }

    // 执行回滚
    const asn = await prisma.$transaction(async (tx) => {
      // 如果回滚到待收货状态，需要清零收货数量
      if (targetStatus === 'PENDING_RECEIVING') {
        // 更新所有明细的收货数量为0
        await tx.asnLine.updateMany({
          where: { asnId: id },
          data: {
              receivedQty: 0,
              status: 'PENDING',
              updatedBy: auth.user.id,
            },
        })

        // 更新ASN
        return await tx.asn.update({
          where: { id },
          data: {
            status: targetStatus,
            totalReceivedQty: 0,
            totalReceivedLines: 0,
            receivingStartAt: null,
            receivingEndAt: null,
            notes: existingAsn.notes
              ? `${existingAsn.notes}\n回滚原因: ${reason}`
              : `回滚原因: ${reason}`,
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
      } else {
        // 回滚到收货中状态
        return await tx.asn.update({
          where: { id },
          data: {
            status: targetStatus,
            receivingEndAt: null,
            notes: existingAsn.notes
              ? `${existingAsn.notes}\n回滚原因: ${reason}`
              : `回滚原因: ${reason}`,
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
      }
    })

    // 记录操作日志
    operationLogService.logOperation({
      tenantId: auth.user.tenantId,
      entityType: 'ASN',
      entityId: id,
      entityNumber: existingAsn.asnNumber,
      operationType: ASN_OPERATION_TYPES.ROLLBACK.type,
      operationName: ASN_OPERATION_TYPES.ROLLBACK.name,
      beforeStatus: existingAsn.status,
      afterStatus: targetStatus,
      remark: reason,
      operatorId: auth.user.id,
      operatorName: auth.user.name || undefined,
    })

    return NextResponse.json({
      success: true,
      data: asn,
      message: 'ASN回滚成功',
    })
  } catch (error) {
    console.error('回滚ASN失败:', error)
    return NextResponse.json(
      { success: false, message: '回滚ASN失败' },
      { status: 500 }
    )
  }
})
