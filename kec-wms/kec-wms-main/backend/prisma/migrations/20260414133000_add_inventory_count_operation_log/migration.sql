CREATE TABLE `inventory_count_operation_log` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `order_id` CHAR(36) NOT NULL COMMENT '盘点单ID',
  `entity_type` VARCHAR(64) NOT NULL COMMENT '业务对象类型',
  `entity_id` CHAR(36) NULL COMMENT '业务对象ID',
  `operation_type` VARCHAR(64) NOT NULL COMMENT '操作类型',
  `description` VARCHAR(500) NOT NULL COMMENT '操作说明',
  `operator_id` CHAR(36) NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(128) NULL COMMENT '操作人姓名',
  `metadata_json` JSON NULL COMMENT '元数据',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  INDEX `inventory_count_operation_log_tenant_order_created_idx`(`tenant_id`, `order_id`, `created_at`),
  INDEX `inventory_count_operation_log_order_created_idx`(`order_id`, `created_at`),
  INDEX `inventory_count_operation_log_entity_idx`(`entity_type`, `entity_id`),
  INDEX `inventory_count_operation_log_operation_type_idx`(`operation_type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='盘点操作日志表';
