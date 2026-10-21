-- 1) 归一化空字符串，避免唯一索引阶段将空字符串视作重复值
UPDATE `outbound_order`
SET `reference_number` = NULL
WHERE `reference_number` = '';

-- 2) 迁移前校验：阻断 tenant_id + client_id + reference_number 重复数据
SET @duplicate_count := (
  SELECT COUNT(*)
  FROM (
    SELECT `tenant_id`, `client_id`, `reference_number`
    FROM `outbound_order`
    WHERE `reference_number` IS NOT NULL
    GROUP BY `tenant_id`, `client_id`, `reference_number`
    HAVING COUNT(*) > 1
  ) AS dup
);

-- 输出重复清单（最多50条）供人工清理
SELECT
  `tenant_id`,
  `client_id`,
  `reference_number`,
  COUNT(*) AS `duplicate_count`
FROM `outbound_order`
WHERE `reference_number` IS NOT NULL
GROUP BY `tenant_id`, `client_id`, `reference_number`
HAVING COUNT(*) > 1
LIMIT 50;

SET @validation_sql := IF(
  @duplicate_count > 0,
  'SIGNAL SQLSTATE ''45000'' SET MESSAGE_TEXT = ''Duplicate reference_number exists for tenant+client in outbound_order. Please deduplicate before migration.''',
  'DO 0'
);

PREPARE stmt FROM @validation_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) 新增出库订单号序列表（原子自增）
CREATE TABLE `outbound_order_sequence` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `warehouse_code` VARCHAR(32) NOT NULL,
  `date_key` VARCHAR(8) NOT NULL,
  `current_value` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_outbound_order_sequence_scope`(`tenant_id`, `warehouse_code`, `date_key`),
  INDEX `outbound_order_sequence_tenant_id_idx`(`tenant_id`),
  CONSTRAINT `outbound_order_sequence_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4) 出库外部单号唯一约束（租户+客户范围）
ALTER TABLE `outbound_order`
ADD UNIQUE INDEX `uq_outbound_order_tenant_client_reference`(`tenant_id`, `client_id`, `reference_number`);
