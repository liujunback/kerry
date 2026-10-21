import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { extractInventoryCountLockMessage } from '@/lib/services/inventory-count-lock-guard'
import { transfer } from '@/lib/services/inventory-operation-service'
import { TransferStatus } from '@/lib/validations/inventory'
import { NextRequest, NextResponse } from 'next/server'
import { resolveScopedWarehouseId } from '@/lib/auth/user-warehouse'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/v1/inventory/transfers/[id]/execute
export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: RouteParams
) => {
  try {
    const { id } = await params
    const scopedWarehouseId = resolveScopedWarehouseId(auth.user)

    await prisma.$transaction(async (tx) => {
      const lockedRows = scopedWarehouseId
        ? await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM inventory_transfer
            WHERE id = ${id}
              AND tenant_id = ${auth.user.tenantId}
              AND warehouse_id = ${scopedWarehouseId}
            FOR UPDATE
          `
        : await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM inventory_transfer
            WHERE id = ${id}
              AND tenant_id = ${auth.user.tenantId}
            FOR UPDATE
          `

      if (lockedRows.length === 0) {
        throw new Error('TRANSFER_NOT_FOUND')
      }

      const transferOrder = await tx.inventoryTransfer.findFirst({
        where: {
          id,
          tenantId: auth.user.tenantId,
          ...(scopedWarehouseId ? { warehouseId: scopedWarehouseId } : {}),
        },
        include: {
          lines: {
            include: {
              sku: { select: { id: true, skuCode: true, clientId: true } },
              sourceLocation: { select: { id: true, locationCode: true } },
              targetLocation: { select: { id: true, locationCode: true } },
            },
          },
        },
      })

      if (!transferOrder) {
        throw new Error('TRANSFER_NOT_FOUND')
      }

      if (transferOrder.status !== TransferStatus.APPROVED) {
        throw new Error('TRANSFER_STATUS_INVALID')
      }

      for (const line of transferOrder.lines) {
        await transfer({
          tenantId: transferOrder.tenantId,
          clientId: line.sku?.clientId || '',
          warehouseId: transferOrder.warehouseId,
          sourceLocationId: line.sourceLocationId,
          targetLocationId: line.targetLocationId,
          skuId: line.skuId,
          skuCode: line.sku?.skuCode || '',
          quantity: line.quantity,
          batchNumber: line.batchNumber,
          referenceType: 'TRANSFER',
          referenceId: transferOrder.id,
          referenceNumber: transferOrder.transferNumber,
          operatorId: auth.user.id,
        }, tx)

        await tx.inventoryTransferLine.update({
          where: { id: line.id },
          data: {
            transferredQty: line.quantity,
            status: 'COMPLETED',
          },
        })
      }

      await tx.inventoryTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.COMPLETED,
          executedByUserId: auth.user.id,
          executedAt: new Date(),
        },
      })
    })

    const updatedTransfer = await prisma.inventoryTransfer.findFirst({
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
        },
      },
    })

    return NextResponse.json({ data: updatedTransfer })
  } catch (error) {
    const countLockMessage = extractInventoryCountLockMessage(error)
    if (countLockMessage) {
      return NextResponse.json(
        { error: countLockMessage },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'TRANSFER_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      )
    }

    if (error instanceof Error && error.message === 'TRANSFER_STATUS_INVALID') {
      return NextResponse.json(
        { error: 'Only approved transfers can be executed' },
        { status: 400 }
      )
    }

    console.error('Error executing transfer:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute transfer' },
      { status: 500 }
    )
  }
})
