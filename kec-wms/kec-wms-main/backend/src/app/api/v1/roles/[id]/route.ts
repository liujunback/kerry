import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { updateRoleSchema } from '@/lib/validations/role'
import { createAuthHandler } from '@/lib/api/create-handler'

// GET /api/v1/roles/[id] - 获取角色详情
export const GET = createAuthHandler(async (request, auth, context) => {
  const { id } = await context!.params

  const role = await prisma.role.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
    },
    select: {
      id: true,
      roleCode: true,
      roleName: true,
      description: true,
      roleLevel: true,
      parentRoleId: true,
      isSystem: true,
      isActive: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      parentRole: {
        select: {
          id: true,
          roleName: true,
          roleCode: true,
        },
      },
      rolePermissions: {
        where: {
          isGranted: true,
        },
        select: {
          id: true,
          limitation: true,
          permission: {
            select: {
              id: true,
              permissionCode: true,
              permissionName: true,
              category: true,
              resourceType: true,
              action: true,
            },
          },
        },
      },
      _count: {
        select: {
          userRoles: true,
        },
      },
    },
  })

  if (!role) {
    return NextResponse.json(
      { success: false, message: '角色不存在' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: role,
  })
})

// PUT /api/v1/roles/[id] - 更新角色
export const PUT = createAuthHandler(async (request, auth, context) => {
  const { id } = await context!.params
  const body = await request.json()
  const validationResult = updateRoleSchema.safeParse(body)

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

  // 检查角色是否存在
  const existingRole = await prisma.role.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
    },
  })

  if (!existingRole) {
    return NextResponse.json(
      { success: false, message: '角色不存在' },
      { status: 404 }
    )
  }

  // 系统角色不允许修改编码
  if (existingRole.isSystem && validationResult.data.roleCode) {
    return NextResponse.json(
      { success: false, message: '系统角色不允许修改编码' },
      { status: 400 }
    )
  }

  const { roleCode, roleName, description, roleLevel, parentRoleId } = validationResult.data

  // 如果修改了角色编码，检查是否重复
  if (roleCode && roleCode !== existingRole.roleCode) {
    const duplicateRole = await prisma.role.findUnique({
      where: {
        tenantId_roleCode: {
          tenantId: auth.user.tenantId,
          roleCode,
        },
      },
    })

    if (duplicateRole) {
      return NextResponse.json(
        { success: false, message: '角色编码已存在' },
        { status: 400 }
      )
    }
  }

  // 如果指定了父角色，验证父角色是否存在且不是自己
  if (parentRoleId) {
    if (parentRoleId === id) {
      return NextResponse.json(
        { success: false, message: '不能将自己设为父角色' },
        { status: 400 }
      )
    }

    const parentRole = await prisma.role.findFirst({
      where: {
        id: parentRoleId,
        tenantId: auth.user.tenantId,
        isActive: true,
      },
    })

    if (!parentRole) {
      return NextResponse.json(
        { success: false, message: '父角色不存在' },
        { status: 400 }
      )
    }
  }

  const role = await prisma.role.update({
    where: { id },
    data: {
      ...(roleCode && { roleCode }),
      ...(roleName && { roleName }),
      ...(description !== undefined && { description }),
      ...(roleLevel && { roleLevel }),
      ...(parentRoleId !== undefined && { parentRoleId }),
      updatedBy: auth.user.id,
    },
    select: {
      id: true,
      roleCode: true,
      roleName: true,
      description: true,
      roleLevel: true,
      isSystem: true,
      isActive: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: role,
  })
})

// DELETE /api/v1/roles/[id] - 删除角色
export const DELETE = createAuthHandler(async (request, auth, context) => {
  const { id } = await context!.params

  // 检查角色是否存在
  const existingRole = await prisma.role.findFirst({
    where: {
      id,
      tenantId: auth.user.tenantId,
    },
    include: {
      _count: {
        select: {
          userRoles: true,
        },
      },
    },
  })

  if (!existingRole) {
    return NextResponse.json(
      { success: false, message: '角色不存在' },
      { status: 404 }
    )
  }

  // 系统角色不允许删除
  if (existingRole.isSystem) {
    return NextResponse.json(
      { success: false, message: '系统角色不允许删除' },
      { status: 400 }
    )
  }

  // 检查是否有用户关联
  if (existingRole._count.userRoles > 0) {
    return NextResponse.json(
      { success: false, message: '该角色已分配给用户，无法删除' },
      { status: 400 }
    )
  }

  // 软删除：设置 isActive 为 false
  await prisma.role.update({
    where: { id },
    data: {
      isActive: false,
      updatedBy: auth.user.id,
    },
  })

  return NextResponse.json({
    success: true,
    message: '角色删除成功',
  })
})
