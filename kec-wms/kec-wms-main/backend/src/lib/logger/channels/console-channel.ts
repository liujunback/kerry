import pino from 'pino'
import { BaseChannel } from './base-channel'
import type { LogRecord, ConsoleChannelConfig } from '../types'

// pino 不支持 emergency/alert/critical，统一映射到 fatal
const PINO_LEVEL_MAP: Record<string, string> = {
  EMERGENCY: 'fatal',
  ALERT:     'fatal',
  CRITICAL:  'fatal',
  ERROR:     'error',
  WARNING:   'warn',
  NOTICE:    'info',
  INFO:      'info',
  DEBUG:     'debug',
}

// 开发环境彩色前缀
const LEVEL_COLOR: Record<string, string> = {
  EMERGENCY: '\x1b[35m[EMERGENCY]\x1b[0m',
  ALERT:     '\x1b[35m[ALERT]\x1b[0m',
  CRITICAL:  '\x1b[35m[CRITICAL]\x1b[0m',
  ERROR:     '\x1b[31m[ERROR]\x1b[0m',
  WARNING:   '\x1b[33m[WARNING]\x1b[0m',
  NOTICE:    '\x1b[36m[NOTICE]\x1b[0m',
  INFO:      '\x1b[32m[INFO]\x1b[0m',
  DEBUG:     '\x1b[90m[DEBUG]\x1b[0m',
}

export class ConsoleChannel extends BaseChannel {
  readonly name = 'console'
  private logger: pino.Logger | null = null
  private pretty: boolean

  constructor(config: ConsoleChannelConfig) {
    super(config.level)
    this.pretty = config.pretty ?? false

    if (!this.pretty) {
      // 生产环境：pino JSON 输出
      this.logger = pino({ level: 'trace' })
    }
    // 开发环境：直接用 console，避免 pino-pretty worker_threads 在 Next.js 中的兼容问题
  }

  write(record: LogRecord): void {
    if (!this.shouldLog(record)) return

    if (this.pretty) {
      // 开发环境：格式化输出，不依赖 pino-pretty
      const ts = new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour12: false })
      const prefix = LEVEL_COLOR[record.level] || `[${record.level}]`
      const ctx = record.context ? ` ${JSON.stringify(record.context)}` : ''
      const reqId = record.request_id ? ` rid=${record.request_id.slice(0, 8)}` : ''
      const userId = record.user_id ? ` uid=${record.user_id}` : ''
      const err = record.error ? `\n  ${record.error.name}: ${record.error.message}` : ''
      process.stdout.write(`${ts} ${prefix}${reqId}${userId} ${record.message}${ctx}${err}\n`)
      return
    }

    // 生产环境：pino JSON
    const { message, level, ...rest } = record
    const pinoLevel = PINO_LEVEL_MAP[level] || 'info'
    ;(this.logger as unknown as Record<string, (obj: object, msg: string) => void>)[pinoLevel](
      { ...rest, _level: level },
      message
    )
  }
}
