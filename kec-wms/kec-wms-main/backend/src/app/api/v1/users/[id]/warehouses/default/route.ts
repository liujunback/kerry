import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { listUserWarehouseBindings } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { setDefaultUserWarehouseSchema } from '@/lib/validations/user'

export const PATCH = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = setDefaultUserWarehouseSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { warehouseId } = validationResult.data

    const binding = await prisma.userWarehouse.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        userId: id,
        warehouseId,
        isActive: true,
      },
      select: {
        id: true,
      },
    })

    if (!binding) {
      return NextResponse.json(
        { success: false, message: '用户未绑定该仓库' },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.userWarehouse.updateMany({
        where: {
          tenantId: auth.user.tenantId,
          userId: id,
          isActive: true,
        },
        data: {
          isDefault: false,
          updatedBy: auth.user.id,
        },
      })

      await tx.userWarehouse.update({
        where: {
          id: binding.id,
        },
        data: {
          isDefault: true,
          updatedBy: auth.user.id,
        },
      })
    })

    const bindings = await listUserWarehouseBindings(auth.user.tenantId, id)

    return NextResponse.json({
      success: true,
      data: {
        warehouseId,
        warehouseBindings: bindings,
      },
      message: '默认仓库设置成功',
    })
  } catch (error) {
    console.error('设置默认仓库失败:', error)
    return NextResponse.json(
      { success: false, message: '设置默认仓库失败' },
      { status: 500 }
    )
  }
})
