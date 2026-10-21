import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { createPrintDeviceSchema,printDeviceListQuerySchema } from '@/lib/validations/print'
import { NextResponse } from 'next/server'

// GET /api/v1/print-devices
export const GET = createAuthHandler(async (request, auth) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryResult = printDeviceListQuerySchema.safeParse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      connectionType: searchParams.get('connectionType'),
    })

    if (!queryResult.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: queryResult.error.errors },
        { status: 400 }
      )
    }

    const { page, pageSize, connectionType } = queryResult.data
    const where: Record<string, unknown> = {
      tenantId: auth.user.tenantId,
      isActive: true,
    }
    if (connectionType) where.connectionType = connectionType

    const total = await prisma.printDevice.count({ where })
    const devices = await prisma.printDevice.findMany({
      where,
      select: {
        id: true,
        name: true,
        deviceType: true,
        connectionType: true,
        printerName: true,
        ipAddress: true,
        port: true,
        location: true,
        charset: true,
        dpi: true,
        isOnline: true,
        lastOnlineAt: true,
        createdAt: true,
      },
      orderBy: [{ isOnline: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: devices,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (error) {
    console.error('获取打印设备列表失败:', error)
    return NextResponse.json({ success: false, message: '获取打印设备列表失败' }, { status: 500 })
  }
})

// POST /api/v1/print-devices
export const POST = createAuthHandler(async (request, auth) => {
  try {
    const body = await request.json()
    const result = createPrintDeviceSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: result.error.errors },
        { status: 400 }
      )
    }

    const data = result.data
    const printerName =
      data.printerName ?? (data.connectionType === 'USB' || data.connectionType === 'BLUETOOTH' ? data.name : null)

    const device = await prisma.printDevice.create({
      data: {
        tenantId: auth.user.tenantId,
        name: data.name,
        deviceType: data.deviceType,
        connectionType: data.connectionType,
        printerName,
        ipAddress: data.ipAddress ?? null,
        port: data.port ?? null,
        location: data.location ?? null,
        charset: data.charset,
        dpi: data.dpi,
        // 虚拟打印机自动标记为在线
        isOnline: data.connectionType === 'VIRTUAL',
        lastOnlineAt: data.connectionType === 'VIRTUAL' ? new Date() : null,
        createdBy: auth.user.id,
      },
    })

    return NextResponse.json({ success: true, data: device, message: '设备添加成功' })
  } catch (error) {
    console.error('添加打印设备失败:', error)
    return NextResponse.json({ success: false, message: '添加打印设备失败' }, { status: 500 })
  }
})
