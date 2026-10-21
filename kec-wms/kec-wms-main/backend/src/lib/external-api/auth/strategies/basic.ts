/**
 * Basic认证策略
 */

import type { BasicAuthConfig, RequestConfig } from '../../types'
import type { AuthStrategy } from '../auth-manager'

export class BasicStrategy implements AuthStrategy {
  private config: BasicAuthConfig

  constructor(config: BasicAuthConfig) {
    this.config = config
  }

  async getHeaders(_config: RequestConfig): Promise<Record<string, string>> {
    void _config

    const credentials = Buffer.from(
      `${this.config.username}:${this.config.password}`
    ).toString('base64')

    return {
      Authorization: `Basic ${credentials}`,
    }
  }
}
