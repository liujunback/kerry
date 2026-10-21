/**
 * 质量类型映射工具
 * 用于在库存调整时判断库位/库区的质量属性匹配
 */

// Bucket 类型（库存桶类型）
export const BucketType = {
  AVAILABLE: 'AVAILABLE',      // 可用
  ALLOCATED: 'ALLOCATED',      // 已分配
  PICKING: 'PICKING',          // 拣货中
  FROZEN: 'FROZEN',            // 冻结
  DEFECTIVE: 'DEFECTIVE',      // 破损/次品
  EXCEPTION: 'EXCEPTION',      // 异常库存
  QC_HOLD: 'QC_HOLD',          // 质检暂扣
  COUNT_HOLD: 'COUNT_HOLD',    // 盘点暂扣
  COUNT_SURPLUS: 'COUNT_SURPLUS', // 盘盈记录
  COUNT_SHORTAGE: 'COUNT_SHORTAGE', // 盘亏记录
} as const

// Zone 质量类型（库区质量属性）
export const ZoneQualityType = {
  GOOD: 'GOOD',                // 良品区
  DEFECTIVE: 'DEFECTIVE',      // 次品区
  DAMAGED: 'DAMAGED',          // 损坏区
} as const

export type BucketTypeValue = (typeof BucketType)[keyof typeof BucketType]
export type ZoneQualityTypeValue = (typeof ZoneQualityType)[keyof typeof ZoneQualityType]

/**
 * Bucket类型到Zone质量类型的映射
 * 定义哪些bucket类型的商品可以存放到哪些质量类型的库区
 */
export const BUCKET_TO_ZONE_QUALITY_MAP: Record<BucketTypeValue, ZoneQualityTypeValue[]> = {
  // 可用库存 -> 只能放良品区
  [BucketType.AVAILABLE]: [ZoneQualityType.GOOD],

  // 已分配库存 -> 只能放良品区
  [BucketType.ALLOCATED]: [ZoneQualityType.GOOD],

  // 拣货中库存 -> 只能放良品区
  [BucketType.PICKING]: [ZoneQualityType.GOOD],

  // 冻结库存 -> 只能放良品区（冻结是状态，不是质量问题）
  [BucketType.FROZEN]: [ZoneQualityType.GOOD],

  // 破损/次品库存 -> 可以放次品区或损坏区
  [BucketType.DEFECTIVE]: [ZoneQualityType.DEFECTIVE, ZoneQualityType.DAMAGED],

  // 异常库存 -> 可以放良品区（异常暂挂，不参与可用库存）
  [BucketType.EXCEPTION]: [ZoneQualityType.GOOD],

  // 质检暂扣 -> 可以放良品区（质检中，质量待定）
  [BucketType.QC_HOLD]: [ZoneQualityType.GOOD],

  // 盘点暂扣 -> 可以放良品区（盘点是流程，不是质量问题）
  [BucketType.COUNT_HOLD]: [ZoneQualityType.GOOD],

  // 盘点差异记录 -> 可以放良品区（差异处理流程，不参与可用库存）
  [BucketType.COUNT_SURPLUS]: [ZoneQualityType.GOOD],
  [BucketType.COUNT_SHORTAGE]: [ZoneQualityType.GOOD],
}

/**
 * 检查bucket类型是否可以存放到指定质量类型的库区
 * @param bucketType - 库存桶类型
 * @param zoneQualityType - 库区质量类型
 * @returns 是否允许存放
 */
export function canStoreBucketInZone(
  bucketType: BucketTypeValue,
  zoneQualityType: ZoneQualityTypeValue
): boolean {
  const allowedZoneTypes = BUCKET_TO_ZONE_QUALITY_MAP[bucketType]
  return allowedZoneTypes?.includes(zoneQualityType) ?? false
}

/**
 * 获取bucket类型允许存放的库区质量类型列表
 * @param bucketType - 库存桶类型
 * @returns 允许的库区质量类型数组
 */
export function getAllowedZoneQualityTypes(
  bucketType: BucketTypeValue
): ZoneQualityTypeValue[] {
  return BUCKET_TO_ZONE_QUALITY_MAP[bucketType] || []
}
