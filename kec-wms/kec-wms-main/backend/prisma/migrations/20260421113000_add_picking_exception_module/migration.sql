CREATE TABLE `picking_exception_case` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `warehouse_id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) NOT NULL,
  `order_number` VARCHAR(64) NOT NULL,
  `pick_order_id` CHAR(36) NOT NULL,
  `pick_order_number` VARCHAR(64) NOT NULL,
  `exception_type` VARCHAR(32) NOT NULL DEFAULT 'PICK_SHORTAGE',
  `exception_stage` VARCHAR(32) NOT NULL DEFAULT 'PICKING',
  `status` VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  `shortage_qty` INTEGER NOT NULL DEFAULT 0,
  `supplemented_qty` INTEGER NOT NULL DEFAULT 0,
  `remaining_shortage_qty` INTEGER NOT NULL DEFAULT 0,
  `supplement_status` VARCHAR(32) NOT NULL DEFAULT 'NOT_GENERATED',
  `print_status` VARCHAR(32) NOT NULL DEFAULT 'NOT_PRINTED',
  `remark` TEXT NULL,
  `detected_by` CHAR(36) NULL,
  `detected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `resolved_by` CHAR(36) NULL,
  `resolved_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `picking_exception_case_tenant_id_status_idx` ON `picking_exception_case` (`tenant_id`, `status`);
CREATE INDEX `picking_exception_case_tenant_id_warehouse_id_idx` ON `picking_exception_case` (`tenant_id`, `warehouse_id`);
CREATE INDEX `picking_exception_case_tenant_id_order_id_idx` ON `picking_exception_case` (`tenant_id`, `order_id`);
CREATE INDEX `picking_exception_case_tenant_id_pick_order_id_idx` ON `picking_exception_case` (`tenant_id`, `pick_order_id`);
CREATE INDEX `picking_exception_case_tenant_id_exception_type_idx` ON `picking_exception_case` (`tenant_id`, `exception_type`);

CREATE TABLE `picking_exception_line` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `case_id` CHAR(36) NOT NULL,
  `pick_order_id` CHAR(36) NOT NULL,
  `pick_order_line_id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) NOT NULL,
  `order_line_id` CHAR(36) NOT NULL,
  `sku_id` CHAR(36) NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL,
  `sku_name` VARCHAR(256) NULL,
  `location_id` CHAR(36) NOT NULL,
  `location_code` VARCHAR(64) NOT NULL,
  `source_bucket_id` CHAR(36) NULL,
  `batch_number` VARCHAR(64) NULL,
  `lpn` VARCHAR(64) NULL,
  `asn_number` VARCHAR(64) NULL,
  `expected_qty` INTEGER NOT NULL DEFAULT 0,
  `actual_picked_qty` INTEGER NOT NULL DEFAULT 0,
  `shortage_qty` INTEGER NOT NULL DEFAULT 0,
  `supplemented_qty` INTEGER NOT NULL DEFAULT 0,
  `remaining_shortage_qty` INTEGER NOT NULL DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `picking_exception_line_tenant_id_pick_order_line_id_key` ON `picking_exception_line` (`tenant_id`, `pick_order_line_id`);
CREATE INDEX `picking_exception_line_tenant_id_case_id_idx` ON `picking_exception_line` (`tenant_id`, `case_id`);
CREATE INDEX `picking_exception_line_tenant_id_order_id_idx` ON `picking_exception_line` (`tenant_id`, `order_id`);
CREATE INDEX `picking_exception_line_tenant_id_order_line_id_idx` ON `picking_exception_line` (`tenant_id`, `order_line_id`);
CREATE INDEX `picking_exception_line_tenant_id_sku_id_idx` ON `picking_exception_line` (`tenant_id`, `sku_id`);
CREATE INDEX `picking_exception_line_tenant_id_status_idx` ON `picking_exception_line` (`tenant_id`, `status`);

CREATE TABLE `supplement_pick_order` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `warehouse_id` CHAR(36) NOT NULL,
  `supplement_pick_no` VARCHAR(64) NOT NULL,
  `case_id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) NOT NULL,
  `order_number` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `allocation_method` VARCHAR(32) NOT NULL DEFAULT 'AUTO',
  `total_supplement_qty` INTEGER NOT NULL DEFAULT 0,
  `print_status` VARCHAR(32) NOT NULL DEFAULT 'NOT_PRINTED',
  `print_count` INTEGER NOT NULL DEFAULT 0,
  `printed_at` DATETIME(3) NULL,
  `completion_method` VARCHAR(32) NULL,
  `manual_completed_by` CHAR(36) NULL,
  `manual_completed_at` DATETIME(3) NULL,
  `manual_complete_remark` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `supplement_pick_order_tenant_id_supplement_pick_no_key` ON `supplement_pick_order` (`tenant_id`, `supplement_pick_no`);
CREATE INDEX `supplement_pick_order_tenant_id_case_id_idx` ON `supplement_pick_order` (`tenant_id`, `case_id`);
CREATE INDEX `supplement_pick_order_tenant_id_order_id_idx` ON `supplement_pick_order` (`tenant_id`, `order_id`);
CREATE INDEX `supplement_pick_order_tenant_id_status_idx` ON `supplement_pick_order` (`tenant_id`, `status`);
CREATE INDEX `supplement_pick_order_tenant_id_print_status_idx` ON `supplement_pick_order` (`tenant_id`, `print_status`);

CREATE TABLE `supplement_pick_order_line` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `supplement_pick_order_id` CHAR(36) NOT NULL,
  `case_line_id` CHAR(36) NOT NULL,
  `order_line_id` CHAR(36) NOT NULL,
  `sku_id` CHAR(36) NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL,
  `source_location_id` CHAR(36) NOT NULL,
  `source_location_code` VARCHAR(64) NOT NULL,
  `source_bucket_id` CHAR(36) NOT NULL,
  `batch_number` VARCHAR(64) NULL,
  `lpn` VARCHAR(64) NULL,
  `asn_number` VARCHAR(64) NULL,
  `supplement_qty` INTEGER NOT NULL DEFAULT 0,
  `picked_qty` INTEGER NOT NULL DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `spo_line_tenant_order_idx` ON `supplement_pick_order_line` (`tenant_id`, `supplement_pick_order_id`);
CREATE INDEX `spo_line_tenant_case_line_idx` ON `supplement_pick_order_line` (`tenant_id`, `case_line_id`);
CREATE INDEX `spo_line_tenant_order_line_idx` ON `supplement_pick_order_line` (`tenant_id`, `order_line_id`);
CREATE INDEX `spo_line_tenant_sku_idx` ON `supplement_pick_order_line` (`tenant_id`, `sku_id`);
