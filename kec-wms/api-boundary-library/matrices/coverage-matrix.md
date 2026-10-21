# Coverage Matrix

| 模块 | 当前样例资产 | 目标边界维度 |
|---|---:|---|
| clients | 2 | string, enum, number |
| warehouses | 2 | enum, latitude/longitude, number |
| skus | 2 | uuid, boolean, enum |
| inventory | 2 | relation, array, quantity |

后续扩展建议：
- 每个模块至少补齐 `required / type / length / range / enum / relation / state` 七类边界。
- 优先为高风险写接口补全自定义 case。
