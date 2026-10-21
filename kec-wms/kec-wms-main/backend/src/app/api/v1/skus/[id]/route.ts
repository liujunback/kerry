import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { updateSkuSchema } from '@/lib/validations/sku'
import { authenticate, hasApiScope } from '@/lib/auth/unified-auth'
import { withUnifiedAuditContext } from '@/middleware/audit-context'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/skus/[id] - 获取单个SKU详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await authenticate(request)

    if (!authResult.success || !authResult.context) {
      return NextResponse.json(
        { success: false, message: '未授权' },
        { status: authResult.status || 401 }
      )
    }

    const authContext = authResult.context

    if (!hasApiScope(authContext, 'sku:read')) {
      return NextResponse.json(
        { success: false, message: '无权限' },
        { status: 403 }
      )
    }

    const { id } = await params

    const where: Record<string, unknown> = {
      id,
      tenantId: authContext.tenantId,
    }

    // API Key 如果绑定了客户，只能查看该客户的SKU
    if (authContext.clientId) {
      where.clientId = authContext.clientId
    }

    const sku = await prisma.sku.findFirst({
      where,
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        category: {
          select: {
            id: true,
            categoryCode: true,
            categoryName: true,
            path: true,
          },
        },
        uoms: {
          select: {
            id: true,
            uomCode: true,
            uomName: true,
            conversionFactor: true,
            barcode: true,
            isBaseUom: true,
            isReceivingUom: true,
            isShippingUom: true,
            isActive: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        barcodes: {
          select: {
            id: true,
            barcode: true,
            barcodeType: true,
            isPrimary: true,
            isActive: true,
          },
        },
        images: {
          select: {
            id: true,
            imageUrl: true,
            thumbnailUrl: true,
            imageType: true,
            isPrimary: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        attributes: {
          select: {
            id: true,
            attributeName: true,
            attributeValue: true,
            attributeType: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            inventoryBuckets: true,
            skuInventorySummaries: true,
          },
        },
      },
    })

    if (!sku) {
      return NextResponse.json(
        { success: false, message: 'SKU不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sku,
    })
  } catch (error) {
    console.error('获取SKU详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取SKU详情失败' },
      { status: 500 }
    )
  }
}

// PUT /api/v1/skus/[id] - 更新SKU
export async function PUT(request: NextRequest, { params }: RouteParams) {
  console.log('[SKU API] PUT /api/v1/skus/[id] called')
  const { id } = await params
  console.log('[SKU API] [id] route - id param:', id)
  const authResult = await authenticate(request)

  if (!authResult.success || !authResult.context) {
    return NextResponse.json(
      { success: false, message: '未授权' },
      { status: authResult.status || 401 }
    )
  }

  const authContext = authResult.context

  if (!hasApiScope(authContext, 'sku:update')) {
    return NextResponse.json(
      { success: false, message: '无权限' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const { id } = await params
      const body = await request.json()
      const validationResult = updateSkuSchema.safeParse(body)

      if (!validationResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: validationResult.error.errors },
          { status: 400 }
        )
      }

      const { config, ...restData } = validationResult.data

      // 检查SKU是否存在
      const where: Record<string, unknown> = {
        id,
        tenantId: authContext.tenantId,
      }

      // API Key 如果绑定了客户，只能更新该客户的SKU
      if (authContext.clientId) {
        where.clientId = authContext.clientId
      }

      const existingSku = await prisma.sku.findFirst({ where })

      if (!existingSku) {
        return NextResponse.json(
          { success: false, message: 'SKU不存在' },
          { status: 404 }
        )
      }

      // 首次收货后，只允许修改长宽高重量、备注和状态
      // 直接过滤掉受限字段，只保留允许修改的字段
      let updateData = { ...restData }
      if (!existingSku.isFirstReceiving) {
        const allowedFields = ['lengthCm', 'widthCm', 'heightCm', 'weightKg', 'volumeCbm', 'notes', 'status']
        updateData = Object.fromEntries(
          Object.entries(restData).filter(([key]) => allowedFields.includes(key))
        ) as typeof restData
      }

      // 如果要停用SKU，检查是否有库存
      if (restData.status === 'INACTIVE' && existingSku.status !== 'INACTIVE') {
        const inventoryCount = await prisma.inventoryBucket.count({
          where: {
            skuId: id,
            quantity: { gt: 0 },
          },
        })

        if (inventoryCount > 0) {
          return NextResponse.json(
            { success: false, message: '该SKU存在库存，无法停用', code: 'SKU_HAS_INVENTORY' },
            { status: 400 }
          )
        }
      }

      // 如果更新SKU编码，检查是否重复
      if (restData.skuCode && restData.skuCode !== existingSku.skuCode) {
        const duplicateSku = await prisma.sku.findFirst({
          where: {
            clientId: existingSku.clientId,
            skuCode: restData.skuCode,
            id: { not: id },
          },
        })

        if (duplicateSku) {
          return NextResponse.json(
            { success: false, message: 'SKU编码已存在', code: 'SKU_CODE_EXISTS' },
            { status: 400 }
          )
        }
      }

      // 如果更新条码，检查同一客户下是否重复
      if (restData.barcode && restData.barcode !== existingSku.barcode) {
        const duplicateBarcode = await prisma.sku.findFirst({
          where: {
            clientId: existingSku.clientId,
            barcode: restData.barcode,
            id: { not: id },
          },
        })

        if (duplicateBarcode) {
          return NextResponse.json(
            { success: false, message: '该条码已被其他SKU使用', code: 'BARCODE_EXISTS' },
            { status: 400 }
          )
        }
      }

      // 如果更新分类，检查分类是否存在
      if (restData.categoryId) {
        const category = await prisma.skuCategory.findFirst({
          where: {
            id: restData.categoryId,
            tenantId: authContext.tenantId,
          },
        })

        if (!category) {
          return NextResponse.json(
            { success: false, message: 'SKU分类不存在' },
            { status: 400 }
          )
        }
      }

      const sku = await prisma.sku.update({
        where: { id },
        data: {
          ...updateData,
          ...(config !== undefined && existingSku.isFirstReceiving && { config: config as Prisma.InputJsonValue }),
          updatedBy: authContext.userId,
        },
        select: {
          id: true,
          skuCode: true,
          skuName: true,
          barcode: true,
          unit: true,
          lengthCm: true,
          widthCm: true,
          heightCm: true,
          weightKg: true,
          unitPrice: true,
          currency: true,
          storageCondition: true,
          isBatchManaged: true,
          isSerialManaged: true,
          isExpiryManaged: true,
          abcClass: true,
          status: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              clientCode: true,
              clientName: true,
            },
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: sku,
        message: 'SKU更新成功',
      })
    } catch (error) {
      console.error('更新SKU失败:', error)
      return NextResponse.json(
        { success: false, message: '更新SKU失败' },
        { status: 500 }
      )
    }
  })
}

// DELETE /api/v1/skus/[id] - 删除SKU
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await authenticate(request)

  if (!authResult.success || !authResult.context) {
    return NextResponse.json(
      { success: false, message: '未授权' },
      { status: authResult.status || 401 }
    )
  }

  const authContext = authResult.context

  if (!hasApiScope(authContext, 'sku:delete')) {
    return NextResponse.json(
      { success: false, message: '无权限' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const { id } = await params

      // 检查SKU是否存在
      const where: Record<string, unknown> = {
        id,
        tenantId: authContext.tenantId,
      }

      if (authContext.clientId) {
        where.clientId = authContext.clientId
      }

      const existingSku = await prisma.sku.findFirst({
        where,
        include: {
          _count: {
            select: {
              inventoryBuckets: true,
              asnLines: true,
              outboundOrderLines: true,
            },
          },
        },
      })

      if (!existingSku) {
        return NextResponse.json(
          { success: false, message: 'SKU不存在' },
          { status: 404 }
        )
      }

      // 检查是否有关联数据
      if (existingSku._count.inventoryBuckets > 0) {
        return NextResponse.json(
          { success: false, message: 'SKU存在库存记录，无法删除' },
          { status: 400 }
        )
      }

      if (existingSku._count.asnLines > 0) {
        return NextResponse.json(
          { success: false, message: 'SKU存在ASN记录，无法删除' },
          { status: 400 }
        )
      }

      if (existingSku._count.outboundOrderLines > 0) {
        return NextResponse.json(
          { success: false, message: 'SKU存在出库订单记录，无法删除' },
          { status: 400 }
        )
      }

      await prisma.sku.delete({
        where: { id },
      })

      return NextResponse.json({
        success: true,
        message: 'SKU删除成功',
      })
    } catch (error) {
      console.error('删除SKU失败:', error)
      return NextResponse.json(
        { success: false, message: '删除SKU失败' },
        { status: 500 }
      )
    }
  })
}
