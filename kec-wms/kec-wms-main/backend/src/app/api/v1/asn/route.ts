import { authenticate,hasApiScope } from '@/lib/auth/unified-auth'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { LockAcquisitionError, getAsnExternalNumberLockKey, withLock } from '@/lib/db/distributed-lock'
import { isUniqueConstraintError } from '@/lib/db/prisma-error-utils'
import { generateAsnNumber } from '@/lib/utils/number-generator'
import { asnListQuerySchema,createAsnSchema } from '@/lib/validations/asn'
import { externalAsnListQuerySchema,externalCreateAsnSchema } from '@/lib/validations/asn-external'
import { serializeAsn } from '@/lib/asn/response-serializer'
import { withUnifiedAuditContext } from '@/middleware/audit-context'
import { NextRequest,NextResponse } from 'next/server'

const ASN_EXTERNAL_WRITE_LOCK_OPTIONS = {
  prefix: 'asn-external-write',
  ttlMs: 15000,
  retryCount: 40,
  retryDelayMs: 50,
} as const

// GET /api/v1/asn - 获取ASN列表
export async function GET(request: NextRequest) {
  try {
    // 尝试统一认证（支持API Key和Session）
    const authResult = await authenticate(request)

    // 认证失败
    if (!authResult.success || !authResult.context) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: authResult.status || 401 }
      )
    }

    const authContext = authResult.context
    const tenantId: string = authContext.tenantId
    let clientIdFilter: string | undefined
    let warehouseIdFilter: string | undefined = authContext.warehouseId

    // 使用统一认证上下文

    // 如果是API Key认证，检查权限
    if (authContext.type === 'apiKey') {
      if (!hasApiScope(authContext, 'asn:read')) {
        return NextResponse.json(
          { success: false, message: '权限不足' },
          { status: 403 }
        )
      }
      // API Key可能绑定了特定客户或仓库
      clientIdFilter = authContext.clientId
      warehouseIdFilter = authContext.warehouseId
    }

    const searchParams = request.nextUrl.searchParams

    // 根据认证类型选择不同的查询参数Schema
    const isExternalApi = authContext?.type === 'apiKey'

    if (isExternalApi) {
      // 外部API使用clientCode/warehouseCode
      const queryResult = externalAsnListQuerySchema.safeParse({
        page: searchParams.get('page'),
        pageSize: searchParams.get('pageSize'),
        search: searchParams.get('search'),
        status: searchParams.get('status'),
        asnType: searchParams.get('asnType'),
        clientCode: searchParams.get('clientCode'),
        warehouseCode: searchParams.get('warehouseCode'),
        expectedArrivalDateFrom: searchParams.get('expectedArrivalDateFrom'),
        expectedArrivalDateTo: searchParams.get('expectedArrivalDateTo'),
        createdAtFrom: searchParams.get('createdAtFrom'),
        createdAtTo: searchParams.get('createdAtTo'),
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
        status,
        asnType,
        clientCode,
        warehouseCode,
        expectedArrivalDateFrom,
        expectedArrivalDateTo,
        createdAtFrom,
        createdAtTo,
        sortBy,
        sortOrder,
      } = queryResult.data

      // 解析clientCode到clientId
      let clientId = clientIdFilter
      if (!clientId && clientCode) {
        const client = await prisma.client.findFirst({
          where: { tenantId, clientCode },
        })
        if (!client) {
          return NextResponse.json(
            { success: false, message: '客户不存在' },
            { status: 404 }
          )
        }
        clientId = client.id
      }

      // 解析warehouseCode到warehouseId
      let warehouseId = warehouseIdFilter
      if (!warehouseId && warehouseCode) {
        const warehouse = await prisma.warehouse.findFirst({
          where: { tenantId, warehouseCode },
        })
        if (!warehouse) {
          return NextResponse.json(
            { success: false, message: '仓库不存在' },
            { status: 404 }
          )
        }
        warehouseId = warehouse.id
      }

      const where: Record<string, unknown> = { tenantId }

      if (search) {
        where.OR = [
          { asnNumber: { contains: search } },
          { externalNumber: { contains: search } },
        ]
      }

      if (status) where.status = status
      if (asnType) where.asnType = asnType
      if (clientId) where.clientId = clientId
      if (warehouseId) where.warehouseId = warehouseId

      if (expectedArrivalDateFrom || expectedArrivalDateTo) {
        where.expectedArrivalDate = {}
        if (expectedArrivalDateFrom) {
          (where.expectedArrivalDate as Record<string, unknown>).gte = expectedArrivalDateFrom
        }
        if (expectedArrivalDateTo) {
          (where.expectedArrivalDate as Record<string, unknown>).lte = expectedArrivalDateTo
        }
      }

      if (createdAtFrom || createdAtTo) {
        where.createdAt = {}
        if (createdAtFrom) {
          (where.createdAt as Record<string, unknown>).gte = createdAtFrom
        }
        if (createdAtTo) {
          (where.createdAt as Record<string, unknown>).lte = createdAtTo
        }
      }

      const total = await prisma.asn.count({ where })

      const asns = await prisma.asn.findMany({
        where,
        select: {
          asnNumber: true,
          externalNumber: true,
          asnType: true,
          status: true,
          expectedArrivalDate: true,
          actualArrivalAt: true,
          totalExpectedQty: true,
          totalReceivedQty: true,
          totalPutawayQty: true,
          totalExpectedLines: true,
          totalReceivedLines: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              clientCode: true,
              clientName: true,
            },
          },
          warehouse: {
            select: {
              warehouseCode: true,
              warehouseName: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      })

      return NextResponse.json({
        success: true,
        data: asns.map((asn) => serializeAsn(asn)),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      })
    }

    // 内部API使用原有逻辑
    // 处理新的日期过滤参数格式
    const dateType = searchParams.get('dateType') || 'created'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // 根据 dateType 映射到对应的字段
    let createdFrom: string | null = null
    let createdTo: string | null = null
    let arrivalFromParam: string | null = null
    let arrivalToParam: string | null = null
    let receivingEndFromParam: string | null = null
    let receivingEndToParam: string | null = null

    if (dateType === 'created') {
      createdFrom = dateFrom
      createdTo = dateTo
    } else if (dateType === 'arrival') {
      arrivalFromParam = dateFrom
      arrivalToParam = dateTo
    } else if (dateType === 'receivingEnd') {
      receivingEndFromParam = dateFrom
      receivingEndToParam = dateTo
    }

    const queryResult = asnListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      search: searchParams.get('search'),
      asnNumber: searchParams.get('asnNumber'),
      skuCode: searchParams.get('skuCode'),
      status: searchParams.get('status'),
      asnType: searchParams.get('asnType'),
      receivingMethod: searchParams.get('receivingMethod'),
      clientId: searchParams.get('clientId'),
      warehouseId: searchParams.get('warehouseId'),
      expectedArrivalDateFrom: searchParams.get('expectedArrivalDateFrom'),
      expectedArrivalDateTo: searchParams.get('expectedArrivalDateTo'),
      createdAtFrom: createdFrom,
      createdAtTo: createdTo,
      arrivalFrom: arrivalFromParam,
      arrivalTo: arrivalToParam,
      receivingEndFrom: receivingEndFromParam,
      receivingEndTo: receivingEndToParam,
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
      asnNumber,
      skuCode,
      status,
      asnType,
      receivingMethod,
      clientId,
      warehouseId: requestedWarehouseId,
      expectedArrivalDateFrom,
      expectedArrivalDateTo,
      createdAtFrom,
      createdAtTo,
      arrivalFrom,
      arrivalTo,
      receivingEndFrom,
      receivingEndTo,
      sortBy,
      sortOrder,
    } = queryResult.data
    const warehouseId = resolveScopedWarehouseId({ warehouseId: warehouseIdFilter }, requestedWarehouseId)

    const where: Record<string, unknown> = {
      tenantId,
    }

    // 精确匹配ASN单号
    if (asnNumber) {
      where.asnNumber = asnNumber
    } else if (search) {
      // 支持批量查询：逗号分隔的多个单号
      const searchValues = search.split(',').map(s => s.trim()).filter(Boolean)
      if (searchValues.length === 1) {
        where.OR = [
          { asnNumber: { contains: searchValues[0] } },
          { externalNumber: { contains: searchValues[0] } },
        ]
      } else if (searchValues.length > 1) {
        where.OR = [
          { asnNumber: { in: searchValues } },
          { externalNumber: { in: searchValues } },
        ]
      }
    }

    // SKU编码查询：通过asnLines关联查询，支持批量
    if (skuCode) {
      const skuValues = skuCode.split(',').map(s => s.trim()).filter(Boolean)
      if (skuValues.length === 1) {
        where.asnLines = {
          some: {
            skuCode: { contains: skuValues[0] },
          },
        }
      } else if (skuValues.length > 1) {
        where.asnLines = {
          some: {
            skuCode: { in: skuValues },
          },
        }
      }
    }

    if (status) {
      where.status = status
    }

    if (asnType) {
      where.asnType = asnType
    }

    if (receivingMethod) {
      where.receiving_method = receivingMethod
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (warehouseId) {
      where.warehouseId = warehouseId
    }

    if (expectedArrivalDateFrom || expectedArrivalDateTo) {
      where.expectedArrivalDate = {}
      if (expectedArrivalDateFrom) {
        (where.expectedArrivalDate as Record<string, unknown>).gte = expectedArrivalDateFrom
      }
      if (expectedArrivalDateTo) {
        (where.expectedArrivalDate as Record<string, unknown>).lte = expectedArrivalDateTo
      }
    }

    if (createdAtFrom || createdAtTo) {
      where.createdAt = {}
      if (createdAtFrom) {
        (where.createdAt as Record<string, unknown>).gte = createdAtFrom
      }
      if (createdAtTo) {
        // 设置为当天结束时间 23:59:59.999
        const endOfDay = new Date(createdAtTo)
        endOfDay.setHours(23, 59, 59, 999)
        ;(where.createdAt as Record<string, unknown>).lte = endOfDay
      }
    }

    if (arrivalFrom || arrivalTo) {
      where.actualArrivalAt = {}
      if (arrivalFrom) {
        (where.actualArrivalAt as Record<string, unknown>).gte = arrivalFrom
      }
      if (arrivalTo) {
        // 设置为当天结束时间 23:59:59.999
        const endOfDay = new Date(arrivalTo)
        endOfDay.setHours(23, 59, 59, 999)
        ;(where.actualArrivalAt as Record<string, unknown>).lte = endOfDay
      }
    }

    if (receivingEndFrom || receivingEndTo) {
      where.receivingEndAt = {}
      if (receivingEndFrom) {
        (where.receivingEndAt as Record<string, unknown>).gte = receivingEndFrom
      }
      if (receivingEndTo) {
        // 设置为当天结束时间 23:59:59.999
        const endOfDay = new Date(receivingEndTo)
        endOfDay.setHours(23, 59, 59, 999)
        ;(where.receivingEndAt as Record<string, unknown>).lte = endOfDay
      }
    }

    const total = await prisma.asn.count({ where })

    const asns = await prisma.asn.findMany({
      where,
      select: {
        id: true,
        asnNumber: true,
        externalNumber: true,
        warehouseId: true,
        asnType: true,
        receiving_method: true,
        status: true,
        signedAt: true,
        expectedArrivalDate: true,
        actualArrivalAt: true,
        receivingEndAt: true,
        totalExpectedQty: true,
        totalReceivedQty: true,
        totalPutawayQty: true,
        totalExpectedLines: true,
        totalReceivedLines: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        _count: {
          select: {
            asnLines: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: {
        items: asns.map((asn) => serializeAsn(asn)),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error) {
    console.error('获取ASN列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取ASN列表失败' },
      { status: 500 }
    )
  }
}

// POST /api/v1/asn - 创建ASN
export async function POST(request: NextRequest) {
  console.log('[ASN API] POST request received - creating ASN')
  try {
    // 尝试统一认证（支持API Key和Session）
    const authResult = await authenticate(request)

    // 认证失败
    if (!authResult.success || !authResult.context) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: authResult.status || 401 }
      )
    }

    const authContext = authResult.context
    const tenantId: string = authContext.tenantId
    const userId: string | undefined = authContext.userId
    let isExternalApi = false

    if (authContext.type === 'apiKey') {
      isExternalApi = true
      if (!hasApiScope(authContext, 'asn:create')) {
        return NextResponse.json(
          { success: false, message: '权限不足' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()

    // 根据认证类型选择不同的验证Schema
    if (isExternalApi) {
      // 外部API使用clientCode/warehouseCode/skuCode，并记录审计日志
      return withUnifiedAuditContext(request, authContext, async () => {
        try {
          const validationResult = externalCreateAsnSchema.safeParse(body)

          if (!validationResult.success) {
            return NextResponse.json(
              { success: false, message: '参数错误', errors: validationResult.error.errors },
              { status: 400 }
            )
          }

          const data = validationResult.data

          // 解析clientCode到clientId
          let clientId = authContext?.clientId
          if (!clientId) {
            const client = await prisma.client.findFirst({
              where: { tenantId, clientCode: data.clientCode },
            })
            if (!client) {
              return NextResponse.json(
                { success: false, message: '客户不存在', code: 'CLIENT_NOT_FOUND' },
                { status: 400 }
              )
            }
            clientId = client.id
          }

          // 解析warehouseCode到warehouseId
          let warehouseId = authContext?.warehouseId
          let warehouseCode = data.warehouseCode
          if (!warehouseId) {
            const warehouse = await prisma.warehouse.findFirst({
              where: { tenantId, warehouseCode: data.warehouseCode },
            })
            if (!warehouse) {
              return NextResponse.json(
                { success: false, message: '仓库不存在', code: 'WAREHOUSE_NOT_FOUND' },
                { status: 400 }
              )
            }
            warehouseId = warehouse.id
            warehouseCode = warehouse.warehouseCode
          }

          const executeCreate = async () => prisma.$transaction(async (tx) => {
            // 解析所有skuCode到skuId
            const skuCodes = data.lines.map((line) => line.skuCode)
            const skus = await tx.sku.findMany({
              where: {
                tenantId,
                clientId,
                skuCode: { in: skuCodes },
              },
              select: { id: true, skuCode: true, skuName: true, unit: true, isBatchManaged: true },
            })

            const skuMap = new Map(skus.map((sku) => [sku.skuCode, sku]))
            const missingSkuCodes = skuCodes.filter((code) => !skuMap.has(code))

            if (missingSkuCodes.length > 0) {
              return NextResponse.json(
                {
                  success: false,
                  message: '部分SKU不存在',
                  code: 'SKU_NOT_FOUND',
                  details: { missingSkuCodes },
                },
                { status: 400 }
              )
            }

            const batchManagedSkusWithoutBatch = data.lines
              .filter((line) => {
                const sku = skuMap.get(line.skuCode)
                return sku?.isBatchManaged && !line.batchNumber
              })
              .map((line) => line.skuCode)

            if (batchManagedSkusWithoutBatch.length > 0) {
              return NextResponse.json(
                {
                  success: false,
                  message: '批次管理SKU的批次号不能为空',
                  code: 'BATCH_NUMBER_REQUIRED',
                  details: { skuCodes: batchManagedSkusWithoutBatch },
                },
                { status: 400 }
              )
            }

            if (data.externalNumber) {
              const existingAsnByExternal = await tx.asn.findFirst({
                where: {
                  tenantId,
                  clientId,
                  externalNumber: data.externalNumber,
                  status: { not: 'CANCELLED' },
                },
                select: { id: true },
              })

              if (existingAsnByExternal) {
                return NextResponse.json(
                  { success: false, message: '客户单号已存在', code: 'EXTERNAL_NUMBER_EXISTS' },
                  { status: 400 }
                )
              }
            }

            const asnNumber = data.asnNumber || await generateAsnNumber(tenantId, warehouseCode, tx)
            const existingAsn = await tx.asn.findFirst({
              where: { tenantId, asnNumber },
              select: { id: true },
            })

            if (existingAsn) {
              return NextResponse.json(
                { success: false, message: 'ASN单号已存在', code: 'ASN_NUMBER_EXISTS' },
                { status: 400 }
              )
            }

            const totalExpectedQty = data.lines.reduce((sum, line) => sum + line.expectedQty, 0)
            const totalExpectedLines = data.lines.length

            const asn = await tx.asn.create({
              data: {
                tenantId,
                clientId,
                warehouseId,
                asnNumber,
                externalNumber: data.externalNumber || null,
                asnType: data.asnType,
                receiving_method: null,
                status: 'CREATED',
                expectedArrivalDate: data.expectedArrivalDate || null,
                expectedArrivalTime: data.expectedArrivalTime || null,
                expectedPutawayDate: data.expectedPutawayDate || null,
                totalExpectedQty,
                totalExpectedLines,
                notes: data.notes || null,
                config: (data.config || {}) as object,
                createdBy: userId,
                updatedBy: userId,
                asnLines: {
                  create: data.lines.map((line, index) => {
                    const sku = skuMap.get(line.skuCode)!
                    return {
                      tenantId,
                      lineNumber: index + 1,
                      skuId: sku.id,
                      skuCode: sku.skuCode,
                      skuName: sku.skuName,
                      expectedQty: line.expectedQty,
                      uomCode: line.uomCode ?? sku.unit,
                      batchNumber: line.batchNumber || undefined,
                      carton: line.carton || undefined,
                      expiryDate: line.expiryDate || undefined,
                      status: 'PENDING',
                      notes: line.notes || undefined,
                      createdBy: userId,
                      updatedBy: userId,
                    }
                  }),
                },
              },
              select: {
                asnNumber: true,
                externalNumber: true,
                asnType: true,
                status: true,
                expectedArrivalDate: true,
                totalExpectedQty: true,
                totalExpectedLines: true,
                notes: true,
                createdAt: true,
                client: {
                  select: {
                    clientCode: true,
                    clientName: true,
                  },
                },
                warehouse: {
                  select: {
                    warehouseCode: true,
                    warehouseName: true,
                  },
                },
                asnLines: {
                  select: {
                    lineNumber: true,
                    skuCode: true,
                    skuName: true,
                    expectedQty: true,
                    uomCode: true,
                    batchNumber: true,
                    expiryDate: true,
                    status: true,
                  },
                },
              },
            })

            return NextResponse.json({
              success: true,
              data: serializeAsn(asn),
              message: 'ASN创建成功',
            })
          })

          if (data.externalNumber) {
            return withLock(
              getAsnExternalNumberLockKey(tenantId, clientId, data.externalNumber),
              executeCreate,
              ASN_EXTERNAL_WRITE_LOCK_OPTIONS
            )
          }

          return executeCreate()
        } catch (error) {
          if (error instanceof LockAcquisitionError) {
            return NextResponse.json(
              { success: false, message: 'ASN写入繁忙，请稍后重试', code: 'ASN_WRITE_BUSY' },
              { status: 409 }
            )
          }

          if (isUniqueConstraintError(error, ['asnNumber', 'tenantId'])) {
            return NextResponse.json(
              { success: false, message: 'ASN单号已存在', code: 'ASN_NUMBER_EXISTS' },
              { status: 400 }
            )
          }

          console.error('创建ASN失败:', error)
          return NextResponse.json(
            { success: false, message: '创建ASN失败' },
            { status: 500 }
          )
        }
      })
    }

    // 内部API使用原有逻辑
    const validationResult = createAsnSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 验证客户是否存在
    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        tenantId,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, message: '客户不存在', code: 'CLIENT_NOT_FOUND' },
        { status: 400 }
      )
    }

    // 验证仓库是否存在
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        id: data.warehouseId,
        tenantId,
      },
    })

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: '仓库不存在', code: 'WAREHOUSE_NOT_FOUND' },
        { status: 400 }
      )
    }

    // 校验客户单号是否重复（取消状态的ASN可以重复）
    if (data.externalNumber) {
      const existingAsnByExternal = await prisma.asn.findFirst({
        where: {
          tenantId,
          clientId: data.clientId,
          externalNumber: data.externalNumber,
          status: { not: 'CANCELLED' },
        },
      })

      if (existingAsnByExternal) {
        return NextResponse.json(
          { success: false, message: '客户单号已存在', code: 'EXTERNAL_NUMBER_EXISTS' },
          { status: 400 }
        )
      }
    }

    // 生成ASN单号
    const asnNumber = data.asnNumber || await generateAsnNumber(
      tenantId,
      warehouse.warehouseCode
    )

    // 检查ASN单号是否已存在
    const existingAsn = await prisma.asn.findFirst({
      where: {
        tenantId,
        asnNumber,
      },
    })

    if (existingAsn) {
      return NextResponse.json(
        { success: false, message: 'ASN单号已存在', code: 'ASN_NUMBER_EXISTS' },
        { status: 400 }
      )
    }

    // 验证SKU并准备明细数据
    const lines = data.lines || []
    const skuIds = lines.map((line) => line.skuId)

    if (skuIds.length > 0) {
      const skus = await prisma.sku.findMany({
        where: {
          id: { in: skuIds },
          clientId: data.clientId,
        },
        select: { id: true, isBatchManaged: true },
      })

      const foundSkuIds = new Set(skus.map((s) => s.id))
      const missingSkuIds = skuIds.filter((id) => !foundSkuIds.has(id))

      if (missingSkuIds.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: '部分SKU不存在或不属于该客户',
            code: 'SKU_NOT_FOUND',
            details: { missingSkuIds },
          },
          { status: 400 }
        )
      }

      // 校验批次管理SKU的批次号不能为空
      const skuMap = new Map(skus.map((s) => [s.id, s]))
      const batchManagedSkusWithoutBatch = lines
        .filter((line) => {
          const sku = skuMap.get(line.skuId)
          return sku?.isBatchManaged && !line.batchNumber
        })
        .map((line) => line.skuCode)

      if (batchManagedSkusWithoutBatch.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: '批次管理SKU的批次号不能为空',
            code: 'BATCH_NUMBER_REQUIRED',
            details: { skuCodes: batchManagedSkusWithoutBatch },
          },
          { status: 400 }
        )
      }
    }

    // 计算汇总数据
    const totalExpectedQty = lines.reduce((sum, line) => sum + line.expectedQty, 0)
    const totalExpectedLines = lines.length

    // 创建ASN和明细
    const asn = await prisma.asn.create({
      data: {
        tenantId,
        clientId: data.clientId,
        warehouseId: data.warehouseId,
        asnNumber,
        externalNumber: data.externalNumber || null,
        asnType: data.asnType,
        status: 'CREATED',
        expectedArrivalDate: data.expectedArrivalDate || null,
        expectedArrivalTime: data.expectedArrivalTime || null,
        expectedPutawayDate: data.expectedPutawayDate || null,
        totalExpectedQty,
        totalExpectedLines,
        notes: data.notes || null,
        config: (data.config || {}) as object,
        createdBy: userId,
        updatedBy: userId,
        asnLines: {
          create: lines.map((line, index) => ({
            tenantId,
            lineNumber: index + 1,
            skuId: line.skuId,
            skuCode: line.skuCode,
            skuName: line.skuName || undefined,
            expectedQty: line.expectedQty,
            uomId: line.uomId || undefined,
            uomCode: line.uomCode || undefined,
            batchNumber: line.batchNumber || undefined,
            expiryDate: line.expiryDate || undefined,
            status: 'PENDING',
            notes: line.notes || undefined,
            createdBy: userId,
            updatedBy: userId,
          })),
        },
      },
      select: {
        id: true,
        asnNumber: true,
        externalNumber: true,
        asnType: true,
        status: true,
        expectedArrivalDate: true,
        totalExpectedQty: true,
        totalExpectedLines: true,
        notes: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        asnLines: {
          select: {
            id: true,
            lineNumber: true,
            skuId: true,
            skuCode: true,
            skuName: true,
            expectedQty: true,
            receivedQty: true,
            putawayQty: true,
            uomCode: true,
            batchNumber: true,
            expiryDate: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: serializeAsn(asn),
      message: 'ASN创建成功',
    })
  } catch (error) {
    console.error('创建ASN失败:', error)
    return NextResponse.json(
      { success: false, message: '创建ASN失败' },
      { status: 500 }
    )
  }
}
