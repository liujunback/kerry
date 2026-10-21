import { prisma } from '@/lib/db/prisma'

export async function checkPermissionForUser(
  userId: string,
  permissionCode: string
): Promise<boolean> {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      roleId: true,
    },
  })

  if (userRoles.length === 0) {
    return false
  }

  const roleIds = userRoles.map((item) => item.roleId)

  const permission = await prisma.rolePermission.findFirst({
    where: {
      roleId: { in: roleIds },
      isGranted: true,
      permission: {
        permissionCode,
        isActive: true,
      },
    },
    select: {
      id: true,
    },
  })

  return !!permission
}

export async function requirePermissionForUser(
  userId: string,
  permissionCode: string
): Promise<Response | null> {
  const hasPermission = await checkPermissionForUser(userId, permissionCode)

  if (hasPermission) {
    return null
  }

  return new Response(
    JSON.stringify({
      success: false,
      message: 'Forbidden',
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

export async function requireAnyPermissionForUser(
  userId: string,
  permissionCodes: string[]
): Promise<Response | null> {
  if (permissionCodes.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Forbidden',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      roleId: true,
    },
  })

  if (userRoles.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Forbidden',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const roleIds = userRoles.map((item) => item.roleId)
  const permission = await prisma.rolePermission.findFirst({
    where: {
      roleId: { in: roleIds },
      isGranted: true,
      permission: {
        permissionCode: { in: permissionCodes },
        isActive: true,
      },
    },
    select: {
      id: true,
    },
  })

  if (permission) {
    return null
  }

  return new Response(
    JSON.stringify({
      success: false,
      message: 'Forbidden',
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
