import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import {
  hashPassword,
  generateSecurePassword,
  calculatePasswordExpiryDate,
} from '@/lib/security/password'
import {
  createTenantSchema,
  tenantListQuerySchema,
} from '@/lib/validations/tenant'

// GET /api/v1/tenants - 获取租户列表 (仅超级管理员)
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    // 超级管理员权限检查
    if (auth.user.userType !== 'SYSTEM') {
      return NextResponse.json(
        { success: false, message: '无权限访问' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const queryResult = tenantListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, search, status, sortBy, sortOrder } = queryResult.data

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { tenantCode: { contains: search } },
        { tenantName: { contains: search } },
        { contactPerson: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    const total = await prisma.tenant.count({ where })

    const tenants = await prisma.tenant.findMany({
      where,
      select: {
        id: true,
        tenantCode: true,
        tenantName: true,
        contactPerson: true,
        contactPhone: true,
        contactEmail: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            warehouses: true,
            clients: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: tenants,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取租户列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取租户列表失败' },
      { status: 500 }
    )
  }
})

// POST /api/v1/tenants - 创建租户 (仅超级管理员)
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    // 超级管理员权限检查
    if (auth.user.userType !== 'SYSTEM') {
      return NextResponse.json(
        { success: false, message: '无权限访问' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createTenantSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 检查租户编码是否已存在 (全局唯一)
    const existingTenant = await prisma.tenant.findUnique({
      where: { tenantCode: data.tenantCode },
    })

    if (existingTenant) {
      return NextResponse.json(
        { success: false, message: '租户编码已存在', code: 'TENANT_CODE_EXISTS' },
        { status: 400 }
      )
    }

    // 生成默认管理员密码
    const adminPassword = generateSecurePassword()
    const adminPasswordHash = await hashPassword(adminPassword)
    const adminUsername = `${data.tenantCode.toLowerCase()}_admin`

    // 使用事务创建租户、角色、用户和权限
    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建租户
      const tenant = await tx.tenant.create({
        data: {
          tenantCode: data.tenantCode,
          tenantName: data.tenantName,
          contactPerson: data.contactPerson || null,
          contactPhone: data.contactPhone || null,
          contactEmail: data.contactEmail || null,
          address: data.address || null,
          config: (data.config || {}) as object,
          status: 'ACTIVE',
          createdBy: auth.user.id,
        },
      })

      // 2. 创建租户管理员角色
      const tenantAdminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          roleCode: 'TENANT_ADMIN',
          roleName: '租户管理员',
          description: '租户默认管理员角色，拥有租户内所有管理权限',
          roleLevel: 2,
          isSystem: true,
          isActive: true,
          createdBy: auth.user.id,
        },
      })

      // 3. 创建默认管理员用户
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          username: adminUsername,
          passwordHash: adminPasswordHash,
          fullName: `${data.tenantName}管理员`,
          email: data.contactEmail || null,
          phone: data.contactPhone || null,
          userType: 'INTERNAL',
          status: 'ACTIVE',
          isActive: true,
          passwordChangedAt: new Date(),
          passwordExpiresAt: calculatePasswordExpiryDate(),
          config: {},
          createdBy: auth.user.id,
        },
      })

      // 4. 绑定用户角色
      await tx.userRole.create({
        data: {
          tenantId: tenant.id,
          userId: adminUser.id,
          roleId: tenantAdminRole.id,
          scopeType: 'GLOBAL',
          isPrimary: true,
          assignedBy: auth.user.id,
          isActive: true,
        },
      })

      // 5. 查询所有权限（排除租户管理权限）
      const permissions = await tx.permission.findMany({
        where: {
          isActive: true,
          NOT: {
            permissionCode: { startsWith: 'tenant:' },
          },
        },
      })

      // 6. 为租户管理员角色分配权限
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({
            tenantId: tenant.id,
            roleId: tenantAdminRole.id,
            permissionId: p.id,
            isGranted: true,
          })),
        })
      }

      return {
        tenant,
        adminUser,
        permissionCount: permissions.length,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: result.tenant.id,
          tenantCode: result.tenant.tenantCode,
          tenantName: result.tenant.tenantName,
          contactPerson: result.tenant.contactPerson,
          contactPhone: result.tenant.contactPhone,
          status: result.tenant.status,
          createdAt: result.tenant.createdAt,
        },
        defaultAdmin: {
          username: adminUsername,
          password: adminPassword,
          fullName: result.adminUser.fullName,
        },
      },
      message: '租户创建成功',
    })
  } catch (error) {
    console.error('创建租户失败:', error)
    return NextResponse.json(
      { success: false, message: '创建租户失败' },
      { status: 500 }
    )
  }
})
