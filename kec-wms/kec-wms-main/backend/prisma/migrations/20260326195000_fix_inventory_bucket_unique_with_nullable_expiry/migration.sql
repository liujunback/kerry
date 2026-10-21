CREATE TEMPORARY TABLE `tmp_inventory_bucket_merge_groups` AS
SELECT
  MIN(`id`) AS `keeper_id`,
  `location_id`,
  `sku_id`,
  `batch_number`,
  `lpn`,
  `bucket_type`,
  `asn_number`,
  COALESCE(`expiry_date`, DATE('1000-01-01')) AS `expiry_date_key`,
  SUM(`quantity`) AS `total_quantity`,
  MAX(`version`) AS `max_version`
FROM `inventory_bucket`
GROUP BY
  `location_id`,
  `sku_id`,
  `batch_number`,
  `lpn`,
  `bucket_type`,
  `asn_number`,
  COALESCE(`expiry_date`, DATE('1000-01-01'))
HAVING COUNT(*) > 1;

CREATE TEMPORARY TABLE `tmp_inventory_bucket_merge_rows` AS
SELECT
  b.`id` AS `duplicate_id`,
  g.`keeper_id`
FROM `inventory_bucket` b
JOIN `tmp_inventory_bucket_merge_groups` g
  ON b.`location_id` = g.`location_id`
 AND b.`sku_id` = g.`sku_id`
 AND b.`batch_number` = g.`batch_number`
 AND b.`lpn` = g.`lpn`
 AND b.`bucket_type` = g.`bucket_type`
 AND b.`asn_number` = g.`asn_number`
 AND COALESCE(b.`expiry_date`, DATE('1000-01-01')) = g.`expiry_date_key`
WHERE b.`id` <> g.`keeper_id`;

UPDATE `inventory_bucket` b
JOIN `tmp_inventory_bucket_merge_groups` g
  ON b.`id` = g.`keeper_id`
SET
  b.`quantity` = g.`total_quantity`,
  b.`version` = GREATEST(b.`version`, g.`max_version`),
  b.`updated_at` = NOW(3);

UPDATE `allocation_detail` ad
JOIN `tmp_inventory_bucket_merge_rows` m
  ON ad.`bucket_id` = m.`duplicate_id`
SET ad.`bucket_id` = m.`keeper_id`;

UPDATE `pick_order_line` pol
JOIN `tmp_inventory_bucket_merge_rows` m
  ON pol.`bucket_id` = m.`duplicate_id`
SET pol.`bucket_id` = m.`keeper_id`;

UPDATE `putaway_detail` pd
JOIN `tmp_inventory_bucket_merge_rows` m
  ON pd.`bucket_id` = m.`duplicate_id`
SET pd.`bucket_id` = m.`keeper_id`;

DELETE b
FROM `inventory_bucket` b
JOIN `tmp_inventory_bucket_merge_rows` m
  ON b.`id` = m.`duplicate_id`;

DROP TEMPORARY TABLE IF EXISTS `tmp_inventory_bucket_merge_rows`;
DROP TEMPORARY TABLE IF EXISTS `tmp_inventory_bucket_merge_groups`;

ALTER TABLE `inventory_bucket`
  ADD COLUMN `expiry_date_key` DATE
    GENERATED ALWAYS AS (COALESCE(`expiry_date`, DATE('1000-01-01'))) STORED
    AFTER `expiry_date`;

CREATE INDEX `inventory_bucket_location_id_idx`
  ON `inventory_bucket`(`location_id`);

DROP INDEX `inv_bucket_unique_with_asn` ON `inventory_bucket`;

CREATE UNIQUE INDEX `inv_bucket_unique_with_asn`
  ON `inventory_bucket`(
    `location_id`,
    `sku_id`,
    `batch_number`,
    `lpn`,
    `expiry_date_key`,
    `bucket_type`,
    `asn_number`
  );
