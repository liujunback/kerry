import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updatePrintTemplateSchema } from '@/lib/validations/print'
import { NextResponse } from 'next/server'

// GET /api/v1/print-templates/[id]
export const GET = createAuthHandler(async (_req, auth, context) => {
  try {
    const { id } = await context!.params
    const template = await prisma.printTemplate.findFirst({
      where: { id, tenantId: auth.user.tenantId },
      select: {
        id: true,
        name: true,
        labelType: true,
        scenarioType: true,
        labelSpecCode: true,
        warehouseId: true,
        widthMm: true,
        heightMm: true,
        orientation: true,
        isDefault: true,
        defaultDeviceId: true,
        defaultDevice: { select: { id: true, name: true } },
        warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
      },
    })

    if (!template) {
      return NextResponse.json({ success: false, message: '模板不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: template })
  } catch (error) {
    console.error('获取打印模板失败:', error)
    return NextResponse.json({ success: false, message: '获取打印模板失败' }, { status: 500 })
  }
})

// PUT /api/v1/print-templates/[id]
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const existing = await prisma.printTemplate.findFirst({
      where: { id, tenantId: auth.user.tenantId },
      select: {
        id: true,
        tenantId: true,
        labelType: true,
        scenarioType: true,
        labelSpecCode: true,
        warehouseId: true,
        isDefault: true,
      },
    })
    if (!existing) {
      return NextResponse.json({ success: false, message: '模板不存在' }, { status: 404 })
    }

    const body = await request.json()
    const result = updatePrintTemplateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: result.error.errors },
        { status: 400 }
      )
    }

    const data = result.data
    const scenarioType = data.scenarioType ?? existing.scenarioType ?? 'SHIPMENT_LABEL'
    const labelSpecCode = data.labelSpecCode ?? existing.labelSpecCode ?? existing.labelType
    const nextIsDefault = data.isDefault ?? existing.isDefault
    const warehouseId = data.warehouseId === undefined ? existing.warehouseId : data.warehouseId ?? null
    if (warehouseId) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, tenantId: auth.user.tenantId },
        select: { id: true },
      })
      if (!warehouse) {
        return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 400 })
      }
    }
    const labelSpec = await prisma.printLabelSpec.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        code: labelSpecCode,
        isActive: true,
      },
    })

    if (!labelSpec) {
      return NextResponse.json({ success: false, message: '标签规格不存在或已停用' }, { status: 400 })
    }

    if (nextIsDefault) {
      await prisma.printTemplate.updateMany({
        where: {
          tenantId: auth.user.tenantId,
          scenarioType,
          warehouseId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      })
    }

    const template = await prisma.printTemplate.update({
      where: { id },
      data: {
        ...data,
        labelType: labelSpec.code,
        scenarioType,
        labelSpecCode: labelSpec.code,
        warehouseId,
        widthMm: labelSpec.widthMm,
        heightMm: labelSpec.heightMm,
        orientation: labelSpec.orientation,
        margins: data.margins ?? undefined,
        fieldMappings: data.fieldMappings ?? undefined,
        defaultDeviceId: data.defaultDeviceId === undefined ? undefined : (data.defaultDeviceId || null),
        updatedBy: auth.user.id,
      },
    })

    return NextResponse.json({ success: true, data: template, message: '模板更新成功' })
  } catch (error) {
    console.error('更新打印模板失败:', error)
    return NextResponse.json({ success: false, message: '更新打印模板失败' }, { status: 500 })
  }
})

// DELETE /api/v1/print-templates/[id]
export const DELETE = createAuthHandler(async (_req, auth, context) => {
  try {
    const { id } = await context!.params
    const existing = await prisma.printTemplate.findFirst({
      where: { id, tenantId: auth.user.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ success: false, message: '模板不存在' }, { status: 404 })
    }

    await prisma.printTemplate.delete({ where: { id } })
    return NextResponse.json({ success: true, message: '模板已删除' })
  } catch (error) {
    console.error('删除打印模板失败:', error)
    return NextResponse.json({ success: false, message: '删除打印模板失败' }, { status: 500 })
  }
})
