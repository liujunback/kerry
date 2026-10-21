import { startServer } from './server'

startServer()

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n[print-agent] 正在关闭...')
  process.exit(0)
})
