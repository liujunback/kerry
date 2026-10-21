import { z } from 'zod'

// ===== 地址 Schema =====
export const addressSchema = z.object({
  line1: z.string().min(1, '地址不能为空').max(256, '地址最多256个字符'),
  line2: z.string().max(256, '地址行2最多256个字符').optional().nullable(),
  city: z.string().max(64, '城市最多64个字符').optional().nullable(),
  province: z.string().max(64, '省份最多64个字符').optional().nullable(),
  postalCode: z.string().max(20, '邮编最多20个字符').optional().nullable(),
  country: z.string().max(2, '国家代码最多2个字符').default('CN'),
})

// ===== 收货人 Schema =====
export const consigneeSchema = z.object({
  name: z.string().min(1, '收货人姓名不能为空').max(128, '收货人姓名最多128个字符'),
  phone: z.string().max(32, '收货人电话最多32个字符').optional().nullable(),
  email: z.string().email('邮箱格式不正确').max(128, '收货人邮箱最多128个字符').optional().nullable(),
  company: z.string().max(128, '收货公司最多128个字符').optional().nullable(),
  address: addressSchema,
})

// ===== 来源信息 Schema =====
export const sourceSchema = z.object({
  platform: z
    .enum(['SHOPIFY', 'AMAZON', 'MANUAL', 'OTHER'], {
      errorMap: () => ({ message: '无效的来源平台' }),
    })
    .default('OTHER'),
  platformOrderId: z.string().max(64, '平台订单ID最多64个字符').optional().nullable(),
  channel: z.string().max(50, '渠道最多50个字符').optional().nullable(),
})

// ===== 物流信息 Schema =====
export const shippingSchema = z.object({
  method: z.string().max(64, '配送方式最多64个字符').optional().nullable(),
  carrierCode: z.string().max(32, '承运商编码最多32个字符').optional().nullable(),
  trackingNumber: z.string().max(64, '运单号最多64个字符').optional().nullable(),
  shippingLabel: z.object({
    url: z.string().max(512, '面单URL最多512个字符').optional().nullable(),
    base64: z.string().optional().nullable(),
  }).optional().nullable(),
  expectedShipDate: z.coerce.date().optional().nullable(),
  expectedDeliveryDate: z.coerce.date().optional().nullable(),
})

// ===== 支付信息 Schema =====
export const paymentSchema = z.object({
  totalAmount: z.coerce.number().nonnegative('订单总金额不能为负数').optional().nullable(),
  currency: z.string().max(3, '币种最多3个字符').default('CNY'),
  isPaid: z.boolean().optional().nullable(),
})

// ===== 订单明细 Schema =====
export const orderItemSchema = z.object({
  lineNo: z.coerce.number().int().positive().optional(),
  skuCode: z.string().min(1, 'SKU编码不能为空').max(64, 'SKU编码最多64个字符'),
  quantity: z.coerce.number().int().positive('订购数量必须为正整数'),
  unit: z.string().max(32, '单位编码最多32个字符').optional().nullable(),
  unitPrice: z.coerce.number().nonnegative('单价不能为负数').optional().nullable(),
  batchNo: z.string().max(64, '批次号最多64个字符').optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  udf: z.string().max(500, 'UDF最多500个字符').optional().nullable(),
  remark: z.string().optional().nullable(),
})

// ===== 外部API创建订单 Schema =====
export const externalCreateOrderSchema = z.object({
  // 基础信息
  clientCode: z.string().min(1, '客户编码不能为空'),
  warehouseCode: z.string().min(1, '仓库编码不能为空'),
  orderNo: z.string().max(32, '订单号最多32个字符').optional(),
  externalOrderNo: z.string().max(64, '外部订单号最多64个字符').optional().nullable(),

  // 订单属性
  orderType: z
    .enum(['STANDARD', 'RETURN', 'SCRAP', 'OTHER'], {
      errorMap: () => ({ message: '无效的业务类型' }),
    })
    .default('STANDARD'),
  source: sourceSchema.optional(),

  // 收货人信息
  consignee: consigneeSchema,

  // 物流信息
  shipping: shippingSchema.optional(),

  // 支付信息
  payment: paymentSchema.optional(),

  // 订单明细
  items: z.array(orderItemSchema).min(1, '订单明细不能为空'),

  // 其他
  remark: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  customFields: z.record(z.unknown()).optional().default({}),
})

// ===== 外部API更新订单 Schema =====
export const externalUpdateOrderSchema = z.object({
  clientCode: z.string().min(1, '客户编码不能为空').optional(),
  externalOrderNo: z.string().max(64, '外部订单号最多64个字符').optional().nullable(),
  orderType: z
    .enum(['STANDARD', 'RETURN', 'SCRAP', 'OTHER'], {
      errorMap: () => ({ message: '无效的业务类型' }),
    })
    .optional(),
  source: sourceSchema.partial().optional(),
  consignee: z.object({
    name: z.string().max(128).optional(),
    phone: z.string().max(32).optional().nullable(),
    email: z.string().email().max(128).optional().nullable(),
    company: z.string().max(128).optional().nullable(),
    address: addressSchema.partial().optional(),
  }).optional(),
  shipping: shippingSchema.optional(),
  payment: paymentSchema.optional(),
  remark: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  customFields: z.record(z.unknown()).optional(),
})

// ===== 外部API取消订单 Schema =====
export const externalCancelOrderSchema = z.object({
  clientCode: z.string().min(1, '客户编码不能为空').optional(),
  reason: z.string().min(1, '取消原因不能为空').max(500, '取消原因最多500个字符'),
})

// ===== 外部API获取订单 Schema =====
export const externalGetOrderSchema = z.object({
  clientCode: z.string().min(1, '客户编码不能为空').optional(),
})

// ===== 外部API删除订单 Schema =====
export const externalDeleteOrderSchema = z.object({
  clientCode: z.string().min(1, '客户编码不能为空').optional(),
})

// ===== 类型导出 =====
export type AddressInput = z.infer<typeof addressSchema>
export type ConsigneeInput = z.infer<typeof consigneeSchema>
export type SourceInput = z.infer<typeof sourceSchema>
export type ShippingInput = z.infer<typeof shippingSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type OrderItemInput = z.infer<typeof orderItemSchema>
export type ExternalCreateOrderInput = z.infer<typeof externalCreateOrderSchema>
export type ExternalUpdateOrderInput = z.infer<typeof externalUpdateOrderSchema>
export type ExternalCancelOrderInput = z.infer<typeof externalCancelOrderSchema>
export type ExternalGetOrderInput = z.infer<typeof externalGetOrderSchema>
export type ExternalDeleteOrderInput = z.infer<typeof externalDeleteOrderSchema>
