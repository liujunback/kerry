import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { TransferStatus, updateTransferSchema } from '@/lib/validations/inventory'
import { NextRequest, NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/inventory/transfers/[id]
export const GET = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const transfer = await prisma.inventoryTransfer.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
      include: {
        warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
        lines: {
          include: {
            sku: { select: { id: true, skuCode: true, skuName: true } },
            sourceLocation: { select: { id: true, locationCode: true } },
            targetLocation: { select: { id: true, locationCode: true } },
          },
          orderBy: { lineNumber: 'asc' },
        },
      },
    })

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: transfer })
  } catch (error) {
    console.error('Error fetching transfer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transfer' },
      { status: 500 }
    )
  }
})

// PUT /api/v1/inventory/transfers/[id]
export const PUT = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)
    const body = await request.json()
    const data = updateTransferSchema.parse(body)

    const transfer = await prisma.inventoryTransfer.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
    })

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      )
    }

    if (transfer.status !== TransferStatus.DRAFT) {
      return NextResponse.json(
        { error: 'Only draft transfers can be updated' },
        { status: 400 }
      )
    }

    const updatedTransfer = await prisma.$transaction(async (tx) => {
      if (data.lines) {
        await tx.inventoryTransferLine.deleteMany({
          where: { transferId: id },
        })

        await tx.inventoryTransferLine.createMany({
          data: data.lines.map((line, index) => ({
            tenantId: transfer.tenantId,
            transferId: id,
            lineNumber: index + 1,
            skuId: line.skuId,
            sourceLocationId: line.sourceLocationId,
            targetLocationId: line.targetLocationId,
            batchNumber: line.batchNumber,
            quantity: line.quantity,
            reason: line.reason,
          })),
        })
      }

      return tx.inventoryTransfer.update({
        where: { id },
        data: {
          reason: data.reason,
          notes: data.notes,
          totalItems: data.lines?.length,
          totalQuantity: data.lines?.reduce((sum, line) => sum + line.quantity, 0),
        },
        include: {
          warehouse: { select: { id: true, warehouseName: true, warehouseCode: true } },
          lines: {
            include: {
              sku: { select: { id: true, skuCode: true, skuName: true } },
              sourceLocation: { select: { id: true, locationCode: true } },
              targetLocation: { select: { id: true, locationCode: true } },
            },
          },
        },
      })
    })

    return NextResponse.json({ data: updatedTransfer })
  } catch (error) {
    console.error('Error updating transfer:', error)
    return NextResponse.json(
      { error: 'Failed to update transfer' },
      { status: 500 }
    )
  }
})

// DELETE /api/v1/inventory/transfers/[id]
export const DELETE = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    const transfer = await prisma.inventoryTransfer.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
        ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
      },
    })

    if (!transfer) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      )
    }

    if (transfer.status !== TransferStatus.DRAFT) {
      return NextResponse.json(
        { error: 'Only draft transfers can be deleted' },
        { status: 400 }
      )
    }

    await prisma.inventoryTransfer.delete({ where: { id } })

    return NextResponse.json({ message: 'Transfer deleted successfully' })
  } catch (error) {
    console.error('Error deleting transfer:', error)
    return NextResponse.json(
      { error: 'Failed to delete transfer' },
      { status: 500 }
    )
  }
})
