import { createAuthHandler } from '@/lib/api/create-handler'
import { ORDER_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { buildPackingVideoWindow, type PackingVideoWindow, resolvePackingTimelineForCompletion } from '@/lib/packing/video-window'
import {
  getPickOrderTaskTypeLabel,
  isFixedComboPickOrderTaskType,
  isSingleMultiHotPickOrderTaskType,
  isSingleOnePickOrderTaskType,
} from '@/lib/packing/task-type'
import { releaseSortingBoxForPickOrderCompletion } from '@/lib/packing/release-sorting-box'
import { generateBarcode } from '@/lib/pdf/barcode'
import { operationLogService } from '@/lib/services/operation-log-service'
import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'

const completeSchema = z.object({
  packagingMaterials: z.array(z.object({
    materialId: z.string(),
    quantity: z.number().int().positive(),
  })).default([]),
  weight: z.number().positive().optional(),
  notes: z.string().optional(),
})

function toNumber(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'object' && value && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber()
  }
  return Number(value || 0)
}

function buildShipmentNumber(prefix: string, sequence: number) {
  return `${prefix}${sequence.toString().padStart(4, '0')}`
}

function buildRecipientAddress(orderAddress: {
  shippingProvince?: string | null
  shippingCity?: string | null
  shippingLine1?: string | null
  shippingLine2?: string | null
}) {
  return [
    orderAddress.shippingProvince,
    orderAddress.shippingCity,
    orderAddress.shippingLine1,
    orderAddress.shippingLine2,
  ].filter(Boolean).join('')
}

function buildOrderSkuQtySignature(lines: Array<{
  skuId: string
  skuCode: string
  expectedQty: number
}>) {
  const skuQtyMap = new Map<string, { skuCode: string; qty: number }>()
  for (const line of lines) {
    const existing = skuQtyMap.get(line.skuId)
    if (existing) {
      existing.qty += line.expectedQty
    } else {
      skuQtyMap.set(line.skuId, {
        skuCode: line.skuCode,
        qty: line.expectedQty,
      })
    }
  }

  const parts = Array.from(skuQtyMap.entries())
    .sort(([leftSkuId], [rightSkuId]) => leftSkuId.localeCompare(rightSkuId))
    .map(([skuId, item]) => ({
      skuId,
      skuCode: item.skuCode,
      qty: item.qty,
      signature: `${skuId}:${item.qty}`,
      text: `${item.skuCode} x${item.qty}`,
    }))

  return {
    itemCount: parts.length,
    items: parts.map((item) => ({
      skuId: item.skuId,
      skuCode: item.skuCode,
      qty: item.qty,
    })),
    signature: parts.map((item) => item.signature).join('|'),
    text: parts.map((item) => item.text).join(' + '),
  }
}

interface AddressSnapshot {
  shippingName?: string | null
  shippingPhone?: string | null
  shippingProvince?: string | null
  shippingCity?: string | null
  shippingLine1?: string | null
  shippingLine2?: string | null
  shippingPostalCode?: string | null
}

export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ pickOrderId: string }> }
) => {
  try {
    const { pickOrderId } = await params
    const body = await request.json()

    const validation = completeSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { packagingMaterials, weight, notes } = validation.data

    const pickOrder = await prisma.pickOrder.findFirst({
      where: {
        id: pickOrderId,
        tenantId: auth.user.tenantId,
      },
      include: {
        warehouse: {
          select: {
            warehouseCode: true,
            warehouseName: true,
          },
        },
        lines: {
          include: {
            sku: true,
            order: {
              include: {
                outbound_order_address: true,
              },
            },
          },
        },
      },
    })

    if (!pickOrder) {
      return NextResponse.json(
        { message: '拣货单不存在' },
        { status: 404 }
      )
    }

    if (pickOrder.status !== 'PACKING') {
      return NextResponse.json(
        { message: '拣货单状态不正确' },
        { status: 400 }
      )
    }

    if (pickOrder.lines.length === 0) {
      return NextResponse.json(
        { message: '拣货单没有可打包明细' },
        { status: 400 }
      )
    }

    const packedStatuses = ['PACKED', 'CHECKOUT_PENDING', 'CHECKED_OUT']
    const orderGroups = new Map<string, typeof pickOrder.lines>()
    for (const line of pickOrder.lines) {
      const existing = orderGroups.get(line.orderId)
      if (existing) {
        existing.push(line)
      } else {
        orderGroups.set(line.orderId, [line])
      }
    }

    const orderEntries = Array.from(orderGroups.entries()).map(([orderId, lines]) => ({
      orderId,
      lines,
      order: lines[0]?.order,
    }))

    if (orderEntries.some((entry) => !entry.order)) {
      return NextResponse.json(
        { message: '拣货单存在缺失订单信息的明细，无法完成打包' },
        { status: 400 }
      )
    }

    const completedOrder = orderEntries.find((entry) => entry.order && packedStatuses.includes(entry.order.status))
    if (completedOrder?.order) {
      return NextResponse.json(
        { message: `订单 ${completedOrder.order.orderNumber} 已打包完成，不能重复操作` },
        { status: 400 }
      )
    }

    const isFixedComboTask = isFixedComboPickOrderTaskType(pickOrder.taskType)
    const isSingleMultiHotTask = isSingleMultiHotPickOrderTaskType(pickOrder.taskType)
    if (isFixedComboTask || isSingleMultiHotTask) {
      const comboGroups = new Map<string, {
        comboText: string
        itemCount: number
        orderNumbers: string[]
      }>()
      for (const entry of orderEntries) {
        const combo = buildOrderSkuQtySignature(entry.lines)
        const group = comboGroups.get(combo.signature) || {
          comboText: combo.text,
          itemCount: combo.itemCount,
          orderNumbers: [],
        }
        group.orderNumbers.push(entry.order?.orderNumber || entry.orderId)
        comboGroups.set(combo.signature, group)
      }

      const reviewedOrder = orderEntries.find((entry) =>
        entry.lines.every((line) => line.packedQty >= line.expectedQty)
      )
      const comboGroupList = Array.from(comboGroups.values()).map((group) => ({
        comboText: group.comboText,
        orderCount: group.orderNumbers.length,
        orderNumbers: group.orderNumbers,
      }))

      if (isSingleMultiHotTask) {
        const hasMultiSkuOrder = Array.from(comboGroups.values()).some((group) => group.itemCount > 1)
        if (hasMultiSkuOrder) {
          return NextResponse.json(
            {
              message: '单品多件爆款校验失败：检测到包含多个 SKU 的订单，请核对订单后再提交打包',
              data: {
                comboGroups: comboGroupList,
              },
            },
            { status: 400 }
          )
        }

        if (comboGroups.size > 1) {
          return NextResponse.json(
            {
              message: `单品多件爆款数量不一致：检测到 ${comboGroups.size} 种每单数量，请核对订单数量后再提交打包`,
              data: {
                comboGroups: comboGroupList,
              },
            },
            { status: 400 }
          )
        }

        if (!reviewedOrder) {
          return NextResponse.json(
            { message: '单品多件爆款请先扫描完成任意一个订单的全部数量，再提交整单打包' },
            { status: 400 }
          )
        }
      } else {
        if (comboGroups.size > 1) {
          return NextResponse.json(
            {
              message: `多品固定组合不一致：检测到 ${comboGroups.size} 种组合，请核对订单组合后再提交打包`,
              data: {
                comboGroups: comboGroupList,
              },
            },
            { status: 400 }
          )
        }

        if (!reviewedOrder) {
          return NextResponse.json(
            { message: '多品固定组合请先扫描完成任意一个订单的完整组合，再提交整单打包' },
            { status: 400 }
          )
        }
      }

      const hasUnscannedSerialManagedLine = pickOrder.lines.some((line) =>
        line.sku?.isSerialManaged && line.packedQty < line.expectedQty
      )
      if (hasUnscannedSerialManagedLine) {
        return NextResponse.json(
          { message: '存在序列号管理 SKU，必须完成全部 SKU 扫描后才能提交打包' },
          { status: 400 }
        )
      }
    }

    const allLinesSelfPackaged = pickOrder.lines.every((line) => line.sku?.isSelfPackaged)
    const requiresAllLinesScanned = !isSingleOnePickOrderTaskType(pickOrder.taskType) && !isFixedComboTask && !isSingleMultiHotTask
    const requiresPackagingMaterials = isFixedComboTask || isSingleMultiHotTask

    if (requiresAllLinesScanned) {
      const unpackedLines = pickOrder.lines.filter((line) => line.packedQty < line.expectedQty)
      if (unpackedLines.length > 0) {
        return NextResponse.json(
          { message: '还有 SKU 未完成扫描打包' },
          { status: 400 }
        )
      }
    }

    if (requiresPackagingMaterials && packagingMaterials.length === 0) {
      return NextResponse.json(
        { message: '当前拣货单类型必须选择包材后才能提交打包' },
        { status: 400 }
      )
    }

    const materialIds = packagingMaterials.map((item) => item.materialId)
    const materialRecords = materialIds.length > 0
      ? await prisma.packagingMaterial.findMany({
          where: {
            tenantId: auth.user.tenantId,
            id: { in: materialIds },
          },
        })
      : []
    const materialRecordMap = new Map(materialRecords.map((item) => [item.id, item]))

    for (const material of packagingMaterials) {
      if (!materialRecordMap.has(material.materialId)) {
        return NextResponse.json(
          { message: '存在无效包材，无法完成打包' },
          { status: 400 }
        )
      }
    }

    const materialWeightMap = new Map(
      materialRecords.map((item) => [item.id, item.weightKg ? toNumber(item.weightKg) : 0])
    )
    const packagingWeight = packagingMaterials.reduce((sum, item) => {
      return sum + (materialWeightMap.get(item.materialId) || 0) * item.quantity
    }, 0)

    const warehouseCode = pickOrder.warehouse?.warehouseCode || 'WH'
    const warehouseName = pickOrder.warehouse?.warehouseName || ''
    const today = new Date()
    const dateStr = today
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, '')
    const shipmentPrefix = `SH-${warehouseCode}-${dateStr}-`
    const lastShipment = await prisma.shipment.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        shipmentNumber: {
          startsWith: shipmentPrefix,
        },
      },
      orderBy: {
        shipmentNumber: 'desc',
      },
      select: {
        shipmentNumber: true,
      },
    })
    let nextShipmentSequence = 1
    if (lastShipment) {
      const lastSequence = parseInt(lastShipment.shipmentNumber.slice(-4), 10)
      if (!Number.isNaN(lastSequence)) {
        nextShipmentSequence = lastSequence + 1
      }
    }

    const shipmentPlans = orderEntries.map((entry) => {
      const order = entry.order!
      const skuWeight = entry.lines.reduce((sum, line) => {
        const packedQty = requiresAllLinesScanned ? line.packedQty : line.expectedQty
        return sum + toNumber(line.sku?.weightKg) * packedQty
      }, 0)

      return {
        orderId: entry.orderId,
        order,
        lines: entry.lines,
        shipmentNumber: buildShipmentNumber(shipmentPrefix, nextShipmentSequence++),
        finalWeight: weight ?? (skuWeight + packagingWeight),
      }
    })

    const shipmentResults: Array<{
      id: string
      shipmentNumber: string
      orderId: string
      orderNumber: string
      referenceNumber: string | null
      finalWeight: number
      orderAddress: AddressSnapshot
    }> = []
    const videoWindows: PackingVideoWindow[] = []

    await prisma.$transaction(async (tx) => {
      for (const line of pickOrder.lines) {
        const packedQtyTarget = line.expectedQty
        const packedQtyDiff = packedQtyTarget - line.packedQty
        if (packedQtyDiff <= 0) {
          continue
        }

        await tx.pickOrderLine.update({
          where: { id: line.id },
          data: {
            packedQty: packedQtyTarget,
            updatedBy: auth.user.id,
          },
        })

        await tx.outboundOrderLine.update({
          where: { id: line.orderLineId },
          data: {
            packedQty: { increment: packedQtyDiff },
            status: 'PACKED',
            updatedBy: auth.user.id,
          },
        })
      }

      for (const plan of shipmentPlans) {
        const packedAt = new Date()
        const timeline = await resolvePackingTimelineForCompletion({
          tx,
          tenantId: auth.user.tenantId,
          orderId: plan.orderId,
          packedAt,
        })
        const totalPackedQty = plan.lines.reduce((sum, line) => sum + line.expectedQty, 0)

        await tx.outboundOrder.update({
          where: { id: plan.orderId },
          data: {
            status: 'PACKED',
            totalPackedQty,
            updatedBy: auth.user.id,
          },
        })

        await tx.outboundOrderLine.updateMany({
          where: { orderId: plan.orderId },
          data: {
            status: 'PACKED',
            updatedBy: auth.user.id,
          },
        })

        await tx.orderTimeline.upsert({
          where: { orderId: plan.orderId },
          create: {
            tenantId: auth.user.tenantId,
            orderId: plan.orderId,
            packingFirstActionAt: timeline.packingFirstActionAt,
            packedAt,
            packedBy: auth.user.id,
          },
          update: {
            packedAt,
            packedBy: auth.user.id,
          },
        })

        videoWindows.push(buildPackingVideoWindow({
          orderId: plan.orderId,
          packingFirstActionAt: timeline.packingFirstActionAt,
          packingStartAt: timeline.packingStartAt,
          packedAt,
        }))

        if (plan.finalWeight > 0) {
          await tx.outboundOrderExtension.upsert({
            where: { orderId: plan.orderId },
            create: {
              tenantId: auth.user.tenantId,
              orderId: plan.orderId,
              checkOutWeightKg: plan.finalWeight,
            },
            update: {
              checkOutWeightKg: plan.finalWeight,
            },
          })
        }

        const cellAllocation = await tx.sortingCellAllocation.findFirst({
          where: { orderId: plan.orderId, status: { in: ['ALLOCATED', 'SORTING', 'COMPLETED'] } },
          select: { id: true, sortingTaskId: true, sortingWallId: true, sortingCellId: true },
        })

        if (cellAllocation) {
          await tx.sortingCellAllocation.update({
            where: { id: cellAllocation.id },
            data: { status: 'RELEASED' },
          })

          if (cellAllocation.sortingCellId) {
            await tx.sortingCell.update({
              where: { id: cellAllocation.sortingCellId },
              data: { status: 'EMPTY' },
            })
          }

          const remainingCells = await tx.sortingCellAllocation.count({
            where: {
              sortingTaskId: cellAllocation.sortingTaskId,
              status: { not: 'RELEASED' },
            },
          })

          if (remainingCells === 0) {
            await tx.sortingWall.update({
              where: { id: cellAllocation.sortingWallId },
              data: { sortStatus: 'IDLE' },
            })
          }
        }

        const shipment = await tx.shipment.create({
          data: {
            tenantId: auth.user.tenantId,
            warehouseId: pickOrder.warehouseId,
            orderId: plan.orderId,
            shipmentNumber: plan.shipmentNumber,
            status: 'CREATED',
            shippingMethod: plan.order.shippingMethod || null,
            packageCount: 1,
            totalWeightKg: plan.finalWeight,
            outbound_address_id: plan.order.outbound_address_id || '',
            notes,
            createdBy: auth.user.id,
            updatedBy: auth.user.id,
          },
        })

        shipmentResults.push({
          id: shipment.id,
          shipmentNumber: shipment.shipmentNumber,
          orderId: plan.orderId,
          orderNumber: plan.order.orderNumber,
          referenceNumber: plan.order.referenceNumber,
          finalWeight: plan.finalWeight,
          orderAddress: plan.order.outbound_order_address
            ? {
                shippingName: plan.order.outbound_order_address.shippingName,
                shippingPhone: plan.order.outbound_order_address.shippingPhone,
                shippingProvince: plan.order.outbound_order_address.shippingProvince,
                shippingCity: plan.order.outbound_order_address.shippingCity,
                shippingLine1: plan.order.outbound_order_address.shippingLine1,
                shippingLine2: plan.order.outbound_order_address.shippingLine2,
                shippingPostalCode: plan.order.outbound_order_address.shippingPostalCode,
              }
            : {
            shippingName: '',
            shippingPhone: '',
            shippingProvince: '',
            shippingCity: '',
            shippingLine1: '',
            shippingLine2: '',
            shippingPostalCode: '',
            },
        })
      }

      if (packagingMaterials.length > 0) {
        for (const material of packagingMaterials) {
          const materialInfo = materialRecordMap.get(material.materialId)
          if (!materialInfo) continue

          const currentInventory = await tx.packagingMaterialInventory.findFirst({
            where: {
              tenantId: auth.user.tenantId,
              warehouseId: pickOrder.warehouseId,
              materialId: material.materialId,
            },
          })

          const totalMaterialQuantity = material.quantity * shipmentPlans.length
          const quantityBefore = currentInventory?.totalQuantity ?? 0
          const quantityAfter = quantityBefore - totalMaterialQuantity
          const unitPrice = materialInfo.unitPrice ? toNumber(materialInfo.unitPrice) : 0

          for (const plan of shipmentPlans) {
            await tx.packagingMaterialUsage.create({
              data: {
                tenantId: auth.user.tenantId,
                warehouseId: pickOrder.warehouseId,
                orderId: plan.orderId,
                orderNumber: plan.order.orderNumber,
                materialId: material.materialId,
                materialCode: materialInfo.materialCode,
                materialName: materialInfo.materialName,
                quantity: material.quantity,
                unitCost: unitPrice,
                totalCost: unitPrice * material.quantity,
                packedBy: auth.user.id,
              },
            })
          }

          await tx.packagingMaterialInventory.updateMany({
            where: {
              tenantId: auth.user.tenantId,
              warehouseId: pickOrder.warehouseId,
              materialId: material.materialId,
            },
            data: {
              totalQuantity: { decrement: totalMaterialQuantity },
              availableQuantity: { decrement: totalMaterialQuantity },
              lastMovementAt: new Date(),
            },
          })

          await tx.packagingMaterialTransaction.create({
            data: {
              tenantId: auth.user.tenantId,
              warehouseId: pickOrder.warehouseId,
              materialId: material.materialId,
              materialCode: materialInfo.materialCode,
              materialName: materialInfo.materialName,
              transactionType: 'ORDER_OUTBOUND',
              quantityChange: -totalMaterialQuantity,
              quantityBefore,
              quantityAfter,
              referenceType: 'SALES_ORDER',
              referenceId: pickOrderId,
              referenceNumber: pickOrder.taskNumber,
              referenceDetail: `拣货单类型: ${getPickOrderTaskTypeLabel(pickOrder.taskType)}, 订单数: ${shipmentPlans.length}`,
              unitCost: unitPrice,
              totalCost: unitPrice * totalMaterialQuantity,
              operatorId: auth.user.id,
              operatorName: auth.user.name || '未知',
            },
          })
        }
      }

      await tx.pickOrder.update({
        where: { id: pickOrderId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          updatedBy: auth.user.id,
        },
      })

      await releaseSortingBoxForPickOrderCompletion({
        tx,
        tenantId: auth.user.tenantId,
        warehouseId: pickOrder.warehouseId,
        targetContainer: pickOrder.targetContainer,
        operatorId: auth.user.id,
      })
    })

    for (const shipment of shipmentResults) {
      const plan = shipmentPlans.find((item) => item.orderId === shipment.orderId)
      if (!plan) continue

      operationLogService.logOperation({
        tenantId: auth.user.tenantId,
        entityType: 'OUTBOUND_ORDER',
        entityId: shipment.orderId,
        entityNumber: shipment.orderNumber,
        operationType: ORDER_OPERATION_TYPES.COMPLETE_PACK.type,
        operationName: ORDER_OPERATION_TYPES.COMPLETE_PACK.name,
        beforeStatus: plan.order.status,
        afterStatus: 'PACKED',
        remark: `拣货单 ${pickOrder.taskNumber} 一键打包完成`,
        operatorId: auth.user.id,
        operatorName: auth.user.name || undefined,
        metadata: {
          pickOrderId,
          taskType: pickOrder.taskType,
          weight: shipment.finalWeight,
          packagingMaterials,
          shipmentId: shipment.id,
          shipmentNumber: shipment.shipmentNumber,
          allLinesSelfPackaged,
        },
      })
    }

    const labelDataList = await Promise.all(shipmentResults.map(async (shipment) => {
      const barcodeImage = await generateBarcode(shipment.shipmentNumber, {
        bcid: 'code128',
        scale: 3,
        height: 12,
        includetext: true,
      })

      return {
        labelSize: { width: 100, height: 150 },
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        orderNumber: shipment.orderNumber,
        referenceNumber: shipment.referenceNumber,
        recipientName: shipment.orderAddress.shippingName || '',
        recipientPhone: shipment.orderAddress.shippingPhone || '',
        recipientAddress: buildRecipientAddress(shipment.orderAddress),
        recipientPostalCode: shipment.orderAddress.shippingPostalCode || '',
        warehouseName,
        weight: shipment.finalWeight,
        packageCount: 1,
        barcodeType: 'CODE128',
        barcodeContent: shipment.shipmentNumber,
        barcodeImage,
        printTime: new Date().toISOString(),
      }
    }))

    return NextResponse.json({
      data: {
        message: '拣货单打包完成',
        pickOrderId,
        taskType: pickOrder.taskType,
        orderIds: shipmentResults.map((item) => item.orderId),
        shipmentCount: shipmentResults.length,
        labelData: labelDataList[0] || null,
        labelDataList,
        videoWindows,
      },
    })
  } catch (error) {
    console.error('完成整单打包失败:', error)
    return NextResponse.json(
      { message: '完成整单打包失败' },
      { status: 500 }
    )
  }
})
