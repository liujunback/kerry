import type { TransactionClient } from '@/lib/db/prisma'

const PACKING_VIDEO_MIN_WINDOW_SECONDS = 8

export interface PackingVideoWindow {
  orderId: string
  startTime: string
  endTime: string
}

interface BuildPackingVideoWindowParams {
  orderId: string
  packingFirstActionAt: Date | null
  packingStartAt: Date | null
  packedAt: Date
  minWindowSeconds?: number
}

interface ResolvePackingTimelineParams {
  tx: TransactionClient
  tenantId: string
  orderId: string
  packedAt: Date
}

interface ResolvedPackingTimeline {
  packingFirstActionAt: Date
  packingStartAt: Date | null
}

function normalizeDateTimeValue(value: unknown): Date | null {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value !== 'string') {
    return null
  }

  const text = value.trim()
  if (!text) {
    return null
  }

  // 兼容 timezone-extension 返回的 "yyyy-MM-dd HH:mm:ss(.SSS)" 本地时区字符串
  const localDateTimePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,3})?$/
  if (localDateTimePattern.test(text)) {
    const localIsoLike = text.replace(' ', 'T')
    const date = new Date(`${localIsoLike}+08:00`)
    if (!Number.isNaN(date.getTime())) {
      return date
    }
  }

  const normalized = text.includes(' ') && !text.includes('T')
    ? text.replace(' ', 'T')
    : text
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function resolvePackingTimelineForCompletion({
  tx,
  tenantId,
  orderId,
  packedAt,
}: ResolvePackingTimelineParams): Promise<ResolvedPackingTimeline> {
  const timeline = await tx.orderTimeline.findUnique({
    where: { orderId },
    select: {
      packingFirstActionAt: true,
      packingStartAt: true,
    },
  })

  const timelinePackingFirstActionAt = normalizeDateTimeValue(timeline?.packingFirstActionAt)
  const timelinePackingStartAt = normalizeDateTimeValue(timeline?.packingStartAt)

  if (timelinePackingFirstActionAt) {
    return {
      packingFirstActionAt: timelinePackingFirstActionAt,
      packingStartAt: timelinePackingStartAt,
    }
  }

  await ensurePackingFirstActionAt({
    tx,
    tenantId,
    orderId,
    at: packedAt,
  })

  return {
    packingFirstActionAt: packedAt,
    packingStartAt: timelinePackingStartAt,
  }
}

interface EnsurePackingFirstActionAtParams {
  tx: TransactionClient
  tenantId: string
  orderId: string
  at?: Date
}

export async function ensurePackingFirstActionAt({
  tx,
  tenantId,
  orderId,
  at = new Date(),
}: EnsurePackingFirstActionAtParams): Promise<Date> {
  const timeline = await tx.orderTimeline.findUnique({
    where: { orderId },
    select: {
      packingFirstActionAt: true,
    },
  })

  if (!timeline) {
    await tx.orderTimeline.create({
      data: {
        tenantId,
        orderId,
        packingFirstActionAt: at,
      },
    })
    return at
  }

  const existingPackingFirstActionAt = normalizeDateTimeValue(timeline.packingFirstActionAt)
  if (existingPackingFirstActionAt) {
    return existingPackingFirstActionAt
  }

  await tx.orderTimeline.update({
    where: { orderId },
    data: {
      packingFirstActionAt: at,
    },
  })

  return at
}

export function buildPackingVideoWindow({
  orderId,
  packingFirstActionAt,
  packingStartAt,
  packedAt,
  minWindowSeconds = PACKING_VIDEO_MIN_WINDOW_SECONDS,
}: BuildPackingVideoWindowParams): PackingVideoWindow {
  let rawStart = packingFirstActionAt ?? packingStartAt ?? packedAt
  const rawEnd = packedAt

  if (rawEnd.getTime() < rawStart.getTime()) {
    rawStart = rawEnd
  }

  const minWindowMs = Math.max(minWindowSeconds, 0) * 1000
  if (rawEnd.getTime() - rawStart.getTime() < minWindowMs) {
    rawStart = new Date(rawEnd.getTime() - minWindowMs)
  }

  return {
    orderId,
    startTime: rawStart.toISOString(),
    endTime: rawEnd.toISOString(),
  }
}
