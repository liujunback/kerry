import { z } from 'zod'

// ==================== 拣货单相关 Schema ====================

// 可选订单列表查询参数 Schema（用于创建拣货单时筛选订单）
export const availableOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  // 主要筛选条件
  warehouseId: z.string().uuid('仓库ID格式错误'),
  orderNumber: z.string().nullish().transform((v) => v ?? undefined),
  clientId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  channelGroup: z.string().nullish().transform((v) => v ?? undefined),
  orderBusinessType: z
    .enum(['STANDARD', 'EXPRESS', 'B2B', 'TRANSFER', 'SAMPLE', 'RETURN_TO_VENDOR'])
    .nullish()
    .transform((v) => v ?? undefined),
  orderType: z
    .enum(['SINGLE_ITEM_SINGLE', 'SINGLE_ITEM_MULTI', 'MULTI_ITEM'])
    .nullish()
    .transform((v) => v ?? undefined),
  orderSource: z
    .enum(['MANUAL', 'API', 'IMPORT', 'PLATFORM'])
    .nullish()
    .transform((v) => v ?? undefined),
  isCombined: z
    .enum(['true', 'false'])
    .nullish()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  // 时间筛选
  createdDateFrom: z.coerce.date().nullish().transform((v) => v ?? undefined),
  createdDateTo: z.coerce.date().nullish().transform((v) => v ?? undefined),
  expectedOutboundFrom: z.coerce.date().nullish().transform((v) => v ?? undefined),
  expectedOutboundTo: z.coerce.date().nullish().transform((v) => v ?? undefined),
  // 更多筛选条件
  platform: z.string().nullish().transform((v) => v ?? undefined),
  hasSerialItems: z
    .enum(['true', 'false'])
    .nullish()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  brand: z.string().nullish().transform((v) => v ?? undefined),
  totalSkuCountMin: z.coerce.number().int().nonnegative().nullish().transform((v) => v ?? undefined),
  totalSkuCountMax: z.coerce.number().int().nonnegative().nullish().transform((v) => v ?? undefined),
  totalOrderedQtyMin: z.coerce.number().int().nonnegative().nullish().transform((v) => v ?? undefined),
  totalOrderedQtyMax: z.coerce.number().int().nonnegative().nullish().transform((v) => v ?? undefined),
  totalWeightKgMin: z.coerce.number().nonnegative().nullish().transform((v) => v ?? undefined),
  totalWeightKgMax: z.coerce.number().nonnegative().nullish().transform((v) => v ?? undefined),
  hasNotes: z
    .enum(['true', 'false'])
    .nullish()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  // 排序 - 默认按订单创建时间升序
  sortBy: z.string().nullish().transform((v) => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform((v) => v ?? 'asc'),
})

// 创建拣货单 Schema
export const createPickOrderSchema = z.object({
  warehouseId: z.string().uuid('仓库ID格式错误'),
  orderIds: z.array(z.string().uuid()).min(1, '至少选择一个订单'),
  assignedUserId: z.string().uuid().nullish(),
  priority: z.coerce.number().int().min(1).max(10).default(5),
  notes: z.string().nullish(),
})

// 拣货单列表查询参数 Schema
export const pickOrderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  // 单据号查询：支持下拉选择单号类型
  searchType: z
    .enum(['orderNumber', 'waveNumber', 'containerNumber', 'taskNumber'])
    .nullish()
    .transform((v) => v ?? 'orderNumber'),
  search: z.string().nullish().transform((v) => v ?? undefined),
  // 业务类型：标准出库单、下架销毁、退仓单
  orderBusinessType: z
    .enum(['STANDARD', 'EXPRESS', 'B2B', 'TRANSFER', 'SAMPLE', 'RETURN_TO_VENDOR'])
    .nullish()
    .transform((v) => v ?? undefined),
  // 时间条件：创建时间和完成时间
  dateType: z
    .enum(['created', 'completed'])
    .nullish()
    .transform((v) => v ?? 'created'),
  dateFrom: z.coerce.date().nullish().transform((v) => v ?? undefined),
  dateTo: z.coerce.date().nullish().transform((v) => v ?? undefined),
  // 渠道
  channel: z.string().nullish().transform((v) => v ?? undefined),
  // 是否合单
  isCombined: z
    .enum(['true', 'false'])
    .nullish()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  // 拣货单类型：单品单件(同款)、单品单件(不同款)、单品多件、多品多件
  taskType: z
    .enum([
      'SINGLE_ONE_HOT',
      'SINGLE_ONE_NORMAL',
      'SINGLE_MULTI_HOT',
      'SINGLE_MULTI_NORMAL',
      'MULTI_FIXED_COMBO',
      'MULTI_NON_FIXED',
    ])
    .nullish()
    .transform((v) => v ?? undefined),
  // 拣货模式
  pickMode: z
    .enum(['SKU_BATCH', 'MIXED_BATCH'])
    .nullish()
    .transform((v) => v ?? undefined),
  // 状态
  status: z
    .enum(['PENDING', 'IN_PROGRESS', 'PICKED', 'SORTING', 'PACKING', 'COMPLETED', 'CANCELLED'])
    .nullish()
    .transform((v) => v ?? undefined),
  warehouseId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  assignedUserId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  // 兼容旧参数
  createdAtFrom: z.coerce.date().nullish().transform((v) => v ?? undefined),
  createdAtTo: z.coerce.date().nullish().transform((v) => v ?? undefined),
  sortBy: z.string().nullish().transform((v) => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform((v) => v ?? 'desc'),
})

// ==================== 类型导出 ====================

export type AvailableOrdersQuery = z.infer<typeof availableOrdersQuerySchema>
export type CreatePickOrderInput = z.infer<typeof createPickOrderSchema>
export type PickOrderListQuery = z.infer<typeof pickOrderListQuerySchema>
