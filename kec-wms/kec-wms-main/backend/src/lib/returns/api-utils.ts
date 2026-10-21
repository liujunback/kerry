import { NextResponse } from 'next/server'
import type { AuthUser } from '@/lib/auth/middleware'

export function buildReturnAuth(user: AuthUser) {
  return {
    tenantId: user.tenantId,
    userId: user.id,
    warehouseId: user.warehouseId,
    username: user.name || user.username,
  }
}

export function ok<T>(data: T, message?: string) {
  return NextResponse.json({ success: true, data, ...(message ? { message } : {}) })
}

export function fail(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : '请求处理失败'
  return NextResponse.json({ success: false, message }, { status })
}

export async function readJson(request: Request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}
