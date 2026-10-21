export type ReasonCategory =
  | 'ALL'
  | 'CLAIMED'
  | 'FILTER_MISS'
  | 'HOT_SKU'
  | 'FIXED_COMBO'
  | 'NON_FIXED_COMBO'
  | 'ORDER_STRUCTURE_CLASSIFY'

export type ReasonMessageParams = Record<string, string | number>
export type ReasonTranslate = (key: string, values?: ReasonMessageParams) => string

export interface LocalizedReasonLike {
  reason?: string | null
  reasonKey?: string | null
  reasonParams?: ReasonMessageParams | null
}

export interface MatchedRuleSnapshotLike {
  reasonCode?: string
  reason?: string
  reasonKey?: string
  reasonParams?: ReasonMessageParams | null
  messageKey?: string
  messageParams?: ReasonMessageParams | null
  claimedByStrategyId?: string
  classification?: {
    reasonCode?: string
    reason?: string
    reasonKey?: string
    reasonParams?: ReasonMessageParams | null
    targetCode?: string
    orderType?: string
    isHotMatched?: boolean
    fixedComboMatched?: boolean
  } | null
  filter?: {
    matched?: boolean
    groupJoinMode?: string
    groups?: Array<{
      groupNo: number
      matched: boolean
      conditions: Array<{
        fieldCode: string
        value: string
        valueTo?: string
        actualValue?: string
        reasonCode?: string
        reason?: string
        reasonKey?: string
        reasonParams?: ReasonMessageParams | null
        matched: boolean
      }>
    }>
  } | null
}

export const reasonCategoryTranslationKeys: Record<ReasonCategory, string> = {
  ALL: 'categories.ALL',
  CLAIMED: 'categories.CLAIMED',
  FILTER_MISS: 'categories.FILTER_MISS',
  HOT_SKU: 'categories.HOT_SKU',
  FIXED_COMBO: 'categories.FIXED_COMBO',
  NON_FIXED_COMBO: 'categories.NON_FIXED_COMBO',
  ORDER_STRUCTURE_CLASSIFY: 'categories.ORDER_STRUCTURE_CLASSIFY',
}

export const reasonCodeTranslationKeys: Record<string, string> = {
  CLAIMED_BY_HIGHER_PRIORITY: 'codes.CLAIMED_BY_HIGHER_PRIORITY',
  FILTER_CONDITIONS_NOT_MATCHED: 'codes.FILTER_CONDITIONS_NOT_MATCHED',
  NO_WAVE_TYPE_MATCHED: 'codes.NO_WAVE_TYPE_MATCHED',
  HOT_SKU_MATCH: 'codes.HOT_SKU_MATCH',
  FIXED_COMBO_MATCH: 'codes.FIXED_COMBO_MATCH',
  MULTI_ITEM_FALLBACK: 'codes.MULTI_ITEM_FALLBACK',
  REMAINDER_RELEASED_TO_FALLBACK: 'codes.REMAINDER_RELEASED_TO_FALLBACK',
  ORDER_STRUCTURE_DEFAULT_MATCH: 'codes.ORDER_STRUCTURE_DEFAULT_MATCH',
  FILTER_MATCH_ORDER_BUSINESS_TYPE: 'codes.FILTER_MATCH_ORDER_BUSINESS_TYPE',
  FILTER_MISS_ORDER_BUSINESS_TYPE: 'codes.FILTER_MISS_ORDER_BUSINESS_TYPE',
  FILTER_MATCH_PLATFORM: 'codes.FILTER_MATCH_PLATFORM',
  FILTER_MISS_PLATFORM: 'codes.FILTER_MISS_PLATFORM',
  FILTER_MATCH_SHIPPING_METHOD: 'codes.FILTER_MATCH_SHIPPING_METHOD',
  FILTER_MISS_SHIPPING_METHOD: 'codes.FILTER_MISS_SHIPPING_METHOD',
  FILTER_MATCH_CLIENT: 'codes.FILTER_MATCH_CLIENT',
  FILTER_MISS_CLIENT: 'codes.FILTER_MISS_CLIENT',
  FILTER_MATCH_ZONE: 'codes.FILTER_MATCH_ZONE',
  FILTER_MISS_ZONE: 'codes.FILTER_MISS_ZONE',
  FILTER_MATCH_EXPECTED_OUTBOUND_TIME: 'codes.FILTER_MATCH_EXPECTED_OUTBOUND_TIME',
  FILTER_MISS_EXPECTED_OUTBOUND_TIME: 'codes.FILTER_MISS_EXPECTED_OUTBOUND_TIME',
  FILTER_MISS_EXPECTED_OUTBOUND_TIME_EMPTY: 'codes.FILTER_MISS_EXPECTED_OUTBOUND_TIME_EMPTY',
  FILTER_MATCH_DEFAULT: 'codes.FILTER_MATCH_DEFAULT',
}

export function getReasonCategory(snapshot?: MatchedRuleSnapshotLike | null): ReasonCategory {
  if (snapshot?.reasonCode === 'CLAIMED_BY_HIGHER_PRIORITY') return 'CLAIMED'
  if (snapshot?.reasonCode === 'FILTER_CONDITIONS_NOT_MATCHED') return 'FILTER_MISS'
  if (snapshot?.classification?.reasonCode === 'FIXED_COMBO_MATCH') return 'FIXED_COMBO'
  if (snapshot?.classification?.reasonCode === 'MULTI_ITEM_FALLBACK') return 'NON_FIXED_COMBO'
  if (snapshot?.classification?.reasonCode === 'HOT_SKU_MATCH') return 'HOT_SKU'
  return 'ORDER_STRUCTURE_CLASSIFY'
}

export function getPrimaryReasonCode(snapshot?: MatchedRuleSnapshotLike | null): string | null {
  if (!snapshot) return null
  return snapshot.reasonCode || snapshot.classification?.reasonCode || null
}

export function getReasonCategoryTranslationKey(category: ReasonCategory): string {
  return reasonCategoryTranslationKeys[category]
}

export function getReasonCodeTranslationKey(reasonCode?: string | null): string | null {
  if (!reasonCode) return null
  return reasonCodeTranslationKeys[reasonCode] || null
}

export function resolveLocalizedText(
  translate: ReasonTranslate,
  key?: string | null,
  params?: ReasonMessageParams | null,
  fallback?: string | null,
  empty = '-'
): string {
  if (key) {
    return translate(key, params || undefined)
  }
  if (fallback && fallback.trim()) {
    return fallback
  }
  return empty
}
