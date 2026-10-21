import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const addWarehouseSchema = z.object({
  warehouseId: z.string().min(1, '仓库ID不能为空'),
  isDefault: z.boolean().default(false),
  effectiveDate: z.coerce.date().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
})

// GET /api/v1/clients/[id]/warehouses - 获取客户关联的仓库
export const GET = createAuthHandler(async (request: NextRequest, auth, context) => {
  const { id } = await context!.params

  const client = await prisma.client.findFirst({
    where: { id, tenantId: auth.user.tenantId },
  })

  if (!client) {
    return NextResponse.json({ success: false, message: '客户不存在' }, { status: 404 })
  }

  const clientWarehouses = await prisma.clientWarehouse.findMany({
    where: { clientId: id, isActive: true },
    select: {
      id: true,
      warehouseId: true,
      isDefault: true,
      effectiveDate: true,
      expiryDate: true,
      createdAt: true,
      warehouse: {
        select: {
          id: true,
          warehouseCode: true,
          warehouseName: true,
          warehouseType: true,
          city: true,
          status: true,
        },
      },
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ success: true, data: clientWarehouses })
})

// POST /api/v1/clients/[id]/warehouses - 添加客户仓库关联
export const POST = createAuthHandler(async (request: NextRequest, auth, context) => {
  const { id } = await context!.params
  const body = await request.json()
  const validationResult = addWarehouseSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const client = await prisma.client.findFirst({
    where: { id, tenantId: auth.user.tenantId },
  })

  if (!client) {
    return NextResponse.json({ success: false, message: '客户不存在' }, { status: 404 })
  }

  const { warehouseId, isDefault, effectiveDate, expiryDate } = validationResult.data

  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, tenantId: auth.user.tenantId },
  })

  if (!warehouse) {
    return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 404 })
  }

  const existingAssociation = await prisma.clientWarehouse.findFirst({
    where: { clientId: id, warehouseId },
  })

  if (existingAssociation) {
    if (existingAssociation.isActive) {
      return NextResponse.json(
        { success: false, message: '该仓库已关联', code: 'WAREHOUSE_ALREADY_ASSOCIATED' },
        { status: 400 }
      )
    }

    const updated = await prisma.clientWarehouse.update({
      where: { id: existingAssociation.id },
      data: {
        isActive: true,
        isDefault,
        effectiveDate,
        expiryDate,
        updatedBy: auth.user.id,
      },
      include: {
        warehouse: {
          select: { id: true, warehouseCode: true, warehouseName: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
      message: '仓库关联成功',
    })
  }

  if (isDefault) {
    await prisma.clientWarehouse.updateMany({
      where: { clientId: id, isDefault: true },
      data: { isDefault: false },
    })
  }

  const clientWarehouse = await prisma.clientWarehouse.create({
    data: {
      tenantId: auth.user.tenantId,
      clientId: id,
      warehouseId,
      isDefault,
      effectiveDate,
      expiryDate,
      config: {},
      createdBy: auth.user.id,
    },
    include: {
      warehouse: {
        select: { id: true, warehouseCode: true, warehouseName: true },
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: clientWarehouse,
    message: '仓库关联成功',
  })
})
