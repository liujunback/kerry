-- 修改 sorting_wall 表的 workstation_code 字段允许为空
ALTER TABLE `sorting_wall` MODIFY COLUMN `workstation_code` VARCHAR(32) NULL COMMENT '工作站编码';

-- 创建 sorting_cell 表
CREATE TABLE `sorting_cell` (
    `id` CHAR(36) NOT NULL COMMENT '主键ID',
    `tenant_id` CHAR(36) NOT NULL COMMENT '租户ID',
    `warehouse_id` CHAR(36) NOT NULL COMMENT '仓库ID',
    `sorting_wall_id` CHAR(36) NOT NULL COMMENT '播种墙ID',
    `cell_code` VARCHAR(64) NOT NULL COMMENT '格口编码 (播种墙编码-格口位置，如 WALL001-A1)',
    `cell_position` VARCHAR(16) NOT NULL COMMENT '格口位置编码 (如 A1, B2)',
    `row_number` INTEGER NOT NULL COMMENT '行号 (从1开始)',
    `column_number` INTEGER NOT NULL COMMENT '列号 (从1开始)',
    `is_active` BOOLEAN NOT NULL DEFAULT true COMMENT '是否启用',
    `status` VARCHAR(32) NOT NULL DEFAULT 'EMPTY' COMMENT '当前状态：EMPTY-空闲, ALLOCATED-已分配, SORTING-分拣中, COMPLETED-已完成',
    `remarks` VARCHAR(256) NULL COMMENT '备注',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间',
    `created_by` CHAR(36) NULL COMMENT '创建人ID',
    `updated_by` CHAR(36) NULL COMMENT '更新人ID',

    INDEX `sorting_cell_tenant_id_warehouse_id_idx`(`tenant_id`, `warehouse_id`),
    INDEX `sorting_cell_sorting_wall_id_idx`(`sorting_wall_id`),
    INDEX `sorting_cell_cell_code_idx`(`cell_code`),
    INDEX `sorting_cell_status_idx`(`status`),
    UNIQUE INDEX `sorting_cell_tenant_id_warehouse_id_cell_code_key`(`tenant_id`, `warehouse_id`, `cell_code`),
    UNIQUE INDEX `sorting_cell_sorting_wall_id_cell_position_key`(`sorting_wall_id`, `cell_position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT='格口表 - 播种墙格口信息';

-- 为 sorting_cell 表添加外键约束
ALTER TABLE `sorting_cell` ADD CONSTRAINT `sorting_cell_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `sorting_cell` ADD CONSTRAINT `sorting_cell_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `sorting_cell` ADD CONSTRAINT `sorting_cell_sorting_wall_id_fkey` FOREIGN KEY (`sorting_wall_id`) REFERENCES `sorting_wall`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- 为 sorting_cell_allocation 表添加 sorting_cell_id 字段
ALTER TABLE `sorting_cell_allocation` ADD COLUMN `sorting_cell_id` CHAR(36) NULL COMMENT '格口ID';

-- 为 sorting_cell_allocation 表添加索引
CREATE INDEX `sorting_cell_allocation_sorting_cell_id_idx` ON `sorting_cell_allocation`(`sorting_cell_id`);

-- 为 sorting_cell_allocation 表添加外键约束
ALTER TABLE `sorting_cell_allocation` ADD CONSTRAINT `sorting_cell_allocation_sorting_cell_id_fkey` FOREIGN KEY (`sorting_cell_id`) REFERENCES `sorting_cell`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
