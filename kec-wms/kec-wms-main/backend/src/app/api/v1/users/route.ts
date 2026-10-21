import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/security/password'
import {
  createUserSchema,
  userListQuerySchema,
} from '@/lib/validations/user'
import { createAuthHandler } from '@/lib/api/create-handler'

// GET /api/v1/users - 获取用户列表
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = userListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      userType: searchParams.get('userType'),
      tenantId: searchParams.get('tenantId'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, search, status, userType, sortBy, sortOrder } = queryResult.data

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
    }

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { employeeId: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (userType) {
      where.userType = userType
    }

    const total = await prisma.user.count({ where })

    const users = await prisma.user.findMany({
      where,
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
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: {
          where: { isActive: true },
          select: {
            role: {
              select: {
                id: true,
                roleCode: true,
                roleName: true,
              },
            },
            scopeType: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取用户列表失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/users - 创建用户
export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const validationResult = createUserSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        username: data.username,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: '用户名已存在', code: 'USERNAME_EXISTS' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(data.password)

    const passwordExpiresAt = new Date()
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 90)

    const user = await prisma.user.create({
      data: {
        tenantId: auth.user.tenantId,
        username: data.username,
        passwordHash,
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        employeeId: data.employeeId || null,
        department: data.department || null,
        position: data.position || null,
        userType: data.userType,
        status: 'ACTIVE',
        isActive: true,
        passwordChangedAt: new Date(),
        passwordExpiresAt,
        config: {},
        createdBy: auth.user.id,
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
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: user,
      message: '用户创建成功',
    })
  } catch (error) {
    console.error('创建用户失败:', error)
    return NextResponse.json(
      { success: false, message: '创建用户失败' },
      { status: 500 }
    )
  }
})
