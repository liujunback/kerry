import { createAuthHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextResponse } from 'next/server'

// GET /api/v1/asn/[id]/logs - 获取ASN的操作日志
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { id } = await context!.params

    // 验证ASN存在
    const asn = await prisma.asn.findFirst({
      where: {
        id,
        tenantId: auth.user.tenantId,
      },
    })

    if (!asn) {
      return NextResponse.json(
        { success: false, message: 'ASN不存在' },
        { status: 404 }
      )
    }

    // 获取操作日志
    const logs = await prisma.audit.findMany({
      where: {
        entityType: 'Asn',
        entityId: id,
        tenantId: auth.user.tenantId,
      },
      select: {
        id: true,
        operationType: true,
        description: true,
        operatorName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: logs,
    })
  } catch (error) {
    console.error('获取操作日志失败:', error)
    return NextResponse.json(
      { success: false, message: '获取操作日志失败' },
      { status: 500 }
    )
  }
})
