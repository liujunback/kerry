import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// POST /api/v1/waves/pick-list - 获取波次拣货清单打印数据
export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const { waveIds } = body
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    if (!waveIds || !Array.isArray(waveIds) || waveIds.length === 0) {
      return NextResponse.json(
        { success: false, message: '请选择要打印的波次' },
        { status: 400 }
      )
    }

    const uniqueWaveIds = [...new Set(waveIds)]

    const waves = await prisma.wave.findMany({
      where: {
        id: { in: uniqueWaveIds },
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      include: {
        warehouse: {
          select: {
            warehouseCode: true,
            warehouseName: true,
          },
        },
        pickOrders: {
          select: {
            id: true,
          },
        },
      },
    })

    if (waves.length === 0) {
      return NextResponse.json(
        { success: false, message: '未找到指定的波次' },
        { status: 404 }
      )
    }

    if (waves.length !== uniqueWaveIds.length) {
      return NextResponse.json(
        { success: false, message: '存在无权限访问的波次' },
        { status: 404 }
      )
    }

    const pickOrderIds = waves.flatMap((wave) => wave.pickOrders.map((pickOrder) => pickOrder.id))
    const pickOrders = pickOrderIds.length > 0
      ? await prisma.pickOrder.findMany({
          where: {
            id: { in: pickOrderIds },
            tenantId: auth.user.tenantId,
            ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
          },
          include: {
            lines: {
              include: {
                location: {
                  select: {
                    locationCode: true,
                  },
                },
                order: {
                  select: {
                    orderNumber: true,
                  },
                },
              },
              orderBy: {
                lineNumber: 'asc',
              },
            },
          },
        })
      : []

    const pickOrderMap = new Map(pickOrders.map((pickOrder) => [pickOrder.id, pickOrder]))

    const printData = waves.map((wave) => {
      const createdAt =
        wave.createdAt instanceof Date
          ? wave.createdAt.toISOString()
          : new Date(wave.createdAt).toISOString()

      const lines = wave.pickOrders
        .flatMap((task) => pickOrderMap.get(task.id)?.lines || [])
        .sort((a, b) => {
          const locationA = a.location?.locationCode || ''
          const locationB = b.location?.locationCode || ''
          if (locationA !== locationB) {
            return locationA.localeCompare(locationB)
          }
          return a.lineNumber - b.lineNumber
        })
        .map((line) => ({
          lineNumber: line.lineNumber,
          locationCode: line.location?.locationCode || '',
          skuCode: line.skuCode,
          batchNumber: line.batchNumber || '',
          lpn: line.lpn || '',
          expectedQty: line.expectedQty,
          orderNumber: line.order?.orderNumber || '',
        }))

      return {
        templateType: 'WAVE_PICK_LIST',
        waveNumber: wave.waveNumber,
        warehouseName: wave.warehouse?.warehouseName || '',
        waveType: wave.waveType,
        pickStrategy: wave.pickStrategy,
        totalOrders: wave.totalOrders,
        totalLines: wave.totalLines,
        totalQty: wave.totalQty,
        createdAt,
        lines,
      }
    })

    return NextResponse.json({
      success: true,
      data: printData,
    })
  } catch (error) {
    console.error('获取拣货清单失败:', error)
    return NextResponse.json(
      { success: false, message: '获取拣货清单失败' },
      { status: 500 }
    )
  }
})
