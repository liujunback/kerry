ALTER TABLE `inventory_event`
  ADD COLUMN `asn_number` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'ASN单号（追溯来源）' AFTER `lpn`;

CREATE INDEX `inventory_event_asn_number_idx`
  ON `inventory_event`(`asn_number`);
