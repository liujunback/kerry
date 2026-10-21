import { createAuthHandler, createHandler } from '@/lib/api/create-handler'
import { prismaRead } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

// GET - 查询审计日志列表
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const entityType = searchParams.get('entityType')
    const operationType = searchParams.get('operationType')
    const operatorId = searchParams.get('operatorId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')

    const where: Prisma.AuditWhereInput = {
      tenantId: auth.user.tenantId,
    }

    if (entityType) {
      where.entityType = entityType
    }

    if (operationType) {
      where.operationType = operationType
    }

    if (operatorId) {
      where.operatorId = operatorId
    }

    if (startDate) {
      where.createdAt = {
        ...((where.createdAt as Prisma.DateTimeFilter) || {}),
        gte: new Date(startDate),
      }
    }

    if (endDate) {
      where.createdAt = {
        ...((where.createdAt as Prisma.DateTimeFilter) || {}),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      }
    }

    if (search) {
      where.OR = [
        { entityName: { contains: search } },
        { operatorName: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const [audits, total] = await Promise.all([
      prismaRead.audit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prismaRead.audit.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: audits,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Failed to fetch audits:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch audits' },
      { status: 500 }
    )
  }
})

// GET - 获取可用的实体类型列表
export const OPTIONS = createHandler(async () => {
  const entityTypes = [
    'Sku',
    'Warehouse',
    'Zone',
    'BinLocation',
    'Container',
    'Client',
    'Asn',
    'OutboundOrder',
    'User',
    'Role',
    'Inventory',
    'InventoryAdjustment',
    'InventoryFreeze',
    'InventoryCountOrder',
    'InventoryCountBatch',
    'InventoryCountDetail',
    'InventoryCountRecord',
    'InventoryCountLock',
    'InventoryCountDisposal',
  ]

  const operationTypes = ['CREATE', 'UPDATE', 'DELETE']

  return NextResponse.json({
    success: true,
    data: {
      entityTypes,
      operationTypes,
    },
  })
})
