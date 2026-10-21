import { z } from 'zod'

// 分拣状态枚举
export const SortStatus = {
  IDLE: 'IDLE',
  SORTING: 'SORTING',
} as const

// 创建分拣墙 Schema
export const createSortingWallSchema = z
  .object({
    warehouseId: z.string().uuid('无效的仓库ID').optional(),
    wallCode: z
      .string()
      .min(1, '分拣墙编码不能为空')
      .max(64, '分拣墙编码最多64个字符'),
    wallName: z
      .string()
      .min(1, '分拣墙名称不能为空')
      .max(64, '分拣墙名称最多64个字符'),
    workstationCode: z
      .string()
      .max(32, '工作站编码最多32个字符')
      .optional()
      .nullable(),
    horizontalCells: z.coerce
      .number()
      .int('横向格口数必须为整数')
      .min(1, '横向格口数至少为1')
      .max(50, '横向格口数最多为50'),
    verticalCells: z.coerce
      .number()
      .int('纵向格口数必须为整数')
      .min(1, '纵向格口数至少为1')
      .max(20, '纵向格口数最多为20'),
    locationCode: z
      .string()
      .max(32, '位置编码最多32个字符')
      .optional()
      .default('999.99.99'),
    remarks: z.string().max(256, '备注最多256个字符').optional().nullable(),
  })
  .refine((data) => data.horizontalCells * data.verticalCells <= 1000, {
    message: '总格口数不能超过1000',
    path: ['horizontalCells'],
  })

// 更新分拣墙 Schema
export const updateSortingWallSchema = z
  .object({
    wallName: z
      .string()
      .min(1, '分拣墙名称不能为空')
      .max(64, '分拣墙名称最多64个字符')
      .optional(),
    workstationCode: z
      .string()
      .min(1, '工作站编码不能为空')
      .max(32, '工作站编码最多32个字符')
      .optional(),
    horizontalCells: z.coerce
      .number()
      .int('横向格口数必须为整数')
      .min(1, '横向格口数至少为1')
      .max(50, '横向格口数最多为50')
      .optional(),
    verticalCells: z.coerce
      .number()
      .int('纵向格口数必须为整数')
      .min(1, '纵向格口数至少为1')
      .max(20, '纵向格口数最多为20')
      .optional(),
    locationCode: z.string().max(32, '位置编码最多32个字符').optional(),
    remarks: z.string().max(256, '备注最多256个字符').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.horizontalCells && data.verticalCells) {
        return data.horizontalCells * data.verticalCells <= 1000
      }
      return true
    },
    {
      message: '总格口数不能超过1000',
      path: ['horizontalCells'],
    }
  )

// 修改启用状态 Schema
export const changeActiveStatusSchema = z.object({
  isActive: z.boolean({
    errorMap: () => ({ message: '无效的启用状态' }),
  }),
})

// 分拣墙列表查询参数 Schema
export const sortingWallListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(10).catch(10),
  search: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  warehouseId: z
    .string()
    .uuid()
    .nullish()
    .transform((v) => v ?? undefined),
  workstationCode: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  isActive: z
    .enum(['true', 'false'])
    .nullish()
    .transform((v) => {
      if (v === 'true') return true
      if (v === 'false') return false
      return undefined
    }),
  sortStatus: z
    .enum(['IDLE', 'SORTING'])
    .nullish()
    .transform((v) => v ?? undefined),
  sortBy: z
    .string()
    .nullish()
    .transform((v) => v ?? 'createdAt'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .nullish()
    .transform((v) => v ?? 'desc'),
})

// 类型导出
export type CreateSortingWallInput = z.infer<typeof createSortingWallSchema>
export type UpdateSortingWallInput = z.infer<typeof updateSortingWallSchema>
export type ChangeActiveStatusInput = z.infer<typeof changeActiveStatusSchema>
export type SortingWallListQuery = z.infer<typeof sortingWallListQuerySchema>
