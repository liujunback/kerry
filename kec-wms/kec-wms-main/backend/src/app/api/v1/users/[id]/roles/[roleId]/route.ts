import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { clearUserPermissionCache } from '@/lib/cache/permission-cache'
import { createAuthHandler } from '@/lib/api/create-handler'

// DELETE /api/v1/users/[id]/roles/[roleId] - 移除角色
export const DELETE = createAuthHandler(async (request, auth, context) => {
  try {
    const { id, roleId } = await context!.params

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

    const userRole = await prisma.userRole.findFirst({
      where: {
        id: roleId,
        userId: id,
        isActive: true,
      },
    })

    if (!userRole) {
      return NextResponse.json(
        { success: false, message: '角色关联不存在' },
        { status: 404 }
      )
    }

    await prisma.userRole.update({
      where: { id: roleId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    clearUserPermissionCache(id)

    return NextResponse.json({
      success: true,
      message: '角色移除成功',
    })
  } catch (error) {
    console.error('移除角色失败:', error)
    return NextResponse.json(
      { success: false, message: '移除角色失败' },
      { status: 500 }
    )
  }
})
