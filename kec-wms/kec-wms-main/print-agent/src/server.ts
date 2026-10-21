import { WebSocketServer, WebSocket } from 'ws'
import { NetworkPrinter } from './printers/network'
import { UsbPrinter } from './printers/usb'
import { VirtualPrinter } from './printers/virtual'
import type {
  IncomingMessage,
  JobStatusMessage,
  DeviceTestMessage,
  PongMessage,
  DeviceConfig,
} from './types'

const VERSION = '1.0.0'
const PORT = 12212

function createPrinter(config: DeviceConfig) {
  // 虚拟打印机 - 用于测试
  if (config.connectionType === 'VIRTUAL') {
    return new VirtualPrinter()
  }

  if (config.connectionType === 'NETWORK') {
    if (!config.ipAddress || !config.port) {
      throw new Error('网络打印机需要 ipAddress 和 port')
    }
    return new NetworkPrinter(config.ipAddress, config.port)
  }
  // USB / BLUETOOTH 均走系统打印队列，printerName 可指定 KM-200 这类队列名
  return new UsbPrinter(config.printerName)
}

function send(ws: WebSocket, msg: JobStatusMessage | DeviceTestMessage | PongMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

export function startServer() {
  const wss = new WebSocketServer({ port: PORT, host: '127.0.0.1' })
  const startTime = Date.now()

  wss.on('listening', () => {
    console.log(`[print-agent] WebSocket 服务已启动 ws://127.0.0.1:${PORT}`)
  })

  wss.on('connection', (ws) => {
    console.log('[print-agent] 客户端已连接')

    ws.on('message', async (raw) => {
      let msg: IncomingMessage
      try {
        msg = JSON.parse(raw.toString()) as IncomingMessage
      } catch {
        console.error('[print-agent] 无效消息格式')
        return
      }

      // ── PING ──────────────────────────────────────────────
      if (msg.type === 'PING') {
        send(ws, {
          type: 'PONG',
          version: VERSION,
          uptime: Math.floor((Date.now() - startTime) / 1000),
        })
        return
      }

      // ── TEST_DEVICE ────────────────────────────────────────
      if (msg.type === 'TEST_DEVICE') {
        try {
          const printer = createPrinter(msg.deviceConfig)
          const latencyMs = await printer.testConnection()
          send(ws, { type: 'DEVICE_TEST', success: true, latencyMs })
        } catch (err) {
          send(ws, {
            type: 'DEVICE_TEST',
            success: false,
            error: err instanceof Error ? err.message : String(err),
          })
        }
        return
      }

      // ── PRINT ──────────────────────────────────────────────
      if (msg.type === 'PRINT') {
        const { jobId, deviceConfig, pdfBase64, copies = 1 } = msg

        send(ws, { type: 'JOB_STATUS', jobId, status: 'PRINTING' })

        try {
          const pdfBuffer = Buffer.from(pdfBase64, 'base64')
          const printer = createPrinter(deviceConfig)
          await printer.print(pdfBuffer, copies)
          send(ws, { type: 'JOB_STATUS', jobId, status: 'SUCCESS' })
          console.log(`[print-agent] 打印成功 jobId=${jobId}`)
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err)
          send(ws, { type: 'JOB_STATUS', jobId, status: 'FAILED', error })
          console.error(`[print-agent] 打印失败 jobId=${jobId}:`, error)
        }
      }
    })

    ws.on('close', () => console.log('[print-agent] 客户端已断开'))
    ws.on('error', (err) => console.error('[print-agent] WebSocket 错误:', err))
  })

  return wss
}
