import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createRoleSchema } from '@/lib/validations/role'
import { createAuthHandler } from '@/lib/api/create-handler'

// GET /api/v1/roles - 获取角色列表
export const GET = createAuthHandler(async (request, auth) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const search = searchParams.get('search') || ''
  const all = searchParams.get('all') === 'true'

  const where = {
    tenantId: auth.user.tenantId,
    isActive: true,
    ...(search && {
      OR: [{ roleCode: { contains: search } }, { roleName: { contains: search } }],
    }),
  }

  if (all) {
    const roles = await prisma.role.findMany({
      where,
      select: { id: true, roleCode: true, roleName: true, description: true, roleLevel: true, isSystem: true },
      orderBy: [{ roleLevel: 'asc' }, { sortOrder: 'asc' }],
    })
    return NextResponse.json({ success: true, data: roles })
  }

  const [roles, total] = await Promise.all([
    prisma.role.findMany({
      where,
      select: {
        id: true,
        roleCode: true,
        roleName: true,
        description: true,
        roleLevel: true,
        isSystem: true,
        isActive: true,
        createdAt: true,
        _count: { select: { userRoles: true, rolePermissions: true } },
      },
      orderBy: [{ roleLevel: 'asc' }, { sortOrder: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.role.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: roles,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  })
})

// POST /api/v1/roles - 创建角色
export const POST = createAuthHandler(async (request, auth) => {
  const body = await request.json()
  const validationResult = createRoleSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数校验失败', errors: validationResult.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { roleCode, roleName, description, roleLevel, parentRoleId } = validationResult.data

  const existingRole = await prisma.role.findUnique({
    where: { tenantId_roleCode: { tenantId: auth.user.tenantId, roleCode } },
  })

  if (existingRole) {
    return NextResponse.json({ success: false, message: '角色编码已存在' }, { status: 400 })
  }

  if (parentRoleId) {
    const parentRole = await prisma.role.findFirst({
      where: { id: parentRoleId, tenantId: auth.user.tenantId, isActive: true },
    })
    if (!parentRole) {
      return NextResponse.json({ success: false, message: '父角色不存在' }, { status: 400 })
    }
  }

  const role = await prisma.role.create({
    data: {
      tenantId: auth.user.tenantId,
      roleCode,
      roleName,
      description,
      roleLevel,
      parentRoleId,
      isSystem: false,
      isActive: true,
      createdBy: auth.user.id,
    },
    select: {
      id: true,
      roleCode: true,
      roleName: true,
      description: true,
      roleLevel: true,
      isSystem: true,
      isActive: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ success: true, data: role })
})
