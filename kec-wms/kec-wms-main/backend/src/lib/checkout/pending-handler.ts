'use server'

import { createHandler } from '@/lib/api/create-handler'
import { requireAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

export const getCheckoutPending = createHandler(async (request) => {
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const tenantId = authResult.user.tenantId
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
  const orderNumber = searchParams.get('orderNumber') || ''
  const trackingNumber = searchParams.get('trackingNumber') || ''
  const channelCode = searchParams.get('channelCode') || ''

  const where: Record<string, unknown> = {
    tenantId,
    status: 'PACKED',
  }

  if (orderNumber) {
    where.orderNumber = { contains: orderNumber }
  }

  if (trackingNumber) {
    where.trackingNumber = { contains: trackingNumber }
  }

  if (channelCode) {
    where.extension = {
      channel: { contains: channelCode },
    }
  }

  const [data, total] = await Promise.all([
    prisma.outboundOrder.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        trackingNumber: true,
        extension: {
          select: {
            channel: true,
            logisticsTrackingNumber: true,
          },
        },
        shipments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.outboundOrder.count({ where }),
  ])

  const formattedData = data.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    trackingNumber: order.extension?.logisticsTrackingNumber || order.trackingNumber,
    channelCode: order.extension?.channel || '-',
    parcelCount: order.shipments?.length || 1,
  }))

  return NextResponse.json({
    success: true,
    data: formattedData,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
})
