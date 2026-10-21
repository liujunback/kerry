-- CreateTable
CREATE TABLE `pick_order_sequence` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `warehouse_code` VARCHAR(32) NOT NULL,
  `date_key` VARCHAR(8) NOT NULL,
  `current_value` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `uq_pick_order_sequence_scope`(`tenant_id`, `warehouse_code`, `date_key`),
  INDEX `pick_order_sequence_tenant_id_idx`(`tenant_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill current sequence values from existing pick orders to avoid reusing old task numbers.
INSERT INTO `pick_order_sequence` (
  `id`,
  `tenant_id`,
  `warehouse_code`,
  `date_key`,
  `current_value`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  `p`.`tenant_id`,
  `w`.`warehouse_code`,
  CONCAT('20', SUBSTRING(`p`.`task_number`, CHAR_LENGTH(CONCAT('PK-', `w`.`warehouse_code`, '-')) + 1, 6)) AS `date_key`,
  MAX(CAST(RIGHT(`p`.`task_number`, 4) AS UNSIGNED)) AS `current_value`,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
FROM `pick_order` `p`
JOIN `warehouse` `w` ON `w`.`id` = `p`.`warehouse_id`
WHERE LEFT(`p`.`task_number`, CHAR_LENGTH(CONCAT('PK-', `w`.`warehouse_code`, '-'))) = CONCAT('PK-', `w`.`warehouse_code`, '-')
  AND SUBSTRING(`p`.`task_number`, CHAR_LENGTH(CONCAT('PK-', `w`.`warehouse_code`, '-')) + 1, 6) REGEXP '^[0-9]{6}$'
  AND SUBSTRING(`p`.`task_number`, CHAR_LENGTH(CONCAT('PK-', `w`.`warehouse_code`, '-')) + 7, 1) = '-'
  AND RIGHT(`p`.`task_number`, 4) REGEXP '^[0-9]{4}$'
GROUP BY
  `p`.`tenant_id`,
  `w`.`warehouse_code`,
  CONCAT('20', SUBSTRING(`p`.`task_number`, CHAR_LENGTH(CONCAT('PK-', `w`.`warehouse_code`, '-')) + 1, 6))
ON DUPLICATE KEY UPDATE
  `current_value` = GREATEST(`current_value`, VALUES(`current_value`)),
  `updated_at` = CURRENT_TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE `pick_order_sequence` ADD CONSTRAINT `pick_order_sequence_tenant_id_fkey`
FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
