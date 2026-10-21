import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { createPrintTemplateSchema,printTemplateListQuerySchema } from '@/lib/validations/print'
import { NextResponse } from 'next/server'

// GET /api/v1/print-templates
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = printTemplateListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      labelType: searchParams.get('labelType'),
      scenarioType: searchParams.get('scenarioType'),
      labelSpecCode: searchParams.get('labelSpecCode'),
      warehouseId: searchParams.get('warehouseId'),
      search: searchParams.get('search'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, labelType, scenarioType, labelSpecCode, warehouseId, search } = queryResult.data
    const where: Record<string, unknown> = { tenantId: auth.user.tenantId }
    const isDefault = searchParams.get('isDefault')

    if (labelType) where.labelType = labelType
    if (scenarioType) where.scenarioType = scenarioType
    if (labelSpecCode) where.labelSpecCode = labelSpecCode
    if (warehouseId !== undefined) {
      where.warehouseId = warehouseId
    }
    if (search) where.name = { contains: search }
    if (isDefault === 'true') where.isDefault = true

    const total = await prisma.printTemplate.count({ where })
    const templates = await prisma.printTemplate.findMany({
      where,
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
        isActive: true,
        createdAt: true,
        defaultDevice: {
          select: {
            id: true,
            name: true,
            connectionType: true,
            printerName: true,
            ipAddress: true,
            port: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseName: true,
            warehouseCode: true,
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: templates,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    console.error('获取打印模板列表失败:', error)
    return NextResponse.json({ success: false, message: '获取打印模板列表失败' }, { status: 500 })
  }
})

// POST /api/v1/print-templates
export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const result = createPrintTemplateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: result.error.errors },
        { status: 400 }
      )
    }

    const data = result.data
    if (data.warehouseId) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: data.warehouseId, tenantId: auth.user.tenantId },
        select: { id: true },
      })
      if (!warehouse) {
        return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 400 })
      }
    }
    const labelSpec = await prisma.printLabelSpec.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        code: data.labelSpecCode,
        isActive: true,
      },
    })

    if (!labelSpec) {
      return NextResponse.json({ success: false, message: '标签规格不存在或已停用' }, { status: 400 })
    }

    // 如果设为默认，先取消同业务标签的其他默认模板
    if (data.isDefault) {
      await prisma.printTemplate.updateMany({
        where: {
          tenantId: auth.user.tenantId,
          scenarioType: data.scenarioType,
          warehouseId: data.warehouseId ?? null,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    const template = await prisma.printTemplate.create({
      data: {
        tenantId: auth.user.tenantId,
        name: data.name,
        labelType: labelSpec.code,
        scenarioType: data.scenarioType,
        labelSpecCode: labelSpec.code,
        warehouseId: data.warehouseId ?? null,
        widthMm: labelSpec.widthMm,
        heightMm: labelSpec.heightMm,
        orientation: labelSpec.orientation,
        margins: data.margins ?? undefined,
        templateContent: data.templateContent ?? null,
        fieldMappings: data.fieldMappings ?? undefined,
        defaultDeviceId: data.defaultDeviceId ?? null,
        isDefault: data.isDefault,
        createdBy: auth.user.id,
      },
    })

    return NextResponse.json({ success: true, data: template, message: '模板创建成功' })
  } catch (error) {
    console.error('创建打印模板失败:', error)
    return NextResponse.json({ success: false, message: '创建打印模板失败' }, { status: 500 })
  }
})
