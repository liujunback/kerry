# API Boundary Library

这是一套独立于具体自动化代码的“全接口边界值测试库”资产目录。

目标：
- 沉淀统一的字段边界规则，而不是每个接口重复手写。
- 通过接口清单、字段模型、规则模板和样例用例，快速扩展边界值覆盖。
- 让测试设计、测试执行、测试维护可以分层进行。

目录说明：

```text
api-boundary-library/
  catalogs/
    endpoints-template.yaml
    modules.yaml
  schemas/
    common-fields.yaml
    clients.yaml
    warehouses.yaml
    skus.yaml
    inventory.yaml
  rules/
    string-rules.yaml
    number-rules.yaml
    enum-rules.yaml
    date-rules.yaml
    relation-rules.yaml
  templates/
    case-template.yaml
    assertion-template.yaml
  cases/
    generated/
    custom/
      clients-boundary-sample.yaml
      warehouses-boundary-sample.yaml
      skus-boundary-sample.yaml
      inventory-boundary-sample.yaml
  matrices/
    coverage-matrix.md
    priority-matrix.md
  docs/
    naming-convention.md
    verdict-policy.md
    generation-workflow.md
```

建议使用方式：

1. 先在 `catalogs/endpoints-template.yaml` 中补全接口清单。
2. 在 `schemas/` 中维护字段定义和约束。
3. 在 `rules/` 中复用通用边界模板。
4. 在 `cases/custom/` 中沉淀模块级边界用例样例。
5. 后续可基于这些资产自动生成执行层脚本。

设计原则：
- 字段先标准化，再用规则模板化，最后按接口实例化。
- 单字段边界优先于组合爆炸。
- 失败断言必须至少覆盖：HTTP 状态、success、错误码、错误消息。
- `BLOCKED` 只留给环境问题，参数错误应记为失败。
