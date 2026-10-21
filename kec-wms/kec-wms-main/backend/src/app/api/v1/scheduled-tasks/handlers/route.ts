import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { taskHandlers } from '@/lib/scheduler'

// GET /api/v1/scheduled-tasks/handlers - 获取可用的处理器列表
export const GET = createAuthHandler(async () => {
  try {
    const handlers = Array.from(taskHandlers.keys()).map((name) => ({
      name,
      description: getHandlerDescription(name),
    }))

    return NextResponse.json({
      success: true,
      data: handlers,
    })
  } catch (error) {
    console.error('获取处理器列表失败:', error)
    return NextResponse.json({ success: false, message: '获取处理器列表失败' }, { status: 500 })
  }
})

function getHandlerDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'inventory-alert-check': '库存预警检查 - 检查低于安全库存的 SKU',
    'expiry-check': '过期库存检查 - 检查即将过期的库存',
    'data-cleanup': '数据清理 - 清理过期的日志和临时数据',
    'wave-strategy-execute': '波次策略执行 - 按已发布策略自动筛单、组波并释放',
    'test-task': '测试任务 - 用于验证调度器是否正常工作',
  }
  return descriptions[name] || name
}
