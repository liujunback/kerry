/**
 * OAuth2认证策略
 */

import type { OAuth2AuthConfig, RequestConfig } from '../../types'
import type { AuthStrategy } from '../auth-manager'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

interface CachedToken {
  accessToken: string
  expiresAt: number
  refreshToken?: string
}

export class OAuth2Strategy implements AuthStrategy {
  private config: OAuth2AuthConfig
  private cachedToken: CachedToken | null = null

  constructor(config: OAuth2AuthConfig) {
    this.config = config
  }

  async getHeaders(_config: RequestConfig): Promise<Record<string, string>> {
    void _config

    const token = await this.getAccessToken()
    return {
      Authorization: `Bearer ${token}`,
    }
  }

  /** 获取访问令牌 */
  private async getAccessToken(): Promise<string> {
    // 检查缓存的token是否有效
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60000) {
      return this.cachedToken.accessToken
    }

    // 尝试刷新token
    if (this.cachedToken?.refreshToken) {
      try {
        return await this.refreshAccessToken(this.cachedToken.refreshToken)
      } catch {
        // 刷新失败，重新获取
      }
    }

    // 获取新token
    return this.fetchNewToken()
  }

  /** 获取新的访问令牌 */
  private async fetchNewToken(): Promise<string> {
    const params = new URLSearchParams()
    params.append('grant_type', this.config.grantType)
    params.append('client_id', this.config.clientId)
    params.append('client_secret', this.config.clientSecret)

    if (this.config.scopes && this.config.scopes.length > 0) {
      params.append('scope', this.config.scopes.join(' '))
    }

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.statusText}`)
    }

    const data: TokenResponse = await response.json()
    this.cacheToken(data)

    return data.access_token
  }

  /** 刷新访问令牌 */
  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const params = new URLSearchParams()
    params.append('grant_type', 'refresh_token')
    params.append('refresh_token', refreshToken)
    params.append('client_id', this.config.clientId)
    params.append('client_secret', this.config.clientSecret)

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      throw new Error(`OAuth2 token refresh failed: ${response.statusText}`)
    }

    const data: TokenResponse = await response.json()
    this.cacheToken(data)

    return data.access_token
  }

  /** 缓存token */
  private cacheToken(data: TokenResponse): void {
    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token || this.config.refreshToken,
    }
  }

  /** 清除缓存的token */
  clearToken(): void {
    this.cachedToken = null
  }
}
