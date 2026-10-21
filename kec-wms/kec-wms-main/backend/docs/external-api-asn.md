# ASN 外部API接口文档

> 返回 [主文档](./external-api.md)

## 接口列表

| 方法 | 接口 | 说明 |
|------|------|------|
| POST | `/api/v1/asn` | 创建ASN |
| GET | `/api/v1/asn` | 查询ASN列表 |
| GET | `/api/v1/asn/by-number/{externalNumber}` | 通过外部单号获取详情 |
| PUT | `/api/v1/asn/by-number/{externalNumber}` | 通过外部单号更新 |
| DELETE | `/api/v1/asn/by-number/{externalNumber}` | 通过外部单号删除 |
| GET | `/api/v1/asn/by-number/{externalNumber}/lines` | 获取ASN明细列表 |
| POST | `/api/v1/asn/by-number/{externalNumber}/lines` | 添加ASN明细 |
| PUT | `/api/v1/asn/by-number/{externalNumber}/lines/{lineNumber}` | 更新ASN明细 |
| DELETE | `/api/v1/asn/by-number/{externalNumber}/lines/{lineNumber}` | 删除ASN明细 |
| POST | `/api/v1/asn/by-number/{externalNumber}/cancel` | 取消ASN |
| GET | `/api/v1/asn/by-number/{externalNumber}/status` | 获取ASN状态 |

---

## 1. 创建ASN

**POST** `/api/v1/asn`

创建入库通知单（ASN）。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | ✅ | 客户编码 |
| warehouseCode | string | ✅ | 仓库编码 |
| externalNumber | string | ✅ | 外部单号（用于后续查询/更新/删除） |
| asnNumber | string | - | ASN单号，不填则自动生成 |
| asnType | string | - | ASN类型，默认"NORMAL" |
| expectedArrivalDate | string | - | 预计到货日期 (ISO 8601) |
| notes | string | - | 备注 |
| lines | array | ✅ | ASN明细行 |

### ASN明细行 (lines)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skuCode | string | ✅ | SKU编码 |
| expectedQty | number | ✅ | 预期数量 |
| uomCode | string | - | 单位编码 |
| batchNumber | string | - | 批次号 |
| expiryDate | string | - | 效期 (ISO 8601) |
| notes | string | - | 备注 |

### 枚举值

**asnType (ASN类型):**
- `NORMAL` - 正常入库
- `RETURN` - 退货入库
- `TRANSFER` - 调拨入库
- `PRODUCTION` - 生产入库
- `ADJUSTMENT` - 调整入库

### 请求示例

```json
{
  "clientCode": "CLIENT001",
  "warehouseCode": "WH-SH-001",
  "asnNumber": "ASN-2026-001",
  "externalNumber": "PO-12345",
  "asnType": "NORMAL",
  "expectedArrivalDate": "2024-12-20T10:00:00Z",
  "notes": "请注意轻拿轻放",
  "lines": [
    {
      "skuCode": "SKU001",
      "expectedQty": 100,
      "batchNumber": "BATCH001",
      "expiryDate": "2025-12-31T00:00:00Z",
      "notes": "第一批货物"
    },
    {
      "skuCode": "SKU002",
      "expectedQty": 50
    }
  ]
}
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "asnNumber": "ASN-2024-001",
    "externalNumber": "PO-12345",
    "status": "CREATED",
    "asnType": "NORMAL",
    "expectedArrivalDate": "2024-12-20T10:00:00.000Z",
    "notes": "请注意轻拿轻放",
    "totalExpectedQty": 150,
    "totalReceivedQty": 0,
    "lineCount": 2,
    "createdAt": "2024-12-15T08:00:00.000Z",
    "updatedAt": "2024-12-15T08:00:00.000Z"
  }
}
```

---

## 2. 查询ASN列表

**GET** `/api/v1/asn`

查询ASN列表，支持分页和筛选。

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | 条件必填 | 客户编码（如果API Key未绑定客户则必填） |
| warehouseCode | string | - | 仓库编码筛选 |
| status | string | - | 状态筛选 |
| asnType | string | - | ASN类型筛选 |
| search | string | - | 搜索关键词（ASN单号/外部单号） |
| page | number | - | 页码，默认1 |
| pageSize | number | - | 每页数量，默认20 |

### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-xxx",
      "asnNumber": "ASN-2024-001",
      "externalNumber": "PO-12345",
      "status": "CREATED",
      "asnType": "NORMAL",
      "totalExpectedQty": 150,
      "totalReceivedQty": 0,
      "lineCount": 2,
      "createdAt": "2024-12-15T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## 3. 通过外部单号获取详情

**GET** `/api/v1/asn/by-number/{externalNumber}`

通过外部单号获取ASN详细信息，包含明细行。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部单号 |

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | 条件必填 | 客户编码（如果API Key未绑定客户则必填） |

### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "asnNumber": "ASN-2024-001",
    "externalNumber": "PO-12345",
    "status": "CREATED",
    "asnType": "NORMAL",
    "expectedArrivalDate": "2024-12-20T10:00:00.000Z",
    "notes": "请注意轻拿轻放",
    "totalExpectedQty": 150,
    "totalReceivedQty": 0,
    "lineCount": 2,
    "client": {
      "id": "uuid-client",
      "clientCode": "CLIENT001",
      "name": "客户A"
    },
    "warehouse": {
      "id": "uuid-warehouse",
      "warehouseCode": "WH001",
      "name": "主仓库"
    },
    "lines": [
      {
        "id": "uuid-line-1",
        "lineNumber": 1,
        "expectedQty": 100,
        "receivedQty": 0,
        "batchNumber": "BATCH001",
        "expiryDate": "2025-12-31T00:00:00.000Z",
        "notes": "第一批货物",
        "sku": {
          "id": "uuid-sku-1",
          "skuCode": "SKU001",
          "name": "商品A"
        }
      },
      {
        "id": "uuid-line-2",
        "lineNumber": 2,
        "expectedQty": 50,
        "receivedQty": 0,
        "sku": {
          "id": "uuid-sku-2",
          "skuCode": "SKU002",
          "name": "商品B"
        }
      }
    ],
    "createdAt": "2024-12-15T08:00:00.000Z",
    "updatedAt": "2024-12-15T08:00:00.000Z"
  }
}
```

---

## 4. 通过外部单号更新

**PUT** `/api/v1/asn/by-number/{externalNumber}`

通过外部单号更新ASN信息。仅支持 `CREATED` 或 `PENDING_RECEIVING` 状态的ASN。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部单号 |

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | 条件必填 | 客户编码（如果API Key未绑定客户则必填） |
| externalNumber | string | - | 外部单号 |
| asnType | string | - | ASN类型 |
| expectedArrivalDate | string | - | 预计到货日期 |
| notes | string | - | 备注 |

### 请求示例

```json
{
  "clientCode": "CLIENT001",
  "expectedArrivalDate": "2024-12-18T10:00:00Z",
  "notes": "更新备注信息"
}
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "asnNumber": "ASN-2024-001",
    "status": "CREATED",
    "expectedArrivalDate": "2024-12-18T10:00:00.000Z",
    "notes": "更新备注信息",
    "updatedAt": "2024-12-15T09:00:00.000Z"
  }
}
```

---

## 5. 通过外部单号删除

**DELETE** `/api/v1/asn/by-number/{externalNumber}`

通过外部单号删除ASN。仅支持 `CREATED` 状态的ASN。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部单号 |

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | 条件必填 | 客户编码（如果API Key未绑定客户则必填） |

### 响应示例

```json
{
  "success": true,
  "message": "ASN删除成功"
}
```

---

## 6. 获取ASN明细列表

**GET** `/api/v1/asn/by-number/{externalNumber}/lines`

获取ASN的所有明细行。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部单号 |

### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-line-1",
      "lineNumber": 1,
      "expectedQty": 100,
      "receivedQty": 0,
      "batchNumber": "BATCH001",
      "expiryDate": "2025-12-31T00:00:00.000Z",
      "notes": "第一批货物",
      "sku": {
        "id": "uuid-sku-1",
        "skuCode": "SKU001",
        "name": "商品A"
      }
    },
    {
      "id": "uuid-line-2",
      "lineNumber": 2,
      "expectedQty": 50,
      "receivedQty": 0,
      "sku": {
        "id": "uuid-sku-2",
        "skuCode": "SKU002",
        "name": "商品B"
      }
    }
  ]
}
```

---

## 7. 添加ASN明细

**POST** `/api/v1/asn/by-number/{externalNumber}/lines`

向ASN添加新的明细行。仅支持 `CREATED` 或 `PENDING_RECEIVING` 状态的ASN。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部单号 |

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skuCode | string | ✅ | SKU编码 |
| expectedQty | number | ✅ | 预期数量 |
| uomCode | string | - | 单位编码 |
| batchNumber | string | - | 批次号 |
| expiryDate | string | - | 效期 (ISO 8601) |
| notes | string | - | 备注 |

### 请求示例

```json
{
  "skuCode": "SKU003",
  "expectedQty": 200,
  "batchNumber": "BATCH003",
  "notes": "新增明细"
}
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "uuid-line-3",
    "lineNumber": 3,
    "expectedQty": 200,
    "receivedQty": 0,
    "batchNumber": "BATCH003",
    "notes": "新增明细",
    "sku": {
      "id": "uuid-sku-3",
      "skuCode": "SKU003",
      "name": "商品C"
    }
  }
}
```

---

## 8. 更新ASN明细

**PUT** `/api/v1/asn/by-number/{externalNumber}/lines/{lineNumber}`

更新ASN的指定明细行。仅支持 `CREATED` 或 `PENDING_RECEIVING` 状态的ASN。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部单号 |
| lineNumber | number | ✅ | 明细行号 |

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| expectedQty | number | - | 预期数量 |
| batchNumber | string | - | 批次号 |
| expiryDate | string | - | 效期 (ISO 8601) |
| notes | string | - | 备注 |

### 请求示例

```json
{
  "expectedQty": 120,
  "notes": "更新数量"
}
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "uuid-line-1",
    "lineNumber": 1,
    "expectedQty": 120,
    "receivedQty": 0,
    "notes": "更新数量"
  }
}
```

---

## 9. 删除ASN明细

**DELETE** `/api/v1/asn/by-number/{externalNumber}/lines/{lineNumber}`

删除ASN的指定明细行。仅支持 `CREATED` 或 `PENDING_RECEIVING` 状态的ASN。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部单号 |
| lineNumber | number | ✅ | 明细行号 |

### 响应示例

```json
{
  "success": true,
  "message": "ASN明细删除成功"
}
```

---

## 10. 取消ASN

**POST** `/api/v1/asn/by-number/{externalNumber}/cancel`

取消ASN。仅支持 `CREATED` 或 `PENDING_RECEIVING` 状态的ASN。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部单号 |

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| reason | string | - | 取消原因 |

### 请求示例

```json
{
  "reason": "供应商取消订单"
}
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "uuid-xxx",
    "asnNumber": "ASN-2024-001",
    "status": "CANCELLED",
    "notes": "供应商取消订单",
    "updatedAt": "2024-12-15T10:00:00.000Z"
  }
}
```

---

## 11. 获取ASN状态

**GET** `/api/v1/asn/by-number/{externalNumber}/status`

获取ASN的状态摘要信息。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部单号 |

### 响应示例

```json
{
  "success": true,
  "data": {
    "asnNumber": "ASN-2024-001",
    "status": "RECEIVING",
    "totalExpectedQty": 150,
    "totalReceivedQty": 80,
    "lineCount": 2,
    "receivedLineCount": 1,
    "progress": 53.33,
    "createdAt": "2024-12-15T08:00:00.000Z",
    "updatedAt": "2024-12-16T14:00:00.000Z"
  }
}
```

---

## ASN状态说明

| 状态 | 说明 |
|------|------|
| `CREATED` | 已创建，等待收货 |
| `PENDING_RECEIVING` | 待收货 |
| `RECEIVING` | 收货中 |
| `RECEIVED` | 已收货完成 |
| `PUTTING_AWAY` | 上架中 |
| `COMPLETED` | 已完成 |
| `CANCELLED` | 已取消 |

---

## 权限范围

| 范围 | 说明 |
|------|------|
| `asn:read` | 读取ASN信息 |
| `asn:create` | 创建ASN |
| `asn:write` | 更新ASN |
| `asn:delete` | 删除ASN |
| `asn:*` | ASN所有权限 |

---

## 错误码

| HTTP状态码 | 错误说明 |
|------------|----------|
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 权限不足 |
| 404 | ASN不存在 |
| 409 | 状态冲突（如尝试删除非CREATED状态的ASN） |
| 500 | 服务器内部错误 |

### 错误响应示例

```json
{
  "success": false,
  "error": "ASN不存在"
}
```

```json
{
  "success": false,
  "error": "只能删除CREATED状态的ASN"
}
```

```json
{
  "success": false,
  "error": "权限不足: 需要 asn:write 权限"
}
```
