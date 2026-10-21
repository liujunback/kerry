import { AuthUser } from '@/lib/auth/middleware'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const confirmSchema = z.object({
  manifestOrderId: z.string().uuid('集运单ID格式错误'),
})

const MANIFEST_MOUNT_EXECUTE_PERMISSION = 'manifest-mount:execute'

export async function handleManifestMountConfirm(
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
    const result = confirmSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { manifestOrderId } = result.data
    const tenantId = auth.user.tenantId
    const userId = auth.user.id

    const manifestOrder = await prisma.manifestOrder.findFirst({
      where: {
        id: manifestOrderId,
        tenantId,
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
        { success: false, message: '集运单已完结' },
        { status: 400 }
      )
    }

    if (manifestOrder.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, message: '集运单已取消，无法完结' },
        { status: 400 }
      )
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const manifest = await tx.manifestOrder.update({
        where: { id: manifestOrderId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedBy: userId,
          updatedBy: userId,
        },
      })

      await tx.checkoutOrder.updateMany({
        where: {
          manifestOrderId,
          status: 'MOUNTED',
        },
        data: {
          status: 'MANIFESTED',
          manifestedAt: new Date(),
          manifestedBy: userId,
          updatedBy: userId,
        },
      })

      return manifest
    })

    return NextResponse.json({
      success: true,
      data: {
        manifestNumber: updatedOrder.manifestNumber,
        containerCount: updatedOrder.containerCount,
        orderCount: updatedOrder.orderCount,
        parcelCount: updatedOrder.parcelCount,
      },
      message: '集运完成',
    })
  } catch (error) {
    console.error('Confirm manifest mount error:', error)
    return NextResponse.json(
      { success: false, message: '操作失败' },
      { status: 500 }
    )
  }
}
