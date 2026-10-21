import { createAuthHandler } from '@/lib/api/create-handler'
import { ORDER_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'
import { generateBarcode } from '@/lib/pdf/barcode'
import { releaseSortingBoxForPickOrderCompletion } from '@/lib/packing/release-sorting-box'
import { buildPackingVideoWindow, resolvePackingTimelineForCompletion } from '@/lib/packing/video-window'
import { operationLogService } from '@/lib/services/operation-log-service'
import { generateShipmentNumber } from '@/lib/utils/number-generator'
import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'

const completeOrderSchema = z.object({
  orderId: z.string().min(1, '订单ID不能为空'),
  packagingMaterials: z.array(z.object({
    materialId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1, '请选择包材'),
  weight: z.number().positive('请输入重量').optional(),
})

export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ pickOrderId: string }> }
) => {
  try {
    const { pickOrderId } = await params
    const body = await request.json()

    const validation = completeOrderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { orderId, packagingMaterials, weight } = validation.data

    // 查询拣货单
    const pickOrder = await prisma.pickOrder.findFirst({
      where: {
        id: pickOrderId,
        tenantId: auth.user.tenantId,
      },
      include: {
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        lines: {
          where: { orderId },
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

    // 验证该订单的所有行项目是否已打包完成
    const orderLines = pickOrder.lines
    if (orderLines.length === 0) {
      return NextResponse.json(
        { message: '订单不在此拣货单中' },
        { status: 400 }
      )
    }

    const unpackedLines = orderLines.filter(
      line => line.packedQty < line.expectedQty
    )
    if (unpackedLines.length > 0) {
      return NextResponse.json(
        { message: '该订单还有SKU未完成打包' },
        { status: 400 }
      )
    }

    const order = orderLines[0]?.order
    if (!order) {
      return NextResponse.json(
        { message: '订单信息不存在' },
        { status: 400 }
      )
    }

    // 检查订单是否已经关箱（PACKED 及之后的状态都不能重复关箱）
    const completedStatuses = ['PACKED', 'CHECKOUT_PENDING', 'CHECKED_OUT']
    if (completedStatuses.includes(order.status)) {
      return NextResponse.json(
        { message: '该订单已关箱，不能重复操作' },
        { status: 400 }
      )
    }

    // 计算该订单的已打包数量
    const totalPackedQty = orderLines.reduce((sum, l) => sum + l.packedQty, 0)

    // 自动计算包裹重量 = 耗材重量×数量 + SKU重量×数量
    let calculatedWeight = 0

    // SKU 重量
    for (const line of orderLines) {
      const skuWeight = line.sku?.weightKg ? Number(line.sku.weightKg) : 0
      calculatedWeight += skuWeight * line.packedQty
    }

    // 耗材重量
    if (packagingMaterials.length > 0) {
      const materialIds = packagingMaterials.map(m => m.materialId)
      const materials = await prisma.packagingMaterial.findMany({
        where: { id: { in: materialIds } },
        select: { id: true, weightKg: true },
      })
      const materialWeightMap = new Map(materials.map(m => [m.id, m.weightKg ? Number(m.weightKg) : 0]))
      for (const pm of packagingMaterials) {
        const mWeight = materialWeightMap.get(pm.materialId) || 0
        calculatedWeight += mWeight * pm.quantity
      }
    }

    // 如果前端传了 weight 则使用前端值，否则使用计算值
    const finalWeight = weight ?? (calculatedWeight > 0 ? calculatedWeight : 0)

    // 获取仓库信息用于生成发货单号
    const warehouseCode = pickOrder.warehouse?.warehouseCode || 'WH'
    const warehouseName = pickOrder.warehouse?.warehouseName || ''

    // 生成发货单号
    const shipmentNumber = await generateShipmentNumber(
      auth.user.tenantId,
      warehouseCode
    )

    // 获取订单地址信息
    const orderAddress = order.outbound_order_address

    // 使用事务更新数据
    const result = await prisma.$transaction(async (tx) => {
      const packedAt = new Date()
      const timeline = await resolvePackingTimelineForCompletion({
        tx,
        tenantId: auth.user.tenantId,
        orderId,
        packedAt,
      })

      // 更新出库单状态为 PACKED（已打包）
      await tx.outboundOrder.update({
        where: { id: orderId },
        data: {
          status: 'PACKED',
          totalPackedQty,
          updatedBy: auth.user.id,
        },
      })

      // 更新出库单行项目状态为 PACKED（已打包）
      await tx.outboundOrderLine.updateMany({
        where: { orderId },
        data: {
          status: 'PACKED',
          updatedBy: auth.user.id,
        },
      })

      // 更新订单时间节点 - 打包完成时间
      await tx.orderTimeline.upsert({
        where: { orderId },
        create: {
          tenantId: auth.user.tenantId,
          orderId,
          packingFirstActionAt: timeline.packingFirstActionAt,
          packedAt,
          packedBy: auth.user.id,
        },
        update: {
          packedAt,
          packedBy: auth.user.id,
        },
      })

      // 释放该订单的格口分配记录
      const cellAllocation = await tx.sortingCellAllocation.findFirst({
        where: { orderId, status: { in: ['ALLOCATED', 'SORTING', 'COMPLETED'] } },
        select: { id: true, sortingTaskId: true, sortingWallId: true, sortingCellId: true },
      })

      if (cellAllocation) {
        // 将格口分配状态更新为 RELEASED
        await tx.sortingCellAllocation.update({
          where: { id: cellAllocation.id },
          data: { status: 'RELEASED' },
        })

        // 将该格口状态重置为 EMPTY（订单已打包，格口可重新使用）
        if (cellAllocation.sortingCellId) {
          await tx.sortingCell.update({
            where: { id: cellAllocation.sortingCellId },
            data: { status: 'EMPTY' },
          })
        }

        // 检查该分拣任务是否还有未释放的格口
        const remainingCells = await tx.sortingCellAllocation.count({
          where: {
            sortingTaskId: cellAllocation.sortingTaskId,
            status: { not: 'RELEASED' },
          },
        })

        // 所有格口都已释放，重置播种墙
        if (remainingCells === 0) {
          // 播种墙恢复为空闲（因为一个播种墙只能绑定一个拣货单）
          await tx.sortingWall.update({
            where: { id: cellAllocation.sortingWallId },
            data: { sortStatus: 'IDLE' },
          })
        }
      }

      // 更新出库单扩展表的签出重量
      if (finalWeight > 0) {
        await tx.outboundOrderExtension.upsert({
          where: { orderId },
          create: {
            tenantId: auth.user.tenantId,
            orderId,
            checkOutWeightKg: finalWeight,
          },
          update: {
            checkOutWeightKg: finalWeight,
          },
        })
      }

      // 记录包材使用
      if (packagingMaterials && packagingMaterials.length > 0) {
        for (const material of packagingMaterials) {
          const materialInfo = await tx.packagingMaterial.findUnique({
            where: { id: material.materialId },
          })

          if (materialInfo) {
            // 查询当前库存
            const currentInventory = await tx.packagingMaterialInventory.findFirst({
              where: {
                tenantId: auth.user.tenantId,
                warehouseId: pickOrder.warehouseId,
                materialId: material.materialId,
              },
            })

            const quantityBefore = currentInventory?.totalQuantity ?? 0
            const quantityAfter = quantityBefore - material.quantity

            // 转换 unitPrice 为数字
            const unitPrice = materialInfo.unitPrice
              ? (typeof materialInfo.unitPrice === 'object' && 'toNumber' in materialInfo.unitPrice
                  ? materialInfo.unitPrice.toNumber()
                  : Number(materialInfo.unitPrice))
              : 0

            await tx.packagingMaterialUsage.create({
              data: {
                tenantId: auth.user.tenantId,
                warehouseId: pickOrder.warehouseId,
                orderId,
                orderNumber: order.orderNumber,
                materialId: material.materialId,
                materialCode: materialInfo.materialCode,
                materialName: materialInfo.materialName,
                quantity: material.quantity,
                unitCost: unitPrice,
                totalCost: unitPrice * material.quantity,
                packedBy: auth.user.id,
              },
            })

            // 扣减包材库存
            await tx.packagingMaterialInventory.updateMany({
              where: {
                tenantId: auth.user.tenantId,
                warehouseId: pickOrder.warehouseId,
                materialId: material.materialId,
              },
              data: {
                totalQuantity: { decrement: material.quantity },
                availableQuantity: { decrement: material.quantity },
                lastMovementAt: new Date(),
              },
            })

            // 记录包材库存流水
            await tx.packagingMaterialTransaction.create({
              data: {
                tenantId: auth.user.tenantId,
                warehouseId: pickOrder.warehouseId,
                materialId: material.materialId,
                materialCode: materialInfo.materialCode,
                materialName: materialInfo.materialName,
                transactionType: 'ORDER_OUTBOUND',
                quantityChange: -material.quantity,
                quantityBefore,
                quantityAfter,
                referenceType: 'SALES_ORDER',
                referenceId: orderId,
                referenceNumber: order.orderNumber,
                unitCost: unitPrice,
                totalCost: unitPrice * material.quantity,
                operatorId: auth.user.id,
                operatorName: auth.user.name || '未知',
              },
            })
          }
        }
      }

      // 检查拣货单的所有行项目是否都已打包完成
      const allLines = await tx.pickOrderLine.findMany({
        where: { pickOrderId },
      })
      const allPacked = allLines.every(line => line.packedQty >= line.expectedQty)

      if (allPacked) {
        // 更新拣货单状态为已完成
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
      }

      // 创建发货单
      const newShipment = await tx.shipment.create({
        data: {
          tenantId: auth.user.tenantId,
          warehouseId: pickOrder.warehouseId,
          orderId,
          shipmentNumber,
          status: 'CREATED',
          packageCount: 1,
          totalWeightKg: finalWeight,
          outbound_address_id: order.outbound_address_id || '',
          createdBy: auth.user.id,
          updatedBy: auth.user.id,
        },
      })

      const videoWindow = buildPackingVideoWindow({
        orderId,
        packingFirstActionAt: timeline.packingFirstActionAt,
        packingStartAt: timeline.packingStartAt,
        packedAt,
      })

      return { shipment: newShipment, isPickOrderComplete: allPacked, videoWindow }
    })

    const { shipment, isPickOrderComplete, videoWindow } = result

    // 记录操作日志
    operationLogService.logOperation({
      tenantId: auth.user.tenantId,
      entityType: 'OUTBOUND_ORDER',
      entityId: orderId,
      entityNumber: order.orderNumber,
      operationType: ORDER_OPERATION_TYPES.COMPLETE_PACK.type,
      operationName: ORDER_OPERATION_TYPES.COMPLETE_PACK.name,
      beforeStatus: order.status,
      afterStatus: 'PACKED',
      remark: '订单打包完成',
      operatorId: auth.user.id,
      operatorName: auth.user.name || undefined,
      metadata: {
        pickOrderId,
        weight: finalWeight,
        packagingMaterials,
        shipmentId: shipment.id,
        shipmentNumber,
      },
    })

    // 生成条码图片
    const barcodeImage = await generateBarcode(shipmentNumber, {
      bcid: 'code128',
      scale: 3,
      height: 12,
      includetext: true,
    })

    // 构建标签数据 (10×15cm = 100×150mm)
    const labelData = {
      labelSize: { width: 100, height: 150 },
      shipmentId: shipment.id,
      shipmentNumber,
      orderNumber: order.orderNumber,
      referenceNumber: order.referenceNumber,
      // 收货人信息
      recipientName: orderAddress?.shippingName || '',
      recipientPhone: orderAddress?.shippingPhone || '',
      recipientAddress: [
        orderAddress?.shippingProvince,
        orderAddress?.shippingCity,
        orderAddress?.shippingLine1,
        orderAddress?.shippingLine2,
      ].filter(Boolean).join(''),
      recipientPostalCode: orderAddress?.shippingPostalCode || '',
      // 发货信息
      warehouseName,
      weight: finalWeight,
      packageCount: 1,
      // 条码
      barcodeType: 'CODE128',
      barcodeContent: shipmentNumber,
      barcodeImage,
      // 时间
      printTime: new Date().toISOString(),
    }

    return NextResponse.json({
      data: {
        message: '订单打包完成',
        orderId,
        orderNumber: order.orderNumber,
        isPickOrderComplete,
        shipment: {
          id: shipment.id,
          shipmentNumber,
        },
        labelData,
        videoWindow,
      },
    })
  } catch (error) {
    console.error('完成订单打包失败:', error)
    return NextResponse.json(
      { message: '完成订单打包失败' },
      { status: 500 }
    )
  }
})
