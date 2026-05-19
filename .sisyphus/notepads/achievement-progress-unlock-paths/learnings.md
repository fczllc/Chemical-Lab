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
