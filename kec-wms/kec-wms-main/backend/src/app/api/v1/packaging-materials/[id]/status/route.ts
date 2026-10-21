import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { changePackagingMaterialStatusSchema } from '@/lib/validations/packaging-material'
import { NextResponse } from 'next/server'

// PUT /api/v1/packaging-materials/[id]/status - 修改包材状态
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = changePackagingMaterialStatusSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const existingMaterial = await prisma.packagingMaterial.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingMaterial) {
      return NextResponse.json(
        { success: false, message: '包材不存在', code: 'MATERIAL_NOT_FOUND' },
        { status: 404 }
      )
    }

    const { isActive } = validationResult.data

    const material = await prisma.packagingMaterial.update({
      where: { id },
      data: {
        isActive,
        updatedBy: auth.user.id,
      },
      select: {
        id: true,
        materialCode: true,
        materialName: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: material,
      message: isActive ? '包材已启用' : '包材已禁用',
    })
  } catch (error) {
    console.error('修改包材状态失败:', error)
    return NextResponse.json(
      { success: false, message: '修改包材状态失败' },
      { status: 500 }
    )
  }
})
