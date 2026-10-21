import { z } from 'zod'
import { addressSchema, addressUpdateSchema } from './address'

// ==================== 枚举定义 ====================

// 订单类型枚举
export const OrderType = {
  STANDARD: 'STANDARD',
  EXPRESS: 'EXPRESS',
  B2B: 'B2B',
  TRANSFER: 'TRANSFER',
  SAMPLE: 'SAMPLE',
  RETURN_TO_VENDOR: 'RETURN_TO_VENDOR',
} as const

// 订单来源枚举
export const OrderSource = {
  MANUAL: 'MANUAL',
  API: 'API',
  IMPORT: 'IMPORT',
  PLATFORM: 'PLATFORM',
} as const

// 订单状态枚举
export const OrderStatus = {
  PENDING: 'PENDING',
  ALLOCATED: 'ALLOCATED',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  PENDING_PICK: 'PENDING_PICK',
  PICKING: 'PICKING',
  PICKED: 'PICKED',
  SORTING: 'SORTING',
  SORTED: 'SORTED',
  PACKING: 'PACKING',
  PACKED: 'PACKED',
  CHECKOUT_PENDING: 'CHECKOUT_PENDING',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD',
  EXCEPTION: 'EXCEPTION',
} as const

// 波次类型枚举
export const WaveType = {
  STANDARD: 'STANDARD',
  EXPRESS: 'EXPRESS',
  BATCH: 'BATCH',
  SINGLE: 'SINGLE',
} as const

// 波次状态枚举
export const WaveStatus = {
  CREATED: 'CREATED',
  RELEASED: 'RELEASED',
  PICKING: 'PICKING',
  PICKED: 'PICKED',
  SORTING: 'SORTING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const

// 拣货策略枚举
export const PickStrategy = {
  ORDER: 'ORDER',
  BATCH: 'BATCH',
  ZONE: 'ZONE',
  CLUSTER: 'CLUSTER',
} as const

// 拣货任务状态枚举
export const PickTaskStatus = {
  PENDING: 'PENDING',
  PICKING: 'PICKING',
  PICKED: 'PICKED',
  CANCELLED: 'CANCELLED',
} as const

// 拣货明细状态枚举
export const PickTaskLineStatus = {
  PENDING: 'PENDING',
  PICKED: 'PICKED',
  PACKED: 'PACKED',
  CHECKED_OUT: 'CHECKED_OUT',
  EXCEPTION: 'EXCEPTION',
  CANCELLED: 'CANCELLED',
} as const

// 发货状态枚举
export const ShipmentStatus = {
  CREATED: 'CREATED',
  LABEL_PRINTED: 'LABEL_PRINTED',
  READY: 'READY',
  SHIPPED: 'SHIPPED',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  EXCEPTION: 'EXCEPTION',
  RETURNED: 'RETURNED',
} as const

// 优先级枚举
export const Priority = {
  URGENT: 'URGENT',
  HIGH: 'HIGH',
  NORMAL: 'NORMAL',
  LOW: 'LOW',
} as const

// ==================== 出库订单 Schema ====================

// 创建出库订单 Schema
export const createOutboundOrderSchema = z.object({
  clientId: z.string().uuid('客户ID格式错误'),
  warehouseId: z.string().uuid('仓库ID格式错误'),
  orderNumber: z
    .string()
    .min(1, '订单号不能为空')
    .max(32, '订单号最多32个字符')
    .optional(),
  referenceNumber: z.string().max(64, '参考号最多64个字符').optional().nullable(),
  platformOrderNumber: z.string().max(64, '平台订单号最多64个字符').optional().nullable(),
  orderType: z
    .enum(['STANDARD', 'EXPRESS', 'B2B', 'TRANSFER', 'SAMPLE', 'RETURN_TO_VENDOR'], {
      errorMap: () => ({ message: '无效的订单类型' }),
    })
    .default('STANDARD'),
  orderSource: z
    .enum(['MANUAL', 'API', 'IMPORT', 'PLATFORM'], {
      errorMap: () => ({ message: '无效的订单来源' }),
    })
    .default('MANUAL'),
  priority: z
    .enum(['URGENT', 'HIGH', 'NORMAL', 'LOW'], {
      errorMap: () => ({ message: '无效的优先级' }),
    })
    .default('NORMAL'),
  address: addressSchema,
  shippingMethod: z.string().max(64, '配送方式最多64个字符').optional().nullable(),
  expectedShipDate: z.coerce.date().optional().nullable(),
  expectedDeliveryDate: z.coerce.date().optional().nullable(),
  expectedOutboundTime: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  config: z.record(z.unknown()).optional().default({}),
  lines: z
    .array(
      z.object({
        skuId: z.string().uuid('SKU ID格式错误'),
        skuCode: z.string().min(1, 'SKU编码不能为空').max(64, 'SKU编码最多64个字符'),
        skuName: z.string().max(256, 'SKU名称最多256个字符').optional().nullable(),
        orderedQty: z.coerce.number().int().positive('订购数量必须为正整数'),
        uomId: z.string().uuid('单位ID格式错误').optional().nullable(),
        uomCode: z.string().max(32, '单位编码最多32个字符').optional().nullable(),
        unitPrice: z.coerce.number().nonnegative('单价不能为负数').optional().nullable(),
        batchNumber: z.string().max(64, '批次号最多64个字符').optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .optional()
    .default([]),
})

// 更新出库订单 Schema
export const updateOutboundOrderSchema = z.object({
  referenceNumber: z.string().max(64, '参考号最多64个字符').optional().nullable(),
  platformOrderNumber: z.string().max(64, '平台订单号最多64个字符').optional().nullable(),
  orderType: z
    .enum(['STANDARD', 'EXPRESS', 'B2B', 'TRANSFER', 'SAMPLE', 'RETURN_TO_VENDOR'], {
      errorMap: () => ({ message: '无效的订单类型' }),
    })
    .optional(),
  priority: z
    .enum(['URGENT', 'HIGH', 'NORMAL', 'LOW'], {
      errorMap: () => ({ message: '无效的优先级' }),
    })
    .optional(),
  address: addressUpdateSchema.optional(),
  shippingMethod: z.string().max(64, '配送方式最多64个字符').optional().nullable(),
  expectedShipDate: z.coerce.date().optional().nullable(),
  expectedDeliveryDate: z.coerce.date().optional().nullable(),
  expectedOutboundTime: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  config: z.record(z.unknown()).optional(),
})

// 出库订单列表查询参数 Schema
export const outboundOrderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform((v) => v ?? undefined),
  status: z
    .enum([
      'PENDING', 'ALLOCATED', 'OUT_OF_STOCK', 'PENDING_PICK',
      'PICKING', 'PICKED', 'SORTING', 'SORTED', 'PACKING', 'PACKED',
      'CHECKOUT_PENDING', 'CHECKED_OUT', 'CANCELLED', 'ON_HOLD', 'EXCEPTION',
    ])
    .nullish()
    .transform((v) => v ?? undefined),
  orderType: z
    .enum(['STANDARD', 'EXPRESS', 'B2B', 'TRANSFER', 'SAMPLE', 'RETURN_TO_VENDOR'])
    .nullish()
    .transform((v) => v ?? undefined),
  orderStructureType: z
    .enum(['SINGLE_ITEM_SINGLE', 'SINGLE_ITEM_MULTI', 'MULTI_ITEM'])
    .nullish()
    .transform((v) => v ?? undefined),
  clientId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  warehouseId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  waveId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL', 'LOW']).nullish().transform((v) => v ?? undefined),
  expectedShipDateFrom: z.coerce.date().nullish().transform((v) => v ?? undefined),
  expectedShipDateTo: z.coerce.date().nullish().transform((v) => v ?? undefined),
  createdAtFrom: z.coerce.date().nullish().transform((v) => v ?? undefined),
  createdAtTo: z.coerce.date().nullish().transform((v) => v ?? undefined),
  sortBy: z.string().nullish().transform((v) => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform((v) => v ?? 'desc'),
  // 新增筛选参数
  orderSource: z.enum(['MANUAL', 'API', 'IMPORT', 'PLATFORM']).nullish().transform((v) => v ?? undefined),
  platform: z.string().nullish().transform((v) => v ?? undefined),
  skuCode: z.string().nullish().transform((v) => v ?? undefined),
  barcode: z.string().nullish().transform((v) => v ?? undefined),
  isCombined: z.enum(['true', 'false']).nullish().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  interceptionStatus: z.enum(['NOT_INTERCEPTED', 'PENDING_INTERCEPTION', 'INTERCEPTED']).nullish().transform((v) => v ?? undefined),
  interceptionSource: z.enum(['FOMS_CANCEL', 'MANUAL']).nullish().transform((v) => v ?? undefined),
  numberChangeStatus: z.enum(['SUCCESS', 'FAILED', 'NONE']).nullish().transform((v) => v ?? undefined),
  totalSkuCountMin: z.coerce.number().int().nonnegative().nullish().transform((v) => v ?? undefined),
  totalSkuCountMax: z.coerce.number().int().nonnegative().nullish().transform((v) => v ?? undefined),
  totalOrderedQtyMin: z.coerce.number().int().nonnegative().nullish().transform((v) => v ?? undefined),
  totalOrderedQtyMax: z.coerce.number().int().nonnegative().nullish().transform((v) => v ?? undefined),
  hasNotes: z.enum(['true', 'false']).nullish().transform((v) => v === 'true' ? true : v === 'false' ? false : undefined),
  // 日期筛选
  dateType: z.enum(['created', 'audit', 'shipped', 'expectedShip']).nullish().transform((v) => v ?? 'created'),
  dateFrom: z.coerce.date().nullish().transform((v) => v ?? undefined),
  dateTo: z.coerce.date().nullish().transform((v) => v ?? undefined),
})

// 取消订单 Schema
export const cancelOrderSchema = z.object({
  reason: z.string().min(1, '取消原因不能为空').max(500, '取消原因最多500个字符'),
})

// 暂停订单 Schema
export const holdOrderSchema = z.object({
  reason: z.string().min(1, '暂停原因不能为空').max(500, '暂停原因最多500个字符'),
})

// 回退订单到创建状态 Schema
export const rollbackOrderSchema = z.object({
  reason: z.string().min(1, '回退原因不能为空').max(500, '回退原因最多500个字符'),
})

// ==================== 波次 Schema ====================

// 创建波次 Schema
export const createWaveSchema = z.object({
  warehouseId: z.string().uuid('仓库ID格式错误'),
  waveNumber: z.string().min(1).max(32, '波次号最多32个字符').optional(),
  waveType: z
    .enum(['STANDARD', 'EXPRESS', 'BATCH', 'SINGLE'], {
      errorMap: () => ({ message: '无效的波次类型' }),
    })
    .default('STANDARD'),
  priority: z.coerce.number().int().min(1).max(10).default(5),
  pickStrategy: z
    .enum(['ORDER', 'BATCH', 'ZONE', 'CLUSTER'], {
      errorMap: () => ({ message: '无效的拣货策略' }),
    })
    .default('ORDER'),
  plannedStartAt: z.coerce.date().optional().nullable(),
  zoneIds: z.array(z.string().uuid()).optional().nullable(),
  orderIds: z.array(z.string().uuid()).min(1, '至少选择一个订单').optional().default([]),
  notes: z.string().optional().nullable(),
})

// 波次列表查询参数 Schema
export const waveListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform((v) => v ?? undefined),
  status: z
    .enum(['CREATED', 'RELEASED', 'PICKING', 'PICKED', 'SORTING', 'COMPLETED', 'CANCELLED'])
    .nullish()
    .transform((v) => v ?? undefined),
  waveType: z
    .enum(['STANDARD', 'EXPRESS', 'BATCH', 'SINGLE'])
    .nullish()
    .transform((v) => v ?? undefined),
  warehouseId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  pickStrategy: z
    .enum(['ORDER', 'BATCH', 'ZONE', 'CLUSTER'])
    .nullish()
    .transform((v) => v ?? undefined),
  sortBy: z.string().nullish().transform((v) => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform((v) => v ?? 'desc'),
})

// 添加订单到波次 Schema
export const addOrdersToWaveSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1, '至少选择一个订单'),
})

// ==================== 拣货任务 Schema ====================

// 拣货任务列表查询参数 Schema
export const pickTaskListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform((v) => v ?? undefined),
  status: z
    .enum(['PENDING', 'PICKING', 'PICKED', 'CANCELLED'])
    .nullish()
    .transform((v) => v ?? undefined),
  warehouseId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  waveId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  assignedUserId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  sortBy: z.string().nullish().transform((v) => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform((v) => v ?? 'desc'),
})

// 确认拣货 Schema
export const confirmPickSchema = z.object({
  lineId: z.string().uuid('明细ID格式错误'),
  pickedQty: z.coerce.number().int().nonnegative('拣货数量不能为负数'),
  shortQty: z.coerce.number().int().nonnegative('缺货数量不能为负数').optional().default(0),
  notes: z.string().optional().nullable(),
})

// ==================== 发货单 Schema ====================

// 创建发货单 Schema
export const createShipmentSchema = z.object({
  warehouseId: z.string().uuid('仓库ID格式错误'),
  orderId: z.string().uuid('订单ID格式错误'),
  shipmentNumber: z.string().min(1).max(32, '发货单号最多32个字符').optional(),
  carrierCode: z.string().max(32, '承运商编码最多32个字符').optional().nullable(),
  carrierName: z.string().max(128, '承运商名称最多128个字符').optional().nullable(),
  trackingNumber: z.string().max(64, '物流单号最多64个字符').optional().nullable(),
  shippingMethod: z.string().max(64, '配送方式最多64个字符').optional().nullable(),
  packageCount: z.coerce.number().int().positive().default(1),
  totalWeightKg: z.coerce.number().nonnegative().optional().nullable(),
  totalVolumeCbm: z.coerce.number().nonnegative().optional().nullable(),
  shippingFee: z.coerce.number().nonnegative().optional().nullable(),
  insuranceFee: z.coerce.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
})

// 发货单列表查询参数 Schema
export const shipmentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform((v) => v ?? undefined),
  status: z
    .enum(['CREATED', 'LABEL_PRINTED', 'READY', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION', 'RETURNED'])
    .nullish()
    .transform((v) => v ?? undefined),
  warehouseId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  orderId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  carrierCode: z.string().nullish().transform((v) => v ?? undefined),
  trackingNumber: z.string().nullish().transform((v) => v ?? undefined),
  sortBy: z.string().nullish().transform((v) => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform((v) => v ?? 'desc'),
})

// 确认发货 Schema
export const confirmShipmentSchema = z.object({
  trackingNumber: z.string().min(1, '物流单号不能为空').max(64, '物流单号最多64个字符'),
  carrierCode: z.string().max(32, '承运商编码最多32个字符').optional().nullable(),
  carrierName: z.string().max(128, '承运商名称最多128个字符').optional().nullable(),
  notes: z.string().optional().nullable(),
})

// ==================== 类型导出 ====================

export type CreateOutboundOrderInput = z.infer<typeof createOutboundOrderSchema>
export type UpdateOutboundOrderInput = z.infer<typeof updateOutboundOrderSchema>
export type OutboundOrderListQuery = z.infer<typeof outboundOrderListQuerySchema>
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>
export type HoldOrderInput = z.infer<typeof holdOrderSchema>
export type RollbackOrderInput = z.infer<typeof rollbackOrderSchema>

export type CreateWaveInput = z.infer<typeof createWaveSchema>
export type WaveListQuery = z.infer<typeof waveListQuerySchema>
export type AddOrdersToWaveInput = z.infer<typeof addOrdersToWaveSchema>

export type PickTaskListQuery = z.infer<typeof pickTaskListQuerySchema>
export type ConfirmPickInput = z.infer<typeof confirmPickSchema>

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>
export type ShipmentListQuery = z.infer<typeof shipmentListQuerySchema>
export type ConfirmShipmentInput = z.infer<typeof confirmShipmentSchema>
