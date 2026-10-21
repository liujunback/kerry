# WMS PDA Guidelines

This file extends the repository-level `AGENTS.md` for everything under `wms-pda/`.

## Localization
- PDA must support multiple languages. Treat localization as a default requirement, not an optional follow-up.
- Do not hardcode user-visible text in Kotlin, Compose, or XML layouts. Put UI copy in Android string resources and reference it from code.
- For Compose UI, prefer `stringResource(...)` for all labels, buttons, messages, titles, placeholders, and dialogs shown to users.
- When adding new user-facing text, update the base `res/values/strings.xml` entry and keep the structure ready for locale-specific resource files such as `values-zh-rCN/`, `values-en/`, or future locales.
- Avoid building user-facing sentences by string concatenation when grammar or word order may vary by language. Prefer parameterized string resources.
- Review nearby touched PDA screens for newly introduced hardcoded copy and fix them as part of the same change when practical.
- Developer-only text such as logs, debug output, internal comments, and temporary diagnostics does not need localization unless it is exposed to end users.

## Verification
- For PDA UI changes, verify that newly added or modified user-facing text still resolves through resources and does not regress existing locales.
- Do not run release packaging as a default verification step. Prefer the smallest useful compile or resource check first, and run `assembleRelease` only when the user explicitly asks to package or publish a PDA build.
- When release packaging is explicitly requested and succeeds, copy the generated release APK to `backend/public/downloads/pda.apk` and keep the release metadata in `backend/public/downloads/pda-release.json` synchronized with the packaged APK, including version, file size, and SHA-256.

## Feedback Handling
- PDA feedback must be state-driven and remain visible on the page until the next user action or next successful operation clears it. Do not use transient toast messages as the primary feedback mechanism.
- Use the shared `PdaFeedbackBanner` component for routine success and error feedback so screens stay visually consistent.
- Use inline success feedback for high-frequency operations such as scan, sign-in, and submit. Prefer keeping focus in the active input and clearing the scanned value when the workflow should continue.
- Use inline error feedback for recoverable business failures such as invalid barcode, duplicate scan, invalid status, or missing container. Errors should not be hidden behind dialogs.
- Use dialogs only for confirmation flows, destructive actions, or irreversible operations that require explicit user acknowledgment.
- If a screen needs one-off side effects such as navigation, beep, vibration, or forced relogin, model them as one-time UI events rather than persistent page state text.

## Screen Density
- Design PDA screens by task type, not by a fixed maximum number of rows.
- Treat continuous scanning pages as `compact` screens. On these screens, the active input, primary action, and current feedback must remain easy to see without losing scanning rhythm.
- Treat confirmation, review, and summary pages as `detailed` screens. These screens may show more fields and may rely on scrolling when the task is to inspect data rather than continue scanning.
- On `compact` screens, show only the information required for the next immediate action by default. Secondary details should be collapsed, deferred, or moved into a separate details section.
- On `detailed` screens, prefer grouped information blocks and clear sectioning over aggressively hiding data.
- Do not use a hardcoded “4 lines max” rule. The correct threshold depends on whether the current screen is scan-first or review-first.

## Navigation
- PDA route definitions must be centralized. Do not scatter raw screen strings across screens, menus, and back handlers.
- Use `PdaRoutes` for route constants and `PdaScreenSpec` as the single place to define how a screen renders and how it handles back navigation.
- System back behavior and top-bar back behavior must stay aligned. Define both through the same screen-level back strategy rather than duplicating logic in multiple places.
- When adding a new PDA page, register it through the centralized navigation spec instead of only wiring it in `MainActivity`.
- `MainActivity` should keep only app-level session state and navigation entrypoints. Screen-specific rendering, ViewModel wiring, and back behavior belong in the screen spec layer.

## Input UX
- PDA text inputs should expose a consistent clear action when they contain text and are editable.
- Prefer using the shared `PdaTextField` so clear-button behavior, keyboard behavior, and styling remain consistent across pages.
- If a page must use a custom input field, mirror the shared clear-button and interaction behavior unless there is a strong reason not to.
- Treat PDA scan input as potentially line-terminated by the scanner. Do not assume scanned text arrives without trailing `\n` or `\r`.
- Do not duplicate scan-submit parsing logic across screens. Avoid page-local checks such as `contains("\n")` or `contains("\r")` when the behavior can be handled by the shared input component.
- Prefer implementing scanner line-break submit behavior through shared input primitives such as `PdaTextField`, so trim-and-submit behavior stays consistent across receiving, putaway, checkout, and similar scan-first flows.
- Screen code should provide the business action to run on scan submit, but should not be responsible for low-level parsing of scanner line endings unless there is a clear screen-specific exception.
- Clear actions on scan-first PDA inputs should return focus to the same field by default, so operators can immediately rescan without extra taps.
- When wiring `onClear`, prefer restoring focus to the cleared field rather than moving focus elsewhere, unless the workflow explicitly requires advancing to the next step.
- The default clear-refocus behavior should live in shared input components such as `PdaTextField`. Do not duplicate “clear then refocus same field” logic in screen code unless the screen needs an explicit exception.

## Focus Management
- Treat focus movement on PDA pages as a reliability concern, not only a UX detail.
- Do not call `FocusRequester.requestFocus()` directly from screen logic when the target input may be conditionally rendered or may not yet be attached.
- Automatic focus changes should only happen after the target field is present in the composition. Prefer a shared safe helper such as `requestFocusSafely()` that waits for the next frame and guards the call.
- In `LaunchedEffect`-driven focus logic, always gate focus requests with the current UI state so hidden or not-yet-mounted inputs are never targeted.
- Clear actions, submit-success refocus, and scan-step transitions should use the same safe focus mechanism rather than ad hoc direct calls.
- For scan-first PDA screens, any focus-management change should be regression-checked on device or emulator for workflows where inputs appear, disappear, or switch by mode.

## Sound And Haptics
- Sound and vibration feedback must be implemented as global capabilities, not page-local effects.
- Screens and ViewModels should emit one-time UI events such as `PdaUiEvent.PlaySound`; they should not directly play tones or trigger vibration hardware.
- Sound and vibration execution should be centralized through shared managers such as `PdaSoundManager` and `PdaHapticManager`.
- User preferences for sound and vibration must be persisted in shared local settings storage and exposed through centralized UI, such as the Mine/settings area.
- High-frequency operation outcomes should map to standardized feedback categories rather than page-specific ad hoc tones:
- `ScanSuccess` for successful scans and continuous operations
- `BusinessError` for recoverable business failures
- `SystemError` for network, auth, or service-level failures
- `ActionCompleted` for explicit completion actions
