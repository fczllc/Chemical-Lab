# Editable Experiment Detail Modal Title

## TL;DR
> **Summary**: Add local-persistent inline editing for the experiment detail modal title. Double-click enters edit mode; √ saves a trimmed non-empty title; × cancels and restores the readonly modal title style.
> **Deliverables**:
> - Persisted reaction-title override state keyed by stable reaction identity
> - Inline edit UI in the experiment detail modal title only
> - Lab modal CSS for editable title/input/icon buttons/error state
> - Playwright coverage for edit/save/cancel/invalid/reload behavior
> **Effort**: Short
> **Parallel**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4

## Context
### Original Request
用户要求修改实验详情弹窗：标题支持双击编辑；双击后标题变成可编辑文本框；文本框右侧显示 √ 保存和 × 放弃两个图标按钮；保存或放弃后返回当前只读状态和样式。

### Interview Summary
- 保存范围：本地持久化，刷新后仍保留用户修改过的实验标题。
- 空标题规则：禁止保存空标题/纯空格标题。
- 范围：只修改实验详情弹窗标题，不修改描述、步骤、实验卡片、源数据或其它弹窗字段。

### Metis Review (gaps addressed)
- Stable identity: title overrides must be keyed by a stable reaction id/key, never by mutable display title.
- Security: user-entered titles must be rendered as text/escaped content, not passed through formula/prose HTML helpers.
- Validation: trim before save; reject whitespace-only values without leaving edit mode.
- Lifecycle: cancel restores the current saved/readonly title; reload keeps saved override; experiments without override use canonical title.
- Accessibility: input focus, aria-labels, deterministic data-testid selectors, keyboard behavior.

## Work Objectives
### Core Objective
Enable safe, local-persistent editing of the experiment detail modal title with double-click entry, inline save/cancel controls, and automated verification.

### Deliverables
- Storage support for experiment title overrides.
- Lab modal rendering/event logic for readonly and editing title states.
- CSS matching the current neon-lab modal aesthetic.
- Playwright spec covering required behavior.

### Definition of Done (verifiable conditions with commands)
- `npm run build` succeeds.
- `npx playwright test tests/ui/experiment-title-edit.spec.ts` succeeds.
- Existing relevant Playwright smoke tests still pass: `npx playwright test tests/shell/home-shell.spec.ts tests/ui/route-shells.spec.ts`.
- Manual intervention is not required; evidence files are produced under `.sisyphus/evidence/`.

### Must Have
- Double-click `[data-testid="experiment-title"]` enters edit mode.
- Edit input uses `[data-testid="experiment-title-input"]` and is focused with the current title selected or cursor-ready.
- Save button `[data-testid="experiment-title-save"]` stores trimmed non-empty value locally and returns readonly.
- Cancel button `[data-testid="experiment-title-cancel"]` discards draft and returns readonly.
- Empty/whitespace save shows `[data-testid="experiment-title-error"]` and remains in edit mode.
- Saved custom title persists after reload.
- Canonical title remains fallback where no override exists.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not mutate canonical reaction dataset objects as the persisted source of truth.
- Do not key overrides by editable title text.
- Do not enable editing for cards, lists, descriptions, steps, safety sections, or other modal fields.
- Do not render user-entered titles through `mixedProseFormulaHTML` or any HTML-producing helper.
- Do not require human visual confirmation in QA.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after with existing Playwright framework.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 storage contract, Task 3 CSS selectors/styles can proceed after agreeing data-testid names.
Wave 2: Task 2 modal behavior depends on Task 1; Task 4 tests depend on Tasks 1-3; Task 5 verification depends on all implementation tasks.

### Dependency Matrix (full, all tasks)
- Task 1: Blocks Task 2 and Task 4.
- Task 2: Blocked by Task 1; blocks Task 4.
- Task 3: Can run parallel with Task 1; blocks final visual/Playwright assertions.
- Task 4: Blocked by Tasks 1-3; blocks Task 5.
- Task 5: Blocked by Tasks 1-4.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → quick, visual-engineering.
- Wave 2 → 3 tasks → quick, unspecified-high.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add persisted experiment title override state

  **What to do**: Add a local persisted override map for experiment detail titles in `src/modules/storage.js`. Use a stable reaction identifier from the reaction object; if the existing reaction objects lack an explicit id, derive a deterministic key from the canonical dataset position or an existing stable non-editable field and document it in code comments. Add exported helpers such as `getExperimentTitleOverride(reactionKey)`, `setExperimentTitleOverride(reactionKey, title)`, and `clearExperimentTitleOverride(reactionKey)` following existing mutator patterns: update state, emit `statechange`, emit a semantic event such as `experimenttitlechange`, and schedule persistence. If the trimmed saved title equals the canonical display title, remove the override instead of storing redundant data.
  **Must NOT do**: Do not mutate `src/data/index.js`, imported `reactions`, or reaction objects. Do not store overrides keyed by the edited display title.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: contained storage API addition following existing patterns.
  - Skills: [] - No specialized skill needed beyond repo pattern following.
  - Omitted: [`frontend-design`] - no visual implementation in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 2, Task 4 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/storage.js:242-282` - statechange/event/debounced persistence pattern.
  - Pattern: `src/modules/storage.js:542-559` - simple state mutator example.
  - Pattern: `src/modules/storage.js:741-762` - experiment completion persistence example.
  - Pattern: `src/modules/storage.js:858-865` - settings update pattern.
  - Data boundary: `src/data/index.js` - canonical reactions are imported data, not the persisted override source.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run build` exits 0 after storage helper additions.
  - [ ] A temporary Playwright/localStorage check or existing storage migration test confirms the override map survives reload.
  - [ ] Saving a title equal to the canonical title removes the override entry.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Persist override map
    Tool: Bash
    Steps: Run `npm run build`.
    Expected: Build exits 0 with no storage import/export errors.
    Evidence: .sisyphus/evidence/task-1-storage-build.txt

  Scenario: Canonical-equal title clears override
    Tool: Playwright
    Steps: In the eventual UI spec, save a custom title, then save the original canonical title for the same experiment.
    Expected: Reload shows canonical title and local override entry for that reaction key is absent or empty.
    Evidence: .sisyphus/evidence/task-1-storage-clear.png
  ```

  **Commit**: YES | Message: `feat(storage): persist experiment title overrides` | Files: `src/modules/storage.js`

- [x] 2. Implement lab modal readonly/edit title behavior

  **What to do**: Update `src/modules/lab.js` so the experiment detail modal title renders through a small title helper. In readonly mode, render the effective title as escaped text inside `[data-testid="experiment-title"]` and attach `dblclick` to enter edit mode. In edit mode, render `[data-testid="experiment-title-input"]` plus inline icon buttons `[data-testid="experiment-title-save"]` and `[data-testid="experiment-title-cancel"]` inside the title editing container. Save trims input, rejects empty values by showing `[data-testid="experiment-title-error"]`, persists through Task 1 storage helpers, and returns readonly. Cancel discards the draft and returns readonly. Add keyboard behavior: Enter saves, Escape cancels, Tab follows input → save → cancel. Keep formula-rich canonical title rendering only for untouched canonical display where safe; custom user title must be text-only/escaped.
  **Must NOT do**: Do not add editing to simulation modal titles, card titles, safety/result section headings, or other fields unless they are the same experiment detail modal header shown in the screenshot. Do not use `innerHTML` with raw user input.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: localized DOM/event changes in one module.
  - Skills: [] - Existing imperative render/bind style is sufficient.
  - Omitted: [`threejs-animation`] - no 3D or animation change.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Task 4 | Blocked By: Task 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/lab.js:736-785` - modal open/close/update lifecycle.
  - Pattern: `src/modules/lab.js:402-485` - `renderStageContent()` / `renderReactionDetail()` structure.
  - Existing title: `src/modules/lab.js:419-427` - detail title currently derived from `reaction.name` with helper formatting.
  - Rebind pattern: `src/modules/lab.js:768-773` - modal content re-render followed by listener binding.
  - Modal close pattern: `src/modules/lab.js:118-144`, `src/modules/lab.js:258-305` - backdrop/Escape/data-attribute behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Double-clicking the modal title replaces readonly title with an input and √/× buttons.
  - [ ] Saving `儿童火山实验` displays that exact text in readonly mode.
  - [ ] Cancelling after typing `不应保存的标题` restores the previously saved/current title.
  - [ ] Whitespace-only save stays in edit mode and displays an error.
  - [ ] User-entered `<img src=x onerror=alert(1)>` displays as text, not executable HTML.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Save custom title
    Tool: Playwright
    Steps: Open the lab experiment detail modal; double-click `[data-testid="experiment-title"]`; fill `[data-testid="experiment-title-input"]` with `儿童火山实验`; click `[data-testid="experiment-title-save"]`.
    Expected: `[data-testid="experiment-title"]` is visible with exact text `儿童火山实验`; edit input/buttons are not visible.
    Evidence: .sisyphus/evidence/task-2-save-title.png

  Scenario: Cancel draft title
    Tool: Playwright
    Steps: With readonly title `儿童火山实验`, double-click title; fill input with `不应保存的标题`; click `[data-testid="experiment-title-cancel"]`.
    Expected: readonly title remains `儿童火山实验`; input/buttons disappear.
    Evidence: .sisyphus/evidence/task-2-cancel-title.png
  ```

  **Commit**: YES | Message: `feat(lab): edit experiment detail titles inline` | Files: `src/modules/lab.js`

- [x] 3. Style editable title controls to match the modal

  **What to do**: Update `src/styles/lab.css` to style the editable title row/input/buttons within the current lab modal aesthetic. Preserve readonly title appearance shown in the screenshot. The input should occupy the highlighted title area, have right-side inline icon buttons, visible focus state, readable Chinese text, and an error state below or adjacent that does not shift the whole modal dramatically. Use explicit classes such as `.lab-detail-title`, `.lab-detail-title-edit`, `.lab-detail-title-input`, `.lab-detail-title-actions`, `.lab-detail-title-error` if compatible with existing naming.
  **Must NOT do**: Do not introduce unrelated global button resets, generic purple gradients, or broad layout changes to the modal body.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI styling must preserve screenshot aesthetic and interaction affordance.
  - Skills: [`frontend-design`] - ensure polished modal micro-interaction and accessible focus states.
  - Omitted: [`threejs-animation`] - no scene animation.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 4 visual assertions | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/styles/lab.css:517-585` - lab modal shell/header/title styling.
  - Pattern: `src/styles/games.css:1-45` - shared HUD/action button style language.
  - Pattern: `src/styles/responsive.css:247-300` - responsive stacking conventions.
  - Screenshot requirement: title area is the large green/white headline inside the modal header.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Input and buttons fit within modal header at 1280×825 viewport.
  - [ ] Focus outline is visible for input, save, and cancel controls.
  - [ ] Error state is readable and does not cover the title controls.
  - [ ] `npm run build` exits 0.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Edit controls fit header
    Tool: Playwright
    Steps: Set viewport 1280x825; open modal; double-click title; screenshot modal header.
    Expected: input is not clipped; √ and × are visible inside the right side of the input row.
    Evidence: .sisyphus/evidence/task-3-edit-controls.png

  Scenario: Validation error is readable
    Tool: Playwright
    Steps: Enter edit mode; fill spaces; click save; screenshot title area.
    Expected: error text is visible and title editor remains usable.
    Evidence: .sisyphus/evidence/task-3-error-state.png
  ```

  **Commit**: YES | Message: `style(lab): polish editable title controls` | Files: `src/styles/lab.css`

- [x] 4. Add Playwright coverage for editable title flow

  **What to do**: Add `tests/ui/experiment-title-edit.spec.ts`. Follow existing test style: use `page.goto('/')`, data-testid selectors, localStorage isolation, viewport setup, and concrete assertions. The test must navigate/open an experiment detail modal using existing app controls; if no stable open selector exists, add minimal data-testid hooks in Task 2 rather than brittle text-only selectors. Cover save, cancel, whitespace rejection, reload persistence, canonical fallback, keyboard Enter/Escape, and escaped rendering of malicious-looking text.
  **Must NOT do**: Do not rely on manual visual confirmation. Do not use arbitrary sleeps; prefer locator assertions and `expect.poll` when waiting for persistence.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: requires end-to-end app interaction and reliable selector strategy.
  - Skills: [] - Playwright patterns already exist in repo.
  - Omitted: [`frontend-design`] - testing task, not design.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Task 5 | Blocked By: Task 1, Task 2, Task 3

  **References** (executor has NO interview context - be exhaustive):
  - Config: `playwright.config.ts` - testDir/baseURL/global setup.
  - Pattern: `tests/ui/storage-migration.spec.ts` - persistence/localStorage test style.
  - Pattern: `tests/ui/route-shells.spec.ts` - route shell assertions.
  - Pattern: `tests/ui/periodic-table-controls.spec.ts` - interaction/accessibility test style.
  - Required selectors: `[data-testid="experiment-title"]`, `[data-testid="experiment-title-input"]`, `[data-testid="experiment-title-save"]`, `[data-testid="experiment-title-cancel"]`, `[data-testid="experiment-title-error"]`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/experiment-title-edit.spec.ts` exits 0.
  - [ ] Spec verifies custom title `儿童火山实验` persists after `page.reload()`.
  - [ ] Spec verifies cancel does not persist `不应保存的标题`.
  - [ ] Spec verifies whitespace-only input remains editable and shows error.
  - [ ] Spec verifies injected-looking text is displayed as text and no dialog/pageerror fires.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full save/reload flow
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/experiment-title-edit.spec.ts --grep "saves and persists"`.
    Expected: Command exits 0; report includes save/reload assertions for `儿童火山实验`.
    Evidence: .sisyphus/evidence/task-4-save-reload.txt

  Scenario: Invalid/cancel/security flow
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/experiment-title-edit.spec.ts --grep "rejects invalid and cancels safely"`.
    Expected: Command exits 0; report includes whitespace rejection, cancel restore, and escaped title assertions.
    Evidence: .sisyphus/evidence/task-4-invalid-cancel-security.txt
  ```

  **Commit**: YES | Message: `test(lab): cover editable experiment title flow` | Files: `tests/ui/experiment-title-edit.spec.ts`, any minimal selector hooks in `src/modules/lab.js`

- [x] 5. Run build and focused regression verification

  **What to do**: Run the complete focused verification set and save command outputs/screenshots under `.sisyphus/evidence/`. Fix any failures caused by the editable title feature before entering the final verification wave.
  **Must NOT do**: Do not claim completion if any command fails. Do not skip existing smoke tests because the new spec passes.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: verification and failure triage across build and browser tests.
  - Skills: [`verification-before-completion`] - evidence-before-claims discipline.
  - Omitted: [`git-master`] - no git operation unless user explicitly asks later.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Final Verification Wave | Blocked By: Task 4

  **References** (executor has NO interview context - be exhaustive):
  - Commands from `package.json`: `npm run build`.
  - Playwright setup: `playwright.config.ts`, `tests/setup/global-setup.ts`, `tests/setup/global-teardown.ts`.
  - Relevant smoke tests: `tests/shell/home-shell.spec.ts`, `tests/ui/route-shells.spec.ts`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run build` exits 0.
  - [ ] `npx playwright test tests/ui/experiment-title-edit.spec.ts` exits 0.
  - [ ] `npx playwright test tests/shell/home-shell.spec.ts tests/ui/route-shells.spec.ts` exits 0.
  - [ ] Evidence artifacts exist for all commands.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Build verification
    Tool: Bash
    Steps: Run `npm run build` and capture output.
    Expected: Exit 0; production bundle completes.
    Evidence: .sisyphus/evidence/task-5-build.txt

  Scenario: Focused browser regression
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/experiment-title-edit.spec.ts tests/shell/home-shell.spec.ts tests/ui/route-shells.spec.ts`.
    Expected: Exit 0; editable title and existing shell/route behavior pass.
    Evidence: .sisyphus/evidence/task-5-playwright.txt
  ```

  **Commit**: NO | Message: n/a | Files: n/a

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit Task 1 after storage helpers pass build.
- Commit Tasks 2-3 together only if UI behavior and styling are tightly coupled; otherwise use the task-specific commit messages.
- Commit Task 4 after the new Playwright spec passes.
- Do not commit Task 5 evidence-only outputs unless repository convention already tracks `.sisyphus/evidence/`.

## Success Criteria
- User can double-click the experiment detail modal title, edit it, save with √, cancel with ×, and return to readonly styling.
- Local persistence survives reload and does not alter canonical data.
- Empty titles are blocked with visible feedback.
- User-entered titles are safe text.
- Build and focused Playwright regression commands pass.
