import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import {
  canDirectScanPickOrderForPacking,
  getPickOrderTaskTypeLabel,
  isFixedComboPickOrderTaskType,
  isSingleMultiHotPickOrderTaskType,
} from '@/lib/packing/task-type'
import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'

const lookupSchema = z.object({
  scanCode: z.string().min(1, '扫描码不能为空'),
})

// 识别扫描码类型
type ScanType = 'PICK_ORDER' | 'CONTAINER' | 'ORDER' | 'CELL'

function detectScanType(code: string): ScanType {
  // 拣货单号：PK- 开头
  if (code.startsWith('PK-')) {
    return 'PICK_ORDER'
  }
  // 框号/容器号：BOX- 或 CT- 开头
  if (code.startsWith('BOX-') || code.startsWith('CT-')) {
    return 'CONTAINER'
  }
  // 格口号：任意播种墙前缀 + 格口位置码（如 WL001-A1、WL-002-A1）或纯格口位置码（如 A1, B02）
  if (/^.+-[A-Z]\d{1,2}$/.test(code)) {
    return 'CELL'
  }
  if (/^[A-Z]\d{1,2}$/.test(code)) {
    return 'CELL'
  }
  // 默认当作订单号处理
  return 'ORDER'
}

// 拣货单查询的 include 配置
const pickOrderInclude = {
  warehouse: {
    select: { id: true, warehouseName: true },
  },
  lines: {
    include: {
      sku: {
        select: {
          id: true,
          skuCode: true,
          skuName: true,
          barcode: true,
          isSerialManaged: true,
          isBatchManaged: true,
          isExpiryManaged: true,
          isSelfPackaged: true,
        },
      },
      location: {
        select: {
          locationCode: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          createdAt: true,
          extension: {
            select: { channel: true },
          },
        },
      },
      bucket: {
        select: {
          expiryDate: true,
        },
      },
    },
    orderBy: [
      { order: { createdAt: 'asc' as const } },
      { lineNumber: 'asc' as const },
    ],
  },
}

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    // 兼容旧参数名 taskNumber
    const scanCode = searchParams.get('scanCode') || searchParams.get('taskNumber')
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))

    const validation = lookupSchema.safeParse({ scanCode })
    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const code = validation.data.scanCode
    const scanType = detectScanType(code)

    let pickOrder = null
    let scannedOrderId: string | null = null
    let scannedOrderNumber: string | null = null

    if (scanType === 'PICK_ORDER') {
      // 直接按拣货单号查询
      pickOrder = await prisma.pickOrder.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          taskNumber: code,
        },
        include: pickOrderInclude,
      })
    } else if (scanType === 'ORDER') {
      // 按订单号查询关联的拣货单 - 只返回订单相关数据，不加载整个拣货单
      const order = await prisma.outboundOrder.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          orderNumber: code,
        },
        select: { id: true, orderNumber: true, status: true },
      })
      if (!order) {
        return NextResponse.json(
          { message: '未找到该订单' },
          { status: 404 }
        )
      }

      // 检查订单是否已关箱（PACKED 及之后的状态都算已完成）
      const completedStatuses = ['PACKED', 'CHECKOUT_PENDING', 'CHECKED_OUT']
      if (completedStatuses.includes(order.status)) {
        return NextResponse.json(
          { message: '该订单已关箱完成，无法继续打包' },
          { status: 400 }
        )
      }

      scannedOrderId = order.id
      scannedOrderNumber = order.orderNumber

      // 查找包含该订单的拣货单（只获取基本信息）
      const pickOrderLine = await prisma.pickOrderLine.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          orderId: order.id,
        },
        select: { pickOrderId: true },
      })

      if (!pickOrderLine) {
        return NextResponse.json(
          { message: '未找到该订单关联的拣货单' },
          { status: 404 }
        )
      }

      // 获取拣货单基本信息
      const pickOrderBasic = await prisma.pickOrder.findFirst({
        where: {
          id: pickOrderLine.pickOrderId,
          tenantId: auth.user.tenantId,
        },
        select: {
          id: true,
          taskNumber: true,
          taskType: true,
          status: true,
          order_business_type: true,
          warehouseId: true,
          warehouse: {
            select: { warehouseName: true },
          },
        },
      })

      if (!pickOrderBasic) {
        return NextResponse.json(
          { message: '未找到该订单关联的拣货单' },
          { status: 404 }
        )
      }

      // 只获取该订单的行项目
      const orderLines = await prisma.pickOrderLine.findMany({
        where: {
          pickOrderId: pickOrderBasic.id,
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
        orderBy: { lineNumber: 'asc' as const },
      })

      // 按SKU维度合并
      const skuMap = new Map<string, {
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
      const allScanned = mergedLines.every(line => line.packedQty >= line.expectedQty)

      // 检查订单是否已关箱（PACKED 及之后的状态都算已完成）
      const isComplete = ['PACKED', 'CHECKOUT_PENDING', 'CHECKED_OUT'].includes(order.status)

      // 返回订单模式的响应
      return NextResponse.json({
        data: {
          scanType: 'ORDER',
          scannedOrderId: order.id,
          scannedOrderNumber: order.orderNumber,
          // 拣货单基本信息（用于打包操作）
          pickOrder: {
            id: pickOrderBasic.id,
            taskNumber: pickOrderBasic.taskNumber,
            taskType: pickOrderBasic.taskType,
            status: pickOrderBasic.status,
            orderBusinessType: pickOrderBasic.order_business_type,
            warehouseId: pickOrderBasic.warehouseId,
            warehouseName: pickOrderBasic.warehouse?.warehouseName || '',
          },
          // 订单信息
          orderInfo: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalExpected,
            totalPacked,
            isComplete,
            lines: mergedLines,
          },
          // 如果所有SKU已扫描但未关箱，设置待关箱订单
          pendingCloseOrder: allScanned && !isComplete ? {
            orderId: order.id,
            orderNumber: order.orderNumber,
          } : null,
        },
      })
    } else if (scanType === 'CONTAINER') {
      // 按容器号/LPN查询关联的拣货单
      const pickOrderLine = await prisma.pickOrderLine.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          lpn: code,
        },
        select: { pickOrderId: true },
      })
      if (pickOrderLine) {
        pickOrder = await prisma.pickOrder.findFirst({
          where: {
            id: pickOrderLine.pickOrderId,
            tenantId: auth.user.tenantId,
          },
          include: pickOrderInclude,
        })
      }
      if (!pickOrder) {
        return NextResponse.json(
          { message: '未找到该容器关联的拣货单' },
          { status: 404 }
        )
      }
    } else if (scanType === 'CELL') {
      // 格口号查询 - 根据格口编码查找分配的订单
      // 1. 查找格口（如果提供了 warehouseId 则精确匹配，否则查找并检查唯一性）
      const cellWhere = warehouseId
        ? { tenantId: auth.user.tenantId, warehouseId, cellCode: code }
        : { tenantId: auth.user.tenantId, cellCode: code }

      const cells = await prisma.sortingCell.findMany({
        where: cellWhere,
        select: { id: true, cellCode: true, sortingWallId: true, warehouseId: true },
      })

      if (cells.length === 0) {
        return NextResponse.json({ message: '未找到该格口' }, { status: 404 })
      }
      if (cells.length > 1) {
        return NextResponse.json(
          { message: '该格口编码在多个仓库中存在，请在扫描时指定仓库' },
          { status: 400 }
        )
      }
      const cell = cells[0]

      // 2. 查找格口分配记录
      const cellAllocation = await prisma.sortingCellAllocation.findFirst({
        where: {
          sortingCellId: cell.id,
          status: { in: ['ALLOCATED', 'SORTING', 'COMPLETED', 'RELEASED'] },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          orderId: true,
          orderNumber: true,
          sortingTaskId: true,
        },
      })

      if (!cellAllocation) {
        return NextResponse.json(
          { message: '该格口未分配订单或订单已完成' },
          { status: 404 }
        )
      }

      // 3. 获取订单信息
      const order = await prisma.outboundOrder.findFirst({
        where: {
          id: cellAllocation.orderId,
          tenantId: auth.user.tenantId,
        },
        select: { id: true, orderNumber: true, status: true },
      })

      if (!order) {
        return NextResponse.json(
          { message: '未找到该订单' },
          { status: 404 }
        )
      }

      // 检查订单是否已关箱
      const completedStatuses = ['PACKED', 'CHECKOUT_PENDING', 'CHECKED_OUT']
      if (completedStatuses.includes(order.status)) {
        return NextResponse.json(
          { message: '该订单已关箱完成，无法继续打包' },
          { status: 400 }
        )
      }

      scannedOrderId = order.id
      scannedOrderNumber = order.orderNumber

      // 4. 查找包含该订单的拣货单
      const pickOrderLine = await prisma.pickOrderLine.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          orderId: order.id,
        },
        select: { pickOrderId: true },
      })

      if (!pickOrderLine) {
        return NextResponse.json(
          { message: '未找到该订单关联的拣货单' },
          { status: 404 }
        )
      }

      // 5. 获取拣货单基本信息
      const pickOrderBasic = await prisma.pickOrder.findFirst({
        where: {
          id: pickOrderLine.pickOrderId,
          tenantId: auth.user.tenantId,
        },
        select: {
          id: true,
          taskNumber: true,
          taskType: true,
          status: true,
          order_business_type: true,
          warehouseId: true,
          warehouse: {
            select: { warehouseName: true },
          },
        },
      })

      if (!pickOrderBasic) {
        return NextResponse.json(
          { message: '未找到该订单关联的拣货单' },
          { status: 404 }
        )
      }

      // 6. 只获取该订单的行项目
      const orderLines = await prisma.pickOrderLine.findMany({
        where: {
          pickOrderId: pickOrderBasic.id,
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
      })

      // 构造返回数据（订单模式）- 与ORDER扫描格式一致
      const skuMap = new Map<string, {
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
      const allScanned = mergedLines.every(line => line.packedQty >= line.expectedQty)
      const isComplete = ['PACKED', 'CHECKOUT_PENDING', 'CHECKED_OUT'].includes(order.status)

      return NextResponse.json({
        data: {
          scanType: 'ORDER',
          cellCode: cell.cellCode,
          scannedOrderId: order.id,
          scannedOrderNumber: order.orderNumber,
          pickOrder: {
            id: pickOrderBasic.id,
            taskNumber: pickOrderBasic.taskNumber,
            taskType: pickOrderBasic.taskType,
            status: pickOrderBasic.status,
            orderBusinessType: pickOrderBasic.order_business_type,
            warehouseId: pickOrderBasic.warehouseId,
            warehouseName: pickOrderBasic.warehouse?.warehouseName || '',
          },
          orderInfo: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalExpected,
            totalPacked,
            isComplete,
            lines: mergedLines,
          },
          pendingCloseOrder: allScanned && !isComplete ? {
            orderId: order.id,
            orderNumber: order.orderNumber,
          } : null,
        },
      })
    }

    if (!pickOrder) {
      // 尝试按拣货单号查询（兜底）
      pickOrder = await prisma.pickOrder.findFirst({
        where: {
          tenantId: auth.user.tenantId,
          taskNumber: code,
        },
        include: pickOrderInclude,
      })
    }

    if (!pickOrder) {
      return NextResponse.json(
        { message: '未找到相关拣货单' },
        { status: 404 }
      )
    }

    if (scanType === 'PICK_ORDER' && !canDirectScanPickOrderForPacking(pickOrder.taskType)) {
      return NextResponse.json(
        {
          message: `拣货单类型“${getPickOrderTaskTypeLabel(pickOrder.taskType)}”不支持直接扫描拣货单号打包，请改为扫描订单号或格口号`,
        },
        { status: 400 }
      )
    }

    // 验证状态：拣货中、已拣货、打包中或已完成的拣货单才能打包
    if (!['IN_PROGRESS', 'PICKED', 'COMPLETED', 'PACKING'].includes(pickOrder.status)) {
      return NextResponse.json(
        { message: `拣货单状态不正确，当前状态：${pickOrder.status}` },
        { status: 400 }
      )
    }

    // 计算汇总信息
    // 使用 expectedQty 作为总数量，因为 pickedQty 在拣货未完成时可能为 0
    const totalQty = pickOrder.lines.reduce((sum, line) => sum + line.expectedQty, 0)
    const packedQty = pickOrder.lines.reduce((sum, line) => sum + line.packedQty, 0)
    const unpackedQty = totalQty - packedQty
    // 如果拣货单状态是已拣货或已完成，已拣货数量等于总数量
    const pickedQty = ['PICKED', 'COMPLETED'].includes(pickOrder.status)
      ? totalQty
      : pickOrder.pickedQty

    // 统计订单总数（去重）
    const totalOrders = new Set(pickOrder.lines.map(line => line.orderId)).size

    // 获取订单类型和渠道（取第一个订单的信息）
    const firstLine = pickOrder.lines[0]
    const orderType = firstLine?.order?.orderType || 'SINGLE_ITEM_SINGLE'
    const channel = firstLine?.order?.extension?.channel || null
    const skuCode = firstLine?.sku?.skuCode || ''

    // 构建响应数据
    const response = {
      scanType,
      scannedOrderId,
      scannedOrderNumber,
      pickOrder: {
        id: pickOrder.id,
        taskNumber: pickOrder.taskNumber,
        taskType: pickOrder.taskType,
        status: pickOrder.status,
        orderBusinessType: pickOrder.order_business_type,
        totalLines: pickOrder.totalLines,
        totalQty: pickOrder.totalQty,
        totalOrders,
        pickedQty,
        packedQty,
        warehouseId: pickOrder.warehouseId,
        warehouseName: pickOrder.warehouse?.warehouseName || '',
      },
      lines: pickOrder.lines.map(line => ({
        id: line.id,
        lineNumber: line.lineNumber,
        skuId: line.skuId,
        skuCode: line.skuCode,
        skuName: line.sku?.skuName || null,
        barcode: line.sku?.barcode || null,
        locationCode: line.location?.locationCode || null,
        expectedQty: line.expectedQty,
        // 如果拣货单状态是已拣货或已完成，已拣货数量等于期望数量
        pickedQty: ['PICKED', 'COMPLETED'].includes(pickOrder.status)
          ? line.expectedQty
          : line.pickedQty,
        packedQty: line.packedQty,
        status: line.status,
        orderId: line.orderId,
        orderNumber: line.order?.orderNumber || '',
        orderType: line.order?.orderType || 'SINGLE_ITEM_SINGLE',
        channel: line.order?.extension?.channel || null,
        batchNumber: line.batchNumber,
        expiryDate: line.bucket?.expiryDate?.toISOString() || null,
        isSerialManaged: line.sku?.isSerialManaged || false,
        isBatchManaged: line.sku?.isBatchManaged || false,
        isExpiryManaged: line.sku?.isExpiryManaged || false,
        isSelfPackaged: line.sku?.isSelfPackaged || false,
      })),
      summary: {
        orderType,
        channel,
        skuCode,
        totalQty,
        unpackedQty,
      },
    }

    // 检查是否有已打包完成但未关箱的订单
    // 按订单分组，检查每个订单的打包状态
    const orderMap = new Map<string, { orderId: string; orderNumber: string; totalExpected: number; totalPacked: number }>()
    for (const line of pickOrder.lines) {
      const existing = orderMap.get(line.orderId)
      if (existing) {
        existing.totalExpected += line.expectedQty
        existing.totalPacked += line.packedQty
      } else {
        orderMap.set(line.orderId, {
          orderId: line.orderId,
          orderNumber: line.order?.orderNumber || '',
          totalExpected: line.expectedQty,
          totalPacked: line.packedQty,
        })
      }
    }

    // 找出已打包完成但未关箱的订单（packedQty >= expectedQty 且订单状态不是已关箱）
    const packedStatuses = ['PACKED', 'CHECKOUT_PENDING', 'CHECKED_OUT']
    let pendingCloseOrder: { orderId: string; orderNumber: string } | null = null
    const shouldTrackPendingCloseOrder = !(
      isFixedComboPickOrderTaskType(pickOrder.taskType)
      || isSingleMultiHotPickOrderTaskType(pickOrder.taskType)
    )
    if (shouldTrackPendingCloseOrder) {
      for (const [orderId, orderInfo] of orderMap) {
        if (orderInfo.totalPacked >= orderInfo.totalExpected && orderInfo.totalExpected > 0) {
          // 检查订单状态是否已关箱
          const order = await prisma.outboundOrder.findUnique({
            where: { id: orderId },
            select: { status: true },
          })
          if (order && !packedStatuses.includes(order.status)) {
            pendingCloseOrder = {
              orderId: orderInfo.orderId,
              orderNumber: orderInfo.orderNumber,
            }
            break
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        ...response,
        pendingCloseOrder,
      }
    })
  } catch (error) {
    console.error('查询拣货单失败:', error)
    return NextResponse.json(
      { message: '查询拣货单失败' },
      { status: 500 }
    )
  }
})
