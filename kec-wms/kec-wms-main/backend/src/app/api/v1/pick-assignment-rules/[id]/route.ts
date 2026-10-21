import { NextResponse } from 'next/server'
import { createAuthHandler, type RouteContext } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { prisma, prismaRead } from '@/lib/db/prisma'
import {
  pickAssignmentRuleSelect,
  resolveRequiredWarehouseId,
  serializePickAssignmentRule,
} from '@/lib/pick-assignment/admin'
import { updatePickAssignmentRuleSchema } from '@/lib/validations/pick-assignment'

type PickAssignmentRuleRouteContext = RouteContext<{ id: string }>

const READ_PERMISSION = 'pick-assignment-rule:read'
const UPDATE_PERMISSION = 'pick-assignment-rule:update'
const DELETE_PERMISSION = 'pick-assignment-rule:delete'

export const GET = createAuthHandler<PickAssignmentRuleRouteContext>(async (_request, auth, context) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, READ_PERMISSION)
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const { id } = await context.params
    const warehouseId = resolveRequiredWarehouseId(auth.user)
    if (!warehouseId) {
      return NextResponse.json({ success: false, message: '当前请求缺少仓库上下文' }, { status: 400 })
    }

    const rule = await prismaRead.pickAssignmentRule.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        warehouseId,
      },
      select: pickAssignmentRuleSelect,
    })

    if (!rule) {
      return NextResponse.json({ success: false, message: '拣货分配规则不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: serializePickAssignmentRule(rule),
    })
  } catch (error) {
    console.error('获取拣货分配规则详情失败:', error)
    return NextResponse.json({ success: false, message: '获取拣货分配规则详情失败' }, { status: 500 })
  }
})

export const PUT = createAuthHandler<PickAssignmentRuleRouteContext>(async (request, auth, context) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, UPDATE_PERMISSION)
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const { id } = await context.params
    const validationResult = updatePickAssignmentRuleSchema.safeParse(await request.json())

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 },
      )
    }

    const warehouseId = resolveRequiredWarehouseId(auth.user)
    if (!warehouseId) {
      return NextResponse.json({ success: false, message: '当前请求缺少仓库上下文' }, { status: 400 })
    }

    const existingRule = await prisma.pickAssignmentRule.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        warehouseId,
      },
      select: {
        id: true,
      },
    })

    if (!existingRule) {
      return NextResponse.json({ success: false, message: '拣货分配规则不存在' }, { status: 404 })
    }

    const payload = validationResult.data

    const updated = await prisma.$transaction(async (tx) => {
      if (payload.isDefault) {
        await tx.pickAssignmentRule.updateMany({
          where: {
            tenantId: auth.user.tenantId,
            warehouseId,
            isDefault: true,
            id: { not: id },
          },
          data: {
            isDefault: false,
            updatedBy: auth.user.id,
          },
        })
      }

      await tx.pickAssignmentRule.update({
        where: { id },
        data: {
          ...(payload.ruleName !== undefined ? { ruleName: payload.ruleName } : {}),
          ...(payload.description !== undefined ? { description: payload.description ?? null } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.isDefault !== undefined ? { isDefault: payload.isDefault } : {}),
          ...(payload.config !== undefined ? { configJson: payload.config } : {}),
          updatedBy: auth.user.id,
        },
      })

      return tx.pickAssignmentRule.findFirstOrThrow({
        where: {
          id,
          tenantId: auth.user.tenantId,
          warehouseId,
        },
        select: pickAssignmentRuleSelect,
      })
    })

    return NextResponse.json({
      success: true,
      data: serializePickAssignmentRule(updated),
      message: '拣货分配规则更新成功',
    })
  } catch (error) {
    console.error('更新拣货分配规则失败:', error)
    return NextResponse.json({ success: false, message: '更新拣货分配规则失败' }, { status: 500 })
  }
})

export const DELETE = createAuthHandler<PickAssignmentRuleRouteContext>(async (_request, auth, context) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, DELETE_PERMISSION)
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const { id } = await context.params
    const warehouseId = resolveRequiredWarehouseId(auth.user)
    if (!warehouseId) {
      return NextResponse.json({ success: false, message: '当前请求缺少仓库上下文' }, { status: 400 })
    }

    const existingRule = await prisma.pickAssignmentRule.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        warehouseId,
      },
      select: {
        id: true,
      },
    })

    if (!existingRule) {
      return NextResponse.json({ success: false, message: '拣货分配规则不存在' }, { status: 404 })
    }

    await prisma.pickAssignmentRule.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '拣货分配规则删除成功',
    })
  } catch (error) {
    console.error('删除拣货分配规则失败:', error)
    return NextResponse.json({ success: false, message: '删除拣货分配规则失败' }, { status: 500 })
  }
})
