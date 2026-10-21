import { createAuthHandler } from '@/lib/api/create-handler'
import type { OperationEntityType } from '@/lib/constants/operation-types'
import { operationLogService } from '@/lib/services/operation-log-service'
import { NextResponse } from 'next/server'

// GET /api/v1/operation-logs - 分页查询操作日志
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get('entityType') as OperationEntityType | null
    const entityId = searchParams.get('entityId')
    const operationType = searchParams.get('operationType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    const result = await operationLogService.queryOperationLogs({
      tenantId: auth.user.tenantId,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      operationType: operationType || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      pageSize,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('查询操作日志失败:', error)
    return NextResponse.json(
      { success: false, message: '查询操作日志失败' },
      { status: 500 }
    )
  }
})
