import { createAuthHandler } from '@/lib/api/create-handler'
import type { OperationEntityType } from '@/lib/constants/operation-types'
import { operationLogService } from '@/lib/services/operation-log-service'
import { NextResponse } from 'next/server'

// GET /api/v1/operation-logs/[entityType]/[entityId] - 查询实体操作历史
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { entityType, entityId } = await context!.params

    const logs = await operationLogService.getEntityOperationLogs(
      auth.user.tenantId,
      entityType.toUpperCase() as OperationEntityType,
      entityId
    )

    return NextResponse.json({
      success: true,
      data: logs,
    })
  } catch (error) {
    console.error('查询操作日志失败:', error)
    return NextResponse.json(
      { success: false, message: '查询操作日志失败' },
      { status: 500 }
    )
  }
})
