import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { ScenarioExecutorApi,saveExecutionResult } from '@/lib/e2e/scenario-executor-api'
import { NextRequest,NextResponse } from 'next/server'

// POST /api/v1/e2e/scenarios/[id]/execute - 执行单个场景
export const POST = createAuthHandler(async (request: NextRequest, auth, context) => {
  const { id } = await context!.params

  const scenario = await prisma.e2eScenario.findUnique({
    where: { id },
  })

  if (!scenario) {
    return NextResponse.json(
      { success: false, message: '场景不存在' },
      { status: 404 }
    )
  }

  if (!scenario.isActive) {
    return NextResponse.json(
      { success: false, message: '场景已禁用' },
      { status: 400 }
    )
  }

  try {
    const executor = new ScenarioExecutorApi()
    const result = await executor.execute(scenario)

    // 保存执行结果
    const savedResult = await saveExecutionResult(
      scenario.id,
      result,
      auth.user.id
    )

    return NextResponse.json({
      success: true,
      data: {
        scenarioCode: scenario.code,
        scenarioName: scenario.name,
        resultId: savedResult.id,
        ...result,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, message: '执行失败', error: errorMessage },
      { status: 500 }
    )
  }
})
