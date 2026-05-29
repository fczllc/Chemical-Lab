# Fix Learning Tabs Top Layout

## TL;DR
> **Summary**: The 8教材 TAB DOM and data exist, but old progress dashboard content renders above them and pushes them ~133,795px below the viewport. Move the textbook TAB learning section to the top of 学习 and remove/relocate the old dashboard content from the top.
> **Deliverables**: `src/modules/progress.js` layout change, optional focused CSS only if needed, Playwright/runtime proof that 8教材 TABs are visible near the top.
> **Effort**: Quick
> **Parallel**: NO
> **Critical Path**: Task 1 → Task 2 → Task 3

## Context
- Current HEAD: `1337746 chore(workspace): commit remaining changes`.
- Target feature code exists in `src/modules/progress.js`: `KNOWN_TEXTBOOK_ORDER`, `TEXTBOOK_TAB_LABELS`, `getTextbookGroups`, `[data-textbook-tab]`, `.progress-textbook-tabs`, and `[data-testid="learning-card"]`.
- Data is complete: eight教材 counts are `347, 340, 222, 213, 263, 198, 146, 280`.
- Fresh targeted Playwright passed: `npx playwright test tests/content/pep-learning-tabs.spec.js --project=chromium` → `1 passed (26.0s)`.
- Manual browser inspection found 8 tabs in DOM, but `.progress-textbook-tabs` rect was `y≈133795`, outside viewport.
- User confirms the old removed content is still above the教材 TAB area.

## Work Objectives
### Core Objective
Make 学习 page open directly to教材 TAB navigation and教材学习卡片, not the old progress dashboard/statistics content.

### Definition of Done
- On `http://127.0.0.1:5173/#/progress`, `.progress-textbook-tabs` exists and its top is visible near the first screen: `0 <= rect.top <= 900`.
- Exactly 8 `[data-textbook-tab]` elements exist.
- Tab labels are the eight教材 labels in order.
- `[data-testid="learning-card"]` count is positive and tab switching still works.
- The old top content (`学习路径与成长仪表板`, `近期学习活动`, `测验统计`, `游戏统计`, `实验与成就`, `五阶段学习路径`) is not rendered above the教材 tabs.
- `npx playwright test tests/content/pep-learning-tabs.spec.js --project=chromium` passes.

## TODOs

- [x] 1. Inspect current render tree and decide exact removal/relocation boundary

  **What to do**: Read `src/modules/progress.js` around `renderProgress()` and identify the minimum template change. The likely target is lines 595-682: old `progress-dashboard` and `progress-learning-path` content wraps the manual learning section at the very end.
  **Must NOT do**: Do not change data loading, storage, achievement semantics, or textbook grouping logic.

  **Acceptance Criteria**:
  - [ ] Confirm the old content is generated before `${renderManualLearningSection(...)}`.
  - [ ] Confirm `renderManualLearningSection(...)` is the desired top content.

  **Commit**: NO

- [x] 2. Make 学习 top content教材 TAB-first

  **What to do**: Edit `src/modules/progress.js` so `container.innerHTML` renders `${renderManualLearningSection(unlockedAchievements, completedLearningSegments)}` as the first/main section in 学习. Remove the old top dashboard/statistics/stage-path blocks from the top of 学习. If preserving old stats is desired, put them after the教材 section under a clearly lower section; default is remove from 学习 top to match user request.
  **Must NOT do**: Do not remove `getTextbookGroups`, `renderLearningCard`, lesson modal functions, completion actions, or the 8教材 order/labels.

  **Acceptance Criteria**:
  - [ ] `src/modules/progress.js` renders the manual learning section before any old dashboard/statistics content.
  - [ ] Top visible text after opening 学习 includes教材 TAB labels, not `学习路径与成长仪表板`.
  - [ ] No learner-state or storage APIs changed.

  **Commit**: NO

- [x] 3. Verify visible TAB layout in browser and targeted test

  **What to do**: Run/keep Vite from `D:\Chemical-Laboratory`, open `http://127.0.0.1:5173/#/progress`, inspect DOM geometry, then run targeted Playwright.

  **Acceptance Criteria**:
  - [ ] Browser evaluation returns `tabsCount: 8`.
  - [ ] Browser evaluation returns `.progress-textbook-tabs` rect top in viewport (`0 <= top <= 900`).
  - [ ] Browser evaluation returns `learningCards > 0`.
  - [ ] `npx playwright test tests/content/pep-learning-tabs.spec.js --project=chromium` passes.

  **Commit**: NO

## Success Criteria
- User can open 学习 and immediately see the 8教材 TAB menu with教材 names.
- The old dashboard/statistics content no longer occupies the top before教材 TABs.
