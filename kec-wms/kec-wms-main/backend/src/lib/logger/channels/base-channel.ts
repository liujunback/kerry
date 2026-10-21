import { LogLevel, LogLevelName, ILogChannel, LogRecord } from '../types'

export abstract class BaseChannel implements ILogChannel {
  abstract readonly name: string
  protected minLevel: LogLevel

  constructor(level: LogLevelName = 'DEBUG') {
    this.minLevel = LogLevel[level]
  }

  protected shouldLog(record: LogRecord): boolean {
    // 数字越小越严重（EMERGENCY=0, DEBUG=7）
    // record 的级别数字 <= minLevel 时才输出（即比阈值更严重或相等）
    return LogLevel[record.level] <= this.minLevel
  }

  abstract write(record: LogRecord): void | Promise<void>
}
