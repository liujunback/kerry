import { z } from 'zod'

// 容器类型枚举
export const ContainerType = {
  LARGE_BOX: 'LARGE_BOX',
  MEDIUM_BOX: 'MEDIUM_BOX',
  SMALL_BOX: 'SMALL_BOX',
  SORTING_BOX: 'SORTING_BOX',
  PALLET: 'PALLET',
  CAGE_CART: 'CAGE_CART',
} as const

// 容器用途枚举
export const ContainerUsage = {
  INBOUND: 'INBOUND',
  RETURN_INBOUND: 'RETURN_INBOUND',
  OUTBOUND: 'OUTBOUND',
} as const

const containerUsageValues = ['INBOUND', 'RETURN_INBOUND', 'OUTBOUND'] as const

// 启用状态枚举
export const EnabledStatus = {
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED',
} as const

// 工作状态枚举
export const WorkStatus = {
  IDLE: 'IDLE',
  OCCUPIED: 'OCCUPIED',
} as const

// 容器类型前缀映射（用于自动生成编码）
export const ContainerTypePrefix: Record<string, string> = {
  LARGE_BOX: 'LB',
  MEDIUM_BOX: 'MB',
  SMALL_BOX: 'SB',
  SORTING_BOX: 'ST',
  PALLET: 'PL',
  CAGE_CART: 'CC',
}

// 容器用途前缀映射（用于自动生成编码）
export const ContainerUsagePrefix: Record<string, string> = {
  INBOUND: 'I',   // 入库
  RETURN_INBOUND: 'R', // 退件入库
  OUTBOUND: 'O',  // 出库
}

// 容器类型中文名称映射
export const ContainerTypeLabel: Record<string, string> = {
  LARGE_BOX: '大箱',
  MEDIUM_BOX: '中箱',
  SMALL_BOX: '小箱',
  SORTING_BOX: '分拣箱',
  PALLET: '托盘',
  CAGE_CART: '笼车',
}

// 用途中文名称映射
export const UsageLabel: Record<string, string> = {
  INBOUND: '入库',
  RETURN_INBOUND: '退件入库',
  OUTBOUND: '出库',
}

// 启用状态中文名称映射
export const EnabledStatusLabel: Record<string, string> = {
  ENABLED: '启用',
  DISABLED: '禁用',
}

// 工作状态中文名称映射
export const WorkStatusLabel: Record<string, string> = {
  IDLE: '空闲',
  OCCUPIED: '占用',
}

// 创建容器 Schema
export const createContainerSchema = z.object({
  warehouseId: z.string().uuid('无效的仓库ID'),
  containerCode: z
    .string()
    .min(2, '容器编码至少2个字符')
    .max(32, '容器编码最多32个字符')
    .regex(/^[A-Z0-9-]+$/, '容器编码只能包含大写字母、数字和连字符')
    .optional(),
  containerType: z.enum(
    ['LARGE_BOX', 'MEDIUM_BOX', 'SMALL_BOX', 'SORTING_BOX', 'PALLET', 'CAGE_CART'],
    { errorMap: () => ({ message: '无效的容器类型' }) }
  ),
  usage: z.enum(containerUsageValues, {
    errorMap: () => ({ message: '无效的容器用途' }),
  }),
  weightCapacityKg: z.coerce.number().positive('承重必须为正数').optional().nullable(),
  lengthCm: z.coerce.number().positive('长度必须为正数').optional().nullable(),
  widthCm: z.coerce.number().positive('宽度必须为正数').optional().nullable(),
  heightCm: z.coerce.number().positive('高度必须为正数').optional().nullable(),
  remarks: z.string().max(500, '备注最多500个字符').optional().nullable(),
})

// 批量创建容器 Schema
export const batchCreateContainerSchema = z.object({
  warehouseId: z.string().uuid('无效的仓库ID'),
  containerType: z.enum(
    ['LARGE_BOX', 'MEDIUM_BOX', 'SMALL_BOX', 'SORTING_BOX', 'PALLET', 'CAGE_CART'],
    { errorMap: () => ({ message: '无效的容器类型' }) }
  ),
  usage: z.enum(containerUsageValues, {
    errorMap: () => ({ message: '无效的容器用途' }),
  }),
  quantity: z.coerce.number().int().min(1, '数量至少为1').max(100, '每次最多创建100个'),
  weightCapacityKg: z.coerce.number().positive('承重必须为正数').optional().nullable(),
  lengthCm: z.coerce.number().positive('长度必须为正数').optional().nullable(),
  widthCm: z.coerce.number().positive('宽度必须为正数').optional().nullable(),
  heightCm: z.coerce.number().positive('高度必须为正数').optional().nullable(),
  remarks: z.string().max(500, '备注最多500个字符').optional().nullable(),
})

// 更新容器 Schema
export const updateContainerSchema = z.object({
  warehouseId: z.string().uuid('无效的仓库ID').optional(),
  containerType: z
    .enum(['LARGE_BOX', 'MEDIUM_BOX', 'SMALL_BOX', 'SORTING_BOX', 'PALLET', 'CAGE_CART'])
    .optional(),
  usage: z.enum(containerUsageValues).optional(),
  weightCapacityKg: z.coerce.number().positive('承重必须为正数').optional().nullable(),
  lengthCm: z.coerce.number().positive('长度必须为正数').optional().nullable(),
  widthCm: z.coerce.number().positive('宽度必须为正数').optional().nullable(),
  heightCm: z.coerce.number().positive('高度必须为正数').optional().nullable(),
  remarks: z.string().max(500, '备注最多500个字符').optional().nullable(),
})

// 修改启用状态 Schema
export const changeEnabledStatusSchema = z.object({
  enabledStatus: z.enum(['ENABLED', 'DISABLED'], {
    errorMap: () => ({ message: '无效的启用状态' }),
  }),
})

// 批量修改启用状态 Schema
export const batchChangeEnabledStatusSchema = z.object({
  containerIds: z
    .array(z.string().uuid('无效的容器ID'))
    .min(1, '至少需要一个容器ID')
    .max(100, '每次最多100个容器'),
  enabledStatus: z.enum(['ENABLED', 'DISABLED'], {
    errorMap: () => ({ message: '无效的启用状态' }),
  }),
})

// 容器列表查询参数 Schema
export const containerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z.string().nullish().transform(v => v ?? undefined),
  containerType: z
    .enum(['LARGE_BOX', 'MEDIUM_BOX', 'SMALL_BOX', 'SORTING_BOX', 'PALLET', 'CAGE_CART'])
    .nullish()
    .transform(v => v ?? undefined),
  usage: z.enum(containerUsageValues).nullish().transform(v => v ?? undefined),
  enabledStatus: z.enum(['ENABLED', 'DISABLED']).nullish().transform(v => v ?? undefined),
  workStatus: z.enum(['IDLE', 'OCCUPIED']).nullish().transform(v => v ?? undefined),
  warehouseId: z.string().uuid('无效的仓库ID').nullish().transform(v => v ?? undefined),
  sortBy: z.string().nullish().transform(v => v ?? 'createdAt'),
  sortOrder: z.enum(['asc', 'desc']).nullish().transform(v => v ?? 'desc'),
})

// 生成容器编码 Schema
export const generateCodeSchema = z.object({
  containerType: z.enum(
    ['LARGE_BOX', 'MEDIUM_BOX', 'SMALL_BOX', 'SORTING_BOX', 'PALLET', 'CAGE_CART'],
    { errorMap: () => ({ message: '无效的容器类型' }) }
  ),
  usage: z.enum(containerUsageValues, {
    errorMap: () => ({ message: '无效的容器用途' }),
  }),
})

// 类型导出
export type CreateContainerInput = z.infer<typeof createContainerSchema>
export type BatchCreateContainerInput = z.infer<typeof batchCreateContainerSchema>
export type UpdateContainerInput = z.infer<typeof updateContainerSchema>
export type ChangeEnabledStatusInput = z.infer<typeof changeEnabledStatusSchema>
export type BatchChangeEnabledStatusInput = z.infer<typeof batchChangeEnabledStatusSchema>
export type ContainerListQuery = z.infer<typeof containerListQuerySchema>
export type GenerateCodeInput = z.infer<typeof generateCodeSchema>
