import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/middleware'
import { createHandler } from '@/lib/api/create-handler'

// GET /api/v1/shelving/sku?barcode=xxx
export const GET = createHandler(async (request) => {
  const authResult = await requireAuth(request)
  if (authResult instanceof Response) {
    return authResult
  }

  const tenantId = authResult.user.tenantId
  const searchParams = request.nextUrl.searchParams
  const barcode = searchParams.get('barcode')

  if (!barcode) {
    return NextResponse.json(
      { success: false, message: '缺少条码参数' },
      { status: 400 }
    )
  }

  const sku = await prisma.sku.findFirst({
    where: {
      tenantId,
      status: 'ACTIVE',
      OR: [{ barcode }, { skuCode: barcode }],
    },
    select: {
      id: true,
      skuCode: true,
      skuName: true,
      barcode: true,
      isSerialManaged: true,
      clientId: true,
    },
  })

  if (!sku) {
    return NextResponse.json(
      { success: false, message: 'SKU不存在' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    data: sku,
  })
})
