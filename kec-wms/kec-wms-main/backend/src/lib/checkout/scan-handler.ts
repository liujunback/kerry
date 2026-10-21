import { requireAuth } from '@/lib/auth/middleware'
import { ORDER_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import {
  blockOrderInterceptionAtCheckout,
  isCheckoutInterceptionAllowedStatus,
} from '@/lib/services/order-interception-service'
import { extractInventoryCountLockMessage } from '@/lib/services/inventory-count-lock-guard'
import { LockAcquisitionError } from '@/lib/services/inventory-lock-service'
import { operationLogService } from '@/lib/services/operation-log-service'
import { executeCheckout } from '@/lib/services/checkout-service'
import { getTranslations } from 'next-intl/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const scanSchema = z.object({
  checkoutOrderId: z.string().uuid('签出单ID无效'),
  scannedNumber: z.string().min(1, '单号不能为空'),
  checkoutType: z.enum(['PALLET', 'BAG']),
  currentChannelCode: z.string().nullable().optional(),
})

export async function postCheckoutScan(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const { user } = authResult
  const t = await getTranslations('checkout.messages')

  try {
    const body = await request.json()
    const result = scanSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { checkoutOrderId, scannedNumber } = result.data
    const tenantId = user.tenantId

    const transactionResult = await prisma.$transaction(
      async (tx) => {
        let order = await tx.outboundOrder.findFirst({
          where: {
            tenantId,
            OR: [{ orderNumber: scannedNumber }, { trackingNumber: scannedNumber }],
          },
          include: {
            shipments: true,
            extension: true,
          },
        })

        if (!order) {
          const shipment = await tx.shipment.findFirst({
            where: { tenantId, trackingNumber: scannedNumber },
            include: {
              order: {
                include: { shipments: true, extension: true },
              },
            },
          })
          if (shipment) order = shipment.order
        }

        if (!order) throw new Error(t('orderNotFound'))

        if (!isCheckoutInterceptionAllowedStatus(order.status)) {
          throw new Error(t('orderInvalidStatus', { status: order.status }))
        }

        const blockedAt = new Date()
        const interceptionCase = await blockOrderInterceptionAtCheckout(tx, {
          tenantId,
          orderId: order.id,
          blockedAt,
        })

        if (interceptionCase) {
          return {
            blocked: true as const,
            order: {
              id: order.id,
              orderNumber: order.orderNumber,
              status: order.status,
            },
            interceptionCase,
          }
        }

        const channel = order.extension?.channel || order.shippingMethod || 'default'
        const channelName = channel
        const channelCode = channel

        const container = await tx.$queryRaw<
          Array<{
            id: string
            status: string
            checkoutNumber: string
            channelName: string | null
            channelCode: string | null
            orderCount: number
            parcelCount: number
          }>
        >`
          SELECT id, status, checkout_number as checkoutNumber, channel_name as channelName,
                 channel_code as channelCode, order_count as orderCount, parcel_count as parcelCount
          FROM checkout_order
          WHERE id = ${checkoutOrderId}
          FOR UPDATE
        `

        if (!container || container.length === 0) {
          throw new Error('签出单不存在')
        }
        const checkoutOrder = container[0]

        if (checkoutOrder.status !== 'PENDING') {
          throw new Error(t('checkoutOrderFinished'))
        }

        const existingRecords = await tx.checkoutRecord.findMany({
          where: { checkoutOrderId },
        })

        const existingRecord = existingRecords.find(
          (item) =>
            item.scannedNumber === scannedNumber || item.orderNumber === order!.orderNumber
        )
        if (existingRecord) throw new Error(t('orderAlreadyScanned'))

        const existingCheckoutRecord = await tx.checkoutRecord.findFirst({
          where: {
            tenantId,
            orderId: order.id,
            checkoutOrderId: { not: checkoutOrderId },
          },
          include: { checkoutOrder: { select: { checkoutNumber: true } } },
        })
        if (existingCheckoutRecord) {
          throw new Error(
            t('orderAlreadyBound', {
              checkoutNumber: existingCheckoutRecord.checkoutOrder.checkoutNumber,
            })
          )
        }

        if (checkoutOrder.channelCode && checkoutOrder.channelCode !== channelCode) {
          throw new Error(
            t('channelMismatch', {
              channel: checkoutOrder.channelName || '未知',
            })
          )
        }

        const sameOrderRecord = existingRecords.find((item) => item.orderId === order!.id)
        const isNewOrder = !sameOrderRecord
        const sequenceNumber = existingRecords.length + 1
        const shipment = order.shipments[0]

        const createdRecord = await tx.checkoutRecord.create({
          data: {
            tenantId,
            checkoutOrderId,
            sequenceNumber,
            scannedNumber,
            numberType: scannedNumber === order.orderNumber ? 'ORDER' : 'TRACKING',
            orderId: order.id,
            orderNumber: order.orderNumber,
            shipmentId: shipment?.id,
            trackingNumber: shipment?.trackingNumber || order.trackingNumber,
            channelName,
            channelCode,
            scannedBy: user.id,
          },
        })

        await tx.checkoutOrder.update({
          where: { id: checkoutOrderId },
          data: {
            channelName: checkoutOrder.channelName || channelName,
            channelCode: checkoutOrder.channelCode || channelCode,
            orderCount: isNewOrder ? { increment: 1 } : undefined,
            parcelCount: { increment: 1 },
            updatedBy: user.id,
          },
        })

        const nextCheckoutResult = await executeCheckout(
          {
            checkoutOrderId,
            tenantId,
            userId: user.id,
            targetOrderId: order.id,
          },
          tx
        )

        return {
          blocked: false as const,
          record: {
            id: createdRecord.id,
            sequenceNumber: createdRecord.sequenceNumber,
            scannedNumber: createdRecord.scannedNumber,
            orderNumber: createdRecord.orderNumber,
            trackingNumber: createdRecord.trackingNumber,
            channelName: createdRecord.channelName,
          },
          checkoutResult: nextCheckoutResult,
        }
      },
      { maxWait: 10000, timeout: 60000 }
    )

    if (transactionResult.blocked) {
      await operationLogService.logOperation({
        tenantId,
        entityType: 'OUTBOUND_ORDER',
        entityId: transactionResult.order.id,
        entityNumber: transactionResult.order.orderNumber,
        operationType: ORDER_OPERATION_TYPES.INTERCEPT_FAIL.type,
        operationName: ORDER_OPERATION_TYPES.INTERCEPT_FAIL.name,
        beforeStatus: transactionResult.order.status,
        afterStatus: transactionResult.order.status,
        remark: transactionResult.interceptionCase.remark,
        operatorId: user.id,
        operatorName: user.name || undefined,
        metadata: {
          source: transactionResult.interceptionCase.source,
          remark: transactionResult.interceptionCase.remark,
          orderStatusAtMark: transactionResult.interceptionCase.orderStatusAtMark,
          checkoutOrderId,
          scannedNumber,
        },
      })

      return NextResponse.json(
        {
          success: false,
          message: t('orderIntercepted'),
          code: 'INT_007',
          title: t('orderInterceptedTitle', {
            orderNumber: transactionResult.order.orderNumber,
          }),
          detail:
            transactionResult.interceptionCase.remark ||
            t('orderInterceptedDetailFallback'),
          actionHint: t('orderInterceptedActionHint'),
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        record: transactionResult.record,
        checkoutOrderId,
        orderCount: transactionResult.checkoutResult.orderCount,
        parcelCount: transactionResult.checkoutResult.parcelCount,
      },
    })
  } catch (error) {
    console.error('Scan error:', error)
    const countLockMessage = extractInventoryCountLockMessage(error)
    if (countLockMessage) {
      return NextResponse.json(
        { success: false, message: countLockMessage },
        { status: 400 }
      )
    }
    if (error instanceof LockAcquisitionError) {
      return NextResponse.json(
        { success: false, message: '库存正在被其他作业占用，请稍后重试' },
        { status: 409 }
      )
    }
    const message = error instanceof Error ? error.message : '扫描失败'
    return NextResponse.json(
      { success: false, message },
      { status: 400 }
    )
  }
}
