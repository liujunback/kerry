import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updatePrintLabelSpecSchema } from '@/lib/validations/print'
import { NextResponse } from 'next/server'

export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const existing = await prisma.printLabelSpec.findFirst({
      where: { id, tenantId: auth.user.tenantId, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: '标签规格不存在' }, { status: 404 })
    }

    if (existing.isSystem) {
      return NextResponse.json({ success: false, message: '系统内置规格不可编辑' }, { status: 400 })
    }

    const body = await request.json()
    const result = updatePrintLabelSpecSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: result.error.errors },
        { status: 400 }
      )
    }

    const spec = await prisma.printLabelSpec.update({
      where: { id },
      data: {
        ...result.data,
        updatedBy: auth.user.id,
      },
    })

    await prisma.printTemplate.updateMany({
      where: {
        tenantId: auth.user.tenantId,
        labelSpecCode: spec.code,
        isActive: true,
      },
      data: {
        widthMm: spec.widthMm,
        heightMm: spec.heightMm,
        orientation: spec.orientation,
      },
    })

    return NextResponse.json({ success: true, data: spec, message: '标签规格已更新' })
  } catch (error) {
    console.error('更新标签规格失败:', error)
    return NextResponse.json({ success: false, message: '更新标签规格失败' }, { status: 500 })
  }
})

export const DELETE = createAuthHandler(async (_request, auth, context) => {
  try {
    const { id } = await context!.params
    const existing = await prisma.printLabelSpec.findFirst({
      where: { id, tenantId: auth.user.tenantId, isActive: true },
    })

    if (!existing) {
      return NextResponse.json({ success: false, message: '标签规格不存在' }, { status: 404 })
    }

    if (existing.isSystem) {
      return NextResponse.json({ success: false, message: '系统内置规格不可删除' }, { status: 400 })
    }

    const templateCount = await prisma.printTemplate.count({
      where: { tenantId: auth.user.tenantId, labelSpecCode: existing.code, isActive: true },
    })
    if (templateCount > 0) {
      return NextResponse.json({ success: false, message: '该规格已被模板使用，不能删除' }, { status: 400 })
    }

    await prisma.printLabelSpec.update({
      where: { id },
      data: { isActive: false, updatedBy: auth.user.id },
    })

    return NextResponse.json({ success: true, message: '标签规格已删除' })
  } catch (error) {
    console.error('删除标签规格失败:', error)
    return NextResponse.json({ success: false, message: '删除标签规格失败' }, { status: 500 })
  }
})
