'use server'

import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'

export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params
    const tenantId = auth.user.tenantId

    const checkoutOrder = await prisma.checkoutOrder.findFirst({
      where: { id, tenantId },
      include: {
        warehouse: {
          select: { warehouseCode: true, warehouseName: true },
        },
        manifestOrder: {
          select: { id: true, manifestNumber: true, status: true },
        },
        records: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                referenceNumber: true,
                platform: true,
                status: true,
                client: {
                  select: { clientCode: true, clientName: true },
                },
                extension: {
                  select: { checkOutWeightKg: true },
                },
              },
            },
            shipment: {
              select: { trackingNumber: true },
            },
            scannedByUser: {
              select: { username: true, fullName: true },
            },
          },
          orderBy: { sequenceNumber: 'asc' },
        },
      },
    })

    if (!checkoutOrder) {
      return NextResponse.json(
        { success: false, error: 'Checkout order not found' },
        { status: 404 }
      )
    }

    // 获取操作人信息
    const operatorIds = [
      checkoutOrder.checkedOutBy,
      checkoutOrder.mountedBy,
      checkoutOrder.manifestedBy,
      checkoutOrder.createdBy,
    ].filter(Boolean) as string[]

    const operators = operatorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: operatorIds } },
          select: { id: true, username: true, fullName: true },
        })
      : []
    const operatorMap = new Map(operators.map(o => [o.id, o]))

    const formattedData = {
      ...checkoutOrder,
      checkedOutByUser: checkoutOrder.checkedOutBy ? operatorMap.get(checkoutOrder.checkedOutBy) : null,
      mountedByUser: checkoutOrder.mountedBy ? operatorMap.get(checkoutOrder.mountedBy) : null,
      manifestedByUser: checkoutOrder.manifestedBy ? operatorMap.get(checkoutOrder.manifestedBy) : null,
      createdByUser: checkoutOrder.createdBy ? operatorMap.get(checkoutOrder.createdBy) : null,
    }

    return NextResponse.json({ success: true, data: formattedData })
  } catch (error) {
    console.error('Failed to fetch checkout order detail:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch checkout order detail' },
      { status: 500 }
    )
  }
})
