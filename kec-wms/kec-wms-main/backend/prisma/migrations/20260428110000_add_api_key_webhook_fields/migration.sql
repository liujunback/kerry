-- AlterTable
ALTER TABLE `api_key`
  ADD COLUMN `webhook_url` VARCHAR(512) NULL,
  ADD COLUMN `webhook_secret` VARCHAR(128) NULL,
  ADD COLUMN `webhook_events` JSON NULL;
