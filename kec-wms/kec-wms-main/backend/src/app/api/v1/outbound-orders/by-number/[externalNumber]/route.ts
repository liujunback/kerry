import { authenticate,hasApiScope } from '@/lib/auth/unified-auth'
import { prisma } from '@/lib/db/prisma'
import { shippingLabelStorage } from '@/lib/services/shipping-label-storage'
import { externalDeleteOrderSchema,externalGetOrderSchema,externalUpdateOrderSchema } from '@/lib/validations/outbound-external'
import { withUnifiedAuditContext } from '@/middleware/audit-context'
import { type Prisma } from '@prisma/client'
import { NextRequest,NextResponse } from 'next/server'

/**
 * GET /api/v1/outbound-orders/by-number/[externalNumber]
 * 通过外部单号获取订单详情（外部API专用）
 *
 * 请求body:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ externalNumber: string }> }
) {
  try {
    const authResult = await authenticate(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: authResult.status || 401 }
      )
    }

    const authContext = authResult.context!

    // 此接口仅供外部API调用
    if (authContext.type !== 'apiKey') {
      return NextResponse.json(
        { success: false, message: '此接口仅供外部API调用' },
        { status: 403 }
      )
    }

    if (!hasApiScope(authContext, 'order:read')) {
      return NextResponse.json(
        { success: false, message: '权限不足' },
        { status: 403 }
      )
    }

    const { externalNumber } = await params

    // 解析请求body
    let body = {}
    try {
      body = await request.json()
    } catch {
      // GET请求可能没有body
    }

    const parseResult = externalGetOrderSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: parseResult.error.errors },
        { status: 400 }
      )
    }

    const { clientCode } = parseResult.data

    // 确定客户ID
    let clientId = authContext.clientId
    if (!clientId) {
      if (!clientCode) {
        return NextResponse.json(
          { success: false, message: '客户编码(clientCode)不能为空' },
          { status: 400 }
        )
      }
      // 通过clientCode查找客户
      const client = await prisma.client.findFirst({
        where: {
          tenantId: authContext.tenantId,
          clientCode,
        },
      })
      if (!client) {
        return NextResponse.json(
          { success: false, message: '客户不存在' },
          { status: 404 }
        )
      }
      clientId = client.id
    }

    // 查找订单（通过referenceNumber作为externalNumber）
    const order = await prisma.outboundOrder.findFirst({
      where: {
        tenantId: authContext.tenantId,
        clientId,
        referenceNumber: externalNumber,
      },
      select: {
        orderNumber: true,
        referenceNumber: true,
        orderType: true,
        orderSource: true,
        status: true,
        outbound_order_address: {
          select: {
            shippingName: true,
            shippingPhone: true,
            shippingEmail: true,
            shippingLine1: true,
            shippingCity: true,
            shippingProvince: true,
            shippingCountry: true,
            shippingPostalCode: true,
          },
        },
        shippingMethod: true,
        trackingNumber: true,
        totalOrderedQty: true,
        totalAllocatedQty: true,
        totalPickedQty: true,
        totalPackedQty: true,
        totalShippedQty: true,
        totalSkuCount: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: { clientCode: true, clientName: true },
        },
        warehouse: {
          select: { warehouseCode: true, warehouseName: true },
        },
        lines: {
          select: {
            lineNumber: true,
            skuCode: true,
            skuName: true,
            orderedQty: true,
            allocatedQty: true,
            pickedQty: true,
            packedQty: true,
            shippedQty: true,
            uomCode: true,
            unitPrice: true,
            lineAmount: true,
            batchNumber: true,
            status: true,
          },
          orderBy: { lineNumber: 'asc' },
        },
        extension: {
          select: {
            shippingLabelUrl: true,
            shippingLabelType: true,
          },
        },
        shipments: {
          select: {
            shipmentNumber: true,
            status: true,
            carrierCode: true,
            carrierName: true,
            trackingNumber: true,
            shippingMethod: true,
            packageCount: true,
            totalWeightKg: true,
            shippedAt: true,
            deliveredAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, message: '订单不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: order,
    })
  } catch (error) {
    console.error('获取订单失败:', error)
    return NextResponse.json(
      { success: false, message: '获取订单失败' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/outbound-orders/by-number/[externalNumber]
 * 通过外部单号更新订单（外部API专用）
 *
 * 请求body:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 * - ...updateFields: 更新字段
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ externalNumber: string }> }
) {
  const authResult = await authenticate(request)
  if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: authResult.status || 401 }
      )
    }

    const authContext = authResult.context!

  // 此接口仅供外部API调用
  if (authContext.type !== 'apiKey') {
    return NextResponse.json(
      { success: false, message: '此接口仅供外部API调用' },
      { status: 403 }
    )
  }

  if (!hasApiScope(authContext, 'order:write')) {
    return NextResponse.json(
      { success: false, message: '权限不足' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const { externalNumber } = await params
      const body = await request.json()

      // 验证请求数据
      const parseResult = externalUpdateOrderSchema.safeParse(body)
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: parseResult.error.errors },
          { status: 400 }
        )
      }

      const { clientCode, ...updateData } = parseResult.data

      // 确定客户ID
      let clientId = authContext.clientId
      if (!clientId) {
        if (!clientCode) {
          return NextResponse.json(
            { success: false, message: '客户编码(clientCode)不能为空' },
            { status: 400 }
          )
        }
        // 通过clientCode查找客户
        const client = await prisma.client.findFirst({
          where: {
            tenantId: authContext.tenantId,
            clientCode,
          },
        })
        if (!client) {
          return NextResponse.json(
            { success: false, message: '客户不存在' },
            { status: 404 }
          )
        }
        clientId = client.id
      }

      // 查找订单（通过referenceNumber）
      const existingOrder = await prisma.outboundOrder.findFirst({
        where: {
          tenantId: authContext.tenantId,
          clientId,
          referenceNumber: externalNumber,
        },
        select: {
          id: true,
          status: true,
          outbound_address_id: true,
        },
      })

      if (!existingOrder) {
        return NextResponse.json(
          { success: false, message: '订单不存在' },
          { status: 404 }
        )
      }

      // 检查状态是否允许更新
      if (!['PENDING', 'ALLOCATED'].includes(existingOrder.status)) {
        return NextResponse.json(
          { success: false, message: `订单状态为${existingOrder.status}，不允许更新` },
          { status: 400 }
        )
      }

      const { consignee: consigneeData, shipping: shippingData, ...orderUpdateData } = updateData

      // 更新订单（如果有地址更新，同时更新地址）
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // 如果有收货人信息更新且订单有关联地址
        if (consigneeData && existingOrder.outbound_address_id) {
          await tx.orderAddress.update({
            where: { id: existingOrder.outbound_address_id },
            data: {
              shippingName: consigneeData.name,
              shippingPhone: consigneeData.phone,
              shippingEmail: consigneeData.email,
              shippingCompany: consigneeData.company,
              shippingLine1: consigneeData.address?.line1,
              shippingLine2: consigneeData.address?.line2,
              shippingCity: consigneeData.address?.city,
              shippingProvince: consigneeData.address?.province,
              shippingPostalCode: consigneeData.address?.postalCode,
              shippingCountry: consigneeData.address?.country,
            },
          })
        }

        // 准备订单更新数据
        const orderData = {
          ...orderUpdateData,
          updatedAt: new Date(),
          updatedBy: authContext.userId,
        } as Prisma.OutboundOrderUpdateInput

        // 处理运单号
        if (shippingData?.trackingNumber !== undefined) {
          orderData.trackingNumber = shippingData.trackingNumber
        }

        // 处理配送方式
        if (shippingData?.method !== undefined) {
          orderData.shippingMethod = shippingData.method
        }

        // 更新订单基本信息
        await tx.outboundOrder.update({
          where: { id: existingOrder.id },
          data: orderData,
        })

        // 处理发货面单
        if (shippingData?.shippingLabel) {
          let shippingLabelUrl: string | null = null
          let shippingLabelType: string | null = null

          const label = shippingData.shippingLabel

          if (label.base64) {
            // Base64格式：转换为文件
            try {
              const result = await shippingLabelStorage.saveBase64Image(
                authContext.tenantId,
                existingOrder.id,
                label.base64
              )
              shippingLabelUrl = result.url
              shippingLabelType = result.type
            } catch (error) {
              console.error('保存面单Base64失败:', error)
              // 不阻塞订单更新
            }
          } else if (label.url) {
            // URL格式：验证并直接保存
            if (shippingLabelStorage.validateUrl(label.url)) {
              shippingLabelUrl = label.url
              shippingLabelType = 'URL'
            } else {
              console.error('无效的面单URL格式:', label.url)
            }
          }

          // 更新扩展表
          if (shippingLabelUrl) {
            await tx.outboundOrderExtension.upsert({
              where: { orderId: existingOrder.id },
              create: {
                tenantId: authContext.tenantId,
                orderId: existingOrder.id,
                shippingLabelUrl,
                shippingLabelType,
              },
              update: {
                shippingLabelUrl,
                shippingLabelType,
              },
            })
          }
        }

        return tx.outboundOrder.findUnique({
          where: { id: existingOrder.id },
          select: {
            orderNumber: true,
            referenceNumber: true,
            orderType: true,
            orderSource: true,
            status: true,
            outbound_order_address: {
              select: {
                shippingName: true,
                shippingPhone: true,
                shippingEmail: true,
                shippingLine1: true,
                shippingCity: true,
                shippingProvince: true,
                shippingCountry: true,
                shippingPostalCode: true,
              },
            },
            shippingMethod: true,
            trackingNumber: true,
            notes: true,
            updatedAt: true,
            client: {
              select: { clientCode: true, clientName: true },
            },
            warehouse: {
              select: { warehouseCode: true, warehouseName: true },
            },
            extension: {
              select: {
                shippingLabelUrl: true,
                shippingLabelType: true,
              },
            },
          },
        })
      })

      return NextResponse.json({
        success: true,
        message: '订单更新成功',
        data: updatedOrder,
      })
    } catch (error) {
      console.error('更新订单失败:', error)
      return NextResponse.json(
        { success: false, message: '更新订单失败' },
        { status: 500 }
      )
    }
  })
}

/**
 * DELETE /api/v1/outbound-orders/by-number/[externalNumber]
 * 通过外部单号删除订单（外部API专用）
 *
 * 请求body:
 * - clientCode: 客户编码（如果API Key未绑定客户则必填）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ externalNumber: string }> }
) {
  const authResult = await authenticate(request)
  if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error || '未授权访问' },
        { status: authResult.status || 401 }
      )
    }

    const authContext = authResult.context!

  // 此接口仅供外部API调用
  if (authContext.type !== 'apiKey') {
    return NextResponse.json(
      { success: false, message: '此接口仅供外部API调用' },
      { status: 403 }
    )
  }

  if (!hasApiScope(authContext, 'order:delete')) {
    return NextResponse.json(
      { success: false, message: '权限不足' },
      { status: 403 }
    )
  }

  return withUnifiedAuditContext(request, authContext, async () => {
    try {
      const { externalNumber } = await params

      // 解析请求body
      let body = {}
      try {
        body = await request.json()
      } catch {
        // DELETE请求可能没有body
      }

      const parseResult = externalDeleteOrderSchema.safeParse(body)
      if (!parseResult.success) {
        return NextResponse.json(
          { success: false, message: '参数错误', errors: parseResult.error.errors },
          { status: 400 }
        )
      }

      const { clientCode } = parseResult.data

      // 确定客户ID
      let clientId = authContext.clientId
      if (!clientId) {
        if (!clientCode) {
          return NextResponse.json(
            { success: false, message: '客户编码(clientCode)不能为空' },
            { status: 400 }
          )
        }
        // 通过clientCode查找客户
        const client = await prisma.client.findFirst({
          where: {
            tenantId: authContext.tenantId,
            clientCode,
          },
        })
        if (!client) {
          return NextResponse.json(
            { success: false, message: '客户不存在' },
            { status: 404 }
          )
        }
        clientId = client.id
      }

      // 查找订单（通过referenceNumber）
      const existingOrder = await prisma.outboundOrder.findFirst({
        where: {
          tenantId: authContext.tenantId,
          clientId,
          referenceNumber: externalNumber,
        },
      })

      if (!existingOrder) {
        return NextResponse.json(
          { success: false, message: '订单不存在' },
          { status: 404 }
        )
      }

      // 检查状态是否允许删除
      if (existingOrder.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, message: `订单状态为${existingOrder.status}，只有待处理状态的订单可以删除` },
          { status: 400 }
        )
      }

      // 删除订单（级联删除明细）
      await prisma.outboundOrder.delete({
        where: { id: existingOrder.id },
      })

      return NextResponse.json({
        success: true,
        message: '订单删除成功',
      })
    } catch (error) {
      console.error('删除订单失败:', error)
      return NextResponse.json(
        { success: false, message: '删除订单失败' },
        { status: 500 }
      )
    }
  })
}
