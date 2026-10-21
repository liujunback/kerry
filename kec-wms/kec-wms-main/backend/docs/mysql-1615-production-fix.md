# MySQL 1615 错误 - 生产环境深度修复

## 问题现象

生产环境中出现 MySQL 1615 错误（Prepared statement needs to be re-prepared），且**重试3次都失败**：

```
[Prisma Retry Extension] 检测到可重试错误，第 1/3 次重试...
[Prisma Retry Extension] 检测到可重试错误，第 2/3 次重试...
[Prisma Retry Extension] 检测到可重试错误，第 3/3 次重试...
[Prisma Retry Extension] 达到最大重试次数 (3)，操作失败
```

## 根本原因分析

### 为什么简单重试无效？

1. **连接池整体失效**
   - 不是单个连接的问题，而是连接池中所有连接的预编译语句都失效了
   - 简单重试仍然使用同一个失效的连接
   - 需要的是**断开并重建连接**，而不是简单等待重试

2. **生产环境特有的触发条件**
   - MySQL 服务重启或维护
   - 数据库配置变更
   - 连接长时间空闲后失效（wait_timeout）
   - 执行数据库迁移（ALTER TABLE）

3. **Next.js + Prisma 的特殊性**
   - 使用长连接池（20个连接）
   - Serverless 架构可能导致连接休眠
   - 预编译语句缓存在连接级别

## 修复方案

### 1. 增强重试策略

**修改文件：** `src/lib/db/retry-extension.ts`

```typescript
// 增加重试次数和延迟
maxRetries: 5,        // 从 3 次增加到 5 次
retryDelay: 1000,     // 从 100ms 增加到 1000ms

// 1615 错误使用双倍延迟
const delayMs = is1615Error(error)
  ? opts.retryDelay * 2 * (attempt + 1)  // 2s, 4s, 6s, 8s, 10s
  : opts.retryDelay * (attempt + 1)       // 1s, 2s, 3s, 4s, 5s
```

### 2. 连接池刷新机制

**新增文件：** `src/lib/db/connection-pool.ts`

核心功能：
- 注册所有 Prisma 客户端到连接池管理器
- 检测到 1615 错误时，自动刷新所有连接池
- 断开 → 等待 → 重连

```typescript
// 检测到 1615 错误时
await refreshAllConnectionPools()
// 1. 断开所有连接
// 2. 等待 500ms
// 3. 执行简单查询触发重连
```

### 3. 自动连接池管理

**修改文件：** `src/lib/db/prisma.ts`

```typescript
// 创建客户端时自动注册
function createBasePrismaClient(datasourceUrl?: string) {
  const client = new PrismaClient({ ... })
  registerPrismaClient(client)  // 注册到连接池管理器
  return client
}
```

## 重试流程对比

### 修复前（失败）

```
1615 错误 → 等待 100ms → 重试（使用同一个失效连接）→ 失败
         → 等待 200ms → 重试（使用同一个失效连接）→ 失败
         → 等待 300ms → 重试（使用同一个失效连接）→ 失败
         → 达到最大重试次数 → 抛出错误
```

### 修复后（成功）

```
1615 错误 → 刷新连接池（断开所有连接）
         → 等待 2000ms
         → 重试（使用新连接）→ 成功 ✅
```

## MySQL 配置检查

**新增工具：** `src/lib/db/check-mysql-config.ts`

运行检查：
```bash
cd backend
npx ts-node src/lib/db/check-mysql-config.ts
```

检查项目：
- `max_prepared_stmt_count` - 预编译语句限制
- `table_definition_cache` - 表定义缓存
- `table_open_cache` - 表打开缓存
- `wait_timeout` / `interactive_timeout` - 连接超时

当前配置（已验证正常）：
```
max_prepared_stmt_count: 16382
table_definition_cache: 2000
table_open_cache: 4000
wait_timeout: 28800 (8小时)
```

## 部署步骤

### 1. 更新代码

```bash
cd backend
git pull
npm install
```

### 2. 构建

```bash
npm run build
```

### 3. 重启应用

```bash
pm2 reload kec-wms
```

### 4. 监控日志

```bash
pm2 logs kec-wms --lines 100
```

## 预期效果

### 成功重试的日志

```
[Prisma Retry Extension] 检测到可重试错误，第 1/5 次重试...
[Prisma Retry Extension] 检测到 1615 错误，刷新连接池...
[Connection Pool] 开始刷新所有连接池...
[Connection Pool] 连接已断开
[Connection Pool] 连接已重建
[Connection Pool] 所有连接池已刷新
[Prisma Retry Extension] 等待 2000ms 后重试...
✅ 重试成功
```

### 性能影响

- **正常操作**：无影响（0ms 额外开销）
- **1615 错误发生时**：
  - 第1次重试：~2.5秒（刷新连接池 + 等待）
  - 通常第1次重试就能成功
  - 最坏情况：~30秒（5次重试全部失败）

## 长期监控

### 关键指标

1. **1615 错误频率**
   - 如果每天多次出现 → 检查 MySQL 配置或应用架构
   - 如果偶尔出现 → 正常，重试机制会处理

2. **重试成功率**
   - 目标：>95% 在第1次重试成功
   - 如果需要多次重试 → 可能需要增加延迟或调整连接池

3. **连接池状态**
   - 定期运行 `check-mysql-config.ts`
   - 监控预编译语句使用率

### 告警阈值

建议设置告警：
- 1615 错误每小时超过 10 次
- 重试失败率超过 5%
- 预编译语句使用率超过 80%

## 故障排查

### 如果仍然失败

1. **检查 MySQL 服务状态**
   ```bash
   systemctl status mysql
   # 或
   service mysql status
   ```

2. **检查 MySQL 错误日志**
   ```bash
   tail -f /var/log/mysql/error.log
   ```

3. **手动刷新连接**
   ```sql
   FLUSH TABLES;
   ```

4. **重启 MySQL（最后手段）**
   ```bash
   systemctl restart mysql
   ```

### 临时禁用重试（调试用）

```typescript
// src/lib/db/retry-extension.ts
export const retryExtension = createRetryExtension({
  maxRetries: 0,  // 禁用重试
})
```

## 总结

- ✅ 增强重试策略（5次重试，更长延迟）
- ✅ 添加连接池刷新机制
- ✅ 自动检测 1615 错误并刷新连接
- ✅ 提供 MySQL 配置检查工具
- ✅ 详细的日志记录和监控

**预期结果：** 1615 错误自动恢复，用户无感知

---

**修复日期：** 2026-03-04
**影响范围：** 所有数据库操作
**风险等级：** 低（向后兼容，仅增强重试逻辑）
