# Generation Workflow

推荐流程：

1. 补全接口清单
   位置：`catalogs/endpoints-template.yaml`

2. 绑定字段模型
   位置：`schemas/*.yaml`

3. 选择通用规则
   位置：`rules/*.yaml`

4. 生成模块级 case
   位置：`cases/generated/`

5. 对高风险接口补自定义样例
   位置：`cases/custom/`

6. 再映射到执行层脚本
   例如：
   - unittest
   - pytest
   - postman/newman

规则：
- 单字段边界先做全量。
- 双字段组合只做有依赖关系的。
- 对有 `z.coerce.number()` 的字段，优先补：
  - `"abc"`
  - `{}`
  - `[]`
  而不是只测 `"123"`。
