import { generateToken } from '@/lib/auth/jwt'
import { setAuthTokenCookie } from '@/lib/auth/token-cookie'
import { prisma } from '@/lib/db/prisma'
import {
checkRateLimit,
clearLoginFailures,
getAccountLockTTL,
isPasswordExpired,
LOCK_CONFIG,
recordLoginFailure,
shouldLockAccount,
verifyPassword,
} from '@/lib/security'
import { NextRequest,NextResponse } from 'next/server'

/**
 * PDA 应用专用登录接口
 * POST /api/v1/auth/login
 *
 * 此接口专为移动应用设计，绕过 NextAuth 的 CSRF 检查
 * 认证成功后返回 JWT token，客户端需要在后续请求中携带此 token
 *
 * 请求体：
 * {
 *   "tenantCode": "DEFAULT",
 *   "username": "admin",
 *   "password": "Admin@123"
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "user": { ... }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantCode, username, password } = body

    // 验证必填字段
    if (!tenantCode || !username || !password) {
      return NextResponse.json(
        { success: false, error: '请填写完整的登录信息' },
        { status: 400 }
      )
    }

    // 获取客户端 IP
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // 检查 IP 限流
    const rateLimit = await checkRateLimit(ip)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      )
    }

    // 查找租户
    const tenant = await prisma.tenant.findUnique({
      where: { tenantCode },
    })

    if (!tenant || tenant.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: '租户不存在或已禁用' },
        { status: 401 }
      )
    }

    // 检查账号是否被锁定（Redis 中的临时锁定）
    if (await shouldLockAccount(tenant.id, username)) {
      const ttl = await getAccountLockTTL(tenant.id, username)
      const minutes = Math.ceil(ttl / 60)
      return NextResponse.json(
        { success: false, error: `账号已被锁定，请${minutes}分钟后再试` },
        { status: 423 }
      )
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: {
        tenantId_username: {
          tenantId: tenant.id,
          username,
        },
      },
    })

    if (!user) {
      await recordLoginFailure(tenant.id, username)
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
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
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      return NextResponse.json(
        { success: false, error: `账号已被锁定，请${minutes}分钟后再试` },
        { status: 423 }
      )
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      const failures = await recordLoginFailure(tenant.id, username)

      // 更新数据库中的失败次数
      const newFailedCount = user.failedLoginCount + 1
      const updateData: Record<string, unknown> = {
        failedLoginCount: newFailedCount,
      }

      // 如果达到锁定阈值，锁定账号
      if (failures >= LOCK_CONFIG.maxFailedAttempts) {
        const lockedUntil = new Date()
        lockedUntil.setSeconds(lockedUntil.getSeconds() + LOCK_CONFIG.lockDurationSeconds)
        updateData.lockedAt = new Date()
        updateData.lockedUntil = lockedUntil
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      })

      const remaining = LOCK_CONFIG.maxFailedAttempts - failures
      if (remaining > 0) {
        return NextResponse.json(
          { success: false, error: `用户名或密码错误，还剩${remaining}次尝试机会` },
          { status: 401 }
        )
      } else {
        return NextResponse.json(
          { success: false, error: `账号已被锁定${LOCK_CONFIG.lockDurationSeconds / 60}分钟` },
          { status: 423 }
        )
      }
    }

    // 登录成功，清除失败记录
    await clearLoginFailures(tenant.id, username)

    // 更新用户登录信息
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        failedLoginCount: 0,
        lockedAt: null,
        lockedUntil: null,
      },
    })

    // 记录登录历史
    await prisma.loginHistory.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        username: user.username,
        loginType: 'PASSWORD',
        loginResult: 'SUCCESS',
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    })

    // 生成 JWT token
    const token = await generateToken({
      id: user.id,
      tenantId: tenant.id,
      tenantCode: tenant.tenantCode,
      username: user.username,
      userType: user.userType,
    })

    // 返回成功响应、token 和用户信息
    const response = NextResponse.json({
      success: true,
      data: {
        token,
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

    setAuthTokenCookie(response, token)

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    )
  }
}
