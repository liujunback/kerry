import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'
import { submitReceivingSchema } from '@/lib/validations/receiving'
import { asnStateMachine, AsnStatus } from '@/lib/services/asn-state-machine'
import { serializeAsnLine } from '@/lib/asn/response-serializer'

export interface AsnReceivingSkuRouteParams {
  params: Promise<{ id: string }>
}

class ReceivingError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ReceivingError'
  }
}

function normalizeDateOnly(value: Date | string | null | undefined): string {
  if (!value) return ''
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  return String(value)
    .split('T')[0]
    .split(' ')[0]
}

function normalizeDateForPrisma(value: Date | string | null | undefined): Date | null {
  const dateOnly = normalizeDateOnly(value)
  if (!dateOnly) return null

  const normalized = new Date(`${dateOnly}T00:00:00.000Z`)
  return Number.isNaN(normalized.getTime()) ? null : normalized
}

function getReceivingModeLabel(mode: string | null | undefined) {
  return mode === 'CONTAINER' ? '容器收货' : 'SKU收货'
}

export async function postAsnReceivingSku(
  request: NextRequest,
  { params }: AsnReceivingSkuRouteParams
) {
  try {
    const authResult = await requireAuth(request)
    if (authResult instanceof Response) {
      return authResult
    }
    const { user } = authResult

    const { id: asnId } = await params
    const body = await request.json()

    const validationResult = submitReceivingSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: '参数验证失败',
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const {
      asnLineId,
      receivedQty,
      qualityStatus,
      batchNumber,
      expiryDate,
      serialNumbers,
      containerId,
      containerCode,
      receivingMode,
    } = validationResult.data

    const result = await prisma.$transaction(
      async (tx) => {
        const lockedAsnRows = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM asn
          WHERE id = ${asnId}
            AND tenant_id = ${user.tenantId}
          FOR UPDATE
        `

      if (lockedAsnRows.length === 0) {
        throw new ReceivingError(404, 'ASN_NOT_FOUND', 'ASN不存在')
      }

      const asn = await tx.asn.findUnique({
        where: { id: asnId },
      })

      if (!asn) {
        throw new ReceivingError(404, 'ASN_NOT_FOUND', 'ASN不存在')
      }

      if (!asn.signedAt) {
        throw new ReceivingError(400, 'ASN_NOT_SIGNED', 'ASN尚未签收，请先签收后再进行收货')
      }

      const allowedStatuses = ['CREATED', 'PENDING_RECEIVING', 'RECEIVING']
      if (!allowedStatuses.includes(asn.status)) {
        throw new ReceivingError(400, 'INVALID_ASN_STATUS', 'ASN状态不允许收货')
      }

      const effectiveReceivingMethod =
        asn.receiving_method === 'NORMAL' ? null : asn.receiving_method
      if (
        effectiveReceivingMethod &&
        receivingMode &&
        effectiveReceivingMethod !== receivingMode
      ) {
        throw new ReceivingError(
          400,
          'RECEIVING_MODE_MISMATCH',
          `该ASN已使用${getReceivingModeLabel(effectiveReceivingMethod)}方式，不可切换为${getReceivingModeLabel(receivingMode)}方式`
        )
      }

      const lockedAsnLineRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM asn_line
        WHERE id = ${asnLineId}
          AND asn_id = ${asnId}
        FOR UPDATE
      `

      if (lockedAsnLineRows.length === 0) {
        throw new ReceivingError(404, 'ASN_LINE_NOT_FOUND', 'ASN明细不存在')
      }

      const asnLine = await tx.asnLine.findUnique({
        where: { id: asnLineId },
      })

      if (!asnLine) {
        throw new ReceivingError(404, 'ASN_LINE_NOT_FOUND', 'ASN明细不存在')
      }

      const sku = await tx.sku.findUnique({
        where: { id: asnLine.skuId },
        select: {
          isBatchManaged: true,
          isExpiryManaged: true,
          isSerialManaged: true,
        },
      })

      if (sku) {
        if (sku.isBatchManaged && !batchNumber) {
          throw new ReceivingError(
            400,
            'BATCH_NUMBER_REQUIRED',
            '该SKU启用了批次管理，收货时必须提供批次号'
          )
        }

        if (sku.isExpiryManaged && !expiryDate) {
          throw new ReceivingError(
            400,
            'EXPIRY_DATE_REQUIRED',
            '该SKU启用了效期管理，收货时必须提供效期'
          )
        }

        if (sku.isExpiryManaged && expiryDate) {
          const expiryDateObj = new Date(expiryDate)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          if (expiryDateObj < today) {
            throw new ReceivingError(
              400,
              'EXPIRY_DATE_EXPIRED',
              '效期日期已过期，不允许收货已过期商品'
            )
          }
        }

        if (sku.isSerialManaged && (!serialNumbers || serialNumbers.length === 0)) {
          throw new ReceivingError(
            400,
            'SERIAL_NUMBERS_REQUIRED',
            '该SKU启用了序列号管理，收货时必须提供序列号'
          )
        }

        if (sku.isSerialManaged && serialNumbers && serialNumbers.length !== receivedQty) {
          throw new ReceivingError(
            400,
            'SERIAL_COUNT_MISMATCH',
            `序列号数量(${serialNumbers.length})与收货数量(${receivedQty})不匹配`
          )
        }
      }

      const remainingQty = asnLine.expectedQty - asnLine.receivedQty
      if (receivedQty > remainingQty) {
        throw new ReceivingError(
          400,
          'OVER_RECEIVE_NOT_ALLOWED',
          '收货数量超过剩余数量，不允许超收'
        )
      }

      let resolvedContainerId = containerId
      let resolvedContainerCode = containerCode || null

      if (receivingMode === 'CONTAINER' && !containerId && !containerCode) {
        throw new ReceivingError(
          400,
          'CONTAINER_CODE_REQUIRED',
          '容器收货模式必须提供容器编码'
        )
      }

      if (receivingMode === 'CONTAINER' && !containerId && containerCode) {
        const containerByCode = await tx.container.findFirst({
          where: {
            containerCode,
            tenantId: user.tenantId,
          },
          select: { id: true },
        })

        if (!containerByCode) {
          throw new ReceivingError(
            404,
            'CONTAINER_NOT_FOUND',
            `容器 ${containerCode} 不存在`
          )
        }

        resolvedContainerId = containerByCode.id
      }

      if (resolvedContainerId) {
        const lockedContainerRows = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM container
          WHERE id = ${resolvedContainerId}
            AND tenant_id = ${user.tenantId}
          FOR UPDATE
        `

        if (lockedContainerRows.length === 0) {
          throw new ReceivingError(404, 'CONTAINER_NOT_FOUND', '容器不存在')
        }

        const container = await tx.container.findUnique({
          where: { id: resolvedContainerId },
          select: {
            id: true,
            containerCode: true,
            workStatus: true,
            currentAsnId: true,
            enabledStatus: true,
          },
        })

        if (!container) {
          throw new ReceivingError(404, 'CONTAINER_NOT_FOUND', '容器不存在')
        }

        resolvedContainerCode = resolvedContainerCode || container.containerCode

        if (container.enabledStatus !== 'ENABLED') {
          throw new ReceivingError(400, 'CONTAINER_DISABLED', '容器已禁用')
        }

        if (container.workStatus === 'CLOSED') {
          throw new ReceivingError(
            400,
            'CONTAINER_CLOSED',
            '容器已关箱，不能继续收货'
          )
        }

        if (
          container.workStatus === 'OCCUPIED' &&
          container.currentAsnId &&
          container.currentAsnId !== asnId
        ) {
          const itemCount = await tx.containerItem.count({
            where: { containerId: resolvedContainerId },
          })

          if (itemCount > 0) {
            throw new ReceivingError(
              400,
              'CONTAINER_OCCUPIED',
              '该容器正在被其他ASN使用，请先关箱后再使用'
            )
          }

          await tx.container.update({
            where: { id: resolvedContainerId },
            data: {
              workStatus: 'IDLE',
              currentAsnId: null,
              currentBatchNumber: null,
              currentQualityStatus: null,
              currentSkuId: null,
              closedAt: null,
            },
          })
        }

        const existingContainerItems = await tx.containerItem.findMany({
          where: {
            containerId: resolvedContainerId,
          },
          select: {
            batchNumber: true,
            expiryDate: true,
            qualityType: true,
          },
        })

        if (existingContainerItems.length > 0) {
          const firstItem = existingContainerItems[0]
          const currentQualityType = qualityStatus === 'GOOD' ? 'GOOD' : 'DAMAGED'
          const existingBatch = firstItem.batchNumber || ''
          const currentBatch = batchNumber || ''

          if (existingBatch !== currentBatch) {
            throw new ReceivingError(
              400,
              'BATCH_MISMATCH',
              '该批次与容器内已有批次不同，同一容器只能放入同一批次'
            )
          }

          const existingExpiry = normalizeDateOnly(firstItem.expiryDate)
          const currentExpiry = expiryDate
            ? normalizeDateOnly(new Date(expiryDate))
            : ''
          if (existingExpiry !== currentExpiry) {
            throw new ReceivingError(
              400,
              'EXPIRY_MISMATCH',
              '该效期与容器内已有效期不同，同一容器只能放入相同效期'
            )
          }

          if (firstItem.qualityType !== currentQualityType) {
            throw new ReceivingError(
              400,
              'QUALITY_MISMATCH',
              '该质量状态与容器内已有质量状态不同，同一容器只能放入相同质量状态'
            )
          }
        }
      }

      const newReceivedQty = asnLine.receivedQty + receivedQty
      const newReceivedGoodQty =
        qualityStatus === 'GOOD'
          ? asnLine.receivedGoodQty + receivedQty
          : asnLine.receivedGoodQty
      const newReceivedDamagedQty =
        qualityStatus === 'DAMAGED'
          ? asnLine.receivedDamagedQty + receivedQty
          : asnLine.receivedDamagedQty

      let lineStatus = asnLine.status
      if (newReceivedQty >= asnLine.expectedQty) {
        lineStatus = 'RECEIVED'
      } else if (newReceivedQty > 0) {
        lineStatus = 'RECEIVING'
      }

      let updatedSerialNumbers: string[] | undefined
      if (serialNumbers && serialNumbers.length > 0) {
        const existingSerials = Array.isArray(asnLine.serialNumbers)
          ? (asnLine.serialNumbers as string[])
          : []
        updatedSerialNumbers = [...existingSerials, ...serialNumbers]
      }

      const finalBatchNumber = batchNumber || asnLine.batchNumber
      const finalExpiryDate = normalizeDateForPrisma(expiryDate || asnLine.expiryDate)

      const updatedLine = await tx.asnLine.update({
        where: { id: asnLineId },
        data: {
          receivedQty: newReceivedQty,
          receivedGoodQty: newReceivedGoodQty,
          receivedDamagedQty: newReceivedDamagedQty,
          status: lineStatus,
          batchNumber: finalBatchNumber,
          expiryDate: finalExpiryDate,
          ...(updatedSerialNumbers !== undefined && {
            serialNumbers: updatedSerialNumbers,
          }),
        },
      })

      const newTotalReceivedQty = asn.totalReceivedQty + receivedQty

      const receivedLinesCount = await tx.asnLine.count({
        where: {
          asnId,
          receivedQty: { gt: 0 },
        },
      })

      let asnStatus = asn.status
      const isFirstReceiving =
        asnStatus === 'CREATED' || asnStatus === 'PENDING_RECEIVING'
      if (isFirstReceiving) {
        asnStatus = 'RECEIVING'
      }

      let allCompleted = false
      if (receivingMode !== 'CONTAINER') {
        const allLines = await tx.asnLine.findMany({
          where: { asnId },
          select: { expectedQty: true, receivedQty: true },
        })

        allCompleted = allLines.every(
          (line) => line.receivedQty >= line.expectedQty
        )
        if (allCompleted) {
          asnStatus = 'RECEIVED'
        }
      }

      await tx.asn.update({
        where: { id: asnId },
        data: {
          totalReceivedQty: newTotalReceivedQty,
          totalReceivedLines: receivedLinesCount,
          status: asnStatus,
          receivingStartAt: asn.receivingStartAt ? undefined : new Date(),
          ...(allCompleted && { receivingEndAt: new Date() }),
          ...(isFirstReceiving && { receiving_method: receivingMode }),
        },
      })

      const recordNumber = `RCV${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      const receivingRecord = await tx.receivingRecord.create({
        data: {
          tenantId: user.tenantId,
          recordNumber,
          asnId,
          asnLineId,
          containerId: resolvedContainerId || null,
          warehouseId: asn.warehouseId,
          clientId: asn.clientId,
          skuId: asnLine.skuId,
          skuCode: asnLine.skuCode,
          skuName: asnLine.skuName,
          expectedQty: asnLine.expectedQty,
          receivedQty,
          goodQty: qualityStatus === 'GOOD' ? receivedQty : 0,
          damagedQty: qualityStatus === 'DAMAGED' ? receivedQty : 0,
          batchNumber: finalBatchNumber || undefined,
          expiryDate: finalExpiryDate || undefined,
          serialNumbers:
            serialNumbers && serialNumbers.length > 0
              ? serialNumbers
              : undefined,
          receivingMode: receivingMode || 'SKU',
          deviceType: 'PC',
          status: 'COMPLETED',
          receivedAt: new Date(),
          receivedBy: user.id,
          notes: resolvedContainerCode
            ? `容器编码: ${resolvedContainerCode}`
            : undefined,
        },
      })

      if (serialNumbers && serialNumbers.length > 0) {
        const uniqueSerials = new Set(serialNumbers)
        if (uniqueSerials.size !== serialNumbers.length) {
          const duplicates = serialNumbers.filter(
            (sn, index) => serialNumbers.indexOf(sn) !== index
          )
          throw new ReceivingError(
            400,
            'SERIAL_NUMBERS_DUPLICATED',
            `序列号重复: ${[...new Set(duplicates)].join(', ')}`
          )
        }

        const existingSerials = await tx.serialNumber.findMany({
          where: {
            serialNumber: { in: serialNumbers },
            status: 'IN_STOCK',
            warehouseId: asn.warehouseId,
          },
          select: { serialNumber: true },
        })

        if (existingSerials.length > 0) {
          const duplicates = existingSerials
            .map((serial) => serial.serialNumber)
            .join(', ')
          throw new ReceivingError(
            400,
            'SERIAL_NUMBERS_ALREADY_EXISTS',
            `序列号已存在: ${duplicates}`
          )
        }

        await tx.serialNumber.createMany({
          data: serialNumbers.map((serialNumber) => ({
            tenantId: user.tenantId,
            clientId: asn.clientId,
            skuId: asnLine.skuId,
            serialNumber,
            status: 'IN_STOCK',
            warehouseId: asn.warehouseId,
            receivedAt: new Date(),
            receivedAsnId: asnId,
            createdBy: user.id,
          })),
        })
      }

      if (resolvedContainerId) {
        const qualityType = qualityStatus === 'GOOD' ? 'GOOD' : 'DAMAGED'

        await tx.container.update({
          where: { id: resolvedContainerId },
          data: {
            workStatus: 'OCCUPIED',
            lastOccupiedTime: new Date(),
            currentAsnId: asnId,
            updatedBy: user.id,
          },
        })

        const existingItem = await tx.containerItem.findFirst({
          where: {
            containerId: resolvedContainerId,
            asnId,
            skuId: asnLine.skuId,
            batchNumber: finalBatchNumber || undefined,
            qualityType,
            putawayOrderLineId: null,
          },
        })

        if (existingItem) {
          await tx.containerItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: existingItem.quantity + receivedQty,
              ...(serialNumbers && serialNumbers.length > 0 && {
                serialNumbers: [
                  ...(Array.isArray(existingItem.serialNumbers)
                    ? (existingItem.serialNumbers as string[])
                    : []),
                  ...serialNumbers,
                ],
              }),
            },
          })
        } else {
          await tx.containerItem.create({
            data: {
              tenantId: user.tenantId,
              containerId: resolvedContainerId,
              asnId,
              asnLineId,
              skuId: asnLine.skuId,
              skuCode: asnLine.skuCode,
              skuName: asnLine.skuName,
              quantity: receivedQty,
              batchNumber: finalBatchNumber || undefined,
              expiryDate: finalExpiryDate || undefined,
              qualityType,
              serialNumbers:
                serialNumbers && serialNumbers.length > 0
                  ? serialNumbers
                  : undefined,
              receivedAt: new Date(),
              receivedBy: user.id,
            },
          })
        }
      }

        return {
          asnLine: updatedLine,
          totalReceivedQty: newTotalReceivedQty,
          totalReceivedLines: receivedLinesCount,
          receivingRecord,
          previousStatus: asn.status,
          newStatus: asnStatus,
          asnNumber: asn.asnNumber,
        }
      },
      { maxWait: 10000, timeout: 25000 }
    )

    if (result.previousStatus !== result.newStatus) {
      const ctx = {
        tenantId: user.tenantId,
        userId: user.id,
        userName: (user as { name?: string }).name || undefined,
      }

      if (
        result.newStatus === 'RECEIVING' &&
        (result.previousStatus === 'CREATED' ||
          result.previousStatus === 'PENDING_RECEIVING')
      ) {
        asnStateMachine.logStatusChange(
          asnId,
          result.asnNumber,
          'START_RECEIVE',
          result.previousStatus as AsnStatus,
          result.newStatus as AsnStatus,
          ctx
        )
      }

      if (result.newStatus === 'RECEIVED') {
        asnStateMachine.logStatusChange(
          asnId,
          result.asnNumber,
          'COMPLETE_RECEIVE',
          result.previousStatus as AsnStatus,
          result.newStatus as AsnStatus,
          ctx
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: '收货成功',
      data: {
        ...result,
        asnLine: serializeAsnLine(result.asnLine),
      },
    })
  } catch (error) {
    if (error instanceof ReceivingError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.status }
      )
    }

    console.error('Submit receiving error:', error)
    const errorMessage = error instanceof Error ? error.message : '收货失败'
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    )
  }
}
