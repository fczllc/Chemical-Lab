# Shared Game Feedback Overlay

## TL;DR
> **Summary**: Add one reusable, non-blocking emoji overlay for correct/incorrect rule feedback across the four scoped games. Correct actions show `🎆`; incorrect actions show `😟`.
> **Deliverables**:
> - Shared feedback overlay utility and CSS animation
> - Integrations for element drag placement, memory matching, reaction matching, and full quiz challenge only
> - Playwright verification for included and excluded flows
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Tasks 2-4 → Task 5

## Context
### Original Request
- Add feedback animation: correct operations show celebratory firework; wrong operations show sad expression.
- Make the rule apply across games through a common overlay.
- Simplify correct feedback to an emoji firework.

### Interview Summary
- Correct/success emoji: fixed `🎆`.
- Incorrect/failure emoji: fixed `😟`.
- Scope includes exactly four experiences: element drag placement, element memory matching, reaction matching, full quiz challenge.
- Scope excludes quick quiz and collector wall.
- Overlay must be decorative, click-through, auto-disappearing, and must not pause timers or block interaction.

### Metis Review (gaps addressed)
- Mount overlay outside volatile rerender regions to avoid losing the animation during game rerenders.
- Use a single restartable overlay instance to avoid stacked emoji nodes on rapid triggers.
- Gate quiz integration by explicit full-quiz mode so quick quiz is not affected.
- Do not alter game rules, scoring, timers, matching logic, quiz answer logic, or completion conditions.
- Default unresolved accessibility choice: overlay is decorative with `aria-hidden="true"`; existing text feedback remains the accessible feedback channel.

## Work Objectives
### Core Objective
Create a shared rule-feedback overlay that visually reinforces correct and incorrect game actions without changing gameplay behavior.

### Deliverables
- Shared JS helper for triggering overlay feedback.
- Shared CSS for `.game-rule-feedback-overlay` and its correct/incorrect states.
- Calls wired into four existing rule-result decision points.
- Playwright tests or equivalent browser checks proving included and excluded behavior.

### Definition of Done (verifiable conditions with commands)
- `npm run build` exits 0.
- `npx playwright test` exits 0 after implementing required Playwright coverage.
- Browser checks confirm `🎆` appears for correct actions and `😟` appears for incorrect actions in all four scoped games.
- Browser checks confirm quick quiz and collector do not trigger `.game-rule-feedback-overlay`.

### Must Have
- One shared overlay implementation; no duplicated per-game emoji markup.
- Overlay mounted in a stable location such as `document.body` or another non-rerendered root.
- `.game-rule-feedback-overlay` has `pointer-events: none` and `aria-hidden="true"`.
- Repeated triggers restart/replace the same overlay instance; multiple overlay elements must not accumulate.
- Correct emoji is exactly `🎆`; incorrect emoji is exactly `😟`.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No canvas, particle engine, Three.js effect, external firework library, or new dependency.
- No changes to scoring, timers, answer correctness, matching rules, or completion conditions.
- No quick quiz integration.
- No collector wall integration.
- No replacement/removal of existing textual feedback.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + Playwright. If Playwright config is missing, add minimal project-local config/scripts required by existing plan conventions.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 foundation shared overlay utility/CSS.
Wave 2: Tasks 2-4 integrate game-center games and full quiz in parallel after shared API exists.
Wave 3: Task 5 Playwright verification and exclusions.

### Dependency Matrix (full, all tasks)
- Task 1: no dependencies; blocks Tasks 2-5.
- Task 2: depends on Task 1; blocks Task 5.
- Task 3: depends on Task 1; blocks Task 5.
- Task 4: depends on Task 1; blocks Task 5.
- Task 5: depends on Tasks 1-4.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 1 task → visual-engineering
- Wave 2 → 3 tasks → quick / visual-engineering
- Wave 3 → 1 task → unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Create shared emoji feedback overlay

  **What to do**: Add one reusable feedback function, e.g. `showGameRuleFeedback(result)`, in an appropriate shared module or existing game UI utility location. It must create/reuse a single `.game-rule-feedback-overlay` element mounted outside volatile game rerender content, set text to `🎆` for `correct` and `😟` for `incorrect`, restart animation on repeated triggers, and remove/hide itself after the configured timeout.
  **Must NOT do**: Do not use canvas, particles, dependencies, audio, or game-specific duplicated overlays.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: small UI animation with CSS/DOM behavior.
  - Skills: [`frontend-design`] - Needed for polished but restrained animation.
  - Omitted: [`threejs-animation`] - Not a Three.js animation.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Tasks 2, 3, 4, 5 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/games.js:1150-1169` - common game frame exists, but overlay should not be mounted inside volatile frame body.
  - Pattern: `src/styles/games.css:974-1028` - nearby game-specific CSS section; add shared overlay styles in `games.css` or another already imported global game stylesheet.
  - API/Type: use result names `correct` and `incorrect` only.
  - Metis guardrail: overlay must be single-instance, restartable, `pointer-events: none`, and `aria-hidden="true"`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Calling `showGameRuleFeedback('correct')` from an automated test-accessible path displays one `.game-rule-feedback-overlay.is-correct` containing exactly `🎆`.
  - [ ] Calling `showGameRuleFeedback('incorrect')` from an automated test-accessible path displays one `.game-rule-feedback-overlay.is-incorrect` containing exactly `😟`.
  - [ ] Computed style for `.game-rule-feedback-overlay` has `pointer-events: none`.
  - [ ] Two rapid calls leave exactly one `.game-rule-feedback-overlay` in the DOM.
  - [ ] Overlay disappears or becomes non-visible after its configured timeout.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Correct overlay appears
    Tool: Playwright
    Steps: Open app, trigger helper from page context with result "correct".
    Expected: One `.game-rule-feedback-overlay.is-correct` exists, text is `🎆`, pointer-events is none.
    Evidence: .sisyphus/evidence/task-1-overlay-correct.png

  Scenario: Repeated trigger does not stack
    Tool: Playwright
    Steps: Trigger helper twice within 100ms with results "correct" then "incorrect".
    Expected: Exactly one `.game-rule-feedback-overlay` exists and text is `😟`.
    Evidence: .sisyphus/evidence/task-1-overlay-restart.txt
  ```

  **Commit**: YES | Message: `feat(games): add shared feedback overlay` | Files: [`src/modules/*`, `src/styles/games.css`, test files if added]

- [x] 2. Wire overlay into game-center drag and memory rules

  **What to do**: In `src/modules/games.js`, call the shared overlay helper at the existing correct/incorrect decision points for element drag placement and memory matching. For drag, trigger correct when `droppedAtomicNumber === slotAtomicNumber` and incorrect in the existing wrong branch. For memory, trigger correct when `isMatch` is true and incorrect in the mismatch branch after selected cards are rendered.
  **Must NOT do**: Do not change drag scoring, wrong flash classes, memory lock timing, flip-back delay, timers, or finish criteria.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: bounded integration at known decision points.
  - Skills: [] - No extra skill required beyond following references.
  - Omitted: [`systematic-debugging`] - No bug investigation expected.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 5 | Blocked By: Task 1

  **References**:
  - Pattern: `src/modules/games.js:271-301` - drag session state initialization.
  - Pattern: `src/modules/games.js:417-462` - `handleDragDrop` correct/wrong decision point.
  - Pattern: `src/modules/games.js:432-446` - drag batch completion delayed rerender; overlay must not depend on soon-destroyed DOM.
  - Pattern: `src/modules/games.js:583-631` - `handleMemoryCardClick` match/mismatch decision point.
  - Pattern: `src/modules/games.js:619-630` - memory mismatch 900ms reset; overlay must not interfere.

  **Acceptance Criteria**:
  - [ ] Correct drag placement triggers `🎆` overlay.
  - [ ] Incorrect drag placement triggers `😟` overlay.
  - [ ] Correct memory pair triggers `🎆` overlay.
  - [ ] Incorrect memory pair triggers `😟` overlay.
  - [ ] Existing drag score changes and memory flip-back behavior remain unchanged.

  **QA Scenarios**:
  ```
  Scenario: Drag correct and incorrect feedback
    Tool: Playwright
    Steps: Start element drag placement game; perform one known correct drop and one known incorrect drop using DOM data attributes/stable selectors.
    Expected: Correct drop shows `🎆`; incorrect drop shows `😟`; overlay count never exceeds 1.
    Evidence: .sisyphus/evidence/task-2-drag-feedback.png

  Scenario: Memory match and mismatch feedback
    Tool: Playwright
    Steps: Start memory game; inspect card data to click one matching pair and one non-matching pair.
    Expected: Match shows `🎆`; mismatch shows `😟`; mismatch still flips back after existing delay.
    Evidence: .sisyphus/evidence/task-2-memory-feedback.png
  ```

  **Commit**: YES | Message: `feat(games): trigger feedback for drag and memory` | Files: [`src/modules/games.js`, test files if added]

- [x] 3. Wire overlay into reaction matching rules

  **What to do**: In `src/modules/games.js`, call the shared overlay helper in `handleReactionSelection` for correct and incorrect product selections. Preserve existing `feedbackResult = 'correct' | 'incorrect'` because it still drives textual feedback styling.
  **Must NOT do**: Do not rewrite reaction matching data, product rendering, scoring, timer, or completion result screen.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: one known integration point.
  - Skills: [] - No extra skill required.
  - Omitted: [`threejs-animation`] - Not applicable.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 5 | Blocked By: Task 1

  **References**:
  - Pattern: `src/modules/games.js:656-712` - reaction session initialization, timer, feedbackResult.
  - Pattern: `src/modules/games.js:724-819` - reaction render and feedback markup.
  - Pattern: `src/modules/games.js:830-852` - `handleReactionSelection` correct/incorrect decision point.
  - Pattern: `src/modules/games.js:842-844` - final correct match can immediately finish; stable overlay mounting avoids losing animation.

  **Acceptance Criteria**:
  - [ ] Correct reaction product selection triggers `🎆` overlay.
  - [ ] Incorrect reaction product selection triggers `😟` overlay.
  - [ ] Existing `.game-feedback[data-reaction-result="correct"]` / `incorrect` behavior remains intact.
  - [ ] Final successful reaction match still finishes normally.

  **QA Scenarios**:
  ```
  Scenario: Reaction correct feedback
    Tool: Playwright
    Steps: Start reaction matching game; choose a reactant and its matching product using shared reaction IDs.
    Expected: `🎆` overlay appears; matched chips become disabled as before.
    Evidence: .sisyphus/evidence/task-3-reaction-correct.png

  Scenario: Reaction incorrect feedback
    Tool: Playwright
    Steps: Start reaction matching game; choose a reactant and a nonmatching product.
    Expected: `😟` overlay appears; feedback text still says the match is wrong.
    Evidence: .sisyphus/evidence/task-3-reaction-incorrect.png
  ```

  **Commit**: YES | Message: `feat(games): trigger feedback for reactions` | Files: [`src/modules/games.js`, test files if added]

- [x] 4. Wire overlay into full quiz challenge only

  **What to do**: In `src/modules/quiz.js`, import/use the shared overlay helper inside `handleAnswer`, but only when the active quiz session mode is full challenge. Quick quiz must not trigger the overlay even though it shares the same answer handler. Use `isCorrect ? 'correct' : 'incorrect'` mapping.
  **Must NOT do**: Do not change question selection, score calculation, feedbackTone values, result rendering, or quick quiz behavior.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: bounded integration with explicit mode gate.
  - Skills: [] - No extra skill required.
  - Omitted: [`systematic-debugging`] - No failure investigation expected.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 5 | Blocked By: Task 1

  **References**:
  - Pattern: `src/modules/quiz.js:42-51` - quick quiz uses `mode: 'quick'`; full quiz uses `mode: 'full'`.
  - Pattern: `src/modules/quiz.js:177-200` - `handleAnswer` correct/wrong decision point and `renderQuiz()` call.
  - Pattern: `src/modules/quiz.js:189-192` - existing `feedbackTone` and feedback message must remain unchanged.
  - Test: full quiz is launched by dispatching `startfullquiz`; quick quiz is launched by `startquiz`.

  **Acceptance Criteria**:
  - [ ] Full quiz correct answer triggers `🎆` overlay.
  - [ ] Full quiz incorrect answer triggers `😟` overlay.
  - [ ] Quick quiz correct/incorrect answers do not create `.game-rule-feedback-overlay`.
  - [ ] Existing quiz feedback panel and option state classes remain unchanged.

  **QA Scenarios**:
  ```
  Scenario: Full quiz feedback enabled
    Tool: Playwright
    Steps: Launch full quiz challenge; answer one question correctly and one incorrectly by inspecting question data/options.
    Expected: Correct answer shows `🎆`; incorrect answer shows `😟`.
    Evidence: .sisyphus/evidence/task-4-full-quiz-feedback.png

  Scenario: Quick quiz feedback excluded
    Tool: Playwright
    Steps: Launch quick quiz; answer one available question.
    Expected: No `.game-rule-feedback-overlay` appears; normal quick quiz feedback still renders.
    Evidence: .sisyphus/evidence/task-4-quick-quiz-excluded.txt
  ```

  **Commit**: YES | Message: `feat(quiz): trigger feedback for full challenge` | Files: [`src/modules/quiz.js`, test files if added]

- [x] 5. Add end-to-end verification for scoped and excluded feedback

  **What to do**: Add or update Playwright tests to cover all four included games and the two explicit exclusions. Use stable selectors already present where possible; add minimal `data-testid` attributes only if necessary for reliable agent-executed tests. Capture evidence files under `.sisyphus/evidence/`.
  **Must NOT do**: Do not rely on manual visual confirmation. Do not add broad visual snapshot testing unless already established.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: browser verification across multiple interactive flows.
  - Skills: [`playwright`] - Required for browser behavior verification.
  - Omitted: [`frontend-design`] - Implementation styling should already be complete.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: final verification | Blocked By: Tasks 1, 2, 3, 4

  **References**:
  - Pattern: `.game-rule-feedback-overlay`, `.game-rule-feedback-overlay.is-correct`, `.game-rule-feedback-overlay.is-incorrect` - required selectors.
  - Pattern: `src/modules/games.js:417-462`, `583-631`, `830-852` - game-center trigger points.
  - Pattern: `src/modules/quiz.js:42-51`, `177-200` - full vs quick quiz trigger gating.
  - Command: `npm run build` - repository build verification from `package.json`.

  **Acceptance Criteria**:
  - [ ] `npm run build` exits 0.
  - [ ] `npx playwright test` exits 0.
  - [ ] Tests assert correct emoji text `🎆` and incorrect emoji text `😟`.
  - [ ] Tests assert `pointer-events: none`.
  - [ ] Tests assert overlay disappears after timeout.
  - [ ] Tests assert quick quiz and collector do not trigger overlay.

  **QA Scenarios**:
  ```
  Scenario: Included game matrix
    Tool: Playwright
    Steps: Run tests covering drag, memory, reaction, and full quiz correct/incorrect paths.
    Expected: Every scoped game shows correct emoji for correct action and sad emoji for incorrect action.
    Evidence: .sisyphus/evidence/task-5-included-game-matrix.txt

  Scenario: Exclusion matrix
    Tool: Playwright
    Steps: Run tests for quick quiz answer and collector click flow.
    Expected: `.game-rule-feedback-overlay` is absent in both excluded flows.
    Evidence: .sisyphus/evidence/task-5-exclusion-matrix.txt
  ```

  **Commit**: YES | Message: `test(games): verify shared feedback overlay` | Files: [`tests/**`, `playwright.config.*` if needed, minimal data-testid additions if needed]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit each task independently if the executor workflow supports it.
- Keep commits atomic: shared helper, game-center integrations, quiz integration, verification.
- Do not commit unrelated `.sisyphus/evidence` changes except evidence produced for this plan.

## Success Criteria
- The four scoped games display `🎆` for correct actions and `😟` for incorrect actions.
- Quick quiz and collector wall do not display the overlay.
- The overlay never blocks clicks or timers.
- No game rule, scoring, or completion behavior changes.
- Build and Playwright verification pass.
