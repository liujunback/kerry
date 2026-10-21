ALTER TABLE `inventory_count_detail`
  DROP INDEX `inventory_count_detail_batch_fact_unique`;

ALTER TABLE `inventory_count_detail`
  DROP COLUMN `batch_id`,
  DROP COLUMN `first_count_quantity`,
  DROP COLUMN `first_counted_at`,
  DROP COLUMN `first_counter_user_id`,
  DROP COLUMN `first_counter_user_name`,
  DROP COLUMN `recount_quantity`,
  DROP COLUMN `recounted_at`,
  DROP COLUMN `recount_user_id`,
  DROP COLUMN `recount_user_name`,
  DROP COLUMN `is_empty_location`,
  DROP COLUMN `exception_reason_code`,
  DROP COLUMN `exception_remark`,
  DROP COLUMN `last_record_id`,
  DROP COLUMN `source_bucket_id`,
  DROP COLUMN `asn_number`;

CREATE UNIQUE INDEX `inventory_count_detail_fact_unique`
  ON `inventory_count_detail`(
    `order_id`,
    `client_id`,
    `location_id`,
    `sku_id`,
    `batch_number`,
    `lpn`,
    `bucket_type`,
    `expiry_date`
  );

CREATE TABLE `inventory_count_round_line` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) NOT NULL,
  `detail_id` CHAR(36) NOT NULL,
  `batch_id` CHAR(36) NOT NULL,
  `round_type` VARCHAR(32) NOT NULL,
  `round_no` INTEGER NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `book_quantity_snapshot` INTEGER NOT NULL DEFAULT 0,
  `counted_quantity` INTEGER NULL,
  `diff_quantity` INTEGER NULL,
  `is_empty_location` BOOLEAN NOT NULL DEFAULT false,
  `exception_reason_code` VARCHAR(64) NULL,
  `exception_remark` VARCHAR(500) NULL,
  `counter_user_id` CHAR(36) NULL,
  `counter_user_name` VARCHAR(128) NULL,
  `counted_at` DATETIME(3) NULL,
  `last_record_id` CHAR(36) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ic_round_line_batch_detail_key`(`batch_id`, `detail_id`),
  INDEX `ic_round_line_order_detail_round_idx`(`order_id`, `detail_id`, `round_type`, `round_no`),
  INDEX `ic_round_line_batch_status_idx`(`batch_id`, `status`),
  INDEX `ic_round_line_detail_idx`(`detail_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `inventory_count_round_line`
  ADD CONSTRAINT `ic_round_line_detail_fkey`
  FOREIGN KEY (`detail_id`) REFERENCES `inventory_count_detail`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `inventory_count_record`
  ADD COLUMN `round_line_id` CHAR(36) NULL,
  ADD INDEX `ic_record_round_line_submitted_idx`(`round_line_id`, `submitted_at`);
