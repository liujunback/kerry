/**
 * API Key 管理 API
 * GET - 获取API Key列表
 * POST - 创建新的API Key
 */

import { createAuthHandler } from '@/lib/api/create-handler';
import { prisma } from '@/lib/db/prisma';
import {
  normalizeApiKeyWebhookEvents,
  normalizeOptionalWebhookString,
} from '@/lib/external-api/webhook/api-key-webhook'
import crypto from 'crypto';
import { NextRequest,NextResponse } from 'next/server';

// 生成API Key
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `wms_${crypto.randomBytes(32).toString('hex')}`
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  const prefix = key.substring(0, 12)
  return { key, hash, prefix }
}

// GET - 获取API Key列表
export const GET = createAuthHandler(async (_request, auth) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { tenantId: auth.user.tenantId },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        clientId: true,
        warehouseId: true,
        scopes: true,
        webhookUrl: true,
        webhookEvents: true,
        rateLimit: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        lastUsedIp: true,
        createdAt: true,
        client: { select: { clientCode: true, clientName: true } },
        warehouse: { select: { warehouseCode: true, warehouseName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: apiKeys })
  } catch (error) {
    console.error('获取API Key列表失败:', error)
    return NextResponse.json(
      { success: false, message: '获取API Key列表失败' },
      { status: 500 }
    )
  }
})

// POST - 创建新的API Key
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const {
      name,
      description,
      clientId,
      warehouseId,
      scopes = [],
      webhookUrl,
      webhookSecret,
      webhookEvents,
      rateLimit = 100,
      expiresAt,
    } = body

    if (!name) {
      return NextResponse.json(
        { success: false, message: '密钥名称不能为空' },
        { status: 400 }
      )
    }

    // 检查名称是否重复
    const existing = await prisma.apiKey.findUnique({
      where: {
        tenantId_name: {
          tenantId: auth.user.tenantId,
          name,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: '密钥名称已存在' },
        { status: 400 }
      )
    }

    const normalizedWebhookUrl = normalizeOptionalWebhookString(webhookUrl)
    const normalizedWebhookSecret = normalizeOptionalWebhookString(webhookSecret)
    const normalizedWebhookEvents = normalizeApiKeyWebhookEvents(webhookEvents)

    // 生成API Key
    const { key, hash, prefix } = generateApiKey()

    // 创建API Key记录
    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId: auth.user.tenantId,
        name,
        description,
        keyHash: hash,
        keyPrefix: prefix,
        clientId,
        warehouseId,
        scopes,
        webhookUrl: normalizedWebhookUrl,
        webhookSecret: normalizedWebhookSecret,
        webhookEvents: normalizedWebhookEvents,
        rateLimit,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: auth.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        scopes: true,
        webhookUrl: true,
        webhookEvents: true,
        rateLimit: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    // 返回完整的API Key（仅此一次显示）
    return NextResponse.json({
      success: true,
      message: 'API Key创建成功，请妥善保存，此密钥仅显示一次',
      data: {
        ...apiKey,
        key, // 完整的API Key，仅在创建时返回
      },
    })
  } catch (error) {
    console.error('创建API Key失败:', error)
    return NextResponse.json(
      { success: false, message: '创建API Key失败' },
      { status: 500 }
    )
  }
})
