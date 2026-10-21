import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { prisma, prismaRead } from '@/lib/db/prisma'
import {
  ensureWarehouseBelongsToTenant,
  pickAssignmentRuleSelect,
  resolveRequiredWarehouseId,
  serializePickAssignmentRule,
} from '@/lib/pick-assignment/admin'
import {
  createPickAssignmentRuleSchema,
  pickAssignmentRuleListQuerySchema,
} from '@/lib/validations/pick-assignment'

const READ_PERMISSION = 'pick-assignment-rule:read'
const CREATE_PERMISSION = 'pick-assignment-rule:create'

export const GET = createAuthHandler(async (request, auth) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, READ_PERMISSION)
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = pickAssignmentRuleListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      warehouseId: searchParams.get('warehouseId'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      isDefault: searchParams.get('isDefault'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 },
      )
    }

    const {
      page,
      pageSize,
      warehouseId: requestedWarehouseId,
      search,
      status,
      isDefault,
      sortBy,
      sortOrder,
    } = queryResult.data

    const warehouseId = resolveRequiredWarehouseId(auth.user, requestedWarehouseId)
    if (!warehouseId) {
      return NextResponse.json({ success: false, message: '当前请求缺少仓库上下文' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
      warehouseId,
    }

    if (search) {
      where.OR = [
        { ruleCode: { contains: search } },
        { ruleName: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (typeof isDefault === 'boolean') {
      where.isDefault = isDefault
    }

    const total = await prismaRead.pickAssignmentRule.count({ where })
    const rules = await prismaRead.pickAssignmentRule.findMany({
      where,
      select: pickAssignmentRuleSelect,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: rules.map(serializePickAssignmentRule),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('获取拣货分配规则列表失败:', error)
    return NextResponse.json({ success: false, message: '获取拣货分配规则列表失败' }, { status: 500 })
  }
})

export const POST = createAuthHandler(async (request, auth) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, CREATE_PERMISSION)
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const body = await request.json()
    const validationResult = createPickAssignmentRuleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 },
      )
    }

    const data = validationResult.data
    const warehouseId = resolveRequiredWarehouseId(auth.user, data.warehouseId)
    if (!warehouseId) {
      return NextResponse.json({ success: false, message: '当前请求缺少仓库上下文' }, { status: 400 })
    }

    const warehouse = await ensureWarehouseBelongsToTenant(auth.user.tenantId, warehouseId)
    if (!warehouse) {
      return NextResponse.json({ success: false, message: '仓库不存在' }, { status: 404 })
    }

    const existingRule = await prisma.pickAssignmentRule.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        ruleCode: data.ruleCode,
      },
      select: { id: true },
    })

    if (existingRule) {
      return NextResponse.json(
        { success: false, message: '规则编码已存在', code: 'RULE_CODE_EXISTS' },
        { status: 400 },
      )
    }

    const created = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.pickAssignmentRule.updateMany({
          where: {
            tenantId: auth.user.tenantId,
            warehouseId,
            isDefault: true,
          },
          data: {
            isDefault: false,
            updatedBy: auth.user.id,
          },
        })
      }

      await tx.pickAssignmentRule.create({
        data: {
          tenantId: auth.user.tenantId,
          warehouseId,
          ruleCode: data.ruleCode,
          ruleName: data.ruleName,
          description: data.description ?? null,
          status: data.status,
          isDefault: data.isDefault,
          configJson: data.config,
          createdBy: auth.user.id,
          updatedBy: auth.user.id,
        },
      })

      return tx.pickAssignmentRule.findFirstOrThrow({
        where: {
          tenantId: auth.user.tenantId,
          warehouseId,
          ruleCode: data.ruleCode,
        },
        select: pickAssignmentRuleSelect,
      })
    })

    return NextResponse.json({
      success: true,
      data: serializePickAssignmentRule(created),
      message: '拣货分配规则创建成功',
    })
  } catch (error) {
    console.error('创建拣货分配规则失败:', error)
    return NextResponse.json({ success: false, message: '创建拣货分配规则失败' }, { status: 500 })
  }
})
