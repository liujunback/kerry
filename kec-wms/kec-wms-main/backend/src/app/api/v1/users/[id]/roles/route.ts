import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { assignRoleSchema } from '@/lib/validations/user'
import { clearUserPermissionCache } from '@/lib/cache/permission-cache'
import { createAuthHandler } from '@/lib/api/create-handler'

// GET /api/v1/users/[id]/roles - 获取用户角色
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: id,
        isActive: true,
      },
      select: {
        id: true,
        role: {
          select: {
            id: true,
            roleCode: true,
            roleName: true,
            roleLevel: true,
            description: true,
          },
        },
        scopeType: true,
        scopeId: true,
        isPrimary: true,
        assignedAt: true,
        expiresAt: true,
      },
      orderBy: {
        assignedAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      data: userRoles,
    })
  } catch (error) {
    console.error('获取用户角色失败:', error)
    return NextResponse.json(
      { success: false, message: '获取用户角色失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/users/[id]/roles - 分配角色
export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = assignRoleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { roleId, scopeType, scopeId } = validationResult.data

    const existingUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        tenantId: auth.user.tenantId,
        isActive: true,
      },
    })

    if (!role) {
      return NextResponse.json(
        { success: false, message: '角色不存在' },
        { status: 404 }
      )
    }

    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId: id,
        roleId,
        scopeType,
        scopeId: scopeId || undefined,
        isActive: true,
      },
    })

    if (existingUserRole) {
      return NextResponse.json(
        { success: false, message: '该角色已分配', code: 'ROLE_ALREADY_ASSIGNED' },
        { status: 400 }
      )
    }

    const userRole = await prisma.userRole.create({
      data: {
        tenantId: auth.user.tenantId,
        userId: id,
        roleId,
        scopeType,
        scopeId: scopeId || null,
        assignedBy: auth.user.id,
        isActive: true,
      },
      select: {
        id: true,
        role: {
          select: {
            id: true,
            roleCode: true,
            roleName: true,
          },
        },
        scopeType: true,
        scopeId: true,
        assignedAt: true,
      },
    })

    clearUserPermissionCache(id)

    return NextResponse.json({
      success: true,
      data: userRole,
      message: '角色分配成功',
    })
  } catch (error) {
    console.error('分配角色失败:', error)
    return NextResponse.json(
      { success: false, message: '分配角色失败' },
      { status: 500 }
    )
  }
})
