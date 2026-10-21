/**
 * 定时任务处理器注册
 */

export interface TaskContext {
  tenantId: string
  taskId: string
  taskCode: string
  params: Record<string, unknown> | null
}

export interface TaskResult {
  success: boolean
  message?: string
  data?: unknown
}

export type TaskHandler = (context: TaskContext) => Promise<TaskResult>

// 处理器注册表
export const taskHandlers = new Map<string, TaskHandler>()

/**
 * 注册任务处理器
 */
export function registerHandler(name: string, handler: TaskHandler): void {
  taskHandlers.set(name, handler)
  console.log(`[Scheduler] 已注册处理器: ${name}`)
}

// ============ 内置处理器 ============

/**
 * 库存预警检查
 */
registerHandler('inventory-alert-check', async (context) => {
  const { prisma } = await import('@/lib/db/prisma')

  // 查找低于安全库存的 SKU（使用 SkuInventorySummary）
  const lowStockItems = await prisma.skuInventorySummary.findMany({
    where: {
      tenantId: context.tenantId,
    },
    select: {
      skuId: true,
      warehouseId: true,
      qtyAvailable: true,
    },
  })

  // 这里可以添加更多逻辑，如发送通知、创建预警记录等
  return {
    success: true,
    message: `检查完成，共 ${lowStockItems.length} 个 SKU`,
  }
})

/**
 * 过期库存检查
 */
registerHandler('expiry-check', async (context) => {
  const { prisma } = await import('@/lib/db/prisma')
  const daysThreshold = (context.params?.daysThreshold as number) || 30

  const expiringItems = await prisma.inventorySnapshot.findMany({
    where: {
      tenantId: context.tenantId,
      expiryDate: {
        lte: new Date(Date.now() + daysThreshold * 24 * 60 * 60 * 1000),
        gte: new Date(),
      },
      totalOnHand: { gt: 0 },
    },
    select: {
      id: true,
      skuCode: true,
      expiryDate: true,
      totalOnHand: true,
    },
  })

  return {
    success: true,
    message: `找到 ${expiringItems.length} 个即将过期的库存`,
    data: { count: expiringItems.length },
  }
})

/**
 * 数据清理任务
 */
registerHandler('data-cleanup', async (context) => {
  const { prisma } = await import('@/lib/db/prisma')
  const retentionDays = (context.params?.retentionDays as number) || 90

  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

  // 清理旧的任务日志
  const deletedLogs = await prisma.scheduledTaskLog.deleteMany({
    where: {
      tenantId: context.tenantId,
      createdAt: { lt: cutoffDate },
    },
  })

  return {
    success: true,
    message: `已清理 ${deletedLogs.count} 条旧日志`,
  }
})

/**
 * 库位快照对账
 * 从 InventoryBucket 重算所有库位快照，修复因队列丢失导致的数据偏差
 */
registerHandler('inventory-snapshot-reconcile', async (context) => {
  const { prisma } = await import('@/lib/db/prisma')
  const { updateLocationSnapshot } = await import('@/lib/services/inventory-snapshot-service')

  // 查出该租户下所有有库存的桶，按库位+SKU+批次+LPN 去重
  const buckets = await prisma.inventoryBucket.findMany({
    where: { tenantId: context.tenantId, quantity: { gt: 0 } },
    select: {
      tenantId: true,
      clientId: true,
      warehouseId: true,
      locationId: true,
      skuId: true,
      skuCode: true,
      batchNumber: true,
      lpn: true,
    },
    distinct: ['locationId', 'skuId', 'batchNumber', 'lpn'],
  })

  let fixed = 0
  for (const b of buckets) {
    await updateLocationSnapshot({
      tenantId: b.tenantId,
      clientId: b.clientId,
      warehouseId: b.warehouseId,
      locationId: b.locationId,
      skuId: b.skuId,
      skuCode: b.skuCode,
      batchNumber: b.batchNumber,
      lpn: b.lpn,
    })
    fixed++
  }

  return {
    success: true,
    message: `库位快照对账完成，共处理 ${fixed} 条记录`,
    data: { fixed },
  }
})

/**
 * SKU 汇总对账
 * 从 InventoryBucket 重算所有 SKU 汇总，修复因队列丢失导致的数据偏差
 */
registerHandler('sku-summary-reconcile', async (context) => {
  const { prisma } = await import('@/lib/db/prisma')
  const { updateSkuSummary } = await import('@/lib/services/inventory-snapshot-service')

  // 查出该租户下所有有库存的 warehouse+client+SKU 组合
  const groups = await prisma.inventoryBucket.findMany({
    where: { tenantId: context.tenantId, quantity: { gt: 0 } },
    select: {
      tenantId: true,
      clientId: true,
      warehouseId: true,
      skuId: true,
      skuCode: true,
    },
    distinct: ['warehouseId', 'clientId', 'skuId'],
  })

  let fixed = 0
  for (const g of groups) {
    await updateSkuSummary({
      tenantId: g.tenantId,
      clientId: g.clientId,
      warehouseId: g.warehouseId,
      skuId: g.skuId,
      skuCode: g.skuCode,
    })
    fixed++
  }

  return {
    success: true,
    message: `SKU 汇总对账完成，共处理 ${fixed} 条记录`,
    data: { fixed },
  }
})

/**
 * 波次策略执行
 */
registerHandler('wave-strategy-execute', async (context) => {
  const strategyId = typeof context.params?.strategyId === 'string' ? context.params.strategyId : null
  if (!strategyId) {
    return {
      success: false,
      message: '缺少 strategyId 参数',
    }
  }

  const {
    startScheduledExecuteWaveStrategy,
    WaveStrategyRunAlreadyRunningError,
  } = await import('@/lib/services/wave-engine-service')

  try {
    const result = await startScheduledExecuteWaveStrategy(context.tenantId, strategyId)

    return {
      success: true,
      message: `波次策略已入队：${result.runId}`,
      data: result,
    }
  } catch (error) {
    if (error instanceof WaveStrategyRunAlreadyRunningError) {
      return {
        success: true,
        message: `波次策略已有执行任务：${error.runId}`,
        data: {
          runId: error.runId,
          startedAt: error.startedAt,
          skipped: true,
        },
      }
    }

    throw error
  }
})

/**
 * 测试任务（用于验证调度器）
 */
registerHandler('test-task', async (context) => {
  console.log(`[TestTask] 执行测试任务: ${context.taskCode}`)
  console.log(`[TestTask] 参数:`, context.params)

  return {
    success: true,
    message: '测试任务执行成功',
  }
})
