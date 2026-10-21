# 退件模块逆向文档说明

## 1. 这套文档是什么

这是一套基于当前代码整理的退件模块实现说明。目标是说明当前已经落地的退件作业，而不是复述早期需求文档。

重点回答：

- 当前退件是否是独立模块
- 买家退件和快递退件如何建单与签收
- 清点、照片、客户处理方式如何落库
- 退件上架如何形成库存

## 2. 事实来源

本目录结论只来自当前代码：

- `backend/src/app/api/v1/returns/*`
- `backend/src/lib/returns/return-service.ts`
- `backend/src/lib/validations/returns.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`

## 3. 当前结论

当前退件功能已经有独立表族和服务，不只是 `ASN.asnType = RETURN`（入库通知单类型为退货入库）。

独立退件表包括：

- `return_order`
- `return_order_line`
- `return_line_disposition`
- `return_putaway_order`
- `return_putaway_line`
- `return_putaway_detail`

`ASN RETURN`（退货入库类型）仍存在于 ASN（入库通知单）校验和表字段里，但当前退件仓内作业主链走 `returns` 模块。

## 4. 当前主链

`预报退件创建 -> 退件签收 -> 退件清点 -> 清点完成 -> 客户处理方式 -> 生成退件上架单 -> 退件上架 -> 库存落账 -> 退件完成`

快递退件分支：

`扫描物流单号 -> 找不到预报退件 -> 匹配原出库订单 -> 自动创建快递退件单并签收`

## 5. 文档索引

- `01-退件总览与状态机.md`
- `02-预报签收与快递退件建单.md`
- `03-清点处理方式与照片.md`
- `04-退件上架与库存落账.md`
