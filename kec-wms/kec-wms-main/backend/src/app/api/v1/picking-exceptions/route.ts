import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requireAnyPermissionForUser } from '@/lib/auth/user-permissions'
import { prisma } from '@/lib/db/prisma'
import { PICKING_EXCEPTION_READ_PERMISSION } from '@/lib/services/picking-exception-service'

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20),
  orderNumber: z.string().trim().optional().nullable(),
  pickOrderNumber: z.string().trim().optional().nullable(),
  skuCode: z.string().trim().optional().nullable(),
  warehouseId: z.string().trim().optional().nullable(),
  supplementStatus: z.string().trim().optional().nullable(),
  printStatus: z.string().trim().optional().nullable(),
  status: z.string().trim().optional().nullable(),
})

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  const permissionResponse = await requireAnyPermissionForUser(auth.user.id, [
    PICKING_EXCEPTION_READ_PERMISSION,
    'picking:read',
  ])
  if (permissionResponse) return permissionResponse

  const queryResult = listQuerySchema.safeParse({
    page: request.nextUrl.searchParams.get('page'),
    pageSize: request.nextUrl.searchParams.get('pageSize'),
    orderNumber: request.nextUrl.searchParams.get('orderNumber'),
    pickOrderNumber: request.nextUrl.searchParams.get('pickOrderNumber'),
    skuCode: request.nextUrl.searchParams.get('skuCode'),
    warehouseId: request.nextUrl.searchParams.get('warehouseId'),
    supplementStatus: request.nextUrl.searchParams.get('supplementStatus'),
    printStatus: request.nextUrl.searchParams.get('printStatus'),
    status: request.nextUrl.searchParams.get('status'),
  })

  if (!queryResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: queryResult.error.errors },
      { status: 400 }
    )
  }

  const {
    page,
    pageSize,
    orderNumber,
    pickOrderNumber,
    skuCode,
    warehouseId,
    supplementStatus,
    printStatus,
    status,
  } = queryResult.data

  const where: Prisma.PickingExceptionCaseWhereInput = {
    tenantId: auth.user.tenantId,
  }

  if (status) where.status = status
  if (orderNumber) where.orderNumber = { contains: orderNumber }
  if (pickOrderNumber) where.pickOrderNumber = { contains: pickOrderNumber }
  if (warehouseId) where.warehouseId = warehouseId
  if (supplementStatus) where.supplementStatus = supplementStatus
  if (printStatus) where.printStatus = printStatus

  if (skuCode) {
    const matchedLines = await prisma.pickingExceptionLine.findMany({
      where: {
        tenantId: auth.user.tenantId,
        skuCode: { contains: skuCode },
      },
      select: { caseId: true },
      distinct: ['caseId'],
    })
    where.id = { in: matchedLines.map((line) => line.caseId) }
  }

  const [total, cases] = await Promise.all([
    prisma.pickingExceptionCase.count({ where }),
    prisma.pickingExceptionCase.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const caseIds = cases.map((item) => item.id)
  const warehouseIds = [...new Set(cases.map((item) => item.warehouseId))]
  const [lines, warehouses, supplementOrders] = await Promise.all([
    caseIds.length > 0
      ? prisma.pickingExceptionLine.findMany({
          where: { tenantId: auth.user.tenantId, caseId: { in: caseIds } },
          orderBy: { createdAt: 'asc' },
        })
      : [],
    warehouseIds.length > 0
      ? prisma.warehouse.findMany({
          where: { id: { in: warehouseIds } },
          select: { id: true, warehouseCode: true, warehouseName: true },
        })
      : [],
    caseIds.length > 0
      ? prisma.supplementPickOrder.findMany({
          where: { tenantId: auth.user.tenantId, caseId: { in: caseIds } },
          orderBy: { createdAt: 'desc' },
        })
      : [],
  ])

  const lineMap = new Map<string, typeof lines>()
  for (const line of lines) {
    const items = lineMap.get(line.caseId) || []
    items.push(line)
    lineMap.set(line.caseId, items)
  }
  const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]))
  const supplementMap = new Map<string, (typeof supplementOrders)[number]>()
  for (const order of supplementOrders) {
    if (!supplementMap.has(order.caseId)) {
      supplementMap.set(order.caseId, order)
    }
  }

  return NextResponse.json({
    success: true,
    data: cases.map((item) => {
      const caseLines = lineMap.get(item.id) || []
      const firstLine = caseLines[0]
      const supplementOrder = supplementMap.get(item.id)
      return {
        ...item,
        warehouse: warehouseMap.get(item.warehouseId) || null,
        skuCodes: [...new Set(caseLines.map((line) => line.skuCode))],
        firstLocationCode: firstLine?.locationCode || null,
        lineCount: caseLines.length,
        supplementPickOrder: supplementOrder || null,
      }
    }),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})
