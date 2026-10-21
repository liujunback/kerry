import { createHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'

const jsonObjectSchema = z.record(z.unknown())

// 查询参数 schema
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(500).default(20),
  categoryCode: z.string().optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform((v) => v === undefined ? undefined : v === 'true'),
})

// 创建场景 schema
const createSchema = z.object({
  categoryCode: z.string().min(1),
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  config: jsonObjectSchema,
  expected: jsonObjectSchema,
  sortOrder: z.number().optional(),
})

// GET /api/v1/e2e/scenarios - 获取场景列表
export const GET = createHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const queryResult = querySchema.safeParse({
    page: searchParams.get('page') || '1',
    pageSize: searchParams.get('pageSize') || '20',
    categoryCode: searchParams.get('categoryCode') || undefined,
    search: searchParams.get('search') || undefined,
    isActive: searchParams.get('isActive') || undefined,
  })

  if (!queryResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: queryResult.error.errors },
      { status: 400 }
    )
  }

  const { page, pageSize, categoryCode, search, isActive } = queryResult.data

  const where: Record<string, unknown> = {}

  if (categoryCode) {
    const category = await prisma.e2eScenarioCategory.findUnique({
      where: { code: categoryCode },
    })
    if (category) {
      where.categoryId = category.id
    }
  }

  if (search) {
    where.OR = [
      { code: { contains: search } },
      { name: { contains: search } },
      { description: { contains: search } },
    ]
  }

  if (isActive !== undefined) {
    where.isActive = isActive
  }

  const total = await prisma.e2eScenario.count({ where })

  const scenarios = await prisma.e2eScenario.findMany({
    where,
    include: {
      category: {
        select: { code: true, name: true },
      },
      results: {
        orderBy: { executedAt: 'desc' },
        take: 1,
        select: {
          status: true,
          durationMs: true,
          executedAt: true,
        },
      },
    },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  // 转换结果，添加最近执行状态
  const data = scenarios.map((s) => ({
    ...s,
    lastResult: s.results[0] || null,
    results: undefined,
  }))

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

// POST /api/v1/e2e/scenarios - 创建场景
export const POST = createHandler(async (request: NextRequest) => {
  const body = await request.json()
  const result = createSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: result.error.errors },
      { status: 400 }
    )
  }

  const { categoryCode, ...data } = result.data

  // 查找分类
  const category = await prisma.e2eScenarioCategory.findUnique({
    where: { code: categoryCode },
  })

  if (!category) {
    return NextResponse.json(
      { success: false, message: `分类 ${categoryCode} 不存在` },
      { status: 400 }
    )
  }

  // 检查编码是否重复
  const existing = await prisma.e2eScenario.findUnique({
    where: { code: data.code },
  })

  if (existing) {
    return NextResponse.json(
      { success: false, message: `场景编码 ${data.code} 已存在` },
      { status: 400 }
    )
  }

  const scenario = await prisma.e2eScenario.create({
    data: {
      categoryId: category.id,
      code: data.code,
      name: data.name,
      description: data.description,
      config: data.config,
      expected: data.expected,
      sortOrder: data.sortOrder || 0,
    },
    include: {
      category: {
        select: { code: true, name: true },
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: scenario,
  })
})
