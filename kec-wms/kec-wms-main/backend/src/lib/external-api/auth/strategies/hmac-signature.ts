/**
 * HMAC签名认证策略
 */

import crypto from 'crypto'
import type { HmacAuthConfig, RequestConfig } from '../../types'
import type { AuthStrategy } from '../auth-manager'

export class HmacStrategy implements AuthStrategy {
  private config: HmacAuthConfig

  constructor(config: HmacAuthConfig) {
    this.config = config
  }

  async getHeaders(config: RequestConfig): Promise<Record<string, string>> {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signature = this.generateSignature(config, timestamp)

    return {
      [this.config.timestampHeader]: timestamp,
      [this.config.signatureHeader]: signature,
    }
  }

  /** 生成签名 */
  private generateSignature(config: RequestConfig, timestamp: string): string {
    // 构建签名字符串
    const signParts: string[] = [timestamp]

    for (const field of this.config.signFields) {
      switch (field) {
        case 'method':
          signParts.push(config.method)
          break
        case 'url':
          signParts.push(config.url)
          break
        case 'body':
          if (config.body) {
            signParts.push(JSON.stringify(config.body))
          }
          break
        default:
          // 从body中获取指定字段
          if (config.body && typeof config.body === 'object') {
            const value = (config.body as Record<string, unknown>)[field]
            if (value !== undefined) {
              signParts.push(String(value))
            }
          }
      }
    }

    const signString = signParts.join('\n')

    // 计算HMAC签名
    const hmac = crypto.createHmac(this.config.algorithm, this.config.secretKey)
    hmac.update(signString)

    return hmac.digest('hex')
  }

  /** 验证签名 */
  verifySignature(
    config: RequestConfig,
    timestamp: string,
    signature: string
  ): boolean {
    // 检查时间戳是否过期
    const now = Math.floor(Date.now() / 1000)
    const ts = parseInt(timestamp, 10)

    if (Math.abs(now - ts) > this.config.validitySeconds) {
      return false
    }

    // 验证签名
    const expectedSignature = this.generateSignature(config, timestamp)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }
}
