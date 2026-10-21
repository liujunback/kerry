/**
 * Worker 初始化
 */

import { QUEUE_NAMES, QUEUE_CONFIG } from '../config'
import { InventoryAllocationWorker } from './inventory-allocation.worker'
import { InventorySnapshotWorker } from './inventory-snapshot.worker'
import { InventoryCountScopeWorker } from './inventory-count-scope.worker'
import { WaveStrategyExecuteWorker } from './wave-strategy-execute.worker'
import { WaveReleaseWorker } from './wave-release.worker'
import { ReportExportWorker } from './report-export.worker'
import { DataUploadWorker } from './data-upload.worker'
import { ShipmentStatusPushWorker } from './shipment-status-push.worker'
import { InventoryEventPushWorker } from './inventory-event-push.worker'

let workers: Array<{ close: () => Promise<void> }> = []
let initialized = false

/**
 * 初始化所有 Worker
 */
export function initializeWorkers(): void {
  if (initialized) {
    console.log('[Queue] Workers 已初始化，跳过')
    return
  }

  const config = QUEUE_CONFIG.queues

  workers = [
    new InventoryAllocationWorker(
      QUEUE_NAMES.INVENTORY_ALLOCATION,
      config[QUEUE_NAMES.INVENTORY_ALLOCATION].concurrency
    ),
    new InventorySnapshotWorker(
      QUEUE_NAMES.INVENTORY_SNAPSHOT,
      config[QUEUE_NAMES.INVENTORY_SNAPSHOT].concurrency
    ),
    new InventoryCountScopeWorker(
      QUEUE_NAMES.INVENTORY_COUNT_SCOPE,
      config[QUEUE_NAMES.INVENTORY_COUNT_SCOPE].concurrency
    ),
    new WaveStrategyExecuteWorker(
      QUEUE_NAMES.WAVE_STRATEGY_EXECUTE,
      config[QUEUE_NAMES.WAVE_STRATEGY_EXECUTE].concurrency
    ),
    new WaveReleaseWorker(
      QUEUE_NAMES.WAVE_RELEASE,
      config[QUEUE_NAMES.WAVE_RELEASE].concurrency
    ),
    new ReportExportWorker(
      QUEUE_NAMES.REPORT_EXPORT,
      config[QUEUE_NAMES.REPORT_EXPORT].concurrency
    ),
    new DataUploadWorker(
      QUEUE_NAMES.DATA_UPLOAD,
      config[QUEUE_NAMES.DATA_UPLOAD].concurrency
    ),
    new ShipmentStatusPushWorker(
      QUEUE_NAMES.SHIPMENT_STATUS_PUSH,
      config[QUEUE_NAMES.SHIPMENT_STATUS_PUSH].concurrency
    ),
    new InventoryEventPushWorker(
      QUEUE_NAMES.INVENTORY_EVENT_PUSH,
      config[QUEUE_NAMES.INVENTORY_EVENT_PUSH].concurrency
    ),
  ]

  initialized = true
  console.log('[Queue] 所有 Workers 已初始化')
}

/**
 * 关闭所有 Worker
 */
export async function shutdownWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close()))
  workers = []
  initialized = false
  console.log('[Queue] 所有 Workers 已关闭')
}

/**
 * 检查 Worker 是否已初始化
 */
export function isWorkersInitialized(): boolean {
  return initialized
}
