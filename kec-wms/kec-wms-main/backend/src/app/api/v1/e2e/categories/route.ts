import { createHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// GET /api/v1/e2e/categories - 获取场景分类列表
export const GET = createHandler(async () => {
  const categories = await prisma.e2eScenarioCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: { scenarios: true },
      },
    },
  })

  return NextResponse.json({
    success: true,
    data: categories,
  })
})
