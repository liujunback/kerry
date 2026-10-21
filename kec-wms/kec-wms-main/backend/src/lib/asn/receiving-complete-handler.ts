import { requireAuth } from '@/lib/auth/middleware'
import { ASN_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { resolveAsnStatusAfterReceivingComplete } from '@/lib/asn/receiving-completion-status'
import { operationLogService } from '@/lib/services/operation-log-service'
import { NextRequest, NextResponse } from 'next/server'

export interface AsnReceivingRouteParams {
  params: Promise<{ id: string }>
}

export async function postAsnReceivingComplete(
  request: NextRequest,
  { params }: AsnReceivingRouteParams
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) {
      return authResult
    }
    const { user } = authResult

    const { id: asnId } = await params
    const body = await request.json()
    const { notes } = body || {}

    const asn = await prisma.asn.findFirst({
      where: {
        id: asnId,
        tenantId: user.tenantId,
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

    const allowedStatuses = ['RECEIVING']
    if (!allowedStatuses.includes(asn.status)) {
      return NextResponse.json(
        {
          success: false,
          message: 'ASN状态不允许完成收货',
          code: 'INVALID_ASN_STATUS',
        },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const shortageLines = asn.asnLines.filter(
        (line) => line.receivedQty < line.expectedQty
      )

      await tx.asnLine.updateMany({
        where: {
          asnId,
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

      const updatedAsn = await tx.asn.update({
        where: { id: asnId },
        data: {
          status: statusAfterReceiving,
          receivingEndAt: now,
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
        shortageCount: shortageLines.length,
        statusAfterReceiving,
      }
    })

    await operationLogService.logOperation({
      tenantId: user.tenantId,
      entityType: 'ASN',
      entityId: asnId,
      entityNumber: asn.asnNumber,
      operationType: ASN_OPERATION_TYPES.COMPLETE_RECEIVE.type,
      operationName: ASN_OPERATION_TYPES.COMPLETE_RECEIVE.name,
      beforeStatus: asn.status,
      afterStatus: 'RECEIVED',
      operatorId: user.id,
      operatorName: user.username || undefined,
      metadata: { shortageCount: result.shortageCount },
    })

    if (result.statusAfterReceiving === 'PUTTING_AWAY' || result.statusAfterReceiving === 'COMPLETED') {
      await operationLogService.logOperation({
        tenantId: user.tenantId,
        entityType: 'ASN',
        entityId: asnId,
        entityNumber: asn.asnNumber,
        operationType: ASN_OPERATION_TYPES.START_PUTAWAY.type,
        operationName: ASN_OPERATION_TYPES.START_PUTAWAY.name,
        beforeStatus: 'RECEIVED',
        afterStatus: 'PUTTING_AWAY',
        operatorId: user.id,
        operatorName: user.username || undefined,
      })
    }

    if (result.statusAfterReceiving === 'COMPLETED') {
      await operationLogService.logOperation({
        tenantId: user.tenantId,
        entityType: 'ASN',
        entityId: asnId,
        entityNumber: asn.asnNumber,
        operationType: ASN_OPERATION_TYPES.COMPLETE_PUTAWAY.type,
        operationName: ASN_OPERATION_TYPES.COMPLETE_PUTAWAY.name,
        beforeStatus: 'PUTTING_AWAY',
        afterStatus: 'COMPLETED',
        operatorId: user.id,
        operatorName: user.username || undefined,
      })
    }

    return NextResponse.json({
      success: true,
      message: '收货完成',
      data: result,
    })
  } catch (error) {
    console.error('Complete receiving error:', error)
    return NextResponse.json(
      { success: false, message: '完成收货失败' },
      { status: 500 }
    )
  }
}
