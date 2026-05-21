# Lab Completion Confirmation

## TL;DR
> **Summary**: Replace the lab modal's bottom safety acknowledgement checkbox with a user-triggered “确认完成实验” control that records experiment completion and a persisted completion date. Completed experiments show `确认完成：YYYY-MM-DD` or a legacy fallback instead of the button.
> **Deliverables**:
> - Persisted experiment completion dates keyed by experiment ID.
> - Idempotent storage completion API preserving first completion date.
> - Lab detail modal footer button/status UI replacing the old safety checkbox.
> - Targeted automated coverage for storage, modal behavior, reset/migration, and stale safety-gate tests.
> **Effort**: Short
> **Parallel**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Final Verification

## Context
### Original Request
User asked to add a bottom button “确认完成实验” in the lab experiment modal. Clicking it should trigger experiment completion. Once completed, hide the button and show `确认完成：XXXX年XX月XX日`; user then selected display format option 3, so the exact display is `确认完成：YYYY-MM-DD`. User also asked to remove the existing bottom safety acknowledgement checkbox and use that same position for the confirmation button/status.

### Interview Summary
- Date format: `YYYY-MM-DD`.
- Chosen persistence approach: explicit persisted date object keyed by experiment ID.
- The top-right “安全守则” button must remain.
- The bottom checkbox text `我已了解安全事项，并会按说明观察内容。` must be removed.
- The new confirmation button intentionally becomes the completion trigger because experiment animation/result-card completion was removed.

### Metis Review (gaps addressed)
- Learner-state contract conflict resolved: this feature intentionally changes completion from result-card-render completion to explicit user confirmation in the lab modal.
- Legacy completed experiments without dates must not receive fabricated dates; display `确认完成：已完成`.
- Use local browser date, not UTC ISO slicing, to avoid off-by-one dates.
- Preserve the first completion date and avoid duplicate activity/events on repeated completion.
- Keep scope narrow: no modal redesign, no simulation restoration, no unlock-rule changes.

## Work Objectives
### Core Objective
Make lab experiment completion a deliberate user action in the experiment detail modal, with persisted first-completion date and clear completed-state display.

### Deliverables
- `src/modules/storage.js` supports `experimentCompletionDates` persistence, migration, reset, snapshot, and public getter.
- `src/modules/storage.js` `markExperimentCompleted(experimentId)` records a local `YYYY-MM-DD` date on first completion, remains idempotent, and emits existing `experimentcompleted` event only for first completion.
- `src/modules/lab.js` imports completion APIs, renders a bottom completion footer, binds click handling, and rerenders modal/list after completion.
- Tests updated/added under `tests/ui/` for storage migration/reset and lab modal confirmation flow.
- Existing stale tests that assert removed safety checkbox/start/simulation result flow are updated or removed only where they directly contradict this feature.

### Definition of Done (verifiable conditions with commands)
- `node scripts/validate-lab-experiments.mjs` exits 0.
- `node scripts/validate-supporting-data.mjs` exits 0.
- `npm run build` exits 0.
- `npx playwright test tests/ui/storage-migration.spec.ts tests/ui/settings-reset.spec.ts tests/ui/lab-textbook-experiments.spec.ts` exits 0.
- `npm run validate:all:safe` exits 0.
- Playwright evidence files exist for lab confirmation button/status behavior.

### Must Have
- Button copy exactly: `确认完成实验`.
- Status prefix exactly: `确认完成：`.
- Date display for new completions exactly `YYYY-MM-DD`, using local browser date.
- Legacy missing-date fallback exactly `确认完成：已完成`.
- No direct mutation of `window.appState`.
- Confirmation must use storage APIs.
- Completion date must persist across reload.

### Must NOT Have
- Do not restore experiment animation/simulation as part of this change.
- Do not redesign the modal layout beyond replacing the bottom checkbox block.
- Do not remove the top-right `安全守则` button.
- Do not fabricate historical dates for existing completed IDs.
- Do not overwrite original completion dates on repeated calls.
- Do not alter lab experiment data records or unlock requirements except existing completed-experiment behavior.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after with targeted regression tests; write/adjust tests before implementation inside each task when feasible.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 storage contract, Task 3 test cleanup reconnaissance/update planning can run after reading current tests but must not land contradictory UI tests before Task 2.
Wave 2: Task 2 lab modal UI depends on Task 1 APIs; Task 4 targeted Playwright depends on Tasks 1-2 and incorporates Task 3 findings.

### Dependency Matrix
| Task | Blocks | Blocked By |
|---|---|---|
| 1. Storage completion dates | 2, 4 | None |
| 2. Lab modal confirmation footer | 4 | 1 |
| 3. Remove stale safety/simulation assertions | 4 | None |
| 4. Targeted verification and evidence | Final Verification | 1, 2, 3 |

### Agent Dispatch Summary
| Wave | Task Count | Categories |
|---|---:|---|
| 1 | 2 | quick, unspecified-low |
| 2 | 2 | visual-engineering, unspecified-high |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Storage completion-date contract

  **What to do**: Extend `src/modules/storage.js` so experiments have explicit persisted completion dates. Add `experimentCompletionDates: {}` to default state, serialization, migration from unversioned/v0/v1/v2/v3 envelopes, normalization, state snapshot, and reset flows. Add `formatLocalDateYYYYMMDD(date = new Date())` as a storage-local helper. Update `markExperimentCompleted(experimentId)` so the first valid call records both `completedExperiments.add(experimentId)` and `experimentCompletionDates[experimentId] = formatLocalDateYYYYMMDD()`, appends one activity, emits one `experimentcompleted` event with `{ experimentId, completedAt }`, and returns `true`. Repeated calls for an existing ID must return `false`, preserve the original date, and not append activity or emit another event. Add `getExperimentCompletionDate(experimentId)` returning the stored date string or `null`. Normalize stored dates to valid `/^\d{4}-\d{2}-\d{2}$/` strings only; invalid/missing dates for completed legacy IDs must behave like missing dates so UI can display `确认完成：已完成`.
  **Must NOT do**: Do not store full ISO timestamps for experiment completion dates. Do not backfill existing completed experiments with today's date. Do not change `completedExperiments` from Set-of-IDs semantics.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: localized state contract change in one file plus targeted tests.
  - Skills: [`test-driven-development`] - Reason: storage idempotency and migration need regression coverage.
  - Omitted: [`frontend-design`] - Storage-only task has no UI design.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [2, 4] | Blocked By: []

  **References**:
  - Pattern: `src/modules/storage.js:20-37` - default state shape.
  - Pattern: `src/modules/storage.js:379-398` - serialization fields.
  - Pattern: `src/modules/storage.js:401-469` - migration from old envelopes to current shape.
  - Pattern: `src/modules/storage.js:471-519` - persisted data normalization.
  - Pattern: `src/modules/storage.js:600-620` - state snapshot / `window.appState` inspection proxy source.
  - Pattern: `src/modules/storage.js:942-959` - current `markExperimentCompleted()` idempotent API to enhance.
  - Pattern: `src/modules/storage.js:1069-1108` - reset flows must clear new progress field.
  - Test: `tests/ui/storage-migration.spec.ts:73-85` - legacy migration test pattern.
  - Test: `tests/ui/storage-migration.spec.ts:115-170` - storage API write/persist test pattern via test hooks.
  - Test: `tests/ui/settings-reset.spec.ts:29-40,112-137` - reset expectations must include new field.

  **Acceptance Criteria**:
  - [ ] `window.appState.experimentCompletionDates` is a plain object snapshot, not a mutable source.
  - [ ] Persisted envelope `data.experimentCompletionDates` exists for new saves.
  - [ ] Legacy envelopes without `experimentCompletionDates` normalize to `{}`.
  - [ ] Invalid persisted completion date values are dropped during normalization.
  - [ ] `markExperimentCompleted('fixture-exp')` returns `true`, adds ID, sets local `YYYY-MM-DD`, appends one activity, emits `completedAt` in event detail.
  - [ ] A second `markExperimentCompleted('fixture-exp')` returns `false` and preserves original date/activity count.
  - [ ] `resetProgress()` and `resetAll()` clear `experimentCompletionDates`.

  **QA Scenarios**:
  ```
  Scenario: Storage writes first completion date once
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/storage-migration.spec.ts --grep "experiment completion date"` after adding tests that freeze Date to 2026-05-20 in page context and call `window.__elementExplorerTestHooks.storage.markExperimentCompleted('fixture-exp')` twice.
    Expected: First call true, second false, `window.appState.completedExperiments` contains `fixture-exp`, `window.appState.experimentCompletionDates.fixture-exp === '2026-05-20'`, exactly one `experimentcompleted` activity exists.
    Evidence: .sisyphus/evidence/task-1-storage-completion-date.json

  Scenario: Legacy state does not fabricate dates
    Tool: Bash
    Steps: Run the added migration test seeding `completedExperiments: ['legacy-exp']` without `experimentCompletionDates`.
    Expected: `completedExperiments` still contains `legacy-exp`; `experimentCompletionDates` is `{}`; stored envelope remains version `v3` with empty date object.
    Evidence: .sisyphus/evidence/task-1-storage-legacy-date.json
  ```

  **Commit**: YES | Message: `feat(storage): persist experiment completion dates` | Files: [`src/modules/storage.js`, `tests/ui/storage-migration.spec.ts`, `tests/ui/settings-reset.spec.ts`]

- [x] 2. Lab modal completion footer

  **What to do**: Modify `src/modules/lab.js` to import `markExperimentCompleted` and `getExperimentCompletionDate`. Replace the bottom checkbox block currently gated by `DANGEROUS_LEVELS.has(experiment.safetyLevel)` with a footer rendered for every experiment. If `isCompleted` is false, render `<button class="hud-action-btn hud-action-btn-primary lab-complete-confirm-btn" data-lab-confirm-complete>确认完成实验</button>`. If `isCompleted` is true and a date exists, render `<p class="lab-complete-confirmed" data-testid="lab-completion-confirmed">确认完成：${escapedTextDate}</p>`, where `escapedTextDate` is produced by an HTML text escaping helper or by DOM `textContent`, not attribute escaping. If completed but no date exists, render `确认完成：已完成`. In `bindStageEvents()`, bind `[data-lab-confirm-complete]` click to call `markExperimentCompleted(activeReaction.experimentId)`, then rerender the shell/modal using fresh completion state so the button disappears immediately and card badge/filter state updates.
  **Must NOT do**: Do not remove the top-right `<button class="hud-action-btn" data-lab-open-safety>安全守则</button>`. Do not keep or render `data-safety-confirm` or its old text. Do not introduce start/simulation/result-card flow.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI placement and accessible button/status styling in existing modal.
  - Skills: [`frontend-design`] - Reason: preserve polished modal layout while making a small UI change.
  - Omitted: [`threejs-animation`] - No animation/simulation work is in scope.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [4] | Blocked By: [1]

  **References**:
  - Pattern: `src/modules/lab.js:5-11` - storage imports to extend.
  - Pattern: `src/modules/lab.js:285-310` - `bindStageEvents()` event binding style.
  - Pattern: `src/modules/lab.js:602-684` - `renderReactionDetail()` modal content and checkbox location.
  - Pattern: `src/modules/lab.js:676-681` - exact bottom checkbox block to replace.
  - Pattern: `src/modules/lab.js:867-905` - modal open/update rerender mechanics.
  - API/Type: `src/modules/storage.js:942-959` - enhanced completion API from Task 1.
  - Test: `tests/ui/lab-textbook-experiments.spec.ts:135-188` - fixture injection and modal open pattern.

  **Acceptance Criteria**:
  - [ ] Uncompleted experiment modal shows exactly one visible `确认完成实验` button at the former bottom checkbox position.
  - [ ] Old checkbox input selector `input[data-safety-confirm]` is absent.
  - [ ] Old checkbox text `我已了解安全事项，并会按说明观察内容。` is absent.
  - [ ] Top-right `安全守则` button remains visible.
  - [ ] Clicking the confirmation button triggers storage completion and immediately changes modal status to `确认完成：YYYY-MM-DD`.
  - [ ] Reopening the same experiment after reload shows status immediately and no button.
  - [ ] Legacy completed experiment without date shows `确认完成：已完成` and no button.

  **QA Scenarios**:
  ```
  Scenario: User confirms an uncompleted experiment
    Tool: Playwright
    Steps: Inject a safe fixture experiment, freeze browser date to 2026-05-20, open `/#/lab`, click its `button[data-reaction-open="lab-confirm-fixture"]`, assert modal has `button[data-lab-confirm-complete]` with text `确认完成实验`, click it.
    Expected: Button hidden; `[data-testid="lab-completion-confirmed"]` has text `确认完成：2026-05-20`; `window.appState.completedExperiments` contains fixture experiment ID; `window.appState.experimentCompletionDates[experimentId] === '2026-05-20'`.
    Evidence: .sisyphus/evidence/task-2-lab-confirm-button.json

  Scenario: Removed safety checkbox does not appear
    Tool: Playwright
    Steps: Inject a dangerous fixture experiment, open modal, query `input[data-safety-confirm]` and text `我已了解安全事项，并会按说明观察内容。`; query `button[data-lab-open-safety]`.
    Expected: Checkbox count 0; old text absent; `安全守则` button visible; confirmation button visible if not completed.
    Evidence: .sisyphus/evidence/task-2-safety-checkbox-removed.json
  ```

  **Commit**: NO | Message: `feat(lab): add experiment completion confirmation` | Files: [`src/modules/lab.js`, possibly `src/styles/lab.css` if existing styles need one small class for footer spacing]

- [x] 3. Align stale lab tests with removed animation/safety-gate flow

  **What to do**: Update only tests that directly assert removed behavior. In `tests/ui/lab-textbook-experiments.spec.ts`, replace or rewrite tests named `dangerous reaction safety gate blocks launch without confirmation` and `simulation completion shows result view in detail modal` because current `src/modules/lab.js` no longer renders `data-lab-start`, `data-launch-simulation`, or result view. Convert them into confirmation-footer regression coverage or remove their stale assertions if Task 4 introduces clearer tests in the same file. In `tests/ui/lab-3d-simulation.spec.ts`, if those tests fail solely because they expect removed animation/start controls, either update them to skip with a precise reason (`Experiment animations removed; completion is confirmed in detail modal`) or rewrite only the affected assertions to use the new completion button. Do not repair unrelated 3D simulation behavior.
  **Must NOT do**: Do not restore old selectors just to satisfy stale tests. Do not delete broad test files wholesale. Do not change app behavior to match obsolete tests.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` - Reason: targeted test alignment with confirmed product change.
  - Skills: [] - Reason: no special skill needed beyond careful test editing.
  - Omitted: [`frontend-design`] - No UI implementation in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [4] | Blocked By: []

  **References**:
  - Test: `tests/ui/lab-textbook-experiments.spec.ts:292-359` - stale safety gate test expecting removed checkbox/start/launch controls.
  - Test: `tests/ui/lab-textbook-experiments.spec.ts:361-423` - stale simulation result view test expecting removed animation/result flow.
  - Test: `tests/ui/lab-3d-simulation.spec.ts:74-80,207-216` - stale start/launch selectors in 3D simulation tests.
  - User requirement: old safety acknowledgement checkbox must be cancelled/removed.

  **Acceptance Criteria**:
  - [ ] No remaining test expects `input[data-safety-confirm]` to be visible.
  - [ ] No feature test requires `data-lab-start` or `data-launch-simulation` for experiment completion.
  - [ ] Any skipped test includes an explicit product-change reason, not a generic flake reason.
  - [ ] Targeted lab tests still cover content rendering and new completion confirmation.

  **QA Scenarios**:
  ```
  Scenario: Stale selectors are removed from active assertions
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/lab-textbook-experiments.spec.ts --grep "safety gate|simulation completion|completion"` after updates.
    Expected: No test failure caused by missing `data-lab-start`, `data-launch-simulation`, or `input[data-safety-confirm]`.
    Evidence: .sisyphus/evidence/task-3-stale-lab-tests.txt

  Scenario: No accidental broad test deletion
    Tool: Bash
    Steps: Run `git diff -- tests/ui/lab-textbook-experiments.spec.ts tests/ui/lab-3d-simulation.spec.ts` and inspect changed test names.
    Expected: Only stale safety/simulation assertions are changed; unrelated content tests remain.
    Evidence: .sisyphus/evidence/task-3-test-diff.txt
  ```

  **Commit**: NO | Message: `test(lab): align completion flow tests` | Files: [`tests/ui/lab-textbook-experiments.spec.ts`, maybe `tests/ui/lab-3d-simulation.spec.ts`]

- [x] 4. End-to-end lab confirmation verification

  **What to do**: Add targeted Playwright coverage for the final user flow. Prefer adding tests to `tests/ui/lab-textbook-experiments.spec.ts` near existing modal tests. Tests must inject deterministic fixture experiments through `labExperiments`, freeze browser date to `2026-05-20`, open the lab route, verify button/status behavior, verify persistence across reload, verify old checkbox removal, verify top-right safety button remains, and write evidence JSON files. Also update `tests/ui/settings-reset.spec.ts` expectations so seeded and reset state include `experimentCompletionDates` and reset clears it while preserving settings.
  **Must NOT do**: Do not rely on visual/manual inspection. Do not use vague selectors; add stable `data-testid`/`data-lab-confirm-complete` selectors in Task 2 if needed. Do not require network/external services.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-file verification touching storage and UI persistence.
  - Skills: [`test-driven-development`] - Reason: tests define the regression contract.
  - Omitted: [`threejs-animation`] - No animation verification remains.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [Final Verification] | Blocked By: [1, 2, 3]

  **References**:
  - Test: `tests/ui/lab-textbook-experiments.spec.ts:11-22` - clean-state setup.
  - Test: `tests/ui/lab-textbook-experiments.spec.ts:135-188` - fixture injection and modal detail assertions.
  - Test: `tests/ui/lab-textbook-experiments.spec.ts:426-454` - `waitForAppReady()` and `writeEvidence()` helpers.
  - Test: `tests/ui/storage-migration.spec.ts:11-70` - storage API/idempotency test pattern.
  - Test: `tests/ui/settings-reset.spec.ts:29-40,112-168` - reset state assertions to update.
  - Command: `AGENTS.md` verification section - build and validators required before completion claims.

  **Acceptance Criteria**:
  - [ ] Test freezes Date to 2026-05-20 before calling completion.
  - [ ] Test confirms button text exactly `确认完成实验`.
  - [ ] Test confirms status text exactly `确认完成：2026-05-20` for new completion.
  - [ ] Test confirms persisted status after reload/modal reopen.
  - [ ] Test confirms legacy completed/missing-date state renders `确认完成：已完成`.
  - [ ] Test confirms old checkbox copy absent.
  - [ ] Test confirms `安全守则` remains visible.
  - [ ] Validation commands listed below pass.

  **QA Scenarios**:
  ```
  Scenario: Full confirmation flow persists across reload
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/lab-textbook-experiments.spec.ts --grep "completion confirmation"`.
    Expected: Test passes; evidence JSON shows `buttonVisibleBefore: true`, `confirmedText: "确认完成：2026-05-20"`, `persistedDate: "2026-05-20"`, `buttonVisibleAfterReload: false`.
    Evidence: .sisyphus/evidence/task-4-lab-confirmation-flow.json

  Scenario: Required validators and build pass
    Tool: Bash
    Steps: Run `node scripts/validate-lab-experiments.mjs && node scripts/validate-supporting-data.mjs && npm run build && npx playwright test tests/ui/storage-migration.spec.ts tests/ui/settings-reset.spec.ts tests/ui/lab-textbook-experiments.spec.ts && npm run validate:all:safe`.
    Expected: All commands exit 0.
    Evidence: .sisyphus/evidence/task-4-validation.txt
  ```

  **Commit**: YES | Message: `feat(lab): add experiment completion confirmation` | Files: [`src/modules/lab.js`, `src/modules/storage.js`, `tests/ui/storage-migration.spec.ts`, `tests/ui/settings-reset.spec.ts`, `tests/ui/lab-textbook-experiments.spec.ts`, maybe `tests/ui/lab-3d-simulation.spec.ts`, maybe `src/styles/lab.css`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Hands-on Playwright QA — unspecified-high (+ playwright, agent-executed only; no human manual clicking)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after Task 1 if green: `feat(storage): persist experiment completion dates`
- Commit after Tasks 2-4 if green: `feat(lab): add experiment completion confirmation`
- Do not commit generated evidence unless project convention requires it for this branch.

## Success Criteria
- New lab completions are user-triggered by `确认完成实验`.
- Completed lab modal state shows persisted `确认完成：YYYY-MM-DD`.
- Legacy completed experiments without date show `确认完成：已完成`.
- Removed checkbox text no longer appears.
- Top-right `安全守则` remains visible.
- Build, validators, and targeted Playwright tests pass.
