import type { InputData } from '@/lib/e2e/scenarios/templates'
import { matchTemplate,parseInputText } from '@/lib/e2e/scenarios/templates/matcher'
import { NextRequest,NextResponse } from 'next/server'
import { z } from 'zod'

const structuredInputSchema = z.object({
  businessType: z.enum(['asn', 'putaway', 'outbound', 'pick', 'pack', 'checkout']),
  skuCode: z.string().optional(),
  hasBatchNumber: z.boolean().optional(),
  hasExpiryDate: z.boolean().optional(),
  hasSerialNumbers: z.boolean().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  serialNumbers: z.array(z.string()).optional(),
  expectedQty: z.number().optional(),
  actualQty: z.number().optional(),
  qualityStatus: z.enum(['GOOD', 'DAMAGED']).optional(),
  goodQty: z.number().optional(),
  damagedQty: z.number().optional(),
  receivingMode: z.enum(['SKU', 'CONTAINER']).optional(),
  containerCode: z.string().optional(),
  isNegativeTest: z.boolean().optional(),
  exceptionType: z.string().optional(),
})

const requestSchema = structuredInputSchema.partial().extend({
  inputText: z.string().trim().min(1).optional(),
})

// POST /api/v1/e2e/scenarios/match
export async function POST(request: NextRequest) {
  const body = await request.json()
  const result = requestSchema.safeParse(body)

  if (!result.success) {
    return NextResponse.json(
      { success: false, message: '参数错误', errors: result.error.errors },
      { status: 400 },
    )
  }

  let parsedInput: InputData
  let warnings: string[] = []
  let missingFields: string[] = []

  if (result.data.inputText) {
    const parsed = parseInputText(result.data.inputText)
    parsedInput = parsed.parsedInput
    warnings = parsed.warnings
    missingFields = parsed.missingFields
  } else if (result.data.businessType) {
    parsedInput = result.data as InputData
  } else {
    return NextResponse.json(
      { success: false, message: '请提供 inputText 或 businessType' },
      { status: 400 },
    )
  }

  const matches = matchTemplate(parsedInput)

  return NextResponse.json({
    success: true,
    data: {
      parsedInput,
      warnings,
      missingFields,
      recommendations: matches.slice(0, 5).map(m => ({
        templateCode: m.template.code,
        templateName: m.template.name,
        templateDomain: m.template.domain,
        confidence: m.confidence,
        matchedFeatures: m.matchedFeatures,
        missingFeatures: m.missingFeatures,
        inferredParams: m.inferredParams,
        generatedConfig: m.generatedConfig,
        generatedExpected: m.generatedExpected,
      })),
      bestMatch: matches[0]
        ? {
            templateCode: matches[0].template.code,
            templateName: matches[0].template.name,
            templateDomain: matches[0].template.domain,
            confidence: matches[0].confidence,
            matchedFeatures: matches[0].matchedFeatures,
            missingFeatures: matches[0].missingFeatures,
            inferredParams: matches[0].inferredParams,
            generatedConfig: matches[0].generatedConfig,
            generatedExpected: matches[0].generatedExpected,
          }
        : null,
    },
  })
}
