export const PICK_ORDER_TASK_TYPE_LABELS: Record<string, string> = {
  SINGLE_ONE_HOT: '单品单件爆款',
  SINGLE_ONE_NORMAL: '单品单件非爆款',
  SINGLE_MULTI_HOT: '单品多件爆款',
  SINGLE_MULTI_NORMAL: '单品多件非爆款',
  MULTI_FIXED_COMBO: '多品固定组合',
  MULTI_NON_FIXED: '多品无固定组合',
}

export function getPickOrderTaskTypeLabel(taskType: string | null | undefined) {
  if (!taskType) return '-'
  return PICK_ORDER_TASK_TYPE_LABELS[taskType] || taskType
}

export function isSingleOnePickOrderTaskType(taskType: string | null | undefined) {
  return taskType === 'SINGLE_ONE_HOT' || taskType === 'SINGLE_ONE_NORMAL'
}

export function isSingleOneHotPickOrderTaskType(taskType: string | null | undefined) {
  return taskType === 'SINGLE_ONE_HOT'
}

export function isSingleOneNormalPickOrderTaskType(taskType: string | null | undefined) {
  return taskType === 'SINGLE_ONE_NORMAL'
}

export function isSingleMultiHotPickOrderTaskType(taskType: string | null | undefined) {
  return taskType === 'SINGLE_MULTI_HOT'
}

export function isFixedComboPickOrderTaskType(taskType: string | null | undefined) {
  return taskType === 'MULTI_FIXED_COMBO'
}

export function isPickOrderBatchPackingTaskType(taskType: string | null | undefined) {
  return isSingleOneHotPickOrderTaskType(taskType)
    || isSingleMultiHotPickOrderTaskType(taskType)
    || isFixedComboPickOrderTaskType(taskType)
}

export function canDirectScanPickOrderForPacking(taskType: string | null | undefined) {
  return isSingleOnePickOrderTaskType(taskType)
    || isSingleMultiHotPickOrderTaskType(taskType)
    || isFixedComboPickOrderTaskType(taskType)
}
