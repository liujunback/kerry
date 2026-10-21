import { StateMachine, EntityConfig, OperatorContext } from './state-machine'

// 发货单状态枚举
export type ShipmentStatus =
  | 'CREATED'           // 已创建
  | 'LABEL_PRINTED'     // 已打印面单
  | 'READY'             // 待发货
  | 'SHIPPED'           // 已发货
  | 'IN_TRANSIT'        // 运输中
  | 'OUT_FOR_DELIVERY'  // 派送中
  | 'DELIVERED'         // 已签收
  | 'EXCEPTION'         // 异常
  | 'RETURNED'          // 已退回

// 发货单操作类型
export type ShipmentAction =
  | 'PRINT_LABEL'       // 打印面单
  | 'MARK_READY'        // 标记待发货
  | 'SHIP'              // 发货
  | 'UPDATE_TRANSIT'    // 更新运输状态
  | 'OUT_FOR_DELIVERY'  // 开始派送
  | 'DELIVER'           // 签收
  | 'MARK_EXCEPTION'    // 标记异常
  | 'RETURN'            // 退回
  | 'RESOLVE_EXCEPTION' // 解决异常

// 发货单状态机配置
const shipmentConfig: EntityConfig<ShipmentStatus, ShipmentAction> = {
  entityType: 'SHIPMENT',
  tableName: 'Shipment',
  dbTableName: 'shipment',
  numberField: 'shipmentNumber',
  dbNumberField: 'shipment_number',
  lockStrategy: 'optimistic',
  transitions: {
    PRINT_LABEL: {
      from: ['CREATED'],
      to: 'LABEL_PRINTED',
      operationType: 'PRINT_LABEL',
      operationName: '打印面单',
    },
    MARK_READY: {
      from: ['LABEL_PRINTED'],
      to: 'READY',
      operationType: 'MARK_READY',
      operationName: '标记待发货',
    },
    SHIP: {
      from: ['CREATED', 'LABEL_PRINTED', 'READY'],
      to: 'SHIPPED',
      operationType: 'SHIP',
      operationName: '发货',
    },
    UPDATE_TRANSIT: {
      from: ['SHIPPED'],
      to: 'IN_TRANSIT',
      operationType: 'UPDATE_TRANSIT',
      operationName: '更新运输状态',
    },
    OUT_FOR_DELIVERY: {
      from: ['IN_TRANSIT'],
      to: 'OUT_FOR_DELIVERY',
      operationType: 'OUT_FOR_DELIVERY',
      operationName: '开始派送',
    },
    DELIVER: {
      from: ['IN_TRANSIT', 'OUT_FOR_DELIVERY'],
      to: 'DELIVERED',
      operationType: 'DELIVER',
      operationName: '签收',
    },
    MARK_EXCEPTION: {
      from: ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'],
      to: 'EXCEPTION',
      operationType: 'MARK_EXCEPTION',
      operationName: '标记异常',
    },
    RETURN: {
      from: ['EXCEPTION', 'IN_TRANSIT'],
      to: 'RETURNED',
      operationType: 'RETURN',
      operationName: '退回',
    },
    RESOLVE_EXCEPTION: {
      from: ['EXCEPTION'],
      to: 'IN_TRANSIT',
      operationType: 'RESOLVE_EXCEPTION',
      operationName: '解决异常',
    },
  },
}

// 创建发货单状态机实例
export const shipmentStateMachine = new StateMachine<ShipmentStatus, ShipmentAction>(shipmentConfig)

// 导出类型
export type { OperatorContext }
