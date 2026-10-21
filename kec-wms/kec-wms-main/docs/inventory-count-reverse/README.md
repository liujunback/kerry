# 盘点模块逆向文档说明

## 1. 这套文档是什么

这是一套基于当前代码整理的盘点模块实现说明，重点回答：

- 盘点单如何创建、生成范围和批次
- 库存如何从可用桶转入盘点锁定桶
- PDA（手持端）如何执行初盘和复盘
- 差异如何生成调整单、差异处理单并最终结算

## 2. 事实来源

本目录结论只来自当前代码：

- `backend/src/app/api/v1/inventory/counts/*`
- `backend/src/app/api/pda/v1/inventory/counts/*`
- `backend/src/lib/services/inventory-count/*`
- `backend/src/lib/pda/inventory-count-handler.ts`
- `backend/src/lib/pda/inventory-count-permission.ts`
- `backend/src/lib/validations/inventory-count.ts`
- `backend/prisma/schema.prisma`

## 3. 判定原则

1. 实际写库路径优先，也就是 route（路由）-> service（服务）-> Prisma（数据库访问库）事务。
2. 盘点范围以 `inventory_bucket`（库存桶）快照和锁定逻辑为准。
3. PDA（手持端）执行以 `backend/src/lib/pda/inventory-count-handler.ts` 为准。
4. 文档里明确区分订单、批次、明细、轮次行，避免把四层状态混在一起。

## 4. 当前主链

当前盘点主链是：

`创建盘点单 -> 生成盘点范围 -> 生成批次和轮次行 -> 锁定库存桶 -> PDA（手持端）初盘 -> 自动/手动生成复盘 -> PDA（手持端）复盘 -> 差异确认 -> 调整/差异处理 -> 结算`

## 5. 文档索引

- `01-盘点总览与数据模型.md`
- `02-范围生成锁定与批次拆分.md`
- `03-PDA执行初盘复盘提交.md`
- `04-差异确认调整与结算.md`

## 6. 与库存 reverse 文档关系

盘点最终仍然通过库存事件和库存桶改变库存事实。库存分层、库存桶、快照和汇总口径，请看：

- [../inventory-reverse/README.md](../inventory-reverse/README.md)
