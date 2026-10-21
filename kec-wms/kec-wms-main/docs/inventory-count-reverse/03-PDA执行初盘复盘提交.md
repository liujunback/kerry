# PDA（手持端）执行初盘复盘提交

## 1. 覆盖入口

PDA（手持端）后端入口：

- `GET /api/pda/v1/inventory/counts`
- `GET /api/pda/v1/inventory/counts/{orderId}/batches/{batchId}`
- `POST /api/pda/v1/inventory/counts/{orderId}/batches/{batchId}/start`
- `POST /api/pda/v1/inventory/counts/{orderId}/batches/{batchId}/lines/{detailId}/submit`
- `POST /api/pda/v1/inventory/counts/{orderId}/lines/submit`
- `POST /api/pda/v1/inventory/counts/{orderId}/batches/{batchId}/complete`

服务入口：

- `backend/src/lib/pda/inventory-count-handler.ts`
- `backend/src/lib/pda/inventory-count-permission.ts`
- `backend/src/lib/services/inventory-count/batch.ts`

## 2. 权限和可见范围

PDA（手持端）盘点接口统一要求 `inventory:count`（盘点权限）。批次列表只返回可执行状态：

- 盘点单：`READY`、`IN_PROGRESS`、`PENDING_ADJUST`
- 批次：`READY`、`IN_PROGRESS`、`RECOUNTING`

当前代码会读取批次上的指派人：

- 初盘批次看 `counterUserId`
- 复盘批次看 `reviewerUserId`

如果批次设置了对应指派人，PDA（手持端）提交前会校验当前用户是否匹配。

## 3. 批次列表和排序

批次列表会聚合批次下明细：

- 总明细数
- 已盘明细数
- 待盘明细数
- 差异明细数
- 库位数
- SKU（商品）数

排序会参考库位的 `pickPriority`（拣选优先级）、`pickSequence`（拣选顺序）和库位编码，保证任务执行顺序更贴近仓内动线。

## 4. 批次详情

批次详情可以按库位编码、SKU（商品）或条码过滤。返回时会把轮次行和明细合并成 PDA（手持端）可展示的行：

- 库位
- SKU（商品）
- 批次、LPN（容器号）、效期
- 账面数量
- 当前轮次实盘数量
- 当前状态

盲盘和明盘的展示差异由 `executionConfigJson`（执行配置）和 `countMode`（盘点方式）共同决定。

## 5. 开始批次

开始批次会调用 `startInventoryCountBatch`：

- 初盘批次从 `READY` 到 `IN_PROGRESS`
- 复盘批次从 `READY` 到 `RECOUNTING`
- 记录开始时间
- 如果盘点单还未进入执行中，会把盘点单推进到 `IN_PROGRESS`

## 6. 提交明细

明细提交会更新轮次行和明细：

- 初盘提交后，轮次行进入 `SUBMITTED` 或 `RECOUNT_REQUIRED`
- 无差异时明细可直接进入 `CONFIRMED`
- 有差异时明细进入 `RECOUNT_PENDING`
- 复盘提交后明细进入 `RECOUNTED` 或 `CONFIRMED`

提交人不是批次默认值，而是当前认证用户。也就是说，实际执行人快照写到轮次行上。

## 7. 范围行提交

`POST /api/pda/v1/inventory/counts/{orderId}/lines/submit` 是范围行提交入口。它不直接要求传 `detailId`，而是根据提交的库位、SKU（商品）、批次等条件匹配待盘明细，再转到批次行提交逻辑。

这个入口适合扫码先定位范围，再由后端找到对应盘点明细。

## 8. 完成批次

完成批次前会检查是否还有 `PENDING`（待提交）轮次行：

- 初盘批次若有待复盘行，会进入 `PENDING_RECOUNT` 并生成复盘批次。
- 初盘批次若没有待复盘行，会进入 `COMPLETED`。
- 复盘批次完成后进入 `COMPLETED`。

当前代码里也有提交后的自动完成逻辑，因此实际执行时可能在最后一条提交后自动推进批次状态。
