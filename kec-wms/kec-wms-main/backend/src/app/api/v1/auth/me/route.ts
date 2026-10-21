import { NextResponse } from 'next/server'
import {
  getCachedPermissions,
  setCachedPermissions,
} from '@/lib/cache/permission-cache'
import { createAuthHandler } from '@/lib/api/create-handler'
import { getDefaultWarehouseId, listUserWarehouseBindings } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'

export const GET = createAuthHandler(async (_request, { user: authUser }) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        department: true,
        position: true,
        avatarUrl: true,
        userType: true,
        status: true,
        lastLoginAt: true,
        passwordExpiresAt: true,
        tenant: {
          select: {
            id: true,
            tenantCode: true,
            tenantName: true,
          },
        },
        userRoles: {
          where: { isActive: true },
          select: {
            role: {
              select: {
                id: true,
                roleCode: true,
                roleName: true,
                roleLevel: true,
              },
            },
            scopeType: true,
            scopeId: true,
            isPrimary: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: '用户不存在',
        },
        { status: 404 }
      )
    }

    let permissions = getCachedPermissions(authUser.id)

    if (!permissions) {
      const roleIds = user.userRoles.map((userRole) => userRole.role.id)
      const userPermissions = await prisma.rolePermission.findMany({
        where: {
          roleId: { in: roleIds },
          isGranted: true,
          permission: { isActive: true },
        },
        select: {
          permission: {
            select: { permissionCode: true },
          },
        },
      })

      permissions = [
        ...new Set(userPermissions.map((item) => item.permission.permissionCode)),
      ]
      setCachedPermissions(authUser.id, permissions)
    }

    const warehouseBindings = await listUserWarehouseBindings(authUser.tenantId, authUser.id)

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        permissions,
        warehouseBindings,
        defaultWarehouseId: getDefaultWarehouseId(warehouseBindings),
      },
    })
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: '获取用户信息失败',
      },
      { status: 500 }
    )
  }
})
