import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { getDefaultWarehouseId, listUserWarehouseBindings } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'

export const DELETE = createAuthHandler(async (_request, auth, context) => {
  try {
    const { id, warehouseId } = await context!.params

    const binding = await prisma.userWarehouse.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        userId: id,
        warehouseId,
        isActive: true,
      },
      select: {
        id: true,
        isDefault: true,
      },
    })

    if (!binding) {
      return NextResponse.json(
        { success: false, message: '用户仓库绑定不存在' },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.userWarehouse.update({
        where: { id: binding.id },
        data: {
          isActive: false,
          isDefault: false,
          updatedBy: auth.user.id,
        },
      })

      if (binding.isDefault) {
        const nextBinding = await tx.userWarehouse.findFirst({
          where: {
            tenantId: auth.user.tenantId,
            userId: id,
            isActive: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
          },
        })

        if (nextBinding) {
          await tx.userWarehouse.update({
            where: { id: nextBinding.id },
            data: {
              isDefault: true,
              updatedBy: auth.user.id,
            },
          })
        }
      }
    })

    const bindings = await listUserWarehouseBindings(auth.user.tenantId, id)

    return NextResponse.json({
      success: true,
      data: {
        defaultWarehouseId: getDefaultWarehouseId(bindings),
      },
      message: '用户仓库解绑成功',
    })
  } catch (error) {
    console.error('解绑用户仓库失败:', error)
    return NextResponse.json(
      { success: false, message: '解绑用户仓库失败' },
      { status: 500 }
    )
  }
})
