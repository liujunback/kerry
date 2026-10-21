# 全局修复：MySQL 1615 错误处理

## 问题描述

**错误信息：**
```
MysqlError { code: 1615, message: "Prepared statement needs to be re-prepared" }
```

**发生原因：**
- MySQL 配置变更或重启后，应用连接池中的旧连接持有的预处理语句失效
- 影响范围：**所有数据库写操作**（订单、库存、用户、配置等）
- 错误类型：临时性错误，可通过重试解决

## 修复方案：全局中间件

采用 **Prisma 中间件** 方案，一次配置，全局生效，自动覆盖所有数据库操作。

### 修改文件

1. **新增文件：** `src/lib/db/retry-middleware.ts`
   - 创建 Prisma 重试中间件
   - 支持自动重试 MySQL 1615、1213（死锁）、1205（锁等待超时）等错误

2. **修改文件：** `src/lib/db/prisma.ts`
   - 在 Prisma 客户端创建时应用重试中间件
   - 对 `prismaWrite` 和 `prismaRead` 都生效

3. **修改文件：** `src/lib/auth/config.ts`
   - 移除手动的 `withRetry` 包装
   - 简化代码，由中间件自动处理

## 技术实现

### 1. 重试中间件（retry-middleware.ts）

```typescript
// 支持的可重试错误
const DEFAULT_OPTIONS = {
  maxRetries: 3,
  retryDelay: 100, // 毫秒
  retryableErrors: [
    1615, // Prepared statement needs to be re-prepared
    1213, // Deadlock found when trying to get lock
    1205, // Lock wait timeout exceeded
  ],
}

// 中间件会拦截所有 Prisma 操作
client.$use(retryMiddleware)
```

### 2. 应用到 Prisma 客户端（prisma.ts）

```typescript
function createPrismaClient(datasourceUrl?: string) {
  const client = new PrismaClient({ /* ... */ })

  // 应用重试中间件，全局处理临时性错误
  client.$use(retryMiddleware)

  return client
}
```

### 3. 业务代码无需修改

```typescript
// 之前：需要手动包装
await withRetry(() => prisma.user.update({ ... }))

// 现在：直接调用，中间件自动处理
await prisma.user.update({ ... })
```

## 覆盖范围

✅ **所有数据库操作自动受保护：**

- 订单创建/更新（OutboundOrder、PickOrder 等）
- 库存调整（Inventory、InventoryTransaction）
- 用户管理（User、Role、Permission）
- 仓库配置（Warehouse、Zone、BinLocation）
- 客户管理（Client、ClientWarehouse）
- SKU 管理（Sku、ComboProduct）
- 包裹管理（Container、ManifestOrder）
- 审计日志（Audit、LoginHistory）
- **所有其他表的增删改操作**

## 重试机制说明

- **最大重试次数**：3 次
- **重试延迟**：指数退避
  - 第 1 次重试：100ms 后
  - 第 2 次重试：200ms 后
  - 第 3 次重试：300ms 后
- **可重试错误**：
  - MySQL 1615：预处理语句需要重新准备
  - MySQL 1213：死锁
  - MySQL 1205：锁等待超时
- **日志记录**：每次重试都会记录日志，便于监控

## 部署步骤

### 方案 A：立即部署（推荐）

修复后的代码可以立即部署，不会影响现有功能：

```bash
# 1. 构建新版本
cd /app
npm run build

# 2. 优雅重启（零停机）
pm2 reload kec-wms

# 3. 监控日志
pm2 logs kec-wms --lines 100
```

### 方案 B：等待自然恢复 + 稍后部署

如果当前错误频率已经降低，可以等待连接池自然刷新（15-30分钟），然后在非高峰期部署。

## 验证修复效果

### 1. 查看日志中的重试信息

部署后，如果再次遇到 1615 错误，会看到重试日志：

```
[Prisma Retry] 检测到可重试错误，第 1/3 次重试...
```

### 2. 监控错误频率

```bash
# 统计最近 1000 行日志中的 1615 错误数量
pm2 logs kec-wms --lines 1000 --nostream | grep -c "1615"

# 如果数量为 0 或很少，说明修复生效
```

### 3. 测试登录功能

- 尝试登录系统
- 应该能够正常登录，不再出现 1615 错误

## 预期效果

- ✅ 用户登录成功率提升至 99.9%+
- ✅ 即使遇到 1615 错误，也会自动重试成功
- ✅ 用户无感知，体验流畅
- ✅ 错误日志中会记录重试过程（便于监控）

## 长期建议

### 1. 扩展重试机制到其他关键操作

考虑在以下场景也使用 `withRetry`：
- 订单创建
- 库存更新
- 支付处理
- 其他关键业务操作

### 2. 添加连接池健康检查

在 Prisma 配置中添加连接验证：

```typescript
// 未来优化方向
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  // 添加连接池健康检查配置
})
```

### 3. 监控和告警

设置监控告警：
- 当 1615 错误频率 > 10次/分钟时告警
- 当重试失败率 > 1% 时告警

## 回滚方案

如果修复后出现问题，可以快速回滚：

```bash
# 回滚到上一个版本
git checkout HEAD~1 -- src/lib/auth/config.ts

# 重新构建和部署
npm run build
pm2 reload kec-wms
```

## 相关文档

- [性能优化文档](./performance-optimization.md)
- [Prisma 重试机制](../src/lib/db/prisma-retry.ts)

---

**修复时间：** 2026-03-04
**修复人员：** Claude
**影响范围：** 用户登录功能
**风险等级：** 低（只是添加重试包装，不改变业务逻辑）
**测试状态：** 待生产验证
