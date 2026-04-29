# Remove Phone Mobile Adaptation

## TL;DR
> **Summary**: Remove phone-only APP/mobile adaptation code while preserving desktop and tablet behavior for the chemistry learning app. Treat tablets as supported at `>=768px` CSS width, including touch/pointer interactions.
> **Deliverables**:
> - Phone-only JS, markup, CSS breakpoints, and Playwright assertions removed or rewritten.
> - Desktop + tablet responsive behavior preserved and verified at `1366x768`, `1024x768`, and `768x1024`.
> - Static checks prove no active phone-specific `<=767`, `430`, or `390` adaptation remains.
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Tasks 2/3/4 → Task 5 → Task 6 → Final Verification Wave

## Context
### Original Request
用户要求："这个系统不考虑APP手机端适用，去掉这块代码。只适配电脑和平板即可。"

### Interview Summary
- Remove phone breakpoint / narrow-screen phone-specific layouts, prompts, branches, and tests.
- Keep desktop and tablet responsive support.
- Preserve tablet touch/pointer interactions.
- Use tests-after validation with existing Playwright tests plus build/data validators.
- Do not add a new “phone unsupported” blocker screen.

### Metis Review (gaps addressed)
- Define tablet floor as `>=768px` CSS width.
- Remove behavior, not merely names: phone-specific code must go; generic tablet-safe touch/viewport utilities may stay only with justification.
- Remove hamburger navigation entirely if it is phone-only.
- Keep viewport meta unless a specific phone-only attribute is proven harmful; do not remove generic viewport stability without evidence.
- Avoid redesign, breakpoint restructuring, data changes, or Three.js changes not directly caused by phone-code removal.

## Work Objectives
### Core Objective
Eliminate active phone/mobile APP adaptation from the application while keeping desktop and tablet experiences functional, testable, and visually consistent with existing behavior.

### Deliverables
- Source cleanup removing phone-only JS initialization and behavior.
- Markup/CSS cleanup removing phone hamburger, bottom-sheet, phone safe-area, phone keyboard, and `<768px` breakpoint behavior.
- Playwright test updates removing phone viewport coverage and strengthening desktop/tablet coverage.
- Verification evidence under `.sisyphus/evidence/` for every task.

### Definition of Done (verifiable conditions with commands)
- `npm run build` exits `0`.
- `npm run validate:data` exits `0`.
- `npx playwright test` exits `0`.
- Static search confirms no active app CSS media rules for `max-width: 767px`, `max-width: 430px`, or `max-width: 390px` remain unless inside comments explaining removal history.
- Static search confirms no runtime `window.innerWidth <= 767` phone branch remains.
- Static search confirms no phone-only hamburger markup/JS/styles remain.
- Playwright coverage verifies desktop `1366x768`, tablet landscape `1024x768`, and tablet portrait `768x1024`.

### Must Have
- Preserve desktop navigation and route access.
- Preserve tablet navigation and route access at `1024x768` and `768x1024`.
- Preserve tablet touch/pointer behavior needed for buttons/cards/panels.
- Preserve viewport-sensitive desktop/tablet rendering in table, timeline, detail panel, and Three.js canvas code.
- Rewrite or delete phone tests instead of leaving skipped stale tests.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Must not add a phone-blocker screen or new unsupported-device UX.
- Must not redesign tablet or desktop layouts.
- Must not introduce new breakpoints to replace removed phone breakpoints.
- Must not remove generic responsive utilities solely because they mention touch, viewport, pointer, or `dvh`.
- Must not modify chemistry content, data modules, business data imports, or unrelated feature logic.
- Must not edit `src/data/index.js` or `src/data/contentMeta.js`.
- Must not change Three.js scene behavior unless directly required by removed phone-only code.
- Must not require human visual confirmation; all QA is agent-executed.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after using Playwright browser tests; no unit-test framework exists.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.
- Core commands:
  - `npm run build`
  - `npm run validate:data`
  - `npx playwright test`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting. This plan has a small critical-path refactor; parallelism is limited by shared CSS/markup dependencies.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 foundation classification/static inventory.
Wave 2: Tasks 2, 3, 4 source/CSS/feature-style cleanup can proceed in parallel after Task 1, with coordination on selectors removed from markup.
Wave 3: Tasks 5 and 6 integrated Playwright/tablet verification and final static/build validation.

### Dependency Matrix (full, all tasks)
- Task 1: Blocks Tasks 2, 3, 4, 5, 6.
- Task 2: Blocked by Task 1; blocks Tasks 5, 6.
- Task 3: Blocked by Task 1; blocks Tasks 5, 6.
- Task 4: Blocked by Task 1; blocks Tasks 5, 6.
- Task 5: Blocked by Tasks 2, 3, 4; blocks Task 6.
- Task 6: Blocked by Task 5.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 1 task → `deep`
- Wave 2 → 3 tasks → `quick`, `visual-engineering`, `unspecified-high`
- Wave 3 → 2 tasks → `unspecified-high`, `quick`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Classify Phone-Only vs Tablet-Safe Code

  **What to do**: Create an implementation-local inventory before editing. Classify every mobile/responsive candidate as one of: `REMOVE_PHONE_ONLY`, `PRESERVE_TABLET_SAFE`, or `REWRITE_FOR_TABLET_DESKTOP`. Use the known candidate files below. The inventory can be written as task evidence; do not add permanent docs unless needed by the executor.
  **Must NOT do**: Do not edit source files in this task. Do not classify viewport-sensitive rendering code as removable just because it uses `innerWidth`, `resize`, touch, pointer, `dvh`, or viewport meta.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Requires careful classification to prevent tablet touch/responsive regressions.
  - Skills: [] - No code-writing skill required for inventory.
  - Omitted: [`frontend-design`] - This is not a design/redesign task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Tasks 2, 3, 4, 5, 6 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `index.html:5,14,60-64` - viewport meta and mobile hamburger markup candidates.
  - Pattern: `src/main.js:26,85` - imports and initializes `initMobile()`.
  - Pattern: `src/modules/mobile.js:1-157` - core phone/mobile adaptation module.
  - Pattern: `src/styles/responsive.css:4,23,30,50,159,490,590,609,735-787` - desktop/tablet/phone breakpoints and touch/safe-area rules.
  - Pattern: `src/styles/layout.css:1-3,6-22,51-87,176-190` - safe-area/header/hamburger base styles.
  - Pattern: `src/styles/base.css:71-77,86-88,215-228` - touch/tap/highlight/keyboard helper candidates.
  - Pattern: `src/modules/renderTable.js:528-537` - viewport clamping, preserve unless phone-only dependency exists.
  - Pattern: `src/modules/timeline.js:539-550` - viewport clamping, preserve unless phone-only dependency exists.
  - Pattern: `src/modules/detailPanel.js:167-170,260-266` - resize handling, preserve tablet behavior.
  - Pattern: `src/three/scene.js:40,49-51,92-115,140-142` - renderer/camera viewport resize, preserve.
  - Pattern: `src/three/electronModel.js:284-294` - container-based resize, preserve.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Evidence file `.sisyphus/evidence/task-1-classification.md` lists every referenced file and a classification for each relevant mobile/responsive construct.
  - [ ] The classification explicitly marks `max-width: 767px`, `max-width: 430px`, `max-width: 390px`, phone hamburger, phone bottom-sheet, and phone keyboard resize behavior as removal/rewrite targets.
  - [ ] The classification explicitly marks desktop/tablet breakpoints `1600`, `1366-1599`, `1365`, and `1199` as preserve targets.
  - [ ] The classification explicitly states whether any `.touch-active`, `.keyboard-open`, safe-area, or viewport meta code remains, and why.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Inventory covers all known candidates
    Tool: Bash
    Steps: Run static searches for "max-width: 767", "max-width: 430", "max-width: 390", "initMobile", "isMobileViewport", "keyboard-open", "touch-active", "hamburger", and compare results against .sisyphus/evidence/task-1-classification.md.
    Expected: Every search hit is represented in the inventory with REMOVE_PHONE_ONLY, PRESERVE_TABLET_SAFE, or REWRITE_FOR_TABLET_DESKTOP.
    Evidence: .sisyphus/evidence/task-1-classification-searches.txt

  Scenario: Tablet-safe code is not over-classified for deletion
    Tool: Bash
    Steps: Check inventory entries for renderTable, timeline, detailPanel, scene, and electronModel.
    Expected: Viewport resize/clamping code is marked PRESERVE_TABLET_SAFE unless a direct phone-only dependency is cited.
    Evidence: .sisyphus/evidence/task-1-tablet-safe-review.md
  ```

  **Commit**: NO | Message: `refactor(responsive): classify phone adaptation removal` | Files: [`.sisyphus/evidence/task-1-*`]

- [x] 2. Remove Phone Mobile Module, Initialization, and Hamburger Markup

  **What to do**: Remove active phone-only runtime behavior. Delete or fully disconnect `src/modules/mobile.js` if Task 1 confirms all useful generic touch behavior is migrated/preserved elsewhere. Remove `initMobile()` import and initialization from `src/main.js`. Remove phone hamburger button/markup from `index.html`. If any tablet-safe helper from `mobile.js` is still needed, move it to an appropriately named non-phone module or inline existing module logic; do not keep a `mobile` module for tablet support.
  **Must NOT do**: Do not remove route switching, desktop/tablet navigation, detail panel open/close behavior, storage, data imports, or Three.js resize logic. Do not add a phone unsupported screen.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Cross-file JS/markup removal with regression risk.
  - Skills: [] - No special skill needed; follow plan and classification.
  - Omitted: [`frontend-design`] - No visual redesign is allowed.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 5, 6 | Blocked By: Task 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/mobile.js:1-157` - remove phone-only hamburger, `window.innerWidth <= 767`, touch feedback, swipe-to-close bottom sheet, iOS/Android keyboard handling, `isMobileViewport()`.
  - Pattern: `src/main.js:26,85` - remove import and `initMobile()` call.
  - Pattern: `index.html:60-64` - remove phone hamburger markup if classified phone-only.
  - Pattern: `src/modules/router.js:71-115,130-140` - preserve route behavior and detail panel close-on-route-change.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Static search finds no `initMobile(` import/call in `src/main.js` or app source.
  - [ ] Static search finds no runtime `window.innerWidth <= 767` branch in app source.
  - [ ] Static search finds no active `isMobileViewport` export/import/call.
  - [ ] Hamburger markup removed from `index.html` if Task 1 classified it phone-only.
  - [ ] `npm run build` exits `0` after the JS/markup cleanup.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Desktop app boots without mobile initializer
    Tool: Bash
    Steps: Run npm run build.
    Expected: Command exits 0 with no unresolved import errors related to mobile.js/initMobile.
    Evidence: .sisyphus/evidence/task-2-build.txt

  Scenario: Phone-only runtime branches absent
    Tool: Bash
    Steps: Search src/ for initMobile, isMobileViewport, "innerWidth <= 767", "innerWidth<=767", and mobile hamburger event handlers.
    Expected: No active source-code matches remain, excluding comments in removal evidence.
    Evidence: .sisyphus/evidence/task-2-static-removal.txt
  ```

  **Commit**: NO | Message: `refactor(responsive): remove phone mobile runtime` | Files: [`index.html`, `src/main.js`, `src/modules/mobile.js` if deleted/renamed, any replacement tablet-safe helper file if required]

- [x] 3. Remove Phone CSS Breakpoints While Preserving Desktop and Tablet Layouts

  **What to do**: Update CSS so supported layouts are desktop and tablet only. Preserve desktop and tablet breakpoints in `src/styles/responsive.css`: `min-width:1600`, `1366-1599`, `max-width:1365`, and `max-width:1199`. Remove or rewrite phone-only blocks at `max-width:767px`, `max-width:430px`, and `max-width:390px`. Remove phone hamburger styles, bottom-sheet detail panel styles, phone horizontal table scrolling, phone safe-area layout overrides, phone keyboard-open layout rules, and phone-only touch hover overrides. Review `layout.css` and `base.css` for now-dead hamburger/safe-area/keyboard/touch-active helpers and remove only those classified as phone-only by Task 1.
  **Must NOT do**: Do not redesign desktop/tablet spacing, colors, typography, or component hierarchy. Do not remove tablet `max-width:1199px` rules. Do not remove generic `dvh`, pointer, or viewport behavior unless Task 1 classified it phone-only.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: CSS responsive cleanup with visual regression risk.
  - Skills: [`frontend-design`] - Use only to maintain production-grade responsive quality, not to redesign.
  - Omitted: [] - CSS execution benefits from frontend quality discipline.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 5, 6 | Blocked By: Task 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/styles/responsive.css:4,23,30,50` - preserve desktop/tablet breakpoints.
  - Pattern: `src/styles/responsive.css:159,490,590,609,735-787` - remove/rewrite phone breakpoint, narrow refinements, safe-area, and touch-device rules according to Task 1.
  - Pattern: `src/styles/layout.css:1-3,6-22,51-87,176-190` - remove phone-only safe-area/header/hamburger base styles; preserve normal shell layout.
  - Pattern: `src/styles/base.css:71-77,86-88,215-228` - review tap highlight, touch-action, `100dvh`, `.touch-active`, `.keyboard-open`.
  - Pattern: `src/styles/periodic-table.css:2-7,188-240` - preserve desktop baseline table grid/wrapper.
  - Pattern: `src/styles/panel.css:136-145` - preserve detail panel baseline/tablet behavior; remove only phone bottom-sheet dependency.

  **Acceptance Criteria** (agent-executable only):
  - [ ] No active CSS media rules remain for `max-width: 767px`, `max-width:767px`, `max-width: 430px`, `max-width:430px`, `max-width: 390px`, or `max-width:390px`.
  - [ ] `max-width: 1199px` tablet rules remain active where needed.
  - [ ] No active `.keyboard-open` phone layout class remains unless Task 1 explicitly justified it as tablet-safe.
  - [ ] No active phone hamburger CSS selectors remain after markup removal.
  - [ ] `npm run build` exits `0`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Phone breakpoints removed from CSS
    Tool: Bash
    Steps: Search src/styles for max-width 767, 430, and 390 variants with and without spaces.
    Expected: No active CSS rules remain for those breakpoints.
    Evidence: .sisyphus/evidence/task-3-phone-breakpoint-search.txt

  Scenario: Tablet breakpoint still exists
    Tool: Bash
    Steps: Search src/styles/responsive.css for max-width 1199.
    Expected: At least one active tablet rule remains; no evidence that tablet rules were collapsed into desktop-only layout.
    Evidence: .sisyphus/evidence/task-3-tablet-breakpoint-search.txt
  ```

  **Commit**: NO | Message: `refactor(styles): remove phone responsive rules` | Files: [`src/styles/responsive.css`, `src/styles/layout.css`, `src/styles/base.css`, `src/styles/periodic-table.css`, `src/styles/panel.css` if required]

- [x] 4. Clean Feature-Specific Phone Rules Without Breaking Tablet Sections

  **What to do**: Review feature CSS responsive rules and remove only phone-specific rules below the tablet floor. In `achievements.css`, inspect `900px` and `640px` rules: preserve `900px` tablet-friendly behavior; remove/rewrite `640px` if it is phone-only. In `games.css` and `lab.css`, preserve `900px` tablet rules unless they depend on removed phone constructs. Verify achievements, progress, games, lab, and story sections remain reachable and usable at desktop/tablet sizes.
  **Must NOT do**: Do not change feature content, data, quiz logic, achievements logic, storage, or route definitions. Do not redesign cards/grids beyond removing phone-only rules.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Targeted CSS cleanup once Task 1 classification exists.
  - Skills: [`frontend-design`] - Use only for careful responsive preservation.
  - Omitted: [] - Visual regression risk is CSS-specific.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 5, 6 | Blocked By: Task 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/styles/achievements.css:427-466` - `900px` and `640px` achievement/progress popup/layout rules.
  - Pattern: `src/styles/games.css:519-535` - `900px` story/quiz grid responsive rules.
  - Pattern: `src/styles/lab.css:256-274` - `900px` lab toolbar/stage responsive rules.
  - Pattern: `src/modules/router.js:71-115` - route section toggling; feature sections must remain reachable.
  - Test: `tests/ui/route-shells.spec.ts` - route shell rendering pattern.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `640px` feature CSS rules are removed or rewritten unless Task 1 evidence justifies them as non-phone tablet-safe.
  - [ ] `900px` feature CSS rules remain where needed for tablet layouts.
  - [ ] `npm run build` exits `0`.
  - [ ] Playwright route checks for `games`, `lab`, `achievements`, `progress`, and `story` pass at `1024x768` or `768x1024`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Tablet feature routes remain reachable
    Tool: Playwright
    Steps: Set viewport to 1024x768; navigate to home; activate routes games, lab, achievements, progress, and story using existing navigation selectors from route-shell tests.
    Expected: Each route section becomes active/visible and no hamburger/mobile-only control is required.
    Evidence: .sisyphus/evidence/task-4-tablet-routes.png

  Scenario: Phone-only feature breakpoint removed or justified
    Tool: Bash
    Steps: Search src/styles/achievements.css, src/styles/games.css, and src/styles/lab.css for max-width 640 and any 767/430/390 variants.
    Expected: No active phone-only feature breakpoint remains unless .sisyphus/evidence/task-1-classification.md explicitly justifies it.
    Evidence: .sisyphus/evidence/task-4-feature-breakpoint-search.txt
  ```

  **Commit**: NO | Message: `refactor(features): remove phone-only feature styles` | Files: [`src/styles/achievements.css`, `src/styles/games.css`, `src/styles/lab.css`]

- [x] 5. Rewrite Playwright Coverage for Desktop and Tablet Only

  **What to do**: Remove or rewrite phone viewport tests. Delete `tests/ui/mobile-shell.spec.ts` if all cases are phone-only, or rewrite it into a tablet/desktop shell spec with a non-mobile name. Update `tests/shell/home-shell.spec.ts` by removing `390x844` phone shell/menu/bottom-sheet assertions and retaining/strengthening desktop `1440x900`, tablet landscape `1024x768`, and tablet portrait `768x1024` assertions. Update `tests/ui/periodic-table-controls.spec.ts` by replacing `390x844` mobile overflow expectations with tablet/desktop periodic table usability checks. Ensure no test expects hamburger/mobile nav controls or phone bottom-sheet behavior.
  **Must NOT do**: Do not skip phone tests without deleting or rewriting them. Do not leave stale assertions for removed selectors. Do not add Playwright mobile device projects.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Test suite refactor must align with source removal and prevent false positives.
  - Skills: [`playwright`] - Browser test execution and selector verification.
  - Omitted: [`frontend-design`] - No UI design change in tests.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Task 6 | Blocked By: Tasks 2, 3, 4

  **References** (executor has NO interview context - be exhaustive):
  - Test: `tests/shell/home-shell.spec.ts:57-145,193-199` - desktop/tablet/mobile shell tests; preserve tablet and remove phone assertions.
  - Test: `tests/ui/mobile-shell.spec.ts:1-73` - dedicated phone shell tests; delete or rewrite to tablet-only name.
  - Test: `tests/ui/periodic-table-controls.spec.ts:235-251` - mobile overflow/table-wrapper scroll regression at `390x844`; rewrite for tablet/desktop.
  - Test: `tests/ui/route-shells.spec.ts` - route shell rendering pattern.
  - Config: `playwright.config.ts:18-23` - only Desktop Chrome project; viewport sizes are set manually in tests.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Static search in `tests/` finds no active `390x844`, `430x932`, phone-only hamburger expectation, or bottom-sheet expectation.
  - [ ] Tests include desktop `1366x768` or larger, tablet landscape `1024x768`, and tablet portrait `768x1024` coverage.
  - [ ] Tests assert primary navigation is visible at supported sizes and hamburger/mobile nav controls are absent.
  - [ ] `npx playwright test tests/shell/home-shell.spec.ts tests/ui/route-shells.spec.ts tests/ui/periodic-table-controls.spec.ts` exits `0`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Tablet portrait works without phone navigation
    Tool: Playwright
    Steps: Set viewport 768x1024; open app; verify primary navigation is visible; verify no hamburger/mobile menu button is visible or present; navigate to periodic-table and open an element detail using existing selectors.
    Expected: Navigation and detail interaction work without phone bottom-sheet/hamburger behavior.
    Evidence: .sisyphus/evidence/task-5-tablet-portrait.png

  Scenario: Phone viewport assertions removed from tests
    Tool: Bash
    Steps: Search tests/ for 390x844, 430x932, mobile-shell, hamburger mobile expectations, and bottom-sheet expectations.
    Expected: No active phone viewport assertions remain; if a renamed tablet shell spec exists, it contains only >=768 viewport coverage.
    Evidence: .sisyphus/evidence/task-5-test-static-search.txt
  ```

  **Commit**: NO | Message: `test(responsive): focus coverage on desktop and tablet` | Files: [`tests/shell/home-shell.spec.ts`, `tests/ui/mobile-shell.spec.ts` or replacement, `tests/ui/periodic-table-controls.spec.ts`, any route/tablet spec updates]

- [x] 6. Final Static, Build, Data, and Browser Verification

  **What to do**: Run the complete verification suite and collect evidence. Confirm app source and tests no longer contain active phone-specific adaptation. Run build, data validation, and full Playwright. If any failure occurs, fix the source/test issue within the already defined scope and rerun the failing command plus the final full command.
  **Must NOT do**: Do not broaden scope into redesign, new test infrastructure, CI setup, data changes, or unsupported phone blocker UX.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Verification and scoped fixes after implementation tasks.
  - Skills: [`verification-before-completion`, `playwright`] - Evidence-first completion and browser regression.
  - Omitted: [`git-master`] - Do not commit unless the user separately asks.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: Task 5

  **References** (executor has NO interview context - be exhaustive):
  - Command: `npm run build` - production build.
  - Command: `npm run validate:data` - data validation and business import audit.
  - Command: `npx playwright test` - full browser regression suite.
  - Config: `package.json:6-12` - available npm scripts.
  - Config: `playwright.config.ts` - browser test setup.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run build` exits `0`; output saved to `.sisyphus/evidence/task-6-build.txt`.
  - [ ] `npm run validate:data` exits `0`; output saved to `.sisyphus/evidence/task-6-validate-data.txt`.
  - [ ] `npx playwright test` exits `0`; output saved to `.sisyphus/evidence/task-6-playwright.txt`.
  - [ ] Static removal report confirms no active phone-specific adaptation remains for the terms listed in QA Scenario 2.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full supported-platform regression passes
    Tool: Bash
    Steps: Run npm run build; run npm run validate:data; run npx playwright test.
    Expected: All commands exit 0.
    Evidence: .sisyphus/evidence/task-6-build.txt, .sisyphus/evidence/task-6-validate-data.txt, .sisyphus/evidence/task-6-playwright.txt

  Scenario: Active phone adaptation is gone
    Tool: Bash
    Steps: Search app source and tests for active max-width 767/430/390 rules, window.innerWidth <= 767, isMobileViewport, initMobile, mobile-shell, phone hamburger selectors, keyboard-open, and phone bottom-sheet expectations.
    Expected: No active phone adaptation remains; any remaining match is either a removal note in evidence or a Task 1-justified tablet-safe generic utility.
    Evidence: .sisyphus/evidence/task-6-static-removal-report.txt
  ```

  **Commit**: NO | Message: `chore(responsive): verify desktop tablet support` | Files: [`.sisyphus/evidence/task-6-*`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Do not commit by default. The user has not requested a git commit.
- If the user later requests a commit, use one final commit after all verification passes.
- Suggested final commit message: `refactor(responsive): remove phone adaptation`
- Never include `.env`, credentials, or unrelated generated files.

## Success Criteria
- Phone/mobile APP adaptation code is removed from active runtime, CSS, and tests.
- Desktop and tablet support remains verified at `1366x768`, `1024x768`, and `768x1024`.
- Tablet touch/pointer interactions continue to work.
- Build, data validation, and Playwright all pass.
- No human visual confirmation is required; evidence files document outcomes.
