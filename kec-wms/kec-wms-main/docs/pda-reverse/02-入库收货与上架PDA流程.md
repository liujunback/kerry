# 入库收货与上架 PDA（手持端）流程

## 1. 覆盖入口

Android（安卓）端入口：

- `AsnSignInScreen.kt`
- `AsnScanScreen.kt`
- `SkuReceivingScreen.kt`
- `ReceivingViewModel.kt`
- `PutawayScreens.kt`
- `PutawaySkuViewModel.kt`
- `AsnApi.kt`
- `PutawayApi.kt`

后端接口：

- `POST /api/pda/v1/inbound/asn/sign-in`
- `GET /api/pda/v1/inbound/asn/lookup`
- `GET /api/pda/v1/inbound/asn/{id}/receiving/lookup-sku`
- `POST /api/pda/v1/inbound/asn/{id}/receiving/sku`
- `POST /api/pda/v1/inbound/asn/{id}/receiving/complete`
- `GET /api/pda/v1/inbound/shelving/putaway-order`
- `GET /api/pda/v1/inbound/shelving/container`
- `GET /api/pda/v1/inbound/shelving/location`
- `POST /api/pda/v1/inbound/shelving`

## 2. ASN签收

PDA（手持端）签收流程：

1. 操作员扫描或输入 ASN（入库通知单）单号。
2. `SignInAsnUseCase`（ASN签收用例）校验 ASN（入库通知单）单号非空。
3. `AsnRepository.signInAsn` 调用 `AsnApi.signInAsn`。
4. 后端完成签收并返回 ASN（入库通知单）详情。
5. 页面展示签收结果和摘要。

这个入口只处理 ASN（入库通知单）签收，不负责创建 ASN（入库通知单）。

## 3. SKU收货

SKU（商品）收货流程：

1. 选择收货模式并扫描 ASN（入库通知单）。
2. `LoadAsnUseCase`（加载ASN用例）调用 ASN 查询接口。
3. 扫描 SKU（商品）条码。
4. `LookupReceivingSkuUseCase`（查询收货SKU用例）调用 `lookup-sku` 接口。
5. 页面根据 SKU（商品）是否首收、是否批次管控、是否效期管控要求补充信息。
6. 提交时 `SubmitReceivingUseCase`（提交收货用例）校验数量大于 0。
7. 后端写收货记录、ASN（入库通知单）明细收货数量和相关状态。

当前页面对首收 SKU（商品）有额外处理：如果 `isFirstReceiving`（是否首收）为真，需要先录入尺寸重量，再允许继续收货。

## 4. 容器收货

容器收货在 `ReceivingViewModel` 中与 SKU（商品）收货共用状态机，但有额外容器步骤：

1. 扫描 ASN（入库通知单）。
2. 扫描容器号。
3. `OpenReceivingContainerUseCase`（打开收货容器用例）检查容器用途、启用状态、关闭状态和占用状态。
4. 扫描 SKU（商品）并提交收货。
5. 提交成功后尝试关闭容器。
6. 如果关闭失败，页面保留 `containerHasPendingClose`（容器待关闭）状态，下一次提交前会优先补关容器。

当前实现会把容器维度的批次和效期缓存到页面状态中，便于同一容器内后续 SKU（商品）收货复用。

## 5. 上架

PDA（手持端）上架分两种模式：

- SKU（商品）上架：先输入上架单号，再扫描 SKU（商品）或条码匹配任务行。
- 容器上架：扫描容器，后端返回容器内待上架明细。

共同步骤：

1. 加载上架单或容器明细。
2. 扫描目标库位并通过 `LookupPutawayLocationUseCase`（查询上架库位用例）确认库位。
3. 输入上架数量。
4. `SubmitPutawayUseCase`（提交上架用例）调用后端上架接口。
5. 后端完成库存事件、库存桶、上架明细、上架单状态更新。

当前容器上架只支持容器里可确定的单 SKU（商品）明细。页面发现容器内多 SKU（商品）时会提示不支持。

## 6. 与入库 reverse 文档关系

PDA（手持端）这里只描述移动端动作和接口调用顺序。实际 ASN（入库通知单）状态机、收货记录、上架库存落账，请看：

- [../inbound-reverse/README.md](../inbound-reverse/README.md)
