import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveAsnStatusAfterReceivingComplete } from '@/lib/asn/receiving-completion-status'
import { ASN_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { operationLogService } from '@/lib/services/operation-log-service'
import { NextRequest,NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/asn/[id]/force-complete-receiving - 强制完成收货
export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id: asnId } = await params
    const body = await request.json()
    const { notes } = body || {}

    // 验证 ASN 存在且属于当前租户
    const asn = await prisma.asn.findFirst({
      where: {
        id: asnId,
        tenantId: auth.user.tenantId,
      },
      include: {
        asnLines: true,
      },
    })

    if (!asn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 强制完成收货允许的状态：CREATED, PENDING_RECEIVING, RECEIVING, RECEIVED
    const allowedStatuses = ['CREATED', 'PENDING_RECEIVING', 'RECEIVING', 'RECEIVED']
    if (!allowedStatuses.includes(asn.status)) {
      return NextResponse.json(
        { success: false, message: `ASN状态为${asn.status}，不允许强制完成收货`, code: 'INVALID_ASN_STATUS' },
        { status: 400 }
      )
    }

    const beforeStatus = asn.status

    // 使用事务更新数据
    const result = await prisma.$transaction(async (tx) => {
      // 更新所有未完成的行项目状态
      await tx.asnLine.updateMany({
        where: {
          asnId: asnId,
          status: { in: ['PENDING', 'RECEIVING'] },
        },
        data: {
          status: 'RECEIVED',
        },
      })

      const statusAfterReceiving = await resolveAsnStatusAfterReceivingComplete(tx, asnId)
      const now = new Date()
      const startsPutaway = statusAfterReceiving !== 'RECEIVED'
      const completesPutaway = statusAfterReceiving === 'COMPLETED'

      // 更新 ASN 状态
      const updatedAsn = await tx.asn.update({
        where: { id: asnId },
        data: {
          status: statusAfterReceiving,
          receivingEndAt: asn.receivingEndAt ? undefined : now,
          receivingStartAt: asn.receivingStartAt ? undefined : now,
          putawayStartAt: startsPutaway && !asn.putawayStartAt ? now : undefined,
          putawayEndAt: completesPutaway ? now : undefined,
          completedAt: completesPutaway ? now : undefined,
          notes: notes || asn.notes,
        },
        include: {
          asnLines: {
            select: {
              id: true,
              lineNumber: true,
              skuCode: true,
              skuName: true,
              expectedQty: true,
              receivedQty: true,
              status: true,
            },
          },
        },
      })

      return {
        asn: updatedAsn,
        statusAfterReceiving,
      }
    })

    // 记录操作日志
    await operationLogService.logOperation({
      tenantId: auth.user.tenantId,
      entityType: 'ASN',
      entityId: asnId,
      entityNumber: asn.asnNumber,
      operationType: ASN_OPERATION_TYPES.FORCE_COMPLETE_RECEIVE.type,
      operationName: ASN_OPERATION_TYPES.FORCE_COMPLETE_RECEIVE.name,
      beforeStatus,
      afterStatus: 'RECEIVED',
      remark: notes,
      operatorId: auth.user.id,
      operatorName: auth.user.name || undefined,
    })

    if (result.statusAfterReceiving === 'PUTTING_AWAY' || result.statusAfterReceiving === 'COMPLETED') {
      await operationLogService.logOperation({
        tenantId: auth.user.tenantId,
        entityType: 'ASN',
        entityId: asnId,
        entityNumber: asn.asnNumber,
        operationType: ASN_OPERATION_TYPES.START_PUTAWAY.type,
        operationName: ASN_OPERATION_TYPES.START_PUTAWAY.name,
        beforeStatus: 'RECEIVED',
        afterStatus: 'PUTTING_AWAY',
        remark: notes,
        operatorId: auth.user.id,
        operatorName: auth.user.name || undefined,
      })
    }

    if (result.statusAfterReceiving === 'COMPLETED') {
      await operationLogService.logOperation({
        tenantId: auth.user.tenantId,
        entityType: 'ASN',
        entityId: asnId,
        entityNumber: asn.asnNumber,
        operationType: ASN_OPERATION_TYPES.COMPLETE_PUTAWAY.type,
        operationName: ASN_OPERATION_TYPES.COMPLETE_PUTAWAY.name,
        beforeStatus: 'PUTTING_AWAY',
        afterStatus: 'COMPLETED',
        remark: notes,
        operatorId: auth.user.id,
        operatorName: auth.user.name || undefined,
      })
    }

    return NextResponse.json({
      success: true,
      message: '强制完成收货成功',
      data: result,
    })
  } catch (error) {
    console.error('Force complete receiving error:', error)
    return NextResponse.json(
      { success: false, message: '强制完成收货失败' },
      { status: 500 }
    )
  }
})
