import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import {
  hashPassword,
  generateSecurePassword,
  calculatePasswordExpiryDate,
} from '@/lib/security/password'

// POST /api/v1/tenants/[id]/reset-password - 重置租户管理员密码 (仅超级管理员)
export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    // 超级管理员权限检查
    if (auth.user.userType !== 'SYSTEM') {
      return NextResponse.json(
        { success: false, message: '无权限访问' },
        { status: 403 }
      )
    }

    const { id: tenantId } = await context!.params

    // 检查租户是否存在
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    })

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: '租户不存在' },
        { status: 404 }
      )
    }

    // 查找租户的管理员用户（TENANT_ADMIN角色的用户）
    const adminUserRole = await prisma.userRole.findFirst({
      where: {
        tenantId,
        role: {
          roleCode: 'TENANT_ADMIN',
        },
        isActive: true,
      },
      include: {
        user: true,
      },
    })

    if (!adminUserRole) {
      return NextResponse.json(
        { success: false, message: '未找到租户管理员用户' },
        { status: 404 }
      )
    }

    // 生成新密码
    const newPassword = generateSecurePassword()
    const newPasswordHash = await hashPassword(newPassword)

    // 更新用户密码
    await prisma.user.update({
      where: { id: adminUserRole.userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        passwordExpiresAt: calculatePasswordExpiryDate(),
        failedLoginCount: 0,
        lockedAt: null,
        lockedUntil: null,
        updatedBy: auth.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        username: adminUserRole.user.username,
        password: newPassword,
        fullName: adminUserRole.user.fullName,
      },
      message: '密码重置成功',
    })
  } catch (error) {
    console.error('重置密码失败:', error)
    return NextResponse.json(
      { success: false, message: '重置密码失败' },
      { status: 500 }
    )
  }
})
