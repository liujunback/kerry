import { createAuthHandler } from '@/lib/api/create-handler'
import { FileStorage,getJob } from '@/lib/queue'
import { NextResponse } from 'next/server'
import * as path from 'path'

// GET /api/v1/jobs/[id]/download - 下载任务结果文件
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const job = await getJob(id, auth.user.tenantId)

    if (!job) {
      return NextResponse.json(
        { success: false, message: '任务不存在' },
        { status: 404 }
      )
    }

    if (!job.resultFilePath || !job.resultFileName) {
      return NextResponse.json(
        { success: false, message: '该任务没有可下载的文件' },
        { status: 404 }
      )
    }

    // 检查文件是否过期
    if (job.resultExpiresAt && new Date(job.resultExpiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, message: '文件已过期' },
        { status: 410 }
      )
    }

    // 检查文件是否存在
    const fileStorage = new FileStorage()
    const exists = await fileStorage.fileExists(job.resultFilePath)

    if (!exists) {
      return NextResponse.json(
        { success: false, message: '文件不存在' },
        { status: 404 }
      )
    }

    // 读取文件
    const fileBuffer = await fileStorage.readFile(job.resultFilePath)

    // 确定 Content-Type
    const ext = path.extname(job.resultFileName).toLowerCase()
    let contentType = 'application/octet-stream'
    if (ext === '.xlsx') {
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else if (ext === '.csv') {
      contentType = 'text/csv'
    } else if (ext === '.json') {
      contentType = 'application/json'
    }

    // 返回文件
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(job.resultFileName)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('下载文件失败:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : '下载失败',
      },
      { status: 500 }
    )
  }
})
