import { StateMachine, EntityConfig } from './state-machine'

// ASN 状态枚举
export type AsnStatus =
  | 'CREATED'
  | 'PENDING_RECEIVING'
  | 'RECEIVING'
  | 'RECEIVED'
  | 'PUTTING_AWAY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FORCE_COMPLETED'

// ASN 操作类型
export type AsnAction =
  | 'SIGN_IN'
  | 'START_RECEIVE'
  | 'COMPLETE_RECEIVE'
  | 'FORCE_COMPLETE_RECEIVE'
  | 'START_PUTAWAY'
  | 'COMPLETE_PUTAWAY'
  | 'FORCE_COMPLETE_PUTAWAY'
  | 'CANCEL'
  | 'ROLLBACK'

// ASN 状态机配置
const asnConfig: EntityConfig<AsnStatus, AsnAction> = {
  entityType: 'ASN',
  tableName: 'Asn',
  dbTableName: 'asn',
  numberField: 'asnNumber',
  dbNumberField: 'asn_number',
  lockStrategy: 'pessimistic',
  transitions: {
    SIGN_IN: {
      from: ['CREATED'],
      to: 'PENDING_RECEIVING',
      operationType: 'SIGN_IN',
      operationName: '扫描签收',
    },
    START_RECEIVE: {
      from: ['PENDING_RECEIVING', 'CREATED'],
      to: 'RECEIVING',
      operationType: 'START_RECEIVE',
      operationName: '开始收货',
    },
    COMPLETE_RECEIVE: {
      from: ['RECEIVING'],
      to: 'RECEIVED',
      operationType: 'COMPLETE_RECEIVE',
      operationName: '完成收货',
    },
    FORCE_COMPLETE_RECEIVE: {
      from: ['RECEIVING', 'PENDING_RECEIVING'],
      to: 'FORCE_COMPLETED',
      operationType: 'FORCE_COMPLETE_RECEIVE',
      operationName: '强制完结收货',
    },
    START_PUTAWAY: {
      from: ['RECEIVED'],
      to: 'PUTTING_AWAY',
      operationType: 'START_PUTAWAY',
      operationName: '开始上架',
    },
    COMPLETE_PUTAWAY: {
      from: ['PUTTING_AWAY'],
      to: 'COMPLETED',
      operationType: 'COMPLETE_PUTAWAY',
      operationName: '完成上架',
    },
    FORCE_COMPLETE_PUTAWAY: {
      from: ['PUTTING_AWAY'],
      to: 'FORCE_COMPLETED',
      operationType: 'FORCE_COMPLETE_PUTAWAY',
      operationName: '强制完结上架',
    },
    CANCEL: {
      from: ['CREATED', 'PENDING_RECEIVING'],
      to: 'CANCELLED',
      operationType: 'CANCEL',
      operationName: '取消',
    },
    ROLLBACK: {
      from: ['PENDING_RECEIVING', 'RECEIVING', 'RECEIVED', 'PUTTING_AWAY'],
      to: 'CREATED',
      operationType: 'ROLLBACK',
      operationName: '回滚',
    },
  },
}

// 额外数据更新（ASN 特有字段）
export interface AsnAdditionalData {
  signedAt?: Date
  signedBy?: string
  actualArrivalAt?: Date
  receivingStartAt?: Date
  receivingEndAt?: Date
  putawayStartAt?: Date
  putawayEndAt?: Date
  completedAt?: Date
  totalReceivedQty?: number
  totalReceivedLines?: number
  totalPutawayQty?: number
}

// 创建 ASN 状态机实例
export const asnStateMachine = new StateMachine<AsnStatus, AsnAction>(asnConfig)

// 导出类型供外部使用
export type { OperatorContext, StatusChangeEvent } from './state-machine'
