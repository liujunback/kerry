import { AuthUser } from '@/lib/auth/middleware'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { prisma } from '@/lib/db/prisma'
import { updateManifestOrderStats } from '@/lib/services/checkout-service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const scanSchema = z.object({
  manifestOrderId: z.string().uuid('集运单ID格式错误'),
  checkoutNumber: z.string().min(1, '签出单号不能为空'),
})

const MANIFEST_MOUNT_EXECUTE_PERMISSION = 'manifest-mount:execute'

export async function handleManifestMountScan(
  request: NextRequest,
  auth: { user: AuthUser },
  options?: {
    requirePermission?: boolean
  }
) {
  try {
    if (options?.requirePermission) {
      const permissionResponse = await requirePermissionForUser(
        auth.user.id,
        MANIFEST_MOUNT_EXECUTE_PERMISSION
      )
      if (permissionResponse) {
        return permissionResponse
      }
    }

    const body = await request.json()
    const result = scanSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { manifestOrderId, checkoutNumber } = result.data
    const tenantId = auth.user.tenantId
    const userId = auth.user.id

    const mountResult = await prisma.$transaction(async (tx) => {
      const manifestOrder = await tx.manifestOrder.findFirst({
        where: {
          id: manifestOrderId,
          tenantId,
        },
        select: {
          id: true,
          status: true,
          warehouseId: true,
          channelCode: true,
          channelName: true,
        },
      })

      if (!manifestOrder) {
        throw new Error('集运单不存在')
      }

      if (manifestOrder.status === 'COMPLETED') {
        throw new Error('集运单已完结，不能重复集运')
      }

      if (manifestOrder.status === 'CANCELLED') {
        throw new Error('集运单已取消，无法挂载')
      }

      if (!['CREATED', 'IN_PROGRESS'].includes(manifestOrder.status)) {
        throw new Error(`集运单状态为 ${manifestOrder.status}，无法挂载`)
      }

      const checkoutOrder = await tx.checkoutOrder.findFirst({
        where: {
          tenantId,
          checkoutNumber,
        },
        select: {
          id: true,
          status: true,
          warehouseId: true,
          channelCode: true,
          channelName: true,
          manifestOrderId: true,
          orderCount: true,
          parcelCount: true,
          manifestOrder: {
            select: {
              manifestNumber: true,
            },
          },
        },
      })

      if (!checkoutOrder) {
        throw new Error('签出单不存在')
      }

      if (checkoutOrder.status !== 'CHECKED_OUT') {
        throw new Error(`签出单状态为 ${checkoutOrder.status}，只可挂载已签出的签出单`)
      }

      if (checkoutOrder.warehouseId !== manifestOrder.warehouseId) {
        throw new Error('签出单和集运单不在同一仓库')
      }

      if (manifestOrder.channelCode && checkoutOrder.channelCode !== manifestOrder.channelCode) {
        throw new Error(`渠道不一致，当前集运单渠道为 ${manifestOrder.channelName}`)
      }

      if (checkoutOrder.manifestOrderId) {
        const targetManifestNumber = checkoutOrder.manifestOrder?.manifestNumber || '未知集运单'
        throw new Error(`该签出单已挂载到集运单 ${targetManifestNumber}`)
      }

      const updatedCheckout = await tx.checkoutOrder.update({
        where: { id: checkoutOrder.id },
        data: {
          manifestOrderId,
          status: 'MOUNTED',
          mountedAt: new Date(),
          mountedBy: userId,
          updatedBy: userId,
        },
      })

      const checkoutRecords = await tx.checkoutRecord.findMany({
        where: { checkoutOrderId: checkoutOrder.id },
        select: { orderId: true },
      })

      const orderIds = [...new Set(checkoutRecords.map((record) => record.orderId))]

      if (orderIds.length > 0) {
        await tx.outboundOrder.updateMany({
          where: { id: { in: orderIds } },
          data: {
            manifestOrderId,
            updatedBy: userId,
          },
        })
      }

      return {
        checkoutOrder: updatedCheckout,
      }
    })

    await updateManifestOrderStats(manifestOrderId)

    const updatedManifest = await prisma.manifestOrder.findUnique({
      where: { id: manifestOrderId },
      select: {
        orderCount: true,
        parcelCount: true,
        containerCount: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        record: {
          checkoutOrderId: mountResult.checkoutOrder.id,
          checkoutNumber,
          channelName: mountResult.checkoutOrder.channelName,
          orderCount: mountResult.checkoutOrder.orderCount,
          parcelCount: mountResult.checkoutOrder.parcelCount,
          scannedAt: mountResult.checkoutOrder.mountedAt,
        },
        manifestOrderId,
        totalContainerCount: updatedManifest?.containerCount || 0,
        totalOrderCount: updatedManifest?.orderCount || 0,
        totalParcelCount: updatedManifest?.parcelCount || 0,
      },
      message: '挂载成功',
    })
  } catch (error) {
    console.error('Scan checkout order error:', error)
    const message = error instanceof Error ? error.message : '挂载失败'
    return NextResponse.json({ success: false, message }, { status: 400 })
  }
}
