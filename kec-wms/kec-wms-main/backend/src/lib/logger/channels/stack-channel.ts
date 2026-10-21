import { BaseChannel } from './base-channel'
import type { ILogChannel, LogRecord } from '../types'

export class StackChannel extends BaseChannel {
  readonly name = 'stack'
  private channels: ILogChannel[]

  constructor(channels: ILogChannel[]) {
    super('DEBUG')
    this.channels = channels
  }

  async write(record: LogRecord): Promise<void> {
    await Promise.allSettled(this.channels.map((ch) => ch.write(record)))
  }
}
