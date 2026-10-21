import { authenticate } from '@/lib/auth/middleware'
import { generateBinLocationLabelPdf } from '@/lib/services/pdf/bin-location-label'
import { generateContainerLabelPdf } from '@/lib/services/pdf/container-label'
import { generatePickOrderPdf } from '@/lib/services/pdf/pick-order'
import { generatePutawayOrderPdf } from '@/lib/services/pdf/putaway-order'
import { generateShipmentLabelPdf } from '@/lib/services/pdf/shipment-label'
import { generateSkuLabelPdf } from '@/lib/services/pdf/sku-label'
import { generateWavePickListPdf } from '@/lib/services/pdf/wave-pick-list'
import { NextRequest,NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'

// 支持的文档类型
const DOCUMENT_TYPES = ['putaway-order', 'wave-pick-list', 'pick-order', 'shipment-label', 'container-label', 'sku-label', 'bin-location-label'] as const
type DocumentType = (typeof DOCUMENT_TYPES)[number]

// 验证打印 token（格式：base64(timestamp:tenantId:userId)，有效期 5 分钟）
function verifyPrintToken(token: string): { tenantId: string; userId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [timestampStr, tenantId, userId] = decoded.split(':')
    const timestamp = parseInt(timestampStr, 10)
    const now = Date.now()
    // 5 分钟有效期
    if (now - timestamp > 5 * 60 * 1000) {
      return null
    }
    return { tenantId, userId }
  } catch {
    return null
  }
}

// GET /api/v1/files/{documentType}/batch?ids=id1,id2,id3 - 批量获取文档PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentType: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const printToken = searchParams.get('token')

    let tenantId: string
    let userId: string

    // 优先使用 print token 验证（供打印机中间件使用）
    if (printToken) {
      const tokenData = verifyPrintToken(printToken)
      if (!tokenData) {
        return NextResponse.json({ success: false, message: 'Token 无效或已过期' }, { status: 401 })
      }
      tenantId = tokenData.tenantId
      userId = tokenData.userId
    } else {
      // 否则使用 session 验证
      const authResult = await authenticate(request)
      if (!authResult.user) {
        return NextResponse.json({ success: false, message: '未授权' }, { status: 401 })
      }
      tenantId = authResult.user.tenantId
      userId = authResult.user.id
    }

    const { documentType } = await params
    const idsParam = searchParams.get('ids')

    // 验证文档类型
    if (!DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      return NextResponse.json(
        { success: false, message: `不支持的文档类型: ${documentType}` },
        { status: 400 }
      )
    }

    // 验证ID参数
    if (!idsParam) {
      return NextResponse.json(
        { success: false, message: '请提供要打印的文档ID' },
        { status: 400 }
      )
    }

    const ids = idsParam.split(',').filter(Boolean)
    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, message: '请提供要打印的文档ID' },
        { status: 400 }
      )
    }

    // 合并多个PDF
    const mergedPdf = await PDFDocument.create()

    for (const id of ids) {
      let pdfBuffer: Buffer

      // 添加调试日志
      console.log(`生成PDF: documentType=${documentType}, id=${id}, tenantId=${tenantId}`)

      switch (documentType as DocumentType) {
        case 'putaway-order':
          const result = await generatePutawayOrderPdf(tenantId, id)
          pdfBuffer = result.buffer
          break
        case 'wave-pick-list':
          const waveResult = await generateWavePickListPdf(tenantId, id)
          pdfBuffer = waveResult.buffer
          break
        case 'pick-order':
          const pickResult = await generatePickOrderPdf(tenantId, id, userId)
          pdfBuffer = pickResult.buffer
          break
        case 'shipment-label':
          const labelResult = await generateShipmentLabelPdf(tenantId, id)
          pdfBuffer = labelResult.buffer
          break
        case 'container-label':
          const containerResult = await generateContainerLabelPdf(tenantId, id)
          pdfBuffer = containerResult.buffer
          break
        case 'sku-label':
          const skuResult = await generateSkuLabelPdf(tenantId, id)
          pdfBuffer = skuResult.buffer
          break
        case 'bin-location-label':
          const binLocationResult = await generateBinLocationLabelPdf(tenantId, id)
          pdfBuffer = binLocationResult.buffer
          break
        default:
          continue
      }

      // 加载并合并PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer)
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
      pages.forEach((page) => mergedPdf.addPage(page))
    }

    // 生成最终PDF
    const finalPdfBuffer = await mergedPdf.save()

    // 返回合并后的PDF文件
    return new NextResponse(Buffer.from(finalPdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${documentType}-batch.pdf"`,
      },
    })
  } catch (error) {
    console.error('批量生成PDF失败:', error)
    const message = error instanceof Error ? error.message : '批量生成PDF失败'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
