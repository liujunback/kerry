# 库存系统逆向文档说明

## 1. 文档目标

这一组文档不是在描述“理想库存设计”，而是在回答当前代码里的真实问题：

- 整套库存到底由哪些表组成
- 库存在哪些业务节点会变化
- 每个节点写了哪些数据
- 每个节点用了什么锁
- 事务内和事务外分别做了什么
- 页面最终查到的库存是从哪一层算出来的

## 2. 文档边界

本轮文档覆盖“当前代码中的整套库存管理”：

- 库存分层
- 锁与并发控制
- 入库上架形成库存
- 冻结、解冻、调整、移库
- 出库分配、取消分配、签出扣减
- 库存变化节点矩阵

本轮明确不做：

- 库存预警
- 历史文档整理
- 测试脚本行为说明

## 3. 事实来源

所有结论只来自当前代码：

- `backend/src/app/api/v1/inventory/*`
- `backend/src/app/api/v1/shelving/*`
- `backend/src/app/api/v1/putaway/*`
- `backend/src/app/api/v1/asn/*`
- `backend/src/app/api/v1/outbound-orders/*`
- `backend/src/app/api/v1/checkout/*`
- `backend/src/lib/services/inventory-*.ts`
- `backend/src/lib/services/checkout-service.ts`
- `backend/src/lib/db/distributed-lock.ts`
- `backend/prisma/schema.prisma`

不参考：

- 旧 `docs/*.md`
- 历史测试脚本

## 4. 判定原则

文档按以下优先级判断业务事实：

1. 实际写库路径优先  
   也就是 `route -> service -> prisma update/create/upsert -> 事务后异步刷新`

2. 实际锁与事务优先  
   也就是分布式锁、`with*Lock()`、`FOR UPDATE`

3. schema 注释、validation 枚举、旧术语只作为辅助  
   如果和真实写路径冲突，以真实写路径为准

## 5. 库存系统的核心认知

当前代码中的“库存”不是一张表，而是一组分层数据：

- `inventory_event`
  - 事件流水层
- `inventory_bucket`
  - 当前库存事实层
- `inventory_snapshot`
  - 库位粒度快照层
- `sku_inventory_summary`
  - 仓库+客户+SKU 汇总层
- `GET /api/v1/inventory`
  - 从 `inventory_bucket` 再汇总出的展示层

因此排查库存时必须先分清：

- 事件是否记录了
- bucket 是否真的变化了
- snapshot 和 summary 是否刷新了
- 页面查的是原始桶还是聚合结果

## 6. 文档索引

- `01-库存总览与数据分层.md`
- `02-库存锁与并发控制.md`
- `03-入库如何形成库存.md`
- `04-库存冻结调整移库.md`
- `05-出库如何消耗库存.md`
- `06-库存变化节点全链路矩阵.md`
- `07-库存写入口收敛.md`

## 7. 一句话总览

当前代码里，所有真正的库存变化最终都会落到：

- 先写 `inventory_event`
- 再改 `inventory_bucket`
- 最后异步或兜底同步刷新 `inventory_snapshot` 和 `sku_inventory_summary`

而“锁”的目标，是保证这条链在并发下尽量不出现：

- 重复加库存
- 重复扣库存
- 超扣
- 死锁
- 单据重复执行
