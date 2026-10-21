import { z } from 'zod'

export const createOrderInterceptionSchema = z.object({
  orderNumber: z.string().trim().min(1, '订单号不能为空').max(64, '订单号最多64个字符'),
  remark: z.string().trim().min(1, '拦截备注不能为空').max(2000, '拦截备注最多2000个字符'),
})

export const orderInterceptionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).catch(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20).catch(20),
  orderNumber: z.string().trim().nullish().transform((value) => value ?? undefined),
  source: z.enum(['FOMS_CANCEL', 'MANUAL']).nullish().transform((value) => value ?? undefined),
  status: z.enum(['PENDING_INTERCEPTION', 'INTERCEPTED']).nullish().transform((value) => value ?? undefined),
})

export const handleOrderInterceptionSchema = z.object({
  action: z.enum(['WAIT', 'RESTOCK']),
})
