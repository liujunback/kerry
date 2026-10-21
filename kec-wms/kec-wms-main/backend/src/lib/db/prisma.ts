import { PrismaClient } from '@prisma/client'
import { auditExtension } from './audit-extension'
import { timezoneExtension } from './timezone-extension'
import { decimalExtension } from './decimal-extension'

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

// 创建带审计扩展和时区扩展的 Prisma 客户端
function createPrismaClient() {
  const basePrisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  // 应用扩展：先审计，再时区转换，最后 Decimal 转换
  // Decimal 扩展必须在最后，因为它需要处理其他扩展创建的对象
  return basePrisma.$extends(auditExtension).$extends(timezoneExtension).$extends(decimalExtension)
}

// 初始化客户端
console.log('[Prisma] Initializing Prisma client with audit extension...')
console.log('[Prisma] globalForPrisma.prisma exists:', !!globalForPrisma.prisma)

// 创建或复用全局单例
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// 在所有环境中都使用全局单例，避免连接泄漏
globalForPrisma.prisma = prisma

export default prisma

// 为了向后兼容
export const prismaRead = prisma
export const prismaWrite = prisma

// 导出类型
export type PrismaWriteClient = typeof prisma
export type PrismaReadClient = typeof prisma
// 使用扩展后的客户端类型
export type TransactionClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>

// 优雅关闭机制
let isShuttingDown = false

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`[Prisma] Received ${signal}, graceful shutdown...`)

  try {
    await prisma.$disconnect()
    console.log('[Prisma] Connection closed')
  } catch (error) {
    console.error('[Prisma] Error during shutdown:', error)
  }
}

// 注册关闭信号处理（仅在服务端）
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => gracefulShutdown('beforeExit'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
}
