import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { changeTenantStatusSchema } from '@/lib/validations/tenant'

// PUT /api/v1/tenants/[id]/status - 修改租户状态 (仅超级管理员)
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    if (auth.user.userType !== 'SYSTEM') {
      return NextResponse.json(
        { success: false, message: '无权限访问' },
        { status: 403 }
      )
    }

    const { id } = await context!.params
    const body = await request.json()
    const validationResult = changeTenantStatusSchema.safeParse(body)

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

    const { status } = validationResult.data

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        status,
        updatedBy: auth.user.id,
      },
      select: {
        id: true,
        tenantCode: true,
        tenantName: true,
        status: true,
        updatedAt: true,
      },
    })

    const statusMessages: Record<string, string> = {
      ACTIVE: '租户已启用',
      INACTIVE: '租户已停用',
      SUSPENDED: '租户已暂停',
    }

    return NextResponse.json({
      success: true,
      data: tenant,
      message: statusMessages[status],
    })
  } catch (error) {
    console.error('修改租户状态失败:', error)
    return NextResponse.json(
      { success: false, message: '修改租户状态失败' },
      { status: 500 }
    )
  }
})
