import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updateTenantSchema } from '@/lib/validations/tenant'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/tenants/[id] - 获取租户详情 (仅超级管理员)
export const GET = createAuthHandler(async (
  _request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    if (auth.user.userType !== 'SYSTEM') {
      return NextResponse.json(
        { success: false, message: '无权限访问' },
        { status: 403 }
      )
    }

    const { id } = await params

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            warehouses: true,
            clients: true,
          },
        },
      },
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: '租户不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: tenant,
    })
  } catch (error) {
    console.error('获取租户详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取租户详情失败' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/tenants/[id] - 更新租户 (仅超级管理员)
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    if (auth.user.userType !== 'SYSTEM') {
      return NextResponse.json(
        { success: false, message: '无权限访问' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validationResult = updateTenantSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    })

    if (!existingTenant) {
      return NextResponse.json(
        { success: false, message: '租户不存在' },
        { status: 404 }
      )
    }

    const data = validationResult.data

    // 检查租户编码是否重复
    if (data.tenantCode && data.tenantCode !== existingTenant.tenantCode) {
      const duplicateCode = await prisma.tenant.findFirst({
        where: {
          tenantCode: data.tenantCode,
          id: { not: id },
        },
      })

      if (duplicateCode) {
        return NextResponse.json(
          { success: false, message: '租户编码已存在', code: 'TENANT_CODE_EXISTS' },
          { status: 400 }
        )
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(data.tenantCode && { tenantCode: data.tenantCode }),
        ...(data.tenantName && { tenantName: data.tenantName }),
        ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson || null }),
        ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone || null }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.config !== undefined && { config: data.config as object }),
        updatedBy: auth.user.id,
      },
      select: {
        id: true,
        tenantCode: true,
        tenantName: true,
        contactPerson: true,
        contactPhone: true,
        contactEmail: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: tenant,
      message: '租户更新成功',
    })
  } catch (error) {
    console.error('更新租户失败:', error)
    return NextResponse.json(
      { success: false, message: '更新租户失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/tenants/[id] - 删除租户 (仅超级管理员)
export const DELETE = createAuthHandler(async (
  _request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    if (auth.user.userType !== 'SYSTEM') {
      return NextResponse.json(
        { success: false, message: '无权限访问' },
        { status: 403 }
      )
    }

    const { id } = await params

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            warehouses: true,
            clients: true,
            inventoryBuckets: true,
          },
        },
      },
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: '租户不存在' },
        { status: 404 }
      )
    }

    // 检查是否有业务数据（仓库、客户、库存等）
    if (tenant._count.warehouses > 0 || tenant._count.clients > 0 || tenant._count.inventoryBuckets > 0) {
      return NextResponse.json(
        { success: false, message: '租户存在业务数据，无法删除', code: 'TENANT_HAS_DATA' },
        { status: 400 }
      )
    }

    // 使用事务级联删除租户及其关联的用户、角色、权限数据
    await prisma.$transaction(async (tx) => {
      // 1. 删除审计日志
      await tx.audit.deleteMany({
        where: { tenantId: id },
      })

      // 2. 删除后台任务
      await tx.backgroundJob.deleteMany({
        where: { tenantId: id },
      })

      // 3. 删除角色权限关联
      await tx.rolePermission.deleteMany({
        where: { tenantId: id },
      })

      // 4. 删除用户角色关联
      await tx.userRole.deleteMany({
        where: { tenantId: id },
      })

      // 5. 删除用户仓库关联
      await tx.userWarehouse.deleteMany({
        where: { tenantId: id },
      })

      // 6. 删除登录历史
      await tx.loginHistory.deleteMany({
        where: { tenantId: id },
      })

      // 7. 删除用户
      await tx.user.deleteMany({
        where: { tenantId: id },
      })

      // 8. 删除角色
      await tx.role.deleteMany({
        where: { tenantId: id },
      })

      // 9. 删除租户
      await tx.tenant.delete({
        where: { id },
      })
    })

    return NextResponse.json({
      success: true,
      message: '租户删除成功',
    })
  } catch (error) {
    console.error('删除租户失败:', error)
    return NextResponse.json(
      { success: false, message: '删除租户失败' },
      { status: 500 }
    )
  }
})
