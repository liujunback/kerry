import { NextRequest, NextResponse } from 'next/server'
import { Log } from './index'

export type ApiLogContext = Record<string, unknown>

/**
 * 外部 API 请求日志包装器
 * 在请求结束后统一写入一条完整日志（请求信息 + 响应结果 + 耗时）
 *
 * 用法：
 *   export const POST = withExternalApiLog('ExternalOrder.create', async (req, logCtx) => {
 *     logCtx.external_order_no = data.externalOrderNo
 *     logCtx.order_number = order.orderNumber
 *     return NextResponse.json(...)
 *   })
 */
export function withExternalApiLog(
  operation: string,
  handler: (req: NextRequest, logCtx: ApiLogContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const logCtx: ApiLogContext = {}
    const shouldCaptureRequestBody = process.env.EXTERNAL_API_LOG_BODY === 'true'

    // 默认不记录完整请求体，避免高并发下大量序列化与日志 I/O
    if (shouldCaptureRequestBody) {
      // 尝试捕获请求 body（需要 clone 避免消费原始 request）
      try {
        const clonedRequest = request.clone()
        const body = await clonedRequest.json()
        logCtx.request_body = body
      } catch {
        // 忽略非 JSON 请求或已消费的 body
      }
    }

    let response: NextResponse
    try {
      response = await handler(request, logCtx)
    } catch (error) {
      Log.channel('file-external-api').error(`[${operation}] 请求异常`, {
        ...logCtx,
        duration_ms: Date.now() - startTime,
        error,
      })
      throw error
    }

    const level = response.status >= 500 ? 'error'
      : response.status >= 400 ? 'warning'
      : 'info'

    Log.channel('file-external-api')[level](`[${operation}] 请求完成`, {
      ...logCtx,
      http_status: response.status,
      duration_ms: Date.now() - startTime,
    })

    return response
  }
}
