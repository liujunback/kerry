import { NextResponse } from 'next/server'
import { createAuthHandler, type RouteContext } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { prisma, prismaRead } from '@/lib/db/prisma'
import {
  ensureZonesInWarehouse,
  pickerProfileSelect,
  resolveRequiredWarehouseId,
  serializePickerProfile,
} from '@/lib/pick-assignment/admin'
import { updatePickerProfileSchema } from '@/lib/validations/pick-assignment'

type PickerProfileRouteContext = RouteContext<{ id: string }>

const READ_PERMISSION = 'picker-profile:read'
const UPDATE_PERMISSION = 'picker-profile:update'
const DELETE_PERMISSION = 'picker-profile:delete'
const ACTIVE_PICK_TASK_STATUSES = ['PENDING', 'IN_PROGRESS'] as const

export const GET = createAuthHandler<PickerProfileRouteContext>(async (_request, auth, context) => {
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

    const profile = await prismaRead.pickerProfile.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        warehouseId,
      },
      select: pickerProfileSelect,
    })

    if (!profile) {
      return NextResponse.json({ success: false, message: '拣货员档案不存在' }, { status: 404 })
    }

    const activeTaskCount = await prismaRead.pickOrder.count({
      where: {
        tenantId: auth.user.tenantId,
        warehouseId,
        assignedUserId: profile.userId,
        status: { in: [...ACTIVE_PICK_TASK_STATUSES] },
      },
    })

    return NextResponse.json({
      success: true,
      data: serializePickerProfile(profile, activeTaskCount),
    })
  } catch (error) {
    console.error('获取拣货员档案详情失败:', error)
    return NextResponse.json({ success: false, message: '获取拣货员档案详情失败' }, { status: 500 })
  }
})

export const PUT = createAuthHandler<PickerProfileRouteContext>(async (request, auth, context) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, UPDATE_PERMISSION)
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const { id } = await context.params
    const validationResult = updatePickerProfileSchema.safeParse(await request.json())

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

    const existingProfile = await prisma.pickerProfile.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        warehouseId,
      },
      select: {
        id: true,
      },
    })

    if (!existingProfile) {
      return NextResponse.json({ success: false, message: '拣货员档案不存在' }, { status: 404 })
    }

    const payload = validationResult.data
    if (payload.zones) {
      const uniqueZoneIds = [...new Set(payload.zones.map((item) => item.zoneId))]
      const zones = await ensureZonesInWarehouse({
        tenantId: auth.user.tenantId,
        warehouseId,
        zoneIds: uniqueZoneIds,
      })

      if (zones.length !== uniqueZoneIds.length) {
        return NextResponse.json(
          { success: false, message: '存在无效库区，或库区不属于当前仓库' },
          { status: 400 },
        )
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.pickerProfile.update({
        where: { id },
        data: {
          ...(payload.maxActiveTasks !== undefined ? { maxActiveTasks: payload.maxActiveTasks } : {}),
          ...(payload.sequenceNo !== undefined ? { sequenceNo: payload.sequenceNo } : {}),
          ...(payload.isEnabled !== undefined ? { isEnabled: payload.isEnabled } : {}),
          ...(payload.allowPdaExecution !== undefined ? { allowPdaExecution: payload.allowPdaExecution } : {}),
          updatedBy: auth.user.id,
        },
      })

      if (payload.zones) {
        const uniqueZoneIds = [...new Set(payload.zones.map((item) => item.zoneId))]
        await tx.pickerProfileZone.deleteMany({
          where: {
            pickerProfileId: id,
          },
        })

        if (uniqueZoneIds.length > 0) {
          await tx.pickerProfileZone.createMany({
            data: uniqueZoneIds.map((zoneId) => ({
              tenantId: auth.user.tenantId,
              pickerProfileId: id,
              zoneId,
            })),
          })
        }
      }

      return tx.pickerProfile.findFirstOrThrow({
        where: {
          id,
          tenantId: auth.user.tenantId,
          warehouseId,
        },
        select: pickerProfileSelect,
      })
    })

    const activeTaskCount = await prismaRead.pickOrder.count({
      where: {
        tenantId: auth.user.tenantId,
        warehouseId,
        assignedUserId: updated.userId,
        status: { in: [...ACTIVE_PICK_TASK_STATUSES] },
      },
    })

    return NextResponse.json({
      success: true,
      data: serializePickerProfile(updated, activeTaskCount),
      message: '拣货员档案更新成功',
    })
  } catch (error) {
    console.error('更新拣货员档案失败:', error)
    return NextResponse.json({ success: false, message: '更新拣货员档案失败' }, { status: 500 })
  }
})

export const DELETE = createAuthHandler<PickerProfileRouteContext>(async (_request, auth, context) => {
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

    const existingProfile = await prisma.pickerProfile.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        warehouseId,
      },
      select: {
        id: true,
      },
    })

    if (!existingProfile) {
      return NextResponse.json({ success: false, message: '拣货员档案不存在' }, { status: 404 })
    }

    await prisma.pickerProfile.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '拣货员档案删除成功',
    })
  } catch (error) {
    console.error('删除拣货员档案失败:', error)
    return NextResponse.json({ success: false, message: '删除拣货员档案失败' }, { status: 500 })
  }
})
