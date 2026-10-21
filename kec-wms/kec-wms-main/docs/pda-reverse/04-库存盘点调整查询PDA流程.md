# 库存盘点调整查询 PDA（手持端）流程

## 1. 覆盖入口

Android（安卓）端入口：

- `InventoryScreens.kt`
- `InventoryViewModel.kt`
- `InventoryCountScreen.kt`
- `InventoryCountViewModel.kt`
- `InventoryApi.kt`
- `InventoryCountApi.kt`

后端接口：

- `GET /api/pda/v1/inventory/query`
- `GET /api/pda/v1/inventory/adjustments/lookup`
- `POST /api/pda/v1/inventory/adjustments/submit`
- `GET /api/pda/v1/inventory/counts`
- `GET /api/pda/v1/inventory/counts/{orderId}/batches/{batchId}`
- `POST /api/pda/v1/inventory/counts/{orderId}/batches/{batchId}/start`
- `POST /api/pda/v1/inventory/counts/{orderId}/batches/{batchId}/lines/{detailId}/submit`
- `POST /api/pda/v1/inventory/counts/{orderId}/lines/submit`
- `POST /api/pda/v1/inventory/counts/{orderId}/batches/{batchId}/complete`

## 2. 库存查询

库存查询页通过库位、SKU（商品）或条码查询库存。后端 `inventory/query` 从库存桶聚合候选数据，并返回批次、效期、ASN（入库通知单）号、库存桶类型等信息。

这个查询是移动端展示入口，不直接改库存。

## 3. 库存调整和转移

当前库存调整和库存转移共用 `InventoryOperationScreen`（库存操作界面）：

1. 扫描源库位。
2. 扫描 SKU（商品）或条码。
3. 后端返回可选库存候选项。
4. 选择 ASN（入库通知单）或库存桶候选。
5. 调整模式输入调整方向、数量、原因。
6. 转移模式输入目标库位和数量。
7. 提交后由后端创建和执行对应库存调整逻辑。

页面在调整成功后会回到源库位输入焦点，适合连续扫描作业。

## 4. PDA（手持端）盘点执行

盘点 PDA（手持端）不是创建盘点单的入口，只执行已经生成范围和批次的盘点任务：

1. `GET /inventory/counts` 获取可执行批次。
2. `GET /inventory/counts/{orderId}/batches/{batchId}` 获取批次明细。
3. `POST /start` 将批次从 `READY` 推进到执行中。
4. 明细级提交走 `POST /batches/{batchId}/lines/{detailId}/submit`。
5. 范围行提交走 `POST /lines/submit`，后端按库位、SKU（商品）、批次等范围匹配明细。
6. `POST /complete` 完成批次。

后端 PDA（手持端）盘点接口统一校验 `inventory:count`（盘点权限）。当前代码还会根据批次上的盘点人或复盘人做指派校验。

## 5. 与盘点 reverse 文档关系

PDA（手持端）这里只覆盖执行入口。盘点单创建、范围生成、库存锁定、初盘复盘、差异调整和结算，请看：

- [../inventory-count-reverse/README.md](../inventory-count-reverse/README.md)
