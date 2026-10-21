# PDA（手持端）模块逆向文档说明

## 1. 这套文档是什么

这是一套基于当前代码整理的 PDA（手持端）实现说明。目标不是写理想终端方案，而是回答：

- 当前 PDA（手持端）有哪些页面和业务入口
- Android（安卓）端如何组织导航、会话、网络请求和反馈
- 每个 PDA（手持端）业务动作实际调用哪些后端接口
- PDA（手持端）现在覆盖哪些业务，没有覆盖哪些业务

## 2. 事实来源

本目录结论只来自当前代码：

- `wms-pda/app/src/main/java/com/kec/wms/pda/MainActivity.kt`
- `wms-pda/app/src/main/java/com/kec/wms/pda/MainViewModel.kt`
- `wms-pda/app/src/main/java/com/kec/wms/pda/navigation/*`
- `wms-pda/app/src/main/java/com/kec/wms/pda/data/api/*`
- `wms-pda/app/src/main/java/com/kec/wms/pda/data/repository/*`
- `wms-pda/app/src/main/java/com/kec/wms/pda/domain/usecase/*`
- `wms-pda/app/src/main/java/com/kec/wms/pda/presentation/*`
- `backend/src/app/api/pda/v1/*`

## 3. 判定原则

1. Android（安卓）端 `ApiPaths`（接口路径常量）和 Retrofit（网络请求库）接口优先。
2. 页面是否真实可进入，以 `PdaRoutes`（PDA路由）和 `PdaScreenSpec`（PDA页面规格）为准。
3. 后端是否真实支持，以 `backend/src/app/api/pda/v1/*/route.ts` 为准。
4. 文案、声音、震动、焦点这类终端体验，以共享组件和 `wms-pda/AGENTS.md` 约束为准。

## 4. 当前 PDA（手持端）主链

当前 PDA（手持端）不是单一业务模块，而是多个仓内动作的移动端入口：

`登录/选仓 -> 工作台 -> 入库签收/收货/上架 -> 出库拣货/签出/集运 -> 库存查询/调整/转移 -> 盘点执行 -> 端内更新`

更细一点：

1. 登录走账号密码或二维码令牌，登录后保存 token（令牌）、用户信息、仓库上下文和权限。
2. 工作台按菜单项跳转到集中注册的 `PdaRoutes`（PDA路由）。
3. 入库链路覆盖 ASN（入库通知单）签收、SKU（商品）收货、容器收货、上架。
4. 出库链路覆盖拣货、签出、集运挂载。
5. 库存链路覆盖库存查询、库存调整、库存转移。
6. 盘点链路覆盖批次列表、批次详情、开始、提交明细、提交范围行、完成批次。
7. 端内升级走 `GET /api/v1/pda/app-version`（PDA版本接口）和 Android `DownloadManager`（下载管理器）。

## 5. 文档索引

- `01-导航会话与接口地图.md`
  - 讲 PDA（手持端）导航、会话、网络层、接口清单
- `02-入库收货与上架PDA流程.md`
  - 讲 ASN（入库通知单）签收、收货、容器、上架
- `03-出库拣货签出集运PDA流程.md`
  - 讲拣货、签出、集运挂载
- `04-库存盘点调整查询PDA流程.md`
  - 讲库存查询、调整、转移、盘点执行

## 6. 当前没有覆盖的边界

- 当前 PDA（手持端）未发现独立退件页面和退件 API（接口）常量。
- 退件功能当前主要在 Web（网页）/后端 `returns` 模块中实现。
- PDA（手持端）也未直接暴露波次策略配置，波次策略仍是后端和 Web（网页）配置能力。
