CREATE TABLE `return_order` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `client_id` CHAR(36) NOT NULL,
  `warehouse_id` CHAR(36) NOT NULL,
  `return_no` VARCHAR(32) NOT NULL,
  `return_type` VARCHAR(32) NOT NULL,
  `pre_return_no` VARCHAR(64) NULL,
  `logistics_no` VARCHAR(64) NOT NULL,
  `outbound_order_id` CHAR(36) NULL,
  `outbound_order_no` VARCHAR(32) NULL,
  `platform_order_no` VARCHAR(64) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING_SIGN',
  `sign_time` DATETIME(3) NULL,
  `count_complete_time` DATETIME(3) NULL,
  `strategy_received_time` DATETIME(3) NULL,
  `complete_time` DATETIME(3) NULL,
  `total_expected_qty` INTEGER NOT NULL DEFAULT 0,
  `total_counted_qty` INTEGER NOT NULL DEFAULT 0,
  `total_putaway_qty` INTEGER NOT NULL DEFAULT 0,
  `total_line_count` INTEGER NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `created_by` CHAR(36) NULL,
  `signed_by` CHAR(36) NULL,
  INDEX `return_order_tenant_id_idx`(`tenant_id`),
  INDEX `return_order_client_id_idx`(`client_id`),
  INDEX `return_order_warehouse_id_idx`(`warehouse_id`),
  INDEX `return_order_outbound_order_id_idx`(`outbound_order_id`),
  INDEX `return_order_return_type_idx`(`return_type`),
  INDEX `return_order_status_idx`(`status`),
  INDEX `return_order_pre_return_no_idx`(`pre_return_no`),
  INDEX `return_order_logistics_no_idx`(`logistics_no`),
  UNIQUE INDEX `return_order_tenant_id_return_no_key`(`tenant_id`, `return_no`),
  UNIQUE INDEX `return_order_tenant_id_warehouse_id_logistics_no_key`(`tenant_id`, `warehouse_id`, `logistics_no`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `return_order_line` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `return_order_id` CHAR(36) NOT NULL,
  `line_number` INTEGER NOT NULL,
  `return_line_no` VARCHAR(40) NOT NULL,
  `sku_id` CHAR(36) NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL,
  `sku_name` VARCHAR(256) NULL,
  `barcode` VARCHAR(64) NULL,
  `expected_qty` INTEGER NOT NULL DEFAULT 0,
  `counted_qty` INTEGER NOT NULL DEFAULT 0,
  `putaway_qty` INTEGER NOT NULL DEFAULT 0,
  `quality` VARCHAR(20) NULL,
  `batch_number` VARCHAR(64) NULL,
  `expiry_date` DATE NULL,
  `container_id` CHAR(36) NULL,
  `container_code` VARCHAR(32) NULL,
  `temp_location_id` CHAR(36) NULL,
  `temp_location_code` VARCHAR(32) NULL,
  `photo_urls` JSON NULL,
  `disposition_action` VARCHAR(32) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING_SIGN',
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `created_by` CHAR(36) NULL,
  INDEX `return_order_line_tenant_id_idx`(`tenant_id`),
  INDEX `return_order_line_return_order_id_idx`(`return_order_id`),
  INDEX `return_order_line_sku_id_idx`(`sku_id`),
  INDEX `return_order_line_container_id_idx`(`container_id`),
  INDEX `return_order_line_temp_location_id_idx`(`temp_location_id`),
  INDEX `return_order_line_status_idx`(`status`),
  INDEX `return_order_line_sku_code_idx`(`sku_code`),
  UNIQUE INDEX `return_order_line_return_order_id_line_number_key`(`return_order_id`, `line_number`),
  UNIQUE INDEX `return_order_line_tenant_id_return_line_no_key`(`tenant_id`, `return_line_no`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `return_line_disposition` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `return_order_id` CHAR(36) NOT NULL,
  `return_line_id` CHAR(36) NOT NULL,
  `action` VARCHAR(32) NOT NULL,
  `quality` VARCHAR(20) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 0,
  `putaway_qty` INTEGER NOT NULL DEFAULT 0,
  `remaining_qty` INTEGER NOT NULL DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'DISPOSITION_RECEIVED',
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `created_by` CHAR(36) NULL,
  INDEX `return_line_disposition_tenant_id_idx`(`tenant_id`),
  INDEX `return_line_disposition_return_order_id_idx`(`return_order_id`),
  INDEX `return_line_disposition_return_line_id_idx`(`return_line_id`),
  INDEX `return_line_disposition_action_idx`(`action`),
  INDEX `return_line_disposition_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `return_putaway_order` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `putaway_order_number` VARCHAR(32) NOT NULL,
  `warehouse_id` CHAR(36) NOT NULL,
  `client_id` CHAR(36) NOT NULL,
  `return_order_id` CHAR(36) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `total_qty` INTEGER NOT NULL DEFAULT 0,
  `putaway_qty` INTEGER NOT NULL DEFAULT 0,
  `pending_qty` INTEGER NOT NULL DEFAULT 0,
  `line_count` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `created_by` CHAR(36) NULL,
  INDEX `return_putaway_order_tenant_id_idx`(`tenant_id`),
  INDEX `return_putaway_order_warehouse_id_idx`(`warehouse_id`),
  INDEX `return_putaway_order_client_id_idx`(`client_id`),
  INDEX `return_putaway_order_return_order_id_idx`(`return_order_id`),
  INDEX `return_putaway_order_status_idx`(`status`),
  UNIQUE INDEX `return_putaway_order_tenant_id_putaway_order_number_key`(`tenant_id`, `putaway_order_number`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `return_putaway_line` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `putaway_order_id` CHAR(36) NOT NULL,
  `return_order_id` CHAR(36) NOT NULL,
  `return_line_id` CHAR(36) NOT NULL,
  `disposition_id` CHAR(36) NOT NULL,
  `line_number` INTEGER NOT NULL,
  `sku_id` CHAR(36) NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL,
  `sku_name` VARCHAR(256) NULL,
  `barcode` VARCHAR(64) NULL,
  `quality` VARCHAR(20) NOT NULL,
  `action` VARCHAR(32) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 0,
  `putaway_qty` INTEGER NOT NULL DEFAULT 0,
  `remaining_qty` INTEGER NOT NULL DEFAULT 0,
  `batch_number` VARCHAR(64) NULL,
  `expiry_date` DATE NULL,
  `container_id` CHAR(36) NULL,
  `container_code` VARCHAR(32) NULL,
  `source_location_code` VARCHAR(32) NULL,
  `target_location_id` CHAR(36) NULL,
  `target_location_code` VARCHAR(32) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `return_putaway_line_tenant_id_idx`(`tenant_id`),
  INDEX `return_putaway_line_putaway_order_id_idx`(`putaway_order_id`),
  INDEX `return_putaway_line_return_order_id_idx`(`return_order_id`),
  INDEX `return_putaway_line_return_line_id_idx`(`return_line_id`),
  INDEX `return_putaway_line_disposition_id_idx`(`disposition_id`),
  INDEX `return_putaway_line_sku_id_idx`(`sku_id`),
  INDEX `return_putaway_line_container_id_idx`(`container_id`),
  INDEX `return_putaway_line_target_location_id_idx`(`target_location_id`),
  INDEX `return_putaway_line_status_idx`(`status`),
  UNIQUE INDEX `return_putaway_line_putaway_order_id_line_number_key`(`putaway_order_id`, `line_number`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `return_putaway_detail` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `detail_number` VARCHAR(32) NOT NULL,
  `putaway_order_id` CHAR(36) NOT NULL,
  `putaway_line_id` CHAR(36) NOT NULL,
  `return_order_id` CHAR(36) NOT NULL,
  `return_line_id` CHAR(36) NOT NULL,
  `return_no` VARCHAR(32) NOT NULL,
  `sku_id` CHAR(36) NOT NULL,
  `sku_code` VARCHAR(64) NOT NULL,
  `quality` VARCHAR(20) NOT NULL,
  `action` VARCHAR(32) NOT NULL,
  `quantity` INTEGER NOT NULL DEFAULT 0,
  `location_id` CHAR(36) NOT NULL,
  `location_code` VARCHAR(32) NOT NULL,
  `container_id` CHAR(36) NULL,
  `container_code` VARCHAR(32) NULL,
  `inventory_event_id` CHAR(36) NULL,
  `putaway_at` DATETIME(3) NOT NULL,
  `putaway_by` CHAR(36) NOT NULL,
  `device_type` VARCHAR(20) NOT NULL DEFAULT 'WEB',
  INDEX `return_putaway_detail_tenant_id_idx`(`tenant_id`),
  INDEX `return_putaway_detail_putaway_order_id_idx`(`putaway_order_id`),
  INDEX `return_putaway_detail_putaway_line_id_idx`(`putaway_line_id`),
  INDEX `return_putaway_detail_return_order_id_idx`(`return_order_id`),
  INDEX `return_putaway_detail_return_line_id_idx`(`return_line_id`),
  INDEX `return_putaway_detail_location_id_idx`(`location_id`),
  INDEX `return_putaway_detail_container_id_idx`(`container_id`),
  UNIQUE INDEX `return_putaway_detail_tenant_id_detail_number_key`(`tenant_id`, `detail_number`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `return_order` ADD CONSTRAINT `return_order_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_order` ADD CONSTRAINT `return_order_outbound_order_id_fkey` FOREIGN KEY (`outbound_order_id`) REFERENCES `outbound_order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `return_order` ADD CONSTRAINT `return_order_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_order` ADD CONSTRAINT `return_order_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `return_order_line` ADD CONSTRAINT `return_order_line_container_id_fkey` FOREIGN KEY (`container_id`) REFERENCES `container`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `return_order_line` ADD CONSTRAINT `return_order_line_return_order_id_fkey` FOREIGN KEY (`return_order_id`) REFERENCES `return_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `return_order_line` ADD CONSTRAINT `return_order_line_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_order_line` ADD CONSTRAINT `return_order_line_temp_location_id_fkey` FOREIGN KEY (`temp_location_id`) REFERENCES `bin_location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `return_order_line` ADD CONSTRAINT `return_order_line_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `return_line_disposition` ADD CONSTRAINT `return_line_disposition_return_line_id_fkey` FOREIGN KEY (`return_line_id`) REFERENCES `return_order_line`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `return_line_disposition` ADD CONSTRAINT `return_line_disposition_return_order_id_fkey` FOREIGN KEY (`return_order_id`) REFERENCES `return_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `return_line_disposition` ADD CONSTRAINT `return_line_disposition_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `return_putaway_order` ADD CONSTRAINT `return_putaway_order_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `client`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_putaway_order` ADD CONSTRAINT `return_putaway_order_return_order_id_fkey` FOREIGN KEY (`return_order_id`) REFERENCES `return_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `return_putaway_order` ADD CONSTRAINT `return_putaway_order_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_putaway_order` ADD CONSTRAINT `return_putaway_order_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `return_putaway_line` ADD CONSTRAINT `return_putaway_line_container_id_fkey` FOREIGN KEY (`container_id`) REFERENCES `container`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `return_putaway_line` ADD CONSTRAINT `return_putaway_line_disposition_id_fkey` FOREIGN KEY (`disposition_id`) REFERENCES `return_line_disposition`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_putaway_line` ADD CONSTRAINT `return_putaway_line_putaway_order_id_fkey` FOREIGN KEY (`putaway_order_id`) REFERENCES `return_putaway_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `return_putaway_line` ADD CONSTRAINT `return_putaway_line_return_line_id_fkey` FOREIGN KEY (`return_line_id`) REFERENCES `return_order_line`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_putaway_line` ADD CONSTRAINT `return_putaway_line_return_order_id_fkey` FOREIGN KEY (`return_order_id`) REFERENCES `return_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `return_putaway_line` ADD CONSTRAINT `return_putaway_line_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_putaway_line` ADD CONSTRAINT `return_putaway_line_target_location_id_fkey` FOREIGN KEY (`target_location_id`) REFERENCES `bin_location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `return_putaway_line` ADD CONSTRAINT `return_putaway_line_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `return_putaway_detail` ADD CONSTRAINT `return_putaway_detail_container_id_fkey` FOREIGN KEY (`container_id`) REFERENCES `container`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `return_putaway_detail` ADD CONSTRAINT `return_putaway_detail_location_id_fkey` FOREIGN KEY (`location_id`) REFERENCES `bin_location`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_putaway_detail` ADD CONSTRAINT `return_putaway_detail_putaway_line_id_fkey` FOREIGN KEY (`putaway_line_id`) REFERENCES `return_putaway_line`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_putaway_detail` ADD CONSTRAINT `return_putaway_detail_putaway_order_id_fkey` FOREIGN KEY (`putaway_order_id`) REFERENCES `return_putaway_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `return_putaway_detail` ADD CONSTRAINT `return_putaway_detail_return_line_id_fkey` FOREIGN KEY (`return_line_id`) REFERENCES `return_order_line`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_putaway_detail` ADD CONSTRAINT `return_putaway_detail_return_order_id_fkey` FOREIGN KEY (`return_order_id`) REFERENCES `return_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `return_putaway_detail` ADD CONSTRAINT `return_putaway_detail_sku_id_fkey` FOREIGN KEY (`sku_id`) REFERENCES `sku`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `return_putaway_detail` ADD CONSTRAINT `return_putaway_detail_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
