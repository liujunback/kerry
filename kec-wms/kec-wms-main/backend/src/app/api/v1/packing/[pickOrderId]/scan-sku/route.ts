import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { ensurePackingFirstActionAt } from '@/lib/packing/video-window'
import { isSingleOneHotPickOrderTaskType } from '@/lib/packing/task-type'
import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'

const scanSkuSchema = z.object({
  barcode: z.string().min(1, '条码不能为空'),
  quantity: z.number().int().positive('数量必须大于0'),
  serialNumbers: z.array(z.string()).optional(),
  orderId: z.string().optional(), // 可选的订单ID，用于限制只打包指定订单
})

export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ pickOrderId: string }> }
) => {
  try {
    const { pickOrderId } = await params
    const body = await request.json()

    const validation = scanSkuSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { barcode, quantity, serialNumbers, orderId } = validation.data

    // 查询拣货单
    const pickOrder = await prisma.pickOrder.findFirst({
      where: {
        id: pickOrderId,
        tenantId: auth.user.tenantId,
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
        { message: '拣货单状态不正确，请先开始打包' },
        { status: 400 }
      )
    }

    // 先检查是否是订单号
    const order = await prisma.outboundOrder.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          orderNumber: barcode,
      },
      select: { id: true, orderNumber: true },
    })

    if (order) {
      // 如果是订单号，返回该订单在当前拣货单中的行项目信息
      const orderLines = await prisma.pickOrderLine.findMany({
        where: {
          pickOrderId,
          orderId: order.id,
        },
        include: {
          sku: {
            select: {
              skuCode: true,
              skuName: true,
            },
          },
        },
        orderBy: { lineNumber: 'asc' },
      })

      if (orderLines.length === 0) {
        return NextResponse.json(
          { message: '该订单不在当前拣货单中' },
          { status: 400 }
        )
      }

      // 按SKU维度合并
      const skuMap = new Map<string, {
        lineId: string
        skuCode: string
        skuName: string | null
        expectedQty: number
        packedQty: number
      }>()

      for (const line of orderLines) {
        const skuCode = line.sku?.skuCode || line.skuCode
        const existing = skuMap.get(skuCode)
        if (existing) {
          existing.expectedQty += line.expectedQty
          existing.packedQty += line.packedQty
        } else {
          skuMap.set(skuCode, {
            lineId: line.id,
            skuCode,
            skuName: line.sku?.skuName || null,
            expectedQty: line.expectedQty,
            packedQty: line.packedQty,
          })
        }
      }

      const mergedLines = Array.from(skuMap.values())
      const totalExpected = mergedLines.reduce((sum, line) => sum + line.expectedQty, 0)
      const totalPacked = mergedLines.reduce((sum, line) => sum + line.packedQty, 0)
      const isComplete = mergedLines.every(line => line.packedQty >= line.expectedQty)

      return NextResponse.json({
        data: {
          type: 'ORDER_INFO',
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalExpected,
          totalPacked,
          isComplete,
          lines: mergedLines,
        },
      })
    }

    // 查找匹配的 SKU（通过条码或SKU编码）
    const sku = await prisma.sku.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          OR: [
          { barcode },
          { skuCode: barcode },
        ],
      },
    })

    if (!sku) {
      return NextResponse.json(
        { message: 'SKU不存在' },
        { status: 404 }
      )
    }

    // 查找拣货单中匹配的行项目（按订单创建时间排序，优先分配早创建的订单）
    // 使用 expectedQty 而不是 pickedQty，支持拣货未完成时也能打包
    const matchingLines = await prisma.pickOrderLine.findMany({
      where: {
        pickOrderId,
        skuId: sku.id,
        expectedQty: { gt: 0 },
        // 如果指定了 orderId，则只查找该订单的行项目
        ...(orderId ? { orderId } : {}),
      },
      include: {
        order: {
          select: { createdAt: true },
        },
        bucket: {
          select: { expiryDate: true },
        },
      },
      orderBy: {
        order: { createdAt: 'asc' },
      },
    })

    if (matchingLines.length === 0) {
      return NextResponse.json(
        { message: 'SKU不在拣货单中' },
        { status: 400 }
      )
    }

    // 找到第一个未完全打包的行项目（基于 expectedQty）
    const targetLine = matchingLines.find(line => line.packedQty < line.expectedQty)

    if (!targetLine) {
      return NextResponse.json(
        { message: '该SKU已全部打包完成' },
        { status: 400 }
      )
    }

    // 计算可打包数量（基于 expectedQty）
    const maxPackQty = targetLine.expectedQty - targetLine.packedQty
    if (quantity > maxPackQty) {
      return NextResponse.json(
        { message: `数量超过可打包数量，最大可打包：${maxPackQty}` },
        { status: 400 }
      )
    }

    // 验证序列号
    if (sku.isSerialManaged) {
      if (!serialNumbers || serialNumbers.length !== quantity) {
        return NextResponse.json(
          { message: `需要扫描 ${quantity} 个序列号` },
          { status: 400 }
        )
      }

      // 验证序列号是否存在且状态正确
        const existingSerials = await prisma.serialNumber.findMany({
          where: {
            tenantId: auth.user.tenantId,
            skuId: sku.id,
            serialNumber: { in: serialNumbers },
            status: 'IN_STOCK',
        },
      })

      if (existingSerials.length !== serialNumbers.length) {
        // 找出有问题的序列号
        const validSerialNumbers = existingSerials.map(s => s.serialNumber)
        const invalidSerialNumbers = serialNumbers.filter(sn => !validSerialNumbers.includes(sn))

        return NextResponse.json(
          {
            message: `序列号 ${invalidSerialNumbers.join(', ')} 不存在或状态不正确，请检查后重新扫描`
          },
          { status: 400 }
        )
      }
    }

    const shouldValidateWholePickOrderOnly =
      !orderId && isSingleOneHotPickOrderTaskType(pickOrder.taskType)

    if (shouldValidateWholePickOrderOnly) {
      await prisma.$transaction(async (tx) => {
        await ensurePackingFirstActionAt({
          tx,
          tenantId: auth.user.tenantId,
          orderId: targetLine.orderId,
        })
      })

      return NextResponse.json({
        data: {
          type: 'SKU_VALIDATED',
          skuCode: sku.skuCode,
          skuName: sku.skuName,
          taskType: pickOrder.taskType,
          isSelfPackaged: sku.isSelfPackaged,
          validatedOnly: true,
        },
      })
    }

    // 使用事务更新数据
    await prisma.$transaction(async (tx) => {
      await ensurePackingFirstActionAt({
        tx,
        tenantId: auth.user.tenantId,
        orderId: targetLine.orderId,
      })

      // 更新拣货单行项目的已打包数量
      await tx.pickOrderLine.update({
        where: { id: targetLine.id },
        data: {
          packedQty: targetLine.packedQty + quantity,
          updatedBy: auth.user.id,
        },
      })

      // 更新出库单行项目的已打包数量
      await tx.outboundOrderLine.update({
        where: { id: targetLine.orderLineId },
        data: {
          packedQty: { increment: quantity },
          updatedBy: auth.user.id,
        },
      })

      // 更新出库单的已打包数量
      await tx.outboundOrder.update({
        where: { id: targetLine.orderId },
        data: {
          totalPackedQty: { increment: quantity },
          updatedBy: auth.user.id,
        },
      })

      // 如果有序列号，更新序列号状态
      if (sku.isSerialManaged && serialNumbers && serialNumbers.length > 0) {
        await tx.serialNumber.updateMany({
          where: {
            tenantId: auth.user.tenantId,
            skuId: sku.id,
            serialNumber: { in: serialNumbers },
            status: 'IN_STOCK',
          },
          data: {
            status: 'PACKED',
            shippedOrderId: targetLine.orderId,
            updatedBy: auth.user.id,
          },
        })
      }
    })

    // 检查该订单是否已全部打包完成
    // 重新查询该订单的所有行项目
    const orderLines = await prisma.pickOrderLine.findMany({
      where: {
        pickOrderId,
        orderId: targetLine.orderId,
      },
      include: {
        order: {
          select: { orderNumber: true },
        },
      },
    })

    const pickOrderLines = await prisma.pickOrderLine.findMany({
      where: { pickOrderId },
      select: {
        id: true,
        expectedQty: true,
        packedQty: true,
      },
    })

    // 计算更新后的打包状态
    const isOrderComplete = orderLines.every(line => {
      // 如果是当前行，使用更新后的数量
      if (line.id === targetLine.id) {
        return (targetLine.packedQty + quantity) >= line.expectedQty
      }
      return line.packedQty >= line.expectedQty
    })

    const isPickOrderComplete = pickOrderLines.every(line => {
      if (line.id === targetLine.id) {
        return (targetLine.packedQty + quantity) >= line.expectedQty
      }
      return line.packedQty >= line.expectedQty
    })

    return NextResponse.json({
      data: {
        type: 'SKU_PACKED',
        lineId: targetLine.id,
        skuCode: sku.skuCode,
        skuName: sku.skuName,
        taskType: pickOrder.taskType,
        isSelfPackaged: sku.isSelfPackaged,
        packedQty: targetLine.packedQty + quantity,
        maxQty: maxPackQty,
        batchNumber: targetLine.batchNumber,
        expiryDate: targetLine.bucket?.expiryDate?.toISOString() || null,
        // 订单完成信息
        orderId: targetLine.orderId,
        orderNumber: orderLines[0]?.order?.orderNumber || '',
        isOrderComplete,
        isPickOrderComplete,
      },
    })
  } catch (error) {
    console.error('扫描SKU失败:', error)
    return NextResponse.json(
      { message: '扫描SKU失败' },
      { status: 500 }
    )
  }
})
