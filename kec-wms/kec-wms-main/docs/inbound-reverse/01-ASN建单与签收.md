# ASN建单与签收

## 1. 覆盖范围

本文件只覆盖下面这些当前后端入口：

- `POST /api/v1/asn`
- `PUT /api/v1/asn/[id]`
- `DELETE /api/v1/asn/[id]`
- `POST /api/v1/asn/[id]/sign-in`

重点解释两张表：

- `asn`
- `asn_line`

## 2. 相关表

### 2.1 `asn`

当前主链里最重要的字段：

- `id`
- `tenant_id`
- `client_id`
- `warehouse_id`
- `asn_number`
- `external_number`
- `asn_type`
- `receiving_method`
- `status`
- `expected_arrival_date`
- `expected_arrival_time`
- `expected_putaway_date`
- `actual_arrival_at`
- `signed_at`
- `signed_by`
- `receiving_start_at`
- `receiving_end_at`
- `putaway_start_at`
- `putaway_end_at`
- `completed_at`
- `total_expected_qty`
- `total_received_qty`
- `total_putaway_qty`
- `total_expected_lines`
- `total_received_lines`
- `notes`
- `config`
- `created_by`
- `updated_by`

### 2.2 `asn_line`

当前主链里最重要的字段：

- `id`
- `asn_id`
- `line_number`
- `sku_id`
- `sku_code`
- `sku_name`
- `expected_qty`
- `received_qty`
- `received_good_qty`
- `received_damaged_qty`
- `putaway_qty`
- `uom_id`
- `uom_code`
- `batch_number`
- `expiry_date`
- `serial_numbers`
- `status`
- `notes`
- `created_by`
- `updated_by`

## 3. 建单：`POST /api/v1/asn`

## 3.1 作用

创建 ASN 主单和 ASN 明细。

这个接口同时支持两种入口：

- 内部 Session 用户调用
- API Key 外部调用

两条分支都会创建 `asn` 和 `asn_line`，但入参口径不同：

- 内部分支主要传 `clientId`、`warehouseId`、`skuId`
- 外部分支主要传 `clientCode`、`warehouseCode`、`skuCode`

## 3.2 前置条件

- 调用方必须认证通过
- 租户必须有效
- 客户必须存在
- 仓库必须存在
- SKU 必须存在，并且归属正确客户
- 若传了 `externalNumber`，同一租户同一客户下不能和未取消的 ASN 冲突
- 若传了 `asnNumber`，同一租户下不能重复
- 若 SKU 启用了批次管理，则明细里的 `batchNumber` 不能为空

## 3.3 主要入参校验

来自 `backend/src/lib/validations/asn.ts` 的当前校验重点：

- `clientId`、`warehouseId`、`skuId` 必须是 UUID
- `asnType` 允许：
  - `NORMAL`
  - `RETURN`
  - `TRANSFER`
  - `PRODUCTION`
  - `ADJUSTMENT`
- `expectedQty` 必须是正整数
- `asnNumber` 最长 `32`
- `externalNumber` 最长 `64`
- `skuCode` 最长 `64`
- `batchNumber` 最长 `64`

## 3.4 写库逻辑

### 3.4.1 写 `asn`

建单时直接写入：

- `tenantId`
- `clientId`
- `warehouseId`
- `asnNumber`
  - 若未传，则调用 `generateAsnNumber`
- `externalNumber`
- `asnType`
- `status = 'CREATED'`
- `expectedArrivalDate`
- `expectedArrivalTime`
- `expectedPutawayDate`
- `totalExpectedQty`
  - 所有明细 `expectedQty` 求和
- `totalExpectedLines`
  - 明细条数
- `notes`
- `config`
- `createdBy`
- `updatedBy`

当前建单阶段不会写：

- `receiving_method`
- `actualArrivalAt`
- `signedAt`
- `signedBy`
- `receivingStartAt`
- `receivingEndAt`
- `putawayStartAt`
- `putawayEndAt`
- `completedAt`
- `totalReceivedQty`
- `totalPutawayQty`

这些字段要到后续签收、收货、上架阶段才会更新。

### 3.4.2 写 `asn_line`

按明细数组逐行创建，并写入：

- `tenantId`
- `lineNumber`
  - 从 `1` 开始递增
- `skuId`
- `skuCode`
- `skuName`
- `expectedQty`
- `uomId`
- `uomCode`
- `batchNumber`
- `expiryDate`
- `status = 'PENDING'`
- `notes`
- `createdBy`
- `updatedBy`

当前建单阶段，`asn_line` 的这些字段保持默认：

- `receivedQty = 0`
- `receivedGoodQty = 0`
- `receivedDamagedQty = 0`
- `putawayQty = 0`
- `serialNumbers = null`

## 3.5 字段回写矩阵

| 表 | 字段 | 写入时机 | 值来源 | 事务 |
| --- | --- | --- | --- | --- |
| `asn` | `asn_number` | 建单 | 传入值或编号生成器 | 是 |
| `asn` | `status` | 建单 | 固定写 `CREATED` | 是 |
| `asn` | `total_expected_qty` | 建单 | 明细求和 | 是 |
| `asn` | `total_expected_lines` | 建单 | 明细条数 | 是 |
| `asn_line` | `line_number` | 建单 | 数组顺序 + 1 | 是 |
| `asn_line` | `expected_qty` | 建单 | 明细入参 | 是 |
| `asn_line` | `status` | 建单 | 固定写 `PENDING` | 是 |

## 3.6 失败条件

常见失败分支：

- 客户不存在
- 仓库不存在
- SKU 不存在
- SKU 不属于该客户
- `externalNumber` 重复
- `asnNumber` 重复
- 批次管理 SKU 未传 `batchNumber`
- 入参格式错误

## 4. 修改：`PUT /api/v1/asn/[id]`

## 4.1 作用

修改 ASN 主单基础信息。

这个接口不会修改 `asn_line`，也不会重算汇总字段。

## 4.2 前置条件

- 用户必须登录
- ASN 必须存在，且属于当前租户
- ASN 状态只能是：
  - `CREATED`
  - `PENDING_RECEIVING`

一旦进入收货阶段或更后阶段，当前接口拒绝修改。

## 4.3 实际更新字段

当前代码直接将校验通过的数据写入 `asn`，主要包括：

- `clientId`
- `warehouseId`
- `externalNumber`
- `asnType`
- `expectedArrivalDate`
- `expectedArrivalTime`
- `expectedPutawayDate`
- `notes`
- `config`
- `updatedBy`

不会更新：

- 明细行
- 汇总数量
- 状态字段

## 4.4 失败条件

- ASN 不存在
- ASN 状态不是 `CREATED / PENDING_RECEIVING`
- 入参格式错误

## 5. 删除：`DELETE /api/v1/asn/[id]`

## 5.1 作用

删除 ASN 主单。

## 5.2 前置条件

- 用户必须登录
- ASN 必须存在
- ASN 状态必须是 `CREATED`

当前实现只允许删除刚创建、尚未进入签收/收货的 ASN。

## 5.3 删除行为

- 直接执行 `prisma.asn.delete`
- `asn_line` 通过关联级联删除

当前接口不会做额外业务清理，因为按代码约束，能删的 ASN 还没有进入后续业务链。

## 5.4 失败条件

- ASN 不存在
- ASN 状态不是 `CREATED`

## 6. 签收：`POST /api/v1/asn/[id]/sign-in`

## 6.1 作用

对 ASN 执行签收，不直接手写状态，而是通过 `asnStateMachine.transition` 完成。

## 6.2 前置条件

- 用户必须登录
- ASN 必须存在
- `signedAt` 不能为空之前，必须是未签收状态
- 当前状态机要求签收动作从 `CREATED` 发起

## 6.3 实际状态变化

签收动作是：

- 动作：`SIGN_IN`
- 状态：`CREATED -> PENDING_RECEIVING`

## 6.4 实际更新字段

签收时附带写入：

- `signedAt = now`
- `signedBy = 当前用户`
- `actualArrivalAt`
  - 如果之前为空，则补成 `now`
  - 如果之前已有值，则保持不变

因此签收后，`asn` 关键字段通常会变成：

- `status = 'PENDING_RECEIVING'`
- `signed_at` 有值
- `signed_by` 有值
- `actual_arrival_at` 有值

`asn_line` 在签收阶段不发生更新。

## 6.5 字段回写矩阵

| 表 | 字段 | 写入时机 | 值来源 | 事务 |
| --- | --- | --- | --- | --- |
| `asn` | `status` | 签收 | 状态机动作 `SIGN_IN` | 由状态机控制 |
| `asn` | `signed_at` | 签收 | 当前时间 | 由状态机附带更新 |
| `asn` | `signed_by` | 签收 | 当前用户 ID | 由状态机附带更新 |
| `asn` | `actual_arrival_at` | 签收 | 当前时间或保留旧值 | 由状态机附带更新 |

## 6.6 失败条件

- 未登录
- ASN 不存在
- ASN 已签收
- 当前状态不允许签收

## 7. 当前代码中的几个容易误解点

### 7.1 `asn.ts` 里的状态枚举比真实主链更宽

在 `backend/src/lib/validations/asn.ts` 中还能看到：

- `CLOSED`
- `PARTIAL_PUTAWAY`

但这些不是当前 ASN 主链签收/建单的核心状态控制来源。

### 7.2 建单校验层定义的能力，不等于运行时都已完整落地

例如：

- `asnType` 定义得比较全
- `config` 允许传任意对象

但当前入库主链里，对这些值的后续使用仍以具体收货、上架代码是否读取为准。

## 8. 本阶段小结

建单与签收阶段的核心目标很明确：

- 先把 ASN 主数据和明细建立起来
- 然后通过签收把 ASN 从 `CREATED` 推到 `PENDING_RECEIVING`
- 为后续收货提供合法起点

这个阶段还没有形成库存，也不会写 `receiving_record`、`putaway_order`、`inventory_event` 等后续表。
