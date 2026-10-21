# 入库模块逆向文档说明

## 1. 这套文档是什么

这是一套基于当前代码逆向整理出来的入库模块实现说明，目标不是写“理想设计”，也不是复述历史方案，而是回答下面这些实际问题：

- 当前入库主链到底怎么走
- 每一步是谁触发的
- 每一步实际写了哪些表
- 每个状态是怎么变的
- 前端最终看到的库存是从哪一层算出来的
- 哪些字段、枚举、Schema 已经定义了，但当前主链并没有真正用起来

## 2. 事实来源

本目录下所有结论只来自当前代码，不参考旧文档，不引用历史测试脚本结论。

核心事实来源如下：

- `backend/src/app/api/v1/asn/*`
- `backend/src/app/api/v1/putaway/*`
- `backend/src/app/api/v1/shelving/*`
- `backend/src/app/api/v1/inventory/*`
- `backend/src/lib/services/asn-state-machine.ts`
- `backend/src/lib/services/inventory-operation-service.ts`
- `backend/src/lib/services/inventory-event-service.ts`
- `backend/src/lib/services/inventory-bucket-service.ts`
- `backend/src/lib/services/inventory-snapshot-service.ts`
- `backend/prisma/schema.prisma`

## 3. 判定原则

本文档按下面的优先级判断业务事实：

1. 实际写库路径优先  
   也就是 `route -> service -> prisma update/create/upsert -> 事务后异步更新`

2. 当前运行时约束优先  
   也就是接口真实校验、真实锁、真实状态检查、真实报错分支

3. Schema 注释、校验 Schema、状态枚举只作为辅助  
   如果它们和真实写路径冲突，以真实写路径为准，并在文档里明确写出差异

## 4. 当前后端主链

当前代码对应的入库主链是：

`ASN建单 -> 签收 -> 收货 -> 收货完结 -> 创建上架单 -> 上架执行 -> 库存事件/库存桶/快照汇总更新`

更细一点：

1. 通过 `POST /api/v1/asn` 创建 ASN 和 ASN 明细。
2. 通过 `POST /api/v1/asn/[id]/sign-in` 对 ASN 执行签收。
3. 通过 `POST /api/v1/asn/[id]/receiving/sku` 执行收货。
4. 通过 `POST /api/v1/asn/[id]/receiving/complete` 将收货过程收尾到 `RECEIVED`。
5. 通过 `POST /api/v1/putaway/orders` 基于收货记录或容器明细创建上架单。
6. 通过 `POST /api/v1/shelving` 执行实际的上架。
7. 上架过程中先写 `inventory_event`，再更新 `inventory_bucket`，再回写上架明细、上架单、ASN、序列号、容器等表。
8. 上架事务完成后，再异步刷新 `inventory_snapshot` 和 `sku_inventory_summary`。

## 5. 当前真实状态机

### 5.1 ASN 状态

`backend/src/lib/services/asn-state-machine.ts` 中当前真实状态机是：

- `CREATED`
- `PENDING_RECEIVING`
- `RECEIVING`
- `RECEIVED`
- `PUTTING_AWAY`
- `COMPLETED`
- `CANCELLED`
- `FORCE_COMPLETED`

当前状态转换动作：

- `SIGN_IN`: `CREATED -> PENDING_RECEIVING`
- `START_RECEIVE`: `PENDING_RECEIVING|CREATED -> RECEIVING`
- `COMPLETE_RECEIVE`: `RECEIVING -> RECEIVED`
- `FORCE_COMPLETE_RECEIVE`: `RECEIVING|PENDING_RECEIVING -> FORCE_COMPLETED`
- `START_PUTAWAY`: `RECEIVED -> PUTTING_AWAY`
- `COMPLETE_PUTAWAY`: `PUTTING_AWAY -> COMPLETED`
- `FORCE_COMPLETE_PUTAWAY`: `PUTTING_AWAY -> FORCE_COMPLETED`
- `CANCEL`: `CREATED|PENDING_RECEIVING -> CANCELLED`
- `ROLLBACK`: `PENDING_RECEIVING|RECEIVING|RECEIVED|PUTTING_AWAY -> CREATED`

### 5.2 需要特别注意的地方

- `backend/src/lib/validations/asn.ts` 里还能看到 `CLOSED` 这样的状态定义。
- `backend/prisma/schema.prisma` 里部分注释仍带有旧状态描述。
- 但是当前主链真正驱动状态变化的核心是 `asn-state-machine.ts` 和各路由里的写库逻辑。

因此，后续各文档都以“当前真实写路径”作为主依据。

## 6. 文档索引

- `01-ASN建单与签收.md`
  - 讲 ASN 建单、修改、删除、签收
- `02-收货执行与收货完结.md`
  - 讲扫码找 SKU、SKU 收货、容器收货、收货完结
- `03-上架单生成.md`
  - 讲任务模式和容器模式如何生成上架单
- `04-上架执行与库存落账.md`
  - 讲上架校验、写库、库存事件、库存桶、快照和库存查询口径

## 7. 本目录不做什么

这套文档明确不做下面这些事情：

- 不复述旧 `docs/*.md` 的历史说法
- 不以测试脚本行为替代业务代码事实
- 不把 Schema 中“预留但未接线”的字段写成已落地业务
- 不把前端页面展示文案当作后端真实业务规则

## 8. 术语口径

- `ASN`
  - 入库通知单主单，主表是 `asn`
- `ASN 行`
  - 入库通知单明细，主表是 `asn_line`
- `收货记录`
  - 每次实际收货动作，主表是 `receiving_record`
- `上架单`
  - 上架任务主单，主表是 `putaway_order`
- `上架单行`
  - 上架任务明细，主表是 `putaway_order_line`
- `上架明细`
  - 每次实际上架动作，主表是 `putaway_detail`
- `库存事件`
  - 事件流水，主表是 `inventory_event`
- `库存桶`
  - 当前库存事实层，主表是 `inventory_bucket`
- `库存快照`
  - 库位粒度汇总层，主表是 `inventory_snapshot`
- `SKU 汇总`
  - 仓库+客户+SKU 粒度汇总层，主表是 `sku_inventory_summary`
