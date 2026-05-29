# Learnings — learning-module-textbook-confirmation

## 2026-05-28 Start Work
- Active plan: `.sisyphus/plans/learning-module-textbook-confirmation.md`.
- User-selected execution path: Start Work, no high-accuracy Momus review.
- Planner guardrails: learning page only; do not modify `src/modules/lab.js`, do not migrate achievements, do not reshape `src/data/learningPath.json`.

## 2026-05-28T11:50:38.6949323+08:00 Task 1 - Add compatible learning confirmation date persistence
- Added learningSegmentCompletionDates: {} to default state in createDefaultState.
- Added 
ormalizeLearningSegmentCompletionDates(value) reusing 
ormalizeExperimentCompletionDates validation logic (YYYY-MM-DD regex + local date validity check).
- Updated serializeState to include learningSegmentCompletionDates.
- Updated migratePersistedEnvelope so v0/v1/v2 and versionless envelopes get empty learningSegmentCompletionDates: {}; v3 envelopes normalize the date map via 
ormalizeLearningSegmentCompletionDates.
- Updated 
ormalizePersistedData to hydrate learningSegmentCompletionDates from persisted data.
- Updated getStateSnapshot to expose learningSegmentCompletionDates as a shallow copy.
- Exported getLearningSegmentCompletionDates() returning a shallow copy immediately after getCompletedLearningSegments().
- Updated markLearningSegmentCompleted(segmentId, metadata) to:
  - Clone old segment and date state before mutation.
  - Set local YYYY-MM-DD date via ormatLocalDateYYYYMMDD() on first completion only.
  - Include completedDate in ppendActivity metadata and mitStateChange detail.
  - Return alse on duplicate without overwriting existing date.
- Verified 
pm run build passes (exit 0).
- Verified via Node.js runtime simulation:
  - First completion stores date matching /^\d{4}-\d{2}-\d{2}$/.
  - Duplicate completion returns alse and preserves original date.
  - v3 envelope without date map hydrates with empty object and no error.

## 2026-05-28 Task 1 Verification Cleanup (Post-Build Artifact)
- `npm run build` passed successfully during Atlas verification.
- Build regenerated `dist/index.html` with new hashed asset names, creating an unintended diff.
- Restored `dist/index.html` to its pre-Task-1 state via targeted `git checkout -- dist/index.html`.
- Confirmed `git diff -- dist/index.html` produces no output.
- Confirmed `git diff --stat -- ':!node_modules'` shows only `src/modules/storage.js` changed (56 insertions, 6 deletions).
- No `npm run build` rerun after restoration, to avoid recreating the artifact diff.
- Task 1 source changes in `src/modules/storage.js` remain intact.

- Task 5: Updated tests/content/pep-learning-tabs.spec.ts to assert #progress shows 教材复习确认, excludes old stage UI selectors/copy, and records removed-stage evidence fields. Targeted Playwright spec passes after using :visible count for card checks to avoid enumerating large DOM matches.

- Task 6: tests/ui/achievements-progress-coupling.spec.ts now treats textbook learning completion as date-aware card footer text: 未学习, 学习确认：YYYY-MM-DD, or legacy 学习确认：日期待补充. Hidden manual segment cards may require selecting their data-textbook-tab before visibility assertions because progress renders inactive textbook panels hidden.
- Task 6: npx playwright test tests/ui/achievements-progress-coupling.spec.ts passed 12/12 after the test update.

- Task 4 Playwright spec update: learning card/modal completed state now asserts dated text (学习确认：YYYY-MM-DD, 已学习：YYYY-MM-DD) and legacy missing-date fallback (日期待补充). Target manual segment may be in a hidden textbook tab; tests use a helper to activate the containing tab before visibility assertions.
