# 性能优化配置说明

## 优化概览

本次优化针对 **5万订单/天** 的业务需求，对系统进行了全面的性能提升。

### 优化日期
2026-03-04

### 优化内容

| 配置项 | 优化前 | 优化后 | 提升倍数 |
|--------|--------|--------|----------|
| 库存分配队列并发度 | 5 | 10 | 2x |
| 库存分配队列限流 | 100/分钟 | 500/分钟 | 5x |
| 数据库连接池（写） | 10 | 20 | 2x |
| 数据库连接池（读） | 10 | 20 | 2x |
| MySQL 最大连接数 | 500 | 1000 | 2x |
| InnoDB 缓冲池 | 256M | 512M | 2x |
| InnoDB 日志文件 | 64M | 128M | 2x |

---

## 性能提升预估

### 处理能力对比

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 订单处理能力 | 10-15/秒 | 25-35/秒 | 2.5x |
| 库存分配能力 | 1.67/秒 | 8.33/秒 | 5x |
| 日处理能力 | 5万 | 15-20万 | 3-4x |
| 峰值承载能力 | 勉强 | 充足 | ✅ |

### 场景支持能力

| 场景 | 需求 QPS | 优化后能力 | 状态 |
|------|----------|------------|------|
| 均匀分布（24h） | 0.58/s | 25-35/s | ✅ 充足 |
| 工作时间（8h） | 1.74/s | 25-35/s | ✅ 充足 |
| 高峰期（2h） | 6.94/s | 25-35/s | ✅ 充足 |
| 极端高峰（1h） | 4.17/s | 25-35/s | ✅ 充足 |

---

## 部署步骤

### 1. 应用层配置（无需重启 MySQL）

这些配置修改后，重启应用即可生效：

```bash
# 1. 停止应用
pm2 stop kec-wms

# 2. 重启应用（会自动加载新的 .env 配置）
pm2 start kec-wms
pm2 logs kec-wms
```

**修改的文件：**
- ✅ `src/lib/queue/config.ts` - 队列配置
- ✅ `src/lib/db/prisma.ts` - Prisma 连接池
- ✅ `.env` - 数据库连接字符串

### 2. MySQL 配置（需要重启 MySQL）

⚠️ **注意：重启 MySQL 会导致短暂的服务中断（约10-30秒）**

```bash
# 如果使用 Docker
cd backend
docker-compose restart mysql

# 等待 MySQL 启动完成
docker-compose logs -f mysql

# 验证 MySQL 配置
docker-compose exec mysql mysql -uroot -p123456 -e "SHOW VARIABLES LIKE 'max_connections';"
docker-compose exec mysql mysql -uroot -p123456 -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';"
```

**修改的文件：**
- ✅ `docker/mysql/conf.d/custom.cnf`
- ✅ `docker copy/mysql/conf.d/custom.cnf`

### 3. 验证配置生效

```bash
# 1. 检查应用日志
pm2 logs kec-wms --lines 50

# 2. 检查数据库连接
mysql -uroot -p123456 -e "SHOW PROCESSLIST;"

# 3. 检查 Redis 队列状态
redis-cli
> KEYS bull:inventory-allocation:*
> exit
```

---

## 监控指南

### 关键指标监控

#### 1. 数据库连接数监控

```sql
-- 查看当前连接数
SHOW PROCESSLIST;

-- 查看连接数统计
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';

-- 查看最大连接数配置
SHOW VARIABLES LIKE 'max_connections';
```

**告警阈值：**
- ⚠️ 警告：连接数 > 600（60%）
- 🚨 严重：连接数 > 800（80%）

#### 2. 队列积压监控

使用 BullMQ Dashboard 或 Redis 命令：

```bash
# 查看队列长度
redis-cli LLEN bull:inventory-allocation:wait

# 查看失败任务
redis-cli LLEN bull:inventory-allocation:failed
```

**告警阈值：**
- ⚠️ 警告：等待任务 > 100
- 🚨 严重：等待任务 > 500

#### 3. 应用性能监控

```bash
# 查看应用内存使用
pm2 monit

# 查看应用日志
pm2 logs kec-wms --lines 100
```

**告警阈值：**
- ⚠️ 警告：内存使用 > 1GB
- 🚨 严重：内存使用 > 2GB

#### 4. MySQL 性能监控

```sql
-- 查看慢查询
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- 查看 InnoDB 状态
SHOW ENGINE INNODB STATUS\G

-- 查看缓冲池命中率
SHOW STATUS LIKE 'Innodb_buffer_pool_read%';
```

---

## 性能测试建议

### 压力测试方案

使用 Apache JMeter 或 k6 进行压力测试：

```javascript
// k6 测试脚本示例
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },  // 预热：10 并发
    { duration: '5m', target: 50 },  // 增压：50 并发
    { duration: '10m', target: 100 }, // 峰值：100 并发
    { duration: '5m', target: 0 },   // 降压
  ],
};

export default function () {
  let payload = JSON.stringify({
    clientCode: 'TEST_CLIENT',
    warehouseCode: 'WH001',
    orderLines: [
      { skuCode: 'SKU001', quantity: 10 }
    ]
  });

  let params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key',
    },
  };

  let res = http.post('http://localhost:3000/api/v1/outbound-orders', payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### 测试目标

- ✅ 50 并发用户，响应时间 < 500ms
- ✅ 100 并发用户，响应时间 < 1000ms
- ✅ 错误率 < 0.1%
- ✅ 数据库连接数 < 600

---

## 进一步优化建议

### 短期优化（1-2周）

1. **启用 Redis 缓存**
   - 缓存客户信息、仓库信息、SKU 基础数据
   - 预计减少 30-40% 数据库查询

2. **数据库索引优化**
   ```sql
   -- 检查缺失的索引
   -- 为常用查询字段添加索引
   CREATE INDEX idx_order_number ON outbound_orders(order_number);
   CREATE INDEX idx_reference_number ON outbound_orders(reference_number);
   CREATE INDEX idx_client_warehouse ON outbound_orders(client_id, warehouse_id);
   ```

3. **慢查询优化**
   - 分析 `slow.log` 文件
   - 优化 N+1 查询问题
   - 使用 Prisma 的 `include` 和 `select` 优化查询

### 中期优化（1-2月）

4. **读写分离**
   - 确保所有查询操作使用 `prismaRead`
   - 报表、统计等只读操作分离到只读副本

5. **水平扩展**
   - 部署 2-3 个应用实例
   - 使用 Nginx 负载均衡
   - 配置健康检查

6. **异步化改造**
   - 将更多重操作改为异步队列处理
   - 例如：订单状态推送、报表生成等

### 长期优化（3-6月）

7. **分库分表**
   - 按客户或仓库分片
   - 历史订单归档（超过6个月）

8. **引入缓存层**
   - Redis 集群
   - 缓存预热策略

9. **微服务拆分**
   - 订单服务独立
   - 库存服务独立
   - 使用消息队列解耦

---

## 回滚方案

如果优化后出现问题，可以快速回滚：

### 回滚应用配置

```bash
# 1. 恢复旧配置
git checkout HEAD~1 -- src/lib/queue/config.ts
git checkout HEAD~1 -- src/lib/db/prisma.ts
git checkout HEAD~1 -- .env

# 2. 重启应用
pm2 restart kec-wms
```

### 回滚 MySQL 配置

```bash
# 1. 恢复旧配置
git checkout HEAD~1 -- docker/mysql/conf.d/custom.cnf

# 2. 重启 MySQL
docker-compose restart mysql
```

---

## 联系支持

如有问题，请联系技术团队：
- 技术负责人：[姓名]
- 邮箱：[邮箱]
- 紧急电话：[电话]

---

## 变更记录

| 日期 | 版本 | 说明 | 负责人 |
|------|------|------|--------|
| 2026-03-04 | 1.0 | 初始优化，支持5万订单/天 | Claude |
