import { NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requireAnyPermissionForUser } from '@/lib/auth/user-permissions'
import {
  generateSupplementPickOrder,
  PICKING_EXCEPTION_MANAGE_PERMISSION,
  toPickingExceptionErrorResponse,
} from '@/lib/services/picking-exception-service'

export const POST = createAuthHandler(async (_request, auth, context) => {
  const permissionResponse = await requireAnyPermissionForUser(auth.user.id, [
    PICKING_EXCEPTION_MANAGE_PERMISSION,
    'picking:update',
  ])
  if (permissionResponse) return permissionResponse

  try {
    const { id } = await context!.params
    const supplementOrder = await generateSupplementPickOrder({
      tenantId: auth.user.tenantId,
      caseId: id,
      operatorId: auth.user.id,
    })

    return NextResponse.json({
      success: true,
      message: '补拣单生成成功',
      data: supplementOrder,
    })
  } catch (error) {
    console.error('生成补拣单失败:', error)
    const response = toPickingExceptionErrorResponse(error)
    return NextResponse.json(response.body, { status: response.status })
  }
})
