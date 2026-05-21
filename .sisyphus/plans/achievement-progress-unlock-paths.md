# Achievement Progress Unlock Paths

## TL;DR
> **Summary**: Implement Option B: every achievement card gets a concrete user action path, manual textbook achievements require clicking `完成学习`, and mapped textbook progress is derived from unlocked achievements rather than raw learning-segment state.
> **Deliverables**:
> - Persistent `completedLearningSegments` learner-state field with migration to schema `v3`.
> - Achievement card action controls for every condition type.
> - `manualReviewAfterPromotion` unlock support gated by reviewed source metadata plus explicit completion.
> - Progress-page learning segment UI with `完成学习` confirmation.
> - Playwright, migration, validator, and build verification.
> **Effort**: Medium
> **Parallel**: YES - 5 ordered waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3+4 → Task 5 → Task 6 → Task 7 → Final Verification

## Context
### Original Request
- 用户指出：成就和进度两个模块有关联；没达成成就，就不会有进度。
- 成就里的所有卡片都必须有能解锁的操作途径。
- 方案 B 采用“用户完成对应教材片段学习后解锁”。
- 用户确认：教材片段必须点击 `完成学习` 按钮确认，打开页面不自动完成。

### Interview Summary
- Existing learning achievements unlock when an element detail panel opens: `renderTable.js` calls `markElementLearned()`, storage emits state events, `achievements.js` evaluates `learnedElements` conditions.
- `manualReviewAfterPromotion` achievements currently have no user-operable front-end path and `matchesCondition()` returns false for that type.
- Progress currently computes curriculum topics from raw learned elements, experiments, and quiz scores; manual textbook achievements must not produce visible progress unless the matching achievement is unlocked.
- The implementation should be lightweight: use the existing progress page as the completion host, not a full textbook reader.

### Metis Review (gaps addressed)
- Canonical manual learning segment ID: use `curriculumTags[0]` for `manualReviewAfterPromotion` achievements.
- Storage contract: bump schema from `v2` to `v3` and include migration/normalization/reset coverage.
- Scope guardrail: do not build reviewer roles, backend APIs, or a textbook Markdown reader.
- Test guardrail: add negative tests proving navigation/opening alone does not unlock or update progress.
- Oracle phase 2 guardrails incorporated: corrected dependency waves, no evidence commits by default, explicit test hook/import strategy, event ordering after completion, all-manual-achievement coverage, safe rendering requirements, stage completion semantics, and final review acceptance criteria.

## Work Objectives
### Core Objective
Make achievement unlocks the authoritative source for mapped textbook/manual-review progress while preserving existing element, quiz, lab, game, and storage contracts.

### Deliverables
- Storage support for explicit learning segment completion evidence.
- Achievement condition evaluation for `manualReviewAfterPromotion`.
- Achievement card action controls for all current condition types.
- Progress page UI for manual learning segments with explicit `完成学习` completion.
- Data validator updates for manual achievement invariants.
- Playwright tests covering unlock path, no-auto-unlock, persistence, reset, action coverage, and progress coupling.

### Definition of Done (verifiable conditions with commands)
- `npx playwright test tests/ui/achievements-progress-coupling.spec.ts` exits `0`.
- `npx playwright test tests/ui/storage-migration.spec.ts tests/ui/settings-reset.spec.ts` exits `0`.
- `node scripts/validate-supporting-data.mjs` exits `0` and validates manual achievement invariants.
- `npm run validate:all:safe` exits `0`.
- Evidence files exist under `.sisyphus/evidence/` for each task QA scenario.

### Must Have
- Existing learner-state contract from `AGENTS.md` remains intact: `learnedElements` and `collectedElements` still update on first full detail-panel open.
- `completedLearningSegments` is raw evidence only; it must not directly drive manual textbook progress without matching unlocked achievement.
- Every `.achievement-card` renders exactly one visible, keyboard-operable action control.
- Manual textbook completion only happens via explicit `完成学习` click.
- Manual achievement unlock requires both `sourceReviewStatus === 'reviewed'` and a matching completed learning segment.
- Newly interpolated metadata must be safely escaped or DOM-built before entering `innerHTML`/attributes: achievement IDs, curriculum tags, source headings, source paths, line ranges, and display paths.
- Manual textbook completion may affect only mapped manual curriculum topic rows and achievement percentage; it must not advance the five-stage path solely through manual textbook completion unless existing non-manual curriculum rules already did so.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Must not auto-complete learning segments on navigation, scroll, visibility, or page open.
- Must not build a full textbook reader, reviewer workflow, user roles, backend API, or content editor.
- Must not relock or delete existing unlocked achievements during migration.
- Must not change unrelated story/media/lab/game UI behavior.
- Must not leave internal strings such as `manualReviewAfterPromotion` as the user-facing unlock instruction.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: TDD / tests-first using Playwright plus existing Node validators.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. This plan has a constrained dependency graph; most work is sequential because tests, storage, and manual-unlock semantics are shared dependencies.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 (tests + data invariants)
Wave 2: Task 2 (storage schema foundation)
Wave 3: Task 3 (achievement actions) and Task 4 (manual unlock evaluation) in parallel after Task 2
Wave 4: Task 5 (progress completion UI/coupling), then Task 6 (migration/reset regression)
Wave 5: Task 7 (final validators and polish)

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | None | 2, 3, 4, 5, 6, 7 |
| 2 | 1 | 3, 4, 5, 6 |
| 3 | 1, 2 | 5, 7 |
| 4 | 1, 2 | 5, 6, 7 |
| 5 | 1, 2, 3, 4 | 6, 7 |
| 6 | 2, 4, 5 | 7 |
| 7 | 1, 2, 3, 4, 5, 6 | Final Verification |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Task Count | Categories |
|------|------------|------------|
| 1 | 1 | `unspecified-high` |
| 2 | 1 | `quick` |
| 3 | 2 | `visual-engineering`, `quick` |
| 4 | 2 | `unspecified-high`, `unspecified-high` |
| 5 | 1 | `quick` |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add failing Playwright and validator coverage for achievement-gated manual learning

  **What to do**: Create the test and validator expectations before implementation. Add `tests/ui/achievements-progress-coupling.spec.ts` with tests for: no unlock on navigation, explicit completion unlocks, every card has an action, raw segment evidence alone does not create manual progress. Extend `scripts/validate-supporting-data.mjs` so `manualReviewAfterPromotion` achievements require exactly one non-empty `curriculumTags` value, `sourceReviewStatus === 'reviewed'`, and at least one complete `sourceReferences` entry.
  **Must NOT do**: Do not implement production behavior in this task. Do not weaken existing validators. Do not use brittle selectors based on long generated IDs when a stable `data-testid` or `data-*` selector can be planned.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Requires coordinating Playwright tests, validator assertions, and long generated data IDs.
  - Skills: [`test-driven-development`] - Tests must fail before production code changes.
  - Omitted: [`frontend-design`] - This task creates tests and validation rules only.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [2, 3, 4, 5, 6, 7] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `tests/ui/storage-migration.spec.ts:76-100` - Follow `waitForAppReady()` and `page.evaluate()` state inspection style.
  - Pattern: `tests/ui/settings-reset.spec.ts:49-153` - Follow seeded state and reset assertion style.
  - Pattern: `src/modules/progress.js:42-45` - Existing `__progressTestHooks` export can be expanded for deterministic progress tests.
  - Data: `src/data/achievementsData.json:259-289` - Representative manual achievement ID and segment `knowledge-topic-0001-source-section-l1-l5-bd27b23b45`.
  - Validator: `scripts/validate-supporting-data.mjs:117-134` - Existing valid condition type sets already include `manualReviewAfterPromotion`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/achievements-progress-coupling.spec.ts --grep "manual textbook achievement requires explicit completion"` fails before implementation because action/completion UI does not exist.
  - [ ] `npx playwright test tests/ui/achievements-progress-coupling.spec.ts --grep "every achievement card has an operable action"` fails before implementation because cards are static.
  - [ ] `node scripts/validate-supporting-data.mjs` still exits `0` against current valid data after adding invariants.
  - [ ] Test coverage includes every `manualReviewAfterPromotion` achievement, not only the representative fixture: each manual achievement must have a progress segment row and a corresponding achievement card action payload keyed by its single `curriculumTags[0]`.
  - [ ] Evidence file `.sisyphus/evidence/task-1-achievement-gated-tests.json` records failing test names and validator pass output.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Failing tests prove missing manual path
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/achievements-progress-coupling.spec.ts --grep "manual textbook achievement requires explicit completion"`.
    Expected: Non-zero exit; failure message indicates missing achievement card action or missing `完成学习` button.
    Evidence: .sisyphus/evidence/task-1-achievement-gated-tests.json

  Scenario: Data validator still accepts reviewed manual achievements
    Tool: Bash
    Steps: Run `node scripts/validate-supporting-data.mjs`.
    Expected: Exit code 0; no manualReviewAfterPromotion invariant errors.
    Evidence: .sisyphus/evidence/task-1-supporting-validator.txt
  ```

  **Commit**: YES | Message: `test(progress): cover achievement gated learning completion` | Files: [`tests/ui/achievements-progress-coupling.spec.ts`, `scripts/validate-supporting-data.mjs`] | Evidence produced but NOT staged/committed unless project convention explicitly requires evidence artifacts.

- [x] 2. Add `completedLearningSegments` storage state and v3 migration

  **What to do**: Modify `src/modules/storage.js` to add `completedLearningSegments` to default state, serialization, migration, normalization, state snapshot, read-only `window.appState`, reset behavior, and exports. Change `SCHEMA_VERSION` from `v2` to `v3`. Add APIs: `getCompletedLearningSegments()` and `markLearningSegmentCompleted(segmentId, metadata = {})`. The marker must trim string IDs, reject blank/non-string IDs, be idempotent, append a Chinese-first activity entry, emit `statechange` with field `completedLearningSegments`, and emit event `learningsegmentcompleted` only on actual mutation. For Playwright direct storage API tests, add an explicit test-only hook such as `window.__elementExplorerTestHooks.storage.markLearningSegmentCompleted` in app bootstrap or use dynamic module import from the browser context; do not mutate `window.appState` directly.
  **Must NOT do**: Do not make storage unlock achievements directly. Do not count completed segments as progress here. Do not change `markElementLearned()` or the learned/collected mirroring contract.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Focused changes in one central module plus expected test updates.
  - Skills: [`test-driven-development`] - Storage behavior must be driven by failing migration/reset tests.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [3, 4, 5, 6] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/storage.js:28-45` - Add default `completedLearningSegments: new Set()` near other learner progress sets.
  - Pattern: `src/modules/storage.js:400-419` - Serialize sets as arrays.
  - Pattern: `src/modules/storage.js:422-480` - Ensure v0/v1/v2 payloads normalize into v3 shape.
  - Pattern: `src/modules/storage.js:482-528` - Normalize persisted arrays into Sets and drop invalid entries.
  - Pattern: `src/modules/storage.js:608-628` - Include a new Set in snapshots so `window.appState.completedLearningSegments` works.
  - Pattern: `src/modules/storage.js:996-1013` - Follow idempotent `markExperimentCompleted()` style.
  - Pattern: `src/modules/storage.js:1119-1158` - Reset flows should clear learning segments.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/storage-migration.spec.ts --grep "old localStorage state survives schema upgrade"` passes with expected envelope version `v3` and empty `completedLearningSegments` for legacy fixtures.
  - [ ] `npx playwright test tests/ui/settings-reset.spec.ts` passes after updating seeded expectations to include `completedLearningSegments` clearing and `v3` envelope version.
  - [ ] Browser evaluation can call the explicit test hook or dynamic module import for `markLearningSegmentCompleted('knowledge-topic-0001-source-section-l1-l5-bd27b23b45')`; it must not attempt to mutate read-only `window.appState`.
  - [ ] Calling `markLearningSegmentCompleted()` twice with the same ID returns `false` the second time and does not duplicate activity log entries.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Storage migration preserves old state and adds empty segment set
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/storage-migration.spec.ts`.
    Expected: Exit code 0; persisted envelope version is `v3`; old learned elements, experiments, achievements, settings remain preserved; completedLearningSegments is empty.
    Evidence: .sisyphus/evidence/task-2-storage-migration.json

  Scenario: Reset clears completed learning segments
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/settings-reset.spec.ts`.
    Expected: Exit code 0; after reset, appState and stored envelope both have empty completedLearningSegments and preserved settings.
    Evidence: .sisyphus/evidence/task-2-reset-clears-segments.json
  ```

  **Commit**: YES | Message: `feat(storage): persist completed learning segments` | Files: [`src/modules/storage.js`, `tests/ui/storage-migration.spec.ts`, `tests/ui/settings-reset.spec.ts`] | Evidence produced but NOT staged/committed unless project convention explicitly requires evidence artifacts.

- [x] 3. Add achievement card action paths for every condition type

  **What to do**: Modify `src/modules/achievements.js` so each rendered achievement card includes exactly one accessible action control. Add stable attributes: `data-achievement-id`, `data-achievement-action`, and `data-achievement-condition`. Use delegated click handling from the achievements grid. Map condition types to existing app sections: `learnedElements` → `periodic-table`, `completedExperiments` → `lab`, `quizAttempts`/`quizPerfectScore` → `games` or the app's existing quiz host, `gamePlays`/`gameScore` → `games`, `manualReviewAfterPromotion` → `progress` with a focus event or selected segment state. User-facing copy must be Chinese-first: examples `去学习元素`, `去实验室`, `去答题`, `去游戏`, `去学习`. Add HTML text escaping and attribute escaping helpers, or build action controls via DOM APIs, before inserting `achievement.id`, `condition.type`, `curriculumTags[0]`, `title`, `description`, and `unlockText` into `innerHTML` or attributes.
  **Must NOT do**: Do not unlock achievements directly from card action clicks. Do not expose `manualReviewAfterPromotion` as visible copy. Do not add multiple action buttons per card.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI markup and card layout must remain clean after adding action controls.
  - Skills: [`frontend-design`] - Button placement should integrate with existing card layout without generic styling.
  - Omitted: [`threejs-animation`] - No 3D/animation change.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [5, 7] | Blocked By: [1, 2]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/achievements.js:105-179` - Current render tree and card markup.
  - Pattern: `src/modules/router.js:72-78` - Use existing `navigateTo(section)` behavior rather than inventing routes.
  - Pattern: `src/styles/achievements.css` - Existing card grid and meta list styles; add action styling near achievement card rules.
  - Data: `src/data/achievementsData.json:259-289` - Manual card source metadata for action payload.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/achievements-progress-coupling.spec.ts --grep "every achievement card has an operable action"` passes.
  - [ ] Each rendered `.achievement-card` has one visible button or link with accessible name and `data-achievement-action`.
  - [ ] Every `manualReviewAfterPromotion` achievement has an action payload whose segment ID exactly equals its only `curriculumTags[0]`.
  - [ ] Clicking representative learned/experiment/game/manual actions navigates to expected section without unlocking the target achievement by itself.
  - [ ] Injected metadata containing `<`, `>`, `"`, `'`, or `&` is escaped in visible HTML and attributes; no malformed DOM or script execution is possible from achievement metadata.
  - [ ] Build passes: `npm run build` exits `0`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Every card has one action
    Tool: Playwright
    Steps: Navigate to `#/achievements`; count `.achievement-card`; for each card, count visible `[data-achievement-action]` controls.
    Expected: Each card has exactly one visible, enabled action control unless already unlocked; unlocked cards still show a navigation/review action, not zero controls.
    Evidence: .sisyphus/evidence/task-3-achievement-actions.json

  Scenario: Manual card navigation does not unlock
    Tool: Playwright
    Steps: Click the action for achievement ID `textbook-rj-chemistry-g12-selective-3-organic-2019-knowledge-topic-0001-source-section-l1-l5-bd27b23b45-promote-knowledge-topic-0001-source-section-l1-l5-bd27b23b45-achievement-achievement-0001-source-section-l1-l5-bd27b23b45`.
    Expected: Route changes to `#/progress`; `window.appState.unlockedAchievements` does not contain the achievement ID before clicking `完成学习`.
    Evidence: .sisyphus/evidence/task-3-manual-action-no-unlock.json
  ```

  **Commit**: YES | Message: `feat(achievements): add unlock action paths` | Files: [`src/modules/achievements.js`, `src/styles/achievements.css`, `tests/ui/achievements-progress-coupling.spec.ts`] | Evidence produced but NOT staged/committed unless project convention explicitly requires evidence artifacts.

- [x] 4. Support `manualReviewAfterPromotion` achievement evaluation

  **What to do**: Modify `src/modules/achievements.js` so condition evaluation can inspect the full achievement object, not only `achievement.condition`. Change `evaluateAchievements()` to call `matchesCondition(achievement)` or `matchesCondition(achievement.condition, achievement)`. Import `getCompletedLearningSegments()` from storage. Implement manual-review logic: return true only when `achievement.condition.type === 'manualReviewAfterPromotion'`, `achievement.sourceReviewStatus === 'reviewed'`, `achievement.curriculumTags` has exactly one non-empty string, and `getCompletedLearningSegments().has(achievement.curriculumTags[0])`. Export test hooks if needed: `__achievementsTestHooks = { getLearningSegmentIdForAchievement, matchesCondition }`.
  **Must NOT do**: Do not unlock manual achievements based only on `sourceReviewStatus`. Do not treat multiple curriculum tags as “any tag completes”; invalid metadata must not unlock. Do not unlock from storage APIs directly.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Focused logic change in one module, backed by tests.
  - Skills: [`test-driven-development`] - Existing failing tests should drive condition support.
  - Omitted: [`frontend-design`] - No visual work.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [5, 6, 7] | Blocked By: [1, 2]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/achievements.js:59-103` - Existing evaluation and condition matching.
  - Storage API from Task 2: `getCompletedLearningSegments()` returns a defensive `Set` copy.
  - Data: `src/data/achievementsData.json:266-275` - Condition type and reviewed source status.
  - Data: `src/data/achievementsData.json:270-272` - Canonical segment ID source.

  **Acceptance Criteria** (agent-executable only):
  - [ ] With no completed learning segment, `manualReviewAfterPromotion` achievement remains locked after visiting achievements and progress pages.
  - [ ] After `markLearningSegmentCompleted('knowledge-topic-0001-source-section-l1-l5-bd27b23b45')` and a statechange/evaluation cycle, the representative achievement unlocks.
  - [ ] A synthetic/manual test case with unreviewed status or missing curriculum tag does not unlock.
  - [ ] Existing learned elements, experiments, quiz, and game achievement tests still pass.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Manual condition requires reviewed source and completed segment
    Tool: Playwright
    Steps: In browser context, complete segment `knowledge-topic-0001-source-section-l1-l5-bd27b23b45`; wait for statechange; inspect `window.appState.unlockedAchievements`.
    Expected: Representative manual achievement ID is present only after completion; it is absent before completion.
    Evidence: .sisyphus/evidence/task-4-manual-condition-unlocks.json

  Scenario: Existing achievement condition types remain intact
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/settings-reset.spec.ts tests/ui/reaction-game-completion.spec.ts`.
    Expected: Exit code 0; no regressions in achievement dates, experiment/game progress, or state reset.
    Evidence: .sisyphus/evidence/task-4-existing-achievements.txt
  ```

  **Commit**: YES | Message: `feat(achievements): unlock reviewed learning segments` | Files: [`src/modules/achievements.js`, `tests/ui/achievements-progress-coupling.spec.ts`] | Evidence produced but NOT staged/committed unless project convention explicitly requires evidence artifacts.

- [x] 5. Add progress-page manual learning segment UI and achievement-derived progress coupling

  **What to do**: Modify `src/modules/progress.js` to render lightweight manual learning segment rows/cards for curriculum topics backed by `manualReviewAfterPromotion` achievements. Add imports for `markLearningSegmentCompleted()` and `getCompletedLearningSegments()`. Add helper maps from curriculum tag → manual achievement. In `computeTopicMastery()`, separate manual display completion from stage-path completion: add explicit fields such as `manualAchievementId`, `manualCompleted`, `displayCompleted`, and `stagePathCompleted`. Manual achievement unlock may set `manualCompleted: true` and `displayCompleted: true` for the topic row, but `stagePathCompleted` must remain based only on existing non-manual learned element / quiz / experiment activity completion. Update `computeStageCurriculum()` and `getStageStates()` to use `stagePathCompleted` for `completedCount`, `hasCurriculumCompletion`, stage completion, and stage unlocking. Raw `completedLearningSegments` may control button state but must not mark progress complete. Add delegated button handling for `[data-learning-segment-complete]` that calls `markLearningSegmentCompleted(segmentId)` and then waits for the subsequent `achievementunlocked` or `statechange` evaluation cycle before rendering the segment as progress-complete. Add focus handling from achievement card action to progress page via an event or module-level `focusedLearningSegmentId`. Safely escape or DOM-build all newly rendered source headings, display paths, curriculum tags, line ranges, and source volume IDs.
  **Must NOT do**: Do not create a full textbook reader. Do not count raw segment evidence as progress. Do not automatically call `markLearningSegmentCompleted()` on render.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: This is the core coupling change across progress computation, UI, and event flow.
  - Skills: [`test-driven-development`] - Must satisfy negative and positive Playwright tests.
  - Omitted: [`threejs-animation`] - No animation work.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: [6, 7] | Blocked By: [1, 2, 3, 4]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/progress.js:42-45` - Expand `__progressTestHooks` for deterministic manual progress assertions.
  - Pattern: `src/modules/progress.js:82-112` - Existing `computeTopicMastery()` return shape; add manual display fields and `stagePathCompleted` without breaking consumers.
  - Pattern: `src/modules/progress.js:114-130` - `computeStageCurriculum()` must compute stage completion from `stagePathCompleted`, not `displayCompleted`.
  - Pattern: `src/modules/progress.js:318-351` - `getStageStates()` must keep stage completion/unlocking independent from manual-only textbook achievements.
  - Pattern: `src/modules/progress.js:392-439` - Current stage detail topic rendering; add completion button/metadata here.
  - Pattern: `src/modules/progress.js:309-316` - Existing delegated binding area; add learning segment button binding near this flow.
  - Style: `src/styles/achievements.css` - This existing stylesheet currently contains `.progress-*` rules; add progress learning segment row/button styles here. Do not reference `src/styles/progress.css` because it does not exist unless this task explicitly creates and imports it.
  - Data: `src/data/achievementsData.json:259-289` - Representative manual source heading and line range.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/achievements-progress-coupling.spec.ts --grep "manual textbook achievement requires explicit completion"` passes.
  - [ ] `npx playwright test tests/ui/achievements-progress-coupling.spec.ts --grep "completion button unlocks achievement and syncs progress"` passes.
  - [ ] `npx playwright test tests/ui/achievements-progress-coupling.spec.ts --grep "manual topic progress is derived from unlocked achievements"` passes.
  - [ ] Progress topic row for segment `knowledge-topic-0001-source-section-l1-l5-bd27b23b45` displays `未开始` before action, does not complete on navigation, and displays `已完成` after achievement unlock.
  - [ ] Every `manualReviewAfterPromotion` achievement with a valid single `curriculumTags[0]` appears in the progress manual segment UI and can be focused from its achievement card action.
  - [ ] Manual-only completion sets manual topic row display to completed but does not increase `computeStageCurriculum().completedCount` unless `stagePathCompleted` is true from existing non-manual activity.
  - [ ] Manual-only completion does not advance `getStageStates()` stage status or unlock later stages solely because a manual textbook achievement unlocked.
  - [ ] Newly rendered progress metadata is safely escaped in text and attributes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Explicit completion unlocks and syncs progress
    Tool: Playwright
    Steps: Fresh context; go to achievements; click representative manual card `去学习`; verify progress page segment; click `完成学习`; wait for achievement unlock.
    Expected: `completedLearningSegments` contains the segment ID; `unlockedAchievements` contains the achievement ID; progress row shows `已完成`; card status shows `已解锁` after returning to achievements.
    Evidence: .sisyphus/evidence/task-5-completion-syncs-progress.json

  Scenario: Raw segment evidence alone is not visible progress
    Tool: Playwright
    Steps: Seed localStorage with `completedLearningSegments: ['knowledge-topic-0001-source-section-l1-l5-bd27b23b45']` but without matching `unlockedAchievements`; load progress.
    Expected: Button may show completion evidence if designed, but topic progress is not `已完成` and test hook reports manual completion count `0` until achievement is unlocked.
    Evidence: .sisyphus/evidence/task-5-raw-segment-not-progress.json
  ```

  **Commit**: YES | Message: `feat(progress): complete textbook learning segments` | Files: [`src/modules/progress.js`, `src/styles/achievements.css`, `tests/ui/achievements-progress-coupling.spec.ts`] | Evidence produced but NOT staged/committed unless project convention explicitly requires evidence artifacts.

- [x] 6. Harden persistence, reset, and reload behavior for completed learning segments

  **What to do**: Complete regression coverage for schema `v3`, reload persistence, corrupted/invalid `completedLearningSegments`, and reset semantics. Update fixtures if needed under `tests/fixtures/` so old `v0`/`v1`/`v2` payloads hydrate safely. Ensure debounced save timing is handled in Playwright tests by polling localStorage after completion. Add or update assertions in `settings-reset.spec.ts`, `storage-migration.spec.ts`, and `achievements-progress-coupling.spec.ts`.
  **Must NOT do**: Do not preserve completed learning segments after `resetProgress()` or `resetAll()`. Do not change settings preservation behavior in progress reset. Do not add sleeps where polling is available.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Cross-cutting persistence and migration regression work.
  - Skills: [`test-driven-development`] - Tests should prove persistence and reset contracts.
  - Omitted: [`frontend-design`] - No UI styling.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: [7] | Blocked By: [2, 4, 5]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `tests/ui/storage-migration.spec.ts:10-54` - Existing migration and default initialization tests.
  - Pattern: `tests/ui/settings-reset.spec.ts:100-152` - Existing reset expectations.
  - Pattern: `src/modules/storage.js:594-606` - Save envelope shape and schema version.
  - Pattern: `src/modules/storage.js:1119-1158` - Reset flows.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/achievements-progress-coupling.spec.ts --grep "completed learning segment persists after reload"` passes.
  - [ ] `npx playwright test tests/ui/storage-migration.spec.ts` passes with `v3` expectations.
  - [ ] Invalid persisted values such as `[null, "", 123, "valid-tag"]` normalize to only `['valid-tag']`.
  - [ ] `resetProgress()` and settings modal clear flow both clear `completedLearningSegments` while preserving settings.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Completion persists after reload
    Tool: Playwright
    Steps: Complete the representative segment; poll localStorage until envelope data includes the segment and achievement; reload page.
    Expected: Segment remains completed, matching achievement remains unlocked, button is disabled or displays `已完成学习`, and envelope version is `v3`.
    Evidence: .sisyphus/evidence/task-6-persistence-reload.json

  Scenario: Invalid persisted segment values are dropped
    Tool: Playwright
    Steps: Seed localStorage with versioned envelope containing invalid completedLearningSegments values and one valid segment ID; load app; read `window.appState.completedLearningSegments`.
    Expected: Only the valid trimmed string remains; no console error; existing state fields preserved.
    Evidence: .sisyphus/evidence/task-6-invalid-segments.json
  ```

  **Commit**: YES | Message: `test(storage): cover v3 migration and reset` | Files: [`tests/ui/storage-migration.spec.ts`, `tests/ui/settings-reset.spec.ts`, `tests/ui/achievements-progress-coupling.spec.ts`, `tests/fixtures/*`] | Evidence produced but NOT staged/committed unless project convention explicitly requires evidence artifacts.

- [x] 7. Final data validation, style polish, and full safe verification

  **What to do**: Finish any styling needed for achievement action buttons and progress learning segment rows. Ensure Chinese-first copy is polished and no raw internal condition names appear in visible UI. Run data validators and full safe validation. Fix only issues directly caused by this change. Produce final evidence files with command outputs.
  **Must NOT do**: Do not introduce broad visual redesign. Do not rename generated achievement IDs. Do not edit unrelated datasets or files.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Final focused polish and verification.
  - Skills: [`verification-before-completion`] - Must verify before claiming readiness.
  - Omitted: [`test-driven-development`] - Implementation tests already exist; this is final verification.

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: [Final Verification] | Blocked By: [1, 2, 3, 4, 5, 6]

  **References** (executor has NO interview context - be exhaustive):
  - Command: `node scripts/validate-supporting-data.mjs` - Manual achievement invariant validator.
  - Command: `npx playwright test tests/ui/achievements-progress-coupling.spec.ts` - New coupling tests.
  - Command: `npx playwright test tests/ui/storage-migration.spec.ts tests/ui/settings-reset.spec.ts` - Persistence/reset regressions.
  - Command: `npm run validate:all:safe` - Required final safe validation from `AGENTS.md`.
  - UI copy guardrail: visible text must be Chinese-first: `去学习`, `完成学习`, `已完成学习`, `已解锁`, `未解锁`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node scripts/validate-supporting-data.mjs` exits `0`.
  - [ ] `npx playwright test tests/ui/achievements-progress-coupling.spec.ts` exits `0`.
  - [ ] `npx playwright test tests/ui/storage-migration.spec.ts tests/ui/settings-reset.spec.ts` exits `0`.
  - [ ] `npm run validate:all:safe` exits `0`.
  - [ ] Playwright scan of achievements page finds no visible text `manualReviewAfterPromotion`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full safe validation passes
    Tool: Bash
    Steps: Run `npm run validate:all:safe`.
    Expected: Exit code 0; all validators and Vite build pass.
    Evidence: .sisyphus/evidence/task-7-validate-all-safe.txt

  Scenario: UI exposes Chinese-first action copy, not internal condition names
    Tool: Playwright
    Steps: Navigate to `#/achievements`; scan visible card text; inspect first manual achievement action and progress completion UI.
    Expected: Visible UI contains `去学习` and `完成学习`; visible UI does not contain `manualReviewAfterPromotion`.
    Evidence: .sisyphus/evidence/task-7-ui-copy.json
  ```

  **Commit**: YES | Message: `chore(data): validate manual achievement paths` | Files: [`src/styles/achievements.css`, `scripts/validate-supporting-data.mjs`] | Evidence produced but NOT staged/committed unless project convention explicitly requires evidence artifacts.

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle

  **Agent Profile**: `oracle` - read-only reasoning audit.
  **Parallelization**: Can Parallel: YES | Final Verification | Blocks: [user approval] | Blocked By: [1, 2, 3, 4, 5, 6, 7]
  **References**: `.sisyphus/plans/achievement-progress-unlock-paths.md`, changed source files, `AGENTS.md` learner-state contract.
  **Acceptance Criteria**:
  - [ ] Confirms every task acceptance criterion is satisfied or explicitly lists failures.
  - [ ] Confirms no requirement was dropped: all achievement cards have paths; manual completion requires click; progress is achievement-gated.
  - [ ] Confirms final verification must wait for user approval.
  **QA Scenario**:
  ```
  Scenario: Plan compliance review
    Tool: task oracle
    Steps: Provide plan path, implementation summary, and verification outputs.
    Expected: Oracle returns APPROVE/GO with no blocking issues.
    Evidence: .sisyphus/evidence/f1-plan-compliance.md
  ```

- [x] F2. Code Quality Review — unspecified-high

  **Agent Profile**: `unspecified-high` - code quality and maintainability review.
  **Parallelization**: Can Parallel: YES | Final Verification | Blocks: [user approval] | Blocked By: [1, 2, 3, 4, 5, 6, 7]
  **References**: `src/modules/storage.js`, `src/modules/achievements.js`, `src/modules/progress.js`, `scripts/validate-supporting-data.mjs`, tests changed in this plan.
  **Acceptance Criteria**:
  - [ ] Confirms no duplicated unsafe escaping logic or brittle selectors.
  - [ ] Confirms idempotent storage APIs and no achievement/progress render loop.
  - [ ] Confirms no unrelated refactors or scope creep.
  **QA Scenario**:
  ```
  Scenario: Code quality review
    Tool: task unspecified-high
    Steps: Review git diff and changed files for coupling, state mutation, escaping, and maintainability.
    Expected: Reviewer returns APPROVE or concrete required fixes.
    Evidence: .sisyphus/evidence/f2-code-quality.md
  ```

- [x] F3. Real Manual QA — unspecified-high (+ playwright)

  **Agent Profile**: `unspecified-high` with Playwright/browser tooling - hands-on QA.
  **Parallelization**: Can Parallel: YES | Final Verification | Blocks: [user approval] | Blocked By: [1, 2, 3, 4, 5, 6, 7]
  **References**: `tests/ui/achievements-progress-coupling.spec.ts`, live app routes `#/achievements` and `#/progress`.
  **Acceptance Criteria**:
  - [ ] Runs the full new Playwright spec successfully.
  - [ ] Manually drives the representative achievement path in browser: achievement card → progress segment → `完成学习` → unlocked card → progress completed.
  - [ ] Confirms navigation alone does not unlock.
  **QA Scenario**:
  ```
  Scenario: Browser manual QA
    Tool: Playwright
    Steps: Open app, clear storage, navigate to achievements, operate representative manual achievement, capture state before and after completion.
    Expected: State and UI match the user's Option B requirement exactly.
    Evidence: .sisyphus/evidence/f3-real-manual-qa.json
  ```

- [x] F4. Scope Fidelity Check — deep

  **Agent Profile**: `deep` - scope and product-fidelity review.
  **Parallelization**: Can Parallel: YES | Final Verification | Blocks: [user approval] | Blocked By: [1, 2, 3, 4, 5, 6, 7]
  **References**: User request, draft `.sisyphus/drafts/achievement-progress-unlock-paths.md`, final implementation diff.
  **Acceptance Criteria**:
  - [ ] Confirms implementation did not build a full textbook reader, backend, role system, or unrelated UI redesign.
  - [ ] Confirms Chinese-first UX and no visible `manualReviewAfterPromotion` leakage.
  - [ ] Confirms AGENTS learner-state hard rules remain true.
  **QA Scenario**:
  ```
  Scenario: Scope fidelity review
    Tool: task deep
    Steps: Compare user intent, plan, and final diff.
    Expected: Reviewer returns APPROVE with no scope drift or product mismatch.
    Evidence: .sisyphus/evidence/f4-scope-fidelity.md
  ```

> After F1-F4 all approve, present the consolidated verification results to the user and ask for explicit approval. Do not mark F1-F4 complete, do not claim final completion, and do not proceed to integration until the user replies with approval such as “okay / 可以 / 通过”.

## Commit Strategy
- Commit after each completed task if and only if verification for that task passes.
- Suggested commit sequence:
  1. `test(progress): cover achievement gated learning completion`
  2. `feat(storage): persist completed learning segments`
  3. `feat(achievements): add unlock action paths`
  4. `feat(achievements): unlock reviewed learning segments`
  5. `feat(progress): complete textbook learning segments`
  6. `test(storage): cover v3 migration and reset`
  7. `chore(data): validate manual achievement paths`
- Never commit `.sisyphus/evidence/*` unless project convention explicitly requires evidence artifacts in git.

## Success Criteria
- All manual-review textbook achievements have a visible path to completion.
- The representative achievement `textbook-rj-chemistry-g12-selective-3-organic-2019-knowledge-topic-0001-source-section-l1-l5-bd27b23b45-promote-knowledge-topic-0001-source-section-l1-l5-bd27b23b45-achievement-achievement-0001-source-section-l1-l5-bd27b23b45` cannot unlock by navigation alone.
- Clicking `完成学习` for segment `knowledge-topic-0001-source-section-l1-l5-bd27b23b45` records completion evidence, unlocks the achievement, persists after reload, and updates the matching progress row.
- Raw `completedLearningSegments` without the matching unlocked achievement does not show the manual topic as complete.
- `npm run validate:all:safe` passes.
