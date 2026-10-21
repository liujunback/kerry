import { NextRequest, NextResponse } from 'next/server'
import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { batchBindUserWarehouseSchema } from '@/lib/validations/user'

interface WarehouseBindingResult {
  warehouseId: string
  warehouseCode: string
  warehouseName: string
  status: 'success' | 'skipped' | 'failed'
  isDefault?: boolean
  reason?: string
}

interface UserResult {
  userId: string
  username: string
  bindings: WarehouseBindingResult[]
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

// POST /api/v1/users/batch/warehouses - 批量绑定仓库
export const POST = createAuthHandler(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const validationResult = batchBindUserWarehouseSchema.safeParse(body)

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

    const { userIds, warehouseIds, defaultWarehouseId, skipExisting, continueOnError } = validationResult.data
    const tenantId = auth.user.tenantId

    const [users, warehouses] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: { in: userIds },
          tenantId,
        },
        select: { id: true, username: true },
      }),
      prisma.warehouse.findMany({
        where: {
          id: { in: warehouseIds },
          tenantId,
        },
        select: {
          id: true,
          warehouseCode: true,
          warehouseName: true,
        },
      }),
    ])

    if (warehouses.length !== warehouseIds.length) {
      return NextResponse.json(
        { success: false, message: '部分仓库不存在' },
        { status: 404 }
      )
    }

    const userMap = new Map(users.map((user) => [user.id, user]))
    const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]))
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
        for (const warehouseId of warehouseIds) {
          const warehouse = warehouseMap.get(warehouseId)
          if (!warehouse) continue
          userResult.bindings.push({
            warehouseId: warehouse.id,
            warehouseCode: warehouse.warehouseCode,
            warehouseName: warehouse.warehouseName,
            status: 'failed',
            reason: '用户不存在',
          })
          failed++
        }
        results.push(userResult)

        if (!continueOnError) {
          return NextResponse.json(
            {
              success: false,
              message: '批量绑定仓库失败',
              data: {
                failedAt: {
                  userId,
                  warehouseId: warehouseIds[0],
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
        const currentBindings = await prisma.userWarehouse.findMany({
          where: {
            tenantId,
            userId,
          },
          select: {
            id: true,
            warehouseId: true,
            isDefault: true,
            isActive: true,
          },
        })

        const hasActiveDefault = currentBindings.some((binding) => binding.isActive && binding.isDefault)
        const targetDefaultWarehouseId = defaultWarehouseId
          || (!hasActiveDefault ? warehouseIds[0] : null)

        for (const warehouseId of warehouseIds) {
          const warehouse = warehouseMap.get(warehouseId)
          if (!warehouse) {
            userResult.bindings.push({
              warehouseId,
              warehouseCode: 'Unknown',
              warehouseName: 'Unknown',
              status: 'failed',
              reason: '仓库不存在',
            })
            failed++
            continue
          }

          const existingBinding = currentBindings.find((binding) => binding.warehouseId === warehouseId)
          const nextIsDefault = targetDefaultWarehouseId
            ? warehouseId === targetDefaultWarehouseId
            : existingBinding?.isDefault ?? false
          const bindingAlreadySatisfied =
            existingBinding?.isActive &&
            existingBinding.isDefault === nextIsDefault

          if (bindingAlreadySatisfied) {
            if (skipExisting) {
              userResult.bindings.push({
                warehouseId: warehouse.id,
                warehouseCode: warehouse.warehouseCode,
                warehouseName: warehouse.warehouseName,
                status: 'skipped',
                isDefault: nextIsDefault,
                reason: '仓库已绑定',
              })
              skipped++
              continue
            }

            userResult.bindings.push({
              warehouseId: warehouse.id,
              warehouseCode: warehouse.warehouseCode,
              warehouseName: warehouse.warehouseName,
              status: 'failed',
              isDefault: nextIsDefault,
              reason: '仓库已绑定',
            })
            failed++
            if (!continueOnError) {
              return NextResponse.json(
                {
                  success: false,
                  message: '批量绑定仓库失败',
                  data: {
                    failedAt: {
                      userId,
                      warehouseId: warehouse.id,
                      reason: '仓库已绑定',
                    },
                  },
                },
                { status: 400 }
              )
            }
            continue
          }

          await prisma.$transaction(async (tx) => {
            if (targetDefaultWarehouseId && nextIsDefault) {
              await tx.userWarehouse.updateMany({
                where: {
                  tenantId,
                  userId,
                  isActive: true,
                },
                data: {
                  isDefault: false,
                  updatedBy: auth.user.id,
                },
              })
            }

            if (existingBinding) {
              await tx.userWarehouse.update({
                where: { id: existingBinding.id },
                data: {
                  isActive: true,
                  isDefault: nextIsDefault,
                  updatedBy: auth.user.id,
                },
              })
            } else {
              await tx.userWarehouse.create({
                data: {
                  tenantId,
                  userId,
                  warehouseId,
                  isDefault: nextIsDefault,
                  isActive: true,
                  createdBy: auth.user.id,
                  updatedBy: auth.user.id,
                },
              })
            }
          })

          userResult.bindings.push({
            warehouseId: warehouse.id,
            warehouseCode: warehouse.warehouseCode,
            warehouseName: warehouse.warehouseName,
            status: 'success',
            isDefault: nextIsDefault,
          })
          successful++
        }
      } catch (error) {
        console.error(`批量绑定仓库失败，用户 ${userId}:`, error)
        for (const warehouseId of warehouseIds) {
          const warehouse = warehouseMap.get(warehouseId)
          if (!warehouse) continue
          userResult.bindings.push({
            warehouseId: warehouse.id,
            warehouseCode: warehouse.warehouseCode,
            warehouseName: warehouse.warehouseName,
            status: 'failed',
            reason: '系统错误',
          })
          failed++
        }

        if (!continueOnError) {
          return NextResponse.json(
            {
              success: false,
              message: '批量绑定仓库失败',
              data: {
                failedAt: {
                  userId,
                  warehouseId: warehouseIds[0],
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
      message: '批量绑定仓库完成',
      data: response,
    })
  } catch (error) {
    console.error('批量绑定仓库失败:', error)
    return NextResponse.json(
      { success: false, message: '批量绑定仓库失败' },
      { status: 500 }
    )
  }
})
