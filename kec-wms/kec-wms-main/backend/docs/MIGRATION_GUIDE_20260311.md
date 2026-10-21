# 生产环境数据库迁移指南

## 迁移内容

本次迁移（`20260311175400_update_sorting_system`）包含以下变更：

1. **修改 sorting_wall 表**
   - 将 `workstation_code` 字段改为允许为空（NULL）

2. **创建 sorting_cell 表**
   - 新增格口管理表，用于独立管理播种墙的格口信息
   - 包含格口编码、位置、状态等字段
   - 与 sorting_wall、tenant、warehouse 建立外键关联

3. **修改 sorting_cell_allocation 表**
   - 新增 `sorting_cell_id` 字段（可空）
   - 添加与 sorting_cell 表的外键关联

## 生产环境部署步骤

### 方式一：使用 Prisma Migrate（推荐）

1. **备份数据库**
   ```bash
   # 在生产服务器上执行
   mysqldump -u [用户名] -p [数据库名] > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **拉取最新代码**
   ```bash
   git pull origin main
   ```

3. **安装依赖**
   ```bash
   cd backend
   npm install
   ```

4. **应用迁移**
   ```bash
   npx prisma migrate deploy
   ```

   这个命令会：
   - 读取 `prisma/migrations` 目录中的所有迁移文件
   - 检查 `_prisma_migrations` 表，找出未应用的迁移
   - 按顺序执行未应用的迁移
   - 不会提示确认，适合生产环境自动化部署

5. **验证迁移**
   ```bash
   npx prisma migrate status
   ```

   应该显示：`Database schema is up to date!`

### 方式二：手动执行 SQL（备选）

如果无法使用 Prisma Migrate，可以手动执行 SQL：

1. **备份数据库**（同上）

2. **连接到生产数据库**
   ```bash
   mysql -u [用户名] -p [数据库名]
   ```

3. **执行迁移 SQL**
   ```sql
   -- 复制 prisma/migrations/20260311175400_update_sorting_system/migration.sql 的内容
   -- 粘贴到 MySQL 命令行中执行
   ```

4. **记录迁移历史**
   ```sql
   INSERT INTO `_prisma_migrations` (
     `id`,
     `checksum`,
     `finished_at`,
     `migration_name`,
     `logs`,
     `rolled_back_at`,
     `started_at`,
     `applied_steps_count`
   ) VALUES (
     UUID(),
     '手动执行的迁移，无 checksum',
     NOW(3),
     '20260311175400_update_sorting_system',
     NULL,
     NULL,
     NOW(3),
     1
   );
   ```

## 迁移后验证

1. **检查表结构**
   ```sql
   -- 验证 workstation_code 允许为空
   DESCRIBE sorting_wall;

   -- 验证 sorting_cell 表已创建
   SHOW CREATE TABLE sorting_cell;

   -- 验证 sorting_cell_allocation 新增字段
   DESCRIBE sorting_cell_allocation;
   ```

2. **检查外键约束**
   ```sql
   SELECT
     CONSTRAINT_NAME,
     TABLE_NAME,
     COLUMN_NAME,
     REFERENCED_TABLE_NAME,
     REFERENCED_COLUMN_NAME
   FROM information_schema.KEY_COLUMN_USAGE
   WHERE TABLE_SCHEMA = '数据库名'
     AND TABLE_NAME IN ('sorting_cell', 'sorting_cell_allocation')
     AND REFERENCED_TABLE_NAME IS NOT NULL;
   ```

3. **检查索引**
   ```sql
   SHOW INDEX FROM sorting_cell;
   SHOW INDEX FROM sorting_cell_allocation;
   ```

## 回滚方案

如果迁移后出现问题，可以执行以下回滚操作：

```sql
-- 1. 删除外键约束
ALTER TABLE `sorting_cell_allocation` DROP FOREIGN KEY `sorting_cell_allocation_sorting_cell_id_fkey`;
ALTER TABLE `sorting_cell` DROP FOREIGN KEY `sorting_cell_sorting_wall_id_fkey`;
ALTER TABLE `sorting_cell` DROP FOREIGN KEY `sorting_cell_warehouse_id_fkey`;
ALTER TABLE `sorting_cell` DROP FOREIGN KEY `sorting_cell_tenant_id_fkey`;

-- 2. 删除索引
DROP INDEX `sorting_cell_allocation_sorting_cell_id_idx` ON `sorting_cell_allocation`;

-- 3. 删除新增字段
ALTER TABLE `sorting_cell_allocation` DROP COLUMN `sorting_cell_id`;

-- 4. 删除新表
DROP TABLE `sorting_cell`;

-- 5. 恢复 workstation_code 为必填（如果需要）
ALTER TABLE `sorting_wall` MODIFY COLUMN `workstation_code` VARCHAR(32) NOT NULL COMMENT '工作站编码';

-- 6. 删除迁移记录
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20260311175400_update_sorting_system';
```

## 注意事项

1. **数据兼容性**
   - `workstation_code` 改为可空后，现有数据不受影响
   - 新创建的播种墙可以不填写工作站编码

2. **格口数据初始化**
   - 迁移只创建表结构，不会为现有播种墙生成格口数据
   - 现有播种墙的格口数据会在下次编辑或通过 API 访问时自动生成

3. **性能影响**
   - 本次迁移不涉及大量数据操作，执行时间很短（通常 < 1 秒）
   - 不需要停机维护，可以在业务低峰期执行

4. **应用重启**
   - 迁移完成后，需要重启应用服务以加载新的 Prisma Client
   ```bash
   pm2 restart [应用名称]
   # 或
   systemctl restart [服务名称]
   ```

## 相关文件

- 迁移 SQL：`backend/prisma/migrations/20260311175400_update_sorting_system/migration.sql`
- Schema 定义：`backend/prisma/schema.prisma`
- API 实现：`backend/src/app/api/v1/sorting-walls/route.ts`
- 服务层：`backend/src/lib/services/sorting-cell-service.ts`
