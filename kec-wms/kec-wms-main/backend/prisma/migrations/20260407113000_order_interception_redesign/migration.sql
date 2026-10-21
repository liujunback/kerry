-- CreateTable
CREATE TABLE `order_interception_case` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `source` VARCHAR(32) NOT NULL COMMENT '拦截来源：FOMS_CANCEL, MANUAL',
    `remark` TEXT NOT NULL COMMENT '拦截备注',
    `order_status_at_mark` VARCHAR(32) NOT NULL COMMENT '标记拦截时的订单状态',
    `status` VARCHAR(32) NOT NULL COMMENT '拦截状态：PENDING_INTERCEPTION, INTERCEPTED',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否为活动中的拦截案件',
    `marked_by` CHAR(36) NULL COMMENT '标记人',
    `marked_at` DATETIME(3) NOT NULL COMMENT '标记时间',
    `blocked_at_checkout` DATETIME(3) NULL COMMENT '签出处命中的时间',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `order_interception_case_order_id_is_active_key`(`order_id`, `is_active`),
    INDEX `order_interception_case_tenant_id_status_idx`(`tenant_id`, `status`),
    INDEX `order_interception_case_tenant_id_source_idx`(`tenant_id`, `source`),
    INDEX `order_interception_case_tenant_id_marked_at_idx`(`tenant_id`, `marked_at`),
    INDEX `order_interception_case_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `order_interception_case`
ADD CONSTRAINT `order_interception_case_order_id_fkey`
FOREIGN KEY (`order_id`) REFERENCES `outbound_order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_interception_case`
ADD CONSTRAINT `order_interception_case_tenant_id_fkey`
FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `outbound_order`
    DROP COLUMN `interception_status`,
    DROP COLUMN `intercepted_reason`,
    DROP COLUMN `intercepted_by`,
    DROP COLUMN `intercepted_at`;

