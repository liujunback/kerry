export * from './types'
export { pickOrderModule, createPickOrderModule, type PickOrderModuleState } from './pick-order-module'
export { orderModule, createOrderModule, type OrderModuleState } from './order-module'

import type { ScanType } from './types'
import { pickOrderModule } from './pick-order-module'
import { orderModule } from './order-module'

// 模块注册表
export const packingModules = {
  PICK_ORDER: pickOrderModule,
  ORDER: orderModule,
} as const

// 根据扫描类型获取模块
export function getPackingModule(scanType: ScanType) {
  return packingModules[scanType]
}
