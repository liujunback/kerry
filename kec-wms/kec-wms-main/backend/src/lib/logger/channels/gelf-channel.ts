import { createSocket } from 'dgram'
import { createConnection } from 'net'
import { deflate } from 'zlib'
import { promisify } from 'util'
import { hostname } from 'os'
import { BaseChannel } from './base-channel'
import type { LogRecord, GelfChannelConfig } from '../types'

const deflateAsync = promisify(deflate)

// GELF 级别映射（syslog 标准）
const GELF_LEVEL_MAP: Record<string, number> = {
  EMERGENCY: 0, ALERT: 1, CRITICAL: 2, ERROR: 3,
  WARNING: 4,   NOTICE: 5, INFO: 6,   DEBUG: 7,
}

interface GelfMessage {
  version: '1.1'
  host: string
  short_message: string
  full_message?: string
  timestamp: number
  level: number
  facility?: string
  [key: string]: unknown
}

export class GelfChannel extends BaseChannel {
  readonly name = 'gelf'
  private config: GelfChannelConfig
  private host: string

  constructor(config: GelfChannelConfig) {
    super(config.level)
    this.config = config
    this.host = process.env.HOSTNAME || hostname()
  }

  private buildGelfMessage(record: LogRecord): GelfMessage {
    const msg: GelfMessage = {
      version: '1.1',
      host: this.host,
      short_message: record.message,
      timestamp: new Date(record.timestamp).getTime() / 1000,
      level: GELF_LEVEL_MAP[record.level] ?? 7,
      facility: this.config.facility,
      _channel: record.channel,
      _level_name: record.level,
      _request_id: record.request_id,
      _user_id: record.user_id,
      _tenant_id: record.tenant_id,
      _ip: record.ip,
      _path: record.path,
      _method: record.method,
    }

    // 展开 context 字段（GELF 自定义字段必须以 _ 开头）
    if (record.context) {
      for (const [k, v] of Object.entries(record.context)) {
        msg[`_${k}`] = typeof v === 'object' ? JSON.stringify(v) : v
      }
    }

    if (record.error) {
      msg._error_name = record.error.name
      msg._error_message = record.error.message
      msg.full_message = record.error.stack
    }

    // 追加额外字段
    if (this.config.additionalFields) {
      for (const [k, v] of Object.entries(this.config.additionalFields)) {
        msg[`_${k}`] = v
      }
    }

    // 清理 undefined 字段
    return Object.fromEntries(
      Object.entries(msg).filter(([, v]) => v !== undefined)
    ) as GelfMessage
  }

  async write(record: LogRecord): Promise<void> {
    if (!this.shouldLog(record)) return
    const gelf = this.buildGelfMessage(record)
    const payload = Buffer.from(JSON.stringify(gelf))
    try {
      if (this.config.transport === 'udp') {
        await this.sendUdp(payload)
      } else {
        await this.sendTcp(payload)
      }
    } catch (err) {
      // GELF 发送失败不影响主业务，降级到 stderr
      process.stderr.write(`[Logger/GELF] Send failed: ${err}\n`)
    }
  }

  private async sendUdp(payload: Buffer): Promise<void> {
    const compressed = await deflateAsync(payload)
    if (compressed.length <= 8192) {
      return new Promise((resolve, reject) => {
        const socket = createSocket('udp4')
        socket.send(compressed, this.config.port, this.config.host, (err) => {
          socket.close()
          err ? reject(err) : resolve()
        })
      })
    }
    // Chunking：每块最大 1420 字节（MTU 安全值）
    const CHUNK_SIZE = 1420
    const chunks = Math.ceil(compressed.length / CHUNK_SIZE)
    const msgId = Buffer.allocUnsafe(8)
    msgId.writeBigUInt64BE(BigInt(Date.now()))

    return new Promise((resolve, reject) => {
      const socket = createSocket('udp4')
      let sent = 0
      for (let i = 0; i < chunks; i++) {
        const chunk = compressed.subarray(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        // GELF chunk header: magic(2) + msgId(8) + seqNum(1) + seqCount(1)
        const header = Buffer.from([0x1e, 0x0f, ...msgId, i, chunks])
        const packet = Buffer.concat([header, chunk])
        socket.send(packet, this.config.port, this.config.host, (err) => {
          if (err) { socket.close(); reject(err); return }
          if (++sent === chunks) { socket.close(); resolve() }
        })
      }
    })
  }

  private sendTcp(payload: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = createConnection(this.config.port, this.config.host, () => {
        // GELF TCP：消息以 null byte 结尾
        client.write(Buffer.concat([payload, Buffer.from([0x00])]))
        client.end()
        resolve()
      })
      client.on('error', reject)
      client.setTimeout(5000, () => {
        client.destroy()
        reject(new Error('GELF TCP timeout'))
      })
    })
  }
}
