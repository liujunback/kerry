# 出库模块逆向文档说明

## 1. 这套文档是什么

这是基于当前代码逆向整理出来的出库模块实现说明。  
目标不是写理想方案，也不是复述旧文档，而是回答这些实际问题：

- 当前出库主链到底怎么走
- 每一步是谁触发的
- 每一步实际写了哪些表
- 每个状态是怎么变的
- 哪些字段是当前主链真正使用的
- 哪些实现存在分叉、待确认或未闭环

## 2. 事实来源

本目录下所有结论只来自当前正式代码：

- `backend/src/app/api/v1/outbound-orders/*`
- `backend/src/app/api/v1/pick-orders/*`
- `backend/src/app/api/v1/sorting/*`
- `backend/src/app/api/v1/packing/*`
- `backend/src/app/api/v1/checkout/*`
- `backend/src/app/api/v1/manifest-orders/*`
- `backend/src/app/api/v1/manifest-mount/*`
- `backend/src/lib/services/inventory-allocation-service.ts`
- `backend/src/lib/services/checkout-service.ts`
- `backend/prisma/schema.prisma`

## 3. 判定原则

本文档按下面优先级判断业务事实：

1. 实际写库路径优先  
   也就是 `route -> service -> prisma create/update/upsert -> 事务后逻辑`

2. 当前运行时约束优先  
   也就是接口真实校验、真实状态检查、真实报错分支

3. Schema 注释、校验 Schema、状态枚举只作为辅助  
   如果它们和真实写路径冲突，以真实写路径为准

## 4. 当前后端主链

当前代码对应的出库主链是：

`订单创建 -> 库存分配 -> 创建拣货单 -> 打印开拣 -> 分拣 -> 打包 -> 关箱/完成 -> 签出 -> 集运`

更细一点：

1. `POST /api/v1/outbound-orders` 创建订单和订单行
2. `POST /api/v1/outbound-orders/batch-allocate` 或异步分配任务执行库存分配
3. `POST /api/v1/pick-orders` 生成拣货单
4. `POST /api/v1/pick-orders/[id]/print` 触发开拣
5. `POST /api/v1/sorting/start` / `scan-sku` 执行分拣
6. `POST /api/v1/packing/*` 执行打包和关箱
7. `POST /api/v1/checkout/scan` 在扫码签出时触发订单签出和库存扣减
8. `POST /api/v1/manifest-mount/scan` / `confirm` 完成集运挂载与完结

## 5. 文档索引

- `01-出库总览与状态机.md`
- `02-订单创建、库存分配与回退.md`
- `03-拣货、分拣与打包.md`
- `04-签出、集运与发运落库.md`

## 6. 与 Web UI 逆向的关系

本目录只关注：

- 业务流程
- 数据表
- 写库字段
- 状态流转

如果要看当前 Web 端 UI 的页面入口、交互顺序、焦点流、按钮启用条件，请看：

- [../outbound-web-reverse/README.md](../outbound-web-reverse/README.md)

## 7. 本目录不做什么

- 不复述旧 `docs/*.md`
- 不分析 PDA 现状
- 不把测试代码当业务事实
- 不把模型注释中“预留但未接线”的字段写成已落地能力
