# F4 Scope Fidelity Check — Deep Review

## Reviewer
Final Verification Wave F4 — Scope Fidelity Check (deep)

## Date
2026-05-20

## Scope
Independently assess whether implementation stayed inside scope and faithfully solved the user's Chinese requirements without introducing a full textbook reader, backend, role system, unrelated UI redesign, or generated achievement ID renames.

> **Note**: The previous `.sisyphus/evidence/f4-scope-fidelity.md` contained stale content from the `experiment-dedup-safety` plan (dated 2026-05-17). This file replaces it with the current review for `achievement-progress-unlock-paths`.

---

## Original Requirements Mapping (Plan Lines 15-24)

### Bullet 1: 成就和进度两个模块有关联；没达成成就，就不会有进度
**Status: PASS**
- Evidence: `src/modules/progress.js:144-145` — `manualCompleted` is derived from `unlockedAchievements.has(manualAchievement.id)`, not from raw `completedLearningSegments`.
- Evidence: `src/modules/progress.js:155` — `displayCompleted = stagePathCompleted || manualCompleted`; manual topic completion requires the matching achievement unlock.
- Evidence: F3 manual flow (`f3-real-manual-qa.json`): before explicit completion, progress row shows `未开始`; after `完成学习` click and achievement unlock, row shows `已完成`.
- Raw segment evidence alone does not show `已完成`: `f3-real-manual-qa.json` `afterNavigationOnly` shows row still `未开始` with empty `completedLearningSegments`.

### Bullet 2: 成就里的所有卡片都必须有能解锁的操作途径
**Status: PASS**
- Evidence: `src/modules/achievements.js:314-316` — every rendered card with a routable condition gets exactly one `<button data-achievement-action="...">`.
- Evidence: `tests/ui/achievements-progress-coupling.spec.ts` test `every achievement card has an operable action` audits all `achievementsData.length` cards and asserts one visible, enabled button per card.
- Evidence: `getAchievementActionTarget()` (`achievements.js:239-261`) maps all current condition types to router sections; no card is left without a target when a condition exists.
- Manual cards map to `progress` section; learned/experiment/quiz/game cards map to `periodic-table`, `lab`, `games`.

### Bullet 3: 方案 B 采用“用户完成对应教材片段学习后解锁”
**Status: PASS**
- Evidence: `src/modules/progress.js:618-650` — `renderManualLearningSegmentRow()` renders a `完成学习` button for each manual segment.
- Evidence: `src/modules/progress.js:387-394` — clicking the button calls `markLearningSegmentCompleted(segmentId, { achievementId, source: 'progress-manual-segment' })`.
- Evidence: `src/modules/achievements.js:141-145` — `matchesCondition()` requires `sourceReviewStatus === 'reviewed'`, exactly one non-empty curriculum tag, and matching completed segment evidence.
- Evidence: `src/modules/achievements.js:107-111` — startup evaluation skips `manualReviewAfterPromotion` to prevent auto-unlock on page load.

### Bullet 4: 教材片段必须点击 `完成学习` 按钮确认，打开页面不自动完成
**Status: PASS**
- Evidence: `tests/ui/achievements-progress-coupling.spec.ts` test `manual textbook achievement requires explicit completion` asserts: card action click → progress page → row visible with `未开始` → reload → still `未开始` → button click → `已完成`.
- Evidence: `src/modules/progress.js:412-415` — `readAchievementActionFocus()` only sets `focusedLearningSegmentId` for row highlighting; it does not call `markLearningSegmentCompleted()`.
- Evidence: F3 evidence `afterNavigationOnly` confirms navigation alone leaves segment uncompleted and achievement locked.

---

## Scope Guardrails Verification (Plan Must NOT Have)

| Guardrail | Status | Evidence |
|-----------|--------|----------|
| MUST NOT auto-complete on navigation, scroll, visibility, or page open | PASS | `readAchievementActionFocus()` only highlights; `evaluateAchievements({ includeManualReview: false })` on init skips manual unlocks |
| MUST NOT build a full textbook reader | PASS | Progress page renders lightweight segment rows with metadata and a button; no markdown rendering, no page-turning, no text content display beyond heading/line-range |
| MUST NOT build reviewer workflow, user roles, backend API, or content editor | PASS | No reviewer UI, no role checks, no fetch to external API, no editor surface added |
| MUST NOT relock or delete existing unlocked achievements during migration | PASS | `migratePersistedEnvelope()` preserves `unlockedAchievements` arrays; no deletion logic |
| MUST NOT change unrelated story/media/lab/game UI behavior | PASS | Diff shows zero changes in `src/modules/storyMode.js`, `src/modules/lab.js`, `src/modules/games.js`, `src/games/`, `src/lab/` |
| MUST NOT leave `manualReviewAfterPromotion` as visible user-facing copy | PASS | `getAchievementUnlockText()` returns `完成对应教材片段学习`; action label is `去学习`; F3 scan confirms `internalConditionHidden: true` |
| MUST NOT rename generated achievement IDs | PASS | All achievement IDs remain unchanged in `achievementsData.json`; only rendering and evaluation logic changed |
| MUST NOT introduce broad unrelated UI redesign | PASS | CSS changes are additive (`.progress-manual-segment-row`, `.achievement-action-btn`) within existing `achievements.css`; no global style overhaul |

---

## AGENTS Learner-State Contract Verification

| Rule | Status | Evidence |
|------|--------|----------|
| `learnedElements` adds on first detail-panel open | PASS | `markElementLearned()` unchanged; still mirrors to `collectedElements` |
| `collectedElements` mirrors `learnedElements` automatically | PASS | `markElementLearned()` line 798 adds to both sets; `ensureCollectedMatchesLearned()` guards on hydration |
| `completedExperiments` remains experiment-result driven | PASS | No changes to `markExperimentCompleted()` contract |
| `quizScores` appends with `score`, `total`, `percentage`, `sourceElement`, `timestamp` | PASS | `normalizeQuizScore()` now emits all five fields; legacy aliases (`accuracy`, `relatedElement`, `completedAt`) preserved for existing consumers |
| `unlockedAchievements` derived from canonical event handlers | PASS | `unlockAchievement()` is the only mutation path; `evaluateAchievements()` calls it; no scattered UI logic unlocks |
| State persisted via versioned localStorage with corruption recovery | PASS | `SCHEMA_VERSION = 'v3'`; `migratePersistedEnvelope()` handles v0/v1/v2/v3; `normalizeLearningSegmentIds()` trims/filters invalid values |

---

## Chinese-First UX Verification

| Surface | Visible Copy | Evidence |
|---------|-------------|----------|
| Achievement action buttons | `去学习元素`, `去实验室`, `去答题`, `去游戏`, `去学习` | `achievements.js:269-285` |
| Manual unlock condition text | `完成对应教材片段学习` | `achievements.js:288-293` |
| Progress segment status | `未开始`, `待同步`, `已完成` | `progress.js:621` |
| Progress completion button | `完成学习` | `progress.js:646` |
| Achievement card status | `已解锁` / `未解锁` | `achievements.js:337` |
| No raw `manualReviewAfterPromotion` in rendered body | Confirmed absent | F3 `visibleCopy.containsInternalCondition: false` |

---

## Unrelated Changes Assessment

The git diff includes files outside the plan's direct scope, but all are either pre-existing or plan-adjacent:
- `dist/index.html` — generated build churn, not product scope
- `.sisyphus/plans/achievement-progress-unlock-paths.md` — plan file changed by workflow (not by this review)
- `.sisyphus/evidence/*` — evidence artifacts from task execution
- `.sisyphus/boulder.json` — workflow state

No unrelated product behavior changes are present.

---

## Final Verdict

**VERDICT: APPROVE**

All four original Chinese requirement bullets are faithfully implemented. Scope guardrails are fully respected. No scope creep, backend, role system, textbook reader, unrelated UI redesign, or achievement ID renames are present. The implementation is lightweight, Chinese-first, and preserves all AGENTS learner-state hard rules.
