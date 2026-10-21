# WMS系统模块文档

## 文档概览

本目录包含WMS系统的完整模块文档，共11个核心业务模块，从现有代码反向生成，涵盖数据模型、业务流程和关键功能点。

## Reverse（按代码逆向）文档导航

当前仓库里已经额外整理了多套“按代码逆向”的专题文档，建议和主模块文档配套使用：

- [inbound-reverse](./inbound-reverse/README.md)
  - 入库业务流程与数据落库逆向
- [inbound-web-reverse](./inbound-web-reverse/README.md)
  - 当前 Web（网页）端入库 UI（界面）逆向
- [outbound-reverse](./outbound-reverse/README.md)
  - 出库业务流程与数据落库逆向
- [outbound-web-reverse](./outbound-web-reverse/README.md)
  - 当前 Web（网页）端出库 UI（界面）逆向
- [inventory-reverse](./inventory-reverse/README.md)
  - 库存分层、库存桶、库存事件与库存写入口逆向
- [inventory-count-reverse](./inventory-count-reverse/README.md)
  - 盘点创建、范围生成、PDA（手持端）执行、差异处理与结算逆向
- [returns-reverse](./returns-reverse/README.md)
  - 退件签收、清点、处理方式、退件上架与库存落账逆向
- [pda-reverse](./pda-reverse/README.md)
  - PDA（手持端）导航、接口、入库、出库、库存与盘点执行逆向
- [wave-strategy-reverse](./wave-strategy-reverse/README.md)
  - 波次策略配置、执行、分类、释放与运行记录逆向
- [外部API-库存与Webhook接入.md](./外部API-库存与Webhook接入.md)
  - 外部库存查询、库存流水拉取、订单包裹返回与库存流水 Webhook 推送接入说明

## 文档列表（11/11）✅

### 基础模块

1. **[01-系统管理.md](01-系统管理.md)** (11KB)
   - 多租户管理、用户账户、角色权限、API密钥
   - 8个数据模型：Tenant, User, Role, Permission, UserRole, RolePermission, ApiKey, LoginHistory, PasswordHistory
   - 核心特性：RBAC权限模型、作用域权限、账户安全

2. **[02-仓库基础设施.md](02-仓库基础设施.md)** (10KB)
   - 仓库、库区、库位、容器管理
   - 5个数据模型：Warehouse, Zone, BinLocation, Container, ContainerItem
   - 核心特性：三级层级结构、质量分区、容器生命周期管理

3. **[03-客户管理.md](03-客户管理.md)** (5.4KB)
   - 客户档案、客户仓库关联
   - 2个数据模型：Client, ClientWarehouse
   - 核心特性：多客户隔离、默认仓库机制、客户配置

4. **[04-商品管理.md](04-商品管理.md)** (16KB)
   - SKU、商品分类、条码、单位、组合商品
   - 8个数据模型：Sku, SkuCategory, SkuBarcode, SkuUom, SkuImage, SkuAttribute, ComboProduct, ComboComponent
   - 核心特性：多单位管理、多条码支持、商品属性扩展、组合商品

### 核心业务模块

5. **[05-入库管理.md](05-入库管理.md)** (待完善)
   - ASN、收货、上架全流程
   - 8个数据模型：Asn, AsnLine, ReceivingRecord, ReceivingDiscrepancy, PutawayOrder, PutawayOrderLine, PutawayDetail, ShortReceiveReasonCode
   - 状态机：CREATED → PENDING_RECEIVING → RECEIVING → RECEIVED → PUTTING_AWAY → COMPLETED
   - 核心特性：容器收货、批次管理、序列号管理、差异处理

6. **[06-库存管理.md](06-库存管理.md)** (31KB)
   - 库存事件、库存桶、快照、调整、转移、预警
   - 11个数据模型：InventoryEvent, InventoryBucket, InventorySnapshot, SkuInventorySummary, AllocationDetail, SerialNumber, InventoryAdjustment, InventoryAdjustmentLine, InventoryTransfer, InventoryTransferLine, InventoryAlert
   - 核心特性：库存桶机制、事件溯源、库存分配策略、序列号追溯

7. **[07-出库管理.md](07-出库管理.md)** (4.8KB，待完善)
   - 出库单、波次、拣货、分拣、打包、签出全流程
   - 14个数据模型：OutboundOrder, OutboundOrderLine, OutboundOrderExtension, OrderAddress, OrderTimeline, Wave, PickOrder, PickOrderLine, SortingWall, SortingTask, SortingTaskLine, SortingCellAllocation, CheckoutOrder, CheckoutRecord
   - 状态机：PENDING → ALLOCATED → PENDING_PICK → PICKING → PICKED → SORTING → SORTED → PACKING → PACKED → CHECKOUT_PENDING → CHECKED_OUT
   - 核心特性：波次拣货、分拣墙、库存分配策略、订单优先级

8. **[08-发货管理.md](08-发货管理.md)** (20KB)
   - 发货单、物流跟踪、装车清单
   - 3个数据模型：Shipment, ManifestOrder, CheckoutRecord
   - 状态机：CREATED → LABEL_PRINTED → READY → SHIPPED → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
   - 核心特性：物流跟踪、面单打印、装车管理、API集成

### 辅助模块

9. **[09-包材管理.md](09-包材管理.md)** (10KB)
   - 包材信息、库存、交易记录
   - 4个数据模型：PackagingMaterial, PackagingMaterialInventory, PackagingMaterialTransaction, PackagingMaterialUsage
   - 核心特性：包材库存管理、消耗追踪、成本核算

10. **[10-打印管理.md](10-打印管理.md)** (12KB)
    - 打印模板、设备、历史记录
    - 3个数据模型：PrintTemplate, PrintDevice, PrintHistory
    - 核心特性：多模板支持、条码生成、PDF生成、打印追溯

11. **[11-系统支撑.md](11-系统支撑.md)** (13KB)
    - 后台作业、定时任务、审计日志、操作日志
    - 5个数据模型：BackgroundJob, ScheduledTask, ScheduledTaskLog, Audit, OperationLog
    - 核心特性：BullMQ任务队列、定时调度、审计追溯、操作日志

## 文档特点

### 内容结构
每个文档包含以下标准章节：
- **模块概述**：功能描述、业务场景、与其他模块的关系
- **数据模型**：详细的表结构、字段说明、关联关系、唯一约束
- **业务流程**：关键业务流程的步骤化描述
- **关键功能点**：模块的核心技术特性总结

### 技术亮点
- **状态机管理**：入库、出库、发货模块采用状态机模式管理业务流程
- **库存桶机制**：按多维度（客户、仓库、库位、SKU、批次、质量）管理库存
- **事件溯源**：所有库存变动都记录事件，支持完整追溯
- **波次拣货**：支持多订单合并拣货，提高拣货效率
- **分拣墙**：使用播种墙进行二次分拣，支持电子标签指引
- **多租户隔离**：所有数据按租户隔离，支持多企业独立运营

## 数据统计

- **总文档数**：11个模块文档 + 1个README
- **总文档大小**：约150KB
- **数据模型总数**：70+个表
- **状态机数量**：3个（ASN、出库单、发货单）
- **业务流程数**：30+个关键流程

## 使用建议

### 新开发人员
1. 先阅读基础模块（01-04）了解系统架构
2. 再阅读核心业务模块（05-08）理解业务流程
3. 最后阅读辅助模块（09-11）了解支撑功能

### 技术架构师
- 重点关注状态机设计（05、07、08）
- 重点关注库存桶机制（06）
- 重点关注多租户隔离（01）

### 产品经理
- 重点关注业务流程章节
- 重点关注模块概述中的业务场景
- 重点关注关键功能点

## 后续维护

### 文档更新原则
- 当数据模型变更时，同步更新对应文档
- 当业务流程调整时，更新业务流程章节
- 当新增功能时，补充到关键功能点

### 待完善内容
- 05-入库管理.md：需要补充完整的业务流程和状态机说明
- 07-出库管理.md：需要补充完整的数据模型和业务流程

## 生成信息

- **生成日期**：2026-03-06
- **生成方式**：从现有代码反向生成
- **数据源**：backend/prisma/schema.prisma + API路由 + 业务逻辑代码
- **文档语言**：简体中文
- **文档格式**：Markdown
