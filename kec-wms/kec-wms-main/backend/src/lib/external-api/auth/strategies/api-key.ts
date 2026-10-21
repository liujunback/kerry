/**
 * API Key认证策略
 */

import type { ApiKeyAuthConfig, RequestConfig } from '../../types'
import type { AuthStrategy } from '../auth-manager'

export class ApiKeyStrategy implements AuthStrategy {
  private config: ApiKeyAuthConfig

  constructor(config: ApiKeyAuthConfig) {
    this.config = config
  }

  async getHeaders(config: RequestConfig): Promise<Record<string, string>> {
    void config

    if (this.config.location === 'header') {
      return {
        [this.config.keyName]: this.config.keyValue,
      }
    }

    // 如果是query参数，返回空头，参数会在URL中添加
    return {}
  }

  /** 获取查询参数(如果认证在query中) */
  getQueryParams(): Record<string, string> {
    if (this.config.location === 'query') {
      return {
        [this.config.keyName]: this.config.keyValue,
      }
    }
    return {}
  }
}
