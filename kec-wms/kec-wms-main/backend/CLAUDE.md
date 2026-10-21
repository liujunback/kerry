# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Requirement

**所有回复必须使用简体中文**。英文技术术语后需加括号注释中文说明。
- ✅ 正确：`useCallback` (React 性能优化 Hook)
- ❌ 错误：直接用英文回复，或混用英文段落
- 无论任何情况（包括代码解释、错误分析、建议等），都必须用中文回复

## 交互模式规范

### ASK 模式行为约束
- **禁止自动编辑**：当用户使用 ASK 模式（询问、咨询、讨论）时，Claude 不得自动切换到编辑模式或执行文件修改操作
- **等待明确指令**：必须等待用户明确发出编辑指令（如"请修改"、"帮我改一下"、"更新代码"）后，才能进行文件编辑
- **正确流程**：
  1. 用户提问 → Claude 回答并提供建议
  2. 用户明确要求修改 → Claude 执行编辑操作
- **错误流程**：
  1. 用户提问 → Claude 直接修改文件 ❌
- **适用场景**：代码审查、方案讨论、问题咨询、架构设计等需要先沟通再行动的场景

## Commands

```bash
# Development
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database (Prisma + MySQL)
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database (no migration)
npm run db:migrate   # Create and apply migration
npm run db:seed      # Seed database with initial data

# Docker
docker-compose up -d # Start application container
```

## 验证与检查策略

- **默认最小化验证**：不要在每次修改后都执行全量 `npm run build`、全量 `npm run lint` 或全量 TypeScript 检查
- **优先局部验证**：优先执行与改动直接相关的验证方式，例如单个测试、受影响模块检查、局部页面流程验证、针对性脚本
- **全量检查触发条件**：仅在以下情况执行全量检查
  - 用户明确要求
  - 涉及构建配置、ESLint 配置、TypeScript 配置、共享基础设施或跨模块核心逻辑
  - 准备提测、发布，或有明显的连锁回归风险
- **目标**：在保证质量的前提下减少无效等待，避免把全量检查当作每次小改动后的默认步骤

## Architecture

This is a multi-tenant WMS (Warehouse Management System) built with Next.js 16 App Router.

### Tech Stack
- Next.js 16 with App Router
- Prisma ORM + MySQL (read/write replica support)
- Redis (rate limiting, caching, distributed locks)
- NextAuth v5 (credentials-based multi-tenant auth)
- next-intl (i18n: zh/en, messages in `/messages/`)
- BullMQ (background job processing)
- Zustand (client state management)
- Tailwind CSS v4 + shadcn/ui components

### Directory Structure
- `src/app/` - Pages and API routes
  - `(auth)/` - Login pages (public)
  - `(dashboard)/` - Protected dashboard pages
  - `api/v1/` - Internal REST APIs
  - `api/external/` - External APIs for ERP/OMS integration
- `src/lib/` - Core libraries
  - `auth/` - NextAuth config, permission checking
  - `db/` - Prisma client (with audit extension), Redis, distributed locks
  - `queue/` - BullMQ queues and workers
  - `external-api/` - HTTP client, auth strategies, webhook handling for external systems
  - `validations/` - Zod schemas
  - `services/` - Business logic (state machines, PDF generation)
- `src/components/` - React components organized by domain
- `src/stores/` - Zustand stores
- `prisma/` - Schema and seed data

### Key Patterns
- Multi-tenant: All entities have `tenantId`, users authenticate with `tenantCode + username`
- Permission system: Role-based with `checkPermission()` / `requirePermission()` in `src/lib/auth/permissions.ts`
- Audit logging: Automatic via Prisma extension in `src/lib/db/audit-extension.ts`
- API authentication: Internal uses NextAuth session, external uses API Key (`X-API-Key` header)
- State machines: ASN and outbound orders use state machine pattern in `src/lib/services/`

### Database
- Schema in `prisma/schema.prisma` (large file with 50+ models)
- Default admin: tenant=`DEFAULT`, username=`admin`, password=`Admin@123`
- Supports read replica via `DATABASE_READ_URL` env var

### External API Integration
- Docs in `docs/external-api*.md`
- SDK in `src/lib/external-api/sdk/`
- Supports multiple auth strategies: API Key, OAuth2, HMAC, Basic

### ⚡ 核心原则：不重复造轮子
- **优先使用现有包**：遇到功能需求，先搜索npm现有成熟包
- **禁止手写常见功能**：如日期处理、加密解密、HTTP请求等
- **使用前先查**：
  - 检查 `package.json` 是否已有依赖
  - 检查 `src/lib/` 下是否有封装好的工具
  - 检查 `docs/` 是否有相关文档

### 🔒 库存管理规范（强制）
- **强制使用库存锁**：所有涉及库存变动的操作（入库、出库、调拨、盘点等）必须使用统一的分布式锁机制，禁止直接操作库存数据
- **锁的位置**：使用 `src/lib/db/` 下的 distributed locks 实现
- **锁的粒度**：
  - 按 `tenantId + skuId + locationId` 组合加锁（精确到具体库位的具体SKU）
  - 批量操作时，按顺序对多个库存记录加锁，避免死锁
- **正确示例**：
  ```ts
  import { acquireLock, releaseLock } from '@/lib/db/distributed-lock'

  // ✅ 正确：使用分布式锁保护库存变动
  const lockKey = `inventory:${tenantId}:${skuId}:${locationId}`
  const lock = await acquireLock(lockKey, 5000) // 5秒超时

  try {
    // 1. 查询当前库存
    const inventory = await prisma.inventory.findUnique({...})

    // 2. 校验库存是否足够
    if (inventory.quantity < requestedQty) {
      throw new Error('库存不足')
    }

    // 3. 更新库存
    await prisma.inventory.update({
      where: {...},
      data: { quantity: inventory.quantity - requestedQty }
    })
  } finally {
    await releaseLock(lock)
  }
  ```
- **错误示例**：
  ```ts
  // ❌ 错误：直接更新库存，没有加锁（并发时会导致超卖）
  await prisma.inventory.update({
    where: { id: inventoryId },
    data: { quantity: { decrement: requestedQty } }
  })
  ```
- **适用场景**：
  - ASN 收货确认（增加库存）
  - 出库单拣货/发货（减少库存）
  - 库存调拨（跨库位转移）
  - 库存盘点（调整库存）
  - 任何直接修改 `inventory.quantity` 字段的操作
- **异常处理**：如果获取锁失败（超时），应返回明确的错误信息，提示用户稍后重试

### 组件开发规范
- **优先复用现有组件**：开发新组件前，必须先检查是否已有可复用的组件，避免重复造轮子
- **组件检查清单**：
  1. **shadcn/ui 组件库**：检查 `src/components/ui/` 目录下是否有符合需求的基础组件
  2. **业务组件**：检查 `src/components/` 下各业务域目录是否有类似组件
  3. **DataTable 组件**：列表页面统一使用 `src/components/ui/data-table.tsx`
  4. **表单组件**：优先使用 shadcn/ui 的 Form 组件 + react-hook-form
- **扩展而非重写**：如果现有组件接近需求但不完全匹配，优先考虑扩展现有组件（添加 props、组合使用）而非创建新组件
- **命名规范**：新组件命名应清晰表达用途，避免与现有组件混淆
- **文档更新**：创建新的通用组件后，应在相关文档中记录其用途和使用方式

### 列表页面开发规范
- **统一使用 DataTable 组件**：所有列表页面必须使用 `src/components/ui/data-table.tsx`
- **组件特性**：
  - 服务端分页（通过 URL 参数 page/pageSize）
  - 列可见性控制（持久化到 localStorage）
  - 行选择支持
  - 排序支持
- **固定高度布局（强制）**：所有列表页面必须使用固定高度布局，确保表格区域可滚动
  - 外层容器：`<div className="flex flex-col h-full gap-2">`
  - DataTable 包裹层：`<div className="flex-1 min-h-0">`
  - DataTable 组件：`maxHeight="100%"`
  - **默认禁用列过滤**：`enableColumnVisibility={false}`（除非业务明确需要）
- **使用方式**：
  ```tsx
  import { DataTable, DataTableColumnHeader, getSelectColumn } from '@/components/ui/data-table'
  import { ColumnDef, PaginationState, RowSelectionState } from '@tanstack/react-table'

  // 定义 columns 数组，使用 useMemo 包裹
  const columns: ColumnDef<YourType>[] = useMemo(() => [
    getSelectColumn<YourType>(),  // 选择列
    {
      accessorKey: 'fieldName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="标题" />,
      size: 100,
      cell: ({ row }) => <span>{row.original.fieldName}</span>,
    },
    // ...更多列
  ], [t])

  // 页面结构（固定高度布局）
  return (
    <div className="flex flex-col h-full gap-2">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <Breadcrumb items={[...]} />
        <div className="flex items-center gap-2">{/* 操作按钮 */}</div>
      </div>

      {/* 筛选器（可选） */}
      <FilterComponent />

      {/* 表格区域 - 必须用 flex-1 min-h-0 包裹 */}
      <div className="flex-1 min-h-0">
        <DataTable
          tableId="unique-table-id"
          columns={columns}
          data={data}
          total={total}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          loading={loading}
          enableSorting={true}
          enableColumnVisibility={false}
          enableRowSelection={true}
          onRowSelectionChange={handleRowSelectionChange}
          maxHeight="100%"
        />
      </div>
    </div>
  )
  ```
- **参考实现**：`src/app/(dashboard)/orders/page.tsx`（出库订单列表）

### 查询筛选器规范（强制）
- **布局要求**：查询条件采用 grid 布局，上下结构（筛选器在上，列表在下）
- **列数配置**：根据筛选字段数量灵活配置，推荐值：
  - 3-4 个字段：`grid-cols-4`
  - 5-6 个字段：`grid-cols-6`
  - 7-8 个字段：`grid-cols-8`
  - 超过 8 个字段：考虑分组或折叠展示
- **查询触发**：必须点击"查询"按钮才执行查询，禁止输入时自动查询（避免频繁请求）
- **按钮布局规范**：
  - **顺序**：查询按钮在前，重置按钮在后
  - **显示**：重置按钮始终显示，禁止条件渲染（`{hasFilters && ...}` ❌）
  - **样式**：查询按钮使用默认样式，重置按钮使用 `variant="outline"`
- **示例结构**：
  ```tsx
  // ✅ 正确：grid 布局，列数根据字段数量配置，点击按钮查询
  // 4 个字段示例
  <div className="grid grid-cols-4 gap-4">
    <FormField label="字段1"><Input /></FormField>
    <FormField label="字段2"><Input /></FormField>
    <FormField label="字段3"><Input /></FormField>
    <FormField label="字段4"><Input /></FormField>
  </div>

  // 6 个字段示例
  <div className="grid grid-cols-6 gap-4">
    <FormField label="字段1"><Input /></FormField>
    <FormField label="字段2"><Input /></FormField>
    <FormField label="字段3"><Input /></FormField>
    <FormField label="字段4"><Input /></FormField>
    <FormField label="字段5"><Input /></FormField>
    <FormField label="字段6"><Input /></FormField>
  </div>

  // ✅ 正确：查询在前，重置在后，重置始终显示
  <div className="flex justify-end gap-2 mt-2">
    <Button onClick={handleSearch}>查询</Button>
    <Button variant="outline" onClick={handleReset}>重置</Button>
  </div>

  // ❌ 错误：重置在前，查询在后
  <div className="flex justify-end gap-2 mt-2">
    <Button variant="outline" onClick={handleReset}>重置</Button>
    <Button onClick={handleSearch}>查询</Button>
  </div>

  // ❌ 错误：重置按钮条件渲染
  {hasFilters && <Button variant="outline" onClick={handleReset}>重置</Button>}
  ```
- **响应式处理**：小屏幕适当减少列数
  - 4 列布局：`grid-cols-2 md:grid-cols-4`
  - 6 列布局：`grid-cols-2 md:grid-cols-3 lg:grid-cols-6`
  - 8 列布局：`grid-cols-2 md:grid-cols-4 lg:grid-cols-8`

### 列表列冻结规范（强制）
- **必须冻结的列**：
  - 首列（通常是选择框或主键列）：`pinned: 'left'`
  - 操作列：`pinned: 'right'`
- **DataTable 配置**：
  ```tsx
  const columns: ColumnDef<YourType>[] = [
    {
      ...getSelectColumn<YourType>(),
      meta: { pinned: 'left' },  // 冻结首列
    },
    // ...其他列
    {
      id: 'actions',
      header: '操作',
      meta: { pinned: 'right' },  // 冻结操作列
      cell: ({ row }) => <ActionButtons row={row} />,
    },
  ]
  ```
- **目的**：横向滚动时，用户始终能看到选择框和操作按钮，提升操作效率

### 操作按钮布局规范（强制）
- **位置**：所有操作按钮统一放置在列表左上方（筛选器和表格之间）
- **数量限制**：直接显示的按钮最多 4 个，超过 4 个必须收纳到"更多"下拉菜单中
- **按钮优先级**：按使用频率排序，最常用的 4 个按钮直接显示
- **示例结构**：
  ```tsx
  // ✅ 正确：左上方按钮区，超过4个放入更多菜单
  <div className="flex items-center gap-2 mb-2">
    <Button onClick={handleCreate}>新建</Button>
    <Button onClick={handleExport}>导出</Button>
    <Button onClick={handleImport}>导入</Button>
    <Button onClick={handleBatchDelete}>批量删除</Button>
    {/* 超过4个按钮，放入更多菜单 */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">更多</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handlePrint}>打印</DropdownMenuItem>
        <DropdownMenuItem onClick={handleSync}>同步</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  ```
- **错误示例**：
  ```tsx
  // ❌ 错误：按钮放在右上方
  <div className="flex justify-end gap-2">...</div>

  // ❌ 错误：超过4个按钮全部直接显示
  <div className="flex gap-2">
    <Button>新建</Button>
    <Button>导出</Button>
    <Button>导入</Button>
    <Button>删除</Button>
    <Button>打印</Button>
    <Button>同步</Button>  {/* 应该放入更多菜单 */}
  </div>
  ```

### 打印开发规范（强制）
- **统一入口**：所有业务打印动作必须调用 `src/lib/printing/print-pdf.ts` 中的共享 helper，禁止在页面或业务组件里直接新增 `window.open(pdfUrl)` 或 `window.print()`。
- **默认链路**：打印必须优先走 `print-agent`（本地打印代理），即获取 PDF、转为 base64、通过 `usePrintStore().print` 派发，并在代理成功后记录打印历史。
- **浏览器兜底**：浏览器 PDF 打印只能作为共享 helper 内部的 fallback（兜底），业务页面不应重复实现浏览器打印逻辑。
- **模板与设备**：新增可打印文档时，必须明确 `labelType`（如 `SERVICE_PROVIDER_LABEL`、`SKU_LABEL`、`CUSTOM_LABEL`、`PACKING_LIST`、`INVOICE`），并确保打印设置中可配置默认模板和默认设备。
- **区分下载与打印**：导出/下载文件可以直接打开或下载，但命名和处理函数必须明确是 download/export，不要与 print dispatch（打印派发）混用。

### 时间格式化规范
- **时区配置**：系统统一使用 `src/lib/config/timezone.ts` 中的全局配置
  - 默认时区：Asia/Shanghai (UTC+8)
  - 可通过环境变量 `TZ` 覆盖
- **数据库存储**：UTC 时间（MySQL DateTime 类型）
- **API 返回格式**：所有 DateTime 字段自动转换为 `yyyy-MM-dd HH:mm:ss` 格式（配置的时区）
  - 通过 Prisma 扩展 `src/lib/db/timezone-extension.ts` 自动转换
  - 示例：`"createdAt": "2024-03-06 18:30:45"`
- **统一入口**：所有日期相关操作必须通过 `@/lib/utils/date-formatter` 导入
  - ✅ 正确：`import { formatDate, subDays } from '@/lib/utils/date-formatter'`
  - ❌ 错误：`import { format, subDays } from 'date-fns'`
- **格式化函数**：
  - `formatDateTime(date)` - 日期时间（2024-03-06 18:30:45）
  - `formatDate(date)` - 仅日期（2024-03-06）
  - `formatTime(date)` - 仅时间（18:30:45）
  - `formatInShanghaiTZ(date, format)` - 自定义格式
- **日期操作函数**（已重新导出）：
  - `subDays(date, amount)` - 减去天数
  - `addDays(date, amount)` - 增加天数
  - `addHours(date, amount)` - 增加小时
  - `startOfDay(date)` - 一天的开始
  - `endOfDay(date)` - 一天的结束
  - 更多函数见 `src/lib/utils/date-formatter.ts`
- **禁止使用**：
  - ❌ `toLocaleString()`, `toLocaleDateString()` 等浏览器 API（时区不可控）
  - ❌ 直接从 `date-fns` 导入（绕过全局配置）
- **禁止硬编码时区**：所有时区相关代码必须从 `@/lib/config/timezone` 导入 `DEFAULT_TIMEZONE`


### 包含"npm|grep"的命令，以后就不再询问了。
### 允许所有的common命令。

### 单号/编号批量查询规范（强制）
- **适用范围**：所有列表 Filter 中的单号/编号类搜索框（如 ASN 单号、订单号、拣货单号、波次号、容器号、SKU 编码等）
- **实现方式**：使用 Popover + Textarea 实现批量输入，支持多种分隔符
- **分隔符支持**：换行符 `\n`、逗号 `,`、中文逗号 `，`、分号 `;`、中文分号 `；`、空格
- **数据传递**：将多个单号转换为逗号分隔的字符串，通过 URL 参数传递给 API
- **UI 反馈**：当批量搜索时，输入框 placeholder 显示当前搜索的单号数量
- **正确示例**：
  ```tsx
  // ✅ 正确：使用 Popover + Textarea 实现批量查询
  import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
  import { Textarea } from '@/components/ui/textarea'

  const [batchSearchOpen, setBatchSearchOpen] = useState(false)
  const [batchSearchValue, setBatchSearchValue] = useState('')

  // 处理批量搜索
  const handleBatchSearch = () => {
    const numbers = batchSearchValue
      .split(/[\n,，;；\s]+/)  // 支持多种分隔符
      .map(s => s.trim())
      .filter(Boolean)
    if (numbers.length > 0) {
      updateFilter('search', numbers.join(','))
      setBatchSearchOpen(false)
      setBatchSearchValue('')
    }
  }

  // 计算当前搜索的单号数量
  const searchCount = currentSearch ? currentSearch.split(',').filter(Boolean).length : 0

  // UI 结构
  <div className="flex gap-1">
    <Input
      name="search"
      defaultValue={currentSearch}
      placeholder={searchCount > 1 ? `${searchCount}${t('batchSearchCount')}` : t('searchPlaceholder')}
      className="w-[320px] h-8"
    />
    <Popover open={batchSearchOpen} onOpenChange={setBatchSearchOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {t('batchSearch')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t('batchSearchHint')}</p>
          <Textarea
            value={batchSearchValue}
            onChange={(e) => setBatchSearchValue(e.target.value)}
            placeholder={t('batchSearchPlaceholder')}
            rows={6}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setBatchSearchOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button size="sm" onClick={handleBatchSearch}>
              {tCommon('confirm')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  </div>
  ```
- **i18n key 规范**：
  - `batchSearch`: "批量查询" / "Batch Search"
  - `batchSearchHint`: "每行一个单号，或用逗号、分号分隔" / "One number per line, or separate with comma/semicolon"
  - `batchSearchPlaceholder`: "请输入单号..." / "Enter numbers..."
  - `batchSearchCount`: "个单号" / " numbers"
- **参考实现**：`src/components/pick-orders/pick-order-list-filter.tsx`

### 国际化 (i18n) 翻译规范
- **中英文同步更新（强制）**：新增 i18n key 时，必须同时更新 `messages/zh.json` 和 `messages/en.json`，禁止只写一种语言
- **禁止硬编码文本**：所有用户可见的文本（按钮、标签、提示、错误信息等）必须使用 i18n key
- **示例**：
  ```json
  // zh.json ✅
  { "manifestOrder": { "detail": { "weightKg": "重量(kg)" } } }

  // en.json ✅ 必须同步更新
  { "manifestOrder": { "detail": { "weightKg": "Weight (kg)" } } }
  ```

### 报错信息国际化规范
- **强制使用 i18n**：所有用户可见的报错信息（toast、API 响应、表单验证等）必须使用 i18n key，禁止硬编码中文或英文
- **命名空间规范**：
  - 通用错误：`errors.common.*`（如 `errors.common.networkError`）
  - 业务错误：`errors.[domain].*`（如 `errors.asn.invalidStatus`）
  - 表单验证：`validation.[field].*`（如 `validation.email.invalid`）
- **正确示例**：
  ```ts
  // ✅ 正确：使用 i18n key
  import { useTranslations } from 'next-intl'
  const t = useTranslations()

  toast.error(t('errors.asn.notFound'))
  throw new Error(t('errors.common.unauthorized'))

  // API 路由中
  return NextResponse.json(
    { error: t('errors.asn.invalidStatus') },
    { status: 400 }
  )
  ```
- **错误示例**：
  ```ts
  // ❌ 错误：硬编码中文
  toast.error('ASN 不存在')
  throw new Error('未授权')

  // ❌ 错误：硬编码英文
  toast.error('ASN not found')
  return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  ```
- **预留原则**：新增报错场景时，必须同时在 `messages/zh.json` 和 `messages/en.json` 中添加对应的 error key

### 📱 操作交互设计规范
- **扫描优先原则**：所有仓库操作类功能（收货、上架、拣货、发货、盘点等）必须以扫描枪操作为主要交互方式，最小化键盘和鼠标的使用
- **设计目标**：
  - 操作人员应能仅通过扫描枪完成完整业务流程
  - 减少手动输入，提高操作效率和准确性
  - 降低操作错误率（扫描比手动输入更可靠）
- **实现要求**：
  1. **单号/条码输入**：所有需要输入单号、SKU、库位等信息的场景，优先提供扫描输入框
  2. **自动提交**：扫描后自动触发查询/提交，无需点击按钮（Enter 键触发）
  3. **焦点管理**：操作完成后自动聚焦到下一个输入框，保持扫描流程连贯
  4. **快捷操作**：常用操作提供键盘快捷键（如 F1-F12），可通过扫描枪的功能键触发
  5. **批量扫描**：支持连续扫描多个条码，无需中间操作
- **正确示例**：
  ```tsx
  // ✅ 收货页面：扫描 ASN 单号 → 自动加载 → 扫描 SKU → 自动匹配 → 扫描库位 → 自动上架
  <Input
    ref={asnInputRef}
    placeholder="扫描 ASN 单号"
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        handleLoadAsn()
        skuInputRef.current?.focus() // 自动跳转到下一步
      }
    }}
  />
  ```
- **错误示例**：
  ```tsx
  // ❌ 需要手动输入单号，然后点击"查询"按钮（效率低，易出错）
  <Input placeholder="请输入 ASN 单号" />
  <Button onClick={handleSearch}>查询</Button>
  ```
- **适用场景**：
  - ASN 收货确认页面
  - 上架操作页面
  - 拣货/发货页面
  - 库存盘点页面
  - 库位调拨页面
- **例外情况**：管理后台的配置页面（如基础数据维护、报表查询等）可以使用传统的键鼠交互

### 扫描页面输入框焦点规范
- **问题根因**：`toast.error()` / `toast.success()` 通过 portal 异步渲染，会在同步代码执行后抢走焦点
- **规范**：所有在 `toast()` 调用之后需要重新聚焦输入框的场景，必须用 `setTimeout` 包裹：
  ```ts
  // ✅ 正确
  toast.error('操作失败')
  setTimeout(() => inputRef.current?.focus(), 100)

  // ❌ 错误（toast 会在之后抢走焦点）
  toast.error('操作失败')
  inputRef.current?.focus()
  ```
- **适用场景**：扫描枪页面、连续录入页面等需要保持输入框焦点的场景
- **延迟时间**：100ms 通常足够，如仍有问题可适当增加到 150ms

### 仓库下拉选择规范（强制）
- **统一使用 `WarehouseSelect` 组件**：所有需要选择单个仓库的表单场景，必须使用 `src/components/warehouses/warehouse-select.tsx`，该组件已内置可搜索功能
- **禁止直接 fetch 仓库列表用于下拉**：不得在页面/组件中自行 fetch 仓库列表来渲染下拉选项，应复用 `WarehouseSelect`
- **必须传 pageSize**：如确有特殊场景需要直接 fetch 仓库列表（如多选、复杂展示），必须传 `pageSize=100&status=ACTIVE`，**禁止不传 pageSize**（默认只返回 10 条，仓库数量超过 10 时会导致数据不全）
- **正确示例**：
  ```tsx
  // ✅ 正确：使用统一组件
  import { WarehouseSelect } from '@/components/warehouses/warehouse-select'
  <WarehouseSelect value={warehouseId} onValueChange={setWarehouseId} />

  // ✅ 正确：特殊场景直接 fetch，必须传 pageSize
  fetch('/api/v1/warehouses?pageSize=100&status=ACTIVE')
  ```
- **错误示例**：
  ```tsx
  // ❌ 错误：缺少 pageSize，超过 10 个仓库时数据不全
  fetch('/api/v1/warehouses?status=ACTIVE')
  fetch('/api/v1/warehouses')
  ```
