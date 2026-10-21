import { StateMachine, EntityConfig, OperatorContext } from './state-machine'

// 出库单状态枚举
export type OutboundOrderStatus =
  | 'PENDING'           // 待处理
  | 'ALLOCATED'         // 已分配
  | 'OUT_OF_STOCK'      // 缺货
  | 'PENDING_PICK'      // 待拣货
  | 'PICKING'           // 拣货中
  | 'PICKED'            // 已拣货
  | 'SORTING'           // 分拣中
  | 'SORTED'            // 分拣完成
  | 'PACKING'           // 打包中
  | 'PACKED'            // 已打包
  | 'CHECKOUT_PENDING'  // 待签出
  | 'CHECKED_OUT'       // 已签出
  | 'CANCELLED'         // 已取消
  | 'ON_HOLD'           // 暂停

// 出库单操作类型
export type OutboundOrderAction =
  | 'ALLOCATE'
  | 'MARK_OUT_OF_STOCK'
  | 'CREATE_PICK'
  | 'START_PICK'
  | 'COMPLETE_PICK'
  | 'START_SORT'
  | 'COMPLETE_SORT'
  | 'START_PACK'
  | 'COMPLETE_PACK'
  | 'CHECKOUT'
  | 'CANCEL'
  | 'HOLD'
  | 'RESUME'

// 出库单状态机配置
const outboundOrderConfig: EntityConfig<OutboundOrderStatus, OutboundOrderAction> = {
  entityType: 'OUTBOUND_ORDER',
  tableName: 'OutboundOrder',
  dbTableName: 'outbound_order',
  numberField: 'orderNumber',
  dbNumberField: 'order_number',
  lockStrategy: 'optimistic', // 高并发场景使用乐观锁
  transitions: {
    ALLOCATE: {
      from: ['PENDING'],
      to: 'ALLOCATED',
      operationType: 'ALLOCATE',
      operationName: '分配库存',
    },
    MARK_OUT_OF_STOCK: {
      from: ['PENDING'],
      to: 'OUT_OF_STOCK',
      operationType: 'MARK_OUT_OF_STOCK',
      operationName: '标记缺货',
    },
    CREATE_PICK: {
      from: ['ALLOCATED'],
      to: 'PENDING_PICK',
      operationType: 'CREATE_PICK',
      operationName: '生成拣货单',
    },
    START_PICK: {
      from: ['PENDING_PICK'],
      to: 'PICKING',
      operationType: 'START_PICK',
      operationName: '开始拣货',
    },
    COMPLETE_PICK: {
      from: ['PICKING'],
      to: 'PICKED',
      operationType: 'COMPLETE_PICK',
      operationName: '完成拣货',
    },
    START_SORT: {
      from: ['PICKED'],
      to: 'SORTING',
      operationType: 'START_SORT',
      operationName: '开始分拣',
    },
    COMPLETE_SORT: {
      from: ['SORTING'],
      to: 'SORTED',
      operationType: 'COMPLETE_SORT',
      operationName: '完成分拣',
    },
    START_PACK: {
      from: ['PICKED', 'SORTED'],
      to: 'PACKING',
      operationType: 'START_PACK',
      operationName: '开始打包',
    },
    COMPLETE_PACK: {
      from: ['PACKING'],
      to: 'PACKED',
      operationType: 'COMPLETE_PACK',
      operationName: '完成打包',
    },
    CHECKOUT: {
      from: ['PACKED', 'CHECKOUT_PENDING'],
      to: 'CHECKED_OUT',
      operationType: 'CHECKOUT',
      operationName: '签出',
    },
    CANCEL: {
      from: ['PENDING', 'ALLOCATED', 'PENDING_PICK'],
      to: 'CANCELLED',
      operationType: 'CANCEL',
      operationName: '取消',
    },
    HOLD: {
      from: ['PENDING', 'ALLOCATED', 'PENDING_PICK'],
      to: 'ON_HOLD',
      operationType: 'HOLD',
      operationName: '暂停',
    },
    RESUME: {
      from: ['ON_HOLD', 'OUT_OF_STOCK'],
      to: 'PENDING',
      operationType: 'RESUME',
      operationName: '恢复',
    },
  },
}

// 创建出库单状态机实例
export const outboundOrderStateMachine = new StateMachine<OutboundOrderStatus, OutboundOrderAction>(outboundOrderConfig)

// 导出类型
export type { OperatorContext }
