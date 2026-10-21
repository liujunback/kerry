import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { executeScenariosApi } from '@/lib/e2e/scenario-executor-api'
import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'

// 请求参数 schema
const requestSchema = z.object({
  // 场景 ID 列表
  scenarioIds: z.array(z.string()).optional(),
  // 或者按分类执行
  categoryCode: z.string().optional(),
  // 或者执行所有
  all: z.boolean().optional(),
  // 场景间延迟（毫秒），默认 500ms，避免锁竞争
  delayMs: z.number().min(0).max(5000).optional(),
})

// POST /api/v1/e2e/scenarios/execute-batch - 批量执行场景
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  const body = await request.json()
  const result = requestSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: result.error.errors },
      { status: 400 }
    )
  }

  const { scenarioIds, categoryCode, all, delayMs } = result.data

  // 构建查询条件
  const where: Record<string, unknown> = { isActive: true }

  if (scenarioIds?.length) {
    where.id = { in: scenarioIds }
  } else if (categoryCode) {
    const category = await prisma.e2eScenarioCategory.findUnique({
      where: { code: categoryCode },
    })
    if (!category) {
      return NextResponse.json(
        { success: false, message: `分类 ${categoryCode} 不存在` },
        { status: 400 }
      )
    }
    where.categoryId = category.id
  } else if (!all) {
    return NextResponse.json(
      { success: false, message: '请指定 scenarioIds、categoryCode 或 all=true' },
      { status: 400 }
    )
  }

  // 获取要执行的场景
  const scenarios = await prisma.e2eScenario.findMany({
    where,
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
  })

  if (scenarios.length === 0) {
    return NextResponse.json(
      { success: false, message: '没有找到要执行的场景' },
      { status: 400 }
    )
  }

  try {
    // 执行场景 (使用 API 调用方式)
    const results = await executeScenariosApi(scenarios, {
      baseUrl: 'http://localhost:3000',
      executedBy: auth.user.id,
      delayMs,
    })

    // 统计结果
    let passed = 0
    let failed = 0
    let error = 0

    const details: Array<{
      code: string
      name: string
      status: string
      durationMs: number
      error?: string
    }> = []

    for (const scenario of scenarios) {
      const result = results.get(scenario.code)
      if (result) {
        if (result.status === 'PASSED') passed++
        else if (result.status === 'FAILED') failed++
        else error++

        details.push({
          code: scenario.code,
          name: scenario.name,
          status: result.status,
          durationMs: result.durationMs,
          error: result.error,
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: scenarios.length,
        passed,
        failed,
        error,
        details,
      },
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { success: false, message: '批量执行失败', error: errorMessage },
      { status: 500 }
    )
  }
})
