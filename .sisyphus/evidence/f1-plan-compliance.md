# F1 Plan Compliance Audit — learning-module-textbook-confirmation

Reviewed plan: `.sisyphus/plans/learning-module-textbook-confirmation.md`

## Scope Reviewed
- Read the active plan and notepads under `.sisyphus/notepads/learning-module-textbook-confirmation/`.
- Inspected `git diff --stat`, `git status --short`, and focused diffs for `src/modules/storage.js`, `src/modules/progress.js`, changed Playwright specs, `dist/index.html`, `src/modules/lab.js`, and `src/data/learningPath.json`.
- Read changed source/spec files relevant to this plan.
- Ran LSP diagnostics for `src/modules/storage.js`, `src/modules/progress.js`, `tests/ui/learning-content-modal.spec.ts`, `tests/content/pep-learning-tabs.spec.ts`, `tests/ui/achievements-progress-coupling.spec.ts`, and `tests/ui/lab-textbook-experiments.spec.ts`; all returned "No diagnostics found".

## Findings

### Storage Contract
- `src/modules/storage.js` adds `learningSegmentCompletionDates: {}` to default state and snapshots while keeping `completedLearningSegments` as a `Set` exposed/persisted as an array.
- `getLearningSegmentCompletionDates()` is exported and returns a shallow object copy.
- `markLearningSegmentCompleted(segmentId, metadata = {})` validates/trims the id, returns `false` for duplicate/empty completions before mutation, stores a first local `YYYY-MM-DD` date, and includes `completedDate` in activity/state-change detail.
- Existing task evidence confirms first completion stored `2026-05-28` and duplicate completion returned `false` without changing the date.

### Learning Page Rendering Contract
- `src/modules/progress.js` `renderProgress()` now targets `#progress .progress-path`, calls `readAchievementActionFocus()`, reads only `unlockedAchievements`, `completedLearningSegments`, and `learningSegmentCompletionDates` for render, and sets `container.innerHTML` to `renderManualLearningSection(...)` followed by `bindLearningInteractions()`.
- `getManualLearningSegments(...)` accepts `learningSegmentCompletionDates`, adds `completionDate`, and filters to non-empty textbook `sourceVolumeId`.
- The visible learning section renders `教材复习确认`, 8 textbook tabs, neutral tab counts `共 N 节`, textbook cards, modal content, and empty fallback `暂无教材复习内容`.
- Stage helper functions remain in the file for test hooks, but the focused render path does not render the old five-stage path. A grep/read audit shows old stage selectors/classes remain only inside unused helper templates, not in `renderProgress()` output.

### Card and Modal Contract
- `renderLearningCard(segment)` renders card status as `未学习`, `学习确认：YYYY-MM-DD`, or `学习确认：日期待补充`; cards keep `role="button"`/`tabindex="0"` and do not contain buttons.
- `renderLessonModal(segment)` renders the only confirmation action as `data-testid="confirm-learning"` with text `确定已学习` for incomplete segments.
- Completed modal state renders `已学习：YYYY-MM-DD` or `已学习：日期待补充` and no confirm button.
- The confirm handler calls `markLearningSegmentCompleted(segmentId, { achievementId, source: 'progress-learning-modal' })`, keeps focus/modal state, and re-renders instead of closing the modal.

### Tests and Evidence Coverage
- `tests/ui/learning-content-modal.spec.ts` covers card-open-without-completion, close/Escape no completion, modal-only `确定已学习`, appState/localStorage date persistence, reload persistence, dated completed modal, legacy `日期待补充`, no card buttons, modal sections, XSS safety, and scroll.
- `tests/content/pep-learning-tabs.spec.ts` asserts `教材复习确认`, exactly 8 tabs, visible cards, and absence of `五阶段学习路径`, `初级探索者`, `[data-stage-select]`, `.progress-stage-card`, `.progress-stage-detail`, `.progress-learning-path`, and old reward copy. Evidence reports `tabCount: 8`, zero removed stage selectors/cards/details, and false old-text booleans.
- `tests/ui/achievements-progress-coupling.spec.ts` covers explicit modal completion, date-aware card status, stored `learningSegmentCompletionDates`, achievement unlock coupling, activity feed absence under `#progress`, raw legacy completion fallback, no passive `.progress-ring`, and read-only achievement cards.
- `tests/ui/lab-textbook-experiments.spec.ts` was changed only to repair test Date freezing for lab regression; no `src/modules/lab.js` source edit exists in the focused diff.

### Scope Boundaries and Churn
- Focused diff for `src/modules/lab.js` and `src/data/learningPath.json` produced no source changes.
- `dist/index.html` has generated asset-hash churn and is still modified. This is not part of the plan deliverables and should be reverted or otherwise classified before final integration, but it is generated build output rather than source behavior.
- `git diff --stat` and `git status --short` show additional unrelated/stale workspace changes outside this plan, including `.sisyphus/boulder.json`, old evidence/notepad files, `dist/index.html`, and untracked plans/notepads. These are outside the requested plan implementation and must not be confused with approval of final workspace cleanliness.
- `tests/ui/lab-textbook-experiments.spec.ts` is modified despite the plan preference to leave it unchanged unless failing; the notepad records it previously failed because Date freezing happened too late, and the focused diff is limited to test setup, not lab source or behavior.

## Blocking Issues
- None for implementation compliance with `learning-module-textbook-confirmation` guardrails.

## Verification Commands/Evidence Read
- `git diff --stat`: showed plan-source/test changes plus generated/unrelated churn; no `src/modules/lab.js` or `src/data/learningPath.json` change.
- `git diff -- src/modules/storage.js`: confirmed additive date map and first-confirmation behavior.
- `git diff -- src/modules/progress.js`: confirmed learning page render simplification and modal/card status changes.
- `git diff -- tests/content/pep-learning-tabs.spec.ts tests/ui/learning-content-modal.spec.ts tests/ui/achievements-progress-coupling.spec.ts tests/ui/lab-textbook-experiments.spec.ts`: confirmed planned test coverage and lab test-only Date-freeze adjustment.
- LSP diagnostics on required source/spec files: no diagnostics found.
- Existing evidence read: `task-1-learning-date-storage.json`, `task-1-duplicate-date-preserved.json`, `task-10-learning-tabs.json`, `task-4-manual-condition-unlocks.json`, `task-6-persistence-reload.json`, and `task-4-lab-confirmation-flow.json`.

VERDICT: APPROVE
