/**
 * Next.js Instrumentation
 * 用于在服务器启动时初始化 Worker 和调度器
 */

export async function register() {
  // 只在 Node.js 运行时初始化
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // 初始化队列 Worker
      const { initializeWorkers } = await import('@/lib/queue')
      initializeWorkers()
      console.log('[Instrumentation] Queue workers 已启动')
    } catch (error) {
      console.error('[Instrumentation] Queue workers 启动失败，但不会阻塞应用:', error)
    }

    try {
      // 初始化定时任务调度器
      const { initScheduler } = await import('@/lib/scheduler')
      const initialized = await initScheduler()
      if (initialized) {
        console.log('[Instrumentation] Scheduler 已启动')
      } else {
        console.warn('[Instrumentation] Scheduler 未启动，应用继续运行')
      }
    } catch (error) {
      console.error('[Instrumentation] Scheduler 启动失败，但不会阻塞应用:', error)
    }
  }
}
