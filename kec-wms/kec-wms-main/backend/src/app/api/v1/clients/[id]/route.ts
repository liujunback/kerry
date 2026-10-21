import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updateClientSchema } from '@/lib/validations/client'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/v1/clients/[id] - 获取客户详情
export const GET = createAuthHandler(async (request: NextRequest, auth, context) => {
  const { id } = await context!.params

  const client = await prisma.client.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
    },
    include: {
      clientWarehouses: {
        where: { isActive: true },
        select: {
          id: true,
          warehouseId: true,
          isDefault: true,
          effectiveDate: true,
          expiryDate: true,
          warehouse: {
            select: {
              id: true,
              warehouseCode: true,
              warehouseName: true,
              status: true,
            },
          },
        },
      },
      _count: {
        select: {
          clientWarehouses: { where: { isActive: true } },
          inventoryBuckets: true,
        },
      },
    },
  })

  if (!client) {
    return NextResponse.json({ success: false, message: '客户不存在' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: client })
})

// PUT /api/v1/clients/[id] - 更新客户
export const PUT = createAuthHandler(async (request: NextRequest, auth, context) => {
  const { id } = await context!.params
  const body = await request.json()
  const validationResult = updateClientSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const existingClient = await prisma.client.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
    },
  })

  if (!existingClient) {
    return NextResponse.json({ success: false, message: '客户不存在' }, { status: 404 })
  }

  const data = validationResult.data

  if (data.clientCode && data.clientCode !== existingClient.clientCode) {
    const duplicateCode = await prisma.client.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        clientCode: data.clientCode,
        id: { not: id },
      },
    })

    if (duplicateCode) {
      return NextResponse.json(
        { success: false, message: '客户编码已存在', code: 'CLIENT_CODE_EXISTS' },
        { status: 400 }
      )
    }
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(data.clientCode && { clientCode: data.clientCode }),
      ...(data.clientName && { clientName: data.clientName }),
      ...(data.shortName !== undefined && { shortName: data.shortName || null }),
      ...(data.clientType && { clientType: data.clientType }),
      ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson || null }),
      ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone || null }),
      ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.city !== undefined && { city: data.city || null }),
      ...(data.province !== undefined && { province: data.province || null }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.postalCode !== undefined && { postalCode: data.postalCode || null }),
      ...(data.taxNumber !== undefined && { taxNumber: data.taxNumber || null }),
      ...(data.bankName !== undefined && { bankName: data.bankName || null }),
      ...(data.bankAccount !== undefined && { bankAccount: data.bankAccount || null }),
      ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit }),
      ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      updatedBy: auth.user.id,
    },
    select: {
      id: true,
      clientCode: true,
      clientName: true,
      shortName: true,
      clientType: true,
      contactPerson: true,
      contactPhone: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: client,
    message: '客户更新成功',
  })
})

// DELETE /api/v1/clients/[id] - 删除客户
export const DELETE = createAuthHandler(async (request: NextRequest, auth, context) => {
  const { id } = await context!.params

  const client = await prisma.client.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
    },
    include: {
      _count: {
        select: {
          inventoryBuckets: true,
        },
      },
    },
  })

  if (!client) {
    return NextResponse.json({ success: false, message: '客户不存在' }, { status: 404 })
  }

  if (client._count.inventoryBuckets > 0) {
    return NextResponse.json(
      { success: false, message: '客户存在库存记录，无法删除', code: 'CLIENT_HAS_INVENTORY' },
      { status: 400 }
    )
  }

  await prisma.clientWarehouse.deleteMany({ where: { clientId: id } })
  await prisma.client.delete({ where: { id } })

  return NextResponse.json({ success: true, message: '客户删除成功' })
})
