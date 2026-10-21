import { z } from 'zod'
import { PRINT_SCENARIO_TYPES } from '@/lib/printing/print-config'

// ── 枚举 ──────────────────────────────────────────────────────────

export const LabelType = {
  LABEL_60X40: 'LABEL_60X40',
  LABEL_90X130: 'LABEL_90X130',
  LABEL_100X150: 'LABEL_100X150',
  LABEL_150X100: 'LABEL_150X100',
  A4_DOCUMENT: 'A4_DOCUMENT',
  CUSTOM_LABEL: 'CUSTOM_LABEL',
} as const

export const PRINT_LABEL_TYPES = [
  'LABEL_60X40',
  'LABEL_90X130',
  'LABEL_100X150',
  'LABEL_150X100',
  'A4_DOCUMENT',
  'CUSTOM_LABEL',
] as const

export const createPrintLabelSpecSchema = z.object({
  name: z.string().min(1, '规格名称不能为空').max(128, '规格名称最多128个字符'),
  widthMm: z.coerce.number().min(10, '宽度最小10mm').max(500, '宽度最大500mm'),
  heightMm: z.coerce.number().min(10, '高度最小10mm').max(500, '高度最大500mm'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
})

export const updatePrintLabelSpecSchema = createPrintLabelSpecSchema.partial()

export const printLabelSpecListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(100).catch(100),
})

export const DeviceType = {
  THERMAL: 'THERMAL',
  LASER: 'LASER',
  INKJET: 'INKJET',
  PORTABLE: 'PORTABLE',
  VIRTUAL: 'VIRTUAL',
} as const

export const ConnectionType = {
  NETWORK: 'NETWORK',
  USB: 'USB',
  BLUETOOTH: 'BLUETOOTH',
} as const

// ── 打印模板 ──────────────────────────────────────────────────────

export const createPrintTemplateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空').max(128, '模板名称最多128个字符'),
  scenarioType: z.enum(PRINT_SCENARIO_TYPES, { errorMap: () => ({ message: '无效的业务标签类型' }) }),
  labelSpecCode: z.string().min(1, '请选择标签规格').max(64, '标签规格编码最多64个字符'),
  warehouseId: z.string().uuid('仓库ID格式错误').optional().nullable().transform(v => v || undefined),
  widthMm: z.coerce.number().min(10, '宽度最小10mm').max(500, '宽度最大500mm').optional(),
  heightMm: z.coerce.number().min(10, '高度最小10mm').max(500, '高度最大500mm').optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
  margins: z
    .object({
      top: z.number().min(0).default(2),
      right: z.number().min(0).default(2),
      bottom: z.number().min(0).default(2),
      left: z.number().min(0).default(2),
    })
    .optional(),
  templateContent: z.string().optional(),
  fieldMappings: z.record(z.string()).optional(),
  defaultDeviceId: z.string().optional().nullable().transform(v => v || undefined),
  isDefault: z.boolean().default(false),
})

export const updatePrintTemplateSchema = createPrintTemplateSchema.partial()

export const printTemplateListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  labelType: z
    .enum(PRINT_LABEL_TYPES)
    .nullish()
    .transform((v) => v ?? undefined),
  scenarioType: z
    .enum(PRINT_SCENARIO_TYPES)
    .nullish()
    .transform((v) => v ?? undefined),
  labelSpecCode: z.string().nullish().transform((v) => v ?? undefined),
  warehouseId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  search: z.string().nullish().transform((v) => v ?? undefined),
})

// ── 打印设备 ──────────────────────────────────────────────────────

export const createPrintDeviceSchema = z
  .object({
    name: z.string().min(1, '设备名称不能为空').max(128, '设备名称最多128个字符'),
    deviceType: z.enum(['THERMAL', 'LASER', 'INKJET', 'PORTABLE', 'VIRTUAL'], {
      errorMap: () => ({ message: '无效的设备类型' }),
    }),
    connectionType: z.enum(['NETWORK', 'USB', 'BLUETOOTH', 'VIRTUAL'], {
      errorMap: () => ({ message: '无效的连接方式' }),
    }),
    printerName: z.string().trim().max(128, '打印机名称最多128个字符').optional().nullable().transform(v => v || null),
    ipAddress: z.string().max(64).optional(),
    port: z.coerce.number().int().min(1).max(65535).optional(),
    location: z.string().max(128).optional(),
    charset: z.string().max(16).default('UTF-8'),
    dpi: z.coerce.number().int().positive().default(203),
  })
  .refine(
    (data) => {
      if (data.connectionType === 'NETWORK') {
        return !!data.ipAddress && !!data.port
      }
      return true
    },
    { message: '网络连接方式需要填写 IP 地址和端口号', path: ['ipAddress'] }
  )

export const updatePrintDeviceSchema = createPrintDeviceSchema.innerType().partial()

export const printDeviceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  connectionType: z
    .enum(['NETWORK', 'USB', 'BLUETOOTH', 'VIRTUAL'])
    .nullish()
    .transform((v) => v ?? undefined),
})

// ── 打印作业 ──────────────────────────────────────────────────────

export const createPrintJobSchema = z.object({
  templateId: z.string().min(1, '请选择打印模板'),
  deviceId: z.string().min(1, '请选择打印设备'),
  relatedId: z.string().optional(),
  relatedType: z.string().optional(),
  copies: z.coerce.number().int().min(1).max(99).default(1),
})

// ── 打印历史查询 ──────────────────────────────────────────────────

export const printHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  labelType: z
    .enum(PRINT_LABEL_TYPES)
    .nullish()
    .transform((v) => v ?? undefined),
  scenarioType: z
    .enum(PRINT_SCENARIO_TYPES)
    .nullish()
    .transform((v) => v ?? undefined),
  labelSpecCode: z.string().nullish().transform((v) => v ?? undefined),
  warehouseId: z.string().uuid().nullish().transform((v) => v ?? undefined),
  deviceId: z.string().nullish().transform((v) => v ?? undefined),
  status: z
    .enum(['PENDING', 'PRINTING', 'SUCCESS', 'FAILED'])
    .nullish()
    .transform((v) => v ?? undefined),
  startDate: z.string().nullish().transform((v) => v ?? undefined),
  endDate: z.string().nullish().transform((v) => v ?? undefined),
})

// ── 类型导出 ──────────────────────────────────────────────────────

export type CreatePrintTemplateInput = z.infer<typeof createPrintTemplateSchema>
export type UpdatePrintTemplateInput = z.infer<typeof updatePrintTemplateSchema>
export type PrintTemplateListQuery = z.infer<typeof printTemplateListQuerySchema>
export type CreatePrintLabelSpecInput = z.infer<typeof createPrintLabelSpecSchema>
export type UpdatePrintLabelSpecInput = z.infer<typeof updatePrintLabelSpecSchema>
export type PrintLabelSpecListQuery = z.infer<typeof printLabelSpecListQuerySchema>
export type CreatePrintDeviceInput = z.infer<typeof createPrintDeviceSchema>
export type UpdatePrintDeviceInput = z.infer<typeof updatePrintDeviceSchema>
export type PrintDeviceListQuery = z.infer<typeof printDeviceListQuerySchema>
export type CreatePrintJobInput = z.infer<typeof createPrintJobSchema>
export type PrintHistoryQuery = z.infer<typeof printHistoryQuerySchema>
