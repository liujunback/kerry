import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'

/**
 * 服务端权限检查函数
 * 用于 Server Component 中检查用户是否有指定权限
 */
export async function checkPermission(permissionCode: string): Promise<boolean> {
  const session = await auth()

  if (!session?.user) {
    return false
  }

  // 获取用户的角色 ID
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    select: {
      roleId: true,
    },
  })

  if (userRoles.length === 0) {
    return false
  }

  const roleIds = userRoles.map((ur) => ur.roleId)

  // 检查是否有指定权限
  const permission = await prisma.rolePermission.findFirst({
    where: {
      roleId: { in: roleIds },
      isGranted: true,
      permission: {
        permissionCode,
        isActive: true,
      },
    },
  })

  return !!permission
}

export async function checkAnyPermission(permissionCodes: string[]): Promise<boolean> {
  const session = await auth()

  if (!session?.user || permissionCodes.length === 0) {
    return false
  }

  const userRoles = await prisma.userRole.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    select: {
      roleId: true,
    },
  })

  if (userRoles.length === 0) {
    return false
  }

  const roleIds = userRoles.map((ur) => ur.roleId)
  const permission = await prisma.rolePermission.findFirst({
    where: {
      roleId: { in: roleIds },
      isGranted: true,
      permission: {
        permissionCode: { in: permissionCodes },
        isActive: true,
      },
    },
  })

  return !!permission
}

/**
 * 服务端权限检查函数（带重定向）
 * 如果没有权限，重定向到 403 页面
 */
export async function requirePermission(permissionCode: string): Promise<void> {
  const hasPermission = await checkPermission(permissionCode)

  if (!hasPermission) {
    redirect('/forbidden')
  }
}

export async function requireAnyPermission(permissionCodes: string[]): Promise<void> {
  const hasPermission = await checkAnyPermission(permissionCodes)

  if (!hasPermission) {
    redirect('/forbidden')
  }
}

/**
 * 获取用户的所有权限编码
 */
export async function getUserPermissions(): Promise<string[]> {
  const session = await auth()

  if (!session?.user) {
    return []
  }

  // 获取用户的角色 ID
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId: session.user.id,
      isActive: true,
    },
    select: {
      roleId: true,
    },
  })

  if (userRoles.length === 0) {
    return []
  }

  const roleIds = userRoles.map((ur) => ur.roleId)

  // 获取所有权限
  const permissions = await prisma.rolePermission.findMany({
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

  return [...new Set(permissions.map((p) => p.permission.permissionCode))]
}
