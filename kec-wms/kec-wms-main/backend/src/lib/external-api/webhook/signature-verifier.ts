/**
 * Webhook签名验证器
 */

import crypto from 'crypto'

export class SignatureVerifier {
  private algorithm: string

  constructor(algorithm: string = 'sha256') {
    this.algorithm = algorithm
  }

  /** 生成签名 */
  sign(payload: string, secret: string): string {
    const hmac = crypto.createHmac(this.algorithm, secret)
    hmac.update(payload)
    return `${this.algorithm}=${hmac.digest('hex')}`
  }

  /** 验证签名 */
  verify(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.sign(payload, secret)

    // 使用时间安全的比较
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    } catch {
      return false
    }
  }

  /** 从请求头解析签名 */
  parseSignature(signatureHeader: string): {
    algorithm: string
    signature: string
  } | null {
    const parts = signatureHeader.split('=')
    if (parts.length !== 2) {
      return null
    }

    return {
      algorithm: parts[0],
      signature: parts[1],
    }
  }

  /** 验证时间戳(防重放攻击) */
  verifyTimestamp(
    timestamp: string | Date,
    toleranceSeconds: number = 300
  ): boolean {
    const ts =
      typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime()
    const now = Date.now()
    const diff = Math.abs(now - ts)

    return diff <= toleranceSeconds * 1000
  }
}
