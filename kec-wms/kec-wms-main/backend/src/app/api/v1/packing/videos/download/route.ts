import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { downloadPackingVideoFromS3, normalizeS3ObjectKey } from '@/lib/packing/s3-storage'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const downloadPackingVideoSchema = z.object({
  orderId: z.string().min(1, '订单ID不能为空'),
  jobId: z.string().min(1, '任务ID不能为空'),
  cameraId: z.string().min(1, '摄像头ID不能为空'),
})

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[\\/:*?"<>|]/g, '_').trim()
}

function inferDownloadFileName(record: {
  orderId: string
  cameraId: string
  fileName: string | null
}): string {
  const fallback = `${record.orderId}_${record.cameraId}.mp4`
  const candidate = sanitizeFileName(record.fileName || fallback)
  return candidate.length > 0 ? candidate : fallback
}

function resolveObjectKey(record: {
  objectKey: string | null
  videoUrl: string
}): string {
  const fromObjectKey = normalizeS3ObjectKey(record.objectKey || '')
  if (fromObjectKey) {
    return fromObjectKey
  }

  const fromVideoUrl = normalizeS3ObjectKey(record.videoUrl || '')
  if (fromVideoUrl) {
    return fromVideoUrl
  }

  return ''
}

// GET /api/v1/packing/videos/download?orderId=...&jobId=...&cameraId=...
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const validation = downloadPackingVideoSchema.safeParse({
      orderId: searchParams.get('orderId'),
      jobId: searchParams.get('jobId'),
      cameraId: searchParams.get('cameraId'),
    })

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { orderId, jobId, cameraId } = validation.data
    const record = await prisma.outboundOrderPackingVideo.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        orderId,
        jobId,
        cameraId,
      },
      select: {
        orderId: true,
        cameraId: true,
        fileName: true,
        objectKey: true,
        videoUrl: true,
      },
    })

    if (!record) {
      return NextResponse.json(
        { message: '视频记录不存在' },
        { status: 404 }
      )
    }

    const objectKey = resolveObjectKey(record)
    if (!objectKey) {
      return NextResponse.json(
        { message: '视频对象Key缺失，无法下载' },
        { status: 404 }
      )
    }

    const downloadResult = await downloadPackingVideoFromS3(objectKey)
    const filename = inferDownloadFileName(record)
    const responseBody = new Uint8Array(downloadResult.bytes.byteLength)
    responseBody.set(downloadResult.bytes)

    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': downloadResult.contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(downloadResult.contentLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('下载打包视频失败:', error)
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : '下载打包视频失败',
      },
      { status: 500 }
    )
  }
})
