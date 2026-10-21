# Order Execution Lock 规范

## 目标

统一所有会改变订单执行归属的动作，避免并发下出现脏数据。

## 适用动作

- 手工创建拣货单
- 单个订单回退
- 批量订单回退
- 拣货单取消
- 波次策略单波次提交

## 锁粒度

- 订单级 Redis 锁
- 锁 key 由 `tenantId + orderId` 唯一确定

## 使用规则

1. 多订单操作必须先按 `orderId` 排序后整体拿锁。
2. 锁只覆盖真正会改订单执行归属的事务，不覆盖大范围只读查询。
3. 拿不到锁时：
   - 人工入口返回 `409`
   - `code = ORDER_EXECUTION_LOCK_CONFLICT`
4. 波次策略在单波次提交前拿锁：
   - 当前语义为“整波次锁冲突则整波次跳过”
   - `reasonCode = WAVE_SKIPPED_DUE_TO_ORDER_EXECUTION_LOCK_CONFLICT`
5. 锁必须在事务结束后立即释放，不要跨 `releaseWave` 持有。

## 不适用动作

- 纯查询
- 导出/打印
- 备注等非执行归属字段修改

## 分层约束

- 波次执行之间：仓库级锁
- 订单执行型动作之间：订单级 Redis 锁
