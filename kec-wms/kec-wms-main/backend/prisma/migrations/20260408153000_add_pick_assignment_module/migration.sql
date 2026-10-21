-- ==================== 拣货分配规则与拣货员档案 ====================

CREATE TABLE `pick_assignment_rule` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
  `rule_code` VARCHAR(64) NOT NULL COMMENT '规则编码',
  `rule_name` VARCHAR(128) NOT NULL COMMENT '规则名称',
  `description` TEXT NULL COMMENT '规则描述',
  `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT' COMMENT '状态：DRAFT/ENABLED/DISABLED',
  `is_default` BOOLEAN NOT NULL DEFAULT false COMMENT '是否默认规则',
  `config_json` JSON NOT NULL COMMENT '规则配置JSON',
  `last_assigned_picker_profile_id` CHAR(36) NULL COMMENT '上次分配到的拣货员档案ID',
  `last_assigned_at` DATETIME(3) NULL COMMENT '上次分配时间',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
  `created_by` CHAR(36) NULL COMMENT '创建人ID',
  `updated_by` CHAR(36) NULL COMMENT '更新人ID',
  UNIQUE INDEX `pick_assignment_rule_tenant_id_rule_code_key`(`tenant_id`, `rule_code`),
  INDEX `pick_assignment_rule_tenant_id_idx`(`tenant_id`),
  INDEX `pick_assignment_rule_warehouse_id_idx`(`warehouse_id`),
  INDEX `pick_assignment_rule_last_assigned_picker_profile_id_idx`(`last_assigned_picker_profile_id`),
  INDEX `pick_assignment_rule_tenant_id_warehouse_id_status_idx`(`tenant_id`, `warehouse_id`, `status`),
  INDEX `pick_assignment_rule_tenant_id_warehouse_id_is_default_idx`(`tenant_id`, `warehouse_id`, `is_default`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='拣货分配规则表';

CREATE TABLE `picker_profile` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
  `user_id` CHAR(36) NOT NULL COMMENT '用户ID',
  `max_active_tasks` INT NOT NULL DEFAULT 3 COMMENT '最大活跃任务数',
  `sequence_no` INT NOT NULL DEFAULT 1 COMMENT '轮询顺序号',
  `is_enabled` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
  `allow_pda_execution` BOOLEAN NOT NULL DEFAULT true COMMENT '是否允许PDA执行',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
  `created_by` CHAR(36) NULL COMMENT '创建人ID',
  `updated_by` CHAR(36) NULL COMMENT '更新人ID',
  UNIQUE INDEX `picker_profile_tenant_id_warehouse_id_user_id_key`(`tenant_id`, `warehouse_id`, `user_id`),
  INDEX `picker_profile_tenant_id_idx`(`tenant_id`),
  INDEX `picker_profile_warehouse_id_idx`(`warehouse_id`),
  INDEX `picker_profile_user_id_idx`(`user_id`),
  INDEX `picker_profile_tenant_id_warehouse_id_is_enabled_idx`(`tenant_id`, `warehouse_id`, `is_enabled`),
  INDEX `picker_profile_tenant_id_warehouse_id_sequence_no_idx`(`tenant_id`, `warehouse_id`, `sequence_no`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='拣货员档案表';

CREATE TABLE `picker_profile_zone` (
  `id` CHAR(36) NOT NULL COMMENT '主键ID',
  `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
  `picker_profile_id` CHAR(36) NOT NULL COMMENT '拣货员档案ID',
  `zone_id` CHAR(36) NOT NULL COMMENT '库区ID',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  UNIQUE INDEX `picker_profile_zone_picker_profile_id_zone_id_key`(`picker_profile_id`, `zone_id`),
  INDEX `picker_profile_zone_tenant_id_idx`(`tenant_id`),
  INDEX `picker_profile_zone_picker_profile_id_idx`(`picker_profile_id`),
  INDEX `picker_profile_zone_zone_id_idx`(`zone_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='拣货员负责区域表';

-- ==================== 扩展拣货单 ====================

ALTER TABLE `pick_order`
  ADD COLUMN `assignment_source` VARCHAR(32) NULL COMMENT '分配来源：MANUAL/AUTO_RULE',
  ADD COLUMN `assignment_strategy_type` VARCHAR(32) NULL COMMENT '分配策略类型：ROUND_ROBIN/LEAST_ACTIVE_TASKS/ZONE_FIRST';

CREATE INDEX `pick_order_assignment_source_idx` ON `pick_order`(`assignment_source`);
CREATE INDEX `pick_order_assignment_strategy_type_idx` ON `pick_order`(`assignment_strategy_type`);

-- ==================== 外键约束 ====================

ALTER TABLE `pick_assignment_rule`
  ADD CONSTRAINT `pick_assignment_rule_tenant_id_fkey`
  FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `pick_assignment_rule_warehouse_id_fkey`
  FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `pick_assignment_rule_last_assigned_picker_profile_id_fkey`
  FOREIGN KEY (`last_assigned_picker_profile_id`) REFERENCES `picker_profile`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `picker_profile`
  ADD CONSTRAINT `picker_profile_tenant_id_fkey`
  FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `picker_profile_warehouse_id_fkey`
  FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `picker_profile_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `picker_profile_zone`
  ADD CONSTRAINT `picker_profile_zone_tenant_id_fkey`
  FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `picker_profile_zone_picker_profile_id_fkey`
  FOREIGN KEY (`picker_profile_id`) REFERENCES `picker_profile`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `picker_profile_zone_zone_id_fkey`
  FOREIGN KEY (`zone_id`) REFERENCES `zone`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;