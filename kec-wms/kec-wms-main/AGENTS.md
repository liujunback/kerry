# Repository Guidelines

## Project Scope
This workspace contains multiple subprojects, including `backend/`, `wms-pda/`, and supporting tools such as `print-agent/`. Apply the rules in this file across the whole repository unless a more specific `AGENTS.md` in a subdirectory overrides or extends them.

## File Search And Reading
- Prefer `rg` / `rg --files` for search and discovery. Do not use slower broad scans when `rg` can answer the question.
- Read the minimum necessary context. Start with pattern search, then inspect only the relevant lines or small snippets.
- Do not default to whole-file reads for source files when a targeted read will do.
- On Windows, avoid bare `Get-Content`, `type`, or similar default-encoding readers for source files, especially files containing Chinese text.
- When text must be read from PowerShell, use explicit UTF-8 APIs such as `[System.IO.File]::ReadAllLines($path, [System.Text.Encoding]::UTF8)` and then select only the needed lines.

## Editing Discipline
- Use `apply_patch` for manual source edits.
- Avoid whole-file rewrites when a focused patch is enough.
- Preserve existing file encoding, especially `UTF-8` Chinese content.

## Verification
- Prefer the smallest useful verification step first.
- Run full builds or broad checks only when the change is shared, risky, build-related, or the user asks for them.

