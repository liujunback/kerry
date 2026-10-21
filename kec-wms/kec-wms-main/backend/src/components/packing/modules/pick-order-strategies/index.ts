'use client'

import {
  isFixedComboPickOrderTaskType,
  isSingleMultiHotPickOrderTaskType,
  isSingleOneHotPickOrderTaskType,
  isSingleOneNormalPickOrderTaskType,
} from '@/lib/packing/task-type'
import type { PickOrderPackingStrategy } from './types'
import { fixedComboPickOrderStrategy } from './fixed-combo-strategy'
import { orderClosePickOrderStrategy } from './order-close-strategy'
import { singleMultiHotPickOrderStrategy } from './single-multi-hot-strategy'
import { singleOneNormalPickOrderStrategy } from './single-one-normal-strategy'
import { singleOnePickOrderStrategy } from './single-one-strategy'

export function getPickOrderPackingStrategy(taskType: string | null | undefined): PickOrderPackingStrategy {
  if (isSingleOneHotPickOrderTaskType(taskType)) return singleOnePickOrderStrategy
  if (isSingleOneNormalPickOrderTaskType(taskType)) return singleOneNormalPickOrderStrategy
  if (isSingleMultiHotPickOrderTaskType(taskType)) return singleMultiHotPickOrderStrategy
  if (isFixedComboPickOrderTaskType(taskType)) return fixedComboPickOrderStrategy
  return orderClosePickOrderStrategy
}

export type {
  PickOrderPackingStrategy,
  PickOrderScanApiResult,
  PickOrderStrategyUiContext,
} from './types'
