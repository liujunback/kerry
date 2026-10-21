import { createHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'

const jsonObjectSchema = z.record(z.unknown())

// 更新场景 schema
const updateSchema = z.object({
  categoryCode: z.string().min(1).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  config: jsonObjectSchema.optional(),
  expected: jsonObjectSchema.optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

// GET /api/v1/e2e/scenarios/[id] - 获取单个场景
export const GET = createHandler(async (request: NextRequest, context) => {
  const { id } = await context!.params

  const scenario = await prisma.e2eScenario.findUnique({
    where: { id },
    include: {
      category: {
        select: { code: true, name: true },
      },
      results: {
        orderBy: { executedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          durationMs: true,
          steps: true,
          actual: true,
          errorMessage: true,
          executedAt: true,
        },
      },
    },
  })

  if (!scenario) {
    return NextResponse.json(
      { success: false, message: '场景不存在' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: scenario,
  })
})

// PUT /api/v1/e2e/scenarios/[id] - 更新场景
export const PUT = createHandler(async (request: NextRequest, context) => {
  const { id } = await context!.params
  const body = await request.json()
  const result = updateSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: result.error.errors },
      { status: 400 }
    )
  }

  const existing = await prisma.e2eScenario.findUnique({
    where: { id },
  })

  if (!existing) {
    return NextResponse.json(
      { success: false, message: '场景不存在' },
      { status: 404 }
    )
  }

  const { categoryCode, ...data } = result.data

  // 如果要更新分类
  let categoryId = existing.categoryId
  if (categoryCode) {
    const category = await prisma.e2eScenarioCategory.findUnique({
      where: { code: categoryCode },
    })
    if (!category) {
      return NextResponse.json(
        { success: false, message: `分类 ${categoryCode} 不存在` },
        { status: 400 }
      )
    }
    categoryId = category.id
  }

  const scenario = await prisma.e2eScenario.update({
    where: { id },
    data: {
      categoryId,
      ...data,
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

// DELETE /api/v1/e2e/scenarios/[id] - 删除场景
export const DELETE = createHandler(async (request: NextRequest, context) => {
  const { id } = await context!.params

  const existing = await prisma.e2eScenario.findUnique({
    where: { id },
  })

  if (!existing) {
    return NextResponse.json(
      { success: false, message: '场景不存在' },
      { status: 404 }
    )
  }

  // 删除场景（级联删除执行结果）
  await prisma.e2eScenario.delete({
    where: { id },
  })

  return NextResponse.json({
    success: true,
    message: '删除成功',
  })
})
