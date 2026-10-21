import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// POST /api/v1/print-devices/[id]/test
// 返回设备配置，或接收前端本机插件测试结果并回写在线状态。
export const POST = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const device = await prisma.printDevice.findFirst({
      where: { id, tenantId: auth.user.tenantId },
      select: {
        id: true,
        connectionType: true,
        printerName: true,
        ipAddress: true,
        port: true,
        lastOnlineAt: true,
      },
    })

    if (!device) {
      return NextResponse.json({ success: false, message: '设备不存在' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    if (typeof body?.success === 'boolean') {
      const updatedDevice = await prisma.printDevice.update({
        where: { id: device.id },
        data: {
          isOnline: body.success,
          lastOnlineAt: body.success ? new Date() : device.lastOnlineAt,
        },
        select: {
          id: true,
          isOnline: true,
          lastOnlineAt: true,
        },
      })

      return NextResponse.json({ success: true, data: updatedDevice })
    }

    // 返回设备连接配置，由前端通过 WebSocket 中间件测试
    return NextResponse.json({
      success: true,
      data: {
        deviceId: device.id,
        deviceConfig: {
          connectionType: device.connectionType,
          printerName: device.printerName,
          ipAddress: device.ipAddress,
          port: device.port,
        },
      },
    })
  } catch (error) {
    console.error('获取设备配置失败:', error)
    return NextResponse.json({ success: false, message: '获取设备配置失败' }, { status: 500 })
  }
})
