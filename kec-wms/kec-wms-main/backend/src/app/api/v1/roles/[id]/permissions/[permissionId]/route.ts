import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { clearRolePermissionCache } from '@/lib/cache/permission-cache'

// DELETE /api/v1/roles/[id]/permissions/[permissionId] - 移除角色权限
export const DELETE = createAuthHandler(async (request, auth, context) => {
  const { id, permissionId } = await context!.params

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

  // 检查角色权限关联是否存在
  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      roleId: id,
      permissionId,
    },
  })

  if (!rolePermission) {
    return NextResponse.json(
      { success: false, message: '该角色未分配此权限' },
      { status: 404 }
    )
  }

  // 删除角色权限关联
  await prisma.rolePermission.delete({
    where: { id: rolePermission.id },
  })

  // 清除该角色下所有用户的权限缓存
  const usersWithRole = await prisma.userRole.findMany({
    where: { roleId: id, isActive: true },
    select: { userId: true },
  })
  clearRolePermissionCache(usersWithRole.map((ur) => ur.userId))

  return NextResponse.json({
    success: true,
    message: '权限移除成功',
  })
})
