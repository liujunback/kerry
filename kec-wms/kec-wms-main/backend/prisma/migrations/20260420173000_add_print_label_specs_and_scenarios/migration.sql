CREATE TABLE `print_label_spec` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `width_mm` DECIMAL(8, 2) NOT NULL,
  `height_mm` DECIMAL(8, 2) NOT NULL,
  `orientation` VARCHAR(16) NOT NULL DEFAULT 'portrait',
  `is_system` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by` CHAR(36) NULL,
  `updated_by` CHAR(36) NULL,
  UNIQUE INDEX `print_label_spec_tenant_code_key`(`tenant_id`, `code`),
  INDEX `print_label_spec_tenant_id_idx`(`tenant_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `print_label_spec` (`id`, `tenant_id`, `code`, `name`, `width_mm`, `height_mm`, `orientation`, `is_system`, `is_active`, `created_at`, `updated_at`)
SELECT UUID(), `id`, 'LABEL_60X40', '标签 60 × 40 mm', 60, 40, 'landscape', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `tenant`;

INSERT INTO `print_label_spec` (`id`, `tenant_id`, `code`, `name`, `width_mm`, `height_mm`, `orientation`, `is_system`, `is_active`, `created_at`, `updated_at`)
SELECT UUID(), `id`, 'LABEL_90X130', '标签 90 × 130 mm', 90, 130, 'portrait', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `tenant`;

INSERT INTO `print_label_spec` (`id`, `tenant_id`, `code`, `name`, `width_mm`, `height_mm`, `orientation`, `is_system`, `is_active`, `created_at`, `updated_at`)
SELECT UUID(), `id`, 'LABEL_100X150', '标签 100 × 150 mm', 100, 150, 'portrait', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `tenant`;

INSERT INTO `print_label_spec` (`id`, `tenant_id`, `code`, `name`, `width_mm`, `height_mm`, `orientation`, `is_system`, `is_active`, `created_at`, `updated_at`)
SELECT UUID(), `id`, 'LABEL_150X100', '标签 150 × 100 mm', 150, 100, 'landscape', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `tenant`;

INSERT INTO `print_label_spec` (`id`, `tenant_id`, `code`, `name`, `width_mm`, `height_mm`, `orientation`, `is_system`, `is_active`, `created_at`, `updated_at`)
SELECT UUID(), `id`, 'A4_DOCUMENT', 'A4 单据', 210, 297, 'portrait', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `tenant`;

ALTER TABLE `print_template`
  ADD COLUMN `scenario_type` VARCHAR(64) NULL AFTER `label_type`,
  ADD COLUMN `label_spec_code` VARCHAR(64) NULL AFTER `scenario_type`,
  ADD INDEX `print_template_tenant_scenario_type_idx`(`tenant_id`, `scenario_type`),
  ADD INDEX `print_template_tenant_label_spec_code_idx`(`tenant_id`, `label_spec_code`);

UPDATE `print_template`
SET
  `label_spec_code` = CASE
    WHEN `label_type` IN ('LABEL_60X40', 'LABEL_90X130', 'LABEL_100X150', 'LABEL_150X100', 'A4_DOCUMENT') THEN `label_type`
    WHEN `label_type` = 'SERVICE_PROVIDER_LABEL' THEN 'LABEL_100X150'
    WHEN `label_type` = 'SKU_LABEL' THEN 'LABEL_60X40'
    WHEN `label_type` = 'PACKING_LIST' THEN 'A4_DOCUMENT'
    WHEN `label_type` = 'CUSTOM_LABEL' AND `name` LIKE '%PDA%' THEN 'LABEL_90X130'
    ELSE 'LABEL_100X150'
  END,
  `scenario_type` = CASE
    WHEN `label_type` = 'SERVICE_PROVIDER_LABEL' THEN 'SHIPMENT_LABEL'
    WHEN `label_type` = 'SKU_LABEL' THEN 'SKU_LABEL'
    WHEN `label_type` = 'PACKING_LIST' THEN 'PICK_ORDER'
    WHEN `label_type` = 'LABEL_60X40' THEN 'SKU_LABEL'
    WHEN `label_type` = 'LABEL_90X130' THEN 'PDA_LOGIN_QR'
    WHEN `label_type` = 'LABEL_100X150' THEN 'SHIPMENT_LABEL'
    WHEN `label_type` = 'LABEL_150X100' THEN 'PUTAWAY_ORDER'
    WHEN `label_type` = 'A4_DOCUMENT' THEN 'PICK_ORDER'
    WHEN `label_type` = 'CUSTOM_LABEL' AND `name` LIKE '%PDA%' THEN 'PDA_LOGIN_QR'
    ELSE 'CUSTOM_LABEL'
  END;

UPDATE `print_template`
SET `label_type` = `label_spec_code`
WHERE `label_spec_code` IS NOT NULL;

ALTER TABLE `print_history`
  ADD COLUMN `scenario_type` VARCHAR(64) NULL AFTER `label_type`,
  ADD COLUMN `label_spec_code` VARCHAR(64) NULL AFTER `scenario_type`,
  ADD INDEX `print_history_tenant_scenario_type_idx`(`tenant_id`, `scenario_type`),
  ADD INDEX `print_history_tenant_label_spec_code_idx`(`tenant_id`, `label_spec_code`);
