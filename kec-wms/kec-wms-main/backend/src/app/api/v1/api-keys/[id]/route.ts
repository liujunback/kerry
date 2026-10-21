import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import {
  normalizeApiKeyWebhookEvents,
  normalizeOptionalWebhookString,
} from '@/lib/external-api/webhook/api-key-webhook'
import { NextResponse } from 'next/server'

// GET - 获取单个API Key详情
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
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
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
    })

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'API Key不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: apiKey,
    })
  } catch (error) {
    console.error('获取API Key详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取API Key详情失败' },
      { status: 500 }
    )
  }
})

// PATCH - 更新API Key
export const PATCH = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const {
      name,
      description,
      scopes,
      webhookUrl,
      webhookSecret,
      webhookEvents,
      rateLimit,
      isActive,
      expiresAt,
    } = body

    // 检查API Key是否存在
    const existing = await prisma.apiKey.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'API Key不存在' },
        { status: 404 }
      )
    }

    // 如果修改名称，检查是否重复
    if (name && name !== existing.name) {
      const duplicate = await prisma.apiKey.findUnique({
        where: {
          tenantId_name: {
            tenantId: auth.user.tenantId,
            name,
          },
        },
      })
      if (duplicate) {
        return NextResponse.json(
          { success: false, message: '密钥名称已存在' },
          { status: 400 }
        )
      }
    }

    const normalizedWebhookUrl = webhookUrl === undefined
      ? undefined
      : normalizeOptionalWebhookString(webhookUrl)
    const normalizedWebhookSecret = webhookSecret === undefined
      ? undefined
      : normalizeOptionalWebhookString(webhookSecret)
    const normalizedWebhookEvents = webhookEvents === undefined
      ? undefined
      : normalizeApiKeyWebhookEvents(webhookEvents)

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(scopes && { scopes }),
        ...(normalizedWebhookUrl !== undefined && { webhookUrl: normalizedWebhookUrl }),
        ...(normalizedWebhookSecret !== undefined && { webhookSecret: normalizedWebhookSecret }),
        ...(normalizedWebhookEvents !== undefined && { webhookEvents: normalizedWebhookEvents }),
        ...(rateLimit !== undefined && { rateLimit }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        updatedBy: auth.user.id,
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
        isActive: true,
        expiresAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'API Key更新成功',
      data: apiKey,
    })
  } catch (error) {
    console.error('更新API Key失败:', error)
    return NextResponse.json(
      { success: false, message: '更新API Key失败' },
      { status: 500 }
    )
  }
})

// DELETE - 删除API Key
export const DELETE = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    // 检查API Key是否存在
    const existing = await prisma.apiKey.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'API Key不存在' },
        { status: 404 }
      )
    }

    await prisma.apiKey.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'API Key已删除',
    })
  } catch (error) {
    console.error('删除API Key失败:', error)
    return NextResponse.json(
      { success: false, message: '删除API Key失败' },
      { status: 500 }
    )
  }
})
