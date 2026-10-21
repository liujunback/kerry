import { createHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// GET /api/v1/e2e/scenarios/export - 导出场景到 Excel
export const GET = createHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const categoryCode = searchParams.get('categoryCode')

  // 构建查询条件
  const where: Record<string, unknown> = {}
  if (categoryCode) {
    const category = await prisma.e2eScenarioCategory.findUnique({
      where: { code: categoryCode },
    })
    if (category) {
      where.categoryId = category.id
    }
  }

  // 获取场景
  const scenarios = await prisma.e2eScenario.findMany({
    where,
    include: {
      category: { select: { code: true, name: true } },
    },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
  })

  // 转换为 Excel 数据
  const data = scenarios.map((s) => {
    const config = s.config as Record<string, unknown>
    const expected = s.expected as Record<string, unknown>
    const receivingSteps = config.receivingSteps as Array<{ qty: number; qualityStatus?: string }> | undefined
    const putawaySteps = config.putawaySteps as Array<{ items: Array<{ toBin: string; qty: number }> }> | undefined

    return {
      '分类': s.category.name,
      '分类编码': s.category.code,
      '场景编码': s.code,
      '场景名称': s.name,
      '描述': s.description || '',
      'SKU类型': config.skuType,
      '预期数量': config.expectedQty,
      '批次号': config.batchNumber || '',
      '效期': config.expiryDate || '',
      '收货步骤': receivingSteps?.map((step) => `${step.qty}(${step.qualityStatus || 'GOOD'})`).join(',') || '',
      '上架库位': putawaySteps?.flatMap((step) => step.items.map((i) => `${i.toBin}:${i.qty}`)).join(',') || '',
      '预期ASN状态': expected.asnStatus || '',
      '预期收货数量': expected.totalReceivedQty || '',
      '预期上架状态': expected.putawayStatus || '',
      '是否启用': s.isActive ? '是' : '否',
      '排序': s.sortOrder,
    }
  })

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  // 设置列宽
  ws['!cols'] = [
    { wch: 12 }, // 分类
    { wch: 12 }, // 分类编码
    { wch: 20 }, // 场景编码
    { wch: 25 }, // 场景名称
    { wch: 30 }, // 描述
    { wch: 10 }, // SKU类型
    { wch: 10 }, // 预期数量
    { wch: 15 }, // 批次号
    { wch: 12 }, // 效期
    { wch: 25 }, // 收货步骤
    { wch: 30 }, // 上架库位
    { wch: 15 }, // 预期ASN状态
    { wch: 12 }, // 预期收货数量
    { wch: 15 }, // 预期上架状态
    { wch: 8 },  // 是否启用
    { wch: 6 },  // 排序
  ]

  XLSX.utils.book_append_sheet(wb, ws, '测试场景')

  // 生成 buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  // 返回文件
  const filename = `e2e-scenarios-${new Date().toISOString().slice(0, 10)}.xlsx`
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})
