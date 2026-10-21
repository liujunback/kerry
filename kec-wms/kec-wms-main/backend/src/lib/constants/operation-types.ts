// 实体类型
export type OperationEntityType =
  | 'ASN'
  | 'OUTBOUND_ORDER'
  | 'WAVE'
  | 'SHIPMENT'
  | 'PICK_TASK'
  | 'PUTAWAY_TASK'
  | 'SORTING_WALL'

// ASN 操作类型
export const ASN_OPERATION_TYPES = {
  SIGN_IN: { type: 'SIGN_IN', name: '扫描签收' },
  START_RECEIVE: { type: 'START_RECEIVE', name: '开始收货' },
  COMPLETE_RECEIVE: { type: 'COMPLETE_RECEIVE', name: '完成收货' },
  FORCE_COMPLETE_RECEIVE: { type: 'FORCE_COMPLETE_RECEIVE', name: '强制完结收货' },
  START_PUTAWAY: { type: 'START_PUTAWAY', name: '开始上架' },
  COMPLETE_PUTAWAY: { type: 'COMPLETE_PUTAWAY', name: '完成上架' },
  FORCE_COMPLETE_PUTAWAY: { type: 'FORCE_COMPLETE_PUTAWAY', name: '强制完结上架' },
  ROLLBACK: { type: 'ROLLBACK', name: '回滚' },
  CANCEL: { type: 'CANCEL', name: '取消' },
  CLOSE: { type: 'CLOSE', name: '关闭' },
} as const

// 订单操作类型
export const ORDER_OPERATION_TYPES = {
  CREATE: { type: 'CREATE', name: '创建订单' },
  ALLOCATE: { type: 'ALLOCATE', name: '分配库存' },
  ALLOCATE_FAIL: { type: 'ALLOCATE_FAIL', name: '分配失败' },
  MARK_OUT_OF_STOCK: { type: 'MARK_OUT_OF_STOCK', name: '标记缺货' },
  DEALLOCATE: { type: 'DEALLOCATE', name: '取消分配' },
  ROLLBACK: { type: 'ROLLBACK', name: '回退到创建状态' },
  CREATE_PICK_TASK: { type: 'CREATE_PICK_TASK', name: '生成拣货单' },
  CANCEL_PICK_TASK: { type: 'CANCEL_PICK_TASK', name: '取消拣货单' },
  PRINT_PICK_TASK: { type: 'PRINT_PICK_TASK', name: '打印拣货单' },
  JOIN_WAVE: { type: 'JOIN_WAVE', name: '加入波次' },
  RELEASE_WAVE: { type: 'RELEASE_WAVE', name: '释放波次' },
  START_PICK: { type: 'START_PICK', name: '开始拣货' },
  COMPLETE_PICK: { type: 'COMPLETE_PICK', name: '完成拣货' },
  COMPLETE_SORTING: { type: 'COMPLETE_SORTING', name: '完成二次分拣' },
  START_PACK: { type: 'START_PACK', name: '开始打包' },
  COMPLETE_PACK: { type: 'COMPLETE_PACK', name: '完成打包' },
  SIGN_OUT: { type: 'SIGN_OUT', name: '签出' },
  SHIP: { type: 'SHIP', name: '发货' },
  CANCEL: { type: 'CANCEL', name: '取消' },
  INTERCEPT: { type: 'INTERCEPT', name: '订单拦截' },
  INTERCEPT_FAIL: { type: 'INTERCEPT_FAIL', name: '拦截失败' },
  MARK_EXCEPTION: { type: 'MARK_EXCEPTION', name: '标记异常' },
  HOLD: { type: 'HOLD', name: '暂停' },
  RESUME: { type: 'RESUME', name: '恢复' },
} as const

// 波次操作类型
export const WAVE_OPERATION_TYPES = {
  CREATE: { type: 'CREATE', name: '创建波次' },
  RELEASE: { type: 'RELEASE', name: '释放波次' },
  START_PICK: { type: 'START_PICK', name: '开始拣货' },
  COMPLETE_PICK: { type: 'COMPLETE_PICK', name: '完成拣货' },
  CANCEL: { type: 'CANCEL', name: '取消' },
} as const

// 拣货单操作类型
export const PICK_TASK_OPERATION_TYPES = {
  CREATE: { type: 'CREATE', name: '创建拣货单' },
  ASSIGN: { type: 'ASSIGN', name: '分配操作人' },
  PRINT: { type: 'PRINT', name: '打印拣货单' },
  START_PICK: { type: 'START_PICK', name: '开始拣货' },
  COMPLETE_PICK: { type: 'COMPLETE_PICK', name: '完成拣货' },
  CANCEL: { type: 'CANCEL', name: '取消拣货单' },
} as const

// 发货单操作类型
export const SHIPMENT_OPERATION_TYPES = {
  CREATE: { type: 'CREATE', name: '创建发货单' },
  PRINT_LABEL: { type: 'PRINT_LABEL', name: '打印面单' },
  MARK_READY: { type: 'MARK_READY', name: '标记待发货' },
  SHIP: { type: 'SHIP', name: '发货' },
  UPDATE_TRANSIT: { type: 'UPDATE_TRANSIT', name: '更新运输状态' },
  OUT_FOR_DELIVERY: { type: 'OUT_FOR_DELIVERY', name: '开始派送' },
  DELIVER: { type: 'DELIVER', name: '签收' },
  MARK_EXCEPTION: { type: 'MARK_EXCEPTION', name: '标记异常' },
  RETURN: { type: 'RETURN', name: '退回' },
  RESOLVE_EXCEPTION: { type: 'RESOLVE_EXCEPTION', name: '解决异常' },
} as const

export type AsnOperationType = keyof typeof ASN_OPERATION_TYPES
export type OrderOperationType = keyof typeof ORDER_OPERATION_TYPES
export type WaveOperationType = keyof typeof WAVE_OPERATION_TYPES
export type PickTaskOperationType = keyof typeof PICK_TASK_OPERATION_TYPES
export type ShipmentOperationType = keyof typeof SHIPMENT_OPERATION_TYPES
