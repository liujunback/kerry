import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const updateWarehouseAssociationSchema = z.object({
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  effectiveDate: z.coerce.date().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
})

// PUT /api/v1/clients/[id]/warehouses/[warehouseId] - 更新客户仓库关联
export const PUT = createAuthHandler(async (request: NextRequest, auth, context) => {
  const { id, warehouseId } = await context!.params
  const body = await request.json()
  const validationResult = updateWarehouseAssociationSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const association = await prisma.clientWarehouse.findFirst({
    where: {
      clientId: id,
      warehouseId,
      client: {
        tenantId: auth.user.tenantId,
      },
    },
  })

  if (!association) {
    return NextResponse.json({ success: false, message: '关联不存在' }, { status: 404 })
  }

  const { isDefault, isActive, effectiveDate, expiryDate } = validationResult.data

  if (isDefault === true) {
    await prisma.clientWarehouse.updateMany({
      where: { clientId: id, isDefault: true, id: { not: association.id } },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.clientWarehouse.update({
    where: { id: association.id },
    data: {
      ...(isDefault !== undefined && { isDefault }),
      ...(isActive !== undefined && { isActive }),
      ...(effectiveDate !== undefined && { effectiveDate }),
      ...(expiryDate !== undefined && { expiryDate }),
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
    message: '关联更新成功',
  })
})

// DELETE /api/v1/clients/[id]/warehouses/[warehouseId] - 删除客户仓库关联
export const DELETE = createAuthHandler(async (request: NextRequest, auth, context) => {
  const { id, warehouseId } = await context!.params

  const association = await prisma.clientWarehouse.findFirst({
    where: {
      clientId: id,
      warehouseId,
      client: {
        tenantId: auth.user.tenantId,
      },
    },
  })

  if (!association) {
    return NextResponse.json({ success: false, message: '关联不存在' }, { status: 404 })
  }

  await prisma.clientWarehouse.delete({ where: { id: association.id } })

  return NextResponse.json({
    success: true,
    message: '仓库关联已移除',
  })
})
