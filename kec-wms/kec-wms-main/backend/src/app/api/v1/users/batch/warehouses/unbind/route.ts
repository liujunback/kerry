import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { batchUnbindUserWarehouseSchema } from '@/lib/validations/user'

interface WarehouseUnbindingResult {
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  status: 'success' | 'skipped' | 'failed'
  defaultWarehouseId?: string | null
  reason?: string
}

interface UserResult {
  userId: string
  username: string
  bindings: WarehouseUnbindingResult[]
}

interface BatchResult {
  summary: {
    totalUsers: number
    successful: number
    skipped: number
    failed: number
  }
  results: UserResult[]
}

// POST /api/v1/users/batch/warehouses/unbind - 批量解绑仓库
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validationResult = batchUnbindUserWarehouseSchema.safeParse(body)

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

    const { userIds, warehouseId, skipMissing, continueOnError } = validationResult.data
    const tenantId = auth.user.tenantId

    const [users, warehouse] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: { in: userIds },
          tenantId,
        },
        select: { id: true, username: true },
      }),
      prisma.warehouse.findFirst({
        where: {
          id: warehouseId,
          tenantId,
        },
        select: {
          id: true,
          warehouseCode: true,
          warehouseName: true,
        },
      }),
    ])

    if (!warehouse) {
      return NextResponse.json(
        { success: false, message: '仓库不存在' },
        { status: 404 }
      )
    }

    const userMap = new Map(users.map((user) => [user.id, user]))
    const results: UserResult[] = []

    let successful = 0
    let skipped = 0
    let failed = 0

    for (const userId of userIds) {
      const user = userMap.get(userId)
      const userResult: UserResult = {
        userId,
        username: user?.username || 'Unknown',
        bindings: [],
      }

      if (!user) {
        userResult.bindings.push({
          warehouseId: warehouse.id,
          warehouseCode: warehouse.warehouseCode,
          warehouseName: warehouse.warehouseName,
          status: 'failed',
          reason: '用户不存在',
        })
        failed++
        results.push(userResult)

        if (!continueOnError) {
          return NextResponse.json(
            {
              success: false,
              message: '批量解绑仓库失败',
              data: {
                failedAt: {
                  userId,
                  warehouseId: warehouse.id,
                  reason: '用户不存在',
                },
              },
            },
            { status: 400 }
          )
        }

        continue
      }

      try {
        const binding = await prisma.userWarehouse.findFirst({
          where: {
            tenantId,
            userId,
            warehouseId,
            isActive: true,
          },
          select: {
            id: true,
            isDefault: true,
          },
        })

        if (!binding) {
          if (skipMissing) {
            userResult.bindings.push({
              warehouseId: warehouse.id,
              warehouseCode: warehouse.warehouseCode,
              warehouseName: warehouse.warehouseName,
              status: 'skipped',
              reason: '仓库未绑定',
            })
            skipped++
            results.push(userResult)
            continue
          }

          userResult.bindings.push({
            warehouseId: warehouse.id,
            warehouseCode: warehouse.warehouseCode,
            warehouseName: warehouse.warehouseName,
            status: 'failed',
            reason: '仓库未绑定',
          })
          failed++
          results.push(userResult)

          if (!continueOnError) {
            return NextResponse.json(
              {
                success: false,
                message: '批量解绑仓库失败',
                data: {
                  failedAt: {
                    userId,
                    warehouseId: warehouse.id,
                    reason: '仓库未绑定',
                  },
                },
              },
              { status: 400 }
            )
          }

          continue
        }

        const nextDefaultWarehouseId = await prisma.$transaction(async (tx) => {
          await tx.userWarehouse.update({
            where: { id: binding.id },
            data: {
              isActive: false,
              isDefault: false,
              updatedBy: auth.user.id,
            },
          })

          if (!binding.isDefault) {
            const remainingDefault = await tx.userWarehouse.findFirst({
              where: {
                tenantId,
                userId,
                isActive: true,
                isDefault: true,
              },
              select: {
                warehouseId: true,
              },
            })

            return remainingDefault?.warehouseId || null
          }

          const nextBinding = await tx.userWarehouse.findFirst({
            where: {
              tenantId,
              userId,
              isActive: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              id: true,
              warehouseId: true,
            },
          })

          if (nextBinding) {
            await tx.userWarehouse.update({
              where: { id: nextBinding.id },
              data: {
                isDefault: true,
                updatedBy: auth.user.id,
              },
            })
          }

          return nextBinding?.warehouseId || null
        })

        userResult.bindings.push({
          warehouseId: warehouse.id,
          warehouseCode: warehouse.warehouseCode,
          warehouseName: warehouse.warehouseName,
          status: 'success',
          defaultWarehouseId: nextDefaultWarehouseId,
        })
        successful++
      } catch (error) {
        console.error(`批量解绑仓库失败，用户 ${userId}:`, error)
        userResult.bindings.push({
          warehouseId: warehouse.id,
          warehouseCode: warehouse.warehouseCode,
          warehouseName: warehouse.warehouseName,
          status: 'failed',
          reason: '系统错误',
        })
        failed++

        if (!continueOnError) {
          return NextResponse.json(
            {
              success: false,
              message: '批量解绑仓库失败',
              data: {
                failedAt: {
                  userId,
                  warehouseId: warehouse.id,
                  reason: '系统错误',
                },
              },
            },
            { status: 500 }
          )
        }
      }

      results.push(userResult)
    }

    const response: BatchResult = {
      summary: {
        totalUsers: userIds.length,
        successful,
        skipped,
        failed,
      },
      results,
    }

    return NextResponse.json({
      success: true,
      message: '批量解绑仓库完成',
      data: response,
    })
  } catch (error) {
    console.error('批量解绑仓库失败:', error)
    return NextResponse.json(
      { success: false, message: '批量解绑仓库失败' },
      { status: 500 }
    )
  }
})
