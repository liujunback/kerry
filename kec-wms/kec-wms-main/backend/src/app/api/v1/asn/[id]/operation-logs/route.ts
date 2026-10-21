import { createAuthHandler } from '@/lib/api/create-handler'
import { operationLogService } from '@/lib/services/operation-log-service'
import { NextResponse } from 'next/server'

// GET /api/v1/asn/[id]/operation-logs - 查询 ASN 操作历史
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const logs = await operationLogService.getEntityOperationLogs(
      auth.user.tenantId,
      'ASN',
      id
    )

    return NextResponse.json({
      success: true,
      data: logs,
    })
  } catch (error) {
    console.error('查询 ASN 操作日志失败:', error)
    return NextResponse.json(
      { success: false, message: '查询操作日志失败' },
      { status: 500 }
    )
  }
})
