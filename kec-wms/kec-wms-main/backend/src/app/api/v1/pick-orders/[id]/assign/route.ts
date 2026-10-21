import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { PICK_TASK_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'

const assignPickOrderSchema = z.object({
  userId: z.string().uuid('操作人不合法'),
})

export const POST = createAuthHandler(async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, 'picking:update')
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const { id } = await params
    const body = await request.json()
    const validation = assignPickOrderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0]?.message || '参数错误' },
        { status: 400 }
      )
    }

    const task = await prisma.pickOrder.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        taskNumber: true,
        status: true,
        warehouseId: true,
        assignedUserId: true,
      },
    })

    if (!task) {
      return NextResponse.json({ success: false, message: '拣货单不存在' }, { status: 404 })
    }

    if (!['PENDING', 'IN_PROGRESS'].includes(task.status)) {
      return NextResponse.json(
        { success: false, message: '当前状态不允许修改操作人' },
        { status: 400 }
      )
    }

    const pickerProfile = await prisma.pickerProfile.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        warehouseId: task.warehouseId,
        userId: validation.data.userId,
        isEnabled: true,
        allowPdaExecution: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
      },
    })

    if (!pickerProfile) {
      return NextResponse.json(
        { success: false, message: '所选操作人未启用该仓库的 PDA 拣货档案' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.pickOrder.update({
        where: { id: task.id },
        data: {
          assignedUserId: pickerProfile.userId,
          assignedAt: new Date(),
          assignmentSource: 'MANUAL',
          updatedBy: auth.user.id,
        },
      })

      await tx.operationLog.create({
        data: {
          tenantId: auth.user.tenantId,
          entityType: 'PICK_TASK',
          entityId: task.id,
          entityNumber: task.taskNumber,
          operationType: PICK_TASK_OPERATION_TYPES.ASSIGN.type,
          operationName: PICK_TASK_OPERATION_TYPES.ASSIGN.name,
          beforeStatus: task.status,
          afterStatus: task.status,
          remark: `修改操作人为 ${pickerProfile.user.fullName || pickerProfile.user.username}`,
          operatorId: auth.user.id,
          operatorName: auth.user.name || undefined,
          metadata: {
            previousAssignedUserId: task.assignedUserId,
            assignedUserId: pickerProfile.userId,
          },
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: '操作人修改成功',
    })
  } catch (error) {
    console.error('修改拣货单操作人失败:', error)
    return NextResponse.json({ success: false, message: '操作人修改失败' }, { status: 500 })
  }
})
