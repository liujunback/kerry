import { AuthUser } from '@/lib/auth/middleware'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const validateSchema = z.object({
  manifestNumber: z.string().min(1, '集运单号不能为空'),
})

const MANIFEST_MOUNT_EXECUTE_PERMISSION = 'manifest-mount:execute'

export async function handleManifestMountValidate(
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
    const result = validateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { manifestNumber } = result.data
    const tenantId = auth.user.tenantId

    const manifestOrder = await prisma.manifestOrder.findFirst({
      where: {
        tenantId,
        manifestNumber: {
          contains: manifestNumber,
        },
      },
      include: {
        warehouse: {
          select: {
            id: true,
            warehouseName: true,
            warehouseCode: true,
          },
        },
        checkoutOrders: {
          where: { status: { in: ['MOUNTED', 'MANIFESTED'] } },
          select: {
            id: true,
            checkoutNumber: true,
            channelName: true,
            orderCount: true,
            parcelCount: true,
            mountedAt: true,
          },
          orderBy: { mountedAt: 'asc' },
        },
      },
    })

    if (!manifestOrder) {
      return NextResponse.json(
        { success: false, message: '集运单不存在' },
        { status: 400 }
      )
    }

    if (manifestOrder.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, message: '集运单已完结，不能重复集运' },
        { status: 400 }
      )
    }

    if (manifestOrder.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, message: '集运单已取消，无法挂载' },
        { status: 400 }
      )
    }

    if (!['CREATED', 'IN_PROGRESS'].includes(manifestOrder.status)) {
      return NextResponse.json(
        { success: false, message: `集运单状态为 ${manifestOrder.status}，无法挂载` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: manifestOrder.id,
        manifestNumber: manifestOrder.manifestNumber,
        channelCode: manifestOrder.channelCode,
        channelName: manifestOrder.channelName,
        warehouseId: manifestOrder.warehouseId,
        warehouseName: manifestOrder.warehouse.warehouseName,
        status: manifestOrder.status,
        orderCount: manifestOrder.orderCount,
        parcelCount: manifestOrder.parcelCount,
        containerCount: manifestOrder.containerCount,
        records: manifestOrder.checkoutOrders.map((co) => ({
          checkoutOrderId: co.id,
          checkoutNumber: co.checkoutNumber,
          channelName: co.channelName,
          orderCount: co.orderCount,
          parcelCount: co.parcelCount,
          scannedAt: co.mountedAt,
        })),
      },
    })
  } catch (error) {
    console.error('Validate manifest order error:', error)
    return NextResponse.json(
      { success: false, message: '校验失败' },
      { status: 500 }
    )
  }
}
