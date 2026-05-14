# Settings Modal Layout and Learning Data Reset

## TL;DR
> **Summary**: Update the existing settings modal to match the provided structural sketch while preserving the app's current dark/color theme, then add a child-friendly clear-data flow that uses a custom second confirmation and clears only learning data. Work is TDD-first with focused Playwright coverage for layout, cancel, confirm, settings preservation, and reload persistence.
> **Deliverables**:
> - `src/data/images/cat.jpg` exists as a copy of current `src/images/cat.jpg` and is displayed circularly in the settings modal.
> - Settings modal shows `版本：1.0`, `内容参考人教版教材`, the existing performance mode row, and a clear-data row/button.
> - Clear-data button opens a custom in-app confirmation; cancel changes nothing; confirm clears learning/progress/scores while preserving settings/performance mode.
> - New/updated Playwright tests verify the behavior end-to-end.
> **Effort**: Short
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 4 → Task 6

## Context

### Original Request
- 修改设置弹窗如图2所示意。
- 图片在 `src/data/images/cat.jpg`。
- 图2是布局示意图，颜色按当前的即可。
- 清除数据按钮点击后，删除所有已本地保存的用户学习数据，包括进度、成绩，相当于系统初始化。
- 清除按钮点击后，要弹窗再确认一下。

### Interview Summary
- Clear-data action preserves settings such as performance mode. It must use existing `resetProgress()` semantics, not `resetAll()`.
- Cat image path must be satisfied by copying/ensuring `src/data/images/cat.jpg` from existing `src/images/cat.jpg`.
- Test strategy is TDD: write/update Playwright tests first, observe failing coverage, then implement.
- Post-reset behavior defaults to no full-page reload; UI should refresh through existing `statereset`/state update mechanisms. Reload is only for persistence verification in tests.

### Metis Review (gaps addressed)
- Use a custom in-app confirmation instead of native `window.confirm()` for testability and consistent child-friendly UX.
- Include a reset semantics matrix and explicitly forbid `resetAll()` for the clear-data button.
- Define confirmation labels/copy and cancel/confirm outcomes.
- Verify both immediate state and persisted state after reload.
- Assert the cat image loads with non-zero natural dimensions and circular presentation via CSS.
- Keep the sketch structural only; do not replace current colors/theme.

## Work Objectives

### Core Objective
Create a decision-complete settings modal update that adds the requested layout content and a safe learning-data reset flow without changing unrelated product behavior, theme colors, or chemistry content.

### Deliverables
- `src/data/images/cat.jpg` copied from `src/images/cat.jpg` with no image modification/compression.
- Updated `index.html` settings modal markup around existing `#settings-modal`.
- Updated `src/main.js` settings wiring for clear-data button and custom confirmation.
- Updated `src/styles/layout.css` settings modal styles using existing CSS variables.
- New `tests/ui/settings-reset.spec.ts` and targeted update to `tests/shell/home-shell.spec.ts` only if needed for existing smoke expectations.
- Evidence files under `.sisyphus/evidence/` for failing TDD checkpoint, passing focused Playwright, build, and final verification.

### Definition of Done (verifiable conditions with commands)
- `npx playwright test tests/ui/settings-reset.spec.ts --project=chromium` exits `0` and covers layout, image, cancel, confirm, settings preservation, and reload persistence.
- `npx playwright test tests/shell/home-shell.spec.ts --project=chromium` exits `0` and existing settings smoke remains valid.
- `npm run build` exits `0` with no missing image/asset errors.
- Confirming clear data leaves `performanceMode` and settings preserved while resetting learning/progress/scores/achievements/game data to default empty values.
- Cancelling confirmation leaves seeded localStorage and `window.appState` unchanged.

### Must Have
- Use `src/data/images/cat.jpg` in the modal image source/runtime resolution.
- Show exact visible text `版本：1.0` and `内容参考人教版教材`.
- Preserve existing performance mode behavior and current color/theme variables.
- Add clear-data row/button label `清除数据` and action label `清除`.
- Add custom second confirmation with exact copy:
  - Title: `确认清除学习数据？`
  - Body: `这会清除学习进度、成绩、收集、成就和游戏记录，但会保留当前设置。此操作不可撤销。`
  - Cancel button: `取消`
  - Confirm button: `确认清除`
- Use `resetProgress()` semantics. Do not call `resetAll()` from the clear-data button.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not change global theme/colors to match the white sketch.
- Do not introduce React/Vue/frameworks, new dependencies, or broad component rewrites.
- Do not change chemistry datasets, quiz content, achievements rules, routing, or unrelated modules.
- Do not add new settings categories such as language/theme/account/export/import.
- Do not modify/compress/replace the cat image binary beyond copying it.
- Do not use external URLs or base64-encoded image strings.
- Do not rely on manual visual verification as the primary gate.
- Do not use vague selectors if stable `aria-label`/`data-testid` attributes are needed.

### Reset Semantics Matrix
| State area | Expected after confirmed clear | Reference/Reason |
|---|---|---|
| `learnedElements` | empty/default | learning progress |
| `collectedElements` | empty/default | collection progress |
| `quizScores` | empty/default | scores explicitly requested |
| `completedExperiments` | empty/default | learning progress |
| `experimentTitleOverrides` | empty/default if currently cleared by `resetProgress()` | progress-adjacent persisted data |
| `unlockedAchievements` | empty/default | learning progress/achievements |
| `achievementDates` | empty/default | achievement metadata |
| `gameScores` | empty/default | score/progress data |
| `gamePlays` | empty/default | game progress metadata |
| `activityLog` | empty/default | learning activity history |
| `compareList` | default/empty if currently reset by `resetProgress()` | transient learning UI state; follow existing API |
| `currentElement` | default if currently reset by `resetProgress()` | transient learning UI state; follow existing API |
| `settings.performanceMode` | preserved | user confirmed settings must be preserved |
| other `settings` fields | preserved | use `resetProgress()`, not `resetAll()` |

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: TDD with Playwright (`@playwright/test`) using existing `playwright.config.ts` and global setup/teardown.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.
- Primary commands:
  - `npx playwright test tests/ui/settings-reset.spec.ts --project=chromium`
  - `npx playwright test tests/shell/home-shell.spec.ts --project=chromium`
  - `npm run build`

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. This plan is intentionally small; waves below target are acceptable because the change is bounded and has a single UI/behavior critical path.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 (TDD focused spec), Task 2 (asset path preparation)
Wave 2: Task 3 (markup/CSS layout), Task 4 (JS confirmation/reset wiring; coordinate with Task 3 using fixed selector contract: `settings-clear-data`, `settings-clear-confirm-dialog`, `settings-clear-cancel`, `settings-clear-confirm`)
Wave 3: Task 5 (smoke/regression updates), Task 6 (targeted verification and evidence)

### Dependency Matrix (full, all tasks)
| Task | Blocks | Blocked By |
|---|---|---|
| 1. Add focused Playwright tests | 3, 4, 6 | none |
| 2. Ensure cat asset path | 3, 6 | none |
| 3. Update settings modal markup/styles | 5, 6 | 1, 2 |
| 4. Wire confirmation and reset behavior | 5, 6 | 1 |
| 5. Update settings smoke/regression coverage | 6 | 3, 4 |
| 6. Run verification and collect evidence | Final Verification | 1, 2, 3, 4, 5 |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Task Count | Categories |
|---|---:|---|
| 1 | 2 | `quick`, `quick` |
| 2 | 2 | `visual-engineering`, `quick` |
| 3 | 2 | `quick`, `quick` |

## TODOs
> Implementation + Test = ONE task where feasible. This plan is TDD-first, so Task 1 intentionally creates failing coverage before implementation.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add failing focused Playwright coverage for settings reset

  **What to do**: Create `tests/ui/settings-reset.spec.ts` before implementation. Follow localStorage seeding patterns from `tests/ui/storage-migration.spec.ts` and UI interaction conventions from `tests/shell/home-shell.spec.ts`. The spec must cover: opening settings, cat image/version/reference text, performance row, clear-data row/button, custom confirmation appears, cancel preserves seeded state, confirm clears learning data while preserving settings, reload persistence. Run it once before implementation and capture the expected failing output because UI/confirmation is not implemented yet.
  **Must NOT do**: Do not implement app changes in this task. Do not use native browser dialog handling (`page.on('dialog')`) because final UX must be custom in-app confirmation. Do not write vague snapshot-only assertions.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: targeted Playwright spec using existing test patterns.
  - Skills: [`test-driven-development`] - TDD workflow and failing-test checkpoint.
  - Omitted: [`frontend-design`] - no UI implementation in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [3, 4, 6] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `tests/ui/storage-migration.spec.ts` - localStorage seeding, app readiness, persisted envelope assertions.
  - Pattern: `tests/shell/home-shell.spec.ts` - settings modal smoke and performance toggle expectations.
  - API/Type: `src/modules/storage.js:2-11` - storage key/schema/default settings.
  - API/Type: `src/modules/storage.js:20-36` - default app state fields to seed and assert.
  - Pattern: `playwright.config.ts` - existing Chromium/baseURL/global setup.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/settings-reset.spec.ts --project=chromium` runs and fails before implementation for missing requested UI/confirmation controls; save output to `.sisyphus/evidence/task-1-settings-reset-red.txt`.
  - [ ] The spec seeds concrete learning data: `learnedElements` includes `"H"`, `collectedElements` includes `"O"`, `quizScores` includes `basic-elements: 80`, `completedExperiments` includes `"water-cycle"`, `unlockedAchievements` includes `"first-element"`, `gameScores` includes a non-zero score, and `settings.performanceMode` is set to the app's high-performance/enabled value (preserve the actual storage shape, e.g. string mode if current code uses one, not a forced boolean).
  - [ ] The spec asserts cancel leaves the seeded persisted state unchanged.
  - [ ] The spec asserts confirm clears learning/progress/scores/achievements/game data and preserves the seeded high-performance/enabled `settings.performanceMode` value exactly, both immediately and after `page.reload()`.
  - [ ] The spec asserts the image locator has `naturalWidth > 0` and circular computed presentation (`border-radius` equivalent to a circle or `50%`).

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: RED test proves missing requested UI
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/settings-reset.spec.ts --project=chromium`; redirect/capture output to `.sisyphus/evidence/task-1-settings-reset-red.txt`.
    Expected: Command exits non-zero before implementation because `src/data/images/cat.jpg` image/clear confirmation UI is not yet present; failure is from missing requested UI, not syntax/test infrastructure failure.
    Evidence: .sisyphus/evidence/task-1-settings-reset-red.txt

  Scenario: Test file itself is syntactically valid
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/settings-reset.spec.ts --project=chromium --list`.
    Expected: Playwright lists the new tests without TypeScript/syntax/config errors.
    Evidence: .sisyphus/evidence/task-1-settings-reset-list.txt
  ```

  **Commit**: NO | Message: `test(settings): cover learning data reset flow` | Files: [`tests/ui/settings-reset.spec.ts`, `.sisyphus/evidence/task-1-settings-reset-red.txt`, `.sisyphus/evidence/task-1-settings-reset-list.txt`]

- [x] 2. Ensure requested cat asset path exists

  **What to do**: Ensure `src/data/images/cat.jpg` exists by copying the existing `src/images/cat.jpg` exactly. If `src/data/images/` does not exist, create it. Do not modify, optimize, compress, rename, or replace the binary. The implementation may reference this asset from markup/JS/CSS in a Vite-safe way, but the file path itself must exist because the user explicitly specified it.
  **Must NOT do**: Do not delete `src/images/cat.jpg`. Do not introduce external image URLs. Do not base64-inline the image. Do not change unrelated files under `src/data`.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: bounded asset file operation and verification.
  - Skills: [] - no specialized implementation skill needed.
  - Omitted: [`frontend-design`] - no layout/design work in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [3, 6] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Source Asset: `src/images/cat.jpg` - existing cat image found during exploration.
  - Required Asset: `src/data/images/cat.jpg` - path specified by user and must exist after implementation.
  - Config: `vite.config.js:8-11` - `assetsInlineLimit: 0`; build should emit referenced source assets rather than inline them.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/data/images/cat.jpg` exists.
  - [ ] `src/images/cat.jpg` still exists.
  - [ ] Binary/file hash or byte comparison confirms `src/data/images/cat.jpg` matches `src/images/cat.jpg` exactly at the time of copy.
  - [ ] No unrelated files under `src/data` are modified except creating `src/data/images/` and the copied `cat.jpg`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Asset path exists and matches source image
    Tool: Bash
    Steps: Run a hash or byte comparison between `src/images/cat.jpg` and `src/data/images/cat.jpg`.
    Expected: Comparison reports identical files; both paths exist.
    Evidence: .sisyphus/evidence/task-2-cat-asset-compare.txt

  Scenario: Production build can resolve referenced assets after later UI wiring
    Tool: Bash
    Steps: After Task 3, run `npm run build`.
    Expected: Build exits `0`; no missing `cat.jpg` or unresolved asset error.
    Evidence: .sisyphus/evidence/task-2-cat-asset-build.txt
  ```

  **Commit**: NO | Message: `chore(settings): add settings cat asset` | Files: [`src/data/images/cat.jpg`, `.sisyphus/evidence/task-2-cat-asset-compare.txt`]

- [x] 3. Update settings modal markup and styles to match structural sketch

  **What to do**: Update existing settings modal markup in `index.html:317-334` without changing the existing open trigger at `index.html:56-65`. Keep `#settings-modal`, `#settings-close`, and `#performance-mode-toggle` compatible with current `main.js`. Add a centered circular cat image, version/reference text, a card-like performance row with existing toggle, and a card-like clear-data row with `清除数据` title, description `清除所有学习进度和成绩，系统初始化`, and action button text `清除`. Add stable accessible labels and/or `data-testid` attributes for Playwright if existing selectors are insufficient: `settings-cat-image`, `settings-version`, `settings-reference`, `settings-clear-data`, `settings-clear-confirm-dialog`, `settings-clear-cancel`, `settings-clear-confirm`. Extend `src/styles/layout.css:1667-1756` using existing variables, keeping current dark/glass/neon color system. Make the image circular using CSS crop/presentation, not by editing the image.
  **Must NOT do**: Do not change the whole modal to the white sketch colors. Do not remove performance mode behavior/ID. Do not alter unrelated modal styles beyond the settings modal. Do not implement clear reset logic here beyond markup hooks if Task 4 owns JS.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: frontend layout/styling work requiring fidelity to sketch and existing theme.
  - Skills: [`frontend-design`] - production-grade UI implementation while preserving current aesthetic.
  - Omitted: [`threejs-animation`] - no 3D/animation change.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [5, 6] | Blocked By: [1, 2] | Coordination Contract: Task 4 must use these fixed selectors from this task: `settings-clear-data`, `settings-clear-confirm-dialog`, `settings-clear-cancel`, `settings-clear-confirm`.

  **References** (executor has NO interview context - be exhaustive):
  - Markup: `index.html:317-334` - current settings modal to update.
  - Trigger: `index.html:56-65` - existing settings button/open trigger must remain compatible.
  - CSS: `src/styles/layout.css:1667-1756` - current settings modal/card/toggle styles.
  - Tokens: `src/styles/base.css:9-70` - current color/theme variables to reuse.
  - Toggle behavior: `src/main.js:126-175` - existing IDs/event handlers that must continue to work.
  - Asset: `src/data/images/cat.jpg` - required displayed cat image after Task 2.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Settings modal still opens from the existing settings trigger and closes via `#settings-close`, backdrop click, and any existing close behavior tested in `tests/shell/home-shell.spec.ts`.
  - [ ] Modal contains visible text `版本：1.0` and `内容参考人教版教材`.
  - [ ] Modal contains visible `清除数据`, description `清除所有学习进度和成绩，系统初始化`, and button text `清除`.
  - [ ] Existing `#performance-mode-toggle` remains present, visible/operable, and styled as the app's current toggle.
  - [ ] Styles use existing CSS variables (`--bg-*`, `--text-*`, `--border-subtle`, `--neon-cyan` or related current tokens) rather than hard-coded white mockup palette.
  - [ ] Cat image loads from the required asset path/runtime URL and is rendered circularly with non-zero natural dimensions.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Settings layout content appears
    Tool: Playwright
    Steps: Open `/`; click the existing settings trigger; assert modal visible; assert cat image, `版本：1.0`, `内容参考人教版教材`, performance row, and clear-data row are visible.
    Expected: All requested elements are visible; no console/page errors occur.
    Evidence: .sisyphus/evidence/task-3-settings-layout.txt

  Scenario: Existing performance toggle remains usable
    Tool: Playwright
    Steps: Open settings; read `#performance-mode-toggle`; click/toggle it; assert checked state changes and persists through existing settings behavior.
    Expected: Toggle works as before; no clear-data UI interaction is triggered by toggling performance mode.
    Evidence: .sisyphus/evidence/task-3-performance-toggle.txt
  ```

  **Commit**: NO | Message: `feat(settings): refresh settings modal layout` | Files: [`index.html`, `src/styles/layout.css`, `.sisyphus/evidence/task-3-settings-layout.txt`, `.sisyphus/evidence/task-3-performance-toggle.txt`]

- [x] 4. Wire custom confirmation and learning-data reset behavior

  **What to do**: Update `src/main.js` settings wiring around `src/main.js:126-175` to import/use `resetProgress()` from `src/modules/storage.js` and bind the new clear-data button. Use the fixed selector contract from Task 3: `settings-clear-data`, `settings-clear-confirm-dialog`, `settings-clear-cancel`, `settings-clear-confirm`. Implement a custom in-app confirmation dialog/overlay inside or alongside the settings modal using deterministic selectors/labels. On clear button click, show confirmation. On cancel, close only the confirmation and do not mutate localStorage or `window.appState`. On confirm, call `resetProgress()` exactly once, preserve settings/performance mode using the app's existing storage type/value, close confirmation, keep settings modal usable or close it consistently, and trigger/allow existing `statereset` listeners to update visible stats. If immediate visible UI remains stale under Playwright, add the smallest necessary refresh/listener using existing event patterns from `main.js:112-124` and `updateStats()` at `main.js:206-235`.
  **Must NOT do**: Do not call `resetAll()`. Do not clear localStorage by removing the whole storage key unless tests and plan are explicitly updated; current decision is `resetProgress()` semantics. Do not reset `settings.performanceMode`. Do not use native `window.confirm()`.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: bounded event binding and storage API integration.
  - Skills: [`test-driven-development`] - implement against failing Playwright tests.
  - Omitted: [`systematic-debugging`] - only needed if tests fail unexpectedly after implementation.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [5, 6] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Behavior: `src/main.js:126-175` - current settings open/close/toggle handlers.
  - Events: `src/main.js:112-124` - existing `statereset`/state event wiring.
  - Stats Refresh: `src/main.js:206-235` - `updateStats()` for visible header/mini-stat refresh.
  - Storage API: `src/modules/storage.js:977-998` - `resetProgress()`; intended API for this task.
  - Forbidden API: `src/modules/storage.js:1000-1015` - `resetAll()` exists but must not be used for this button.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Clicking `清除` opens a custom in-app confirmation with exact title/body/buttons defined in Must Have.
  - [ ] Clicking `取消` leaves seeded learning data and settings unchanged in localStorage and `window.appState`.
  - [ ] Clicking `确认清除` clears seeded learning/progress/scores/achievement/game data using `resetProgress()` semantics.
  - [ ] `settings.performanceMode` remains exactly the seeded high-performance/enabled value after confirm and after `page.reload()`.
  - [ ] Confirm flow emits/uses existing reset update path so visible progress counts reset without requiring manual user action.
  - [ ] Code contains no `resetAll()` call wired to settings clear data.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Cancel confirmation preserves all data
    Tool: Playwright
    Steps: Seed localStorage with learned/collected/quiz/experiment/achievement/game data and `settings.performanceMode` set to the app's high-performance/enabled value; open settings; click `清除`; click `取消`; inspect localStorage and `window.appState`.
    Expected: Every seeded learning field and `settings.performanceMode` remain unchanged exactly; confirmation closes; no console/page errors.
    Evidence: .sisyphus/evidence/task-4-clear-cancel.txt

  Scenario: Confirm clears learning data but preserves settings
    Tool: Playwright
    Steps: Seed the same data; open settings; click `清除`; click `确认清除`; inspect localStorage and `window.appState`; reload page; inspect again.
    Expected: Learning/progress/scores/achievements/game data are default/empty immediately and after reload; `settings.performanceMode` remains the seeded high-performance/enabled value exactly; visible progress counts reset.
    Evidence: .sisyphus/evidence/task-4-clear-confirm.txt
  ```

  **Commit**: NO | Message: `feat(settings): confirm and clear learning data` | Files: [`src/main.js`, `.sisyphus/evidence/task-4-clear-cancel.txt`, `.sisyphus/evidence/task-4-clear-confirm.txt`]

- [x] 5. Preserve existing settings smoke coverage and regressions

  **What to do**: Run and, only if needed, minimally update `tests/shell/home-shell.spec.ts` so existing settings modal smoke still reflects the new layout while preserving the existing performance toggle check. Do not weaken assertions. If adding stable labels/test IDs in Task 3 changed selectors, update the smoke test to prefer accessible roles/text while still checking `#performance-mode-toggle` exists.
  **Must NOT do**: Do not remove existing settings smoke assertions. Do not broaden this into unrelated route/table/content test rewrites. Do not modify Playwright config unless the new focused test proves config is broken.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small regression test maintenance.
  - Skills: [`test-driven-development`] - maintain test signal after implementation.
  - Omitted: [`frontend-design`] - no UI design changes in this task.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [6] | Blocked By: [3, 4]

  **References** (executor has NO interview context - be exhaustive):
  - Test: `tests/shell/home-shell.spec.ts` - existing settings modal smoke coverage.
  - New Test: `tests/ui/settings-reset.spec.ts` - focused reset/layout coverage from Task 1.
  - Markup: `index.html:317-334` - updated settings modal.
  - Behavior: `src/main.js:126-175` - modal open/close and performance toggle behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/shell/home-shell.spec.ts --project=chromium` exits `0`.
  - [ ] Smoke coverage still proves settings modal opens and `#performance-mode-toggle` is visible/attached.
  - [ ] Any update to `tests/shell/home-shell.spec.ts` is limited to selector/text changes required by the new layout.
  - [ ] No focused reset assertions are duplicated unnecessarily from `tests/ui/settings-reset.spec.ts`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Existing settings shell smoke passes
    Tool: Bash
    Steps: Run `npx playwright test tests/shell/home-shell.spec.ts --project=chromium`.
    Expected: Command exits `0`; settings modal opens and performance toggle remains covered.
    Evidence: .sisyphus/evidence/task-5-home-shell.txt

  Scenario: Smoke test remains scoped
    Tool: Bash
    Steps: Review git diff for `tests/shell/home-shell.spec.ts` if modified.
    Expected: Diff only updates selectors/assertions affected by settings layout; no unrelated smoke weakening/removal.
    Evidence: .sisyphus/evidence/task-5-home-shell-diff.txt
  ```

  **Commit**: NO | Message: `test(settings): maintain settings shell smoke` | Files: [`tests/shell/home-shell.spec.ts`, `.sisyphus/evidence/task-5-home-shell.txt`, `.sisyphus/evidence/task-5-home-shell-diff.txt`]

- [x] 6. Run targeted verification and capture evidence

  **What to do**: Run the full targeted verification set after implementation: focused settings reset Playwright, existing settings shell smoke, and production build. Capture command outputs in `.sisyphus/evidence/`. If any command fails, fix the underlying implementation/test issue and rerun until all targeted gates pass. Also inspect that no console/page errors occur in Playwright except known tolerated favicon noise if already tolerated by existing tests.
  **Must NOT do**: Do not claim completion without command evidence. Do not skip failing tests. Do not replace failing automation with manual visual confirmation.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: verification/evidence collection with targeted commands.
  - Skills: [`verification-before-completion`] - evidence before completion claims.
  - Omitted: [`review-work`] - final verification wave separately performs review agents.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [Final Verification] | Blocked By: [1, 2, 3, 4, 5]

  **References** (executor has NO interview context - be exhaustive):
  - Config: `package.json:6-33` - available scripts including `npm run build`; no npm test script.
  - Config: `playwright.config.ts` - Playwright command setup.
  - Test: `tests/ui/settings-reset.spec.ts` - focused settings reset coverage.
  - Test: `tests/shell/home-shell.spec.ts` - existing settings shell smoke.
  - Evidence convention: `.sisyphus/evidence/` - existing evidence directory and plan convention.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/settings-reset.spec.ts --project=chromium` exits `0`; output saved to `.sisyphus/evidence/task-6-settings-reset-pass.txt`.
  - [ ] `npx playwright test tests/shell/home-shell.spec.ts --project=chromium` exits `0`; output saved to `.sisyphus/evidence/task-6-home-shell-pass.txt`.
  - [ ] `npm run build` exits `0`; output saved to `.sisyphus/evidence/task-6-build-pass.txt`.
  - [ ] Evidence confirms no missing `src/data/images/cat.jpg` asset error, no reset-related console/page errors, and settings preservation after reload.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Targeted Playwright suite passes
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/settings-reset.spec.ts --project=chromium` and `npx playwright test tests/shell/home-shell.spec.ts --project=chromium`.
    Expected: Both commands exit `0`; focused test proves layout, cancel, confirm, and reload persistence.
    Evidence: .sisyphus/evidence/task-6-settings-reset-pass.txt and .sisyphus/evidence/task-6-home-shell-pass.txt

  Scenario: Production build passes
    Tool: Bash
    Steps: Run `npm run build`.
    Expected: Command exits `0`; no missing asset/import/syntax errors.
    Evidence: .sisyphus/evidence/task-6-build-pass.txt
  ```

  **Commit**: NO | Message: `test(settings): verify settings reset flow` | Files: [`.sisyphus/evidence/task-6-settings-reset-pass.txt`, `.sisyphus/evidence/task-6-home-shell-pass.txt`, `.sisyphus/evidence/task-6-build-pass.txt`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after all implementation tasks and verification pass if the user explicitly asks for a commit.
- Suggested commit message: `feat(settings): add learning data reset flow`
- Commit files expected: `index.html`, `src/main.js`, `src/styles/layout.css`, `src/data/images/cat.jpg`, `tests/ui/settings-reset.spec.ts`, optionally `tests/shell/home-shell.spec.ts`, and evidence files if project convention requires committing evidence.

## Success Criteria
- Settings modal visually follows the supplied layout structure while retaining current app colors.
- Cat image is loaded from `src/data/images/cat.jpg`, displays circularly, and has non-zero natural dimensions in Playwright.
- Version/reference copy appears exactly as requested.
- Clear-data flow has a custom second confirmation with deterministic cancel/confirm behavior.
- Confirmed clear removes learning data and persisted progress/scores while preserving settings/performance mode.
- Cancel path and reload persistence are covered by automated Playwright assertions.
- Build and targeted Playwright tests pass with evidence captured.
