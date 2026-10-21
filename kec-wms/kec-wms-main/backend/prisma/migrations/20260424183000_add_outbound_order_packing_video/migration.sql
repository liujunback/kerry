CREATE TABLE `outbound_order_packing_video` (
  `id` CHAR(36) NOT NULL,
  `tenant_id` CHAR(36) NOT NULL,
  `order_id` CHAR(36) NOT NULL,
  `job_id` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'queued',
  `camera_id` VARCHAR(64) NOT NULL,
  `file_name` VARCHAR(256) NULL,
  `object_key` VARCHAR(512) NULL,
  `video_url` VARCHAR(1024) NOT NULL,
  `upload_target` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `uq_order_packing_video_scope`
  ON `outbound_order_packing_video` (`tenant_id`, `order_id`, `job_id`, `camera_id`);

CREATE INDEX `idx_order_packing_video_tenant_order`
  ON `outbound_order_packing_video` (`tenant_id`, `order_id`);

CREATE INDEX `idx_order_packing_video_job`
  ON `outbound_order_packing_video` (`job_id`);
