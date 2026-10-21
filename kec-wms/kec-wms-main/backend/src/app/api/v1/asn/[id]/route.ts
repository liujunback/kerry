import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updateAsnSchema } from '@/lib/validations/asn'
import { serializeAsn } from '@/lib/asn/response-serializer'
import { NextResponse } from 'next/server'

// GET /api/v1/asn/[id] - 获取ASN详情
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    const asn = await prisma.asn.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        asnNumber: true,
        externalNumber: true,
        asnType: true,
        status: true,
        expectedArrivalDate: true,
        expectedArrivalTime: true,
        expectedPutawayDate: true,
        actualArrivalAt: true,
        receivingStartAt: true,
        receivingEndAt: true,
        putawayStartAt: true,
        putawayEndAt: true,
        completedAt: true,
        signedAt: true,
        totalExpectedQty: true,
        totalReceivedQty: true,
        totalPutawayQty: true,
        totalExpectedLines: true,
        totalReceivedLines: true,
        notes: true,
        config: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
        asnLines: {
          select: {
            id: true,
            lineNumber: true,
            skuId: true,
            skuCode: true,
            skuName: true,
            expectedQty: true,
            receivedQty: true,
            putawayQty: true,
            uomId: true,
            uomCode: true,
            batchNumber: true,
            expiryDate: true,
            status: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            sku: {
              select: {
                id: true,
                skuCode: true,
                skuName: true,
                barcode: true,
                isBatchManaged: true,
                isSerialManaged: true,
                isExpiryManaged: true,
                shelfLifeWarningDays: true,
                unit: true,
              },
            },
          },
          orderBy: {
            lineNumber: 'asc',
          },
        },
      },
    })

    if (!asn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: serializeAsn(asn),
    })
  } catch (error) {
    console.error('获取ASN详情失败:', error)
    return NextResponse.json(
      { success: false, message: '获取ASN详情失败' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/asn/[id] - 更新ASN
export const PUT = createAuthHandler(async (request, auth, context) => {
  console.log('[ASN API] PUT request received')
  console.log('[ASN API] prisma type:', typeof prisma)
  console.log('[ASN API] prisma has $extends:', '$extends' in prisma)
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = updateAsnSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // 检查ASN是否存在
    const existingAsn = await prisma.asn.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingAsn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查状态是否允许修改
    if (!['CREATED', 'PENDING_RECEIVING'].includes(existingAsn.status)) {
      return NextResponse.json(
        {
          success: false,
          message: '当前状态不允许修改ASN',
          code: 'ASN_STATUS_INVALID',
        },
        { status: 400 }
      )
    }

    console.log('[ASN API] Calling prisma.asn.update for id:', id)
    const asn = await prisma.asn.update({
      where: { id },
      data: {
          ...data,
          config: data.config as object | undefined,
          updatedBy: auth.user.id,
        },
      select: {
        id: true,
        asnNumber: true,
        externalNumber: true,
        asnType: true,
        status: true,
        expectedArrivalDate: true,
        notes: true,
        config: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            warehouseCode: true,
            warehouseName: true,
          },
        },
      },
    })
    console.log('[ASN API] prisma.asn.update completed for id:', id)

    return NextResponse.json({
      success: true,
      data: asn,
      message: 'ASN更新成功',
      _debug: { prismaUpdateCalled: true, asnId: id },
    })
  } catch (error) {
    console.error('更新ASN失败:', error)
    return NextResponse.json(
      { success: false, message: '更新ASN失败' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/asn/[id] - 删除ASN
export const DELETE = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    // 检查ASN是否存在
    const existingAsn = await prisma.asn.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingAsn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在', code: 'ASN_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 只有CREATED状态的ASN可以删除
    if (existingAsn.status !== 'CREATED') {
      return NextResponse.json(
        {
          success: false,
          message: '只有已创建状态的ASN可以删除',
          code: 'ASN_STATUS_INVALID',
        },
        { status: 400 }
      )
    }

    // 删除ASN（级联删除明细）
    await prisma.asn.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'ASN删除成功',
    })
  } catch (error) {
    console.error('删除ASN失败:', error)
    return NextResponse.json(
      { success: false, message: '删除ASN失败' },
      { status: 500 }
    )
  }
})
