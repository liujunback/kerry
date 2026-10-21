import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

const completeSchema = z.object({
  notes: z.string().optional(),
})

export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const tenantId = auth.user.tenantId
    const userId = auth.user.id
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const body = await request.json()
    const result = completeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { notes } = result.data

    const manifestOrder = await prisma.manifestOrder.findFirst({
      where: {
        id,
        tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
    })

    if (!manifestOrder) {
      return NextResponse.json(
        { success: false, error: 'Manifest order not found' },
        { status: 404 }
      )
    }

    if (manifestOrder.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: '总单已完结' },
        { status: 400 }
      )
    }

    if (manifestOrder.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: '总单已取消，无法完结' },
        { status: 400 }
      )
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const manifest = await tx.manifestOrder.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedBy: userId,
          notes: notes || manifestOrder.notes,
          updatedBy: userId,
        },
      })

      await tx.checkoutOrder.updateMany({
        where: {
          manifestOrderId: id,
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
      data: updatedOrder,
      message: '总单已完结',
    })
  } catch (error) {
    console.error('Failed to complete manifest order:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to complete manifest order' },
      { status: 500 }
    )
  }
})
