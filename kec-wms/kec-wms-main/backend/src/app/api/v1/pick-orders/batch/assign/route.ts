import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAuthHandler } from '@/lib/api/create-handler'
import { requirePermissionForUser } from '@/lib/auth/user-permissions'
import { PICK_TASK_OPERATION_TYPES } from '@/lib/constants/operation-types'
import { prisma } from '@/lib/db/prisma'

const batchAssignPickOrdersSchema = z.object({
  pickOrderIds: z.array(z.string().uuid('拣货单不合法')).min(1, '请先选择拣货单'),
  userId: z.string().uuid('拣货人不合法'),
})

export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  const permissionResponse = await requirePermissionForUser(auth.user.id, 'picking:update')
  if (permissionResponse) {
    return permissionResponse
  }

  try {
    const validation = batchAssignPickOrdersSchema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0]?.message || '参数错误' },
        { status: 400 },
      )
    }

    const pickOrderIds = [...new Set(validation.data.pickOrderIds)]
    const tasks = await prisma.pickOrder.findMany({
      where: {
        id: { in: pickOrderIds },
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

    if (tasks.length !== pickOrderIds.length) {
      return NextResponse.json({ success: false, message: '部分拣货单不存在' }, { status: 404 })
    }

    const lockedTasks = tasks.filter((task) => !['PENDING', 'IN_PROGRESS'].includes(task.status))
    if (lockedTasks.length > 0) {
      return NextResponse.json(
        { success: false, message: `以下拣货单当前状态不允许修改拣货人: ${lockedTasks.map((task) => task.taskNumber).join(', ')}` },
        { status: 400 },
      )
    }

    const warehouseIds = [...new Set(tasks.map((task) => task.warehouseId))]
    if (warehouseIds.length !== 1) {
      return NextResponse.json(
        { success: false, message: '批量修改拣货人仅支持同一仓库的拣货单' },
        { status: 400 },
      )
    }

    const pickerProfile = await prisma.pickerProfile.findFirst({
      where: {
        tenantId: auth.user.tenantId,
        warehouseId: warehouseIds[0],
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
        { success: false, message: '所选拣货人未启用该仓库的 PDA 拣货档案' },
        { status: 400 },
      )
    }

    const assignedAt = new Date()
    const assignedUserName = pickerProfile.user.fullName || pickerProfile.user.username

    await prisma.$transaction(async (tx) => {
      await tx.pickOrder.updateMany({
        where: {
          id: { in: pickOrderIds },
          tenantId: auth.user.tenantId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        data: {
          assignedUserId: pickerProfile.userId,
          assignedAt,
          assignmentSource: 'MANUAL',
          updatedBy: auth.user.id,
        },
      })

      await tx.operationLog.createMany({
        data: tasks.map((task) => ({
          tenantId: auth.user.tenantId,
          entityType: 'PICK_TASK',
          entityId: task.id,
          entityNumber: task.taskNumber,
          operationType: PICK_TASK_OPERATION_TYPES.ASSIGN.type,
          operationName: PICK_TASK_OPERATION_TYPES.ASSIGN.name,
          beforeStatus: task.status,
          afterStatus: task.status,
          remark: `批量修改拣货人为 ${assignedUserName}`,
          operatorId: auth.user.id,
          operatorName: auth.user.name || undefined,
          metadata: {
            previousAssignedUserId: task.assignedUserId,
            assignedUserId: pickerProfile.userId,
          },
        })),
      })
    })

    return NextResponse.json({
      success: true,
      message: '拣货人修改成功',
      data: {
        updatedCount: tasks.length,
        assignedUser: pickerProfile.user,
      },
    })
  } catch (error) {
    console.error('批量修改拣货人失败:', error)
    return NextResponse.json({ success: false, message: '批量修改拣货人失败' }, { status: 500 })
  }
})
