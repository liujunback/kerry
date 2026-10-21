# Priority Matrix

| 优先级 | 说明 | 适用模块 |
|---|---|---|
| P0 | 高风险写操作、状态机、库存变化、外部回调 | inventory, outbound, returns, packing |
| P1 | 主数据写操作、关键查询、关系绑定 | clients, warehouses, skus, users, roles |
| P2 | 导出、下载、配置、辅助管理 | files, print, jobs, scheduled tasks |

执行建议：
1. P0 全量边界优先落地。
2. P1 重点补“必填、类型、枚举、长度、状态”。
3. P2 先做非法参数和权限边界。
