-- ==================== 波次策略主数据 ====================

CREATE TABLE `wave_strategy` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `warehouse_id` CHAR(36) NOT NULL COMMENT '适用仓库ID',
  `strategy_code` VARCHAR(64) NOT NULL COMMENT '策略编码',
  `strategy_name` VARCHAR(128) NOT NULL COMMENT '策略名称',
  `description` TEXT NULL COMMENT '策略描述',
  `priority` INT NOT NULL DEFAULT 100 COMMENT '优先级，数值越小优先级越高',
  `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT' COMMENT '状态：DRAFT/ENABLED/DISABLED/ARCHIVED',
  `current_version_id` CHAR(36) NULL COMMENT '当前版本ID',
  `latest_version_no` INT NOT NULL DEFAULT 1 COMMENT '最新版本号',
  `is_deleted` BOOLEAN NOT NULL DEFAULT false COMMENT '是否逻辑删除',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
  `created_by` CHAR(36) NULL COMMENT '创建人ID',
  `updated_by` CHAR(36) NULL COMMENT '更新人ID',
  UNIQUE INDEX `wave_strategy_tenant_id_strategy_code_key`(`tenant_id`, `strategy_code`),
  INDEX `wave_strategy_tenant_id_warehouse_id_status_priority_idx`(`tenant_id`, `warehouse_id`, `status`, `priority`),
  INDEX `wave_strategy_warehouse_id_idx`(`warehouse_id`),
  INDEX `wave_strategy_current_version_id_idx`(`current_version_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='波次策略主表';

CREATE TABLE `wave_strategy_version` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `strategy_id` CHAR(36) NOT NULL COMMENT '策略ID',
  `version_no` INT NOT NULL COMMENT '版本号',
  `version_status` VARCHAR(32) NOT NULL DEFAULT 'EDITING' COMMENT '版本状态：EDITING/PUBLISHED/ROLLED_BACK/ABANDONED',
  `is_current` BOOLEAN NOT NULL DEFAULT false COMMENT '是否当前生效版本',
  `change_summary` VARCHAR(512) NULL COMMENT '变更说明',
  `config_snapshot` JSON NOT NULL COMMENT '完整配置快照',
  `published_at` DATETIME(3) NULL COMMENT '发布时间',
  `published_by` CHAR(36) NULL COMMENT '发布人ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `created_by` CHAR(36) NULL COMMENT '创建人ID',
  UNIQUE INDEX `wave_strategy_version_strategy_id_version_no_key`(`strategy_id`, `version_no`),
  INDEX `wave_strategy_version_tenant_id_idx`(`tenant_id`),
  INDEX `wave_strategy_version_strategy_id_is_current_idx`(`strategy_id`, `is_current`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='波次策略版本表';

CREATE TABLE `wave_strategy_rule_set` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `strategy_version_id` CHAR(36) NOT NULL COMMENT '策略版本ID',
  `trigger_config_json` JSON NOT NULL COMMENT '触发配置',
  `filter_config_json` JSON NOT NULL COMMENT '筛选配置',
  `execution_config_json` JSON NOT NULL COMMENT '执行控制配置',
  `wave_type_config_json` JSON NOT NULL COMMENT '波次类型配置',
  `pick_config_json` JSON NOT NULL COMMENT '拣货规则配置',
  `release_config_json` JSON NOT NULL COMMENT '释放规则配置',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
  UNIQUE INDEX `wave_strategy_rule_set_strategy_version_id_key`(`strategy_version_id`),
  INDEX `wave_strategy_rule_set_tenant_id_idx`(`tenant_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='波次策略规则集表';

CREATE TABLE `wave_strategy_run` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
  `strategy_id` CHAR(36) NOT NULL COMMENT '策略ID',
  `strategy_version_id` CHAR(36) NOT NULL COMMENT '策略版本ID',
  `run_mode` VARCHAR(16) NOT NULL DEFAULT 'SIMULATE' COMMENT '运行模式：SIMULATE/EXECUTE',
  `trigger_type` VARCHAR(32) NOT NULL COMMENT '触发类型：MANUAL/SCHEDULED/API',
  `run_status` VARCHAR(32) NOT NULL DEFAULT 'RUNNING' COMMENT '执行状态：RUNNING/SUCCESS/PARTIAL_SUCCESS/FAILED',
  `candidate_order_count` INT NOT NULL DEFAULT 0 COMMENT '候选订单数',
  `matched_order_count` INT NOT NULL DEFAULT 0 COMMENT '命中订单数',
  `claimed_by_higher_count` INT NOT NULL DEFAULT 0 COMMENT '被更高优先级抢占订单数',
  `unclassified_order_count` INT NOT NULL DEFAULT 0 COMMENT '未归类订单数',
  `created_wave_count` INT NOT NULL DEFAULT 0 COMMENT '生成波次数',
  `created_pick_order_count` INT NOT NULL DEFAULT 0 COMMENT '生成拣货单数',
  `error_message` TEXT NULL COMMENT '错误信息',
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '开始时间',
  `finished_at` DATETIME(3) NULL COMMENT '结束时间',
  `triggered_by` CHAR(36) NULL COMMENT '触发人ID',
  `request_payload` JSON NULL COMMENT '请求参数',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  INDEX `wave_strategy_run_tenant_id_warehouse_id_created_at_idx`(`tenant_id`, `warehouse_id`, `created_at`),
  INDEX `wave_strategy_run_strategy_id_started_at_idx`(`strategy_id`, `started_at`),
  INDEX `wave_strategy_run_strategy_version_id_idx`(`strategy_version_id`),
  INDEX `wave_strategy_run_run_status_idx`(`run_status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='波次策略运行主表';

CREATE TABLE `wave_strategy_run_order` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `run_id` CHAR(36) NOT NULL COMMENT '运行ID',
  `order_id` CHAR(36) NOT NULL COMMENT '订单ID',
  `batch_no` INT NOT NULL DEFAULT 1 COMMENT '批次号',
  `matched_strategy` BOOLEAN NOT NULL DEFAULT false COMMENT '是否命中当前策略',
  `claimed_by_strategy_id` CHAR(36) NULL COMMENT '抢占当前订单的策略ID',
  `wave_type_code` VARCHAR(64) NULL COMMENT '波次类型编码',
  `pick_mode` VARCHAR(32) NULL COMMENT '拣货模式',
  `downstream_mode` VARCHAR(32) NULL COMMENT '后续路径',
  `result_status` VARCHAR(32) NOT NULL COMMENT '处理结果：MATCHED/SKIPPED/UNCLASSIFIED/WAVED/FAILED',
  `wave_id` CHAR(36) NULL COMMENT '生成波次ID',
  `pick_order_id` CHAR(36) NULL COMMENT '生成拣货单ID',
  `message` VARCHAR(512) NULL COMMENT '结果说明',
  `matched_rule_snapshot` JSON NULL COMMENT '命中规则快照',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  UNIQUE INDEX `wave_strategy_run_order_run_id_order_id_key`(`run_id`, `order_id`),
  INDEX `wave_strategy_run_order_tenant_id_idx`(`tenant_id`),
  INDEX `wave_strategy_run_order_order_id_idx`(`order_id`),
  INDEX `wave_strategy_run_order_wave_id_idx`(`wave_id`),
  INDEX `wave_strategy_run_order_pick_order_id_idx`(`pick_order_id`),
  INDEX `wave_strategy_run_order_result_status_idx`(`result_status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='波次策略运行订单明细表';

CREATE TABLE `wave_order` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `wave_id` CHAR(36) NOT NULL COMMENT '波次ID',
  `order_id` CHAR(36) NOT NULL COMMENT '订单ID',
  `order_number` VARCHAR(64) NOT NULL COMMENT '订单号',
  `wave_type_code` VARCHAR(64) NULL COMMENT '波次类型编码',
  `pick_mode` VARCHAR(32) NULL COMMENT '拣货模式',
  `downstream_mode` VARCHAR(32) NULL COMMENT '后续路径',
  `strategy_run_order_id` CHAR(36) NULL COMMENT '来源策略运行订单明细ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  UNIQUE INDEX `wave_order_wave_id_order_id_key`(`wave_id`, `order_id`),
  INDEX `wave_order_tenant_id_idx`(`tenant_id`),
  INDEX `wave_order_order_id_idx`(`order_id`),
  INDEX `wave_order_wave_type_code_idx`(`wave_type_code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='波次订单关系表';

CREATE TABLE `outbound_order_wave_context` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `order_id` CHAR(36) NOT NULL COMMENT '订单ID',
  `strategy_run_id` CHAR(36) NULL COMMENT '来源策略运行ID',
  `wave_batch_no` INT NULL COMMENT '策略执行批次号',
  `pick_mode` VARCHAR(32) NULL COMMENT '拣货模式',
  `release_mode` VARCHAR(32) NULL COMMENT '释放模式：IMMEDIATE/MANUAL',
  `release_status` VARCHAR(32) NULL COMMENT '释放状态：PENDING_RELEASE/RELEASED',
  `matched_rule_snapshot` JSON NULL COMMENT '命中规则快照',
  `classification_snapshot` JSON NULL COMMENT '归类结果快照',
  `last_wave_evaluated_at` DATETIME(3) NULL COMMENT '最后一次参与组波评估时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
  UNIQUE INDEX `outbound_order_wave_context_order_id_key`(`order_id`),
  INDEX `outbound_order_wave_context_tenant_id_idx`(`tenant_id`),
  INDEX `outbound_order_wave_context_strategy_run_id_idx`(`strategy_run_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='出库订单波次上下文表';

-- ==================== 扩展现有业务表 ====================

ALTER TABLE `outbound_order`
  ADD COLUMN `wave_strategy_id` CHAR(36) NULL COMMENT '命中的波次策略ID',
  ADD COLUMN `wave_strategy_version_id` CHAR(36) NULL COMMENT '命中的波次策略版本ID',
  ADD COLUMN `wave_type_code` VARCHAR(64) NULL COMMENT '波次类型编码',
  ADD COLUMN `downstream_mode` VARCHAR(32) NULL COMMENT '后续路径：PACK_DIRECT/SORT_THEN_PACK';

CREATE INDEX `outbound_order_wave_strategy_id_idx` ON `outbound_order`(`wave_strategy_id`);
CREATE INDEX `outbound_order_wave_strategy_version_id_idx` ON `outbound_order`(`wave_strategy_version_id`);
CREATE INDEX `outbound_order_wave_type_code_idx` ON `outbound_order`(`wave_type_code`);
CREATE INDEX `outbound_order_downstream_mode_idx` ON `outbound_order`(`downstream_mode`);

ALTER TABLE `wave`
  ADD COLUMN `source_type` VARCHAR(32) NOT NULL DEFAULT 'MANUAL' COMMENT '来源类型：MANUAL/STRATEGY',
  ADD COLUMN `strategy_id` CHAR(36) NULL COMMENT '来源策略ID',
  ADD COLUMN `strategy_version_id` CHAR(36) NULL COMMENT '来源策略版本ID',
  ADD COLUMN `strategy_run_id` CHAR(36) NULL COMMENT '来源策略运行ID',
  ADD COLUMN `wave_type_code` VARCHAR(64) NULL COMMENT '波次类型编码',
  ADD COLUMN `pick_mode` VARCHAR(32) NULL COMMENT '拣货模式',
  ADD COLUMN `downstream_mode` VARCHAR(32) NULL COMMENT '后续路径：PACK_DIRECT/SORT_THEN_PACK',
  ADD COLUMN `release_mode` VARCHAR(32) NULL DEFAULT 'MANUAL' COMMENT '释放模式：IMMEDIATE/MANUAL',
  ADD COLUMN `release_status` VARCHAR(32) NULL DEFAULT 'PENDING_RELEASE' COMMENT '释放状态：PENDING_RELEASE/RELEASED',
  ADD COLUMN `batch_no` INT NULL COMMENT '策略执行批次号',
  ADD COLUMN `config_snapshot` JSON NULL COMMENT '执行快照';

CREATE INDEX `wave_source_type_idx` ON `wave`(`source_type`);
CREATE INDEX `wave_strategy_id_idx` ON `wave`(`strategy_id`);
CREATE INDEX `wave_strategy_version_id_idx` ON `wave`(`strategy_version_id`);
CREATE INDEX `wave_strategy_run_id_idx` ON `wave`(`strategy_run_id`);
CREATE INDEX `wave_wave_type_code_idx` ON `wave`(`wave_type_code`);
CREATE INDEX `wave_release_status_idx` ON `wave`(`release_status`);

ALTER TABLE `pick_order`
  ADD COLUMN `strategy_run_id` CHAR(36) NULL COMMENT '来源策略运行ID',
  ADD COLUMN `wave_type_code` VARCHAR(64) NULL COMMENT '波次类型编码',
  ADD COLUMN `downstream_mode` VARCHAR(32) NULL COMMENT '后续路径：PACK_DIRECT/SORT_THEN_PACK';

CREATE INDEX `pick_order_strategy_run_id_idx` ON `pick_order`(`strategy_run_id`);
CREATE INDEX `pick_order_wave_type_code_idx` ON `pick_order`(`wave_type_code`);
CREATE INDEX `pick_order_downstream_mode_idx` ON `pick_order`(`downstream_mode`);

ALTER TABLE `sorting_task`
  ADD COLUMN `wave_id` CHAR(36) NULL COMMENT '关联波次ID',
  ADD COLUMN `strategy_run_id` CHAR(36) NULL COMMENT '来源策略运行ID';

CREATE INDEX `sorting_task_wave_id_idx` ON `sorting_task`(`wave_id`);
CREATE INDEX `sorting_task_strategy_run_id_idx` ON `sorting_task`(`strategy_run_id`);

-- ==================== 外键约束 ====================

ALTER TABLE `wave_strategy`
  ADD CONSTRAINT `wave_strategy_tenant_id_fkey`
  FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `wave_strategy_warehouse_id_fkey`
  FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `wave_strategy_current_version_id_fkey`
  FOREIGN KEY (`current_version_id`) REFERENCES `wave_strategy_version`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `wave_strategy_version`
  ADD CONSTRAINT `wave_strategy_version_strategy_id_fkey`
  FOREIGN KEY (`strategy_id`) REFERENCES `wave_strategy`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `wave_strategy_rule_set`
  ADD CONSTRAINT `wave_strategy_rule_set_strategy_version_id_fkey`
  FOREIGN KEY (`strategy_version_id`) REFERENCES `wave_strategy_version`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `wave_strategy_run`
  ADD CONSTRAINT `wave_strategy_run_strategy_id_fkey`
  FOREIGN KEY (`strategy_id`) REFERENCES `wave_strategy`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `wave_strategy_run_strategy_version_id_fkey`
  FOREIGN KEY (`strategy_version_id`) REFERENCES `wave_strategy_version`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `wave_strategy_run_order`
  ADD CONSTRAINT `wave_strategy_run_order_run_id_fkey`
  FOREIGN KEY (`run_id`) REFERENCES `wave_strategy_run`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `wave_strategy_run_order_order_id_fkey`
  FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `wave_order`
  ADD CONSTRAINT `wave_order_wave_id_fkey`
  FOREIGN KEY (`wave_id`) REFERENCES `wave`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `wave_order_order_id_fkey`
  FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `outbound_order_wave_context`
  ADD CONSTRAINT `outbound_order_wave_context_order_id_fkey`
  FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
