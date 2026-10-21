# SKU / ASN 外部 API 压测说明

## 目标

本说明用于本地开发环境下执行 `SKU` / `ASN` 外部 `API` 关键写路径压测，验证以下场景在 20 到 50 并发虚拟用户下的稳定性：

- `POST /api/v1/skus`
- `PUT /api/v1/skus/by-code/{skuCode}`
- `POST /api/v1/asn`
- `PUT /api/v1/asn/by-number/{externalNumber}`
- `POST /api/v1/asn/by-number/{externalNumber}/lines`

## 前置条件

执行前确认以下条件已满足：

- 本地服务已启动
- `MySQL` 数据库可用
- `Redis` 缓存与锁服务可用
- 已创建具备 `sku:*` 与 `asn:*` 权限的 `API Key`
- 已准备可用的 `clientCode` 与 `warehouseCode`

## 脚本位置

压测脚本位于：

`scripts/k6/sku-asn-external-api.js`

脚本通过 `SCENARIO` 环境变量切换场景。

## 环境变量

必填环境变量：

- `API_KEY`：外部接口调用密钥
- `CLIENT_CODE`：压测客户编码
- `WAREHOUSE_CODE`：`ASN` 场景必填

可选环境变量：

- `BASE_URL`：默认 `http://localhost:3000`
- `SCENARIO`：默认 `sku-create`
- `DATA_PREFIX`：压测数据前缀，默认按时间戳生成
- `VUS`：并发虚拟用户数，默认 `20`
- `DURATION`：压测时长，默认 `2m`
- `THINK_TIME_MS`：请求间隔毫秒数，默认 `200`
- `SUMMARY_JSON_PATH`：压测摘要导出路径

## 场景列表

- `sku-create`
- `sku-update`
- `asn-create`
- `asn-update`
- `asn-line-add`

## 执行示例

20 并发预热：

```powershell
k6 run .\scripts\k6\sku-asn-external-api.js `
  -e BASE_URL=http://localhost:3000 `
  -e API_KEY=wms_xxx `
  -e CLIENT_CODE=CLIENT001 `
  -e WAREHOUSE_CODE=WH001 `
  -e SCENARIO=asn-line-add `
  -e VUS=20 `
  -e DURATION=2m `
  -e SUMMARY_JSON_PATH=.\tmp\asn-line-add-20.json
```

50 并发稳定性验证：

```powershell
k6 run .\scripts\k6\sku-asn-external-api.js `
  -e BASE_URL=http://localhost:3000 `
  -e API_KEY=wms_xxx `
  -e CLIENT_CODE=CLIENT001 `
  -e WAREHOUSE_CODE=WH001 `
  -e SCENARIO=asn-line-add `
  -e VUS=50 `
  -e DURATION=5m `
  -e SUMMARY_JSON_PATH=.\tmp\asn-line-add-50.json
```

## 数据策略

- 所有测试数据默认带独立前缀，避免与已有开发数据冲突。
- `sku-create` 与 `asn-create` 场景每次请求都生成唯一业务编码。
- `sku-update` 与 `asn-update` 场景在 `setup` 阶段创建一条基准数据，然后并发更新同一条记录。
- `asn-line-add` 场景在 `setup` 阶段创建一张基准 `ASN`，每个虚拟用户先创建唯一 `SKU`，再并发向同一张 `ASN` 加行。

## 验收关注点

- `http_req_failed` 错误率低于 `1%`
- `checks` 成功率高于 `99%`
- `http_req_duration` 的 `p95` 小于 `1500ms`
- 无通用 `500`
- 无重复 `ASN` 单号
- 无重复 `ASN` 行号
- 无 `ASN` 主表汇总与明细数量不一致

## 压测后建议检查

- 检查应用日志中的唯一键冲突、锁竞争和数据库异常
- 核对 `ASN` 主表的 `totalExpectedQty` 与 `totalExpectedLines`
- 抽样检查新建 `SKU` 与 `ASN` 的业务编码唯一性
