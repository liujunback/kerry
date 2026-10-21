-- AlterTable
ALTER TABLE `order_interception_case`
    ADD COLUMN `handling_action` VARCHAR(32) NULL COMMENT '处理动作：WAIT, RESTOCK',
    ADD COLUMN `handled_by` CHAR(36) NULL COMMENT '处理人',
    ADD COLUMN `handled_at` DATETIME(3) NULL COMMENT '处理时间';

-- DropIndex
ALTER TABLE `order_interception_case`
    DROP INDEX `order_interception_case_order_id_is_active_key`;

-- CreateIndex
CREATE INDEX `order_interception_case_order_id_is_active_idx`
ON `order_interception_case`(`order_id`, `is_active`);
