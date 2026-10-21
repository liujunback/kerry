# Web端出库UI逆向文档说明

## 1. 文档目标

这组文档只面向当前 **Web 端出库 UI**，目标是把下面几件事讲清楚：

- Web 端有哪些出库页面
- 用户在页面上怎么一步一步操作
- 页面内部状态怎么流转
- 哪些按钮什么时候能点
- 出错时前端怎么反馈
- 这些交互规则后续做其他终端时，哪些值得直接继承

## 2. 文档边界

本目录只分析当前 Web 端代码，不分析 PDA 现状。

当前覆盖范围：

- `backend/src/app/(dashboard)/orders/*`
- `backend/src/app/(dashboard)/pick-orders/*`
- `backend/src/app/(dashboard)/packing/*`
- `backend/src/app/(dashboard)/checkout/*`
- `backend/src/app/(dashboard)/manifest-mount/*`
- `backend/src/components/packing/*`
- `backend/src/components/checkout/*`
- `backend/src/stores/packing-store.ts`

明确不做：

- 旧文档复述
- PDA 页面现状分析
- 视觉重设计

## 3. 事实来源

所有结论只来自当前 Web 端代码：

- 页面组件
- Zustand store
- 页面调用的 API
- 当前组件中的按钮启用条件、焦点控制、toast 提示、弹窗逻辑

## 4. 适用对象

这组文档适合：

- 后续做手持端或其他终端的人
- 需要先对齐“Web 当前交互口径”的产品和研发
- 需要从页面行为反推接口使用方式的人

## 5. 文档索引

- `01-页面地图与状态模型.md`
- `02-订单与拣货单UI交互.md`
- `03-打包UI交互.md`
- `04-签出与集运UI交互.md`
- `05-给后续终端的交互约束与复用建议.md`

## 6. 一句话总览

当前 Web 端出库 UI 的核心风格是：

- 扫描优先
- 当前任务聚焦
- 成功后自动推进到下一输入点
- 错误直接 toast 提示
- 大部分执行页采用“左侧操作，右侧状态/明细”的工作台布局
