import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requireAnyPermissionForUser } from '@/lib/auth/user-permissions'
import { prisma } from '@/lib/db/prisma'
import { PICKING_EXCEPTION_READ_PERMISSION } from '@/lib/services/picking-exception-service'

export const GET = createAuthHandler(async (_request, auth, context) => {
  const permissionResponse = await requireAnyPermissionForUser(auth.user.id, [
    PICKING_EXCEPTION_READ_PERMISSION,
    'picking:read',
  ])
  if (permissionResponse) return permissionResponse

  const { id } = await context!.params
  const exceptionCase = await prisma.pickingExceptionCase.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
    },
  })

  if (!exceptionCase) {
    return NextResponse.json({ success: false, message: '拣货异常不存在' }, { status: 404 })
  }

  const [lines, warehouse, supplements] = await Promise.all([
    prisma.pickingExceptionLine.findMany({
      where: {
        tenantId: auth.user.tenantId,
        caseId: exceptionCase.id,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.warehouse.findUnique({
      where: { id: exceptionCase.warehouseId },
      select: { id: true, warehouseCode: true, warehouseName: true },
    }),
    prisma.supplementPickOrder.findMany({
      where: {
        tenantId: auth.user.tenantId,
        caseId: exceptionCase.id,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const supplementIds = supplements.map((item) => item.id)
  const supplementLines = supplementIds.length > 0
    ? await prisma.supplementPickOrderLine.findMany({
        where: {
          tenantId: auth.user.tenantId,
          supplementPickOrderId: { in: supplementIds },
        },
        orderBy: { createdAt: 'asc' },
      })
    : []

  return NextResponse.json({
    success: true,
    data: {
      ...exceptionCase,
      warehouse,
      lines,
      supplementOrders: supplements.map((order) => ({
        ...order,
        lines: supplementLines.filter((line) => line.supplementPickOrderId === order.id),
      })),
    },
  })
})
