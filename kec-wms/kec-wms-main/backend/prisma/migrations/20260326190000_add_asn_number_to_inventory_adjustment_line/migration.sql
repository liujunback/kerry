ALTER TABLE `inventory_adjustment_line`
  ADD COLUMN `asn_number` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'ASN单号（追溯来源）' AFTER `reason_notes`;

CREATE INDEX `inventory_adjustment_line_asn_number_idx`
  ON `inventory_adjustment_line`(`asn_number`);
