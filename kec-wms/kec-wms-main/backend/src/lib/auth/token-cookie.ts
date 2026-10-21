import type { NextResponse } from 'next/server'

export const AUTH_TOKEN_COOKIE_NAME = 'wms_auth_token'
export const AUTH_TOKEN_TTL_SECONDS = 24 * 60 * 60

function isSecureCookie(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function setAuthTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureCookie(),
    path: '/',
    maxAge: AUTH_TOKEN_TTL_SECONDS,
  })
}
