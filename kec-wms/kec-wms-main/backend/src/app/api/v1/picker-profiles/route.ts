import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { prisma, prismaRead } from '@/lib/db/prisma'
import {
  ensureEligiblePickerUser,
  ensureWarehouseBelongsToTenant,
  ensureZonesInWarehouse,
  pickerProfileSelect,
  resolveRequiredWarehouseId,
  serializePickerProfile,
} from '@/lib/pick-assignment/admin'
import {
  createPickerProfileSchema,
  pickerProfileListQuerySchema,
} from '@/lib/validations/pick-assignment'

const READ_PERMISSION = 'picker-profile:read'
const CREATE_PERMISSION = 'picker-profile:create'
const ACTIVE_PICK_TASK_STATUSES = ['PENDING', 'IN_PROGRESS'] as const

export const GET = createAuthHandler(async (request, auth) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, READ_PERMISSION)
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = pickerProfileListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      warehouseId: searchParams.get('warehouseId'),
      search: searchParams.get('search'),
      userId: searchParams.get('userId'),
      zoneId: searchParams.get('zoneId'),
      isEnabled: searchParams.get('isEnabled'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 },
      )
    }

    const {
      page,
      pageSize,
      warehouseId: requestedWarehouseId,
      search,
      userId,
      zoneId,
      isEnabled,
      sortBy,
      sortOrder,
    } = queryResult.data

    const warehouseId = resolveRequiredWarehouseId(auth.user, requestedWarehouseId)
    if (!warehouseId) {
      return NextResponse.json({ success: false, message: '当前请求缺少仓库上下文' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
      warehouseId,
    }

    if (search) {
      where.OR = [
        { user: { username: { contains: search } } },
        { user: { fullName: { contains: search } } },
        { user: { employeeId: { contains: search } } },
      ]
    }

    if (userId) {
      where.userId = userId
    }

    if (zoneId) {
      where.zones = {
        some: {
          zoneId,
        },
      }
    }

    if (typeof isEnabled === 'boolean') {
      where.isEnabled = isEnabled
    }

    const total = await prismaRead.pickerProfile.count({ where })
    const profiles = await prismaRead.pickerProfile.findMany({
      where,
      select: pickerProfileSelect,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const activeCounts = profiles.length === 0
      ? []
      : await prismaRead.pickOrder.groupBy({
          by: ['assignedUserId'],
          where: {
            tenantId: auth.user.tenantId,
            warehouseId,
            assignedUserId: { in: profiles.map((profile) => profile.userId) },
            status: { in: [...ACTIVE_PICK_TASK_STATUSES] },
          },
          _count: {
            _all: true,
          },
        })

    const activeCountMap = new Map(
      activeCounts
        .filter((item): item is typeof item & { assignedUserId: string } => Boolean(item.assignedUserId))
        .map((item) => [item.assignedUserId, item._count._all]),
    )

    return NextResponse.json({
      success: true,
      data: profiles.map((profile) => serializePickerProfile(profile, activeCountMap.get(profile.userId) ?? 0)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取拣货员档案列表失败:', error)
    return NextResponse.json({ success: false, message: '获取拣货员档案列表失败' }, { status: 500 })
  }
})

export const POST = createAuthHandler(async (request, auth) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, CREATE_PERMISSION)
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const body = await request.json()
    const validationResult = createPickerProfileSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 },
      )
    }

    const data = validationResult.data
    const warehouseId = resolveRequiredWarehouseId(auth.user, data.warehouseId)
    if (!warehouseId) {
      return NextResponse.json({ success: false, message: '当前请求缺少仓库上下文' }, { status: 400 })
    }

    const warehouse = await ensureWarehouseBelongsToTenant(auth.user.tenantId, warehouseId)
    if (!warehouse) {
      return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 404 })
    }

    const pickerUser = await ensureEligiblePickerUser({
      tenantId: auth.user.tenantId,
      warehouseId,
      userId: data.userId,
    })

    if (!pickerUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在、未启用，或未绑定当前仓库' },
        { status: 400 },
      )
    }

    const uniqueZoneIds = [...new Set(data.zones.map((item) => item.zoneId))]
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

    const existingProfile = await prisma.pickerProfile.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        warehouseId,
        userId: data.userId,
      },
      select: { id: true },
    })

    if (existingProfile) {
      return NextResponse.json(
        { success: false, message: '当前用户已存在拣货员档案', code: 'PICKER_PROFILE_EXISTS' },
        { status: 400 },
      )
    }

    const created = await prisma.$transaction(async (tx) => {
      const profile = await tx.pickerProfile.create({
        data: {
          tenantId: auth.user.tenantId,
          warehouseId,
          userId: data.userId,
          maxActiveTasks: data.maxActiveTasks,
          sequenceNo: data.sequenceNo,
          isEnabled: data.isEnabled,
          allowPdaExecution: data.allowPdaExecution,
          createdBy: auth.user.id,
          updatedBy: auth.user.id,
        },
        select: { id: true },
      })

      if (uniqueZoneIds.length > 0) {
        await tx.pickerProfileZone.createMany({
          data: uniqueZoneIds.map((zoneId) => ({
            tenantId: auth.user.tenantId,
            pickerProfileId: profile.id,
            zoneId,
          })),
        })
      }

      return tx.pickerProfile.findFirstOrThrow({
        where: {
          id: profile.id,
          tenantId: auth.user.tenantId,
        },
        select: pickerProfileSelect,
      })
    })

    return NextResponse.json({
      success: true,
      data: serializePickerProfile(created),
      message: '拣货员档案创建成功',
    })
  } catch (error) {
    console.error('创建拣货员档案失败:', error)
    return NextResponse.json({ success: false, message: '创建拣货员档案失败' }, { status: 500 })
  }
})
