# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the application code. Use `src/app/` for Next.js App Router pages and API routes, `src/components/` for reusable UI, `src/lib/` for shared services, auth, queue workers, PDF templates, validations, and utilities, and `src/stores/` for client state. Database schema, migrations, and seed data live in `prisma/`. End-to-end coverage is in `e2e/` with shared fixtures under `e2e/fixtures/`. Static assets and OpenAPI files are in `public/`; automation and maintenance scripts are in `scripts/`.

## Build, Test, and Development Commands
Use `npm run dev` to start the local Next.js server on port 3000. Build production assets with `npm run build`, then verify startup with `npm run start`. Run lint checks with `npm run lint`. Prisma workflow: `npm run db:generate`, `npm run db:push`, `npm run db:migrate`, and `npm run db:seed`. E2E commands are `npm run test:e2e`, `npm run test:e2e:ui`, and `npm run test:e2e:headed`.

## Coding Style & Naming Conventions
This repo is TypeScript-first with `strict` mode enabled. Follow the existing 2-space indentation and keep imports rooted at `@/` when pointing into `src/`. Use kebab-case for file names such as `pick-order-packing-scan-panel.tsx`; export React components and types in PascalCase; keep variables and functions in camelCase. Run ESLint before opening a PR. Do not import `date-fns` directly in app code; use `@/lib/utils/date-formatter` to preserve the shared timezone rules.

## Code Standards
Keep modules focused and avoid mixing page logic, data access, and UI rendering in one file. Put schema validation in `src/lib/validations/`, shared business logic in `src/lib/services/`, and reusable UI in `src/components/`. Prefer typed interfaces over `any`; if `any` is unavoidable, keep it local and document why. Reuse existing fixtures, stores, and helpers before adding new abstractions. Add comments only when the intent is not obvious from the code, and keep user-facing text aligned with the repository’s Chinese-first UI convention.

## Printing Standards
- All business print actions must use the shared `src/lib/printing/print-pdf.ts` helper instead of opening PDF URLs directly from pages/components.
- The default flow is `print-agent` first: fetch the PDF, convert it to base64, send it through `usePrintStore().print`, and record print history when the agent succeeds.
- Browser PDF printing is only a fallback inside the shared helper. Do not add new `window.open(pdfUrl)` or `window.print()` calls in business print flows.
- When adding a new printable document type, assign an existing `labelType` (`SERVICE_PROVIDER_LABEL`, `SKU_LABEL`, `CUSTOM_LABEL`, `PACKING_LIST`, or `INVOICE`) and ensure a default template/default device can be configured in print settings.
- Download/export actions that are not print dispatches may still open or download files directly, but their names and handlers should make that distinction clear.

## Encoding Discipline
- All source and text files must remain `UTF-8` without BOM.
- Prefer `rg` / `rg --files` for file discovery and content search before opening files directly.
- Read only the minimum necessary context for source files; use targeted snippets instead of whole-file reads unless the task truly requires full-file inspection.
- On Windows shells, do not read source files with default-encoding commands such as bare `Get-Content`, `type`, `cat`, `Set-Content`, `Out-File`, or `>` when the output may be written back into source files.
- When reading source files from scripts or terminals, use an explicit UTF-8 path:
  - PowerShell: `[System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)`
  - Node.js: `readFileSync(path, 'utf8')`
- When using PowerShell for inspection, prefer `[System.IO.File]::ReadAllLines(..., UTF8)` plus line slicing over whole-file `Get-Content`.
- When the task is about BOM detection, true UTF-8 validation, or LF/CRLF inspection, read raw bytes instead of decoded text:
  - PowerShell: `Get-Content -AsByteStream` or `[System.IO.File]::ReadAllBytes($path)`
  - Node.js: `readFileSync(path)` and inspect the returned `Buffer`
- Before bulk editing or copy-editing Chinese text, first verify the file is being read as UTF-8; if terminal output and editor output disagree, trust the explicit UTF-8 read and stop using default shell readers.
- For encoding, BOM, and line-ending decisions, trust byte-level reads over terminal-rendered text.
- Prefer `apply_patch` for source edits to avoid whole-file rewrites that may silently change encoding.

## Testing Guidelines
Playwright is the primary automated test layer. Add or update specs in `e2e/`, preferably near the affected flow, and keep the `*.spec.ts` naming used across inbound and outbound suites. Reuse fixtures from `e2e/fixtures/` instead of duplicating login or setup logic. For UI-heavy changes, include the exact Playwright command you ran in the PR.
Default to the smallest verification scope that matches the change. Do not run full `build`, full `lint`, or full TypeScript checks after every edit unless the user asks for it, the change touches shared/build/configuration code, or you suspect cross-cutting regressions. Prefer targeted tests, affected-module checks, and focused validation steps first.

## Commit & Pull Request Guidelines
Recent history uses short branch-scoped subjects like `main:测试用例` and `main:P2`. Keep commits small, scoped, and descriptive; `main:<topic>` remains the safest format if you are matching existing history. PRs should state the affected module, list schema or environment changes, include test evidence, and attach screenshots for visible UI changes.

## Security & Configuration Tips
Keep secrets in `.env` or `.env.test` and never commit local overrides. Review Prisma migrations before merging, and update `public/openapi*.yaml` when API contracts change.

## 验证与检查策略

- **默认最小化验证**：不要在每次修改后都执行全量 `npm run build`、全量 `npm run lint` 或全量 TypeScript 检查
- **优先局部验证**：优先执行与改动直接相关的验证方式，例如单个测试、受影响模块检查、局部页面流程验证、针对性脚本
- **全量检查触发条件**：仅在以下情况执行全量检查
  - 用户明确要求
  - 涉及构建配置、ESLint 配置、TypeScript 配置、共享基础设施或跨模块核心逻辑
  - 准备提测、发布，或有明显的连锁回归风险
- **目标**：在保证质量的前提下减少无效等待，避免把全量检查当作每次小改动后的默认步骤
