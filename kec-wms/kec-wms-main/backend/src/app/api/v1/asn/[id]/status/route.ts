import { createAuthHandler } from '@/lib/api/create-handler'
import { ASN_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { operationLogService } from '@/lib/services/operation-log-service'
import { changeAsnStatusSchema } from '@/lib/validations/asn'
import { NextResponse } from 'next/server'

// PUT /api/v1/asn/[id]/status - 修改ASN状态
export const PUT = createAuthHandler(async (request, auth, context) => {
  console.log('[ASN Status API] PUT request received')
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = changeAsnStatusSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { status: newStatus, reason } = validationResult.data

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

    // 状态流转验证
    const validTransitions: Record<string, string[]> = {
      CREATED: ['PENDING_RECEIVING', 'CANCELLED'],
      PENDING_RECEIVING: ['RECEIVING', 'CANCELLED'],
      RECEIVING: ['RECEIVED', 'PENDING_RECEIVING'],
      RECEIVED: ['PUTTING_AWAY', 'COMPLETED', 'RECEIVING'],
      PUTTING_AWAY: ['COMPLETED'],
      COMPLETED: ['CLOSED'],
      CANCELLED: [],
      CLOSED: [],
    }

    const allowedStatuses = validTransitions[existingAsn.status] || []
    if (!allowedStatuses.includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `不允许从 ${existingAsn.status} 状态变更为 ${newStatus}`,
          code: 'INVALID_STATUS_TRANSITION',
        },
        { status: 400 }
      )
    }

    // 更新状态和相关时间戳
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedBy: auth.user.id,
    }

    // 根据状态设置时间戳
    const now = new Date()
    switch (newStatus) {
      case 'RECEIVING':
        if (!existingAsn.receivingStartAt) {
          updateData.receivingStartAt = now
        }
        break
      case 'RECEIVED':
        updateData.receivingEndAt = now
        break
      case 'PUTTING_AWAY':
        if (!existingAsn.putawayStartAt) {
          updateData.putawayStartAt = now
        }
        break
      case 'COMPLETED':
        updateData.putawayEndAt = now
        updateData.completedAt = now
        break
    }

    const asn = await prisma.asn.update({
      where: { id },
      data: updateData,
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

    // 记录操作日志
    const operationMap: Record<string, { type: string; name: string }> = {
      RECEIVING: ASN_OPERATION_TYPES.START_RECEIVE,
      RECEIVED: ASN_OPERATION_TYPES.COMPLETE_RECEIVE,
      PUTTING_AWAY: ASN_OPERATION_TYPES.START_PUTAWAY,
      COMPLETED: ASN_OPERATION_TYPES.COMPLETE_PUTAWAY,
      CANCELLED: ASN_OPERATION_TYPES.CANCEL,
      CLOSED: ASN_OPERATION_TYPES.CLOSE,
    }
    const operation = operationMap[newStatus]
    if (operation) {
      operationLogService.logOperation({
        tenantId: auth.user.tenantId,
        entityType: 'ASN',
        entityId: id,
        entityNumber: existingAsn.asnNumber,
        operationType: operation.type,
        operationName: operation.name,
        beforeStatus: existingAsn.status,
        afterStatus: newStatus,
        remark: reason,
        operatorId: auth.user.id,
        operatorName: auth.user.name || undefined,
      })
    }

    return NextResponse.json({
      success: true,
      data: asn,
      message: 'ASN状态更新成功',
    })
  } catch (error) {
    console.error('更新ASN状态失败:', error)
    return NextResponse.json(
      { success: false, message: '更新ASN状态失败' },
      { status: 500 }
    )
  }
})
