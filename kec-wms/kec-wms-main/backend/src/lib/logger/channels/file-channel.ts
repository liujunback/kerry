import pino from 'pino'
import { dirname, basename, join } from 'path'
import { BaseChannel } from './base-channel'
import type { LogRecord, FileChannelConfig } from '../types'

export class FileChannel extends BaseChannel {
  readonly name = 'file'
  private logger: pino.Logger
  private currentDate: string
  private config: FileChannelConfig

  constructor(config: FileChannelConfig) {
    super(config.level)
    this.config = config
    this.currentDate = this.getDateStr()
    this.logger = this.createLogger()
  }

  private getDateStr(): string {
    return new Date().toISOString().slice(0, 10)
  }

  private getFilePath(): string {
    const dir = dirname(this.config.path)
    const base = basename(this.config.path, '.log')
    return join(dir, `${base}-${this.currentDate}.log`)
  }

  private createLogger(): pino.Logger {
    return pino(
      { level: 'trace' },
      pino.destination({ dest: this.getFilePath(), sync: false, mkdir: true })
    )
  }

  write(record: LogRecord): void {
    if (!this.shouldLog(record)) return
    // 按日轮转：检查日期变化
    const today = this.getDateStr()
    if (today !== this.currentDate) {
      this.currentDate = today
      this.logger = this.createLogger()
    }
    const { message, level, ...rest } = record
    this.logger.info({ ...rest, _level: level }, message)
  }
}
