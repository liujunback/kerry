-- 更新播种墙唯一约束：允许不同仓库有相同的 wallCode

-- 删除旧的唯一约束
ALTER TABLE `sorting_wall` DROP INDEX `sorting_wall_tenant_id_wall_code_key`;

-- 添加新的唯一约束（包含 warehouseId）
ALTER TABLE `sorting_wall` ADD UNIQUE INDEX `sorting_wall_tenant_id_warehouse_id_wall_code_key` (`tenant_id`, `warehouse_id`, `wall_code`);
