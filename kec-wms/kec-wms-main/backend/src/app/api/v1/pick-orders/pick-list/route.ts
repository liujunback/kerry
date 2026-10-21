import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// POST /api/v1/pick-orders/pick-list - 获取拣货单打印数据
export const POST = createAuthHandler(async (request, auth) => {
  const body = await request.json()
  const { taskIds } = body

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return NextResponse.json(
      { success: false, message: '请选择要打印的拣货单' },
      { status: 400 }
    )
  }

  // 获取拣货单及其明细
  const tasks = await prisma.pickOrder.findMany({
    where: {
      id: { in: taskIds },
      tenantId: auth.user.tenantId,
    },
    include: {
      warehouse: {
        select: {
          warehouseCode: true,
          warehouseName: true,
        },
      },
      wave: {
        select: {
          waveNumber: true,
        },
      },
      lines: {
        include: {
          location: {
            select: {
              locationCode: true,
              zone: {
                select: {
                  zoneName: true,
                  zoneType: true,
                },
              },
            },
          },
          order: {
            select: {
              orderNumber: true,
              extension: {
                select: {
                  channel: true,
                },
              },
            },
          },
          sku: {
            select: {
              skuName: true,
              barcode: true,
            },
          },
        },
        orderBy: [
          { location: { locationCode: 'asc' } },
          { lineNumber: 'asc' },
        ],
      },
    },
  })

  if (tasks.length === 0) {
    return NextResponse.json(
      { success: false, message: '未找到指定的拣货单' },
      { status: 404 }
    )
  }

  // 构建打印数据
  const printData = tasks.map((task) => {
    const lines = task.lines.map((line, index) => ({
      lineNumber: index + 1,
      locationCode: line.location?.locationCode || '',
      zoneName: line.location?.zone?.zoneName || '',
      zoneType: line.location?.zone?.zoneType || '',
      skuCode: line.skuCode,
      skuName: line.sku?.skuName || '',
      barcode: line.sku?.barcode || '',
      batchNumber: line.batchNumber || '',
      lpn: line.lpn || '',
      expectedQty: line.expectedQty,
      orderNumber: line.order?.orderNumber || '',
    }))

    // 获取渠道信息
    const channels = [...new Set(task.lines.map(l => l.order?.extension?.channel).filter(Boolean))]

    return {
      templateType: 'PICK_ORDER',
      taskNumber: task.taskNumber,
      taskType: task.taskType,
      warehouseCode: task.warehouse?.warehouseCode || '',
      warehouseName: task.warehouse?.warehouseName || '',
      waveNumber: task.wave?.waveNumber || '',
      channels: channels.join(', '),
      totalLines: task.totalLines,
      totalQty: task.totalQty,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      lines,
    }
  })

  return NextResponse.json({
    success: true,
    data: printData,
  })
})
