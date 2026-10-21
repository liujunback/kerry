import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { updatePrintDeviceSchema } from '@/lib/validations/print'
import { NextResponse } from 'next/server'

// GET /api/v1/print-devices/[id]
export const GET = createAuthHandler(async (_req, auth, context) => {
  try {
    const { id } = await context!.params
    const device = await prisma.printDevice.findFirst({
      where: { id, tenantId: auth.user.tenantId },
    })

    if (!device) {
      return NextResponse.json({ success: false, message: '设备不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: device })
  } catch (error) {
    console.error('获取打印设备失败:', error)
    return NextResponse.json({ success: false, message: '获取打印设备失败' }, { status: 500 })
  }
})

// PUT /api/v1/print-devices/[id]
export const PUT = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params
    const existing = await prisma.printDevice.findFirst({
      where: { id, tenantId: auth.user.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ success: false, message: '设备不存在' }, { status: 404 })
    }

    const body = await request.json()
    const result = updatePrintDeviceSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: '参数错误', errors: result.error.errors },
        { status: 400 }
      )
    }

    const updateData = result.data
    const printerName =
      updateData.printerName ??
      (updateData.connectionType === 'USB' || updateData.connectionType === 'BLUETOOTH'
        ? updateData.name ?? existing.name
        : updateData.connectionType === 'NETWORK'
          ? null
          : undefined)

    const device = await prisma.printDevice.update({
      where: { id },
      data: {
        ...updateData,
        ...(printerName !== undefined ? { printerName } : {}),
        // 虚拟打印机始终保持在线
        isOnline: existing.connectionType === 'VIRTUAL' ? true : existing.isOnline,
        lastOnlineAt: existing.connectionType === 'VIRTUAL' ? new Date() : existing.lastOnlineAt,
        updatedBy: auth.user.id,
      },
    })

    return NextResponse.json({ success: true, data: device, message: '设备更新成功' })
  } catch (error) {
    console.error('更新打印设备失败:', error)
    return NextResponse.json({ success: false, message: '更新打印设备失败' }, { status: 500 })
  }
})

// DELETE /api/v1/print-devices/[id]
export const DELETE = createAuthHandler(async (_req, auth, context) => {
  try {
    const { id } = await context!.params
    const existing = await prisma.printDevice.findFirst({
      where: { id, tenantId: auth.user.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ success: false, message: '设备不存在' }, { status: 404 })
    }

    // 软删除
    await prisma.printDevice.update({
      where: { id },
      data: { isActive: false, updatedBy: auth.user.id },
    })

    return NextResponse.json({ success: true, message: '设备已删除' })
  } catch (error) {
    console.error('删除打印设备失败:', error)
    return NextResponse.json({ success: false, message: '删除打印设备失败' }, { status: 500 })
  }
})
