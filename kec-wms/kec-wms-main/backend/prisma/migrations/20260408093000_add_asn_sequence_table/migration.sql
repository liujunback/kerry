-- CreateTable
CREATE TABLE `asn_sequence` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `warehouse_code` VARCHAR(32) NOT NULL,
  `date_key` VARCHAR(8) NOT NULL,
  `current_value` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `uq_asn_sequence_scope`(`tenant_id`, `warehouse_code`, `date_key`),
  INDEX `asn_sequence_tenant_id_idx`(`tenant_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `asn_sequence` ADD CONSTRAINT `asn_sequence_tenant_id_fkey`
FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
