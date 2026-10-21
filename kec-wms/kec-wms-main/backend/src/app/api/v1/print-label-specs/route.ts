import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { createPrintLabelSpecSchema, printLabelSpecListQuerySchema } from '@/lib/validations/print'
import { NextResponse } from 'next/server'

function normalizeSizePart(value: number) {
  return String(value).replace(/\D+/g, '_')
}

async function buildCustomSpecCode(tenantId: string, widthMm: number, heightMm: number, orientation: string) {
  const base = `CUSTOM_${normalizeSizePart(widthMm)}X${normalizeSizePart(heightMm)}_${orientation.toUpperCase()}`
  const existing = await prisma.printLabelSpec.findFirst({
    where: { tenantId, code: base },
    select: { id: true },
  })

  return existing ? `${base}_${Date.now()}` : base
}

export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = printLabelSpecListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize } = queryResult.data
    const where = { tenantId: auth.user.tenantId, isActive: true }
    const total = await prisma.printLabelSpec.count({ where })
    const specs = await prisma.printLabelSpec.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        widthMm: true,
        heightMm: true,
        orientation: true,
        isSystem: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: specs,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    console.error('获取标签规格失败:', error)
    return NextResponse.json({ success: false, message: '获取标签规格失败' }, { status: 500 })
  }
})

export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const result = createPrintLabelSpecSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: result.error.errors },
        { status: 400 }
      )
    }

    const data = result.data
    const code = await buildCustomSpecCode(auth.user.tenantId, data.widthMm, data.heightMm, data.orientation)
    const spec = await prisma.printLabelSpec.create({
      data: {
        tenantId: auth.user.tenantId,
        code,
        name: data.name,
        widthMm: data.widthMm,
        heightMm: data.heightMm,
        orientation: data.orientation,
        isSystem: false,
        createdBy: auth.user.id,
      },
    })

    return NextResponse.json({ success: true, data: spec, message: '标签规格已创建' })
  } catch (error) {
    console.error('创建标签规格失败:', error)
    return NextResponse.json({ success: false, message: '创建标签规格失败' }, { status: 500 })
  }
})
