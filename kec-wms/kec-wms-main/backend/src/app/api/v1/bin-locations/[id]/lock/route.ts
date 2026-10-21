import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { changeLockStatusSchema } from '@/lib/validations/bin-location'
import { NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

// PUT /api/v1/bin-locations/[id]/lock - 修改库位锁定状态
export const PUT = createAuthHandler(async (request, auth, context) => {
  const { id } = await context!.params
  const scopedWarehouseId = resolveScopedWarehouseId(auth.user)
  const body = await request.json()
  const validationResult = changeLockStatusSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const existingBin = await prisma.binLocation.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
      ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
    },
  })

  if (!existingBin) {
    return NextResponse.json({ success: false, message: '库位不存在' }, { status: 404 })
  }

  const { lockStatus } = validationResult.data

  const binLocation = await prisma.binLocation.update({
    where: { id },
    data: { lockStatus },
    select: {
      id: true,
      locationCode: true,
      lockStatus: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: binLocation,
    message: '锁定状态更新成功',
  })
})
