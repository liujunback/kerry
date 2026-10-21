# WMS 外部API接口文档

## 概述

本文档描述了WMS系统对外提供的API接口，供外部系统（如ERP、OMS等）进行集成。

### 基础信息

- **Base URL**: `http://localhost:3000/api/v1`
- **认证方式**: API Key
- **请求格式**: JSON
- **响应格式**: JSON

### 认证

所有API请求都需要在HTTP请求头中携带API Key：

```
X-API-Key: wms_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 响应格式

**成功响应:**
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**错误响应:**
```json
{
  "success": false,
  "message": "错误描述"
}
```

### HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（API Key无效或缺失） |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 接口文档索引

| 模块 | 文档 | 说明 |
|------|------|------|
| SKU | [external-api-sku.md](./external-api-sku.md) | SKU商品管理接口 |
| ASN | [external-api-asn.md](./external-api-asn.md) | 入库通知单管理接口 |
| 出库订单 | [external-api-order.md](./external-api-order.md) | 出库订单管理接口 |
| 退件 | [external-api-returns.md](./external-api-returns.md) | 退件预报下发与处理意见接口 |

---

## 错误码说明

| 错误信息 | 说明 | 解决方案 |
|----------|------|----------|
| 未授权访问 | API Key无效或缺失 | 检查X-API-Key请求头 |
| 权限不足 | API Key没有对应操作权限 | 联系管理员配置权限 |
| 客户编码(clientCode)不能为空 | 未提供客户编码 | 提供clientCode参数 |
| 客户不存在 | 客户编码无效 | 检查clientCode是否正确 |

---

## 更新日志

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.3.0 | 2026-04-16 | 添加退件预报下发接口 |
| 1.2.0 | 2026-03-04 | 添加出库订单管理接口，完善文档说明 |
| 1.1.0 | 2026-02-06 | 外部API接口独立，必须提供clientCode |
| 1.0.0 | 2026-02-06 | 初始版本，支持SKU和ASN基础接口 |
