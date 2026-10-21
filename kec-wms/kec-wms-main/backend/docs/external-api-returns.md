# 退件外部API接口文档

> 返回 [主文档](./external-api.md)

## 接口列表

| 方法 | 接口 | 说明 |
|------|------|------|
| POST | `/api/v1/returns` | 下发预报退件单 |
| POST | `/api/v1/returns/by-number/{preReturnNo}/dispositions` | 下发退件处理意见 |

---

## 1. 下发预报退件单

**POST** `/api/v1/returns`

外部系统下发买家退件预报。WMS 生成内部退件单号，退件单和明细初始状态均为 `PENDING_SIGN`。

### 认证

请求头必须携带 API Key：

```http
X-API-Key: wms_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

API Key 必须具备 `return:create` 权限范围。未携带 API Key 或使用后台登录态调用会返回 401/403。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | ✅ | 客户编码 |
| warehouseCode | string | ✅ | 仓库编码 |
| preReturnNo | string | ✅ | 外部预报退件单号 |
| logisticsNo | string | ✅ | 物流单号 / 包裹号，同一仓库内有效退件单不可重复 |
| notes | string | - | 备注 |
| lines | array | ✅ | 退件明细，至少 1 行 |

### 退件明细行

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skuCode | string | ✅ | SKU 编码，必须属于该客户且已启用 |
| expectedQty | number | ✅ | 预报数量，必须为正整数 |
| notes | string | - | 明细备注 |

### 请求示例

```json
{
  "clientCode": "CLIENT001",
  "warehouseCode": "WH-SH-001",
  "preReturnNo": "RMA-20260416-001",
  "logisticsNo": "SF1234567890",
  "notes": "客户退货预报",
  "lines": [
    {
      "skuCode": "SKU001",
      "expectedQty": 2,
      "notes": "原订单退回"
    },
    {
      "skuCode": "SKU002",
      "expectedQty": 1
    }
  ]
}
```

### 响应示例

```json
{
  "success": true,
  "message": "预报退件单创建成功",
  "data": {
    "id": "uuid-xxx",
    "returnNo": "RTN-WH-SH-001-260416-0001",
    "returnType": "BUYER_RETURN",
    "preReturnNo": "RMA-20260416-001",
    "logisticsNo": "SF1234567890",
    "status": "PENDING_SIGN",
    "totalExpectedQty": 3,
    "totalLineCount": 2,
    "createdAt": "2026-04-16T08:00:00.000Z"
  }
}
```

### 常见错误

| HTTP状态码 | code | 说明 |
|-----------|------|------|
| 400 | CLIENT_NOT_FOUND | 客户不存在或未启用 |
| 400 | CLIENT_SCOPE_MISMATCH | 客户编码与 API Key 绑定客户不一致 |
| 400 | WAREHOUSE_NOT_FOUND | 仓库不存在 |
| 400 | WAREHOUSE_SCOPE_MISMATCH | 仓库编码与 API Key 绑定仓库不一致 |
| 400 | SKU_NOT_FOUND | 明细包含不存在或未启用的 SKU |
| 400 | - | 同一仓库内物流单号已存在有效退件单 |
| 403 | - | 使用 Session 调用，或 API Key 缺少 `return:create` 权限 |

---

## 2. 下发退件处理意见

**POST** `/api/v1/returns/by-number/{preReturnNo}/dispositions`

外部系统在退件清点完成后，按退件明细下发客户处理意见。WMS 收到后会写入退件明细处理方式，并把可生成退件上架单的明细推进到 `DISPOSITION_RECEIVED`。

### 认证

请求头必须携带 API Key，且 API Key 必须具备 `return:disposition` 权限范围。

```http
X-API-Key: wms_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| preReturnNo | string | ✅ | 外部预报退件单号 |

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | 条件必填 | 客户编码；如果 API Key 未绑定客户则必填 |
| warehouseCode | string | 条件必填 | 仓库编码；如果 API Key 未绑定仓库则必填 |
| items | array | ✅ | 处理意见明细，至少 1 行 |

### 处理意见明细

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| returnLineNo | string | 条件必填 | 退件明细号。优先推荐使用，能直接定位明细 |
| skuCode | string | 条件必填 | SKU 编码；未提供 `returnLineNo` 时必填 |
| quality | string | - | `GOOD` / `DAMAGED`，用于辅助匹配唯一清点明细 |
| batchNumber | string | - | 批次号，用于辅助匹配唯一清点明细 |
| expiryDate | string | - | 效期，ISO 8601 日期或日期时间，用于辅助匹配唯一清点明细 |
| containerCode | string | - | 容器号，用于辅助匹配唯一清点明细 |
| tempLocationCode | string | - | 暂存库位，用于辅助匹配唯一清点明细 |
| action | string | ✅ | 处理意见：`GOOD_PUTAWAY` / `DAMAGED_PUTAWAY` / `DESTROY` |
| quantity | number | ✅ | 处理数量，不能超过对应明细剩余可处理数量 |
| notes | string | - | 备注 |

`returnLineNo` 和 `skuCode` 至少提供一个。未提供 `returnLineNo` 时，系统会用 `skuCode` 加可选的质量、批次、效期、容器、暂存库位匹配唯一明细；匹配到多条会返回 `RETURN_LINE_AMBIGUOUS`。

### 请求示例

```json
{
  "clientCode": "CLIENT001",
  "warehouseCode": "WH-SH-001",
  "items": [
    {
      "returnLineNo": "RTN-WH-SH-001-260416-0001-001",
      "action": "GOOD_PUTAWAY",
      "quantity": 2,
      "notes": "良品回库"
    },
    {
      "skuCode": "SKU002",
      "quality": "DAMAGED",
      "containerCode": "RET-C001",
      "action": "DAMAGED_PUTAWAY",
      "quantity": 1
    }
  ]
}
```

### 响应示例

```json
{
  "success": true,
  "message": "处理意见已保存",
  "data": {
    "id": "uuid-xxx",
    "returnNo": "RTN-WH-SH-001-260416-0001",
    "status": "DISPOSITION_RECEIVED",
    "preReturnNo": "RMA-20260416-001",
    "logisticsNo": "SF1234567890"
  }
}
```

### 常见错误

| HTTP状态码 | code | 说明 |
|-----------|------|------|
| 400 | CLIENT_CODE_REQUIRED | API Key 未绑定客户且未传客户编码 |
| 400 | WAREHOUSE_CODE_REQUIRED | API Key 未绑定仓库且未传仓库编码 |
| 400 | RETURN_LINE_NOT_FOUND | 未找到匹配的退件明细 |
| 400 | RETURN_LINE_AMBIGUOUS | 匹配到多条退件明细，需要提供 `returnLineNo` 或更多匹配条件 |
| 400 | - | 退件单状态不允许录入处理方式，或处理数量超过已清点数量 |
| 403 | - | 使用 Session 调用，或 API Key 缺少 `return:disposition` 权限 |
| 404 | RETURN_ORDER_NOT_FOUND | 退件单不存在 |

---

## 3. 状态说明

| 字段 | 固定值 | 说明 |
|------|--------|------|
| returnType | `BUYER_RETURN` | 外部预报退件固定为买家退件 |
| status | `PENDING_SIGN` | 等待仓库扫描物流单号签收 |
| line.status | `PENDING_SIGN` | 明细等待签收后进入清点流程 |
