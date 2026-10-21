import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// GET /api/v1/shelving/sku/serial-numbers?skuId=xxx&warehouseId=xxx&putawayOrderId=xxx
// 查询 SKU 的可用序列号（已收货、未上架）
export const GET = createAuthHandler(async (request, auth) => {
  const tenantId = auth.user.tenantId
  const searchParams = request.nextUrl.searchParams
  const skuId = searchParams.get('skuId')
  const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
  const putawayOrderId = searchParams.get('putawayOrderId')

  if (!skuId) {
    return NextResponse.json(
      { success: false, message: '缺少 skuId 参数' },
      { status: 400 }
    )
  }

  // 如果提供了上架单ID，查询已锁定到该上架单的序列号
  if (putawayOrderId) {
    const serialNumbers = await prisma.serialNumber.findMany({
      where: {
        tenantId,
        skuId,
        status: 'IN_STOCK',
        putawayOrderId, // 已锁定到该上架单
        ...(warehouseId ? { warehouseId } : {}),
      },
      select: {
        serialNumber: true,
        receivedAt: true,
      },
      orderBy: {
        receivedAt: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      data: serialNumbers.map(sn => ({
        serialNumber: sn.serialNumber,
        receivedAt: sn.receivedAt,
      })),
    })
  }

  // 没有上架单ID时，查询所有未锁定的可用序列号
  const serialNumbers = await prisma.serialNumber.findMany({
    where: {
      tenantId,
      skuId,
      status: 'IN_STOCK',
      putawayOrderId: null, // 未被锁定
      ...(warehouseId ? { warehouseId } : {}),
    },
    select: {
      serialNumber: true,
      receivedAt: true,
    },
    orderBy: {
      receivedAt: 'asc', // 先进先出
    },
  })

  return NextResponse.json({
    success: true,
    data: serialNumbers.map(sn => ({
      serialNumber: sn.serialNumber,
      receivedAt: sn.receivedAt,
    })),
  })
})
