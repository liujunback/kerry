import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { batchAssignPermissionsSchema } from '@/lib/validations/role'
import { clearRolePermissionCache } from '@/lib/cache/permission-cache'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/roles/[id]/permissions - 获取角色权限
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params

    // 检查角色是否存在
    const role = await prisma.role.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!role) {
      return NextResponse.json(
        { success: false, message: '角色不存在' },
        { status: 404 }
      )
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleId: id,
        isGranted: true,
      },
      select: {
        id: true,
        limitation: true,
        isGranted: true,
        permission: {
          select: {
            id: true,
            permissionCode: true,
            permissionName: true,
            description: true,
            resourceType: true,
            action: true,
            category: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: rolePermissions,
    })
  } catch (error) {
    console.error('获取角色权限失败:', error)
    return NextResponse.json(
      { success: false, message: '获取角色权限失败' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/roles/[id]/permissions - 批量更新角色权限
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const validationResult = batchAssignPermissionsSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: '参数验证失败',
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { permissionIds } = validationResult.data

    // 检查角色是否存在
    const role = await prisma.role.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!role) {
      return NextResponse.json(
        { success: false, message: '角色不存在' },
        { status: 404 }
      )
    }

    // 验证所有权限ID是否有效
    const permissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
        isActive: true,
      },
    })

    if (permissions.length !== permissionIds.length) {
      return NextResponse.json(
        { success: false, message: '部分权限不存在' },
        { status: 400 }
      )
    }

    // 使用事务批量更新权限
    await prisma.$transaction(async (tx) => {
      // 删除现有的角色权限
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      })

      // 创建新的角色权限
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            tenantId: auth.user.tenantId,
            roleId: id,
            permissionId,
            isGranted: true,
            createdBy: auth.user.id,
          })),
        })
      }
    })

    // 获取更新后的权限列表
    const updatedPermissions = await prisma.rolePermission.findMany({
      where: {
        roleId: id,
        isGranted: true,
      },
      select: {
        id: true,
        permission: {
          select: {
            id: true,
            permissionCode: true,
            permissionName: true,
            category: true,
          },
        },
      },
    })

    // 清除该角色下所有用户的权限缓存
    const usersWithRole = await prisma.userRole.findMany({
      where: { roleId: id, isActive: true },
      select: { userId: true },
    })
    clearRolePermissionCache(usersWithRole.map((ur) => ur.userId))

    return NextResponse.json({
      success: true,
      data: updatedPermissions,
      message: '权限更新成功',
    })
  } catch (error) {
    console.error('更新角色权限失败:', error)
    return NextResponse.json(
      { success: false, message: '更新角色权限失败' },
      { status: 500 }
    )
  }
})
