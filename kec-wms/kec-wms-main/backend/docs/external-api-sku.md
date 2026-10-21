# SKU 外部API接口文档

> 返回 [主文档](./external-api.md)

## 接口列表

| 方法 | 接口 | 说明 |
|------|------|------|
| POST | `/api/v1/skus` | 创建SKU |
| GET | `/api/v1/skus` | 查询SKU列表 |
| GET | `/api/v1/skus/by-code/{skuCode}` | 通过编码获取详情 |
| PUT | `/api/v1/skus/by-code/{skuCode}` | 通过编码更新SKU |
| DELETE | `/api/v1/skus/by-code/{skuCode}` | 通过编码删除SKU |

---

## 1. 创建SKU

**POST** `/api/v1/skus`

创建新的SKU商品信息。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skuCode | string | ✅ | SKU编码，租户内唯一 |
| skuName | string | ✅ | SKU名称 |
| clientCode | string | ✅ | 客户编码 |
| barcode | string | - | 商品条码 |
| unit | string | - | 基本单位，默认"PCS" |
| lengthCm | number | - | 长度(cm) |
| widthCm | number | - | 宽度(cm) |
| heightCm | number | - | 高度(cm) |
| weightKg | number | - | 重量(kg) |
| unitPrice | number | - | 单价 |
| currency | string | - | 币种，默认"CNY" |
| storageCondition | string | - | 存储条件，见枚举值 |
| shelfLifeDays | number | - | 保质期(天) |
| isBatchManaged | boolean | - | 是否批次管理，默认false |
| isSerialManaged | boolean | - | 是否序列号管理，默认false |
| isExpiryManaged | boolean | - | 是否效期管理，默认false |
| abcClass | string | - | ABC分类: A/B/C，默认"C" |
| notes | string | - | 备注 |

### 枚举值

**storageCondition (存储条件):**
- `NORMAL` - 常温
- `COLD` - 冷藏
- `FROZEN` - 冷冻
- `HAZMAT` - 危险品
- `CONTROLLED` - 管控品

**abcClass (ABC分类):**
- `A` - 高价值/高周转
- `B` - 中价值/中周转
- `C` - 低价值/低周转

### 请求示例

```bash
curl -X POST 'http://localhost:3000/api/v1/skus' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: wms_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' \
  -d '{
    "skuCode": "SKU-TEST-001",
    "skuName": "测试商品A",
    "barcode": "6901234567890",
    "clientCode": "C001",
    "unit": "个",
    "lengthCm": 10.5,
    "widthCm": 8.0,
    "heightCm": 5.5,
    "weightKg": 0.5,
    "unitPrice": 99.99,
    "storageCondition": "NORMAL",
    "isBatchManaged": true,
    "isExpiryManaged": true,
    "abcClass": "A"
  }'
```

### 响应示例

```json
{
  "success": true,
  "message": "SKU创建成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "skuCode": "SKU-TEST-001",
    "skuName": "测试商品A",
    "barcode": "6901234567890",
    "storageCondition": "NORMAL",
    "isBatchManaged": true,
    "isSerialManaged": false,
    "isExpiryManaged": true,
    "status": "ACTIVE",
    "createdAt": "2026-02-06T10:30:00.000Z",
    "client": {
      "id": "xxx-xxx-xxx",
      "clientCode": "C001",
      "clientName": "测试客户A"
    }
  }
}
```

---

## 2. 查询SKU列表

**GET** `/api/v1/skus`

分页查询SKU列表。

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | 条件必填 | 客户编码（如果API Key未绑定客户则必填） |
| page | number | - | 页码，默认1 |
| pageSize | number | - | 每页数量，默认10 |
| search | string | - | 搜索关键词（SKU编码/名称/条码） |
| status | string | - | 状态: ACTIVE/INACTIVE |
| abcClass | string | - | ABC分类: A/B/C |
| storageCondition | string | - | 存储条件 |
| isBatchManaged | boolean | - | 是否批次管理 |
| isSerialManaged | boolean | - | 是否序列号管理 |
| sortBy | string | - | 排序字段，默认createdAt |
| sortOrder | string | - | 排序方向: asc/desc，默认desc |

### 请求示例

```bash
curl -X GET 'http://localhost:3000/api/v1/skus?clientCode=C001&page=1&pageSize=10&search=测试' \
  -H 'X-API-Key: wms_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```

### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "xxx-xxx-xxx",
      "skuCode": "SKU-TEST-001",
      "skuName": "测试商品A",
      "barcode": "6901234567890",
      "unit": "个",
      "storageCondition": "NORMAL",
      "abcClass": "A",
      "isBatchManaged": true,
      "isSerialManaged": false,
      "isExpiryManaged": true,
      "status": "ACTIVE",
      "createdAt": "2026-02-06T10:30:00.000Z",
      "client": {
        "id": "xxx",
        "clientCode": "C001",
        "clientName": "测试客户A"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## 3. 通过SKU编码获取详情

**GET** `/api/v1/skus/by-code/{skuCode}`

根据SKU编码获取SKU详细信息。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skuCode | string | ✅ | SKU编码 |

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | ✅ | 客户编码 |

### 请求示例

```bash
curl -X GET 'http://localhost:3000/api/v1/skus/by-code/SKU-TEST-001?clientCode=C001' \
  -H 'X-API-Key: wms_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```

### 响应示例

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "skuCode": "SKU-TEST-001",
    "skuName": "测试商品A",
    "barcode": "6901234567890",
    "unit": "个",
    "lengthCm": "10.50",
    "widthCm": "8.00",
    "heightCm": "5.50",
    "weightKg": "0.500",
    "unitPrice": "99.9900",
    "currency": "CNY",
    "storageCondition": "NORMAL",
    "abcClass": "A",
    "isBatchManaged": true,
    "isSerialManaged": false,
    "isExpiryManaged": true,
    "status": "ACTIVE",
    "createdAt": "2026-02-06T10:30:00.000Z",
    "client": {
      "id": "xxx",
      "clientCode": "C001",
      "clientName": "测试客户A"
    }
  }
}
```

---

## 4. 通过SKU编码更新SKU

**PUT** `/api/v1/skus/by-code/{skuCode}`

根据SKU编码更新SKU信息。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skuCode | string | ✅ | SKU编码 |

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | ✅ | 客户编码 |
| skuName | string | - | SKU名称 |
| barcode | string | - | 商品条码 |
| unit | string | - | 基本单位 |
| lengthCm | number | - | 长度(cm) |
| widthCm | number | - | 宽度(cm) |
| heightCm | number | - | 高度(cm) |
| weightKg | number | - | 重量(kg) |
| unitPrice | number | - | 单价 |
| currency | string | - | 币种 |
| storageCondition | string | - | 存储条件 |
| shelfLifeDays | number | - | 保质期(天) |
| isBatchManaged | boolean | - | 是否批次管理 |
| isSerialManaged | boolean | - | 是否序列号管理 |
| isExpiryManaged | boolean | - | 是否效期管理 |
| abcClass | string | - | ABC分类 |
| status | string | - | 状态: ACTIVE/INACTIVE |
| notes | string | - | 备注 |

### 请求示例

```bash
curl -X PUT 'http://localhost:3000/api/v1/skus/by-code/SKU-TEST-001' \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: wms_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' \
  -d '{
    "clientCode": "C001",
    "skuName": "测试商品A-更新",
    "unitPrice": 129.99,
    "abcClass": "B",
    "notes": "通过skuCode更新"
  }'
```

### 响应示例

```json
{
  "success": true,
  "message": "SKU更新成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "skuCode": "SKU-TEST-001",
    "skuName": "测试商品A-更新",
    "barcode": "6901234567890",
    "unit": "个",
    "lengthCm": "10.50",
    "widthCm": "8.00",
    "heightCm": "5.50",
    "weightKg": "0.500",
    "unitPrice": "129.9900",
    "currency": "CNY",
    "storageCondition": "NORMAL",
    "isBatchManaged": true,
    "isSerialManaged": false,
    "isExpiryManaged": true,
    "abcClass": "B",
    "status": "ACTIVE",
    "updatedAt": "2026-02-06T11:00:00.000Z",
    "client": {
      "id": "xxx",
      "clientCode": "C001",
      "clientName": "测试客户A"
    }
  }
}
```

---

## 5. 通过SKU编码删除SKU

**DELETE** `/api/v1/skus/by-code/{skuCode}`

根据SKU编码删除SKU。删除前会检查是否有关联数据，有关联数据则无法删除。

### 路径参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| skuCode | string | ✅ | SKU编码 |

### 查询参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| clientCode | string | ✅ | 客户编码（如果API Key未绑定客户则必填） |

### 删除限制

以下情况无法删除SKU：
- SKU存在库存记录
- SKU存在ASN（入库通知单）记录
- SKU存在出库订单记录

### 请求示例

```bash
curl -X DELETE 'http://localhost:3000/api/v1/skus/by-code/SKU-TEST-001?clientCode=C001' \
  -H 'X-API-Key: wms_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
```

### 响应示例

**成功响应：**

```json
{
  "success": true,
  "message": "SKU删除成功"
}
```

**失败响应（有关联数据）：**

```json
{
  "success": false,
  "message": "SKU存在库存记录，无法删除"
}
```

---

## 错误码说明

| 错误信息 | 说明 | 解决方案 |
|----------|------|----------|
| SKU编码已存在 | SKU编码重复 | 使用不同的SKU编码 |
| SKU不存在 | SKU编码无效 | 检查skuCode是否正确 |
| SKU编码和名称不能为空 | 必填字段缺失 | 提供skuCode和skuName |
| 客户编码(clientCode)不能为空 | 未提供客户编码 | 提供clientCode参数 |
| 客户不存在 | 客户编码无效 | 检查clientCode是否正确 |
| SKU存在库存记录，无法删除 | SKU有关联库存 | 先清空该SKU的库存 |
| SKU存在ASN记录，无法删除 | SKU有关联ASN | 先处理完相关ASN |
| SKU存在出库订单记录，无法删除 | SKU有关联出库单 | 先处理完相关出库单 |
