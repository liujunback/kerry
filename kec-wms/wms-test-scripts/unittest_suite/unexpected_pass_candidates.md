# 疑似“不该通过但可能通过”的场景清单

这份清单不是普通非法参数，而是基于当前校验代码推出来的“业务上应该拦，但代码约束偏宽松”的候选场景。

后续建议分两步处理：

1. 先做成单独的探针用例，不接主回归入口。
2. 确认真实行为后，再决定：
   - 归档为缺陷
   - 还是调整为正式回归失败用例

## 1. ASN 预计到货时间格式语义不严

- 接口：`POST /api/v1/asn`
- 候选请求：

```json
{
  "clientId": "<valid-client-id>",
  "warehouseId": "<valid-warehouse-id>",
  "asnType": "NORMAL",
  "externalNumber": "UNEXPECTED-PASS-ASN-001",
  "expectedArrivalTime": "99:99:99",
  "lines": [
    {
      "skuId": "<valid-sku-id>",
      "skuCode": "<valid-sku-code>",
      "expectedQty": 1
    }
  ]
}
```

- 业务预期：
  - 应该失败，时间语义无效。
- 代码现状：
  - 只校验最大长度 8，没有正则或合法时间范围校验。
- 代码参考：
  - [asn.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/asn.ts)

## 2. ASN 查询 `sortBy` 任意字符串可能被接受

- 接口：`GET /api/v1/asn`
- 候选请求：

```text
/api/v1/asn?sortBy=dropTable&page=1&pageSize=10
```

- 业务预期：
  - 应该失败，或至少只允许白名单字段。
- 代码现状：
  - `sortBy` 是普通 `z.string()`，没有枚举白名单。
- 风险：
  - 可能不是参数校验失败，而是在后续排序逻辑里表现出不稳定行为。
- 代码参考：
  - [asn.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/asn.ts)

## 3. 客户国家字段不是 ISO 码也可能通过

- 接口：`POST /api/v1/clients`
- 候选请求：

```json
{
  "clientCode": "UP-CLIENT-001",
  "clientName": "Unexpected Pass Client",
  "country": "CHINA"
}
```

- 业务预期：
  - 通常应限制为国家代码，例如 `CN`。
- 代码现状：
  - 只限制最大长度 64，没有格式或代码集校验。
- 代码参考：
  - [client.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/client.ts)

## 4. 客户联系电话是明显脏值也可能通过

- 接口：`POST /api/v1/clients`
- 候选请求：

```json
{
  "clientCode": "UP-CLIENT-002",
  "clientName": "Unexpected Pass Client 2",
  "contactPhone": "abc###@@@"
}
```

- 业务预期：
  - 至少应限制为电话常见字符集。
- 代码现状：
  - 只限制长度，不校字符内容。
- 代码参考：
  - [client.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/client.ts)

## 5. 仓库国家字段只限长度，不限字符内容

- 接口：`POST /api/v1/warehouses`
- 候选请求：

```json
{
  "warehouseCode": "UP-WH-001",
  "warehouseName": "Unexpected Pass Warehouse",
  "warehouseType": "SELF_BUILT",
  "country": "1@"
}
```

- 业务预期：
  - 应限制为 `CN` / `US` 这类 ISO 两位代码。
- 代码现状：
  - 只有 `max(2)`，没有正则。
- 代码参考：
  - [warehouse.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/warehouse.ts)

## 6. 仓库联系电话内容不合法也可能通过

- 接口：`POST /api/v1/warehouses`
- 候选请求：

```json
{
  "warehouseCode": "UP-WH-002",
  "warehouseName": "Unexpected Pass Warehouse 2",
  "warehouseType": "SELF_BUILT",
  "contactPhone": "phone??!!"
}
```

- 业务预期：
  - 应拦截明显非电话内容。
- 代码现状：
  - 只限制长度。
- 代码参考：
  - [warehouse.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/warehouse.ts)

## 7. SKU 编码没有字符集约束，特殊字符或中文可能通过

- 接口：`POST /api/v1/skus`
- 候选请求：

```json
{
  "clientId": "<valid-client-id>",
  "skuCode": "中文 SKU !",
  "skuName": "Unexpected Pass SKU"
}
```

- 业务预期：
  - 很多 WMS 会限制 SKU 编码字符集，不应允许空格/中文/特殊符号混用。
- 代码现状：
  - 只有长度要求，没有正则约束。
- 代码参考：
  - [sku.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/sku.ts)

## 8. 波次策略调度时间 `25:99` 可能通过

- 接口：`POST /api/v1/wave-strategies`
- 候选请求片段：

```json
{
  "rules": {
    "triggerConfig": {
      "modes": ["SCHEDULED"],
      "scheduleTimes": ["25:99"]
    }
  }
}
```

- 业务预期：
  - 应失败，小时和分钟都越界。
- 代码现状：
  - 只校 `^\d{2}:\d{2}$`，不校具体时间范围。
- 代码参考：
  - [wave-strategy.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/wave-strategy.ts)

## 9. 波次策略 `expectedOutboundTime.from > to` 可能通过

- 接口：`POST /api/v1/wave-strategies`
- 候选请求片段：

```json
{
  "rules": {
    "filterConfig": {
      "expectedOutboundTime": {
        "from": "2026-05-21T10:00:00.000Z",
        "to": "2026-05-20T10:00:00.000Z"
      }
    }
  }
}
```

- 业务预期：
  - 应失败，起始时间不能大于结束时间。
- 代码现状：
  - 当前只校 datetime 格式，不校前后关系。
- 代码参考：
  - [wave-strategy.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/wave-strategy.ts)

## 10. Returns 列表 `sortBy` 任意字符串可能通过

- 接口：`GET /api/v1/returns`
- 候选请求：

```text
/api/v1/returns?sortBy=madeUpField&page=1&pageSize=20
```

- 业务预期：
  - 应只允许固定排序字段。
- 代码现状：
  - `sortBy` 是普通字符串，没有白名单。
- 代码参考：
  - [returns.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/returns.ts)

## 11. Outbound 列表 `sortBy` 任意字符串可能通过

- 接口：`GET /api/v1/outbound-orders`
- 候选请求：

```text
/api/v1/outbound-orders?sortBy=totallyInvalid&page=1&pageSize=10
```

- 业务预期：
  - 应只允许白名单字段。
- 代码现状：
  - `sortBy` 是普通字符串，没有枚举约束。
- 代码参考：
  - [outbound.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/outbound.ts)

## 12. Returns 外部处置项：同时给错配的 `returnLineNo` 和 `skuCode`，可能仍通过

- 接口：`POST /api/v1/returns/by-number/{preReturnNo}/dispositions`
- 候选请求片段：

```json
{
  "items": [
    {
      "returnLineNo": "LINE-001",
      "skuCode": "ANOTHER-SKU",
      "action": "GOOD_PUTAWAY",
      "quantity": 1
    }
  ]
}
```

- 业务预期：
  - 如果 `returnLineNo` 和 `skuCode` 指向不同明细，应该失败。
- 代码现状：
  - 校验层只要求两者至少有一个，没有交叉一致性校验。
- 代码参考：
  - [returns.ts](C:/Users/bliuj/Desktop/kerry/kec-wms/kec-wms-main/backend/src/lib/validations/returns.ts)

---

## 建议优先级

优先转成探针的建议顺序：

1. 波次策略 `25:99`
2. ASN `expectedArrivalTime=99:99:99`
3. SKU 编码特殊字符
4. 客户/仓库电话脏值
5. 各列表接口 `sortBy` 任意字符串

这几类最容易复现，也最容易和开发对齐成明确缺陷。
