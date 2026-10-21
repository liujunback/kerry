# CLAUDE.md

This file provides guidance to Claude Code when working in `wms-pda/`.

## 语言要求

- 所有回复使用简体中文。
- 解释代码、问题分析、修改说明都优先用中文表达。

## 适用范围

- 本文件适用于 `wms-pda/` 目录。
- 如果仓库根目录或更深层目录存在额外规范，需要一并遵守。

## 文件搜索与读取

- 优先使用 `rg` / `rg --files` 进行搜索与文件发现。
- 先搜索，再按需读取最小上下文；不要默认整文件通读。
- 在 Windows PowerShell 下读取源码文件时，避免直接使用裸 `Get-Content` / `type`。
- 如需通过 PowerShell 读取源码，使用显式 UTF-8 API，例如：
  - `[System.IO.File]::ReadAllLines($path, [System.Text.Encoding]::UTF8)`
- 仓库中包含中文内容，必须保留原始编码与文本内容，避免乱码。

## 编辑规范

- 手工修改代码时优先做“小范围、聚焦”的改动，不做无关重写。
- 保持现有文件编码，尤其是包含中文的 `UTF-8` 文件。
- 不要随意重排无关代码、批量格式化未触及区域，除非用户明确要求。
- 修改已有逻辑时，优先复用现有组件、现有数据流和现有模式，而不是再造一套。

## 国际化

- PDA 默认要求支持多语言，新增用户可见文案必须进入 Android string resources。
- 不要在 Kotlin、Compose、XML 中硬编码用户可见文本。
- Compose 页面使用 `stringResource(...)`。
- 新增文案时，至少同步更新：
  - `app/src/main/res/values/strings.xml`
  - `app/src/main/res/values-zh-rCN/strings.xml`
- 尽量使用参数化字符串，避免字符串拼接形成整句。

## 反馈规范

- 页面反馈必须是状态驱动的，优先使用页面内可持续可见的反馈。
- 常规成功/失败反馈优先使用共享组件 `PdaFeedbackBanner`。
- 不要把 Toast 作为主要反馈方式。
- 高频扫描页面中：
  - 成功后保持扫描节奏
  - 错误时给出可恢复的明确提示
- 弹窗只用于确认、破坏性操作或不可逆流程。

## 页面密度

- 扫描型页面按 `compact`（紧凑型）思路设计：
  - 当前输入
  - 主要动作
  - 当前反馈
  这些内容应尽量保持在首屏核心区域。
- 详情/确认型页面按 `detailed`（详情型）设计，可以分组展示更多信息。
- 不要机械套用固定“最多几行”的规则，应按任务类型决定信息密度。

## 导航规范

- PDA 路由必须集中定义在 `PdaRoutes`。
- 页面渲染与返回行为统一放在 `PdaScreenSpec` 中管理。
- 不要在页面、菜单、返回处理里散落原始 route 字符串。
- 新增 PDA 页面时：
  - 在 `PdaRoutes` 注册
  - 在 `PdaScreenSpec` 接入
- 顶部返回和系统返回应保持一致。

## 路由规范

- 所有 PDA 页面路由统一定义在 `navigation/PdaRoutes.kt`，禁止在页面或菜单中硬编码字符串路由。
- 所有 PDA 页面渲染入口统一定义在 `navigation/PdaScreenSpec.kt`，包括：
  - 页面如何创建和渲染
  - 页面返回逻辑
  - 页面模式初始化逻辑
- 菜单配置中的 `screen` 必须引用 `PdaRoutes` 常量，不要直接写 `"putaway_container"` 这类字符串。
- 当一个业务存在多模式页面时，优先使用：
  - 同一路由骨架
  - 同一个 ViewModel
  - 通过 mode 区分页面行为
  而不是为每种模式复制整套页面实现。
- 修改路由时必须同步检查以下位置是否一致：
  - `PdaRoutes`
  - `PdaScreenSpec`
  - `data/model/MenuModels.kt`
  - 页面内的 `onBack` / `BackHandler`
- `BackHandler` 和顶部返回按钮必须指向同一返回目标，避免出现两个返回路径不一致。
- 如果用户要求“点击菜单直接进入某个具体页面”，优先修改菜单项 `screen` 指向，而不是在页面内部绕跳。
- 如果用户要求“保留模式选择页”，则菜单入口应进入模式页，再由模式页分发到具体业务页。
- 新页面接入时，`MainActivity` 只保留应用级导航入口；页面级逻辑不要下沉到 `MainActivity`。

## 请求后端的路由规范

- PDA 请求后端接口时，优先使用 PDA 专用前缀路由，即 `/api/pda/v1/...`。
- 若后端已提供 PDA 路由转发层，应优先请求 PDA 路由，而不是直接请求 `/api/v1/...`。
- 所有接口路径统一定义在 `data/api/ApiPaths.kt`，禁止在以下位置硬编码接口字符串：
  - Compose 页面
  - ViewModel
  - UseCase
  - Repository
- Retrofit 接口定义必须引用 `ApiPaths` 常量，不要直接写 `"api/pda/v1/inbound/shelving"` 这类字符串。
- 新增 PDA 接口时，优先检查后端是否已有对应的 PDA 路由转发文件，例如：
  - `backend/src/app/api/pda/v1/...`
- 如果后端只有 `/api/v1/...` 实现，而 PDA 侧需要专用入口，应优先补后端 PDA 转发层，再在 PDA 端接入。
- 接口分层约束如下：
  - `ApiPaths`：统一维护路径常量
  - `*Api.kt`：定义 Retrofit 接口
  - `Repository`：处理接口调用与错误转换
  - `UseCase`：处理业务校验与流程组合
  - `ViewModel`：只调用 UseCase，不直接拼接口路径
- 错误信息应在 Repository 或 UseCase 层统一转换，不要在页面层直接解析 HTTP 错误结构。
- 修改接口路由时，必须同步检查以下位置是否一致：
  - `ApiPaths.kt`
  - 对应 `*Api.kt`
  - `Repository`
  - 后端 `backend/src/app/api/pda/v1/...` 路由文件
- 如果一个 PDA 功能已经有现成后端接口，优先复用现有接口与数据结构，不要为了前端方便随意新造重复接口。

## 输入规范

- 优先使用共享输入组件 `PdaTextField`。
- 扫码输入默认认为可能带 `\n` / `\r`，不要在页面里重复写行尾解析逻辑。
- 优先通过 `PdaTextField` 的以下能力处理扫描：
  - `submitOnLineBreak`
  - `onLineBreakSubmit`
- 扫描型输入在清空后应默认回到同一输入框焦点，方便连续扫描。

## 焦点管理

- 焦点管理属于 PDA 核心交互，不是可有可无的细节。
- 不要在不确定组件是否已挂载时直接调用 `FocusRequester.requestFocus()`。
- 自动聚焦优先使用共享安全方法：
  - `requestFocusSafely()`
- 在 `LaunchedEffect` 中切换焦点时，要结合当前 UI 状态判断目标输入框是否真实存在。
- 连续扫描场景下，提交成功后的焦点流转要符合业务节奏：
  - 继续当前步骤时，焦点落到下一必填输入
  - 完成当前对象时，焦点回到下一次扫描入口

## 声音与震动

- 页面和 ViewModel 不直接调用硬件能力。
- 声音、震动通过统一 UI Event 和共享 manager 处理。
- 高频操作结果优先映射到统一反馈类别，而不是页面自定义实现。

## 当前项目实现偏好

- 优先复用已有 ViewModel、Repository、UseCase、共享组件和页面样式。
- 新流程如果只是模式差异，优先做“同一页面骨架 + 模式分支”，避免复制两套页面。
- 页面改动时，尽量保持 SKU 上架、容器上架、收货等扫描流程的交互一致性。

## 验证策略

- 默认做最小必要验证，不把全量构建当成每次小改动后的默认动作。
- 优先验证与改动直接相关的流程。
- 仅在以下情况扩大验证范围：
  - 用户明确要求
  - 涉及构建、依赖、共享基础设施
  - 涉及跨页面、跨模块公共逻辑
- PDA 常用最小编译验证可参考：
  - `.\gradlew.bat :app:compileDebugKotlin`
- 若当前环境缺少 JDK / `JAVA_HOME`，需要明确说明无法执行编译。

## 提交修改时的说明要求

- 说明优先聚焦用户可感知结果。
- 明确哪些行为已改变，哪些行为保持不变。
- 如果未能完成编译、测试或设备验证，必须直接说明原因。
