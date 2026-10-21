import { createHandler } from '@/lib/api/create-handler'
import { prisma } from '@/lib/db/prisma'
import { NextRequest,NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

interface ImportRow {
  '分类编码': string
  '场景编码': string
  '场景名称': string
  '描述'?: string
  'SKU类型': string
  '预期数量': number
  '批次号'?: string
  '效期'?: string
  '收货步骤'?: string
  '上架库位'?: string
  '预期ASN状态'?: string
  '预期收货数量'?: number
  '预期上架状态'?: string
  '是否启用'?: string
  '排序'?: number
}

// POST /api/v1/e2e/scenarios/import - 从 Excel 导入场景
export const POST = createHandler(async (request: NextRequest) => {
  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { success: false, message: '请上传文件' },
      { status: 400 }
    )
  }

  // 读取文件
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<ImportRow>(ws)

  if (rows.length === 0) {
    return NextResponse.json(
      { success: false, message: 'Excel 文件为空' },
      { status: 400 }
    )
  }

  // 获取所有分类
  const categories = await prisma.e2eScenarioCategory.findMany()
  const categoryMap = new Map(categories.map((c) => [c.code, c.id]))

  const results = {
    created: 0,
    updated: 0,
    errors: [] as Array<{ row: number; code: string; error: string }>,
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // Excel 行号（从2开始，1是表头）

    try {
      // 验证必填字段
      if (!row['分类编码'] || !row['场景编码'] || !row['场景名称'] || !row['SKU类型'] || !row['预期数量']) {
        results.errors.push({
          row: rowNum,
          code: row['场景编码'] || '',
          error: '缺少必填字段（分类编码、场景编码、场景名称、SKU类型、预期数量）',
        })
        continue
      }

      // 验证分类
      const categoryId = categoryMap.get(row['分类编码'])
      if (!categoryId) {
        results.errors.push({
          row: rowNum,
          code: row['场景编码'],
          error: `分类 ${row['分类编码']} 不存在`,
        })
        continue
      }

      // 验证 SKU 类型
      const validSkuTypes = ['normal', 'batch', 'expiry', 'serial', 'full']
      if (!validSkuTypes.includes(row['SKU类型'])) {
        results.errors.push({
          row: rowNum,
          code: row['场景编码'],
          error: `SKU类型 ${row['SKU类型']} 无效，应为: ${validSkuTypes.join(', ')}`,
        })
        continue
      }

      // 解析收货步骤: "40(GOOD),30(GOOD),30(DAMAGED)"
      const receivingSteps: Array<{ qty: number; qualityStatus: string }> = []
      if (row['收货步骤']) {
        const stepParts = row['收货步骤'].split(',')
        for (const part of stepParts) {
          const match = part.trim().match(/^(\d+)\(?(GOOD|DAMAGED)?\)?$/)
          if (match) {
            receivingSteps.push({
              qty: parseInt(match[1]),
              qualityStatus: match[2] || 'GOOD',
            })
          }
        }
      }

      // 如果没有收货步骤，默认一次性收货
      if (receivingSteps.length === 0) {
        receivingSteps.push({
          qty: row['预期数量'],
          qualityStatus: 'GOOD',
        })
      }

      // 解析上架库位: "A-01-01-01:60,A-01-01-02:40"
      const putawaySteps: Array<{ mode: string; items: Array<{ toBin: string; qty: number }> }> = []
      if (row['上架库位']) {
        const items: Array<{ toBin: string; qty: number }> = []
        const binParts = row['上架库位'].split(',')
        for (const part of binParts) {
          const [bin, qtyStr] = part.trim().split(':')
          if (bin && qtyStr) {
            items.push({ toBin: bin, qty: parseInt(qtyStr) })
          }
        }
        if (items.length > 0) {
          putawaySteps.push({ mode: 'BY_ORDER', items })
        }
      }

      // 构建配置
      const config = {
        skuType: row['SKU类型'],
        expectedQty: row['预期数量'],
        batchNumber: row['批次号'] || undefined,
        expiryDate: row['效期'] || undefined,
        receivingSteps,
        putawaySteps: putawaySteps.length > 0 ? putawaySteps : undefined,
      }

      // 构建预期结果
      const expected: Record<string, unknown> = {}
      if (row['预期ASN状态']) expected.asnStatus = row['预期ASN状态']
      if (row['预期收货数量']) expected.totalReceivedQty = row['预期收货数量']
      if (row['预期上架状态']) expected.putawayStatus = row['预期上架状态']

      // 检查是否已存在
      const existing = await prisma.e2eScenario.findUnique({
        where: { code: row['场景编码'] },
      })

      if (existing) {
        // 更新
        await prisma.e2eScenario.update({
          where: { code: row['场景编码'] },
          data: {
            categoryId,
            name: row['场景名称'],
            description: row['描述'] || null,
            config,
            expected,
            isActive: row['是否启用'] !== '否',
            sortOrder: row['排序'] || 0,
          },
        })
        results.updated++
      } else {
        // 创建
        await prisma.e2eScenario.create({
          data: {
            categoryId,
            code: row['场景编码'],
            name: row['场景名称'],
            description: row['描述'] || null,
            config,
            expected,
            isActive: row['是否启用'] !== '否',
            sortOrder: row['排序'] || 0,
          },
        })
        results.created++
      }
    } catch (error) {
      results.errors.push({
        row: rowNum,
        code: row['场景编码'] || '',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      total: rows.length,
      created: results.created,
      updated: results.updated,
      failed: results.errors.length,
      errors: results.errors,
    },
  })
})
