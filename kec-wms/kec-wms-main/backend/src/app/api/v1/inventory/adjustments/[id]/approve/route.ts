import { createAuthHandler } from '@/lib/api/create-handler'
import { NextResponse } from 'next/server'

// POST /api/v1/inventory/adjustments/[id]/approve - 审批通过（已废弃）
export const POST = createAuthHandler(async () => {
  try {
    return NextResponse.json(
      { success: false, message: '系统已取消审批流程，调整单创建后可直接执行' },
      { status: 400 }
    )
  } catch (error) {
    console.error('审批调整单失败:', error)
    return NextResponse.json({ success: false, message: '审批调整单失败' }, { status: 500 })
  }
})
