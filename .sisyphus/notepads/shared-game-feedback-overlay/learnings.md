# Task 1: Shared Game Feedback Overlay — Findings

## Files Created
- src/modules/gameFeedbackOverlay.js

## Files Modified
- src/styles/games.css (added overlay styles at end)

## Design Decisions
- Chose a dedicated small module (gameFeedbackOverlay.js) rather than adding to games.js to avoid coupling games and quiz.
- Mounted on document.body with z-index: 9999 so it survives volatile game frame rerenders.
- Single-instance via module-level overlayEl; rapid retrigger clears previous timeout and restarts animation by removing/re-adding classes with a forced reflow.
- Uses CSS transition (opacity + scale) for lightweight animation; no canvas, particles, or dependencies.
- Added prefers-reduced-motion media query to disable transitions for accessibility.
- Overlay is decorative: aria-hidden="true", pointer-events: none.
- Emoji values are fixed: correct = 🎆, incorrect = 😟.
- Unknown result values are silently ignored.
- Defensive for non-browser contexts: returns early if document is undefined.

## Task 2: Wire Overlay into Drag and Memory Games

### Changes Made
- Imported `showGameRuleFeedback` from `./gameFeedbackOverlay.js` in `src/modules/games.js`.
- In `handleDragDrop` correct branch: added `showGameRuleFeedback('correct')` before `renderDragGame()`.
- In `handleDragDrop` incorrect branch: added `showGameRuleFeedback('incorrect')` before DOM class updates.
- In `handleMemoryCardClick` match branch: added `showGameRuleFeedback('correct')` before resetting state and re-rendering.
- In `handleMemoryCardClick` mismatch branch: added `showGameRuleFeedback('incorrect')` before `renderMemoryGame()` and the 900ms timeout.

### Placement Rationale
- Overlay is mounted on `document.body`, so calling it before any `renderDragGame()` / `renderMemoryGame()` ensures it survives DOM replacements inside `#game-area`.

### Existing Behavior Preserved
- Drag: scoring (+10/-2), correct/wrong counts, `.was-wrong` / `.is-wrong-flash` classes, `updateFeedbackText`, batch refill after 500ms.
- Memory: `matchedIds`/`selectedIds`, `lockBoard`, moves count, finish on final pair, 900ms mismatch flip-back.

### Verification
- `npm run build`: exit 0, no errors.
- `lsp_diagnostics` on `src/modules/games.js`: no diagnostics.

## Verification
- npm run build: exit 0, no errors.
- Grep confirmed no pre-existing .game-rule-feedback-overlay selectors.
Build passed successfully after integrating showGameRuleFeedback into reaction matching rules.

## Task 4: Wire Overlay into Full Quiz Challenge Only

### Changes Made
- Imported `showGameRuleFeedback` from `./gameFeedbackOverlay.js` in `src/modules/quiz.js`.
- In `handleAnswer`, after `isCorrect` is known and score is incremented, added gated overlay call:
  ```js
  if (quizSession.mode === 'full') {
    showGameRuleFeedback(isCorrect ? 'correct' : 'incorrect');
  }
  ```

### Placement Rationale
- `handleAnswer` is shared by quick and full quiz modes, so the overlay must be explicitly gated with `quizSession.mode === 'full'`.
- Call is placed before `renderQuiz()` so the overlay mounts on `document.body` and survives any DOM replacement inside the quiz modal.

### Existing Behavior Preserved
- Quick quiz never triggers the overlay.
- Existing feedback strings, `feedbackTone` (`correct`/`wrong`/`idle`), option state classes (`is-selected`/`is-correct`/`is-wrong`), score calculation, answer records, question navigation, and result rendering are unchanged.

### Verification
- `npm run build`: exit 0, no errors.
- `grep` confirmed `showGameRuleFeedback` imported in `quiz.js` and called once inside `handleAnswer` with `mode === 'full'` guard.

## Task 5: End-to-End Verification for Scoped and Excluded Feedback

### Tests Added
- Added `tests/ui/shared-game-feedback-overlay.spec.ts` as focused Playwright coverage for the shared overlay.
- Helper coverage imports `/src/modules/gameFeedbackOverlay.js` in-browser and verifies exact emoji text (`🎆`, `😟`), `pointer-events: none`, single overlay instance on repeated triggers, and DOM removal after timeout.
- Included game coverage exercises drag, memory, reaction, and full quiz correct/incorrect outcomes using stable DOM selectors and DOM-driven drag/drop dispatch for the vanilla drag/drop implementation.
- Exclusion coverage verifies quick quiz answers and collector cell interactions leave `.game-rule-feedback-overlay` absent.

### Verification Evidence
- `lsp_diagnostics` on `tests/ui/shared-game-feedback-overlay.spec.ts`: no diagnostics.
- `npx playwright test tests/ui/shared-game-feedback-overlay.spec.ts`: 6 passed; output saved to `.sisyphus/evidence/task-5-new-spec.txt`.
- `npm run build`: exit 0; output saved to `.sisyphus/evidence/task-5-npm-build.txt`.
- `npx playwright test`: 57 passed / 10 failed; all 6 new overlay tests passed in the full run. Output saved to `.sisyphus/evidence/task-5-full-playwright.txt`.

### Full Suite Existing Failures Observed
- Existing failures were outside the new overlay spec: `tests/content/chem-notation.spec.ts` (4 failures), `tests/shell/content-data-smoke.spec.ts` (1), `tests/ui/games-layout.spec.ts` (3), `tests/ui/lab-textbook-experiments.spec.ts` (1 timeout), and `tests/ui/periodic-table-controls.spec.ts` (1).
- The failures center on missing/stale existing expectations such as `.lab-equation-card`, `#game-area .games-overview-header`, and `.element-cell` visibility, matching the task warning not to obscure stale unrelated tests.

## F4 Scope Fidelity Check
- Scope audit approved: shared overlay implementation remains centralized in src/modules/gameFeedbackOverlay.js; integrations are limited to drag placement, memory matching, reaction matching, and full quiz.
- showGameRuleFeedback search found no collector calls and quick quiz remains excluded by quizSession.mode === 'full' guard in src/modules/quiz.js.
- Dependency check found no package.json or lockfile diff; build still exits 0 with only the existing chunk-size warning.

## 2026-05-14 - F3 helper spec flake fix

- The F3 helper failure was a Playwright test race, not a proven overlay implementation defect: `src/styles/games.css` defines `.game-rule-feedback-overlay { pointer-events: none; }`, and real browser QA had already confirmed the visible overlay computes `pointer-events: none`.
- For auto-removing overlays, avoid chaining several locator assertions before `locator.evaluate(getComputedStyle(...))`; by the time computed style is sampled, the element may be in a disconnected/removed state and Chromium can return empty style values.
- Stable pattern used in `tests/ui/shared-game-feedback-overlay.spec.ts`: one `expect.poll(() => page.evaluate(...))` that freshly queries the current DOM and returns a single snapshot containing count, text, class visibility, `aria-hidden`, and computed `pointerEvents`.
- Verification after the test-only change: `npx playwright test tests/ui/shared-game-feedback-overlay.spec.ts` passed 6/6 with default workers; `npm run build` passed with only the existing chunk-size warning.
