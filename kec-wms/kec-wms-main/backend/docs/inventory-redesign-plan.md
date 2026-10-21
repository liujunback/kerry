# WMS库存模块重新设计方案

## Context（背景）

当前库存模块存在以下问题：
- **双表同步风险**：`Inventory` 和 `InventorySummary` 需要手动同步，容易不一致
- **锁竞争严重**：按 `仓库+SKU` 加锁，同一SKU的所有操作（上架、分配、冻结）串行化
- **部分操作无锁**：调整、转移、冻结操作缺少分布式锁保护
- **单行数据竞争**：多个业务操作同时修改 `Inventory` 表的同一行

**设计目标**：业务解耦、减少锁竞争、通过设计保证一致性、完整可追溯

---

## 核心设计：事件溯源 + 分桶 + CQRS

```
写入路径: 业务操作 → InventoryEvent(追加) → 更新Bucket → 异步更新Snapshot
读取路径: 查询请求 → InventorySnapshot/SkuSummary → 返回结果
```

---

## 新数据模型（完整表结构 + 中文备注）

> SQL建表时使用 `COMMENT` 添加中文备注

### 1. InventoryEvent（库存事件表）- 替代原 InventoryTransaction

```sql
CREATE TABLE `inventory_event` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
  `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
  `location_id` CHAR(36) NOT NULL COMMENT '库位ID',
  `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
  `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
  `batch_number` VARCHAR(64) NULL COMMENT '批次号',
  `lpn` VARCHAR(64) NULL COMMENT 'LPN容器编号',

  `event_number` VARCHAR(32) NOT NULL COMMENT '事件编号',
  `event_type` VARCHAR(32) NOT NULL COMMENT '事件类型:PUTAWAY/ALLOCATE/PICK/SHIP等',
  `event_sub_type` VARCHAR(32) NULL COMMENT '事件子类型',
  `bucket_type` VARCHAR(32) NOT NULL COMMENT '桶类型:AVAILABLE/ALLOCATED/FROZEN等',

  `quantity_delta` INT NOT NULL COMMENT '数量变化(正增负减)',
  `quantity_before` INT NOT NULL COMMENT '变动前数量',
  `quantity_after` INT NOT NULL COMMENT '变动后数量',

  `reference_type` VARCHAR(32) NULL COMMENT '关联单据类型',
  `reference_id` CHAR(36) NULL COMMENT '关联单据ID',
  `reference_number` VARCHAR(64) NULL COMMENT '关联单据编号',
  `reference_line_id` CHAR(36) NULL COMMENT '关联单据行ID',

  `idempotency_key` VARCHAR(128) NOT NULL COMMENT '幂等键(防重复)',
  `parent_event_id` CHAR(36) NULL COMMENT '父事件ID',

  `reason_code` VARCHAR(32) NULL COMMENT '原因代码',
  `reason_desc` VARCHAR(255) NULL COMMENT '原因说明',

  `unit_cost` DECIMAL(18,4) NULL COMMENT '单位成本',
  `total_cost` DECIMAL(18,4) NULL COMMENT '总成本',

  `operator_id` CHAR(36) NULL COMMENT '操作人ID',
  `event_date` DATETIME NOT NULL COMMENT '事件日期',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_event_number` (`event_number`),
  UNIQUE KEY `uk_idempotency_key` (`idempotency_key`),
  KEY `idx_tenant_warehouse_sku` (`tenant_id`, `warehouse_id`, `sku_id`, `location_id`),
  KEY `idx_event_type_date` (`event_type`, `event_date`),
  KEY `idx_reference` (`reference_type`, `reference_id`)
) ENGINE=InnoDB COMMENT='库存事件表-记录所有库存变动';
```

### 2. InventoryBucket（库存桶表）

```sql
CREATE TABLE `inventory_bucket` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
  `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
  `zone_id` CHAR(36) NOT NULL COMMENT '库区ID',
  `location_id` CHAR(36) NOT NULL COMMENT '库位ID',
  `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
  `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
  `batch_number` VARCHAR(64) NULL COMMENT '批次号',
  `lpn` VARCHAR(64) NULL COMMENT 'LPN容器编号',

  `bucket_type` VARCHAR(32) NOT NULL COMMENT '桶类型:AVAILABLE/ALLOCATED/FROZEN/DEFECTIVE/PICKING/QC_HOLD/COUNT_HOLD',

  `quantity` INT NOT NULL DEFAULT 0 COMMENT '数量',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '版本号(乐观锁)',

  `expiry_date` DATE NULL COMMENT '到期日期',
  `production_date` DATE NULL COMMENT '生产日期',
  `fifo_date` DATETIME NULL COMMENT 'FIFO日期(先进先出排序)',

  `last_event_id` CHAR(36) NULL COMMENT '最后事件ID',

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_location_sku_batch_lpn_bucket` (`location_id`, `sku_id`, `batch_number`, `lpn`, `bucket_type`),
  KEY `idx_tenant_warehouse_sku` (`tenant_id`, `warehouse_id`, `sku_id`),
  KEY `idx_bucket_type_qty` (`bucket_type`, `quantity`),
  KEY `idx_expiry_date` (`expiry_date`),
  KEY `idx_fifo_date` (`fifo_date`)
) ENGINE=InnoDB COMMENT='库存桶表-按业务类型分离的库存数量';
```

### 3. InventorySnapshot（库存快照表）

```sql
CREATE TABLE `inventory_snapshot` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
  `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
  `zone_id` CHAR(36) NOT NULL COMMENT '库区ID',
  `location_id` CHAR(36) NOT NULL COMMENT '库位ID',
  `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
  `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',
  `batch_number` VARCHAR(64) NULL COMMENT '批次号',
  `lpn` VARCHAR(64) NULL COMMENT 'LPN容器编号',

  `qty_available` INT NOT NULL DEFAULT 0 COMMENT '可用数量',
  `qty_allocated` INT NOT NULL DEFAULT 0 COMMENT '已分配数量',
  `qty_frozen` INT NOT NULL DEFAULT 0 COMMENT '冻结数量',
  `qty_defective` INT NOT NULL DEFAULT 0 COMMENT '不良品数量',
  `qty_picking` INT NOT NULL DEFAULT 0 COMMENT '拣货中数量',
  `qty_qc_hold` INT NOT NULL DEFAULT 0 COMMENT '质检暂扣数量',
  `qty_count_hold` INT NOT NULL DEFAULT 0 COMMENT '盘点冻结数量',
  `total_on_hand` INT NOT NULL DEFAULT 0 COMMENT '在库总数量',

  `expiry_date` DATE NULL COMMENT '到期日期',
  `production_date` DATE NULL COMMENT '生产日期',
  `fifo_date` DATETIME NULL COMMENT 'FIFO日期',
  `received_date` DATETIME NULL COMMENT '收货日期',
  `asn_number` VARCHAR(64) NULL COMMENT 'ASN单号(追溯来源)',

  `snapshot_version` BIGINT NOT NULL DEFAULT 0 COMMENT '快照版本号',
  `last_event_id` CHAR(36) NULL COMMENT '最后事件ID',
  `last_movement_at` DATETIME NULL COMMENT '最后移动时间',

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_location_sku_batch_lpn` (`location_id`, `sku_id`, `batch_number`, `lpn`),
  KEY `idx_tenant_warehouse_sku` (`tenant_id`, `warehouse_id`, `sku_id`),
  KEY `idx_expiry_date` (`expiry_date`),
  KEY `idx_fifo_date` (`fifo_date`)
) ENGINE=InnoDB COMMENT='库存快照表-库位级库存汇总视图';
```

### 4. SkuInventorySummary（SKU汇总表）

```sql
CREATE TABLE `sku_inventory_summary` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `client_id` CHAR(36) NOT NULL COMMENT '客户ID',
  `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
  `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
  `sku_code` VARCHAR(64) NOT NULL COMMENT 'SKU编码',

  `qty_receiving` INT NOT NULL DEFAULT 0 COMMENT '收货中数量',
  `qty_available` INT NOT NULL DEFAULT 0 COMMENT '可用数量',
  `qty_allocated` INT NOT NULL DEFAULT 0 COMMENT '已分配数量',
  `qty_frozen` INT NOT NULL DEFAULT 0 COMMENT '冻结数量',
  `qty_defective` INT NOT NULL DEFAULT 0 COMMENT '不良品数量',
  `qty_picking` INT NOT NULL DEFAULT 0 COMMENT '拣货中数量',
  `qty_shipped` INT NOT NULL DEFAULT 0 COMMENT '已发货数量',
  `total_on_hand` INT NOT NULL DEFAULT 0 COMMENT '在库总数量',

  `earliest_expiry_date` DATE NULL COMMENT '最早到期日期',
  `location_count` INT NOT NULL DEFAULT 0 COMMENT '库位数量',

  `summary_version` BIGINT NOT NULL DEFAULT 0 COMMENT '汇总版本号',
  `last_event_id` CHAR(36) NULL COMMENT '最后事件ID',
  `last_movement_at` DATETIME NULL COMMENT '最后移动时间',

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_warehouse_client_sku` (`warehouse_id`, `client_id`, `sku_id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_earliest_expiry` (`earliest_expiry_date`)
) ENGINE=InnoDB COMMENT='SKU库存汇总表-按仓库+客户+SKU维度汇总';
```

### 5. AllocationDetail（分配明细表）

```sql
CREATE TABLE `allocation_detail` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',

  `bucket_id` CHAR(36) NOT NULL COMMENT '库存桶ID',
  `snapshot_id` CHAR(36) NOT NULL COMMENT '库存快照ID',
  `location_id` CHAR(36) NOT NULL COMMENT '库位ID',
  `sku_id` CHAR(36) NOT NULL COMMENT 'SKU ID',
  `batch_number` VARCHAR(64) NULL COMMENT '批次号',

  `allocated_qty` INT NOT NULL COMMENT '分配数量',
  `picked_qty` INT NOT NULL DEFAULT 0 COMMENT '已拣货数量',
  `shipped_qty` INT NOT NULL DEFAULT 0 COMMENT '已发货数量',

  `reference_type` VARCHAR(32) NOT NULL COMMENT '关联单据类型',
  `reference_id` CHAR(36) NOT NULL COMMENT '关联单据ID',
  `reference_number` VARCHAR(64) NOT NULL COMMENT '关联单据编号',
  `reference_line_id` CHAR(36) NULL COMMENT '关联单据行ID',

  `allocation_type` VARCHAR(32) NOT NULL DEFAULT 'SOFT' COMMENT '分配类型:SOFT软分配/HARD硬分配',
  `status` VARCHAR(32) NOT NULL DEFAULT 'ALLOCATED' COMMENT '状态:ALLOCATED/PICKING/PICKED/SHIPPED/RELEASED/CANCELLED',

  `allocated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
  `expires_at` DATETIME NULL COMMENT '过期时间',
  `released_at` DATETIME NULL COMMENT '释放时间',
  `picked_at` DATETIME NULL COMMENT '拣货时间',
  `shipped_at` DATETIME NULL COMMENT '发货时间',

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_bucket` (`bucket_id`),
  KEY `idx_reference` (`reference_type`, `reference_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB COMMENT='分配明细表-跟踪库存分配到发货全流程';
```

### 桶类型枚举

| 桶类型 | 说明 | 可分配 |
|--------|------|--------|
| AVAILABLE | 可用库存 | ✓ |
| ALLOCATED | 已分配库存 | ✗ |
| FROZEN | 冻结库存 | ✗ |
| DEFECTIVE | 不良品库存 | ✗ |
| PICKING | 拣货中库存 | ✗ |
| QC_HOLD | 质检暂扣库存 | ✗ |
| COUNT_HOLD | 盘点冻结库存 | ✗ |

### 事件类型枚举

| 事件类型 | 说明 | 涉及桶 |
|----------|------|--------|
| PUTAWAY | 上架 | AVAILABLE +N |
| ALLOCATE | 分配 | AVAILABLE→ALLOCATED |
| DEALLOCATE | 取消分配 | ALLOCATED→AVAILABLE |
| PICK | 拣货 | ALLOCATED→PICKING |
| UNPICK | 取消拣货 | PICKING→AVAILABLE |
| SHIP | 发货 | PICKING -N |
| FREEZE | 冻结 | AVAILABLE→FROZEN |
| UNFREEZE | 解冻 | FROZEN→AVAILABLE |
| TO_DEFECTIVE | 转不良品 | *→DEFECTIVE |
| ADJUST_IN | 调增 | AVAILABLE +N |
| ADJUST_OUT | 调减 | AVAILABLE -N |
| TRANSFER_OUT | 转出 | AVAILABLE -N |
| TRANSFER_IN | 转入 | AVAILABLE +N |
| QC_HOLD | 质检暂扣 | AVAILABLE→QC_HOLD |
| QC_RELEASE | 质检放行 | QC_HOLD→AVAILABLE |
| QC_REJECT | 质检拒收 | QC_HOLD→DEFECTIVE |
| COUNT_FREEZE | 盘点冻结 | AVAILABLE→COUNT_HOLD |
| COUNT_UNFREEZE | 盘点解冻 | COUNT_HOLD→AVAILABLE |
| COUNT_IN | 盘盈 | AVAILABLE +N |
| COUNT_OUT | 盘亏 | AVAILABLE -N |

---

## 业务操作数据流

| 操作 | 事件 | 桶变化 |
|------|------|--------|
| 上架 | PUTAWAY | AVAILABLE +N |
| 分配 | ALLOCATE | AVAILABLE -N, ALLOCATED +N |
| 冻结 | FREEZE | AVAILABLE -N, FROZEN +N |
| 拣货 | PICK | ALLOCATED -N, PICKING +N |
| 签出/发货 | SHIP | PICKING -N（库存离开仓库） |
| 回滚(已分配) | DEALLOCATE | ALLOCATED -N, AVAILABLE +N |
| 回滚(拣货中) | UNPICK | PICKING -N, AVAILABLE +N |
| 调整 | ADJUST_IN/OUT | AVAILABLE ±N |
| 质检暂扣 | QC_HOLD | AVAILABLE -N, QC_HOLD +N |

### 上架流程（Putaway/Shelving）

**上架模式**：
- 容器上架（Container Mode）：从容器中取出物品上架到库位
- SKU上架（SKU Mode）：直接按SKU上架到库位

**上架数据流**：
```
1. 验证上架单/ASN状态
2. 验证目标库位有效性
3. 获取分布式锁: inv:bucket:{warehouseId}:{locationId}:{skuId}:AVAILABLE
4. 在事务中执行:
   a. 创建事件: {
        eventType: 'PUTAWAY',
        bucketType: 'AVAILABLE',
        quantityDelta: +N,
        referenceType: 'SHELVING_ORDER' / 'ASN',
        referenceId: 上架单ID / ASN ID
      }
   b. 更新/创建桶: InventoryBucket[AVAILABLE].quantity += N
      - 如果桶不存在，创建新桶记录
      - 如果桶存在，使用乐观锁更新: WHERE version = currentVersion
   c. 更新上架单行状态
   d. 更新ASN行已上架数量（如关联ASN）
5. 释放分布式锁
6. 异步更新: InventorySnapshot, SkuInventorySummary（通过队列）
```

**上架时需要记录的批次属性**：
| 属性 | 来源 | 说明 |
|------|------|------|
| batchNumber | ASN/上架单 | 批次号 |
| lpn | 容器 | LPN容器编号 |
| expiryDate | ASN/手动输入 | 到期日期 |
| productionDate | ASN/手动输入 | 生产日期 |
| fifoDate | 系统生成 | 默认为上架时间，用于FIFO分配 |
| asnNumber | ASN | 追溯来源 |

**上架涉及的表变更**：
| 表 | 操作 |
|----|------|
| InventoryEvent | INSERT（上架事件） |
| InventoryBucket | UPSERT（AVAILABLE桶 +N） |
| InventorySnapshot | 异步 UPSERT |
| SkuInventorySummary | 异步 UPDATE（qtyAvailable +N, qtyReceiving -N） |
| ShelvingOrderLine | UPDATE（已上架数量） |
| AsnLine | UPDATE（已上架数量，如关联） |

### 订单签出与回滚详细流程

**签出（Checkout/Ship）**：
```
1. 验证订单状态为 PICKED
2. 创建事件: { eventType: 'SHIP', bucketType: 'PICKING', quantityDelta: -N }
3. 更新桶: InventoryBucket[PICKING].quantity -= N
4. 更新 AllocationDetail.status = 'SHIPPED'
5. 异步更新: InventorySnapshot, SkuInventorySummary
```

**回滚（Rollback）**：
```
场景1: 已分配未拣货 (ALLOCATED状态)
1. 创建事件: { eventType: 'DEALLOCATE', bucketType: 'ALLOCATED', quantityDelta: -N }
2. 创建事件: { eventType: 'DEALLOCATE', bucketType: 'AVAILABLE', quantityDelta: +N }
3. 更新桶: ALLOCATED -N, AVAILABLE +N
4. 更新 AllocationDetail.status = 'RELEASED'

场景2: 已拣货未发货 (PICKING状态)
1. 创建事件: { eventType: 'UNPICK', bucketType: 'PICKING', quantityDelta: -N }
2. 创建事件: { eventType: 'UNPICK', bucketType: 'AVAILABLE', quantityDelta: +N }
3. 更新桶: PICKING -N, AVAILABLE +N
4. 更新 AllocationDetail.status = 'RELEASED'
```

### 库存盘点流程

**盘点类型**：
- 周期盘点（Cycle Count）：按计划定期盘点部分库位
- 全盘（Full Count）：盘点整个仓库或库区
- 动碰盘点（Movement Count）：有库存变动时触发盘点

**盘点数据流**：
```
1. 创建盘点任务 → 选择库位/SKU范围
2. (可选) 盘点冻结: AVAILABLE -N, COUNT_HOLD +N
3. 录入实盘数量
4. 系统计算差异 = 实盘数量 - 系统数量
5. 审批盘点差异
6. 执行调整:
   - 盘盈: { eventType: 'COUNT_IN', bucketType: 'AVAILABLE', quantityDelta: +差异 }
   - 盘亏: { eventType: 'COUNT_OUT', bucketType: 'AVAILABLE', quantityDelta: -差异 }
7. (如有冻结) 解冻: COUNT_HOLD -N, AVAILABLE +N
```

**桶类型扩展**：
| 桶类型 | 说明 |
|--------|------|
| COUNT_HOLD | 盘点冻结库存（盘点期间不可分配） |

**盘点相关事件类型**：
| 事件 | 说明 |
|------|------|
| COUNT_FREEZE | 盘点冻结 |
| COUNT_UNFREEZE | 盘点解冻 |
| COUNT_IN | 盘盈调整 |
| COUNT_OUT | 盘亏调整 |

---

## 锁策略优化

**新锁键格式**：`inv:bucket:{warehouseId}:{locationId}:{skuId}:{bucketType}`

| 操作 | 需要锁的桶 |
|------|-----------|
| 上架 | AVAILABLE |
| 分配 | AVAILABLE, ALLOCATED |
| 冻结 | AVAILABLE, FROZEN |
| 拣货 | ALLOCATED, PICKING |
| 调整 | AVAILABLE |

**效果**：上架和冻结操作不再互相阻塞（除非都涉及AVAILABLE桶）

---

## 一致性保证

1. **事件幂等**：`idempotencyKey` 唯一约束
2. **乐观锁**：`InventoryBucket.version` 字段
3. **最终一致**：事件同步写入，Snapshot异步更新（BullMQ队列）
4. **可恢复**：通过重放事件重建Snapshot

---

## 关键文件

- `backend/prisma/schema.prisma` - 添加新模型
- `backend/src/lib/services/inventory-event-service.ts` - 新建事件服务
- `backend/src/lib/services/inventory-bucket-service.ts` - 新建桶服务
- `backend/src/lib/queue/workers/inventory-snapshot.worker.ts` - 新建快照更新Worker
- `backend/src/lib/services/inventory-allocation-service.ts` - 重构为事件驱动

---

## 迁移策略

> 开发环境，直接修改初始化 migration 文件

### 需要修改的文件

1. `backend/prisma/schema.prisma` - 修改数据模型
2. `backend/prisma/migrations/0_init/migration.sql` - 直接修改初始化SQL

### 数据表变更

**删除的表（5个）**：
- `inventory` - 由 inventory_bucket + inventory_snapshot 替代
- `inventory_summary` - 由 sku_inventory_summary 替代
- `inventory_transaction` - 由 inventory_event 替代
- `inventory_allocation` - 由 allocation_detail 替代
- `inventory_freeze` - 冻结通过 FROZEN 桶实现

**新增的表（5个）**：
- `inventory_event` - 库存事件表
- `inventory_bucket` - 库存桶表
- `inventory_snapshot` - 库存快照表
- `sku_inventory_summary` - SKU汇总表
- `allocation_detail` - 分配明细表

**保留的表**：
- `inventory_adjustment` / `inventory_adjustment_line` - 调整单
- `inventory_transfer` / `inventory_transfer_line` - 转移单
- `inventory_alert` - 库存预警

### 需要移除/重构的代码文件

| 文件路径 | 处理方式 |
|----------|----------|
| `backend/src/lib/services/inventory-allocation-service.ts` | 重构为事件驱动 |
| `backend/src/lib/queue/workers/inventory-allocation.worker.ts` | 重构 |
| `backend/src/app/api/v1/inventory/route.ts` | 重构，使用新模型 |
| `backend/src/app/api/v1/inventory/summary/route.ts` | 重构，查询 SkuInventorySummary |
| `backend/src/app/api/v1/inventory/freezes/route.ts` | 重构，使用桶模型 |
| `backend/src/app/api/v1/inventory/transactions/route.ts` | 重构，查询 InventoryEvent |
| `backend/src/app/api/v1/shelving/route.ts` | 重构，写入事件 |
| `backend/src/app/api/v1/outbound-orders/[id]/rollback/route.ts` | 重构 |
| `backend/src/app/api/v1/checkout/route.ts` | 重构 |

### 实施步骤

1. 修改 `schema.prisma`：删除旧模型，添加新模型
2. 修改 `0_init/migration.sql`：删除旧表DDL，添加新表DDL
3. 重置数据库：`npx prisma migrate reset`
4. 重构业务代码使用新模型

---

## 统一库存锁服务设计

### 锁服务接口

```typescript
// backend/src/lib/services/inventory-lock-service.ts

interface LockOptions {
  ttl?: number;        // 锁超时时间（毫秒），默认 30000
  retryCount?: number; // 重试次数，默认 3
  retryDelay?: number; // 重试间隔（毫秒），默认 100
}

interface LockResult {
  acquired: boolean;
  lockId?: string;     // 用于释放锁的唯一标识
}

class InventoryLockService {
  // 获取单个桶锁
  async acquireBucketLock(
    warehouseId: string,
    locationId: string,
    skuId: string,
    bucketType: BucketType,
    options?: LockOptions
  ): Promise<LockResult>;

  // 批量获取多个桶锁（按固定顺序，防止死锁）
  async acquireMultipleBucketLocks(
    locks: Array<{
      warehouseId: string;
      locationId: string;
      skuId: string;
      bucketType: BucketType;
    }>,
    options?: LockOptions
  ): Promise<LockResult>;

  // 释放锁
  async releaseLock(lockId: string): Promise<void>;

  // 批量释放锁
  async releaseMultipleLocks(lockIds: string[]): Promise<void>;

  // 使用锁执行操作（自动获取和释放）
  async withLock<T>(
    locks: Array<{
      warehouseId: string;
      locationId: string;
      skuId: string;
      bucketType: BucketType;
    }>,
    operation: () => Promise<T>,
    options?: LockOptions
  ): Promise<T>;
}
```

### 锁键格式与排序

```
锁键格式: inv:lock:{warehouseId}:{locationId}:{skuId}:{bucketType}

排序规则（防止死锁）:
1. warehouseId 字典序
2. locationId 字典序
3. skuId 字典序
4. bucketType 枚举顺序: AVAILABLE < ALLOCATED < PICKING < FROZEN < DAMAGED
```

### 各操作的锁需求

| 操作 | 锁键列表 | 说明 |
|------|----------|------|
| 上架 | `[AVAILABLE]` | 只增加可用库存 |
| 分配 | `[AVAILABLE, ALLOCATED]` | 从可用转到已分配 |
| 拣货确认 | `[ALLOCATED, PICKING]` | 从已分配转到拣货中 |
| 发货确认 | `[PICKING]` | 扣减拣货中库存 |
| 冻结 | `[AVAILABLE, FROZEN]` | 从可用转到冻结 |
| 解冻 | `[FROZEN, AVAILABLE]` | 从冻结转到可用 |
| 调整 | `[AVAILABLE]` | 直接调整可用库存 |
| 回滚(已分配) | `[ALLOCATED, AVAILABLE]` | 从已分配退回可用 |
| 回滚(拣货中) | `[PICKING, AVAILABLE]` | 从拣货中退回可用 |

### 实现示例

```typescript
// 使用 Redlock 实现分布式锁
import Redlock from 'redlock';

class InventoryLockService {
  private redlock: Redlock;
  private readonly DEFAULT_TTL = 30000;
  private readonly DEFAULT_RETRY_COUNT = 3;
  private readonly DEFAULT_RETRY_DELAY = 100;

  constructor(redisClients: Redis[]) {
    this.redlock = new Redlock(redisClients, {
      driftFactor: 0.01,
      retryCount: this.DEFAULT_RETRY_COUNT,
      retryDelay: this.DEFAULT_RETRY_DELAY,
    });
  }

  private buildLockKey(
    warehouseId: string,
    locationId: string,
    skuId: string,
    bucketType: BucketType
  ): string {
    return `inv:lock:${warehouseId}:${locationId}:${skuId}:${bucketType}`;
  }

  private sortLockKeys(keys: string[]): string[] {
    return [...keys].sort(); // 字典序排序，防止死锁
  }

  async withLock<T>(
    locks: Array<{
      warehouseId: string;
      locationId: string;
      skuId: string;
      bucketType: BucketType;
    }>,
    operation: () => Promise<T>,
    options?: LockOptions
  ): Promise<T> {
    const keys = locks.map(l =>
      this.buildLockKey(l.warehouseId, l.locationId, l.skuId, l.bucketType)
    );
    const sortedKeys = this.sortLockKeys(keys);
    const ttl = options?.ttl ?? this.DEFAULT_TTL;

    const lock = await this.redlock.acquire(sortedKeys, ttl);
    try {
      return await operation();
    } finally {
      await lock.release();
    }
  }
}
```

### 锁服务使用示例

```typescript
// 分配库存时使用锁
async allocateInventory(
  warehouseId: string,
  locationId: string,
  skuId: string,
  quantity: number
) {
  return this.lockService.withLock(
    [
      { warehouseId, locationId, skuId, bucketType: 'AVAILABLE' },
      { warehouseId, locationId, skuId, bucketType: 'ALLOCATED' },
    ],
    async () => {
      // 1. 检查可用库存
      const available = await this.getBucketQuantity(
        warehouseId, locationId, skuId, 'AVAILABLE'
      );
      if (available < quantity) {
        throw new Error('库存不足');
      }

      // 2. 创建事件
      await this.eventService.createEvents([
        { eventType: 'ALLOCATE', bucketType: 'AVAILABLE', quantityDelta: -quantity },
        { eventType: 'ALLOCATE', bucketType: 'ALLOCATED', quantityDelta: +quantity },
      ]);

      // 3. 更新桶
      await this.bucketService.updateBuckets([
        { warehouseId, locationId, skuId, bucketType: 'AVAILABLE', delta: -quantity },
        { warehouseId, locationId, skuId, bucketType: 'ALLOCATED', delta: +quantity },
      ]);
    }
  );
}
```

---

## 验证方式

1. 单元测试：各事件类型的桶变化逻辑
2. 集成测试：完整业务流程（上架→分配→拣货→发货）
3. 并发测试：模拟多个操作同时执行，验证锁策略
4. 一致性验证：对比 Bucket 汇总与 Snapshot 数据
