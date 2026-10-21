import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { updateUserSchema } from '@/lib/validations/user'
import { createAuthHandler } from '@/lib/api/create-handler'

// GET /api/v1/users/[id] - 获取用户详情
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const user = await prisma.user.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        employeeId: true,
        department: true,
        position: true,
        avatarUrl: true,
        userType: true,
        status: true,
        isActive: true,
        lastLoginAt: true,
        lastLoginIp: true,
        passwordChangedAt: true,
        passwordExpiresAt: true,
        failedLoginCount: true,
        lockedAt: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          where: { isActive: true },
          select: {
            id: true,
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
            assignedAt: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, message: '用户不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('获取用户详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取用户详情失败' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/users/[id] - 更新用户信息
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = updateUserSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data
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

    if (data.username && data.username !== existingUser.username) {
      const duplicateUser = await prisma.user.findFirst({
        where: {
          tenantId: existingUser.tenantId,
          username: data.username,
          id: { not: id },
        },
      })

      if (duplicateUser) {
        return NextResponse.json(
          { success: false, message: '用户名已存在', code: 'USERNAME_EXISTS' },
          { status: 400 }
        )
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
        employeeId: data.employeeId || null,
        department: data.department || null,
        position: data.position || null,
        updatedBy: auth.user.id,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        employeeId: true,
        department: true,
        position: true,
        userType: true,
        status: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: user,
      message: '用户更新成功',
    })
  } catch (error) {
    console.error('更新用户失败:', error)
    return NextResponse.json(
      { success: false, message: '更新用户失败' },
      { status: 500 }
    )
  }
})
