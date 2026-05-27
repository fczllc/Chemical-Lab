# Learning Module Content-First Redesign

## TL;DR
> **Summary**: Redesign the current “学习/进度” surface so textbook micro-lessons become readable learning cards with large detail modals, and confirmation only happens after the student opens the modal and reviews structured content.
> **Deliverables**:
> - Compact display-only learning cards showing lesson identity, source, summary, and `已学习`/`未学习` status.
> - Large scrollable lesson detail modal with formatted sections derived from existing textbook/achievement assets.
> - Modal-only `确认学习` action that preserves existing `completedLearningSegments` storage semantics.
> - Playwright coverage proving cards do not mutate state, modal confirmation persists, fallback content is formatted, and legacy card-level completion controls are gone.
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Final Verification Wave

## Context
### Original Request
- User said the current learning page is unfriendly because content is too dense and state display is mixed with learning operations.
- User clarified this module should be for learning, not querying progress; progress should be reflected in achievements/progress rather than dominating the learning surface.
- User requires the content to be learned to be merged with confirmation, so users see what they are learning before confirming.
- User approved a two-level interaction model:
  - Cards are concise display-only lesson entries.
  - Cards show `已学习` or `未学习`.
  - Clicking a card opens a large detail modal.
  - Long modal content scrolls internally.
  - `确认学习` is inside the modal only.
  - Cards never perform completion mutation.

### Interview Summary
- The current `TEXTBOOK MICRO-LESSONS / 教材片段学习` rows are too shallow: users can click `完成学习` without seeing lesson content.
- The redesign must use existing data assets as much as possible and must not invent unsupported textbook prose.
- Formatting matters: detailed content must be separated into headings, paragraphs, lists, and source/reference blocks; it must not be compressed into one mixed line.
- The existing learning-completion state should remain canonical: `completedLearningSegments` updated through `markLearningSegmentCompleted`.

### Metis Review (gaps addressed)
- Added guardrail: cards must be display-only; only the modal confirmation mutates state.
- Added guardrail: completed lessons remain readable.
- Added fallback behavior for lessons without rich body text.
- Added testing requirements for close-without-confirmation, no card mutation, fallback content, modal scroll, and no legacy card-level completion button.
- Scoped out new textbook prose, new search/filter systems, new storage schema, and broad achievement redesign.

## Work Objectives
### Core Objective
Convert the current manual textbook-learning section in `src/modules/progress.js` into a content-first lesson browser: compact cards for browsing, a modal reader for actual learning, and modal-only confirmation.

### Deliverables
- `src/modules/progress.js` renders display-only learning cards instead of completion rows.
- `src/modules/progress.js` has lesson-detail data shaping helpers that derive modal sections from existing `achievement`, `sourceReferences`, `curriculumTags`, and textbook asset manifest metadata.
- `src/modules/progress.js` opens/closes a large modal, handles Escape/backdrop/close button, and confirms learning only from inside the modal.
- `src/styles/achievements.css` or the existing progress-related stylesheet receives scoped card/modal styles matching the current HUD visual language.
- `tests/ui/achievements-progress-coupling.spec.ts` is updated for the new modal-only completion behavior.
- A new or updated Playwright test covers fallback formatting and modal scroll constraints.

### Definition of Done (verifiable conditions with commands)
- `npx playwright test tests/ui/achievements-progress-coupling.spec.ts`
- `npx playwright test tests/ui/learning-content-modal.spec.ts` if a new spec file is created
- `node scripts/validate-supporting-data.mjs`
- `node scripts/validate-textbook-assets.mjs`
- `npm run build`
- Prefer final full validation: `npm run validate:all:safe`

### Must Have
- Chinese-first labels and copy.
- Learning cards show title/source/summary/status.
- Status labels are exactly `已学习` and `未学习` for user-facing card state.
- Cards are clickable/openable but never call `markLearningSegmentCompleted`.
- No visible card-level `完成学习` or `确认学习` button.
- Large modal contains formatted sections:
  - 章节来源
  - 本节要学什么
  - 教材内容
  - 关键知识点
  - 相关资料
  - 学习确认
- Modal body has internal scrolling for long content.
- `确认学习` button appears only inside the modal for uncompleted lessons.
- Completed lessons remain openable/readable and show `已学习`; modal confirm control is disabled/replaced after completion.
- Completion persists through the existing `markLearningSegmentCompleted(segmentId, metadata)` path.
- Modal content is derived only from existing runtime data and source metadata.
- Empty/missing content renders structured fallback blocks; never render `undefined`, `null`, empty raw JSON, or one-line metadata soup.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not invent new textbook prose or chemical facts beyond existing reviewed metadata/source references.
- Do not introduce a new storage schema for learning completion.
- Do not mutate `learnedElements`, `collectedElements`, `quizScores`, `completedExperiments`, or achievement derivation semantics.
- Do not add search, filters, recommendations, or a new textbook browser in this change.
- Do not redesign the entire achievements module.
- Do not leave progress/stat-heavy UI inside the learning-card surface.
- Do not use vague card text such as “详情” without explaining the lesson source/status.
- Do not use acceptance criteria that require human visual judgment.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + Playwright UI tests. Existing behavior is known; this is a UI refactor with state-preservation requirements.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 foundation/data shaping; Task 2 tests can be drafted after Task 1 helper contracts are established.
Wave 2: Task 3 UI render/interactions; Task 4 styles/accessibility.
Wave 3: Task 5 update integration tests and verification hardening.

### Dependency Matrix (full, all tasks)
- Task 1: no blockers; blocks Tasks 2, 3, 5.
- Task 2: blocked by Task 1 helper contracts; blocks Task 5.
- Task 3: blocked by Task 1; blocks Task 4 and Task 5.
- Task 4: blocked by Task 3 render structure.
- Task 5: blocked by Tasks 1-4.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → `quick`, `visual-engineering`
- Wave 2 → 2 tasks → `visual-engineering`, `quick`
- Wave 3 → 1 task → `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Create structured lesson content model for manual learning segments

  **What to do**: In `src/modules/progress.js`, replace the row-only manual segment data shape with a lesson-card/detail model while keeping existing manual achievement discovery. Extend `getManualLearningSegments()` so each segment object contains stable fields for both card and modal rendering: `segmentId`, `achievementId`, `title`, `sourceVolumeId`, `lineRange`, `sourceHeading`, `displayPath`, `status`, `summary`, and `detailSections`. Document and use this `detailSections` shape: each section is `{ id: string, title: string, blocks: Array<{ type: 'paragraph' | 'list' | 'source' | 'asset', text?: string, items?: string[], label?: string }> }`; renderers must ignore empty blocks and escape all text. Add helper functions near the current manual-learning helpers: `getLearningSegmentStatus(achievement, segmentId, unlockedAchievements, completedLearningSegments)`, `buildLearningSegmentSummary(achievement, reference, segmentId)`, `buildLearningSegmentDetailSections(achievement, reference, segmentId)`, `findTextbookAssetForReference(reference)`, and `formatSourceReference(reference, sourceVolumeId)`. Use `textbookAssetManifest` from `src/data/textbookAssets.js` only for metadata lookup by `assetId`, `reference.assetReferences[].assetId`, and `volumeId`; do not load raw Markdown files in runtime code.

  **Must NOT do**: Do not introduce new chemistry explanations, new storage fields, async fetches, raw textbook Markdown imports, or database-like indexes. Do not remove existing `computeTopicMastery`/`computeStageCurriculum` semantics.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: focused data-shaping refactor in one module with small import addition.
  - Skills: [] - no specialized skill required for code execution beyond the plan executor.
  - Omitted: [`frontend-design`] - this task is data/contract shaping, not visual styling.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 2, 3, 5 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/progress.js:33-47` - manual learning achievements are derived from reviewed achievement data and one curriculum tag.
  - Pattern: `src/modules/progress.js:52-60` - segment ID extraction must stay trimmed and single-tag based.
  - Pattern: `src/modules/progress.js:582-587` - current `getManualLearningSegments()` returns achievement, segmentId, and first source reference; extend from here.
  - Pattern: `src/modules/progress.js:618-625` - current row computes `sourceVolumeId`, `lineRange`, `sourceHeading`, and `displayPath`; preserve these concepts.
  - API/Type: `src/data/textbookAssets.js:17-92` - `textbookAssetManifest.volumes` maps `volumeId` to display/source metadata.
  - API/Type: `src/data/textbookAssets.js:125-191` - `textbookAssetManifest.assets` contains reviewed asset metadata such as `assetType`, `nearbyHeading`, `diagramSummary`, `extractedFormulaText`, and `sourceNotes`.
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:8-10` - stable manual fixture IDs used by current tests.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/modules/progress.js` imports `textbookAssetManifest` from `../data/textbookAssets.js`.
  - [ ] A browser evaluation can call `await import('/src/modules/progress.js')` without throwing.
  - [ ] `__progressTestHooks.getManualLearningSegments()` returns objects containing `segmentId`, `achievement`, `reference`, `title`, `status`, `summary`, and `detailSections` or equivalent fields documented in code.
  - [ ] For the known `knowledge-topic-0001-source-section-l1-l5-bd27b23b45` segment, the shaped detail data includes separate source/reference and learning-content/fallback sections rather than one concatenated metadata string.
  - [ ] If an `assetId` exists on a source reference, its reviewed manifest metadata is included in a separate related-materials section; if no asset exists, no `undefined`/`null` text is produced.
  - [ ] `detailSections` consistently use the documented `{ id, title, blocks }` contract and block types; no task-specific renderer invents a second section shape.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Manual lesson model exposes structured sections
    Tool: Bash
    Steps: Run `npm run build` after the helper refactor.
    Expected: Build exits 0 and no import/runtime syntax error occurs.
    Evidence: .sisyphus/evidence/task-1-lesson-model-build.txt

  Scenario: Known segment has no metadata soup
    Tool: Playwright
    Steps: Navigate to `/#/progress`, evaluate `__progressTestHooks.getManualLearningSegments()`, find segment `knowledge-topic-0001-source-section-l1-l5-bd27b23b45`, and assert its structured detail sections are an array with labels such as `章节来源` and `教材内容`/fallback equivalent.
    Expected: Segment is found; at least 3 separate sections exist; serialized data does not contain literal `undefined` or `null`.
    Evidence: .sisyphus/evidence/task-1-known-segment-structured.json
  ```

  **Commit**: YES | Message: `refactor(progress): derive structured learning lesson content` | Files: [`src/modules/progress.js`]

- [x] 2. Add Playwright tests for the new two-level learning interaction contract

  **What to do**: Add a focused spec `tests/ui/learning-content-modal.spec.ts` before or alongside UI implementation. Use the existing Playwright setup style from `tests/ui/achievements-progress-coupling.spec.ts`. Tests should target stable selectors that implementation must add: `[data-testid="learning-card"]`, `[data-testid="learning-card-status"]`, `[data-testid="lesson-modal"]`, `[data-testid="lesson-modal-close"]`, `[data-testid="lesson-modal-body"]`, and `[data-testid="confirm-learning"]`. Cover no-mutation-on-card-open, close-without-confirmation, modal confirmation persistence, completed lesson readability, fallback/structured content rendering, long modal scroll constraints, and absence of legacy card-level completion buttons.

  **Must NOT do**: Do not assert pixel-perfect styling. Do not require manual visual inspection. Do not bypass UI behavior by only calling storage APIs, except for seeding/reset helpers.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI behavior tests involving modal interactions, accessibility-ish controls, and selectors.
  - Skills: [] - tests follow repo Playwright patterns.
  - Omitted: [`frontend-design`] - this task writes tests, not design exploration.

  **Parallelization**: Can Parallel: PARTIAL | Wave 1 | Blocks: Task 5 | Blocked By: Task 1 helper contract for exact fields; can draft selectors before Task 3.

  **References**:
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:79-120` - current manual completion test to update expectations from row button to modal confirmation.
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:186-220` - XSS/escaping pattern for progress UI.
  - API/Type: `src/modules/storage.js:29` - canonical `completedLearningSegments` state.
  - API/Type: `src/modules/progress.js:84-90` - existing `__progressTestHooks` export area for test-only helper access.
  - Command: `package.json:37` - Playwright dependency is installed.

  **Acceptance Criteria**:
  - [ ] New tests fail against the current pre-implementation UI because legacy rows still expose `[data-learning-segment-complete]` and no `[data-testid="lesson-modal"]` exists.
  - [ ] Tests assert clicking a learning card opens the modal and does not add the segment to `window.appState.completedLearningSegments`.
  - [ ] Tests assert closing via close button and Escape leaves status `未学习`.
  - [ ] Tests assert clicking modal `确认学习` adds the segment to `completedLearningSegments`, changes status to `已学习`, and persists after reload.
  - [ ] Tests assert completed lessons can still open the modal and read content.
  - [ ] Tests assert no learning card contains a visible `完成学习`/`确认学习` button.
  - [ ] Tests assert modal content renders in distinct sections and does not include literal `undefined` or `null`.
  - [ ] Tests mirror the existing progress XSS safety check by seeding unsafe source/title/description metadata and asserting the modal escapes it rather than rendering executable HTML.

  **QA Scenarios**:
  ```
  Scenario: Contract tests initially catch legacy behavior
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/learning-content-modal.spec.ts` before Task 3 implementation if practical.
    Expected: FAIL because modal selectors do not exist yet, proving the test guards the new behavior.
    Evidence: .sisyphus/evidence/task-2-red-test.txt

  Scenario: Test file compiles under Playwright
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/learning-content-modal.spec.ts --list`.
    Expected: Command exits 0 and lists the new modal interaction tests.
    Evidence: .sisyphus/evidence/task-2-test-list.txt
  ```

  **Commit**: YES | Message: `test(progress): specify lesson modal learning flow` | Files: [`tests/ui/learning-content-modal.spec.ts`, `tests/ui/achievements-progress-coupling.spec.ts` if expectations are adjusted]

- [x] 3. Replace textbook micro-lesson rows with display-only cards and modal-only confirmation

  **What to do**: In `src/modules/progress.js`, replace `renderManualLearningSegmentRow()` with card/modal rendering. Keep `renderManualLearningSection()` but change the UI copy from a checklist to a learning-card browser. Add module state `activeLearningSegmentId` near `focusedLearningSegmentId`. Render cards with `data-testid="learning-card"`, `data-learning-segment-id`, `data-manual-achievement-id`, `data-learning-card-open`, and status child `data-testid="learning-card-status"`. Card click sets `activeLearningSegmentId` and re-renders or opens modal without calling storage. Render the modal when `activeLearningSegmentId` matches a known segment. Modal must include `role="dialog"`, `aria-modal="true"`, a heading, close button, body, structured sections from Task 1, and the only `data-testid="confirm-learning"` button. The confirm handler calls `markLearningSegmentCompleted(segmentId, { achievementId, source: 'progress-learning-modal' })`, keeps/updates modal status to `已学习`, and updates `focusedLearningSegmentId` for continuity.

  **Must NOT do**: Do not leave `[data-learning-segment-complete]` on cards. Do not close the modal automatically before the state visibly updates unless tests assert the state first. Do not confirm on card click, modal open, scrolling, Escape, backdrop, or close button. Do not remove achievement-focus navigation; update it to focus/open the relevant card if needed.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: central UI/interaction refactor with modal behavior.
  - Skills: [`frontend-design`] - apply the approved content-first design without re-brainstorming.
  - Omitted: [`test-driven-development`] - tests-after was selected for this plan; Task 2 supplies behavior tests.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Tasks 4, 5 | Blocked By: Task 1; should run after or with Task 2 tests.

  **References**:
  - Pattern: `src/modules/progress.js:590-616` - existing manual learning section wrapper to preserve as the section boundary.
  - Pattern: `src/modules/progress.js:618-650` - current row/button implementation to replace.
  - Pattern: `src/modules/progress.js:379-397` - current binding location; update it to card open, modal close, Escape, backdrop, and confirm handlers.
  - Pattern: `src/modules/progress.js:437-456` - focus logic should target cards/modal controls instead of old row button.
  - API/Type: `src/modules/storage.js:29` - completion state remains `completedLearningSegments`.
  - API/Type: `src/modules/storage.js` exported `markLearningSegmentCompleted` - do not change its signature.
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:91-120` - update current manual completion flow from row button to modal confirmation.

  **Acceptance Criteria**:
  - [ ] `#progress [data-testid="learning-card"]` exists for manual learning segments.
  - [ ] Every card shows `已学习` or `未学习` in `[data-testid="learning-card-status"]`.
  - [ ] No card contains a visible button with text `完成学习` or `确认学习`.
  - [ ] Clicking a card opens `[data-testid="lesson-modal"]` with structured content and does not mutate `completedLearningSegments`.
  - [ ] Modal `确认学习` mutates `completedLearningSegments` through `markLearningSegmentCompleted` and uses metadata source `progress-learning-modal`.
  - [ ] Close button, Escape, and backdrop close do not mutate completion state.
  - [ ] Completed lesson cards still open the modal; modal shows `已学习` and does not allow duplicate active confirmation.
  - [ ] Existing achievement unlock coupling still works after modal confirmation.

  **QA Scenarios**:
  ```
  Scenario: Card opens modal without completion
    Tool: Playwright
    Steps: Navigate to `/#/progress`; locate the card for `knowledge-topic-0001-source-section-l1-l5-bd27b23b45`; record `window.appState.completedLearningSegments.has(segmentId)`; click the card; assert modal visible; re-read completion state.
    Expected: Modal visible; before and after completion state are both false; card still shows `未学习`.
    Evidence: .sisyphus/evidence/task-3-card-open-no-mutation.json

  Scenario: Modal confirmation persists and unlocks coupled achievement
    Tool: Playwright
    Steps: Open the same lesson modal; click `[data-testid="confirm-learning"]`; wait for `completedLearningSegments.has(segmentId)` true; reload; return to progress; inspect card and achievement state.
    Expected: Card shows `已学习`; segment remains persisted after reload; corresponding manual achievement unlocks through existing coupling.
    Evidence: .sisyphus/evidence/task-3-modal-confirm-persists.json
  ```

  **Commit**: YES | Message: `feat(progress): add lesson modal confirmation flow` | Files: [`src/modules/progress.js`, `tests/ui/achievements-progress-coupling.spec.ts`, `tests/ui/learning-content-modal.spec.ts`]

- [x] 4. Add scoped styles and accessibility behavior for readable cards and large modal

  **What to do**: Add scoped CSS in the existing progress/achievement stylesheet that currently owns progress UI styles, expected `src/styles/achievements.css` based on repository guidance. Style the card list as readable lesson cards rather than dense rows: separate title/source/summary/status; visual status chips for `未学习` and `已学习`; hover/focus state indicating “打开学习内容”. Style `.learning-lesson-modal` or equivalent with fixed overlay, large panel, max width around 70-85vw, max height around 75-85vh, internal scroll body, clear section headings, paragraph spacing, list spacing, source chips, and mobile-safe width. Preserve current dark HUD aesthetic. Ensure keyboard focus is moved to modal close or heading when opened and returns to the card after close if practical.

  **Must NOT do**: Do not globally restyle all HUD shells. Do not compress modal content into flex rows that mix labels and paragraphs. Do not hide overflowing content without scroll. Do not introduce generic light-theme styling that clashes with the app.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: focused UI polish, responsive modal, readable typography/spacing.
  - Skills: [`frontend-design`] - preserve a distinctive, production-grade interface while following the approved design.
  - Omitted: [`threejs-animation`] - no Three.js animation work needed.

  **Parallelization**: Can Parallel: PARTIAL | Wave 2 | Blocks: Task 5 | Blocked By: Task 3 DOM structure; can draft class names after Task 3 starts.

  **References**:
  - Style: `src/styles/achievements.css` - repository guidance says learning/progress styles live here, including `progress-dashboard`, `progress-learning-path`, and manual segment styles.
  - Pattern: `src/modules/progress.js:596-615` - section wrapper should remain visually consistent with HUD panels.
  - Pattern: `src/modules/progress.js:633-648` - old row classes should be replaced or bridged by new card classes.
  - Test: `tests/ui/learning-content-modal.spec.ts` - modal scroll and structured section selectors must match tests from Task 2.

  **Acceptance Criteria**:
  - [ ] Modal body has computed `overflow-y` of `auto` or `scroll` and a constrained max height.
  - [ ] At 390px mobile viewport, modal does not overflow horizontally and close/confirm controls remain reachable.
  - [ ] Lesson card content uses separate block elements for source, title, summary, and status.
  - [ ] Modal content sections use headings and paragraph/list blocks; no section is forced into a single-line row.
  - [ ] Focus outline/keyboard navigation is visible for cards, close button, and confirm button.

  **QA Scenarios**:
  ```
  Scenario: Long modal content scrolls internally
    Tool: Playwright
    Steps: Open a lesson modal; inspect `[data-testid="lesson-modal-body"]` computed styles and dimensions; compare `scrollHeight` and `clientHeight` if content exceeds visible area.
    Expected: Modal body has internal scroll styling; page body is not the primary scroll container for modal content.
    Evidence: .sisyphus/evidence/task-4-modal-scroll.json

  Scenario: Mobile modal remains usable
    Tool: Playwright
    Steps: Set viewport to 390x844; navigate to progress; open first learning card; assert modal, close, content body, and confirm/status area are visible/reachable.
    Expected: No horizontal document overflow beyond viewport by more than 4px; close and confirm/status controls are visible.
    Evidence: .sisyphus/evidence/task-4-mobile-modal.png
  ```

  **Commit**: YES | Message: `style(progress): make learning cards and modal readable` | Files: [`src/styles/achievements.css`, `src/modules/progress.js` if accessibility hooks are needed]

- [x] 5. Update regression tests and run full affected verification

  **What to do**: Bring all tests into alignment with the new UX. Update `tests/ui/achievements-progress-coupling.spec.ts` so existing manual achievement tests navigate from achievements to progress, open the learning card/modal, click modal `确认学习`, and then assert achievement unlock. Keep read-only achievements assertions. Ensure storage migration tests still pass without changes unless selectors broke. Run targeted UI specs, supporting/textbook validators, build, and final safe validation if time allows. Store evidence under `.sisyphus/evidence/`.

  **Must NOT do**: Do not weaken tests by only asserting that some button exists. Do not skip old coupling tests; the achievement unlock relationship is part of the feature. Do not update expected strings to vague English copy; this is Chinese-first UI.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-test regression pass and final verification across UI/state/data.
  - Skills: [`verification-before-completion`] - evidence before any completion claim.
  - Omitted: [`frontend-design`] - design work should be done; this task verifies behavior.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification | Blocked By: Tasks 1-4

  **References**:
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:79-120` - update `manual textbook achievement requires explicit completion` from row button to modal flow.
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:122-184` - update `completion button unlocks achievement and syncs progress` similarly.
  - Test: `tests/ui/storage-migration.spec.ts` - run to ensure `completedLearningSegments` migration remains intact.
  - Command: `package.json:11` - `node scripts/validate-supporting-data.mjs`.
  - Command: `package.json:14` - `node scripts/validate-textbook-assets.mjs`.
  - Command: `package.json:26` - `npm run validate:all:safe`.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/ui/learning-content-modal.spec.ts` passes.
  - [ ] `npx playwright test tests/ui/achievements-progress-coupling.spec.ts` passes.
  - [ ] `npx playwright test tests/ui/storage-migration.spec.ts` passes or is confirmed unaffected with evidence.
  - [ ] `node scripts/validate-supporting-data.mjs` passes.
  - [ ] `node scripts/validate-textbook-assets.mjs` passes.
  - [ ] `npm run build` passes.
  - [ ] `npm run validate:all:safe` passes before final claim unless a documented environment issue blocks it.

  **QA Scenarios**:
  ```
  Scenario: Achievement coupling still works through modal confirmation
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/achievements-progress-coupling.spec.ts`.
    Expected: Existing manual achievement tests pass with modal confirmation replacing old row button completion.
    Evidence: .sisyphus/evidence/task-5-achievement-coupling.txt

  Scenario: Full validation safe path
    Tool: Bash
    Steps: Run `npm run validate:all:safe`.
    Expected: Validators and production build exit 0.
    Evidence: .sisyphus/evidence/task-5-validate-all-safe.txt
  ```

  **Commit**: YES | Message: `test(progress): verify content-first learning confirmation` | Files: [`tests/ui/learning-content-modal.spec.ts`, `tests/ui/achievements-progress-coupling.spec.ts`, `.sisyphus/evidence/*` only if evidence is intentionally tracked]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit per completed task if the executor is asked to commit.
- Suggested messages:
  - `refactor(progress): derive structured learning lesson content`
  - `feat(progress): add lesson modal confirmation flow`
  - `test(progress): cover modal-only learning confirmation`
- Do not commit unless explicitly requested by the user.

## Success Criteria
- Learning cards are concise, readable, and status-only at the card level.
- Students can open a large modal and see formatted learning content before confirming.
- Completion state changes only via modal `确认学习`.
- Existing achievement unlock coupling continues to work after completion.
- Build, validators, and targeted Playwright tests pass.
