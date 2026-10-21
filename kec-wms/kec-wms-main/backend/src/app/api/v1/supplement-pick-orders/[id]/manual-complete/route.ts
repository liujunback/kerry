import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requireAnyPermissionForUser } from '@/lib/auth/user-permissions'
import {
  manuallyCompleteSupplementPickOrder,
  PICKING_EXCEPTION_MANAGE_PERMISSION,
  toPickingExceptionErrorResponse,
} from '@/lib/services/picking-exception-service'

const manualCompleteSchema = z.object({
  remark: z.string().trim().min(1, '备注不能为空').max(500, '备注不能超过 500 个字符'),
})

export const POST = createAuthHandler(async (request: NextRequest, auth, context) => {
  const permissionResponse = await requireAnyPermissionForUser(auth.user.id, [
    PICKING_EXCEPTION_MANAGE_PERMISSION,
    'picking:update',
  ])
  if (permissionResponse) return permissionResponse

  const body = await request.json()
  const validation = manualCompleteSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, message: validation.error.issues[0]?.message || '参数错误' },
      { status: 400 }
    )
  }

  try {
    const { id } = await context!.params
    const result = await manuallyCompleteSupplementPickOrder({
      tenantId: auth.user.tenantId,
      supplementPickOrderId: id,
      operatorId: auth.user.id,
      remark: validation.data.remark,
    })

    return NextResponse.json({
      success: true,
      message: '补拣单已标记补齐',
      data: result,
    })
  } catch (error) {
    console.error('手动标记补拣单补齐失败:', error)
    const response = toPickingExceptionErrorResponse(error)
    return NextResponse.json(response.body, { status: response.status })
  }
})
