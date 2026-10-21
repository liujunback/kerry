import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { batchAssignRolesSchema } from '@/lib/validations/user'
import { clearRolePermissionCache } from '@/lib/cache/permission-cache'

interface AssignmentResult {
  roleId: string
  roleName: string
  status: 'success' | 'skipped' | 'failed'
  userRoleId?: string
  reason?: string
}

interface UserResult {
  userId: string
  username: string
  assignments: AssignmentResult[]
}

interface BatchResult {
  summary: {
    totalUsers: number
    totalAssignments: number
    successful: number
    skipped: number
    failed: number
  }
  results: UserResult[]
}

// POST /api/v1/users/batch/roles - 批量分配角色
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validationResult = batchAssignRolesSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: '参数错误',
          errors: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { userIds, assignments, skipExisting, continueOnError } = validationResult.data
    const tenantId = auth.user.tenantId

    const [users, roles] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: { in: userIds },
          tenantId,
        },
        select: { id: true, username: true },
      }),
      prisma.role.findMany({
        where: {
          id: { in: assignments.map((a) => a.roleId) },
          tenantId,
          isActive: true,
        },
        select: { id: true, roleName: true },
      }),
    ])

    const userMap = new Map(users.map((u) => [u.id, u]))
    const roleMap = new Map(roles.map((r) => [r.id, r]))

    const existingAssignments = await prisma.userRole.findMany({
      where: {
        userId: { in: userIds },
        roleId: { in: assignments.map((a) => a.roleId) },
        isActive: true,
      },
      select: {
        userId: true,
        roleId: true,
        scopeType: true,
        scopeId: true,
      },
    })

    const existingSet = new Set(
      existingAssignments.map(
        (ea) => `${ea.userId}:${ea.roleId}:${ea.scopeType}:${ea.scopeId || 'null'}`
      )
    )

    const results: UserResult[] = []
    const toCreate: Array<{
      tenantId: string
      userId: string
      roleId: string
      scopeType: string
      scopeId: string | null
      isPrimary: boolean
      effectiveDate: Date | null
      expiresAt: Date | null
      assignedBy: string
      isActive: boolean
    }> = []

    let successful = 0
    let skipped = 0
    let failed = 0

    for (const userId of userIds) {
      const user = userMap.get(userId)
      const userResult: UserResult = {
        userId,
        username: user?.username || 'Unknown',
        assignments: [],
      }

      for (const assignment of assignments) {
        const role = roleMap.get(assignment.roleId)
        const assignmentKey = `${userId}:${assignment.roleId}:${assignment.scopeType}:${assignment.scopeId || 'null'}`

        if (!user) {
          userResult.assignments.push({
            roleId: assignment.roleId,
            roleName: role?.roleName || 'Unknown',
            status: 'failed',
            reason: '用户不存在',
          })
          failed++
          if (!continueOnError) {
            return NextResponse.json(
              {
                success: false,
                message: '批量分配失败',
                data: { failedAt: { userId, roleId: assignment.roleId, reason: '用户不存在' } },
              },
              { status: 400 }
            )
          }
          continue
        }

        if (!role) {
          userResult.assignments.push({
            roleId: assignment.roleId,
            roleName: 'Unknown',
            status: 'failed',
            reason: '角色不存在',
          })
          failed++
          if (!continueOnError) {
            return NextResponse.json(
              {
                success: false,
                message: '批量分配失败',
                data: { failedAt: { userId, roleId: assignment.roleId, reason: '角色不存在' } },
              },
              { status: 400 }
            )
          }
          continue
        }

        if (existingSet.has(assignmentKey)) {
          if (skipExisting) {
            userResult.assignments.push({
              roleId: assignment.roleId,
              roleName: role.roleName,
              status: 'skipped',
              reason: '角色已分配',
            })
            skipped++
          } else {
            userResult.assignments.push({
              roleId: assignment.roleId,
              roleName: role.roleName,
              status: 'failed',
              reason: '角色已分配',
            })
            failed++
            if (!continueOnError) {
              return NextResponse.json(
                {
                  success: false,
                  message: '批量分配失败',
                  data: { failedAt: { userId, roleId: assignment.roleId, reason: '角色已分配' } },
                },
                { status: 400 }
              )
            }
          }
          continue
        }

        toCreate.push({
          tenantId,
          userId,
          roleId: assignment.roleId,
          scopeType: assignment.scopeType,
          scopeId: assignment.scopeId || null,
          isPrimary: assignment.isPrimary,
          effectiveDate: assignment.effectiveDate ? new Date(assignment.effectiveDate) : null,
          expiresAt: assignment.expiresAt ? new Date(assignment.expiresAt) : null,
          assignedBy: auth.user.id,
          isActive: true,
        })

        userResult.assignments.push({
          roleId: assignment.roleId,
          roleName: role.roleName,
          status: 'success',
        })
        successful++
      }

      results.push(userResult)
    }

    if (toCreate.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.userRole.createMany({
          data: toCreate,
          skipDuplicates: true,
        })
      })

      clearRolePermissionCache(userIds)
    }

    const response: BatchResult = {
      summary: {
        totalUsers: userIds.length,
        totalAssignments: userIds.length * assignments.length,
        successful,
        skipped,
        failed,
      },
      results,
    }

    return NextResponse.json({
      success: true,
      message: '批量分配角色完成',
      data: response,
    })
  } catch (error) {
    console.error('批量分配角色失败:', error)
    return NextResponse.json(
      { success: false, message: '批量分配角色失败' },
      { status: 500 }
    )
  }
})
