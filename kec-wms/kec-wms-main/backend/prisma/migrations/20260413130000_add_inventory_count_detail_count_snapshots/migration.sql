ALTER TABLE `inventory_count_detail`
  ADD COLUMN `first_count_quantity` INT NULL COMMENT '初盘数量',
  ADD COLUMN `first_counted_at` DATETIME(3) NULL COMMENT '初盘时间',
  ADD COLUMN `first_counter_user_id` CHAR(36) NULL COMMENT '初盘人ID',
  ADD COLUMN `first_counter_user_name` VARCHAR(128) NULL COMMENT '初盘人姓名',
  ADD COLUMN `recount_quantity` INT NULL COMMENT '复盘数量',
  ADD COLUMN `recounted_at` DATETIME(3) NULL COMMENT '复盘时间',
  ADD COLUMN `recount_user_id` CHAR(36) NULL COMMENT '复盘人ID',
  ADD COLUMN `recount_user_name` VARCHAR(128) NULL COMMENT '复盘人姓名';
