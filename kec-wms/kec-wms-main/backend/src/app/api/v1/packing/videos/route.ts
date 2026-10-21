import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const rawUploadTargetSchema = z.object({
  cameraId: z.string().optional(),
  camera_id: z.string().optional(),
  filename: z.string().optional(),
  fileName: z.string().optional(),
  objectKey: z.string().optional(),
  object_key: z.string().optional(),
  url: z.string().optional(),
  uploadUrl: z.string().optional(),
  upload_url: z.string().optional(),
}).passthrough()

const savePackingVideoSchema = z.object({
  orderId: z.string().min(1, '订单ID不能为空'),
  jobId: z.union([z.string(), z.number()]).transform((value) => String(value).trim()).pipe(
    z.string().min(1, '任务ID不能为空')
  ),
  status: z.string().optional(),
  cameraIds: z.array(z.string()).optional(),
  uploadTargets: z.array(rawUploadTargetSchema).min(1, '上传目标不能为空'),
})

const queryPackingVideoSchema = z.object({
  orderId: z.string().min(1, '订单ID不能为空'),
  jobId: z.string().optional(),
})

type SavePackingVideoInput = z.infer<typeof savePackingVideoSchema>

interface NormalizedUploadTarget {
  cameraId: string
  fileName: string | null
  objectKey: string | null
  videoUrl: string
  raw: Record<string, unknown>
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text.length > 0 ? text : null
}

function normalizeUploadTargets(input: SavePackingVideoInput): NormalizedUploadTarget[] {
  const fallbackCameraIds = (input.cameraIds || [])
    .map((cameraId) => normalizeString(cameraId))
    .filter((cameraId): cameraId is string => Boolean(cameraId))

  return input.uploadTargets
    .map((target, index) => {
      const cameraId = normalizeString(target.cameraId)
        || normalizeString(target.camera_id)
        || normalizeString(fallbackCameraIds[index])
        || (fallbackCameraIds.length === 1 ? fallbackCameraIds[0] : null)
        || `camera-${index + 1}`

      const videoUrl = normalizeString(target.url)
        || normalizeString(target.uploadUrl)
        || normalizeString(target.upload_url)

      if (!cameraId || !videoUrl) {
        return null
      }

      return {
        cameraId,
        fileName: normalizeString(target.filename) || normalizeString(target.fileName),
        objectKey: normalizeString(target.objectKey) || normalizeString(target.object_key),
        videoUrl,
        raw: target,
      }
    })
    .filter((item): item is NormalizedUploadTarget => item !== null)
}

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const validation = queryPackingVideoSchema.safeParse({
      orderId: searchParams.get('orderId'),
      jobId: searchParams.get('jobId') || undefined,
    })

    if (!validation.success) {
      return NextResponse.json(
        { message: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { orderId, jobId } = validation.data
    const rows = await prisma.outboundOrderPackingVideo.findMany({
      where: {
        tenantId: auth.user.tenantId,
        orderId,
        ...(jobId ? { jobId } : {}),
      },
      orderBy: [
        { createdAt: 'desc' },
        { cameraId: 'asc' },
      ],
      select: {
        orderId: true,
        jobId: true,
        status: true,
        cameraId: true,
        fileName: true,
        objectKey: true,
        videoUrl: true,
        createdAt: true,
      },
    })

    const data = rows.map((row) => ({
      ...row,
      downloadUrl: `/api/v1/packing/videos/download?orderId=${encodeURIComponent(row.orderId)}&jobId=${encodeURIComponent(row.jobId)}&cameraId=${encodeURIComponent(row.cameraId)}`,
    }))

    return NextResponse.json({
      data,
    })
  } catch (error) {
    console.error('查询打包视频失败:', error)
    return NextResponse.json(
      { message: '查询打包视频失败' },
      { status: 500 }
    )
  }
})

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validation = savePackingVideoSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          message: validation.error.errors[0]?.message || '请求参数不合法',
          issues: validation.error.errors.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const { orderId, jobId, status } = validation.data
    const normalizedTargets = normalizeUploadTargets(validation.data)
    if (normalizedTargets.length === 0) {
      return NextResponse.json(
        { message: '上传目标缺少有效的视频URL' },
        { status: 400 }
      )
    }

    const order = await prisma.outboundOrder.findFirst({
      where: {
        id: orderId,
        tenantId: auth.user.tenantId,
      },
      select: { id: true },
    })

    if (!order) {
      return NextResponse.json(
        { message: '订单不存在' },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      for (const target of normalizedTargets) {
        await tx.outboundOrderPackingVideo.upsert({
          where: {
            tenantId_orderId_jobId_cameraId: {
              tenantId: auth.user.tenantId,
              orderId,
              jobId,
              cameraId: target.cameraId,
            },
          },
          create: {
            tenantId: auth.user.tenantId,
            orderId,
            jobId,
            status: status || 'queued',
            cameraId: target.cameraId,
            fileName: target.fileName,
            objectKey: target.objectKey,
            videoUrl: target.videoUrl,
            uploadTarget: target.raw,
          },
          update: {
            status: status || 'queued',
            fileName: target.fileName,
            objectKey: target.objectKey,
            videoUrl: target.videoUrl,
            uploadTarget: target.raw,
          },
        })
      }
    })

    return NextResponse.json({
      data: {
        orderId,
        jobId,
        savedCount: normalizedTargets.length,
      },
    })
  } catch (error) {
    console.error('保存打包视频失败:', error)
    return NextResponse.json(
      { message: '保存打包视频失败' },
      { status: 500 }
    )
  }
})
