# 外部 API 库存与 Webhook 接入说明

本文补充当前对外开放的库存查询、库存流水拉取，以及库存流水主动推送（Webhook）能力。

## 1. 接口范围

- 库存明细查询：`GET /api/v1/inventory`
- 库存流水查询：`GET /api/v1/inventory/transactions`
- 订单详情补充包裹信息：`GET /api/v1/outbound-orders/by-number/{externalOrderNo}`
- 库存流水主动推送：按 `API Key` 配置的 Webhook 地址推送 `inventory.event.created`

OpenAPI 文档入口：

- 综合外部接口：[backend/public/openapi.yaml](../backend/public/openapi.yaml)
- 出库订单接口：[backend/public/openapi-outbound.yaml](../backend/public/openapi-outbound.yaml)

## 2. 认证方式

所有外部接口均通过请求头传递：

```http
X-API-Key: your-api-key
```

若 `API Key` 绑定了 `clientId` 或 `warehouseId`，外部查询与推送都会自动限制在对应作用域内。

## 3. 库存查询

### 3.1 查询库存明细

接口：

```http
GET /api/v1/inventory
```

推荐参数：

- `warehouseCode`
- `clientCode`
- `locationCode`
- `locationCodes`
- `skuCode`
- `batchNo`
- `lpn`
- `asnNumber`
- `page`
- `pageSize`

说明：

- 默认返回的是聚合后的库存视图，不是原始库存桶全量明细。
- 若传 `bucketType`，则返回原始桶记录。
- `batchNo` 是对外别名，内部字段仍是 `batchNumber`。

### 3.2 查询库存流水

接口：

```http
GET /api/v1/inventory/transactions
```

推荐参数：

- `warehouseCode`
- `clientCode`
- `locationCode`
- `skuCode`
- `eventType`
- `bucketType`
- `referenceType`
- `referenceNumber`
- `startDate`
- `endDate`
- `page`
- `pageSize`

说明：

- 底层数据来源于 `InventoryEvent`。
- 推荐外部系统按时间窗口拉取，并用 `eventNumber` 做幂等去重。
- 当前返回按 `sortBy + 次排序字段` 稳定排序，默认按 `createdAt desc`。

## 4. 订单包裹信息

接口：

```http
GET /api/v1/outbound-orders/by-number/{externalOrderNo}
```

本次新增返回字段：

- `shipments`: 包裹信息数组

包裹字段包括：

- `shipmentNumber`
- `status`
- `carrierCode`
- `carrierName`
- `trackingNumber`
- `shippingMethod`
- `packageCount`
- `totalWeightKg`
- `shippedAt`
- `deliveredAt`

说明：

- 为兼容旧接入方，顶层 `trackingNumber` 仍保留。
- 若订单还未生成包裹，`shipments` 返回空数组。

## 5. 库存流水 Webhook 推送

### 5.1 如何开启

在 `API Key` 管理页面或接口中配置：

- `webhookUrl`
- `webhookSecret`
- `webhookEvents`

当前支持的事件：

- `inventory.event.created`

### 5.2 系统如何选择推送配置

库存事件产生后，系统会：

1. 找到当前事件所属租户下所有启用中的 `API Key`
2. 过滤掉未配置 `webhookUrl` 的 key
3. 过滤掉 `webhookEvents` 不包含 `inventory.event.created` 的 key
4. 若 key 绑定了 `clientId`，只接收该客户事件
5. 若 key 绑定了 `warehouseId`，只接收该仓库事件

满足条件的每一条 `API Key` 配置都会收到一次推送。

### 5.3 推送请求头

系统推送时会带上：

```http
Content-Type: application/json
X-Webhook-ID: <api-key-id>
X-Event-ID: <inventory-event-id>
X-Event-Type: inventory.event.created
X-Timestamp: <event-created-at-iso>
X-Signature: sha256=<hmac-hex>    // 仅当配置了 webhookSecret
```

### 5.4 推送体示例

```json
{
  "id": "evt-id-001",
  "type": "inventory.event.created",
  "timestamp": "2026-04-28T10:15:20.000Z",
  "data": {
    "id": "evt-id-001",
    "eventNumber": "EVT-MA1B2C-8XYZ12",
    "eventType": "PUTAWAY",
    "bucketType": "AVAILABLE",
    "quantityDelta": 100,
    "quantityBefore": 0,
    "quantityAfter": 100,
    "batchNumber": "BATCH-202604",
    "lpn": "LPN-0001",
    "asnNumber": "ASN-20260428-001",
    "reasonCode": null,
    "reasonDescription": null,
    "referenceType": "ASN",
    "referenceId": "asn-id-1",
    "referenceNumber": "ASN-20260428-001",
    "referenceLineId": null,
    "eventDate": "2026-04-28T10:15:20.000Z",
    "createdAt": "2026-04-28T10:15:20.000Z",
    "warehouse": {
      "id": "wh-id-1",
      "warehouseCode": "WH-SH-001",
      "warehouseName": "上海总仓"
    },
    "location": {
      "id": "loc-id-1",
      "locationCode": "A-01-01"
    },
    "sku": {
      "id": "sku-id-1",
      "skuCode": "SKU-001",
      "skuName": "测试商品A"
    },
    "client": {
      "id": "client-id-1",
      "clientCode": "CLIENT001",
      "clientName": "测试客户"
    }
  }
}
```

### 5.5 重试行为

- 单次事件推送失败时会按 worker 内部重试逻辑再次发送
- 对 `408/429/500/502/503/504` 这类响应会进行重试
- 外部接收方仍应自行做幂等，建议使用 `eventNumber` 或 `X-Event-ID`

## 6. 接入建议

- 查询库存明细时优先使用编码参数，不要依赖内部 UUID
- 拉取库存流水时按时间窗口增量同步，并保存最后处理的 `eventNumber`
- 接收 Webhook 时校验 `X-Signature`
- 若同时使用“主动推送 + 补偿拉取”，建议以 `eventNumber` 做统一幂等键
