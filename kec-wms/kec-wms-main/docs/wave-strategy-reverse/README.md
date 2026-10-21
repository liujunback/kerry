# 波次策略逆向文档说明

## 1. 这套文档是什么

这是一套基于当前代码整理的波次策略实现说明，重点回答：

- 策略配置如何保存、发布、复制、回滚
- 执行时如何筛选订单、处理优先级、分类波次类型
- 执行模式如何创建 wave（波次）和 pick order（拣货单）
- 运行记录和风险边界在哪里

## 2. 事实来源

本目录结论只来自当前代码：

- `backend/src/app/api/v1/wave-strategies/*`
- `backend/src/app/api/v1/waves/*`
- `backend/src/lib/services/wave-strategy-service.ts`
- `backend/src/lib/services/wave-engine-service.ts`
- `backend/src/lib/services/wave-release-service.ts`
- `backend/src/lib/validations/wave-strategy.ts`
- `backend/prisma/schema.prisma`

## 3. 当前主链

`创建策略 -> 编辑规则 -> 发布版本 -> 模拟或执行 -> 筛选候选订单 -> 高优先级抢占判断 -> 订单分类 -> 规划波次 -> 执行模式创建 wave（波次） -> 可选立即释放生成 pick order（拣货单）`

## 4. 文档索引

- `01-策略配置版本与发布.md`
- `02-执行筛选优先级与分类.md`
- `03-生成波次释放与拣货单.md`
- `04-运行记录与风险边界.md`

## 5. 与出库 reverse 文档关系

波次策略只覆盖订单进入波次和释放为拣货单的策略部分。出库后续拣货、分拣、打包、签出请看：

- [../outbound-reverse/README.md](../outbound-reverse/README.md)
