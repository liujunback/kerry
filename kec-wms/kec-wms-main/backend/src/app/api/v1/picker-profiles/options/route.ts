import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { prismaRead } from '@/lib/db/prisma'
import { ensureWarehouseBelongsToTenant, resolveRequiredWarehouseId } from '@/lib/pick-assignment/admin'

const READ_PERMISSION = 'picker-profile:read'

export const GET = createAuthHandler(async (request, auth) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, READ_PERMISSION)
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const requestedWarehouseId = request.nextUrl.searchParams.get('warehouseId')
    const warehouseId = resolveRequiredWarehouseId(auth.user, requestedWarehouseId)
    if (!warehouseId) {
      return NextResponse.json({ success: false, message: '当前请求缺少仓库上下文' }, { status: 400 })
    }

    const warehouse = await ensureWarehouseBelongsToTenant(auth.user.tenantId, warehouseId)
    if (!warehouse) {
      return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 404 })
    }

    const [users, zones] = await Promise.all([
      prismaRead.user.findMany({
        where: {
          tenantId: auth.user.tenantId,
          status: 'ACTIVE',
          isActive: true,
          userWarehouses: {
            some: {
              warehouseId,
              isActive: true,
            },
          },
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          employeeId: true,
        },
        orderBy: [
          { fullName: 'asc' },
          { username: 'asc' },
        ],
      }),
      prismaRead.zone.findMany({
        where: {
          tenantId: auth.user.tenantId,
          warehouseId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          zoneCode: true,
          zoneName: true,
          zoneType: true,
        },
        orderBy: {
          zoneCode: 'asc',
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        warehouse,
        users,
        zones,
      },
    })
  } catch (error) {
    console.error('获取拣货员档案配置项失败:', error)
    return NextResponse.json({ success: false, message: '获取拣货员档案配置项失败' }, { status: 500 })
  }
})
