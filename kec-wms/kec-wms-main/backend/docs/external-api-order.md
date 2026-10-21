# 出库订单 外部API接口文档

> 返回 [主文档](./external-api.md)

## 接口列表

| 方法 | 接口 | 说明 |
|------|------|------|
| POST | `/api/v1/outbound-orders` | 创建出库订单 |
| GET | `/api/v1/outbound-orders/by-number/{externalNumber}` | 通过外部单号获取详情 |
| PUT | `/api/v1/outbound-orders/by-number/{externalNumber}` | 通过外部单号更新 |
| DELETE | `/api/v1/outbound-orders/by-number/{externalNumber}` | 通过外部单号删除 |
| POST | `/api/v1/outbound-orders/by-number/{externalNumber}/cancel` | 取消订单 |

---

## 1. 创建出库订单

**POST** `/api/v1/outbound-orders`

创建出库订单。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | ✅ | 客户编码 |
| warehouseCode | string | ✅ | 仓库编码 |
| orderNo | string | - | 订单号，不填则自动生成 |
| externalOrderNo | string | - | 外部订单号（用于后续查询/更新/删除，在同一租户+客户范围内唯一） |
| orderType | string | - | 业务类型，默认"STANDARD" |
| source | object | - | 来源信息 |
| consignee | object | ✅ | 收货人信息 |
| shipping | object | - | 物流信息 |
| payment | object | - | 支付信息 |
| items | array | ✅ | 订单明细 |
| remark | string | - | 备注 |
| tags | array | - | 标签列表 |
| customFields | object | - | 自定义字段 |

### 来源信息 (source)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| platform | string | - | 来源平台，默认"OTHER" |
| platformOrderId | string | - | 平台原始订单ID |
| channel | string | - | 渠道 |

### 收货人信息 (consignee)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 收货人姓名 |
| phone | string | - | 收货人电话 |
| email | string | - | 收货人邮箱 |
| company | string | - | 收货公司 |
| address | object | ✅ | 收货地址 |

### 收货地址 (consignee.address)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| line1 | string | ✅ | 地址行1 |
| line2 | string | - | 地址行2 |
| city | string | - | 城市 |
| province | string | - | 省份 |
| postalCode | string | - | 邮编 |
| country | string | - | 国家代码，默认"CN" |

### 物流信息 (shipping)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| method | string | - | 配送方式 |
| carrierCode | string | - | 承运商编码 |
| trackingNumber | string | - | 运单号 |
| shippingLabel | object | - | 发货面单信息 |
| expectedShipDate | string | - | 预计发货日期 (ISO 8601) |
| expectedDeliveryDate | string | - | 预计送达日期 (ISO 8601) |

### 发货面单 (shipping.shippingLabel)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 二选一 | 面单URL（外部链接，需http/https协议） |
| base64 | string | 二选一 | 面单base64编码（支持data:image/png;base64,前缀或纯base64字符串） |

**注意：**
- url和base64二选一提供即可。如果同时提供，优先处理base64
- base64格式会自动转换为文件存储，文件大小限制10MB
- 支持的图片格式：png, jpg, jpeg, gif等常见格式

### 支付信息 (payment)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| totalAmount | number | - | 订单总金额 |
| currency | string | - | 币种，默认"CNY" |
| isPaid | boolean | - | 是否已支付 |

### 订单明细 (items)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| lineNo | number | - | 行号，不填则自动生成 |
| skuCode | string | ✅ | SKU编码 |
| quantity | number | ✅ | 数量 |
| unit | string | - | 单位编码 |
| unitPrice | number | - | 单价 |
| batchNo | string | - | 批次号 |
| expiryDate | string | - | 效期 (ISO 8601) |
| udf | string | - | 自定义字段 |
| remark | string | - | 备注 |

### 枚举值

**platform (来源平台):**
- `SHOPIFY` - Shopify
- `AMAZON` - Amazon
- `MANUAL` - 手工创建
- `OTHER` - 其他

**orderType (业务类型):**
- `STANDARD` - 标准出库
- `RETURN` - 退仓出库
- `SCRAP` - 下架销毁
- `OTHER` - 其他出库

**orderStructureType (订单结构类型) - 系统自动计算:**
- `SINGLE_ITEM_SINGLE` - 单品单件
- `SINGLE_ITEM_MULTI` - 单品多件
- `MULTI_ITEM` - 多品订单

### 请求示例

```json
{
  "clientCode": "CLIENT001",
  "warehouseCode": "WH-SH-001",
  "externalOrderNo": "SO-12345",
  "orderType": "STANDARD",
  "source": {
    "platform": "SHOPIFY",
    "platformOrderId": "SHOP-ORDER-001",
    "channel": "官网"
  },
  "consignee": {
    "name": "张三",
    "phone": "13800138000",
    "address": {
      "line1": "上海市浦东新区张江高科技园区",
      "city": "上海",
      "province": "上海",
      "country": "CN",
      "postalCode": "201203"
    }
  },
  "shipping": {
    "method": "顺丰速运",
    "trackingNumber": "SF1234567890",
    "shippingLabel": {
      "url": "https://example.com/labels/12345.pdf"
    },
    "expectedShipDate": "2024-12-20T10:00:00Z"
  },
  "payment": {
    "totalAmount": 1089.00,
    "currency": "CNY"
  },
  "remark": "请尽快发货",
  "items": [
    {
      "skuCode": "SKU001",
      "quantity": 10,
      "unitPrice": 99.00,
      "batchNo": "BATCH-2024-001",
      "expiryDate": "2025-12-31T00:00:00Z",
      "udf": "红色-L码",
      "remark": "红色款"
    },
    {
      "skuCode": "SKU002",
      "quantity": 5
    }
  ]
}
```

**使用Base64格式的面单示例：**

```json
{
  "clientCode": "CLIENT001",
  "warehouseCode": "WH-SH-001",
  "externalOrderNo": "SO-12346",
  "consignee": {
    "name": "李四",
    "address": { "line1": "北京市朝阳区" }
  },
  "shipping": {
    "method": "顺丰速运",
    "trackingNumber": "SF0987654321",
    "shippingLabel": {
      "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    }
  },
  "items": [
    { "skuCode": "SKU001", "quantity": 1 }
  ]
}
```

### 响应示例

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "订单创建成功",
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "orderNo": "OUT-2024-001",
    "externalOrderNo": "SO-12345",
    "status": "CREATED",
    "orderType": "STANDARD",
    "orderStructureType": "MULTI_ITEM",
    "hasSerialItems": true,
    "totalQuantity": 15,
    "totalSkuCount": 2,
    "createdAt": "2024-12-15T08:00:00.000Z",
    "source": {
      "platform": "SHOPIFY",
      "platformOrderId": "SHOP-ORDER-001",
      "channel": "官网"
    },
    "consignee": {
      "name": "张三",
      "phone": "13800138000",
      "email": null,
      "company": null,
      "address": {
        "line1": "上海市浦东新区张江高科技园区",
        "line2": null,
        "city": "上海",
        "province": "上海",
        "postalCode": "201203",
        "country": "CN"
      }
    },
    "shipping": {
      "method": "顺丰速运",
      "trackingNumber": "SF1234567890",
      "shippingLabel": {
        "url": "https://example.com/labels/12345.pdf",
        "type": "URL"
      },
      "expectedShipDate": "2024-12-20T00:00:00.000Z",
      "expectedDeliveryDate": null
    },
    "payment": {
      "totalAmount": 1089.00,
      "currency": "CNY"
    },
    "items": [
      {
        "lineNo": 1,
        "skuCode": "SKU001",
        "skuName": "商品A",
        "quantity": 10,
        "unit": "PCS",
        "unitPrice": 99.00,
        "lineAmount": 990.00,
        "batchNo": "BATCH-2024-001",
        "expiryDate": "2025-12-31T00:00:00.000Z",
        "udf": "红色-L码",
        "status": "PENDING"
      },
      {
        "lineNo": 2,
        "skuCode": "SKU002",
        "skuName": "商品B",
        "quantity": 5,
        "unit": "PCS",
        "unitPrice": null,
        "lineAmount": null,
        "batchNo": null,
        "expiryDate": null,
        "udf": null,
        "status": "PENDING"
      }
    ],
    "remark": "请尽快发货",
    "client": {
      "clientCode": "CLIENT001",
      "clientName": "客户A"
    },
    "warehouse": {
      "warehouseCode": "WH-SH-001",
      "warehouseName": "上海仓"
    }
  }
}
```

---

## 2. 通过外部单号获取详情

**GET** `/api/v1/outbound-orders/by-number/{externalNumber}`

通过外部单号（externalOrderNo）获取订单详细信息，包含明细行。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部订单号（externalOrderNo） |

### 请求Body参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | 条件必填 | 客户编码（如果API Key未绑定客户则必填） |

### 请求示例

```bash
curl -X GET 'http://localhost:3000/api/v1/outbound-orders/by-number/SO-12345' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: wms_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' \
  -d '{
    "clientCode": "CLIENT001"
  }'
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "orderNo": "OUT-2024-001",
    "externalOrderNo": "SO-12345",
    "status": "CREATED",
    "orderType": "STANDARD",
    "orderStructureType": "MULTI_ITEM",
    "hasSerialItems": true,
    "totalQuantity": 15,
    "totalSkuCount": 2,
    "createdAt": "2024-12-15T08:00:00.000Z",
    "updatedAt": "2024-12-15T08:00:00.000Z",
    "source": {
      "platform": "SHOPIFY",
      "platformOrderId": "SHOP-ORDER-001",
      "channel": "官网"
    },
    "consignee": {
      "name": "张三",
      "phone": "13800138000",
      "email": null,
      "company": null,
      "address": {
        "line1": "上海市浦东新区张江高科技园区",
        "line2": null,
        "city": "上海",
        "province": "上海",
        "postalCode": "201203",
        "country": "CN"
      }
    },
    "shipping": {
      "method": "顺丰速运",
      "trackingNumber": null,
      "expectedShipDate": "2024-12-20T00:00:00.000Z",
      "expectedDeliveryDate": null
    },
    "payment": {
      "totalAmount": 1089.00,
      "currency": "CNY"
    },
    "items": [
      {
        "lineNo": 1,
        "skuCode": "SKU001",
        "skuName": "商品A",
        "quantity": 10,
        "allocatedQty": 0,
        "pickedQty": 0,
        "packedQty": 0,
        "shippedQty": 0,
        "unit": "PCS",
        "unitPrice": 99.00,
        "lineAmount": 990.00,
        "batchNo": "BATCH-2024-001",
        "expiryDate": "2025-12-31T00:00:00.000Z",
        "udf": "红色-L码",
        "status": "PENDING"
      },
      {
        "lineNo": 2,
        "skuCode": "SKU002",
        "skuName": "商品B",
        "quantity": 5,
        "allocatedQty": 0,
        "pickedQty": 0,
        "packedQty": 0,
        "shippedQty": 0,
        "unit": "PCS",
        "unitPrice": null,
        "lineAmount": null,
        "batchNo": null,
        "expiryDate": null,
        "udf": null,
        "status": "PENDING"
      }
    ],
    "remark": "请尽快发货",
    "client": {
      "clientCode": "CLIENT001",
      "clientName": "客户A"
    },
    "warehouse": {
      "warehouseCode": "WH-SH-001",
      "warehouseName": "上海仓"
    }
  }
}
```

---

## 3. 通过外部单号更新

**PUT** `/api/v1/outbound-orders/by-number/{externalNumber}`

通过外部单号更新订单信息。仅支持 `CREATED`、`PENDING`、`ALLOCATED` 状态的订单。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部订单号（externalOrderNo） |

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | 条件必填 | 客户编码（如果API Key未绑定客户则必填） |
| externalOrderNo | string | - | 外部订单号 |
| orderType | string | - | 业务类型 |
| source | object | - | 来源信息（部分更新） |
| consignee | object | - | 收货人信息（部分更新） |
| shipping | object | - | 物流信息（部分更新） |
| payment | object | - | 支付信息（部分更新） |
| remark | string | - | 备注 |
| tags | array | - | 标签列表 |
| customFields | object | - | 自定义字段 |

### 请求示例

```json
{
  "clientCode": "CLIENT001",
  "consignee": {
    "address": {
      "line1": "上海市浦东新区张江高科技园区999号"
    }
  },
  "remark": "地址已更新，请注意"
}
```

### 响应示例

```json
{
  "success": true,
  "message": "订单更新成功",
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "orderNo": "OUT-2024-001",
    "externalOrderNo": "SO-12345",
    "status": "CREATED",
    "orderType": "STANDARD",
    "updatedAt": "2024-12-15T09:00:00.000Z",
    "consignee": {
      "name": "张三",
      "phone": "13800138000",
      "address": {
        "line1": "上海市浦东新区张江高科技园区999号",
        "city": "上海",
        "province": "上海",
        "postalCode": "201203",
        "country": "CN"
      }
    },
    "remark": "地址已更新，请注意",
    "client": {
      "clientCode": "CLIENT001",
      "clientName": "客户A"
    },
    "warehouse": {
      "warehouseCode": "WH-SH-001",
      "warehouseName": "上海仓"
    }
  }
}
```

---

## 4. 通过外部单号删除

**DELETE** `/api/v1/outbound-orders/by-number/{externalNumber}`

通过外部单号删除订单。仅支持 `PENDING` 状态的订单。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部订单号（externalOrderNo） |

### 请求Body参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | 条件必填 | 客户编码（如果API Key未绑定客户则必填） |

### 请求示例

```bash
curl -X DELETE 'http://localhost:3000/api/v1/outbound-orders/by-number/SO-12345' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: wms_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' \
  -d '{
    "clientCode": "CLIENT001"
  }'
```

### 响应示例

```json
{
  "success": true,
  "message": "订单删除成功"
}
```

---

## 5. 取消订单

**POST** `/api/v1/outbound-orders/by-number/{externalNumber}/cancel`

取消订单。仅支持 `CREATED`、`PENDING`、`ALLOCATED`、`PENDING_WAVE` 状态的订单。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| externalNumber | string | ✅ | 外部订单号（externalOrderNo） |

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | 条件必填 | 客户编码（如果API Key未绑定客户则必填） |
| reason | string | ✅ | 取消原因 |

### 请求示例

```json
{
  "clientCode": "CLIENT001",
  "reason": "客户取消订单"
}
```

### 响应示例

```json
{
  "success": true,
  "message": "订单取消成功",
  "data": {
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "orderNo": "OUT-2024-001",
    "externalOrderNo": "SO-12345",
    "status": "CANCELLED",
    "remark": "[取消原因] 客户取消订单",
    "updatedAt": "2024-12-15T10:00:00.000Z",
    "client": {
      "clientCode": "CLIENT001",
      "clientName": "客户A"
    },
    "warehouse": {
      "warehouseCode": "WH-SH-001",
      "warehouseName": "上海仓"
    }
  }
}
```

---

## 订单状态说明

| 状态 | 说明 |
|------|------|
| `CREATED` | 已创建 |
| `PENDING` | 待处理 |
| `ALLOCATED` | 已分配库存 |
| `PENDING_WAVE` | 待加入波次 |
| `IN_WAVE` | 已加入波次 |
| `WAVED` | 波次已释放 |
| `PICKING` | 拣货中 |
| `PICKED` | 已拣货 |
| `SORTING` | 分拣中 |
| `SORTED` | 已分拣 |
| `PACKING` | 打包中 |
| `PACKED` | 已打包 |
| `READY_SHIP` | 待发货 |
| `SHIPPED` | 已发货 |
| `DELIVERED` | 已送达 |
| `CANCELLED` | 已取消 |
| `ON_HOLD` | 暂停 |
| `EXCEPTION` | 异常 |

---

## 权限范围

| 范围 | 说明 |
|------|------|
| `order:read` | 读取订单信息 |
| `order:create` | 创建订单 |
| `order:write` | 更新订单 |
| `order:delete` | 删除订单 |
| `order:*` | 订单所有权限 |

---

## 错误码

| HTTP状态码 | 错误码 | 错误说明 |
|------------|--------|----------|
| 400 | CLIENT_NOT_FOUND | 客户不存在 |
| 400 | WAREHOUSE_NOT_FOUND | 仓库不存在 |
| 400 | SKU_NOT_FOUND | 部分SKU不存在 |
| 400 | ORDER_NUMBER_EXISTS | 订单号已存在 |
| 401 | - | 未认证或认证失败 |
| 403 | - | 权限不足 |
| 404 | - | 订单不存在 |
| 409 | EXTERNAL_ORDER_NO_EXISTS | 外部订单号已存在 |
| 409 | EXTERNAL_ORDER_NO_PROCESSING | 外部订单号正在处理中 |
| 500 | - | 服务器内部错误 |
| 503 | SYSTEM_BUSY | 系统繁忙，请稍后重试（响应头包含 `Retry-After: 1`） |

### 错误响应示例

```json
{
  "success": false,
  "message": "订单不存在"
}
```

```json
{
  "success": false,
  "message": "订单状态为PICKING，不允许更新"
}
```

```json
{
  "success": false,
  "message": "部分SKU不存在",
  "code": "SKU_NOT_FOUND",
  "details": {
    "missingSkuCodes": ["SKU999"]
  }
}
```

```json
{
  "success": false,
  "message": "外部订单号已存在",
  "code": "EXTERNAL_ORDER_NO_EXISTS",
  "data": {
    "existingOrderNumber": "OUT-2024-001"
  }
}
```
