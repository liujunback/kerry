import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { createSkuSchema, skuListQuerySchema } from '@/lib/validations/sku'
import { authenticate, hasApiScope } from '@/lib/auth/unified-auth'
import { withUnifiedAuditContext } from '@/middleware/audit-context'
import { isUniqueConstraintError } from '@/lib/db/prisma-error-utils'

// GET /api/v1/skus - 获取SKU列表
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const queryResult = skuListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      clientCode: searchParams.get('clientCode'),
      clientId: searchParams.get('clientId'),
      categoryId: searchParams.get('categoryId'),
      status: searchParams.get('status'),
      abcClass: searchParams.get('abcClass'),
      storageCondition: searchParams.get('storageCondition'),
      isBatchManaged: searchParams.get('isBatchManaged'),
      isSerialManaged: searchParams.get('isSerialManaged'),
      isFirstReceiving: searchParams.get('isFirstReceiving'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const {
      page,
      pageSize,
      search,
      clientCode,
      clientId,
      categoryId,
      status,
      abcClass,
      storageCondition,
      isBatchManaged,
      isSerialManaged,
      isFirstReceiving,
      sortBy,
      sortOrder,
    } = queryResult.data

    const where: Record<string, unknown> = {
      tenantId: authContext.tenantId,
    }

    // API Key 如果绑定了客户，只能查看该客户的SKU
    if (authContext.clientId) {
      where.clientId = authContext.clientId
    }

    if (authContext.type === 'apiKey' && !authContext.clientId && !clientCode) {
      return NextResponse.json(
        { success: false, message: '客户编码(clientCode)不能为空' },
        { status: 400 }
      )
    }

    if (authContext.type === 'apiKey' && !authContext.clientId && clientCode) {
      const client = await prisma.client.findFirst({
        where: {
          tenantId: authContext.tenantId,
          clientCode,
        },
        select: { id: true },
      })

      if (!client) {
        return NextResponse.json(
          { success: false, message: '客户不存在' },
          { status: 404 }
        )
      }

      where.clientId = client.id
    }

    if (search) {
      where.OR = [
        { skuCode: { contains: search } },
        { skuName: { contains: search } },
        { barcode: { contains: search } },
      ]
    }

    if (clientId && !authContext.clientId) where.clientId = clientId
    if (categoryId) where.categoryId = categoryId
    if (status) where.status = status
    if (abcClass) where.abcClass = abcClass
    if (storageCondition) where.storageCondition = storageCondition
    if (isBatchManaged !== undefined) where.isBatchManaged = isBatchManaged
    if (isSerialManaged !== undefined) where.isSerialManaged = isSerialManaged
    if (isFirstReceiving !== undefined) where.isFirstReceiving = isFirstReceiving

    const total = await prisma.sku.count({ where })

    const skus = await prisma.sku.findMany({
      where,
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
        abcClass: true,
        isBatchManaged: true,
        isSerialManaged: true,
        isExpiryManaged: true,
        isFirstReceiving: true,
        isSelfPackaged: true,
        imageUrl: true,
        status: true,
        createdAt: true,
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
          },
        },
        _count: {
          select: {
            uoms: true,
            barcodes: true,
            inventoryBuckets: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: skus,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取SKU列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取SKU列表失败' },
      { status: 500 }
    )
  }
}

// POST /api/v1/skus - 创建SKU
export async function POST(request: NextRequest) {
  const authResult = await authenticate(request)

  if (!authResult.success || !authResult.context) {
    return NextResponse.json(
      { success: false, message: '未授权' },
      { status: authResult.status || 401 }
    )
  }

  const authContext = authResult.context

  if (!hasApiScope(authContext, 'sku:create')) {
    return NextResponse.json(
      { success: false, message: '无权限' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const body = await request.json()
      const {
        barcode,
        clientCode,
        clientId: bodyClientId,
        categoryCode,
        categoryId: bodyCategoryId,
        shelfLifeDays,
      } = body

      // 解析客户ID
      let clientId = bodyClientId || authContext.clientId
      if (!clientId && clientCode) {
        const client = await prisma.client.findFirst({
          where: {
            tenantId: authContext.tenantId,
            clientCode,
          },
        })
        if (client) {
          clientId = client.id
        }
      }

      // 解析分类ID
      let categoryId = bodyCategoryId
      if (!categoryId && categoryCode) {
        const category = await prisma.skuCategory.findFirst({
          where: {
            tenantId: authContext.tenantId,
            categoryCode,
          },
        })
        if (category) {
          categoryId = category.id
        }
      }

      const validationResult = createSkuSchema.safeParse({
        ...body,
        clientId,
        categoryId,
        shelfLifeWarningDays: shelfLifeDays,
      })

      if (!validationResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: validationResult.error.errors },
          { status: 400 }
        )
      }

      const {
        skuCode,
        skuName,
        clientId: validatedClientId,
        unit,
        lengthCm,
        widthCm,
        heightCm,
        weightKg,
        unitPrice,
        currency,
        storageCondition,
        isBatchManaged,
        isSerialManaged,
        isExpiryManaged,
        abcClass,
        shelfLifeWarningDays,
        config,
        notes,
        ...restValidatedData
      } = validationResult.data

      if (!clientId) {
        return NextResponse.json(
          { success: false, message: '客户不能为空' },
          { status: 400 }
        )
      }

      // 检查同一客户下条码是否重复
      if (barcode) {
        const existingBarcode = await prisma.sku.findFirst({
          where: {
            clientId,
            barcode,
          },
        })

        if (existingBarcode) {
          return NextResponse.json(
            { success: false, message: '该条码已被其他SKU使用', code: 'BARCODE_EXISTS' },
            { status: 400 }
          )
        }
      }

      // 创建SKU
      const sku = await prisma.sku.create({
        data: {
          tenantId: authContext.tenantId,
          skuCode,
          skuName,
          unit,
          lengthCm,
          widthCm,
          heightCm,
          weightKg,
          unitPrice,
          currency,
          storageCondition,
          shelfLifeWarningDays,
          isBatchManaged,
          isSerialManaged,
          isExpiryManaged,
          abcClass,
          status: 'ACTIVE',
          createdBy: authContext.userId,
          config: config as object,
          notes,
          ...restValidatedData,
          clientId: validatedClientId,
        },
        select: {
          id: true,
          skuCode: true,
          skuName: true,
          barcode: true,
          unit: true,
          storageCondition: true,
          isBatchManaged: true,
          isSerialManaged: true,
          isExpiryManaged: true,
          status: true,
          createdAt: true,
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
        message: 'SKU创建成功',
        data: sku,
      })
    } catch (error) {
      if (isUniqueConstraintError(error, ['clientId', 'skuCode'])) {
        return NextResponse.json(
          { success: false, message: 'SKU编码已存在', code: 'SKU_CODE_EXISTS' },
          { status: 400 }
        )
      }

      console.error('创建SKU失败:', error)
      return NextResponse.json(
        { success: false, message: '创建SKU失败' },
        { status: 500 }
      )
    }
  })
}
