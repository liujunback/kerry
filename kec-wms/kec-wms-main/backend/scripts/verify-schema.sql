-- 验证数据库结构修改

-- 1. 检查 inventory_bucket 表
DESCRIBE inventory_bucket;

-- 2. 检查 inventory_event 表
DESCRIBE inventory_event;

-- 3. 检查 inventory_snapshot 表
DESCRIBE inventory_snapshot;

-- 4. 检查 allocation_detail 表
DESCRIBE allocation_detail;

-- 5. 验证 batch_number 和 lpn 字段是否为 NOT NULL
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'kec_wms'
  AND TABLE_NAME IN ('inventory_bucket', 'inventory_event', 'inventory_snapshot', 'allocation_detail')
  AND COLUMN_NAME IN ('batch_number', 'lpn')
ORDER BY TABLE_NAME, COLUMN_NAME;
