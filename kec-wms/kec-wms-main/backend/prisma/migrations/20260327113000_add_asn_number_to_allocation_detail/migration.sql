ALTER TABLE `allocation_detail`
  ADD COLUMN `asn_number` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'ASN单号（追溯来源）' AFTER `lpn`;

UPDATE `allocation_detail` ad
JOIN `inventory_bucket` b
  ON ad.`bucket_id` = b.`id`
SET ad.`asn_number` = b.`asn_number`
WHERE ad.`asn_number` = '';

CREATE INDEX `allocation_detail_asn_number_idx`
  ON `allocation_detail`(`asn_number`);
