/**
 * PDA 令牌登录 API
 *
 * POST /api/v1/auth/pda-token-login
 * PDA 扫描二维码后，使用临时令牌进行登录
 */

import { generateToken } from '@/lib/auth/jwt'
import { setAuthTokenCookie } from '@/lib/auth/token-cookie'
import { verifyPdaLoginToken } from '@/lib/auth/pda-token'
import { prisma } from '@/lib/db/prisma'
import { isPasswordExpired } from '@/lib/security'
import { NextRequest,NextResponse } from 'next/server'

/**
 * PDA 令牌登录
 *
 * 请求体：
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 *
 * 响应（与 /api/v1/auth/login 一致）：
 * {
 *   "success": true,
 *   "data": {
 *     "token": "session_jwt_token...",
 *     "user": { ... }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    // 验证必填字段
    if (!token) {
      return NextResponse.json(
        { success: false, error: '缺少登录令牌' },
        { status: 400 }
      )
    }

    // 获取客户端 IP
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // 验证并消费 PDA 登录令牌（一次性）
    const pdaPayload = await verifyPdaLoginToken(token)

    if (!pdaPayload) {
      return NextResponse.json(
        { success: false, error: '登录令牌无效或已过期，请重新扫码' },
        { status: 401 }
      )
    }

    // 查询租户
    const tenant = await prisma.tenant.findUnique({
      where: { id: pdaPayload.tenantId },
    })

    if (!tenant || tenant.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: '租户不存在或已禁用' },
        { status: 401 }
      )
    }

    // 查询用户（再次验证用户状态，因为生成令牌后用户状态可能已变更）
    const user = await prisma.user.findUnique({
      where: { id: pdaPayload.userId },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 401 }
      )
    }

    // 检查用户状态
    if (!user.isActive || user.status === 'DISABLED') {
      return NextResponse.json(
        { success: false, error: '账号已被禁用' },
        { status: 403 }
      )
    }

    if (user.status === 'LOCKED') {
      return NextResponse.json(
        { success: false, error: '账号已被锁定，请联系管理员' },
        { status: 423 }
      )
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { success: false, error: '账号已被暂停，请联系管理员' },
        { status: 403 }
      )
    }

    // 检查数据库中的锁定状态
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const minutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      )
      return NextResponse.json(
        { success: false, error: `账号已被锁定，请${minutes}分钟后再试` },
        { status: 423 }
      )
    }

    // 更新用户登录信息
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    })

    // 记录登录历史（loginType 为 TOKEN）
    await prisma.loginHistory.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        username: user.username,
        loginType: 'TOKEN',
        loginResult: 'SUCCESS',
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    })

    // 生成会话 JWT token
    const sessionToken = await generateToken({
      id: user.id,
      tenantId: tenant.id,
      tenantCode: tenant.tenantCode,
      username: user.username,
      userType: user.userType,
    })

    // 返回成功响应（与 /api/v1/auth/login 格式一致）
    const response = NextResponse.json({
      success: true,
      data: {
        token: sessionToken,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          tenantId: tenant.id,
          tenantCode: tenant.tenantCode,
          tenantName: tenant.tenantName,
          userType: user.userType,
          passwordExpired: isPasswordExpired(user.passwordExpiresAt),
        },
      },
    })

    setAuthTokenCookie(response, sessionToken)

    return response
  } catch (error) {
    console.error('PDA token login error:', error)
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}
