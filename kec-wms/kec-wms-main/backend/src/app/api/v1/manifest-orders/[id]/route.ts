'use server'

import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const tenantId = auth.user.tenantId
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const manifestOrder = await prisma.manifestOrder.findFirst({
      where: {
        id,
        tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      include: {
        warehouse: {
          select: { warehouseCode: true, warehouseName: true },
        },
        client: {
          select: { clientCode: true, clientName: true },
        },
        checkoutOrders: {
          include: {
            records: {
              include: {
                scannedByUser: {
                  select: {
                    username: true,
                    fullName: true,
                  },
                },
                order: {
                  select: {
                    extension: {
                      select: { checkOutWeightKg: true },
                    },
                  },
                },
              },
              orderBy: { sequenceNumber: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!manifestOrder) {
      return NextResponse.json(
        { success: false, error: 'Manifest order not found' },
        { status: 404 }
      )
    }

    // 查询创建人信息
    let createdByUser: { username: string; fullName: string } | null = null
    if (manifestOrder.createdBy) {
      createdByUser = await prisma.user.findUnique({
        where: { id: manifestOrder.createdBy },
        select: { username: true, fullName: true },
      })
    }

    // 计算总重量（从所有 checkout records 汇总）
    const totalWeightKg = manifestOrder.checkoutOrders.reduce((sum, checkout) => {
      const checkoutWeight = checkout.records.reduce((recordSum, record) => {
        const weight = parseFloat(record.order?.extension?.checkOutWeightKg?.toString() ?? '0')
        return recordSum + (isNaN(weight) ? 0 : weight)
      }, 0)
      return sum + checkoutWeight
    }, 0)

    return NextResponse.json({
      success: true,
      data: {
        ...manifestOrder,
        createdByUser,
        totalWeightKg: totalWeightKg > 0 ? totalWeightKg.toFixed(3) : null,
      },
    })
  } catch (error) {
    console.error('Failed to fetch manifest order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch manifest order' },
      { status: 500 }
    )
  }
})
