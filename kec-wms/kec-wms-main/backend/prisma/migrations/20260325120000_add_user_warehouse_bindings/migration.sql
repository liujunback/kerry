-- CreateTable
CREATE TABLE `user_warehouse` (
    `id` CHAR(36) NOT NULL,
    `tenant_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `warehouse_id` CHAR(36) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` CHAR(36) NULL,
    `updated_by` CHAR(36) NULL,

    UNIQUE INDEX `user_warehouse_user_id_warehouse_id_key`(`user_id`, `warehouse_id`),
    INDEX `user_warehouse_tenant_id_idx`(`tenant_id`),
    INDEX `user_warehouse_user_id_idx`(`user_id`),
    INDEX `user_warehouse_warehouse_id_idx`(`warehouse_id`),
    INDEX `user_warehouse_is_default_idx`(`is_default`),
    INDEX `user_warehouse_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_warehouse` ADD CONSTRAINT `user_warehouse_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_warehouse` ADD CONSTRAINT `user_warehouse_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_warehouse` ADD CONSTRAINT `user_warehouse_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
