/**
 * 日志系统类型定义
 * 参考 PSR-3 标准和 Laravel 日志系统设计
 */

// PSR-3 日志级别（数字越小越严重）
export enum LogLevel {
  EMERGENCY = 0,
  ALERT     = 1,
  CRITICAL  = 2,
  ERROR     = 3,
  WARNING   = 4,
  NOTICE    = 5,
  INFO      = 6,
  DEBUG     = 7,
}

export type LogLevelName = keyof typeof LogLevel

// 每条日志的结构化数据
export interface LogRecord {
  timestamp: string
  level: LogLevelName
  levelCode: number
  message: string
  channel: string
  // 自动从 AsyncLocalStorage 注入
  request_id?: string
  user_id?: string
  tenant_id?: string
  ip?: string
  path?: string
  method?: string
  // 业务上下文（调用方传入）
  context?: Record<string, unknown>
  // 错误信息
  error?: {
    name: string
    message: string
    stack?: string
  }
}

// Channel 接口
export interface ILogChannel {
  readonly name: string
  write(record: LogRecord): void | Promise<void>
  close?(): Promise<void>
}

// Logger 总配置
export interface LoggerConfig {
  default: string
  level: LogLevelName
  channels: Record<string, ChannelConfig>
}

export type ChannelConfig =
  | ConsoleChannelConfig
  | FileChannelConfig
  | GelfChannelConfig
  | StackChannelConfig

export interface ConsoleChannelConfig {
  driver: 'console'
  level?: LogLevelName
  pretty?: boolean
}

export interface FileChannelConfig {
  driver: 'file'
  level?: LogLevelName
  path: string
  rotation: 'daily'
  maxFiles?: number
}

export interface GelfChannelConfig {
  driver: 'gelf'
  level?: LogLevelName
  host: string
  port: number
  transport: 'udp' | 'tcp'
  facility?: string
  additionalFields?: Record<string, string>
}

export interface StackChannelConfig {
  driver: 'stack'
  channels: string[]
}
