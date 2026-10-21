import { authenticate, hasApiScope, type AuthContext } from '@/lib/auth/unified-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function authenticateRequest(
  request: NextRequest,
  requiredScope?: string
): Promise<
  | { success: true; auth: AuthContext }
  | { success: false; response: NextResponse }
> {
  const authResult = await authenticate(request)
  if (!authResult.success || !authResult.context) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: authResult.status || 401 }
      ),
    }
  }

  if (requiredScope && !hasApiScope(authResult.context, requiredScope)) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      ),
    }
  }

  return {
    success: true,
    auth: authResult.context,
  }
}
