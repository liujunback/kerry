import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import {
  clientListQuerySchema,
  createClientSchema,
} from '@/lib/validations/client'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/v1/clients - 获取客户列表
export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  const searchParams = request.nextUrl.searchParams
  const queryResult = clientListQuerySchema.safeParse({
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
    search: searchParams.get('search'),
    clientType: searchParams.get('clientType'),
    isActive: searchParams.get('isActive'),
    city: searchParams.get('city'),
    sortBy: searchParams.get('sortBy'),
    sortOrder: searchParams.get('sortOrder'),
  })

  if (!queryResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: queryResult.error.errors },
      { status: 400 }
    )
  }

  const { page, pageSize, search, clientType, isActive, city, sortBy, sortOrder } = queryResult.data

  const where: Record<string, unknown> = {
    tenantId: auth.user.tenantId,
  }

  if (search) {
    where.OR = [
      { clientCode: { contains: search } },
      { clientName: { contains: search } },
      { shortName: { contains: search } },
      { contactPerson: { contains: search } },
    ]
  }

  if (clientType) {
    where.clientType = clientType
  }

  if (isActive !== undefined) {
    where.isActive = isActive
  }

  if (city) {
    where.city = city
  }

  const total = await prisma.client.count({ where })

  const clients = await prisma.client.findMany({
    where,
    select: {
      id: true,
      clientCode: true,
      clientName: true,
      shortName: true,
      clientType: true,
      contactPerson: true,
      contactPhone: true,
      contactEmail: true,
      city: true,
      province: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          clientWarehouses: { where: { isActive: true } },
          inventoryBuckets: true,
        },
      },
    },
    orderBy: { [sortBy]: sortOrder },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  return NextResponse.json({
    success: true,
    data: clients,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})

// POST /api/v1/clients - 创建客户
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  const body = await request.json()
  const validationResult = createClientSchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: validationResult.error.errors },
      { status: 400 }
    )
  }

  const data = validationResult.data

  const existingClient = await prisma.client.findFirst({
    where: {
      tenantId: auth.user.tenantId,
      clientCode: data.clientCode,
    },
  })

  if (existingClient) {
    return NextResponse.json(
      { success: false, message: '客户编码已存在', code: 'CLIENT_CODE_EXISTS' },
      { status: 400 }
    )
  }

  const client = await prisma.client.create({
    data: {
      tenantId: auth.user.tenantId,
      clientCode: data.clientCode,
      clientName: data.clientName,
      shortName: data.shortName || null,
      clientType: data.clientType,
      contactPerson: data.contactPerson || null,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      address: data.address || null,
      city: data.city || null,
      province: data.province || null,
      country: data.country,
      postalCode: data.postalCode || null,
      taxNumber: data.taxNumber || null,
      bankName: data.bankName || null,
      bankAccount: data.bankAccount || null,
      creditLimit: data.creditLimit,
      paymentTerms: data.paymentTerms,
      notes: data.notes || null,
      isActive: true,
      config: {},
      createdBy: auth.user.id,
    },
    select: {
      id: true,
      clientCode: true,
      clientName: true,
      shortName: true,
      clientType: true,
      contactPerson: true,
      contactPhone: true,
      isActive: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: client,
    message: '客户创建成功',
  })
})
