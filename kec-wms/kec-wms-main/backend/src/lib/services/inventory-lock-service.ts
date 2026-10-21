/**
 * Inventory lock service
 * Centralizes Redis-backed lock handling for inventory-related resources.
 */

import { acquireLock, LockAcquisitionError, type LockOptions } from '@/lib/db/distributed-lock'

const LOCK_PREFIX = {
  BUCKET: 'inv:bucket',
  LOCATION: 'inv:loc',
  SKU: 'inv:sku',
  ORDER: 'inv:order',
  ALLOCATION: 'inv:alloc',
  SNAPSHOT: 'inv:snap',
} as const

const DEFAULT_LOCK_OPTIONS: LockOptions = {
  ttlMs: 30000,
  retryCount: 5,
  retryDelayMs: 100,
}

const LONG_LOCK_OPTIONS: LockOptions = {
  ttlMs: 60000,
  retryCount: 10,
  retryDelayMs: 200,
}

export interface BucketLockParams {
  tenantId: string
  warehouseId: string
  locationId: string
  skuId: string
  batchNumber?: string | null
  lpn?: string | null
  asnNumber?: string | null
  expiryDate?: Date | string | null
  bucketType: string
}

export type InventoryLockResource =
  | {
      type: 'BUCKET'
      params: BucketLockParams
    }
  | {
      type: 'LOCATION'
      tenantId: string
      locationId: string
    }
  | {
      type: 'SKU'
      tenantId: string
      warehouseId: string
      skuId: string
    }
  | {
      type: 'ORDER'
      tenantId: string
      orderId: string
    }
  | {
      type: 'ALLOCATION'
      tenantId: string
      orderId: string
    }

function normalizeLockDate(date: Date | string | null | undefined): string {
  if (!date) return '_'
  const normalized = date instanceof Date ? new Date(date) : new Date(date)
  if (isNaN(normalized.getTime())) return '_'
  normalized.setMilliseconds(0)
  return normalized.toISOString()
}

export function getBucketLockKey(params: BucketLockParams): string {
  const {
    tenantId,
    warehouseId,
    locationId,
    skuId,
    batchNumber,
    lpn,
    asnNumber,
    expiryDate,
    bucketType,
  } = params

  const batch = batchNumber || '_'
  const container = lpn || '_'
  const asn = asnNumber || '_'
  const expiry = normalizeLockDate(expiryDate)

  return `${tenantId}:${warehouseId}:${locationId}:${skuId}:${batch}:${container}:${asn}:${expiry}:${bucketType}`
}

export function getLocationLockKey(tenantId: string, locationId: string): string {
  return `${tenantId}:${locationId}`
}

export function getSkuLockKey(tenantId: string, warehouseId: string, skuId: string): string {
  return `${tenantId}:${warehouseId}:${skuId}`
}

export function getOrderLockKey(tenantId: string, orderId: string): string {
  return `${tenantId}:${orderId}`
}

export function getAllocationLockKey(tenantId: string, orderId: string): string {
  return `${tenantId}:${orderId}`
}

export function getSnapshotLockKey(tenantId: string, warehouseId: string): string {
  return `${tenantId}:${warehouseId}`
}

function resolveInventoryLock(resource: InventoryLockResource): { prefix: string; key: string } {
  switch (resource.type) {
    case 'BUCKET':
      return {
        prefix: LOCK_PREFIX.BUCKET,
        key: getBucketLockKey(resource.params),
      }
    case 'LOCATION':
      return {
        prefix: LOCK_PREFIX.LOCATION,
        key: getLocationLockKey(resource.tenantId, resource.locationId),
      }
    case 'SKU':
      return {
        prefix: LOCK_PREFIX.SKU,
        key: getSkuLockKey(resource.tenantId, resource.warehouseId, resource.skuId),
      }
    case 'ORDER':
      return {
        prefix: LOCK_PREFIX.ORDER,
        key: getOrderLockKey(resource.tenantId, resource.orderId),
      }
    case 'ALLOCATION':
      return {
        prefix: LOCK_PREFIX.ALLOCATION,
        key: getAllocationLockKey(resource.tenantId, resource.orderId),
      }
  }
}

function sortInventoryResources(resources: InventoryLockResource[]) {
  const deduped = new Map<string, { prefix: string; key: string }>()

  for (const resource of resources) {
    const resolved = resolveInventoryLock(resource)
    const dedupeKey = `${resolved.prefix}:${resolved.key}`
    if (!deduped.has(dedupeKey)) {
      deduped.set(dedupeKey, resolved)
    }
  }

  return [...deduped.values()].sort((a, b) => {
    const left = `${a.prefix}:${a.key}`
    const right = `${b.prefix}:${b.key}`
    return left.localeCompare(right)
  })
}

export function bucketResource(params: BucketLockParams): InventoryLockResource {
  return { type: 'BUCKET', params }
}

export async function acquireInventoryLocks(
  resources: InventoryLockResource[],
  options: LockOptions = DEFAULT_LOCK_OPTIONS
) {
  const sortedResources = sortInventoryResources(resources)
  const locks: Array<{ prefix: string; key: string; release: () => Promise<boolean> }> = []

  try {
    for (const item of sortedResources) {
      const lock = await acquireLock(item.key, { ...options, prefix: item.prefix })
      if (!lock.acquired) {
        for (const acquired of [...locks].reverse()) {
          await acquired.release()
        }
        throw new LockAcquisitionError(`${item.prefix}:${item.key}`)
      }
      locks.push({ prefix: item.prefix, key: item.key, release: lock.release })
    }

    return {
      acquired: true,
      locks,
      releaseAll: async () => {
        for (const lock of [...locks].reverse()) {
          await lock.release()
        }
      },
    }
  } catch (error) {
    for (const lock of [...locks].reverse()) {
      await lock.release()
    }
    throw error
  }
}

export async function withInventoryLocks<T>(
  resources: InventoryLockResource[],
  fn: () => Promise<T>,
  options: LockOptions = DEFAULT_LOCK_OPTIONS
): Promise<T> {
  const result = await acquireInventoryLocks(resources, options)

  try {
    return await fn()
  } finally {
    await result.releaseAll()
  }
}

export async function acquireBucketLock(params: BucketLockParams) {
  const key = getBucketLockKey(params)
  return acquireLock(key, { ...DEFAULT_LOCK_OPTIONS, prefix: LOCK_PREFIX.BUCKET })
}

export async function acquireLocationLock(tenantId: string, locationId: string) {
  const key = getLocationLockKey(tenantId, locationId)
  return acquireLock(key, { ...DEFAULT_LOCK_OPTIONS, prefix: LOCK_PREFIX.LOCATION })
}

export async function acquireSkuLock(tenantId: string, warehouseId: string, skuId: string) {
  const key = getSkuLockKey(tenantId, warehouseId, skuId)
  return acquireLock(key, { ...DEFAULT_LOCK_OPTIONS, prefix: LOCK_PREFIX.SKU })
}

export async function acquireOrderLock(tenantId: string, orderId: string) {
  const key = getOrderLockKey(tenantId, orderId)
  return acquireLock(key, { ...LONG_LOCK_OPTIONS, prefix: LOCK_PREFIX.ORDER })
}

export async function acquireAllocationLock(tenantId: string, orderId: string) {
  const key = getAllocationLockKey(tenantId, orderId)
  return acquireLock(key, { ...LONG_LOCK_OPTIONS, prefix: LOCK_PREFIX.ALLOCATION })
}

export async function withBucketLock<T>(
  params: BucketLockParams,
  fn: () => Promise<T>
): Promise<T> {
  return withInventoryLocks([bucketResource(params)], fn, DEFAULT_LOCK_OPTIONS)
}

export async function withLocationLock<T>(
  tenantId: string,
  locationId: string,
  fn: () => Promise<T>
): Promise<T> {
  return withInventoryLocks([{ type: 'LOCATION', tenantId, locationId }], fn, DEFAULT_LOCK_OPTIONS)
}

export async function withSkuLock<T>(
  tenantId: string,
  warehouseId: string,
  skuId: string,
  fn: () => Promise<T>
): Promise<T> {
  return withInventoryLocks([{ type: 'SKU', tenantId, warehouseId, skuId }], fn, DEFAULT_LOCK_OPTIONS)
}

export async function withOrderLock<T>(
  tenantId: string,
  orderId: string,
  fn: () => Promise<T>
): Promise<T> {
  return withInventoryLocks([{ type: 'ORDER', tenantId, orderId }], fn, LONG_LOCK_OPTIONS)
}

export async function withAllocationLock<T>(
  tenantId: string,
  orderId: string,
  fn: () => Promise<T>
): Promise<T> {
  return withInventoryLocks([{ type: 'ALLOCATION', tenantId, orderId }], fn, LONG_LOCK_OPTIONS)
}

export async function acquireMultipleBucketLocks(buckets: BucketLockParams[]) {
  return acquireInventoryLocks(
    buckets.map((params) => bucketResource(params)),
    DEFAULT_LOCK_OPTIONS
  )
}

export async function withMultipleBucketLocks<T>(
  buckets: BucketLockParams[],
  fn: () => Promise<T>
): Promise<T> {
  return withInventoryLocks(
    buckets.map((params) => bucketResource(params)),
    fn,
    DEFAULT_LOCK_OPTIONS
  )
}

export { LockAcquisitionError }
