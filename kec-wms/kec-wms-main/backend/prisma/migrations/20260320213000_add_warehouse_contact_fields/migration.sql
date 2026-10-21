-- Add missing warehouse contact fields referenced by the Prisma schema.
ALTER TABLE `warehouse`
    ADD COLUMN `contact_name` VARCHAR(64) NULL COMMENT '联系人';

ALTER TABLE `warehouse`
    ADD COLUMN `contact_phone` VARCHAR(32) NULL COMMENT '联系电话';

ALTER TABLE `warehouse`
    ADD COLUMN `contact_email` VARCHAR(128) NULL COMMENT '联系邮箱';
