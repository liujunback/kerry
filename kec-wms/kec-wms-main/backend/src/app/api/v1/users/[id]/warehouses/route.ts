import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { getDefaultWarehouseId, listUserWarehouseBindings } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { bindUserWarehouseSchema } from '@/lib/validations/user'

export const GET = createAuthHandler(async (_request, auth, context) => {
  try {
    const { id } = await context!.params

    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      select: { id: true },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    const bindings = await listUserWarehouseBindings(auth.user.tenantId, id)

    return NextResponse.json({
      success: true,
      data: bindings,
      meta: {
        defaultWarehouseId: getDefaultWarehouseId(bindings),
      },
    })
  } catch (error) {
    console.error('获取用户仓库绑定失败:', error)
    return NextResponse.json(
      { success: false, message: '获取用户仓库绑定失败' },
      { status: 500 }
    )
  }
})

export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = bindUserWarehouseSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { warehouseId, isDefault } = validationResult.data

    const [existingUser, warehouse] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id,
          tenantId: auth.user.tenantId,
        },
        select: { id: true },
      }),
      prisma.warehouse.findFirst({
        where: {
          id: warehouseId,
          tenantId: auth.user.tenantId,
        },
        select: {
          id: true,
          warehouseCode: true,
          warehouseName: true,
        },
      }),
    ])

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: '仓库不存在' },
        { status: 404 }
      )
    }

    const currentBindings = await prisma.userWarehouse.findMany({
      where: {
        tenantId: auth.user.tenantId,
        userId: id,
      },
      select: {
        id: true,
        warehouseId: true,
        isDefault: true,
        isActive: true,
      },
    })

    const existingBinding = currentBindings.find((binding) => binding.warehouseId === warehouseId)
    const hasActiveDefault = currentBindings.some((binding) => binding.isActive && binding.isDefault)
    const shouldBeDefault = isDefault || !hasActiveDefault

    await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
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
      }

      if (existingBinding) {
        await tx.userWarehouse.update({
          where: { id: existingBinding.id },
          data: {
            isActive: true,
            isDefault: shouldBeDefault,
            updatedBy: auth.user.id,
          },
        })
      } else {
        await tx.userWarehouse.create({
          data: {
            tenantId: auth.user.tenantId,
            userId: id,
            warehouseId,
            isDefault: shouldBeDefault,
            isActive: true,
            createdBy: auth.user.id,
            updatedBy: auth.user.id,
          },
        })
      }
    })

    const bindings = await listUserWarehouseBindings(auth.user.tenantId, id)

    return NextResponse.json({
      success: true,
      data: {
        warehouseId: warehouse.id,
        warehouseCode: warehouse.warehouseCode,
        warehouseName: warehouse.warehouseName,
        isDefault: bindings.some((binding) => binding.warehouseId === warehouse.id && binding.isDefault),
      },
      message: '用户仓库绑定成功',
    })
  } catch (error) {
    console.error('绑定用户仓库失败:', error)
    return NextResponse.json(
      { success: false, message: '绑定用户仓库失败' },
      { status: 500 }
    )
  }
})
