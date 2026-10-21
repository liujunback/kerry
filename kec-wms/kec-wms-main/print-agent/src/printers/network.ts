import * as net from 'net'
import { BasePrinter } from './base'

export class NetworkPrinter extends BasePrinter {
  constructor(
    private readonly ipAddress: string,
    private readonly port: number,
    private readonly timeoutMs = 10000
  ) {
    super()
  }

  // 通过 TCP socket 发送原始数据到打印机（JetDirect / RAW 协议）
  private sendRaw(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket()
      const timer = setTimeout(() => {
        socket.destroy()
        reject(new Error(`连接超时 (${this.timeoutMs}ms)`))
      }, this.timeoutMs)

      socket.connect(this.port, this.ipAddress, () => {
        socket.write(data, (err) => {
          if (err) {
            clearTimeout(timer)
            socket.destroy()
            reject(err)
            return
          }
          // 等待数据发送完毕后关闭
          socket.end(() => {
            clearTimeout(timer)
            resolve()
          })
        })
      })

      socket.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })
  }

  async print(pdfBuffer: Buffer, copies: number): Promise<void> {
    for (let i = 0; i < copies; i++) {
      await this.sendRaw(pdfBuffer)
    }
  }

  async testConnection(): Promise<number> {
    const start = Date.now()
    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket()
      const timer = setTimeout(() => {
        socket.destroy()
        reject(new Error('连接超时'))
      }, 5000)

      socket.connect(this.port, this.ipAddress, () => {
        clearTimeout(timer)
        socket.destroy()
        resolve()
      })

      socket.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })
    return Date.now() - start
  }
}
