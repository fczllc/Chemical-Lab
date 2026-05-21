# Achievement Readonly Learning Confirmation

## TL;DR
> **Summary**: Make Achievements read-only for manual learning achievements by removing the `去学习` navigation button/action row.
> **Deliverables**:
> - `manualReviewAfterPromotion` achievement cards render no action row/button.
> - No achievement action navigation/sessionStorage focus is created for manual learning achievements.
> - `.achievement-action-hint` is direct text with no border/background and literal `font-size: 0.8rem`.
> - Playwright/build verification evidence.
> **Effort**: Quick
> **Parallel**: NO
> **Critical Path**: Task 1 → Final Verification Wave

## Context
### Original Request
成就模块是只读、查看成果的，所以“去学习”跳转没必要。取消成就卡片里的“去学习”按钮；用户随后确认该提示行也不需要，因为解锁条件已经说明。用户会手动测试。

### Interview Summary
- Final behavior is to remove the manual-learning action row entirely; no `通过学习完成` hint is needed.
- Target is the achievement card action/tag row; latest instruction removes both manual-review and learned-elements action/tag rows.
- `0.8rem` is the final requested font size from the user.
- Achievements must remain read-only; completion/confirmation stays in Learning/Progress.

### Metis Review (gaps addressed)
- Make `manualReviewAfterPromotion` non-actionable at the source, not merely visually disabled.
- Do not leave `data-achievement-action` or a `<button>` on the manual learning card.
- Verify no navigation and no `sessionStorage.achievementActionFocus` write.
- Latest user update: remove learned-elements hint `通过周期表查看元素实现` too because unlock conditions already explain the requirement.
- Treat user manual testing as additional only; plan still requires agent-executable verification.

## Work Objectives
### Core Objective
Remove the Achievements module's `去学习` navigation affordance/action row for manual learning achievements.

### Deliverables
- Updated Achievements rendering logic in `src/modules/achievements.js`.
- Updated hint styling in `src/styles/achievements.css`.
- Playwright coverage for rendering, non-navigation, sessionStorage, and CSS behavior.
- Successful production build.

### Definition of Done (verifiable conditions with commands)
- `npx playwright test tests/ui/achievements.spec.js -g "manual review"` exits `0` after adding/updating focused tests.
- `npx playwright test tests/ui/achievements.spec.js -g "learned elements"` exits `0` for regression coverage.
- `npm run build` exits `0`.
- Evidence files saved under `.sisyphus/evidence/`.

### Must Have
- `manualReviewAfterPromotion` achievement cards show no action row/button/hint.
- Those cards contain zero `.achievement-action-btn` descendants.
- Those cards contain zero `[data-achievement-action]` descendants.
- Clicking/selecting the hint does not navigate away from Achievements.
- `sessionStorage.getItem('achievementActionFocus')` is unchanged/null after interacting with the hint.
- `.achievement-action-hint` has no border and no decorative background.
- `.achievement-action-hint` uses literal `font-size: 0.8rem`.

### Must NOT Have
- Do not edit Learning/Progress manual completion logic.
- Do not alter storage state contracts or migrations.
- Do not add disabled buttons, `aria-disabled` buttons, or `pointer-events: none` as the primary fix.
- Do not keep `manualReviewAfterPromotion` mapped to a navigable `progress` action.
- Do not rename existing achievement data IDs or categories.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after using Playwright, because this is a focused UI behavior change and existing implementation already exists.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-1-achievement-readonly-hint.txt`, `.sisyphus/evidence/task-1-achievement-readonly-hint.png`, `.sisyphus/evidence/final-build-achievement-readonly.txt`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 `[quick]` — Achievements rendering, styling, and focused tests.
Final Wave: F1-F4 review agents in parallel.

### Dependency Matrix (full, all tasks)
| Task | Blocks | Blocked By |
| --- | --- | --- |
| 1. Replace achievement learning action with read-only hint | F1-F4 | none |
| F1-F4 | completion | Task 1 |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Count | Categories |
| --- | --- | --- |
| 1 | 1 | quick |
| Final | 4 | oracle, unspecified-high, unspecified-high, deep |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Replace manual learning achievement action with read-only hint

  **What to do**:
  1. In `src/modules/achievements.js`, update `getAchievementActionTarget(condition)` so `condition.type === 'manualReviewAfterPromotion'` returns no navigable target (`null`) instead of `progress`.
  2. In `src/modules/achievements.js`, update `getAchievementActionLabel(condition)` so it no longer returns `去学习` for `manualReviewAfterPromotion`.
  3. In `renderAchievementCard(achievement, unlockedIds, unlockDates)`, do not render any action control for `achievement.condition?.type === 'manualReviewAfterPromotion'`.
  4. Remove the existing `learnedElements` branch rendering `<span class="achievement-action-hint">通过周期表查看元素实现</span>` and prevent learned-elements cards from falling back to a button.
  5. In `src/styles/achievements.css`, update `.achievement-action-hint` to be direct text:
     - Keep layout alignment that makes the row occupy the card width if needed.
     - Set `border: 0;` or remove all borders.
     - Set background to transparent/no decorative container.
     - Set literal `font-size: 0.8rem;`.
     - Keep `cursor: default`.
  6. Add or update Playwright tests in the existing Achievements UI test file. If no suitable file exists, create one under `tests/ui/achievements.spec.js` following existing Playwright patterns in `tests/ui/`.
  7. Save command output and, if practical, a screenshot to `.sisyphus/evidence/`.

  **Must NOT do**:
  - Do not modify `src/modules/progress.js` manual learning completion behavior.
  - Do not make the new hint a disabled button.
  - Do not leave `manualReviewAfterPromotion` with `data-achievement-action="progress"`.
  - Do not reintroduce the existing learned-elements hint text.
  - Do not change achievement unlocking conditions in `matchesCondition()`.

  **Recommended Agent Profile**:
  - Category: `quick` - Small, bounded JS/CSS/test change in one UI module.
  - Skills: [`test-driven-development`] - Add regression tests around UI behavior before or alongside implementation.
  - Omitted: [`frontend-design`] - User specified exact copy/style; no design exploration needed.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: F1-F4 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/achievements.js:62-87` - Click handler for `[data-achievement-action]`; new manual learning hint must not match this selector.
  - Pattern: `src/modules/achievements.js:239-260` - Action target mapping; remove `manualReviewAfterPromotion -> progress` navigation source.
  - Pattern: `src/modules/achievements.js:263-285` - Action label mapping; remove/replace `去学习` for manual review achievements.
  - Pattern: `src/modules/achievements.js:295-324` - Current action rendering; follow existing `learnedElements` span pattern and add manual-review span branch before generic button branch.
  - Pattern: `src/styles/achievements.css:247-310` - Existing button/hint styling; update `.achievement-action-hint`, not `.achievement-action-btn`, unless tests reveal necessary cleanup.
  - Test pattern: `tests/ui/` - Use existing Playwright setup and selectors from nearby UI specs.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Manual-review achievement card does not contain `去学习` or `通过学习完成`.
  - [ ] The same card has zero `.achievement-action-btn` descendants.
  - [ ] The same card has zero `[data-achievement-action]` descendants.
  - [ ] The same hint is not keyboard-focusable as a button and has no `role="button"`.
  - [ ] Clicking text `通过学习完成` leaves the app on the Achievements section.
  - [ ] Clicking text `通过学习完成` does not create/update `sessionStorage.achievementActionFocus`.
  - [ ] A learned-elements achievement no longer contains text `通过周期表查看元素实现` and has zero `[data-achievement-action]` descendants.
  - [ ] `.achievement-action-hint` computed styles show `font-size` equivalent to literal `0.8rem` under the app root, all border widths `0px`, and transparent/no decorative background per final CSS.
  - [ ] `npm run build` exits `0`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Manual learning achievement is informational only
    Tool: Playwright
    Steps:
      1. Open the app on the Achievements section.
      2. Locate a card whose unlock condition/type is manualReviewAfterPromotion, or locate by visible text previously associated with the manual learning achievement.
      3. Assert the card contains visible text "通过学习完成".
      4. Assert card.locator('.achievement-action-btn').count() === 0.
      5. Assert card.locator('[data-achievement-action]').count() === 0.
      6. Assert the hint has no role="button" and no tabindex.
    Expected: The manual learning achievement displays only read-only hint text, with no actionable descendants.
    Evidence: .sisyphus/evidence/task-1-achievement-readonly-hint.txt

  Scenario: Manual learning hint does not navigate or set focus payload
    Tool: Playwright
    Steps:
      1. Open the app on the Achievements section.
      2. Clear sessionStorage key "achievementActionFocus".
      3. Click visible text "通过学习完成".
      4. Assert the Achievements section remains active or URL/router state remains on achievements.
      5. Assert sessionStorage.getItem('achievementActionFocus') is null.
    Expected: No navigation occurs and no achievement focus payload is written.
    Evidence: .sisyphus/evidence/task-1-achievement-readonly-hint-navigation.txt

  Scenario: Existing learned-elements hint is removed
    Tool: Playwright
    Steps:
      1. Open the app on the Achievements section.
      2. Locate learned-elements achievement cards.
      3. Assert text "通过周期表查看元素实现" is absent.
      4. Assert the same cards contain zero [data-achievement-action] descendants.
    Expected: Learned-elements achievement hints/actions are removed; unlock conditions remain in the metadata list.
    Evidence: .sisyphus/evidence/task-1-learned-elements-hint-regression.txt

  Scenario: Hint visual styling matches requested direct text
    Tool: Playwright
    Steps:
      1. Open the app on the Achievements section.
      2. Read computed styles for the first .achievement-action-hint.
      3. Assert font-size is the computed equivalent of CSS 0.8rem.
      4. Assert border widths are 0px.
      5. Assert background is transparent/no decorative background according to implemented CSS.
    Expected: The hint row is direct text, not a bordered button-like control.
    Evidence: .sisyphus/evidence/task-1-achievement-hint-style.png
  ```

  **Commit**: NO | Message: `fix(achievements): make learning action read-only` | Files: `src/modules/achievements.js`, `src/styles/achievements.css`, `tests/ui/achievements.spec.js` or existing relevant test file, `.sisyphus/evidence/*`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Do not commit unless the user explicitly requests it.
- If committing later, inspect status/diff/log first and commit only intended source/test files.

## Success Criteria
- Manual learning achievements in Achievements are no longer navigational.
- The user no longer sees `去学习`, `通过学习完成`, or `通过周期表查看元素实现` action/tag rows.
- Existing `通过周期表查看元素实现` hints are removed because unlock conditions already explain the requirement.
- Styling matches the requested direct-text, borderless `0.8rem` row.
- Automated Playwright checks and `npm run build` pass.
