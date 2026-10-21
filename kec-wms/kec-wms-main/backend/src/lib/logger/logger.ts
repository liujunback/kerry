import { buildLoggerConfig } from './config'
import { getLogContext, getRequestId } from './context'
import { ConsoleChannel } from './channels/console-channel'
import { FileChannel } from './channels/file-channel'
import { GelfChannel } from './channels/gelf-channel'
import { StackChannel } from './channels/stack-channel'
import { LogLevel } from './types'
import type {
  ILogChannel, LogRecord, LogLevelName,
  LoggerConfig, ChannelConfig,
} from './types'

class ChannelLogger {
  constructor(
    private ch: ILogChannel,
    private channelName: string,
    private parent: Logger
  ) {}

  private write(level: LogLevelName, msg: string, ctx?: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = (this.parent as any).buildRecord(level, msg, ctx, this.channelName)
    this.ch.write(record)
  }

  emergency(msg: string, ctx?: Record<string, unknown>) { this.write('EMERGENCY', msg, ctx) }
  alert(msg: string, ctx?: Record<string, unknown>)     { this.write('ALERT', msg, ctx) }
  critical(msg: string, ctx?: Record<string, unknown>)  { this.write('CRITICAL', msg, ctx) }
  error(msg: string, ctx?: Record<string, unknown>)     { this.write('ERROR', msg, ctx) }
  warning(msg: string, ctx?: Record<string, unknown>)   { this.write('WARNING', msg, ctx) }
  notice(msg: string, ctx?: Record<string, unknown>)    { this.write('NOTICE', msg, ctx) }
  info(msg: string, ctx?: Record<string, unknown>)      { this.write('INFO', msg, ctx) }
  debug(msg: string, ctx?: Record<string, unknown>)     { this.write('DEBUG', msg, ctx) }
}

class Logger {
  private channels = new Map<string, ILogChannel>()
  private config: LoggerConfig

  constructor() {
    this.config = buildLoggerConfig()
    this.initChannels()
  }

  private initChannels(): void {
    // 先创建非 stack channel，再创建 stack（stack 依赖其他 channel）
    for (const [name, cfg] of Object.entries(this.config.channels)) {
      if (cfg.driver !== 'stack') {
        this.channels.set(name, this.createChannel(name, cfg))
      }
    }
    for (const [name, cfg] of Object.entries(this.config.channels)) {
      if (cfg.driver === 'stack') {
        this.channels.set(name, this.createChannel(name, cfg))
      }
    }
  }

  private createChannel(name: string, cfg: ChannelConfig): ILogChannel {
    switch (cfg.driver) {
      case 'console': return new ConsoleChannel(cfg)
      case 'file':    return new FileChannel(cfg)
      case 'gelf':    return new GelfChannel(cfg)
      case 'stack': {
        const children = cfg.channels
          .map((n) => this.channels.get(n))
          .filter(Boolean) as ILogChannel[]
        return new StackChannel(children)
      }
    }
  }

  private buildRecord(
    level: LogLevelName,
    message: string,
    context?: Record<string, unknown>,
    channelName?: string
  ): LogRecord {
    const logCtx = getLogContext()
    const error = context?.error instanceof Error ? context.error as Error : undefined
    const cleanContext = error
      ? Object.fromEntries(Object.entries(context || {}).filter(([k]) => k !== 'error'))
      : context

    return {
      timestamp: new Date().toISOString(),
      level,
      levelCode: LogLevel[level],
      message,
      channel: channelName || this.config.default,
      request_id: getRequestId(),
      ...logCtx,
      context: cleanContext && Object.keys(cleanContext).length ? cleanContext : undefined,
      error: error
        ? { name: error.name, message: error.message, stack: error.stack }
        : undefined,
    }
  }

  /** 切换到指定 channel，类似 Laravel Log::channel('gelf') */
  channel(name: string): ChannelLogger {
    const ch = this.channels.get(name)
    if (!ch) throw new Error(`Log channel "${name}" not configured`)
    return new ChannelLogger(ch, name, this)
  }

  private write(level: LogLevelName, message: string, context?: Record<string, unknown>): void {
    const ch = this.channels.get(this.config.default)
    if (!ch) return
    ch.write(this.buildRecord(level, message, context))
  }

  emergency(msg: string, ctx?: Record<string, unknown>) { this.write('EMERGENCY', msg, ctx) }
  alert(msg: string, ctx?: Record<string, unknown>)     { this.write('ALERT', msg, ctx) }
  critical(msg: string, ctx?: Record<string, unknown>)  { this.write('CRITICAL', msg, ctx) }
  error(msg: string, ctx?: Record<string, unknown>)     { this.write('ERROR', msg, ctx) }
  warning(msg: string, ctx?: Record<string, unknown>)   { this.write('WARNING', msg, ctx) }
  notice(msg: string, ctx?: Record<string, unknown>)    { this.write('NOTICE', msg, ctx) }
  info(msg: string, ctx?: Record<string, unknown>)      { this.write('INFO', msg, ctx) }
  debug(msg: string, ctx?: Record<string, unknown>)     { this.write('DEBUG', msg, ctx) }
}

// 单例导出，类似 Laravel Log Facade
export const Log = new Logger()
