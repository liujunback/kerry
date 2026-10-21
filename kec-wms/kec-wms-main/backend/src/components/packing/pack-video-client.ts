'use client'

import type { PackingVideoWindow } from './modules/types'

interface PackGeneratePayload {
  orderId: string
  startTime: string
  endTime: string
  preSeconds: number
  postSeconds: number
}

interface PackGenerateUploadTarget {
  filename?: string
  fileName?: string
  objectKey?: string
  object_key?: string
  url?: string
  uploadUrl?: string
  upload_url?: string
}

interface PackGenerateResponse {
  success?: boolean
  jobId?: string | number
  status?: string
  uploadTargets?: PackGenerateUploadTarget[]
}

interface PackVideoRetryItem {
  idempotencyKey: string
  payload: PackGeneratePayload
  retryCount: number
  queuedAt: string
  lastFailedAt: string
  lastError: string
}

export interface PackVideoDispatchSummary {
  requested: number
  dispatched: number
  skipped: number
  failed: number
}

const PACK_VIDEO_API_URL = process.env.NEXT_PUBLIC_PACK_VIDEO_API_URL || 'http://localhost:3001/api/pack/generate'
const PACK_VIDEO_HEALTH_URL = process.env.NEXT_PUBLIC_PACK_VIDEO_HEALTH_URL || resolveDefaultHealthUrl(PACK_VIDEO_API_URL)
const PACK_VIDEO_PRE_SECONDS = Number.parseInt(process.env.NEXT_PUBLIC_PACK_VIDEO_PRE_SECONDS || '10', 10)
const PACK_VIDEO_POST_SECONDS = Number.parseInt(process.env.NEXT_PUBLIC_PACK_VIDEO_POST_SECONDS || '10', 10)

const DISPATCHED_KEYS_STORAGE_KEY = 'packing_video_dispatched_keys_v1'
const RETRY_QUEUE_STORAGE_KEY = 'packing_video_retry_queue_v1'
const ENABLED_STORAGE_KEY = 'packing_video_enabled_v1'
const MAX_DISPATCHED_KEYS = 1000
const MAX_RETRY_QUEUE = 200

const inMemoryDispatchedKeys = new Set<string>()

function resolveDefaultHealthUrl(apiUrl: string) {
  try {
    const url = new URL(apiUrl)
    return `${url.origin}/api/status`
  } catch {
    return 'http://localhost:3001/api/status'
  }
}

function getSafeWindow() {
  if (typeof window === 'undefined') {
    return null
  }
  return window
}

function readJsonStorage<T>(key: string, fallback: T): T {
  const safeWindow = getSafeWindow()
  if (!safeWindow) return fallback

  try {
    const raw = safeWindow.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJsonStorage<T>(key: string, value: T) {
  const safeWindow = getSafeWindow()
  if (!safeWindow) return

  try {
    safeWindow.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 忽略存储失败，避免阻断打包主流程
  }
}

export function getPackVideoEnabledPreference(defaultValue = true): boolean {
  const stored = readJsonStorage<unknown>(ENABLED_STORAGE_KEY, defaultValue)
  if (typeof stored === 'boolean') {
    return stored
  }
  return defaultValue
}

export function setPackVideoEnabledPreference(enabled: boolean) {
  writeJsonStorage(ENABLED_STORAGE_KEY, enabled)
}

export async function checkPackVideoServiceConnection(timeoutMs = 2500): Promise<boolean> {
  if (!getSafeWindow()) {
    return false
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(PACK_VIDEO_HEALTH_URL, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    // 只要能收到响应，说明服务可连接
    return response.status > 0
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

function getDispatchedKeys(): string[] {
  return readJsonStorage<string[]>(DISPATCHED_KEYS_STORAGE_KEY, [])
}

function hasDispatchedKey(idempotencyKey: string): boolean {
  if (inMemoryDispatchedKeys.has(idempotencyKey)) {
    return true
  }
  const storageKeys = getDispatchedKeys()
  const exists = storageKeys.includes(idempotencyKey)
  if (exists) {
    inMemoryDispatchedKeys.add(idempotencyKey)
  }
  return exists
}

function markDispatchedKey(idempotencyKey: string) {
  inMemoryDispatchedKeys.add(idempotencyKey)
  const existing = getDispatchedKeys()
  const deduped = Array.from(new Set([...existing, idempotencyKey]))
  const trimmed = deduped.slice(Math.max(0, deduped.length - MAX_DISPATCHED_KEYS))
  writeJsonStorage(DISPATCHED_KEYS_STORAGE_KEY, trimmed)
}

function enqueueRetryItem(idempotencyKey: string, payload: PackGeneratePayload, errorMessage: string) {
  const queue = readJsonStorage<PackVideoRetryItem[]>(RETRY_QUEUE_STORAGE_KEY, [])
  const now = new Date().toISOString()
  const index = queue.findIndex((item) => item.idempotencyKey === idempotencyKey)

  if (index >= 0) {
    const existing = queue[index]
    queue[index] = {
      ...existing,
      payload,
      retryCount: existing.retryCount + 1,
      lastFailedAt: now,
      lastError: errorMessage,
    }
  } else {
    queue.push({
      idempotencyKey,
      payload,
      retryCount: 1,
      queuedAt: now,
      lastFailedAt: now,
      lastError: errorMessage,
    })
  }

  const trimmed = queue.slice(Math.max(0, queue.length - MAX_RETRY_QUEUE))
  writeJsonStorage(RETRY_QUEUE_STORAGE_KEY, trimmed)
}

function buildPayload(videoWindow: PackingVideoWindow): PackGeneratePayload {
  return {
    orderId: videoWindow.orderId,
    startTime: videoWindow.startTime,
    endTime: videoWindow.endTime,
    preSeconds: Number.isFinite(PACK_VIDEO_PRE_SECONDS) ? PACK_VIDEO_PRE_SECONDS : 10,
    postSeconds: Number.isFinite(PACK_VIDEO_POST_SECONDS) ? PACK_VIDEO_POST_SECONDS : 10,
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json() as { message?: string }
    if (data.message) return data.message
  } catch {
    // 忽略 JSON 解析失败，回退到 statusText
  }

  return response.statusText || `HTTP ${response.status}`
}

async function persistPackVideoTargets(orderId: string, responseData: PackGenerateResponse): Promise<void> {
  const jobId = typeof responseData.jobId === 'number'
    ? String(responseData.jobId)
    : typeof responseData.jobId === 'string'
      ? responseData.jobId.trim()
      : ''

  if (!jobId || !Array.isArray(responseData.uploadTargets) || responseData.uploadTargets.length === 0) {
    return
  }

  const normalizedTargets = responseData.uploadTargets.reduce<Array<{
    filename?: string
    objectKey?: string
    url: string
  }>>((acc, target) => {
      const url = target.url || target.uploadUrl || target.upload_url
      if (!url) {
        return acc
      }

      acc.push({
        filename: target.filename || target.fileName,
        objectKey: target.objectKey || target.object_key,
        url,
      })
      return acc
    }, [])

  if (normalizedTargets.length === 0) {
    return
  }

  const saveResponse = await fetch('/api/v1/packing/videos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId,
      jobId,
      status: responseData.status || 'queued',
      uploadTargets: normalizedTargets,
    }),
  })

  if (!saveResponse.ok) {
    const message = await readErrorMessage(saveResponse)
    throw new Error(`保存录像地址失败: ${message}`)
  }
}

export async function triggerPackVideoGeneration(videoWindows: PackingVideoWindow[]): Promise<PackVideoDispatchSummary> {
  if (!videoWindows || videoWindows.length === 0) {
    return {
      requested: 0,
      dispatched: 0,
      skipped: 0,
      failed: 0,
    }
  }

  let dispatched = 0
  let skipped = 0
  let failed = 0

  for (const videoWindow of videoWindows) {
    const idempotencyKey = `${videoWindow.orderId}:${videoWindow.endTime}`
    if (hasDispatchedKey(idempotencyKey)) {
      skipped += 1
      continue
    }

    const payload = buildPayload(videoWindow)

    try {
      const response = await fetch(PACK_VIDEO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const message = await readErrorMessage(response)
        throw new Error(message)
      }

      const responseData = await response.json() as PackGenerateResponse
      if (responseData.success === false) {
        throw new Error('录像服务返回失败状态')
      }

      await persistPackVideoTargets(videoWindow.orderId, responseData)

      markDispatchedKey(idempotencyKey)
      dispatched += 1
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.message : '调用本机录像服务失败'
      enqueueRetryItem(idempotencyKey, payload, message)
    }
  }

  return {
    requested: videoWindows.length,
    dispatched,
    skipped,
    failed,
  }
}
