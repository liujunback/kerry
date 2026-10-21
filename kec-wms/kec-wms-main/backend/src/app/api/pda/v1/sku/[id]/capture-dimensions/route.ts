import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const captureDimensionsSchema = z.object({
  isSelfPackaged: z.boolean().optional(),
  lengthCm: z.number().positive('长度必须大于0'),
  widthCm: z.number().positive('宽度必须大于0'),
  heightCm: z.number().positive('高度必须大于0'),
  weightKg: z.number().positive('重量必须大于0'),
})

// POST /api/pda/v1/sku/[id]/capture-dimensions - PDA 首次收货时补全 SKU 尺寸信息
export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const body = await request.json()
    const validationResult = captureDimensionsSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { isSelfPackaged, lengthCm, widthCm, heightCm, weightKg } = validationResult.data

    const existingSku = await prisma.sku.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!existingSku) {
      return NextResponse.json(
        { success: false, message: 'SKU不存在' },
        { status: 404 }
      )
    }

    const volumeCbm = (lengthCm * widthCm * heightCm) / 1000000

    const sku = await prisma.sku.update({
      where: { id },
      data: {
        ...(isSelfPackaged !== undefined && { isSelfPackaged }),
        lengthCm,
        widthCm,
        heightCm,
        weightKg,
        volumeCbm,
        isFirstReceiving: false,
        updatedBy: auth.user.id,
      },
      select: {
        id: true,
        skuCode: true,
        skuName: true,
        barcode: true,
        isBatchManaged: true,
        isSerialManaged: true,
        isExpiryManaged: true,
        isSelfPackaged: true,
        lengthCm: true,
        widthCm: true,
        heightCm: true,
        weightKg: true,
        volumeCbm: true,
        isFirstReceiving: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: sku,
      message: 'SKU尺寸信息已保存',
    })
  } catch (error) {
    console.error('PDA capture SKU dimensions failed:', error)
    return NextResponse.json(
      { success: false, message: '保存新品信息失败' },
      { status: 500 }
    )
  }
})
