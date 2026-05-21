# Task 3: Achievement Action Implementation Learnings

## Date: 2026-05-19

## Root Cause Fixed
- **Missing exports**: `ACHIEVEMENT_CATEGORY_META` and `ACHIEVEMENT_RARITY_LABELS` were imported in `achievements.js` but did not exist in `contentMeta.js`. This caused a runtime initialization failure.
- **Solution**: Added both exports to `contentMeta.js` with proper category metadata and rarity labels.

## Implementation Summary

### Action Button Mapping
Each achievement condition type maps to a router section:
- `learnedElements` -> `periodic-table` (label: 去学习)
- `completedExperiments` -> `lab` (label: 去做实验)
- `quizAttempts`, `quizPerfectScore`, `curriculumQuizComplete` -> `games` (label: 去测验)
- `gamePlays`, `gameScore` -> `games` (label: 去游戏)
- `manualReviewAfterPromotion` -> `progress` (label: 查看进度)

### Key Design Decisions
1. **Delegated click handling**: Single listener on `#achievements-grid` container, uses `event.target.closest()` for robustness
2. **Safe container query**: `document.getElementById('achievements-grid')` guarded with null check before adding listener
3. **Session storage guard**: Wrapped in `try/catch` to prevent navigation breakage
4. **No unlock on click**: Action buttons only navigate; unlocking remains in `evaluateAchievements()`
5. **Manual card attributes**: `data-learning-segment-id` set to `curriculumTags[0]` only for `manualReviewAfterPromotion` type
6. **Single action per card**: Each card renders at most one button; no multiple actions

### Files Modified
- `src/data/contentMeta.js`: Added `ACHIEVEMENT_CATEGORY_META` and `ACHIEVEMENT_RARITY_LABELS`
- `src/modules/achievements.js`: Added action target helpers, updated card rendering, added delegated click handler
- `src/styles/achievements.css`: Added `.achievement-action-btn` styles with hover/focus states

### CSS Features
- Full-width button inside card
- Different styling for locked vs unlocked cards
- Keyboard focus visible outline
- Hover transform for tactile feedback
- Escaped achievement popup icon names in showAchievementPopup() with a local scapeHtmlAttr() helper, matching the safety pattern used elsewhere for attribute interpolation.
Task 4 learning:
- `manualReviewAfterPromotion` must be evaluated against the full achievement object, not just the condition payload.
- The winning path is: reviewed source metadata + exactly one non-empty curriculum tag + completed learning segment evidence.
- The browser regression needs the article locator scoped to `article[data-achievement-id]` because the button shares the same achievement ID attribute.
- `getCompletedLearningSegments()` already existed in storage and returns a defensive `Set` copy, so the achievement module can consume it directly without mutating storage.
Task 4 learning: `evaluateAchievements()` must receive the full achievement object for `manualReviewAfterPromotion` checks; passing only `achievement.condition` drops the reviewed source status and completed-learning-segment lookup, so the representative manual achievement stays locked until `matchesCondition(achievement)` is used.

## 2026-05-20 Task 1 Coverage
- Added `tests/ui/achievements-progress-coupling.spec.ts` as a regression contract for achievement-gated manual learning: no unlock on navigation, explicit `完成学习` unlock path, every rendered card action, raw `completedLearningSegments` not counting as element progress, and all `manualReviewAfterPromotion` achievements having action/row coverage keyed by `curriculumTags[0]`.
- Current production is partially ahead of the original Wave 1 assumptions: every achievement card already has one operable button, so that grep passes instead of failing.
- The representative manual flow remains red for the intended missing contract: the action button lacks `data-learning-segment-id="knowledge-topic-0001-source-section-l1-l5-bd27b23b45"`, before it can assert the progress row and `完成学习` button.
- `scripts/validate-supporting-data.mjs` now enforces manual achievements have exactly one non-empty curriculum tag, `sourceReviewStatus === 'reviewed'`, and at least one complete source reference record.
- Added completedLearningSegments as a persisted learner-state field with v3 migration, normalization, snapshots, reset handling, and read APIs.
- Exposed a browser test hook at window.__elementExplorerTestHooks.storage.markLearningSegmentCompleted for Playwright without mutating window.appState.
- Reset now clears completedLearningSegments and saves the v3 envelope after progress clears.
- The v3 migration bug came from returning an envelope-shaped object into normalizePersistedData(); hydrateState expected plain migrated data, so legacy learned elements were lost.
- Playwright legacy storage tests should seed localStorage before app hydrate; using post-hydrate mutation caused false negatives.
- Keep reset spec envelope assertions aligned with the persisted seeded settings contract; live-state and stored-envelope checks may differ after reset behavior changes.
- `getLearningSegmentIdForAchievement()` should return a trimmed ID only when exactly one non-empty curriculum tag exists; blank or multi-tag metadata must stay locked.
- Manual review unlocks require all three gates together: reviewed source metadata, one trimmed curriculum tag, and matching completed learning segment evidence.


## 2026-05-20 Task 3 Completion
- Updated action labels to Chinese-first: 去学习元素, 去实验室, 去答题, 去游戏, 去学习.
- Added data-achievement-condition attribute to every action button for testability and semantic clarity.
- Added data-learning-segment-id to action buttons (not just article) for manualReviewAfterPromotion so Playwright can assert action-level segment keying.
- Applied scapeHtmlAttr() to ALL interpolated attributes in enderAchievementCard: achievement.id, condition.type, rarity, icon, title, description, unlockText, action target, action label, segmentId.
- Updated handleAchievementActionClick to store a JSON payload in sessionStorage with chievementId, conditionType, and segmentId for downstream consumption by Task 4 progress UI.
- Verified: 
pm run build passes; Playwright tests very achievement card has an operable action and 
avigation to manual achievement action does not unlock without completion both pass.
- Progress page tests (manual textbook achievement requires explicit completion, ll manual review achievements expose progress rows) remain pending on Task 4 progress UI implementation.
- No storage mutations; no unlock logic changes; no new dependencies.


## 2026-05-20 Task 3 Verification Fix
- Atlas review found missing all-manual payload coverage. Added focused Playwright test: 'all manual review achievement actions carry segment payload'.
- Test is data-driven over ALL manualReviewAfterPromotion achievements (not just the representative ID).
- Verifies three invariants per manual achievement:
  1. Card article has data-learning-segment-id === curriculumTags[0]
  2. Action button has data-learning-segment-id === curriculumTags[0]
  3. Action button has data-achievement-condition === 'manualReviewAfterPromotion'
- Production code (src/modules/achievements.js) already emitted correct attributes; no code changes needed for this fix.
- Verified: new test passes; existing 'every achievement card has an operable action' and 'navigation to manual achievement action does not unlock without completion' still pass; npm run build passes.
- Updated evidence file .sisyphus/evidence/task-3-achievement-actions.json with new test entry and productionCodeChanged flag.

## 2026-05-20 Task 5 Completion
- Progress manual learning rows are generated from reviewed manualReviewAfterPromotion achievements with exactly one curriculum tag; the segment id is the curriculum tag and the row carries data-learning-segment-id plus an explicit data-learning-segment-complete button.
- Raw completedLearningSegments is now button/evidence state only: progress display completion uses the matching unlocked achievement, while stagePathCompleted remains based on non-manual element/quiz/experiment topic activity.
- Stage curriculum completedCount and stage unlocking must read stagePathCompleted, not displayCompleted, so manual-only textbook achievements do not advance the five-stage path.
- Achievement startup evaluation skips manual review achievements; they evaluate when completedLearningSegments changes, preventing persisted raw segment evidence from auto-unlocking on page load.
- achievementActionFocus payload selects and highlights the matching progress row from achievement card navigation without marking completion on render/navigation.

## 2026-05-20 Task 6 Persistence/Reload Coverage
- Added reload persistence coverage that completes the representative manual segment through the UI, polls localStorage until the v3 envelope contains both completedLearningSegments and the matching unlocked achievement, reloads, then verifies the progress row, disabled completion button, and achievement card remain completed.
- Added v3 migration coverage for invalid completedLearningSegments values; [null, '', 123, ' valid-tag ', 'valid-tag'] normalizes to ['valid-tag'] in both appState and the stored v3 envelope.
- Existing resetProgress/settings clear flow already clears completedLearningSegments while preserving settings; settings-reset.spec verifies both live appState and persisted envelope after clear and reload.
- Avoid using resetApp() in reload-persistence tests because its addInitScript clears localStorage before every reload; navigate directly when the test's purpose is to prove localStorage survives reload.
- No storage production changes were needed; storage remains raw segment evidence only and achievement unlock continues to come from the canonical achievement event path.

## 2026-05-20 Task 6 Atlas Timeout Follow-up
- The three Task 6 Atlas commands pass when run sequentially: reload persistence grep test in ~19s, storage-migration spec in ~11s, and settings-reset spec in ~21s.
- The timeout is consistent with overlapping Playwright invocations contending for shared global setup resources: all processes use `http://127.0.0.1:4173` and the same `.playwright-runtime/vite-server.json` PID file, so concurrent setup/teardown can race on the preview server lifecycle.
- No individual Task 6 test hang was reproduced, and no storage/test code change was needed for this follow-up.

## 2026-05-20 Task 7 Final Verification
- Rendered `manualReviewAfterPromotion` labels were leaking through the achievements card `unlockText` field; replacing that display path with `完成对应教材片段学习` kept the underlying condition type intact while removing the raw internal string from visible copy.
- The Chinese-first copy guardrail is now satisfied on both `#/achievements` and `#/progress`: visible text includes `去学习`, `完成学习`, `已完成`, and `未解锁`, while `manualReviewAfterPromotion` no longer appears in the rendered body text.
- `npm run validate:all:safe` passed after the copy-only fix.
- The individual Playwright reruns for `tests/ui/achievements-progress-coupling.spec.ts` and `tests/ui/storage-migration.spec.ts tests/ui/settings-reset.spec.ts` still showed timeout-style failures in shared test helpers, but the browser scan of the live app and the safe validation run completed successfully.

## 2026-05-20 Final Reviewer Reject Fixes
- F2 persisted activity reject was confirmed: progress activity titles/descriptions from activityLog were interpolated into innerHTML without escaping. renderActivityList now escapes title, resolved description, and formatted timestamp, and Playwright covers injected img/svg/time payloads rendering as text only.
- F1 Task 4 evidence now comes from the completion-button browser path and records before locked/no segment/no achievement and after unlocked/segment persisted/achievement persisted in .sisyphus/evidence/task-4-manual-condition-unlocks.json.
- quizScores contract mismatch was confirmed for new writes and persisted normalization. normalizeQuizScore now emits score, total, percentage, sourceElement, timestamp while preserving accuracy, relatedElement, completedAt for existing consumers.
- Playwright tests that need to mutate live app state should use window.__elementExplorerTestHooks.storage; dynamic import('/src/modules/storage.js') can create a separate module instance from the bundled app during preview testing.
