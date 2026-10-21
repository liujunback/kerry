ALTER TABLE `inventory_count_detail`
  ADD COLUMN `source_bucket_id` CHAR(36) NOT NULL COMMENT '来源库存桶ID' AFTER `bucket_type`;

CREATE INDEX `inventory_count_detail_source_bucket_id_idx`
  ON `inventory_count_detail`(`source_bucket_id`);
