import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requireAnyPermissionForUser } from '@/lib/auth/user-permissions'
import {
  markSupplementPickOrderPrinted,
  PICKING_EXCEPTION_PRINT_PERMISSION,
  toPickingExceptionErrorResponse,
} from '@/lib/services/picking-exception-service'

export const POST = createAuthHandler(async (_request, auth, context) => {
  const permissionResponse = await requireAnyPermissionForUser(auth.user.id, [
    PICKING_EXCEPTION_PRINT_PERMISSION,
    'picking:read',
  ])
  if (permissionResponse) return permissionResponse

  try {
    const { id } = await context!.params
    await markSupplementPickOrderPrinted({
      tenantId: auth.user.tenantId,
      supplementPickOrderId: id,
      operatorId: auth.user.id,
    })

    return NextResponse.json({ success: true, message: '补拣单打印状态已更新' })
  } catch (error) {
    console.error('更新补拣单打印状态失败:', error)
    const response = toPickingExceptionErrorResponse(error)
    return NextResponse.json(response.body, { status: response.status })
  }
})
