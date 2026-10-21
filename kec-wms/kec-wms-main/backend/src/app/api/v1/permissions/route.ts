import { createAuthHandler } from '@/lib/api/create-handler'
import { prismaRead } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// GET /api/v1/permissions - 获取权限列表（按分类分组）
export const GET = createAuthHandler(async () => {
  try {
    const permissions = await prismaRead.permission.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        permissionCode: true,
        permissionName: true,
        description: true,
        resourceType: true,
        action: true,
        category: true,
        parentId: true,
        isSystem: true,
        sortOrder: true,
      },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { permissionCode: 'asc' },
      ],
    })

    // 按分类分组
    const categoryMap = new Map<string, typeof permissions>()

    for (const permission of permissions) {
      const category = permission.category
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(permission)
    }

    const categories = Array.from(categoryMap.entries()).map(([category, perms]) => ({
      category,
      permissions: perms,
    }))

    return NextResponse.json({
      success: true,
      data: {
        categories,
        total: permissions.length,
      },
    })
  } catch (error) {
    console.error('获取权限列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取权限列表失败' },
      { status: 500 }
    )
  }
})
