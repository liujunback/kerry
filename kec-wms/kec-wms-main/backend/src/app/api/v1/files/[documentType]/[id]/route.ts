import { createAuthHandler } from '@/lib/api/create-handler'
import { generatePutawayOrderPdf } from '@/lib/services/pdf/putaway-order'
import { generateSupplementPickOrderPdf } from '@/lib/services/pdf/supplement-pick-order'
import { generateWavePickListPdf } from '@/lib/services/pdf/wave-pick-list'
import { NextResponse } from 'next/server'

// 支持的文档类型
const DOCUMENT_TYPES = ['putaway-order', 'wave-pick-list', 'supplement-pick-order'] as const
type DocumentType = (typeof DOCUMENT_TYPES)[number]

// GET /api/v1/files/{documentType}/{id} - 获取单个文档PDF
export const GET = createAuthHandler(async (request, auth, context) => {
  try {
    const { documentType, id } = await context!.params
    const tenantId = auth.user.tenantId

    // 验证文档类型
    if (!DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      return NextResponse.json(
        { success: false, message: `不支持的文档类型: ${documentType}` },
        { status: 400 }
      )
    }

    // 根据文档类型生成PDF
    let pdfBuffer: Buffer
    let filename: string

    switch (documentType as DocumentType) {
      case 'putaway-order':
        const result = await generatePutawayOrderPdf(tenantId, id)
        pdfBuffer = result.buffer
        filename = result.filename
        break
      case 'wave-pick-list':
        const waveResult = await generateWavePickListPdf(tenantId, id)
        pdfBuffer = waveResult.buffer
        filename = waveResult.filename
        break
      case 'supplement-pick-order':
        const supplementResult = await generateSupplementPickOrderPdf(tenantId, id)
        pdfBuffer = supplementResult.buffer
        filename = supplementResult.filename
        break
      default:
        return NextResponse.json(
          { success: false, message: `不支持的文档类型: ${documentType}` },
          { status: 400 }
        )
    }

    // 返回PDF文件
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('生成PDF失败:', error)
    const message = error instanceof Error ? error.message : '生成PDF失败'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
})
