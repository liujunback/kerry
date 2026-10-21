import { createAuthHandler } from '@/lib/api/create-handler'
import { ASN_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { operationLogService } from '@/lib/services/operation-log-service'
import { forceCompletePutawaySchema } from '@/lib/validations/asn'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/asn/[id]/force-complete-putaway - 强制完成上架
export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id: asnId } = await params
    const body = await request.json()
    const parseResult = forceCompletePutawaySchema.safeParse(body || {})

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    const { reason } = parseResult.data

    const asn = await prisma.asn.findFirst({
      where: {
        id: asnId,
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        asnNumber: true,
        status: true,
        putawayStartAt: true,
      },
    })

    if (!asn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (asn.status !== 'PUTTING_AWAY') {
      return NextResponse.json(
        {
          success: false,
          message: `ASN状态为${asn.status}，不允许强制完成上架`,
          code: 'INVALID_ASN_STATUS',
        },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const now = new Date()

      const updatedLines = await tx.putawayOrderLine.updateMany({
        where: {
          asnId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        data: {
          status: 'COMPLETED',
          remainingQty: 0,
          completedAt: now,
          updatedBy: auth.user.id,
        },
      })

      const updatedOrders = await tx.putawayOrder.updateMany({
        where: {
          asnId,
          status: { in: ['PENDING', 'PARTIAL'] },
        },
        data: {
          status: 'COMPLETED',
          pendingQty: 0,
          putawayEndTime: now,
          updatedBy: auth.user.id,
        },
      })

      const updatedAsnLines = await tx.asnLine.updateMany({
        where: {
          asnId,
          status: { in: ['RECEIVED', 'PUTAWAY', 'PARTIAL_PUTAWAY'] },
        },
        data: {
          status: 'COMPLETED',
          updatedBy: auth.user.id,
        },
      })

      const updatedAsn = await tx.asn.update({
        where: { id: asnId },
        data: {
          status: 'COMPLETED',
          putawayStartAt: asn.putawayStartAt ? undefined : now,
          putawayEndAt: now,
          completedAt: now,
          updatedBy: auth.user.id,
        },
        select: {
          id: true,
          asnNumber: true,
          status: true,
          totalReceivedQty: true,
          totalPutawayQty: true,
          putawayEndAt: true,
          completedAt: true,
        },
      })

      return {
        asn: updatedAsn,
        updatedLineCount: updatedLines.count,
        updatedOrderCount: updatedOrders.count,
        updatedAsnLineCount: updatedAsnLines.count,
      }
    })

    await operationLogService.logOperation({
      tenantId: auth.user.tenantId,
      entityType: 'ASN',
      entityId: asnId,
      entityNumber: asn.asnNumber,
      operationType: ASN_OPERATION_TYPES.FORCE_COMPLETE_PUTAWAY.type,
      operationName: ASN_OPERATION_TYPES.FORCE_COMPLETE_PUTAWAY.name,
      beforeStatus: asn.status,
      afterStatus: 'COMPLETED',
      remark: reason,
      operatorId: auth.user.id,
      operatorName: auth.user.name || undefined,
      metadata: {
        updatedLineCount: result.updatedLineCount,
        updatedOrderCount: result.updatedOrderCount,
        updatedAsnLineCount: result.updatedAsnLineCount,
      },
    })

    return NextResponse.json({
      success: true,
      message: '强制完成上架成功',
      data: result,
    })
  } catch (error) {
    console.error('Force complete putaway error:', error)
    return NextResponse.json(
      { success: false, message: '强制完成上架失败' },
      { status: 500 }
    )
  }
})
