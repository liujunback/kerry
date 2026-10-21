import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import {
createJob,
DATA_UPLOAD_SUB_TYPES,
JOB_TYPES,
JobStatus,
JobType,
listJobs,
} from '@/lib/queue'
import { NextResponse } from 'next/server'

// GET /api/v1/jobs - 查询任务列表
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const jobType = searchParams.get('jobType') || undefined
    const status = searchParams.get('status') || undefined

    const params = {
      tenantId: auth.user.tenantId,
      jobType: jobType as JobType | undefined,
      status: status as JobStatus | undefined,
      warehouseId: resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId')),
      clientId: searchParams.get('clientId') || undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
    }

    const result = await listJobs(params)

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (error) {
    console.error('查询任务列表失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '查询失败',
      },
      { status: 500 }
    )
  }
})

// POST /api/v1/jobs - 创建任务
export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()

    // 验证任务类型
    const validJobTypes = Object.values(JOB_TYPES)
    if (!validJobTypes.includes(body.jobType)) {
      return NextResponse.json(
        { success: false, message: '无效的任务类型' },
        { status: 400 }
      )
    }

    // 如果是数据上传任务，验证子类型
    if (body.jobType === JOB_TYPES.DATA_UPLOAD) {
      const validSubTypes = Object.values(DATA_UPLOAD_SUB_TYPES)
      if (!body.jobSubType || !validSubTypes.includes(body.jobSubType)) {
        return NextResponse.json(
          { success: false, message: '数据上传任务需要指定有效的子类型' },
          { status: 400 }
        )
      }
    }

    // 验证必填字段
    if (!body.jobName) {
      return NextResponse.json(
        { success: false, message: '任务名称不能为空' },
        { status: 400 }
      )
    }

    const result = await createJob(
      {
        jobType: body.jobType,
        jobSubType: body.jobSubType,
        jobName: body.jobName,
        description: body.description,
        priority: body.priority,
        inputData: body.inputData || {},
        warehouseId: resolveScopedWarehouseId(auth.user, body.warehouseId),
        clientId: body.clientId,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      },
      auth.user.tenantId,
      auth.user.id
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: '任务创建成功',
    })
  } catch (error) {
    console.error('创建任务失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '创建失败',
      },
      { status: 500 }
    )
  }
})
