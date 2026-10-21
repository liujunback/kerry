'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, Plus, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type BusinessType = 'asn' | 'putaway' | 'outbound' | 'pick' | 'pack' | 'checkout'
type SkuType = 'normal' | 'batch' | 'expiry' | 'serial' | 'full'
type ReceivingMode = 'SKU' | 'CONTAINER'
type QualityMode = 'GOOD' | 'DAMAGED' | 'MIXED'

interface CategoryOption {
  id: string
  code: string
  name: string
}

interface ParsedInput {
  businessType: BusinessType
  skuCode?: string
  hasBatchNumber?: boolean
  hasExpiryDate?: boolean
  hasSerialNumbers?: boolean
  batchNumber?: string
  expiryDate?: string
  serialNumbers?: string[]
  expectedQty?: number
  actualQty?: number
  qualityStatus?: 'GOOD' | 'DAMAGED'
  goodQty?: number
  damagedQty?: number
  receivingMode?: ReceivingMode
  containerCode?: string
  isNegativeTest?: boolean
  exceptionType?: string
}

interface MatchRecommendation {
  templateCode: string
  templateName: string
  templateDomain: 'inbound' | 'putaway' | 'outbound'
  confidence: number
  matchedFeatures: string[]
  missingFeatures: string[]
  inferredParams: Record<string, unknown>
  generatedConfig: Record<string, unknown>
  generatedExpected: Record<string, unknown>
}

interface MatchResponse {
  parsedInput: ParsedInput
  warnings: string[]
  missingFields: string[]
  recommendations: MatchRecommendation[]
  bestMatch: MatchRecommendation | null
}

interface DraftScenario {
  code: string
  name: string
  description: string
  categoryCode: string
  config: string
  expected: string
}

interface EditableSkuLine {
  id: string
  skuType: SkuType
  quantity: number
  batchNumber: string
  expiryDate: string
  serialNumbersText: string
}

interface E2eScenarioCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: CategoryOption[]
  onCreated: () => void | Promise<void>
}

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  asn: '收货',
  putaway: '上架',
  outbound: '出库订单',
  pick: '拣货',
  pack: '打包',
  checkout: '签出',
}

const SKU_TYPE_LABELS: Record<SkuType, string> = {
  normal: '普通SKU',
  batch: '批次SKU',
  expiry: '效期SKU',
  serial: '序列号SKU',
  full: '全属性SKU',
}

const EMPTY_PARSED_INPUT: ParsedInput = {
  businessType: 'asn',
  expectedQty: 10,
  qualityStatus: 'GOOD',
  receivingMode: 'SKU',
  isNegativeTest: false,
}

const EMPTY_DRAFT_SCENARIO: DraftScenario = {
  code: '',
  name: '',
  description: '',
  categoryCode: '',
  config: '{}',
  expected: '{}',
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function parseNumberInput(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function deriveSkuType(parsedInput: ParsedInput): SkuType {
  if (parsedInput.hasSerialNumbers && parsedInput.hasBatchNumber && parsedInput.hasExpiryDate) return 'full'
  if (parsedInput.hasSerialNumbers) return 'serial'
  if (parsedInput.hasExpiryDate) return 'expiry'
  if (parsedInput.hasBatchNumber) return 'batch'
  return 'normal'
}

function applySkuType(parsedInput: ParsedInput, skuType: SkuType): ParsedInput {
  return {
    ...parsedInput,
    hasBatchNumber: skuType === 'batch' || skuType === 'expiry' || skuType === 'serial' || skuType === 'full',
    hasExpiryDate: skuType === 'expiry' || skuType === 'full',
    hasSerialNumbers: skuType === 'serial' || skuType === 'full',
    batchNumber: skuType === 'normal' ? undefined : parsedInput.batchNumber,
    expiryDate: skuType === 'expiry' || skuType === 'full' ? parsedInput.expiryDate : undefined,
    serialNumbers: skuType === 'serial' || skuType === 'full' ? parsedInput.serialNumbers : undefined,
  }
}

function deriveQualityMode(parsedInput: ParsedInput): QualityMode {
  if ((parsedInput.goodQty ?? 0) > 0 && (parsedInput.damagedQty ?? 0) > 0) return 'MIXED'
  if (parsedInput.qualityStatus === 'DAMAGED' || (parsedInput.damagedQty ?? 0) > 0) return 'DAMAGED'
  return 'GOOD'
}

function applyQualityMode(parsedInput: ParsedInput, qualityMode: QualityMode): ParsedInput {
  if (qualityMode === 'MIXED') {
    return {
      ...parsedInput,
      qualityStatus: undefined,
      goodQty: parsedInput.goodQty ?? parsedInput.expectedQty,
      damagedQty: parsedInput.damagedQty ?? 0,
    }
  }

  return {
    ...parsedInput,
    qualityStatus: qualityMode,
    goodQty: undefined,
    damagedQty: undefined,
  }
}

function inferCategoryCode(parsedInput: ParsedInput, templateCode: string): string {
  if (templateCode.startsWith('RECV-NEGATIVE')) return 'INBOUND-RECV'
  if (templateCode.startsWith('RECV-')) return 'INBOUND-RECV'
  if (templateCode.startsWith('PUT-')) return 'INBOUND-PUT'
  if (templateCode.startsWith('INBOUND-FULL')) return 'INBOUND-FULL'
  if (templateCode.startsWith('OUT-ORDER')) return 'OUTBOUND-ORDER'
  if (templateCode === 'PICK') return 'OUTBOUND-PICK'
  if (templateCode === 'PACK') return 'OUTBOUND-PACK'
  if (templateCode === 'CHECKOUT') return 'OUTBOUND-CHECKOUT'
  if (templateCode.startsWith('OUTBOUND-FULL')) return 'OUTBOUND-FULL'

  if (parsedInput.businessType === 'asn') return 'INBOUND-RECV'
  if (parsedInput.businessType === 'putaway') return 'INBOUND-PUT'
  if (parsedInput.businessType === 'pick') return 'OUTBOUND-PICK'
  if (parsedInput.businessType === 'pack') return 'OUTBOUND-PACK'
  if (parsedInput.businessType === 'checkout') return 'OUTBOUND-CHECKOUT'
  return 'OUTBOUND-ORDER'
}

function buildScenarioCode(templateCode: string, parsedInput: ParsedInput): string {
  const skuType = deriveSkuType(parsedInput).toUpperCase()
  const qtyPart = parsedInput.expectedQty ? `-${parsedInput.expectedQty}` : ''
  const suffix = Date.now().toString().slice(-4)
  return `${templateCode}-${skuType}${qtyPart}-${suffix}`
}

function buildScenarioName(templateName: string, parsedInput: ParsedInput): string {
  const parts = [templateName, SKU_TYPE_LABELS[deriveSkuType(parsedInput)]]
  if (parsedInput.expectedQty) parts.push(`${parsedInput.expectedQty}件`)
  if (parsedInput.isNegativeTest && parsedInput.exceptionType) parts.push(parsedInput.exceptionType)
  return parts.join('-')
}

function buildDraftScenario(
  recommendation: MatchRecommendation,
  parsedInput: ParsedInput,
  description: string,
): DraftScenario {
  return {
    code: buildScenarioCode(recommendation.templateCode, parsedInput),
    name: buildScenarioName(recommendation.templateName, parsedInput),
    description: description.trim(),
    categoryCode: inferCategoryCode(parsedInput, recommendation.templateCode),
    config: prettyJson(recommendation.generatedConfig),
    expected: prettyJson(recommendation.generatedExpected),
  }
}

function createSkuLine(overrides: Partial<EditableSkuLine> = {}): EditableSkuLine {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    skuType: 'normal',
    quantity: 1,
    batchNumber: '',
    expiryDate: '',
    serialNumbersText: '',
    ...overrides,
  }
}

function buildLinesFromScenarioConfig(config: Record<string, unknown>, parsedInput: ParsedInput): {
  multiSkuMode: boolean
  lines: EditableSkuLine[]
} {
  const outboundConfig = (config.outboundConfig as Record<string, unknown> | undefined)
  const outboundLines = outboundConfig?.orderLines

  if (Array.isArray(outboundLines) && outboundLines.length > 0) {
    const prepareInventory = Array.isArray(outboundConfig?.prepareInventory)
      ? outboundConfig.prepareInventory as Array<Record<string, unknown>>
      : []

    return {
      multiSkuMode: outboundLines.length > 1,
      lines: (outboundLines as Array<Record<string, unknown>>).map((line, index) => {
        const prepareLine = prepareInventory[index] || {}
        return createSkuLine({
          skuType: (line.skuType as SkuType) || 'normal',
          quantity: Number(line.orderedQty ?? 1),
          batchNumber: String(prepareLine.batchNumber ?? line.batchNumber ?? ''),
          expiryDate: String(prepareLine.expiryDate ?? ''),
          serialNumbersText: Array.isArray(prepareLine.serialNumbers)
            ? (prepareLine.serialNumbers as string[]).join(', ')
            : '',
        })
      }),
    }
  }

  const skuItems = Array.isArray(config.skuItems) ? config.skuItems as Array<Record<string, unknown>> : []
  if (skuItems.length > 0) {
    return {
      multiSkuMode: true,
      lines: skuItems.map((item) =>
        createSkuLine({
          skuType: (item.skuType as SkuType) || 'normal',
          quantity: Number(item.expectedQty ?? 1),
          batchNumber: String(item.batchNumber ?? ''),
          expiryDate: String(item.expiryDate ?? ''),
          serialNumbersText: Array.isArray(item.serialNumbers)
            ? (item.serialNumbers as string[]).join(', ')
            : '',
        }),
      ),
    }
  }

  const receivingSteps = Array.isArray(config.receivingSteps)
    ? config.receivingSteps as Array<Record<string, unknown>>
    : []
  const firstReceivingStep = receivingSteps[0] || {}
  const generatedSerialNumbers = Array.isArray(firstReceivingStep.serialNumbers)
    ? firstReceivingStep.serialNumbers as string[]
    : []

  return {
    multiSkuMode: false,
    lines: [
      createSkuLine({
        skuType: (config.skuType as SkuType) || deriveSkuType(parsedInput),
        quantity: Number(config.expectedQty ?? parsedInput.expectedQty ?? 10),
        batchNumber: String(config.batchNumber ?? parsedInput.batchNumber ?? ''),
        expiryDate: String(config.expiryDate ?? parsedInput.expiryDate ?? ''),
        serialNumbersText: generatedSerialNumbers.length > 0
          ? generatedSerialNumbers.join(', ')
          : parsedInput.serialNumbers?.join(', ') ?? '',
      }),
    ],
  }
}

function inferSkuLinesFromText(text: string, parsedInput: ParsedInput): EditableSkuLine[] {
  const normalizedText = text.trim()
  if (!normalizedText) return []

  const keywordMap: Record<string, SkuType> = {
    普通: 'normal',
    批次: 'batch',
    效期: 'expiry',
    序列号: 'serial',
    全属性: 'full',
  }

  const quantityWordMap: Record<string, number> = {
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
    十: 10,
  }

  const parseQuantityToken = (token: string | undefined): number | undefined => {
    if (!token) return undefined
    const normalized = token.trim()
    if (/^\d+$/.test(normalized)) {
      return Number(normalized)
    }
    return quantityWordMap[normalized]
  }

  const buildLine = (skuType: SkuType, quantity: number) =>
    createSkuLine({
      skuType,
      quantity,
      batchNumber: skuType === 'batch' || skuType === 'expiry' || skuType === 'serial' || skuType === 'full'
        ? parsedInput.batchNumber ?? ''
        : '',
      expiryDate: skuType === 'expiry' || skuType === 'full' ? parsedInput.expiryDate ?? '' : '',
      serialNumbersText: skuType === 'serial' || skuType === 'full'
        ? parsedInput.serialNumbers?.join(', ') ?? ''
        : '',
    })

  const lines: EditableSkuLine[] = []
  const explicitPatterns: Array<{ regex: RegExp; skuTypeIndex: number; qtyIndex: number }> = [
    { regex: /(普通|批次|效期|序列号|全属性)\s*SKU?\s*(\d+)\s*(?:件|个|箱|pcs|PCS)?/gi, skuTypeIndex: 1, qtyIndex: 2 },
    { regex: /(\d+)\s*(?:件|个|箱|pcs|PCS)?\s*(普通|批次|效期|序列号|全属性)\s*SKU?/gi, skuTypeIndex: 2, qtyIndex: 1 },
    { regex: /(普通|批次|效期|序列号|全属性)\s*SKU?\s*([一二两三四五六七八九十])\s*(?:件|个|箱)?/gi, skuTypeIndex: 1, qtyIndex: 2 },
    { regex: /([一二两三四五六七八九十])\s*(?:件|个|箱)?\s*(普通|批次|效期|序列号|全属性)\s*SKU?/gi, skuTypeIndex: 2, qtyIndex: 1 },
  ]

  for (const { regex, skuTypeIndex, qtyIndex } of explicitPatterns) {
    let match: RegExpExecArray | null
    while ((match = regex.exec(normalizedText)) !== null) {
      const skuType = keywordMap[match[skuTypeIndex]]
      const quantity = parseQuantityToken(match[qtyIndex])
      if (!skuType || quantity === undefined || !Number.isFinite(quantity)) continue

      lines.push(buildLine(skuType, quantity))
    }
    if (lines.length > 1) {
      return lines
    }
  }

  const mentionedTypes = (Object.entries(keywordMap) as Array<[string, SkuType]>)
    .filter(([label]) => normalizedText.includes(label))
    .map(([, skuType]) => skuType)

  const uniqueTypes = Array.from(new Set(mentionedTypes))
  const sharedQuantity = extractSharedQuantity(normalizedText, parseQuantityToken)

  if (uniqueTypes.length > 1 && sharedQuantity !== undefined) {
    return uniqueTypes.map((skuType) => buildLine(skuType, sharedQuantity))
  }

  const countHintMatches = Array.from(
    normalizedText.matchAll(/([一二两三四五六七八九十\d]+)\s*(?:个|种)?\s*(普通|批次|效期|序列号|全属性)\s*SKU?/gi),
  )
  if (countHintMatches.length > 1) {
    return countHintMatches
      .map((match) => {
        const quantity = parseQuantityToken(match[1])
        const skuType = keywordMap[match[2]]
        if (!quantity || !skuType) return null
        return buildLine(skuType, quantity)
      })
      .filter((line): line is EditableSkuLine => line !== null)
  }

  if (uniqueTypes.length > 1 && /(一个|一個|1个|1種|一种)/.test(normalizedText)) {
    return uniqueTypes.map((skuType) => buildLine(skuType, 1))
  }

  if (uniqueTypes.length > 1) {
    return uniqueTypes.map((skuType) => buildLine(skuType, parsedInput.expectedQty ?? 10))
  }

  return []
}

function extractSharedQuantity(
  text: string,
  parseQuantityToken: (token: string | undefined) => number | undefined,
): number | undefined {
  const sharedPatterns = [
    /各\s*([一二两三四五六七八九十\d]+)\s*(?:件|个|箱|pcs|PCS)/i,
    /每个\s*([一二两三四五六七八九十\d]+)\s*(?:件|个|箱|pcs|PCS)/i,
    /每种\s*([一二两三四五六七八九十\d]+)\s*(?:件|个|箱|pcs|PCS)/i,
    /都\s*([一二两三四五六七八九十\d]+)\s*(?:件|个|箱|pcs|PCS)/i,
  ]

  for (const pattern of sharedPatterns) {
    const match = text.match(pattern)
    const quantity = parseQuantityToken(match?.[1])
    if (quantity !== undefined) {
      return quantity
    }
  }

  return undefined
}

function buildScenarioJsonFromSkuLines(
  configText: string,
  expectedText: string,
  nextLines: EditableSkuLine[],
  nextMultiSkuMode: boolean,
) {
  const parsedConfig = JSON.parse(configText) as Record<string, unknown>
  const parsedExpected = JSON.parse(expectedText) as Record<string, unknown>
  const validLines = nextLines.filter((line) => line.quantity > 0)

  if (validLines.length === 0) {
    return {
      config: configText,
      expected: expectedText,
    }
  }

  const mappedLines = validLines.map((line) => {
    const serialNumbers = line.serialNumbersText
      ? line.serialNumbersText.split(/[\s,，]+/).filter(Boolean)
      : undefined
    return {
      ...line,
      serialNumbers,
    }
  })

  const totalQty = mappedLines.reduce((sum, line) => sum + line.quantity, 0)
  const isOutbound = !!(parsedConfig.outboundConfig as Record<string, unknown> | undefined)

  if (isOutbound) {
    const outboundConfig = parsedConfig.outboundConfig as Record<string, unknown>
    outboundConfig.orderLines = mappedLines.map((line) => ({
      skuType: line.skuType,
      orderedQty: line.quantity,
      ...(line.batchNumber ? { batchNumber: line.batchNumber } : {}),
      ...(line.expiryDate ? { expiryDate: line.expiryDate } : {}),
    }))
    outboundConfig.prepareInventory = mappedLines.map((line) => ({
      skuType: line.skuType,
      quantity: line.quantity,
      ...(line.batchNumber ? { batchNumber: line.batchNumber } : {}),
      ...(line.expiryDate ? { expiryDate: line.expiryDate } : {}),
      ...(line.serialNumbers && line.serialNumbers.length > 0 ? { serialNumbers: line.serialNumbers } : {}),
    }))

    if (mappedLines.length === 1 && ['serial', 'full'].includes(mappedLines[0].skuType)) {
      outboundConfig.skuAttributeTest = {
        skuType: mappedLines[0].skuType,
        serialNumbers: mappedLines[0].serialNumbers,
        validateSerialOnPacking: true,
      }
    } else {
      delete outboundConfig.skuAttributeTest
    }

    const outboundExpected = parsedExpected.outboundExpected as Record<string, unknown> | undefined
    if (outboundExpected) {
      if ('allocatedQty' in outboundExpected) outboundExpected.allocatedQty = totalQty
      if ('pickedQty' in outboundExpected) outboundExpected.pickedQty = totalQty
      if ('packedQty' in outboundExpected) outboundExpected.packedQty = totalQty
      if ('inventoryDeducted' in outboundExpected) outboundExpected.inventoryDeducted = totalQty
    }
  } else {
    parsedConfig.skuType = mappedLines[0].skuType
    parsedConfig.expectedQty = totalQty

    if (nextMultiSkuMode || mappedLines.length > 1) {
      parsedConfig.multiSku = true
      parsedConfig.skuItems = mappedLines.map((line) => ({
        skuType: line.skuType,
        expectedQty: line.quantity,
        ...(line.batchNumber ? { batchNumber: line.batchNumber } : {}),
        ...(line.expiryDate ? { expiryDate: line.expiryDate } : {}),
      }))
      parsedConfig.receivingSteps = mappedLines.map((line) => ({
        qty: line.quantity,
        skuType: line.skuType,
        ...(line.batchNumber ? { batchNumber: line.batchNumber } : {}),
        ...(line.expiryDate ? { expiryDate: line.expiryDate } : {}),
        ...(line.serialNumbers && line.serialNumbers.length > 0 ? { serialNumbers: line.serialNumbers } : {}),
      }))
    } else {
      delete parsedConfig.multiSku
      delete parsedConfig.skuItems
      const singleLine = mappedLines[0]
      if (singleLine.batchNumber) parsedConfig.batchNumber = singleLine.batchNumber
      else delete parsedConfig.batchNumber
      if (singleLine.expiryDate) parsedConfig.expiryDate = singleLine.expiryDate
      else delete parsedConfig.expiryDate
      parsedConfig.receivingSteps = [
        {
          qty: singleLine.quantity,
          ...(singleLine.serialNumbers && singleLine.serialNumbers.length > 0 ? { serialNumbers: singleLine.serialNumbers } : {}),
        },
      ]
    }

    if ('totalReceivedQty' in parsedExpected) {
      parsedExpected.totalReceivedQty = totalQty
    }
  }

  return {
    config: prettyJson(parsedConfig),
    expected: prettyJson(parsedExpected),
  }
}

export function E2eScenarioCreateDialog({
  open,
  onOpenChange,
  categories,
  onCreated,
}: E2eScenarioCreateDialogProps) {
  const [draftInput, setDraftInput] = useState('')
  const [matching, setMatching] = useState(false)
  const [creating, setCreating] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [jsonManuallyEdited, setJsonManuallyEdited] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>([])
  const [draftMatch, setDraftMatch] = useState<MatchRecommendation | null>(null)
  const [draftParsedInput, setDraftParsedInput] = useState<ParsedInput>(EMPTY_PARSED_INPUT)
  const [draftScenario, setDraftScenario] = useState<DraftScenario>(EMPTY_DRAFT_SCENARIO)
  const [multiSkuMode, setMultiSkuMode] = useState(false)
  const [skuLines, setSkuLines] = useState<EditableSkuLine[]>([createSkuLine({ quantity: 10 })])

  const draftSkuType = useMemo(() => deriveSkuType(draftParsedInput), [draftParsedInput])
  const draftQualityMode = useMemo(() => deriveQualityMode(draftParsedInput), [draftParsedInput])

  const resetState = () => {
    setDraftInput('')
    setMatching(false)
    setCreating(false)
    setAdvancedOpen(false)
    setJsonManuallyEdited(false)
    setWarnings([])
    setMissingFields([])
    setRecommendations([])
    setDraftMatch(null)
    setDraftParsedInput(EMPTY_PARSED_INPUT)
    setDraftScenario(EMPTY_DRAFT_SCENARIO)
    setMultiSkuMode(false)
    setSkuLines([createSkuLine({ quantity: 10 })])
  }

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open])

  const applyRecommendation = (
    recommendation: MatchRecommendation,
    parsedInput: ParsedInput,
    descriptionText: string,
  ) => {
    setDraftMatch(recommendation)
    const nextScenario = buildDraftScenario(recommendation, parsedInput, descriptionText)
    const nextConfig = JSON.parse(nextScenario.config) as Record<string, unknown>
    const lineEditor = buildLinesFromScenarioConfig(nextConfig, parsedInput)
    const hintedLines = inferSkuLinesFromText(descriptionText, parsedInput)
    const nextLines = hintedLines.length > 1 ? hintedLines : lineEditor.lines
    const nextMultiSkuMode = hintedLines.length > 1 ? true : lineEditor.multiSkuMode
    const syncedScenario = buildScenarioJsonFromSkuLines(
      nextScenario.config,
      nextScenario.expected,
      nextLines,
      nextMultiSkuMode,
    )

    setDraftScenario({
      ...nextScenario,
      config: syncedScenario.config,
      expected: syncedScenario.expected,
    })
    setMultiSkuMode(nextMultiSkuMode)
    setSkuLines(nextLines)
    setJsonManuallyEdited(false)
  }

  const requestMatch = async (payload: unknown) => {
    const res = await fetch('/api/v1/e2e/scenarios/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      throw new Error(data.message || '解析失败')
    }

    return data.data as MatchResponse
  }

  const handleAnalyzeInput = async () => {
    if (!draftInput.trim()) {
      toast.warning('请先输入自然语言描述')
      return
    }

    setMatching(true)
    try {
      const data = await requestMatch({ inputText: draftInput.trim() })
      setDraftParsedInput(data.parsedInput)
      setWarnings(data.warnings)
      setMissingFields(data.missingFields)
      setRecommendations(data.recommendations)

      if (data.bestMatch) {
        applyRecommendation(data.bestMatch, data.parsedInput, draftInput)
      } else {
        toast.warning('未找到匹配模板，请补充描述后重试')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '解析失败')
    } finally {
      setMatching(false)
    }
  }

  const handleRegenerateFromDraft = async () => {
    setMatching(true)
    try {
      const data = await requestMatch(draftParsedInput)
      setWarnings(data.warnings)
      setMissingFields(data.missingFields)
      setRecommendations(data.recommendations)
      setDraftParsedInput(data.parsedInput)

      if (data.bestMatch) {
        applyRecommendation(data.bestMatch, data.parsedInput, draftInput || draftScenario.description)
      } else {
        toast.warning('当前字段无法生成推荐模板，请调整后重试')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重新生成失败')
    } finally {
      setMatching(false)
    }
  }

  const handleCreateScenario = async () => {
    if (!draftScenario.code || !draftScenario.name || !draftScenario.categoryCode) {
      toast.error('请完成场景编码、名称和分类')
      return
    }

    const finalScenarioPayload = jsonManuallyEdited
      ? {
          config: draftScenario.config,
          expected: draftScenario.expected,
        }
      : buildScenarioJsonFromSkuLines(
          draftScenario.config,
          draftScenario.expected,
          multiSkuMode ? skuLines : [skuLines[0] ?? createSkuLine({ quantity: draftParsedInput.expectedQty ?? 1 })],
          multiSkuMode,
        )

    let config: Record<string, unknown>
    let expected: Record<string, unknown>
    try {
      config = JSON.parse(finalScenarioPayload.config) as Record<string, unknown>
      expected = JSON.parse(finalScenarioPayload.expected) as Record<string, unknown>
    } catch {
      toast.error('高级配置中的 JSON 格式不正确')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/v1/e2e/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryCode: draftScenario.categoryCode,
          code: draftScenario.code,
          name: draftScenario.name,
          description: draftScenario.description || null,
          config,
          expected,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || '创建失败')
      }

      toast.success('场景创建成功')
      onOpenChange(false)
      onCreated()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const syncScenarioFromSkuLines = (nextLines: EditableSkuLine[], nextMultiSkuMode: boolean) => {
    try {
      const syncedScenario = buildScenarioJsonFromSkuLines(
        draftScenario.config,
        draftScenario.expected,
        nextLines,
        nextMultiSkuMode,
      )
      setDraftScenario((prev) => ({
        ...prev,
        config: syncedScenario.config,
        expected: syncedScenario.expected,
      }))
      setJsonManuallyEdited(false)
    } catch {
      toast.error('当前 JSON 无法自动同步多SKU，请先调整高级配置')
    }
  }

  const updateSkuLines = (nextLines: EditableSkuLine[], nextMultiSkuMode = multiSkuMode) => {
    setSkuLines(nextLines)
    syncScenarioFromSkuLines(nextLines, nextMultiSkuMode)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            新建测试场景
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[74vh]">
          <div className="space-y-5 pr-4">
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="draft-input">自然语言描述</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    例如：创建一个全属性 SKU 的正常收货场景，10 件，带批次和效期
                  </p>
                </div>
                <Button onClick={handleAnalyzeInput} disabled={matching || !draftInput.trim()}>
                  {matching ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  智能解析
                </Button>
              </div>
              <Textarea
                id="draft-input"
                placeholder="输入你想创建的测试场景描述..."
                className="min-h-[110px]"
                value={draftInput}
                onChange={(e) => setDraftInput(e.target.value)}
                onBlur={() => {
                  if (draftInput.trim() && !draftMatch) {
                    void handleAnalyzeInput()
                  }
                }}
              />

              {(warnings.length > 0 || missingFields.length > 0) && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      {warnings.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-medium">解析提示</div>
                          {warnings.map((warning) => (
                            <div key={warning}>{warning}</div>
                          ))}
                        </div>
                      )}
                      {missingFields.length > 0 && (
                        <div className="space-y-1">
                          <div className="font-medium">待补充字段</div>
                          <div className="flex flex-wrap gap-2">
                            {missingFields.map((field) => (
                              <Badge key={field} variant="outline" className="border-amber-300 bg-white text-amber-900">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {recommendations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>推荐模板</Label>
                    <p className="text-xs text-muted-foreground mt-1">选择最贴近的模板作为场景草稿</p>
                  </div>
                  <Badge variant="outline">{recommendations.length} 个候选</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {recommendations.slice(0, 4).map((recommendation) => {
                    const selected = draftMatch?.templateCode === recommendation.templateCode
                    return (
                      <button
                        key={`${recommendation.templateCode}-${recommendation.confidence}`}
                        type="button"
                        onClick={() => applyRecommendation(recommendation, draftParsedInput, draftInput)}
                        className={cn(
                          'rounded-lg border p-3 text-left transition-colors',
                          selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium">{recommendation.templateName}</div>
                          <Badge variant={selected ? 'default' : 'secondary'}>{recommendation.confidence}%</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">{recommendation.templateCode}</div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {recommendation.matchedFeatures.slice(0, 3).map((feature) => (
                            <Badge key={feature} variant="outline">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>场景草稿</Label>
                  <p className="text-xs text-muted-foreground mt-1">确认识别出的业务字段，并可重新生成配置</p>
                </div>
                <Button variant="outline" onClick={handleRegenerateFromDraft} disabled={matching}>
                  {matching ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  重新生成配置
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>业务类型</Label>
                  <Select
                    value={draftParsedInput.businessType}
                    onValueChange={(value) => setDraftParsedInput((prev) => ({ ...prev, businessType: value as BusinessType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BUSINESS_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>SKU 类型</Label>
                  <Select value={draftSkuType} onValueChange={(value) => setDraftParsedInput((prev) => applySkuType(prev, value as SkuType))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SKU_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>期望数量</Label>
                  <Input
                    type="number"
                    value={draftParsedInput.expectedQty ?? ''}
                    onChange={(e) => setDraftParsedInput((prev) => ({ ...prev, expectedQty: parseNumberInput(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>实际数量</Label>
                  <Input
                    type="number"
                    value={draftParsedInput.actualQty ?? ''}
                    onChange={(e) => setDraftParsedInput((prev) => ({ ...prev, actualQty: parseNumberInput(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>质量模式</Label>
                  <Select value={draftQualityMode} onValueChange={(value) => setDraftParsedInput((prev) => applyQualityMode(prev, value as QualityMode))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOOD">良品</SelectItem>
                      <SelectItem value="DAMAGED">残品</SelectItem>
                      <SelectItem value="MIXED">混合</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>收货模式</Label>
                  <Select
                    value={draftParsedInput.receivingMode || 'SKU'}
                    onValueChange={(value) => setDraftParsedInput((prev) => ({ ...prev, receivingMode: value as ReceivingMode }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SKU">SKU</SelectItem>
                      <SelectItem value="CONTAINER">容器</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {draftQualityMode === 'MIXED' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>良品数量</Label>
                    <Input
                      type="number"
                      value={draftParsedInput.goodQty ?? ''}
                      onChange={(e) => setDraftParsedInput((prev) => ({ ...prev, goodQty: parseNumberInput(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>残品数量</Label>
                    <Input
                      type="number"
                      value={draftParsedInput.damagedQty ?? ''}
                      onChange={(e) => setDraftParsedInput((prev) => ({ ...prev, damagedQty: parseNumberInput(e.target.value) }))}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>批次号</Label>
                  <Input
                    value={draftParsedInput.batchNumber ?? ''}
                    onChange={(e) => setDraftParsedInput((prev) => ({ ...prev, batchNumber: e.target.value || undefined }))}
                    placeholder="可选"
                  />
                </div>
                <div className="space-y-2">
                  <Label>效期</Label>
                  <Input
                    value={draftParsedInput.expiryDate ?? ''}
                    onChange={(e) => setDraftParsedInput((prev) => ({ ...prev, expiryDate: e.target.value || undefined }))}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>序列号列表</Label>
                  <Input
                    value={draftParsedInput.serialNumbers?.join(', ') ?? ''}
                    onChange={(e) =>
                      setDraftParsedInput((prev) => ({
                        ...prev,
                        serialNumbers: e.target.value
                          ? e.target.value.split(/[\s,，]+/).filter(Boolean)
                          : undefined,
                      }))
                    }
                    placeholder="多个序列号用逗号分隔"
                  />
                </div>
                <div className="space-y-2">
                  <Label>容器号</Label>
                  <Input
                    value={draftParsedInput.containerCode ?? ''}
                    onChange={(e) => setDraftParsedInput((prev) => ({ ...prev, containerCode: e.target.value || undefined }))}
                    placeholder="容器模式时填写"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>异常类型</Label>
                  <Input
                    value={draftParsedInput.exceptionType ?? ''}
                    onChange={(e) => setDraftParsedInput((prev) => ({ ...prev, exceptionType: e.target.value || undefined }))}
                    placeholder="如 no_batch_number / duplicate"
                  />
                </div>
                <div className="flex items-end gap-2 pb-2">
                  <Checkbox
                    checked={draftParsedInput.isNegativeTest === true}
                    onCheckedChange={(checked) =>
                      setDraftParsedInput((prev) => ({ ...prev, isNegativeTest: checked === true }))
                    }
                  />
                  <Label className="cursor-pointer">负向测试</Label>
                </div>
              </div>

              <div className="rounded-lg border border-dashed p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SKU 明细</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      开启多 SKU 后可直接维护每一行的 SKU 类型、数量、批次、效期和序列号
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={multiSkuMode}
                      onCheckedChange={(checked) => {
                        const enabled = checked === true
                        setMultiSkuMode(enabled)
                        const nextLines = enabled ? skuLines : [skuLines[0] ?? createSkuLine({ quantity: draftParsedInput.expectedQty ?? 1 })]
                        updateSkuLines(nextLines, enabled)
                      }}
                    />
                    <Label className="cursor-pointer">多 SKU 模式</Label>
                  </div>
                </div>

                <div className="space-y-3">
                  {skuLines.map((line, index) => (
                    <div key={line.id} className="rounded-md border bg-background p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">SKU {index + 1}</div>
                        {multiSkuMode && skuLines.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSkuLines(skuLines.filter((item) => item.id !== line.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>SKU 类型</Label>
                          <Select
                            value={line.skuType}
                            onValueChange={(value) =>
                              updateSkuLines(
                                skuLines.map((item) =>
                                  item.id === line.id ? { ...item, skuType: value as SkuType } : item,
                                ),
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(SKU_TYPE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>数量</Label>
                          <Input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateSkuLines(
                                skuLines.map((item) =>
                                  item.id === line.id
                                    ? { ...item, quantity: parseNumberInput(e.target.value) ?? 1 }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>批次号</Label>
                          <Input
                            value={line.batchNumber}
                            onChange={(e) =>
                              updateSkuLines(
                                skuLines.map((item) =>
                                  item.id === line.id ? { ...item, batchNumber: e.target.value } : item,
                                ),
                              )
                            }
                            placeholder="批次SKU/全属性SKU可填写"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>效期</Label>
                          <Input
                            value={line.expiryDate}
                            onChange={(e) =>
                              updateSkuLines(
                                skuLines.map((item) =>
                                  item.id === line.id ? { ...item, expiryDate: e.target.value } : item,
                                ),
                              )
                            }
                            placeholder="YYYY-MM-DD"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>序列号</Label>
                        <Input
                          value={line.serialNumbersText}
                          onChange={(e) =>
                            updateSkuLines(
                              skuLines.map((item) =>
                                item.id === line.id ? { ...item, serialNumbersText: e.target.value } : item,
                              ),
                            )
                          }
                          placeholder="多个序列号用逗号分隔"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateSkuLines([
                      ...skuLines,
                      createSkuLine({ quantity: draftParsedInput.expectedQty ?? 1 }),
                    ], true)
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加 SKU
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>场景编码</Label>
                  <Input
                    value={draftScenario.code}
                    onChange={(e) => setDraftScenario((prev) => ({ ...prev, code: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>场景名称</Label>
                  <Input
                    value={draftScenario.name}
                    onChange={(e) => setDraftScenario((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>所属分类</Label>
                  <Select
                    value={draftScenario.categoryCode || undefined}
                    onValueChange={(value) => setDraftScenario((prev) => ({ ...prev, categoryCode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.code} value={category.code}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Input
                    value={draftScenario.description}
                    onChange={(e) => setDraftScenario((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="场景描述"
                  />
                </div>
              </div>
            </div>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>高级配置</Label>
                    {jsonManuallyEdited && <Badge variant="secondary">已手动修改</Badge>}
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {advancedOpen ? '收起 JSON' : '展开 JSON'}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="config-json">测试配置 (JSON)</Label>
                    <Textarea
                      id="config-json"
                      className="min-h-[180px] font-mono text-xs"
                      value={draftScenario.config}
                      onChange={(e) => {
                        setJsonManuallyEdited(true)
                        setDraftScenario((prev) => ({ ...prev, config: e.target.value }))
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expected-json">预期结果 (JSON)</Label>
                    <Textarea
                      id="expected-json"
                      className="min-h-[160px] font-mono text-xs"
                      value={draftScenario.expected}
                      onChange={(e) => {
                        setJsonManuallyEdited(true)
                        setDraftScenario((prev) => ({ ...prev, expected: e.target.value }))
                      }}
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleCreateScenario} disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                保存
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
