/**
 * API Key 验证工具
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'

export interface ApiKeyContext {
  apiKeyId: string
  tenantId: string
  clientId?: string
  warehouseId?: string
  scopes: string[]
  rateLimit: number
}

export interface ApiKeyValidationResult {
  success: boolean
  context?: ApiKeyContext
  error?: string
  hasApiKey: boolean // 标识请求是否携带了 API Key
}

/**
 * 验证API Key
 * @param request NextRequest对象
 * @returns ApiKeyValidationResult
 */
export async function validateApiKey(
  request: NextRequest
): Promise<ApiKeyValidationResult> {
  // 从请求头获取API Key（支持多种格式以确保兼容性）
  const apiKey =
    request.headers.get('X-API-Key') ||
    request.headers.get('X-Api-Key') ||
    request.headers.get('x-api-key') ||
    request.headers.get('Authorization')?.replace('Bearer ', '')

  // 如果没有提供 API Key，返回成功但无上下文（允许继续尝试其他认证方式）
  if (!apiKey) {
    return { success: true, hasApiKey: false }
  }

  // 计算哈希
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')

  // 查询API Key
  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      isActive: true,
    },
  })

  if (!apiKeyRecord) {
    return {
      success: false,
      hasApiKey: true,
      error: 'API Key 无效或已禁用',
    }
  }

  // 检查是否过期
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return {
      success: false,
      hasApiKey: true,
      error: 'API Key 已过期',
    }
  }

  return {
    success: true,
    hasApiKey: true,
    context: {
      apiKeyId: apiKeyRecord.id,
      tenantId: apiKeyRecord.tenantId,
      clientId: apiKeyRecord.clientId || undefined,
      warehouseId: apiKeyRecord.warehouseId || undefined,
      scopes: apiKeyRecord.scopes as string[],
      rateLimit: apiKeyRecord.rateLimit,
    },
  }
}

/**
 * 检查是否有指定权限
 */
export function hasScope(context: ApiKeyContext, scope: string): boolean {
  // 如果scopes为空，表示有所有权限
  if (context.scopes.length === 0) {
    return true
  }

  // 检查精确匹配
  if (context.scopes.includes(scope)) {
    return true
  }

  // 检查通配符匹配（如 asn:* 匹配 asn:read, asn:write）
  const [resource] = scope.split(':')
  if (context.scopes.includes(`${resource}:*`)) {
    return true
  }

  // 检查全局通配符
  if (context.scopes.includes('*')) {
    return true
  }

  return false
}
