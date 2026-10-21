import { z } from 'zod'

// ==================== 枚举常量 ====================

// 库存状态
export const InventoryStatus = {
  AVAILABLE: 'AVAILABLE',
  HOLD: 'HOLD',
  DAMAGED: 'DAMAGED',
  EXPIRED: 'EXPIRED',
  QUARANTINE: 'QUARANTINE',
  QC_PENDING: 'QC_PENDING',
  RETURN: 'RETURN',
} as const

// 锁定状态
export const LockStatus = {
  UNLOCKED: 'UNLOCKED',
  LOCKED: 'LOCKED',
} as const

// 事务类型
export const TransactionType = {
  RECEIVE: 'RECEIVE',
  PUTAWAY: 'PUTAWAY',
  PICK: 'PICK',
  PACK: 'PACK',
  SHIP: 'SHIP',
  TRANSFER: 'TRANSFER',
  ADJUST_IN: 'ADJUST_IN',
  ADJUST_OUT: 'ADJUST_OUT',
  COUNT_IN: 'COUNT_IN',
  COUNT_OUT: 'COUNT_OUT',
  RETURN_IN: 'RETURN_IN',
  RETURN_OUT: 'RETURN_OUT',
  FREEZE: 'FREEZE',
  UNFREEZE: 'UNFREEZE',
  DAMAGE: 'DAMAGE',
  SCRAP: 'SCRAP',
  REPLENISH: 'REPLENISH',
  RELEASE_ALLOCATION: 'RELEASE_ALLOCATION', // 释放分配
} as const

// 分配状态
export const AllocationStatus = {
  ALLOCATED: 'ALLOCATED',
  PICKING: 'PICKING',
  PICKED: 'PICKED',
  RELEASED: 'RELEASED',
  CANCELLED: 'CANCELLED',
} as const

// 调整类型
export const AdjustmentType = {
  QUANTITY_ADJUST: 'QUANTITY_ADJUST', // 数量调整
  LOCATION_ADJUST: 'LOCATION_ADJUST', // 库位调整
  QUALITY_ADJUST: 'QUALITY_ADJUST',   // 质量调整
} as const

// 调整状态
export const AdjustmentStatus = {
  DRAFT: 'DRAFT',
  EXECUTED: 'EXECUTED',
  CANCELLED: 'CANCELLED',
} as const

// ==================== WM库存验证 Schema ====================

// WM库存列表查询
export const inventoryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  zoneId: z.string().uuid().nullish().transform(v => v ?? undefined),
  locationId: z.string().uuid().nullish().transform(v => v ?? undefined),
  skuCode: z.string().max(64).nullish().transform(v => v ?? undefined),
  batchNumber: z.string().max(64).nullish().transform(v => v ?? undefined),
  lockStatus: z.enum([LockStatus.UNLOCKED, LockStatus.LOCKED]).nullish().transform(v => v ?? undefined),
  search: z.string().max(100).nullish().transform(v => v ?? undefined),
  sortBy: z.enum(['createdAt', 'updatedAt', 'skuCode', 'quantityAvailable', 'expiryDate']).nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// ==================== IM库存汇总验证 Schema ====================

// IM库存汇总列表查询
export const inventorySummaryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  skuCode: z.string().max(64).nullish().transform(v => v ?? undefined),
  search: z.string().max(100).nullish().transform(v => v ?? undefined),
  hasAvailable: z.coerce.boolean().nullish().transform(v => v ?? undefined),
  hasReserved: z.coerce.boolean().nullish().transform(v => v ?? undefined),
  hasFrozen: z.coerce.boolean().nullish().transform(v => v ?? undefined),
  sortBy: z.enum(['createdAt', 'updatedAt', 'skuCode', 'quantityAvailable', 'totalOnHand']).nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// ==================== 库存事务验证 Schema ====================

// 库存事务列表查询
export const inventoryTransactionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  skuId: z.string().uuid().nullish().transform(v => v ?? undefined),
  transactionType: z.string().max(32).nullish().transform(v => v ?? undefined),
  startDate: z.string().datetime().nullish().transform(v => v ?? undefined),
  endDate: z.string().datetime().nullish().transform(v => v ?? undefined),
  referenceType: z.string().max(32).nullish().transform(v => v ?? undefined),
  referenceNumber: z.string().max(64).nullish().transform(v => v ?? undefined),
  sortBy: z.enum(['transactionDate', 'createdAt']).nullish().transform(v => v ?? 'transactionDate'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// ==================== 类型导出 ====================

export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>
export type InventorySummaryListQuery = z.infer<typeof inventorySummaryListQuerySchema>
export type InventoryTransactionListQuery = z.infer<typeof inventoryTransactionListQuerySchema>

// ==================== 库存调整验证 Schema ====================

// 调整单列表查询
export const adjustmentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  status: z.enum([
    AdjustmentStatus.DRAFT,
    AdjustmentStatus.EXECUTED,
    AdjustmentStatus.CANCELLED,
  ]).nullish().transform(v => v ?? undefined),
  adjustmentType: z.enum([
    AdjustmentType.QUANTITY_ADJUST,
    AdjustmentType.LOCATION_ADJUST,
    AdjustmentType.QUALITY_ADJUST,
  ]).nullish().transform(v => v ?? undefined),
  search: z.string().max(100).nullish().transform(v => v ?? undefined),
  sortBy: z.enum(['createdAt', 'updatedAt', 'adjustmentNumber']).nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 创建调整单
export const createAdjustmentSchema = z.object({
  warehouseId: z.string().uuid('仓库ID格式错误'),
  adjustmentType: z.enum([
    AdjustmentType.QUANTITY_ADJUST,
    AdjustmentType.LOCATION_ADJUST,
    AdjustmentType.QUALITY_ADJUST,
  ], { errorMap: () => ({ message: '调整类型必须是 QUANTITY_ADJUST、LOCATION_ADJUST 或 QUALITY_ADJUST' }) }),
  reason: z.string().min(1, '调整原因不能为空').max(500, '调整原因不能超过500字符'),
  lines: z.array(z.object({
    inventoryId: z.string().uuid('库存ID格式错误').optional(),
    skuId: z.string().uuid('SKU ID格式错误'),
    locationId: z.string().uuid('库位ID格式错误').optional(),
    batchNumber: z.string().max(64, '批次号不能超过64字符').optional(),
    lpn: z.string().max(64, 'LPN不能超过64字符').optional(),
    asnNumber: z.string().max(64, 'ASN号不能超过64字符').optional(),
    expiryDate: z.string().datetime('到期日期格式错误').optional(),
    productionDate: z.string().datetime('生产日期格式错误').optional(),
    bucketType: z.string().max(32, '桶类型不能超过32字符').optional(),
    fromBucketType: z.string().max(32, '原桶类型不能超过32字符').optional(),
    toBucketType: z.string().max(32, '目标桶类型不能超过32字符').optional(),
    fromLocationId: z.string().uuid('原库位ID格式错误').optional(),
    fromLocationCode: z.string().max(32, '原库位编码不能超过32字符').optional(),
    toLocationId: z.string().uuid('目标库位ID格式错误').optional(),
    toLocationCode: z.string().max(32, '目标库位编码不能超过32字符').optional(),
    adjustQuantity: z.number().int('调整数量必须是整数'),
    reason: z.string().max(500, '调整原因不能超过500字符').optional(),
  })).min(1, '至少需要一条调整明细'),
}).superRefine((data, ctx) => {
  // 根据调整类型验证必填字段
  data.lines.forEach((line, index) => {
    if (data.adjustmentType === AdjustmentType.QUANTITY_ADJUST) {
      // 数量调整：必须有 locationId 和 bucketType
      if (!line.locationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '数量调整必须指定库位ID',
          path: ['lines', index, 'locationId'],
        })
      }
      if (!line.bucketType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '数量调整必须指定桶类型',
          path: ['lines', index, 'bucketType'],
        })
      }
    } else if (data.adjustmentType === AdjustmentType.LOCATION_ADJUST) {
      // 库位调整：必须有 fromLocationId、toLocationId 和 bucketType
      if (!line.fromLocationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '库位调整必须指定原库位ID',
          path: ['lines', index, 'fromLocationId'],
        })
      }
      if (!line.toLocationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '库位调整必须指定目标库位ID',
          path: ['lines', index, 'toLocationId'],
        })
      }
      if (!line.bucketType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '库位调整必须指定桶类型',
          path: ['lines', index, 'bucketType'],
        })
      }
      // 验证原库位和目标库位不能相同
      if (line.fromLocationId && line.toLocationId && line.fromLocationId === line.toLocationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '原库位和目标库位不能相同',
          path: ['lines', index, 'toLocationId'],
        })
      }
    } else if (data.adjustmentType === AdjustmentType.QUALITY_ADJUST) {
      // 质量调整：必须有 locationId、fromBucketType 和 toBucketType
      if (!line.locationId && !line.fromLocationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '质量调整必须指定库位',
          path: ['lines', index, 'locationId'],
        })
      }
      if (!line.fromBucketType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '质量调整必须指定原桶类型',
          path: ['lines', index, 'fromBucketType'],
        })
      }
      if (!line.toBucketType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '质量调整必须指定目标桶类型',
          path: ['lines', index, 'toBucketType'],
        })
      }
      // 验证原桶类型和目标桶类型不能相同
      if (line.fromBucketType && line.toBucketType && line.fromBucketType === line.toBucketType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '原桶类型和目标桶类型不能相同',
          path: ['lines', index, 'toBucketType'],
        })
      }
      // 验证不能调整到系统流程桶
      const forbiddenTargetTypes = ['ALLOCATED', 'PICKING', 'COUNT_HOLD', 'COUNT_SURPLUS', 'COUNT_SHORTAGE']
      if (line.toBucketType && forbiddenTargetTypes.includes(line.toBucketType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `不能将库存调整到 ${line.toBucketType} 状态`,
          path: ['lines', index, 'toBucketType'],
        })
      }
    }

    // 验证调整数量
    if (data.adjustmentType === AdjustmentType.QUANTITY_ADJUST) {
      // 数量调整可以是正数或负数，但不能为0
      if (line.adjustQuantity === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '调整数量不能为0',
          path: ['lines', index, 'adjustQuantity'],
        })
      }
    } else {
      // 库位调整和质量调整必须是正数
      if (line.adjustQuantity <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '调整数量必须大于0',
          path: ['lines', index, 'adjustQuantity'],
        })
      }
    }
  })
})

// 更新调整单
export const updateAdjustmentSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
  lines: z.array(z.object({
    id: z.string().uuid().optional(),
    inventoryId: z.string().uuid().optional(),
    skuId: z.string().uuid(),
    locationId: z.string().uuid().optional(),
    batchNumber: z.string().max(64).optional(),
    lpn: z.string().max(64).optional(),
    asnNumber: z.string().max(64).optional(),
    expiryDate: z.string().datetime().optional(),
    productionDate: z.string().datetime().optional(),
    bucketType: z.string().max(32).optional(),
    fromBucketType: z.string().max(32).optional(),
    toBucketType: z.string().max(32).optional(),
    fromLocationId: z.string().uuid().optional(),
    fromLocationCode: z.string().max(32).optional(),
    toLocationId: z.string().uuid().optional(),
    toLocationCode: z.string().max(32).optional(),
    adjustQuantity: z.number().int(),
    reason: z.string().max(500).optional(),
  })).min(1).optional(),
})

export type AdjustmentListQuery = z.infer<typeof adjustmentListQuerySchema>
export type CreateAdjustment = z.infer<typeof createAdjustmentSchema>
export type UpdateAdjustment = z.infer<typeof updateAdjustmentSchema>

// ==================== 库存转移验证 Schema ====================

// 转移类型
export const TransferType = {
  BIN_TRANSFER: 'BIN_TRANSFER',       // 库位转移
  STATUS_TRANSFER: 'STATUS_TRANSFER', // 状态转移
} as const

// 转移状态
export const TransferStatus = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  IN_TRANSIT: 'IN_TRANSIT',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

// 转移单列表查询
export const transferListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  status: z.enum([
    TransferStatus.DRAFT,
    TransferStatus.PENDING,
    TransferStatus.APPROVED,
    TransferStatus.REJECTED,
    TransferStatus.IN_TRANSIT,
    TransferStatus.COMPLETED,
    TransferStatus.CANCELLED,
  ]).nullish().transform(v => v ?? undefined),
  transferType: z.enum([
    TransferType.BIN_TRANSFER,
    TransferType.STATUS_TRANSFER,
  ]).nullish().transform(v => v ?? undefined),
  search: z.string().max(100).nullish().transform(v => v ?? undefined),
  sortBy: z.enum(['createdAt', 'updatedAt', 'transferNumber']).nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 创建转移单
export const createTransferSchema = z.object({
  warehouseId: z.string().uuid(),
  transferType: z.enum([
    TransferType.BIN_TRANSFER,
    TransferType.STATUS_TRANSFER,
  ]),
  reason: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
  lines: z.array(z.object({
    skuId: z.string().uuid(),
    sourceLocationId: z.string().uuid(),
    targetLocationId: z.string().uuid(),
    batchNumber: z.string().max(64).optional(),
    quantity: z.number().int().positive(),
    reason: z.string().max(500).optional(),
  })).min(1),
})

// 更新转移单
export const updateTransferSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
  notes: z.string().max(1000).optional(),
  lines: z.array(z.object({
    id: z.string().uuid().optional(),
    skuId: z.string().uuid(),
    sourceLocationId: z.string().uuid(),
    targetLocationId: z.string().uuid(),
    batchNumber: z.string().max(64).optional(),
    quantity: z.number().int().positive(),
    reason: z.string().max(500).optional(),
  })).min(1).optional(),
})

export type TransferListQuery = z.infer<typeof transferListQuerySchema>
export type CreateTransfer = z.infer<typeof createTransferSchema>
export type UpdateTransfer = z.infer<typeof updateTransferSchema>

// ==================== 库存冻结验证 Schema ====================

// 冻结类型
export const FreezeType = {
  QC_HOLD: 'QC_HOLD',           // 质量冻结
  DEFECTIVE_HOLD: 'DEFECTIVE_HOLD', // 不良品冻结
  EXPIRY_HOLD: 'EXPIRY_HOLD',   // 过期冻结
  RECALL_HOLD: 'RECALL_HOLD',   // 召回冻结
  COUNT_HOLD: 'COUNT_HOLD',     // 盘点冻结
  MANUAL_HOLD: 'MANUAL_HOLD',   // 手动冻结
} as const

// 冻结状态
export const FreezeStatus = {
  FROZEN: 'FROZEN',
  RELEASED: 'RELEASED',
} as const

// 冻结单列表查询
export const freezeListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  status: z.enum([
    FreezeStatus.FROZEN,
    FreezeStatus.RELEASED,
  ]).nullish().transform(v => v ?? undefined),
  freezeType: z.enum([
    FreezeType.QC_HOLD,
    FreezeType.DEFECTIVE_HOLD,
    FreezeType.EXPIRY_HOLD,
    FreezeType.RECALL_HOLD,
    FreezeType.COUNT_HOLD,
    FreezeType.MANUAL_HOLD,
  ]).nullish().transform(v => v ?? undefined),
  search: z.string().max(100).nullish().transform(v => v ?? undefined),
  sortBy: z.enum(['createdAt', 'updatedAt', 'freezeNumber']).nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 创建冻结单
export const createFreezeSchema = z.object({
  warehouseId: z.string().uuid(),
  freezeType: z.enum([
    FreezeType.QC_HOLD,
    FreezeType.DEFECTIVE_HOLD,
    FreezeType.EXPIRY_HOLD,
    FreezeType.RECALL_HOLD,
    FreezeType.COUNT_HOLD,
    FreezeType.MANUAL_HOLD,
  ]),
  reason: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
  lines: z.array(z.object({
    inventoryId: z.string().uuid().optional(),
    skuId: z.string().uuid(),
    locationId: z.string().uuid(),
    batchNumber: z.string().max(64).optional(),
    lpn: z.string().max(64).optional(),
    asnNumber: z.string().max(64).optional(),
    expiryDate: z.string().datetime().optional(),
    quantity: z.number().int().positive(),
    reason: z.string().max(500).optional(),
  })).min(1),
})

// 解冻请求
export const releaseFreezeSchema = z.object({
  releaseType: z.enum(['RELEASE', 'TO_DEFECTIVE', 'SCRAP']),
  quantity: z.number().int().positive().optional(),
  reason: z.string().min(1).max(500),
})

export type FreezeListQuery = z.infer<typeof freezeListQuerySchema>
export type CreateFreeze = z.infer<typeof createFreezeSchema>
export type ReleaseFreeze = z.infer<typeof releaseFreezeSchema>

// ==================== 库存预警验证 Schema ====================

// 预警类型
export const AlertType = {
  OUT_OF_STOCK: 'OUT_OF_STOCK',   // 缺货
  LOW_STOCK: 'LOW_STOCK',         // 低库存
  NEAR_EXPIRY: 'NEAR_EXPIRY',     // 临期
  EXPIRED: 'EXPIRED',             // 过期
  OVERSTOCK: 'OVERSTOCK',         // 积压
  SLOW_MOVING: 'SLOW_MOVING',     // 呆滞
} as const

// 预警级别
export const AlertSeverity = {
  CRITICAL: 'CRITICAL',   // 紧急
  WARNING: 'WARNING',     // 高
  INFO: 'INFO',           // 中
  LOW: 'LOW',             // 低
} as const

// 预警状态
export const AlertStatus = {
  ACTIVE: 'ACTIVE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
} as const

// 预警列表查询
export const alertListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  warehouseId: z.string().uuid().nullish().transform(v => v ?? undefined),
  status: z.enum([
    AlertStatus.ACTIVE,
    AlertStatus.ACKNOWLEDGED,
    AlertStatus.RESOLVED,
  ]).nullish().transform(v => v ?? undefined),
  alertType: z.enum([
    AlertType.OUT_OF_STOCK,
    AlertType.LOW_STOCK,
    AlertType.NEAR_EXPIRY,
    AlertType.EXPIRED,
    AlertType.OVERSTOCK,
    AlertType.SLOW_MOVING,
  ]).nullish().transform(v => v ?? undefined),
  severity: z.enum([
    AlertSeverity.CRITICAL,
    AlertSeverity.WARNING,
    AlertSeverity.INFO,
    AlertSeverity.LOW,
  ]).nullish().transform(v => v ?? undefined),
  search: z.string().max(100).nullish().transform(v => v ?? undefined),
  sortBy: z.enum(['createdAt', 'severity', 'alertType']).nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

export type AlertListQuery = z.infer<typeof alertListQuerySchema>
