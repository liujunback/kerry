@echo off
REM 开发环境数据库重置脚本（Windows版本）
REM 用于应用修改后的初始 migration

echo.
echo ⚠️  警告：此操作将删除所有数据库数据！
echo 请确认当前是开发环境，且已备份重要数据。
echo.
set /p confirm="是否继续？(yes/no): "

if not "%confirm%"=="yes" (
    echo 操作已取消
    exit /b 0
)

echo.
echo 📋 修改内容：
echo 1. inventory_bucket: batchNumber, lpn 改为 NOT NULL DEFAULT ''
echo 2. inventory_event: batchNumber, lpn 改为 NOT NULL DEFAULT ''
echo 3. inventory_snapshot: batchNumber, lpn 改为 NOT NULL DEFAULT ''
echo 4. allocation_detail: 添加 lpn 字段，batchNumber, lpn 改为 NOT NULL DEFAULT ''
echo.

REM 1. 重置 Prisma migrations
echo 🔄 重置 Prisma migrations...
call npx prisma migrate reset --force --skip-seed

REM 2. 生成 Prisma Client
echo 🔧 生成 Prisma Client...
call npx prisma generate

echo.
echo ✨ 数据库重置完成！
echo.
echo 📝 后续步骤：
echo 1. 运行种子数据（如果需要）: npm run seed
echo 2. 启动应用测试功能
echo 3. 验证库存桶的唯一约束是否正常工作
echo.
pause
