import { OrderInterceptionCase, Prisma } from '@prisma/client'

export const ORDER_INTERCEPTION_SOURCES = ['FOMS_CANCEL', 'MANUAL'] as const
export const ORDER_INTERCEPTION_CASE_STATUSES = ['PENDING_INTERCEPTION', 'INTERCEPTED'] as const
export const ORDER_INTERCEPTION_DISPLAY_STATUSES = ['NOT_INTERCEPTED', ...ORDER_INTERCEPTION_CASE_STATUSES] as const
export const ORDER_INTERCEPTION_HANDLING_ACTIONS = ['WAIT', 'RESTOCK'] as const

export type OrderInterceptionSource = (typeof ORDER_INTERCEPTION_SOURCES)[number]
export type OrderInterceptionCaseStatus = (typeof ORDER_INTERCEPTION_CASE_STATUSES)[number]
export type OrderInterceptionDisplayStatus = (typeof ORDER_INTERCEPTION_DISPLAY_STATUSES)[number]
export type OrderInterceptionHandlingAction = (typeof ORDER_INTERCEPTION_HANDLING_ACTIONS)[number]

export const DIRECT_CANCEL_ORDER_STATUSES = ['CREATED', 'PENDING', 'ALLOCATED', 'PENDING_WAVE'] as const
export const CANCEL_TO_INTERCEPT_ORDER_STATUSES = [
  'IN_WAVE',
  'WAVED',
  'PENDING_PICK',
  'PICKING',
  'PICKED',
  'SORTING',
  'SORTED',
  'PACKING',
  'PACKED',
  'CHECKOUT_PENDING',
  'READY_SHIP',
] as const
export const MANUAL_INTERCEPTABLE_ORDER_STATUSES = CANCEL_TO_INTERCEPT_ORDER_STATUSES
export const CHECKOUT_INTERCEPTABLE_ORDER_STATUSES = ['PACKED', 'CHECKOUT_PENDING', 'READY_SHIP'] as const

type DbClient = {
  orderInterceptionCase: {
    findFirst: (args: Prisma.OrderInterceptionCaseFindFirstArgs) => Promise<OrderInterceptionCase | null>
    create: (args: Prisma.OrderInterceptionCaseCreateArgs) => Promise<OrderInterceptionCase>
    update: (args: Prisma.OrderInterceptionCaseUpdateArgs) => Promise<OrderInterceptionCase>
  }
}

type InterceptionCaseLike = {
  source: string
  remark: string
  status: string
  markedBy: string | null
  markedAt: Date
  blockedAtCheckout: Date | null
  handlingAction?: string | null
  handledBy?: string | null
  handledAt?: Date | null
} | null | undefined

export class OrderInterceptionError extends Error {
  code: string
  httpStatus: number

  constructor(message: string, code: string, httpStatus = 400) {
    super(message)
    this.name = 'OrderInterceptionError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

export function buildOrderInterceptionSummary(interceptionCase: InterceptionCaseLike) {
  return {
    interceptionStatus: (interceptionCase?.status || 'NOT_INTERCEPTED') as OrderInterceptionDisplayStatus,
    interceptionSource: interceptionCase?.source || null,
    interceptedRemark: interceptionCase?.remark || null,
    interceptedBy: interceptionCase?.markedBy || null,
    interceptedAt: interceptionCase?.markedAt || null,
    blockedAtCheckout: interceptionCase?.blockedAtCheckout || null,
    handlingAction: interceptionCase?.handlingAction || null,
    handledBy: interceptionCase?.handledBy || null,
    handledAt: interceptionCase?.handledAt || null,
  }
}

export async function findActiveOrderInterceptionCase(
  client: DbClient,
  tenantId: string,
  orderId: string
) {
  return client.orderInterceptionCase.findFirst({
    where: {
      tenantId,
      orderId,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function ensureOrderHasNoActiveInterceptionCase(
  client: DbClient,
  tenantId: string,
  orderId: string
) {
  const existingCase = await findActiveOrderInterceptionCase(client, tenantId, orderId)
  if (existingCase) {
    throw new OrderInterceptionError('订单已存在活动中的拦截案件', 'INT_008', 409)
  }
}

export async function createOrderInterceptionCase(
  client: DbClient,
  params: {
    tenantId: string
    orderId: string
    source: OrderInterceptionSource
    remark: string
    orderStatusAtMark: string
    markedBy?: string | null
    markedAt?: Date
  }
) {
  try {
    await ensureOrderHasNoActiveInterceptionCase(client, params.tenantId, params.orderId)

    return await client.orderInterceptionCase.create({
      data: {
        tenantId: params.tenantId,
        orderId: params.orderId,
        source: params.source,
        remark: params.remark,
        orderStatusAtMark: params.orderStatusAtMark,
        status: 'PENDING_INTERCEPTION',
        isActive: true,
        markedBy: params.markedBy ?? null,
        markedAt: params.markedAt ?? new Date(),
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new OrderInterceptionError('订单已存在活动中的拦截案件', 'INT_008', 409)
    }
    throw error
  }
}

export async function blockOrderInterceptionAtCheckout(
  client: DbClient,
  params: {
    tenantId: string
    orderId: string
    blockedAt?: Date
  }
) {
  const interceptionCase = await findActiveOrderInterceptionCase(
    client,
    params.tenantId,
    params.orderId
  )

  if (!interceptionCase) {
    return null
  }

  if (interceptionCase.status === 'INTERCEPTED') {
    return interceptionCase
  }

  return client.orderInterceptionCase.update({
    where: { id: interceptionCase.id },
    data: {
      status: 'INTERCEPTED',
      blockedAtCheckout: params.blockedAt ?? new Date(),
      updatedAt: params.blockedAt ?? new Date(),
    },
  })
}

export function isDirectCancelableOrderStatus(status: string) {
  return (DIRECT_CANCEL_ORDER_STATUSES as readonly string[]).includes(status)
}

export function shouldCancelOrderBecomeInterception(status: string) {
  return (CANCEL_TO_INTERCEPT_ORDER_STATUSES as readonly string[]).includes(status)
}

export function isManualInterceptionAllowedStatus(status: string) {
  return (MANUAL_INTERCEPTABLE_ORDER_STATUSES as readonly string[]).includes(status)
}

export function isCheckoutInterceptionAllowedStatus(status: string) {
  return (CHECKOUT_INTERCEPTABLE_ORDER_STATUSES as readonly string[]).includes(status)
}
