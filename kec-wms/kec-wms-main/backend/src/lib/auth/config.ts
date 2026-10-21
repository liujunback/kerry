import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db/prisma'
import {
  verifyPassword,
  isPasswordExpired,
  checkRateLimit,
  recordLoginFailure,
  clearLoginFailures,
  shouldLockAccount,
  getAccountLockTTL,
  LOCK_CONFIG,
} from '@/lib/security'

const AUTH_ERROR_CODE_SEPARATOR = ':'

class LoginCredentialsSignin extends CredentialsSignin {
  constructor(code: string) {
    super()
    this.code = code
  }
}

function buildAuthErrorCode(key: string, detail?: number | string) {
  return detail === undefined ? key : `${key}${AUTH_ERROR_CODE_SEPARATOR}${detail}`
}

function throwLoginError(key: string, detail?: number | string): never {
  throw new LoginCredentialsSignin(buildAuthErrorCode(key, detail))
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        tenantCode: { label: 'Tenant Code', type: 'text' },
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.tenantCode || !credentials?.username || !credentials?.password) {
          throwLoginError('pleaseInputComplete')
        }

        const tenantCode = credentials.tenantCode as string
        const username = credentials.username as string
        const password = credentials.password as string
        const ip = request.headers?.get('x-forwarded-for') || 'unknown'

        const rateLimit = await checkRateLimit(ip)
        if (!rateLimit.allowed) {
          throwLoginError('tooManyRequests')
        }

        const tenant = await prisma.tenant.findUnique({
          where: { tenantCode },
        })

        if (!tenant || tenant.status !== 'ACTIVE') {
          throwLoginError('tenantNotFound')
        }

        if (await shouldLockAccount(tenant.id, username)) {
          const ttl = await getAccountLockTTL(tenant.id, username)
          const minutes = Math.ceil(ttl / 60)
          throwLoginError('accountLockedMinutes', minutes)
        }

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
          throwLoginError('userNotFound')
        }

        if (!user.isActive || user.status === 'DISABLED') {
          throwLoginError('accountDisabled')
        }

        if (user.status === 'LOCKED') {
          throwLoginError('accountLocked')
        }

        if (user.status === 'SUSPENDED') {
          throwLoginError('accountSuspended')
        }

        if (user.lockedUntil && new Date() < user.lockedUntil) {
          const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
          throwLoginError('accountLockedMinutes', minutes)
        }

        const isValidPassword = await verifyPassword(password, user.passwordHash)
        if (!isValidPassword) {
          const failures = await recordLoginFailure(tenant.id, username)
          const newFailedCount = user.failedLoginCount + 1
          const updateData: Record<string, unknown> = {
            failedLoginCount: newFailedCount,
          }

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
            throwLoginError('wrongPassword', remaining)
          }

          throwLoginError('accountLockedMinutes', LOCK_CONFIG.lockDurationSeconds / 60)
        }

        await clearLoginFailures(tenant.id, username)

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

        await prisma.loginHistory.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            username: user.username,
            loginType: 'PASSWORD',
            loginResult: 'SUCCESS',
            ipAddress: ip,
            userAgent: request.headers?.get('user-agent') || undefined,
          },
        })

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          tenantId: tenant.id,
          tenantCode: tenant.tenantCode,
          tenantName: tenant.tenantName,
          username: user.username,
          userType: user.userType,
          passwordExpired: isPasswordExpired(user.passwordExpiresAt),
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.tenantId = user.tenantId
        token.tenantCode = user.tenantCode
        token.tenantName = user.tenantName
        token.username = user.username
        token.userType = user.userType
        token.passwordExpired = user.passwordExpired
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.tenantId = token.tenantId as string
        session.user.tenantCode = token.tenantCode as string
        session.user.tenantName = token.tenantName as string
        session.user.username = token.username as string
        session.user.userType = token.userType as string
        session.user.passwordExpired = token.passwordExpired as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
})
