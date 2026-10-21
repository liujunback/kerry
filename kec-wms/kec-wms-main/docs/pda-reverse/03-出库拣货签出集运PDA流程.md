# 出库拣货签出集运 PDA（手持端）流程

## 1. 覆盖入口

Android（安卓）端入口：

- `PickingScreen.kt`
- `PickingViewModel.kt`
- `CheckoutScreen.kt`
- `CheckoutViewModel.kt`
- `ManifestMountScreen.kt`
- `ManifestMountViewModel.kt`
- `PickingApi.kt`
- `CheckoutApi.kt`
- `ManifestMountApi.kt`

后端接口：

- `GET /api/pda/v1/outbound/picking/tasks`
- `GET /api/pda/v1/outbound/picking/tasks/{id}`
- `POST /api/pda/v1/outbound/picking/tasks/{id}/bind-container`
- `POST /api/pda/v1/outbound/picking/tasks/{id}/lines/{lineId}/pick`
- `POST /api/pda/v1/outbound/picking/tasks/{id}/complete`
- `POST /api/pda/v1/outbound/checkout/validate`
- `POST /api/pda/v1/outbound/checkout/scan`
- `POST /api/pda/v1/outbound/checkout/confirm`
- `GET /api/pda/v1/outbound/checkout/pending`
- `POST /api/pda/v1/outbound/manifest-mount/validate`
- `POST /api/pda/v1/outbound/manifest-mount/scan`
- `POST /api/pda/v1/outbound/manifest-mount/confirm`

## 2. 拣货任务

当前 PDA（手持端）拣货入口按任务流执行：

1. 加载可拣货任务列表。
2. 打开单个任务详情。
3. 如果任务需要容器，先绑定目标容器。
4. 按推荐行或选中行扫描库位和 SKU（商品）。
5. 校验扫描库位、SKU（商品）或条码是否匹配。
6. 提交本次实拣数量。
7. 任务行更新后刷新当前任务，继续下一行。
8. 所有行完成后调用完成任务接口。

页面端会做一层防误扫校验，例如库位不匹配、SKU（商品）不匹配、数量超过同库位同 SKU（商品）剩余量时先阻断提交。

## 3. 拣货进度

当前拣货页不是只按单行显示进度，而是会按 location + SKU（库位加商品）聚合剩余待拣量。这样能支持同一个 SKU（商品）在同一库位多个行的汇总判断，也能在弹窗里展示整体进度。

## 4. 签出

签出入口分为校验、扫描、确认：

1. 扫描或输入容器/订单号。
2. `ValidateCheckoutContainerUseCase`（签出容器校验用例）调用后端校验接口。
3. 扫描订单或包裹。
4. `ScanCheckoutOrderUseCase`（签出订单扫描用例）提交扫描结果。
5. 所有需要签出的订单完成后，调用确认接口。

签出真正的库存扣减不在 PDA（手持端）本地完成，而由后端签出服务写库存事件和扣减库存。

## 5. 集运挂载

集运挂载流程：

1. 扫描 manifest（集运清单）。
2. `ValidateManifestUseCase`（集运校验用例）加载集运工作区。
3. 扫描签出单或包裹。
4. `ScanManifestCheckoutUseCase`（集运签出单扫描用例）提交扫描结果。
5. 全部挂载完成后，调用确认接口。

## 6. 与出库 reverse 文档关系

PDA（手持端）这里只描述终端执行。出库单、波次、拣货单、打包、签出和集运的后端写库细节，请看：

- [../outbound-reverse/README.md](../outbound-reverse/README.md)
