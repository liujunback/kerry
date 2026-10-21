INSERT INTO `print_template` (
  `id`,
  `tenant_id`,
  `name`,
  `label_type`,
  `scenario_type`,
  `label_spec_code`,
  `width_mm`,
  `height_mm`,
  `orientation`,
  `margins`,
  `template_content`,
  `field_mappings`,
  `is_default`,
  `is_active`,
  `created_at`,
  `updated_at`,
  `created_by`,
  `default_device_id`
)
SELECT
  UUID(),
  source.`tenant_id`,
  '库位标签',
  source.`label_type`,
  'BIN_LOCATION_LABEL',
  source.`label_spec_code`,
  source.`width_mm`,
  source.`height_mm`,
  source.`orientation`,
  source.`margins`,
  source.`template_content`,
  source.`field_mappings`,
  true,
  source.`is_active`,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3),
  source.`created_by`,
  source.`default_device_id`
FROM `print_template` source
WHERE source.`scenario_type` = 'SKU_LABEL'
  AND source.`label_spec_code` = 'LABEL_60X40'
  AND source.`is_default` = true
  AND NOT EXISTS (
    SELECT 1
    FROM `print_template` existing
    WHERE existing.`tenant_id` = source.`tenant_id`
      AND existing.`scenario_type` = 'BIN_LOCATION_LABEL'
      AND existing.`is_active` = true
  );

INSERT INTO `print_template` (
  `id`,
  `tenant_id`,
  `name`,
  `label_type`,
  `scenario_type`,
  `label_spec_code`,
  `width_mm`,
  `height_mm`,
  `orientation`,
  `margins`,
  `template_content`,
  `field_mappings`,
  `is_default`,
  `is_active`,
  `created_at`,
  `updated_at`,
  `created_by`,
  `default_device_id`
)
SELECT
  UUID(),
  source.`tenant_id`,
  '容器标签',
  source.`label_type`,
  'CONTAINER_LABEL',
  source.`label_spec_code`,
  source.`width_mm`,
  source.`height_mm`,
  source.`orientation`,
  source.`margins`,
  source.`template_content`,
  source.`field_mappings`,
  true,
  source.`is_active`,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3),
  source.`created_by`,
  source.`default_device_id`
FROM `print_template` source
WHERE source.`scenario_type` = 'SKU_LABEL'
  AND source.`label_spec_code` = 'LABEL_60X40'
  AND source.`is_default` = true
  AND NOT EXISTS (
    SELECT 1
    FROM `print_template` existing
    WHERE existing.`tenant_id` = source.`tenant_id`
      AND existing.`scenario_type` = 'CONTAINER_LABEL'
      AND existing.`is_active` = true
  );
