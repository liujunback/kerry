'use server'

import { createAuthHandler } from '@/lib/api/create-handler'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest,NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const GET = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const tenantId = auth.user.tenantId

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const warehouseId = resolveScopedWarehouseId(auth.user, searchParams.get('warehouseId'))
    const channelCode = searchParams.get('channelCode') || ''
    const clientId = searchParams.get('clientId') || ''
    const dateType = searchParams.get('dateType') || 'created'
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const where: Prisma.ManifestOrderWhereInput = {
      tenantId,
    }

    if (search) {
      where.OR = [
        { manifestNumber: { contains: search } },
        { channelName: { contains: search } },
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (warehouseId && warehouseId !== 'all') {
      where.warehouseId = warehouseId
    }

    if (channelCode && channelCode !== 'all') {
      where.channelCode = channelCode
    }

    if (clientId && clientId !== 'all') {
      where.clientId = clientId
    }

    if (dateFrom || dateTo) {
      const dateField = dateType === 'completed' ? 'completedAt' : 'createdAt'
      where[dateField] = {}
      if (dateFrom) {
        ;(where[dateField] as Prisma.DateTimeFilter).gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        ;(where[dateField] as Prisma.DateTimeFilter).lte = endDate
      }
    }

    const data = await prisma.manifestOrder.findMany({
      where,
      include: {
        warehouse: {
          select: { warehouseCode: true, warehouseName: true },
        },
        client: {
          select: { clientCode: true, clientName: true },
        },
        checkoutOrders: {
          include: {
            records: {
              include: {
                order: {
                  select: {
                    orderNumber: true,
                    referenceNumber: true,
                    outbound_order_address: {
                      select: {
                        shippingName: true,
                        shippingPhone: true,
                        shippingCity: true,
                        shippingProvince: true,
                      },
                    },
                  },
                },
              },
              orderBy: { sequenceNumber: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000, // 限制导出数量
    })

    // Sheet1: 汇总信息
    const summaryData = data.map((item) => ({
      '出库总单号': item.manifestNumber,
      '状态': item.status,
      '仓库': item.warehouse?.warehouseName || '',
      '渠道': item.channelName || '',
      '客户': item.client?.clientName || '',
      '订单数量': item.orderCount,
      '包裹数量': item.parcelCount,
      '板/袋数量': item.containerCount,
      '总重量(kg)': item.totalWeightKg?.toString() || '',
      '创建时间': item.createdAt.toLocaleString(),
      '完结时间': item.completedAt?.toLocaleString() || '',
    }))

    // Sheet2: 详情（所有订单明细）
    const detailData: Array<Record<string, string | number>> = []
    data.forEach((manifest) => {
      manifest.checkoutOrders.forEach((checkout) => {
        checkout.records.forEach((record) => {
          detailData.push({
            '出库总单号': manifest.manifestNumber,
            '签出单号': checkout.checkoutNumber,
            '签出类型': checkout.checkoutType === 'PALLET' ? '板' : '袋',
            '序号': record.sequenceNumber,
            '订单号': record.order?.orderNumber || '',
            '客户单号': record.order?.referenceNumber || '',
            '运单号': record.trackingNumber || '',
            '收货人': record.order?.outbound_order_address?.shippingName || '',
            '收货电话': record.order?.outbound_order_address?.shippingPhone || '',
            '收货城市': record.order?.outbound_order_address?.shippingCity || '',
            '收货省份': record.order?.outbound_order_address?.shippingProvince || '',
            '渠道': record.channelName || '',
            '扫描时间': new Date(record.scannedAt).toLocaleString(),
          })
        })
      })
    })

    // 生成 Excel
    const wb = XLSX.utils.book_new()

    // 添加汇总sheet
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, wsSummary, '汇总')

    // 添加详情sheet
    const wsDetail = XLSX.utils.json_to_sheet(detailData)
    XLSX.utils.book_append_sheet(wb, wsDetail, '详情')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="manifest-orders-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Failed to export manifest orders:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export manifest orders' },
      { status: 500 }
    )
  }
})
