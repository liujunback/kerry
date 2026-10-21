/**
 * 出库场景运行器（统一版）
 * 从数据库读取场景，与入库执行器风格一致
 */

import { prisma } from '@/lib/db/prisma'
import { ScenarioExecutorApi } from './scenario-executor-api'
import type { E2eScenario } from '@prisma/client'

export interface RunnerOptions {
  baseUrl?: string
  verbose?: boolean
  stopOnError?: boolean
  categoryCode?: string
  scenarioCode?: string
}

export interface RunnerResult {
  total: number
  passed: number
  failed: number
  skipped: number
  durationMs: number
  results: Array<{
    scenario: string
    code: string
    passed: boolean
    durationMs: number
    error?: string
  }>
}

export class OutboundScenarioRunner {
  private executor: ScenarioExecutorApi
  private options: RunnerOptions

  constructor(options: RunnerOptions = {}) {
    this.options = { baseUrl: 'http://localhost:3000', verbose: true, stopOnError: false, ...options }
    this.executor = new ScenarioExecutorApi(this.options.baseUrl)
  }

  private async getScenarios(): Promise<E2eScenario[]> {
    const where: Record<string, unknown> = { isActive: true }

    // 只查出库相关分类
    const outboundCategories = await prisma.e2eScenarioCategory.findMany({
      where: { code: { startsWith: 'OUTBOUND-' } },
      select: { id: true },
    })

    if (outboundCategories.length > 0) {
      where.categoryId = { in: outboundCategories.map(c => c.id) }
    }

    if (this.options.categoryCode) {
      const cat = await prisma.e2eScenarioCategory.findUnique({ where: { code: this.options.categoryCode } })
      if (cat) where.categoryId = cat.id
    }

    if (this.options.scenarioCode) {
      where.code = { contains: this.options.scenarioCode }
    }

    return prisma.e2eScenario.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }],
    })
  }

  async run(): Promise<RunnerResult> {
    const scenarios = await this.getScenarios()
    const startTime = Date.now()
    this.executor.clearContext()

    const result: RunnerResult = { total: scenarios.length, passed: 0, failed: 0, skipped: 0, durationMs: 0, results: [] }

    if (scenarios.length === 0) {
      console.log('⚠️ 没有找到匹配的测试场景')
      return result
    }

    console.log('\n' + '='.repeat(60))
    console.log(`🚀 开始执行 ${scenarios.length} 个出库场景`)
    console.log('='.repeat(60) + '\n')

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i]
      console.log(`[${i + 1}/${scenarios.length}] ${scenario.code} | ${scenario.name}`)

      try {
        const execResult = await this.executor.execute(scenario, { preserveContext: true })

        result.results.push({
          scenario: scenario.name,
          code: scenario.code,
          passed: execResult.passed,
          durationMs: execResult.durationMs,
          error: execResult.error,
        })

        if (execResult.passed) {
          result.passed++
          console.log(`   ✅ 通过 (${execResult.durationMs}ms)`)
        } else {
          result.failed++
          console.log(`   ❌ 失败 (${execResult.durationMs}ms)`)
          if (execResult.error && this.options.verbose) console.log(`   └─ ${execResult.error}`)
          if (this.options.stopOnError) break
        }

        if (this.options.verbose && execResult.steps) {
          for (const step of execResult.steps) {
            const icon = step.status === 'success' ? '✓' : step.status === 'error' ? '✗' : '○'
            console.log(`      ${icon} ${step.name} (${step.durationMs}ms)`)
          }
        }
      } catch (error) {
        result.failed++
        result.results.push({
          scenario: scenario.name,
          code: scenario.code,
          passed: false,
          durationMs: 0,
          error: error instanceof Error ? error.message : String(error),
        })
        console.log(`   ❌ 执行出错`)
        if (this.options.stopOnError) break
      }
      console.log('')
    }

    result.durationMs = Date.now() - startTime

    console.log('='.repeat(60))
    console.log(`📋 结果: 通过 ${result.passed}/${result.total} | 失败 ${result.failed} | 耗时 ${(result.durationMs / 1000).toFixed(2)}s`)
    console.log('='.repeat(60))

    return result
  }
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2)
  const options: RunnerOptions = {
    verbose: args.includes('-v'),
    stopOnError: args.includes('--stop-on-error'),
  }

  const catArg = args.find(a => a.startsWith('-c='))
  if (catArg) options.categoryCode = catArg.split('=')[1]

  const codeArg = args.find(a => a.startsWith('-s='))
  if (codeArg) options.scenarioCode = codeArg.split('=')[1]

  new OutboundScenarioRunner(options).run()
    .then(r => process.exit(r.failed > 0 ? 1 : 0))
    .catch(e => { console.error(e); process.exit(1) })
}

export default OutboundScenarioRunner
