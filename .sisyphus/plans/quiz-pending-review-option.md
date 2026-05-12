# Fix Quiz Pending-Review Single Option

## TL;DR
> **Summary**: The quiz shows one `待复核` option because `shortAnswer` placeholder records from `src/data/quizData.json` are randomly selected and rendered as normal multiple-choice questions. Fix the session-prep layer so button-based quiz sessions receive four-option MCQ-compatible question objects, converting `shortAnswer` records when possible and safely replacing unconvertible placeholders before render.
> **Deliverables**:
> - Runtime/session adapter for `shortAnswer` records used by quiz challenges.
> - Guardrails preventing `待复核：依据来源片段补全标准答案。` from reaching answer buttons.
> - Existing build/data validation plus agent-executed browser QA evidence.
> **Effort**: Short
> **Parallel**: YES - 2 implementation waves + final verification
> **Critical Path**: Task 1 → Task 2 → Task 4 → Final Verification

## Context
### Original Request
User asked: “为什么测试题会只有一个待复核的选项？” The screenshot shows the 20-question full challenge rendering a single option: `待复核：依据来源片段补全标准答案。`

### Interview Summary
- User chose product behavior option 2: in the 20-question full challenge, `shortAnswer` questions should become 4-option multiple-choice questions.
- User chose test strategy: manual QA only. In this plan, “manual QA” means agent-executed browser QA; do not add mandatory automated test specs.

### Metis Review (gaps addressed)
- Guardrail: do not fix by blanket-filtering `shortAnswer`; user selected conversion.
- Guardrail: do not mutate or rewrite canonical `src/data/quizData.json` records.
- Edge cases included: duplicate distractors, missing canonical answer, stale `correctIndex`, repeated sessions mutating shared objects, placeholder text leakage.
- Default applied: conversion should happen for every quiz session path that renders answer buttons, with full challenge as the primary acceptance path. This prevents quick/random sessions from regressing through the same shared renderer.
- Default applied: if a `shortAnswer` record has no usable canonical answer, it is unconvertible and must be replaced at session-prep time with a valid four-option MCQ/convertible record to preserve quiz length and avoid placeholder UI.

## Work Objectives
### Core Objective
Ensure challenge quiz rendering never shows a single pending-review placeholder option. Any question handed to the button renderer must have exactly four meaningful options, a valid `correctIndex`, and no pending-review placeholder text.

### Deliverables
- A small pure adapter/helper in the quiz module boundary that normalizes session questions before rendering.
- Non-mutating conversion for convertible `shortAnswer` records.
- Safe replacement logic for unconvertible placeholder-only `shortAnswer` records.
- Manual QA evidence showing a full challenge question view with four options and no pending-review placeholder.

### Definition of Done (verifiable conditions with commands)
- `npm run build` exits `0`.
- `node scripts/validate-supporting-data.mjs` exits `0`.
- Agent starts the app with `npm run dev -- --host 127.0.0.1 --port 5173` and records browser QA evidence under `.sisyphus/evidence/`.
- In full challenge mode, observed question screens always render exactly four answer options; no option contains `待复核`.
- Selecting a correct converted answer scores correct; selecting an incorrect distractor scores incorrect, when a converted `shortAnswer` is observable.

### Must Have
- Runtime/session-prep normalization before `renderQuestionMarkup()` receives question objects.
- Exactly four unique options for every rendered button-based quiz question.
- `correctIndex` recalculated after option generation/shuffling.
- Source dataset objects remain immutable/shared-safe; repeated sessions must not mutate `quizData` objects.
- Preserve question ID, prompt, explanation/source metadata, progress, scoring, and feedback behavior.

### Must NOT Have
- Do not rewrite `src/data/quizData.json` as the fix.
- Do not blanket-filter all `shortAnswer` questions as the primary fix.
- Do not add Playwright `.spec.ts` files or new mandatory automated tests unless the user later requests them.
- Do not touch Three.js, achievements, storage, routing, or unrelated UI modules.
- Do not allow `待复核：依据来源片段补全标准答案。` or any option containing `待复核` in rendered answer buttons.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: Manual QA only; no new automated test files required.
- Existing commands: `npm run build`; `node scripts/validate-supporting-data.mjs`.
- QA policy: Every implementation task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. This is a small bugfix, so waves are intentionally smaller.

Wave 1: Task 1 foundation analysis/contract, Task 3 validation guardrail review can run after Task 1 confirms field names.
Wave 2: Task 2 adapter implementation, Task 4 browser QA/hardening after Task 2.

### Dependency Matrix (full, all tasks)
- Task 1: no dependencies; blocks Tasks 2 and 3.
- Task 2: blocked by Task 1; blocks Task 4.
- Task 3: blocked by Task 1; can run parallel with Task 2 after helper contract is known.
- Task 4: blocked by Tasks 2 and 3.
- Final Verification: blocked by all tasks.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → `quick`, `unspecified-low`.
- Wave 2 → 2 tasks → `quick`, `unspecified-high`.
- Final Verification → 4 review tasks → `oracle`, `unspecified-high`, `unspecified-high`, `deep`.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Confirm Quiz Data Contract and Normalization Boundary

  **What to do**: Inspect `src/modules/quiz.js`, `src/data/quizData.json`, `src/data/quizData.js`, and `src/data/index.js`. Confirm the exact imported data source and the session creation path. Define the helper contract in comments or local constants near session creation: button-rendered session questions must satisfy `{ options.length === 4, correctIndex in 0..3, no option contains "待复核" }`. Decide exact canonical-answer extraction order as code, not judgment: use the first non-empty string from `answer`, `standardAnswer`, `correctAnswer`, `expectedAnswer`, then `options[correctIndex]` only if it does not contain `待复核`; otherwise mark unconvertible.

  **Must NOT do**: Do not edit source data records. Do not implement UI redesign. Do not add automated test files.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: focused inspection and small contract placement.
  - Skills: [] - No special implementation skill required.
  - Omitted: [`test-driven-development`] - User selected manual QA only.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 2, Task 3 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/quiz.js:527-556` - exploration reported `createSession()` shuffles/slices quiz data here.
  - Pattern: `src/modules/quiz.js:254-306` - exploration reported `renderQuestionMarkup()` renders options by mapping `question.options`.
  - Pattern: `src/modules/quiz.js:329-348` - exploration reported `renderOptionButton()` creates answer buttons.
  - Data: `src/data/quizData.json:688-693` - exploration reported example `shortAnswer` placeholder with one option.
  - API/Boundary: `src/data/index.js` - exploration reported quiz data export boundary.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Executor records exact source data import path and session creation function in `.sisyphus/evidence/task-1-quiz-contract.md`.
  - [ ] Executor records the canonical-answer extraction order and unconvertible fallback rule in `.sisyphus/evidence/task-1-quiz-contract.md`.
  - [ ] No repository files outside the intended quiz module boundary are changed by this task unless required to record evidence.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Data contract is confirmed
    Tool: Bash / file inspection
    Steps: Inspect the quiz import/export path and session creation function; record exact functions and files in evidence markdown.
    Expected: Evidence lists where quizData enters quiz runtime and where session questions are prepared before render.
    Evidence: .sisyphus/evidence/task-1-quiz-contract.md

  Scenario: Unconvertible shortAnswer rule is binary
    Tool: Bash / file inspection
    Steps: Inspect at least one placeholder shortAnswer record and apply the extraction order manually in evidence.
    Expected: Record is classified either convertible with canonical answer or unconvertible with replacement required; no ambiguous "decide later" remains.
    Evidence: .sisyphus/evidence/task-1-unconvertible-rule.md
  ```

  **Commit**: NO | Message: n/a | Files: evidence only unless source comments/constants are added

- [x] 2. Implement Non-Mutating ShortAnswer-to-MCQ Session Adapter

  **What to do**: In `src/modules/quiz.js` near session creation, add a pure normalization layer that returns cloned/adapted question objects for button-based sessions. For normal MCQ records already having four non-placeholder options and valid `correctIndex`, clone and pass through unchanged. For `category: "shortAnswer"` records with a canonical answer from Task 1 extraction order, generate four unique options: include the canonical answer exactly once; choose distractors first from same `category`/topic/difficulty if fields exist, then from other valid answers/options in the quiz pool; exclude placeholders and duplicates; shuffle options deterministically per session/question using existing shuffle utilities if present; set `correctIndex` to the canonical answer's shuffled position. For unconvertible placeholder-only `shortAnswer` records, replace at session-prep time with the next valid MCQ or convertible record from the shuffled pool until the requested quiz count is filled.

  **Must NOT do**: Do not mutate original quiz objects or their `options` arrays. Do not make the single placeholder option clickable. Do not reduce the 20-question full challenge count. Do not silently accept fewer than four options.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: localized runtime adapter bugfix.
  - Skills: [] - Vanilla JS helper work.
  - Omitted: [`frontend-design`] - No visual redesign requested.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Task 4 | Blocked By: Task 1

  **References**:
  - Pattern: `src/modules/quiz.js:527-556` - session creation; put adapter before session state stores selected questions.
  - Pattern: `src/modules/quiz.js:177-200` - answer handling compares selected index to `correctIndex`; preserve contract.
  - Pattern: `src/modules/quiz.js:291-292` - renderer maps `question.options`; ensure renderer only receives normalized questions.
  - Data: `src/data/quizData.json` - source includes placeholder `shortAnswer` records; do not rewrite.

  **Acceptance Criteria**:
  - [ ] Full challenge sessions still contain exactly 20 questions.
  - [ ] Every session question reaching the answer-button renderer has exactly four options.
  - [ ] No rendered option string contains `待复核`.
  - [ ] Correct answer appears exactly once and `correctIndex` points to it after shuffling.
  - [ ] Starting multiple sessions does not mutate shared `quizData` records.
  - [ ] `npm run build` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Converted shortAnswer renders as four choices
    Tool: Bash + browser automation
    Steps: Run npm run dev -- --host 127.0.0.1 --port 5173; open the app; start the 20-question full challenge; navigate questions until a converted shortAnswer/source-derived question is observed or until 20 questions are checked; record visible options.
    Expected: The observed question view has exactly 4 answer buttons and none contains 待复核.
    Evidence: .sisyphus/evidence/task-2-converted-shortanswer.png and .sisyphus/evidence/task-2-converted-shortanswer-options.md

  Scenario: Placeholder-only records do not leak to UI
    Tool: Bash + browser automation
    Steps: Start at least 3 full challenge sessions; inspect every visible answer option in each first screen and any navigated converted question screens.
    Expected: Zero answer buttons contain 待复核; no question screen has fewer than 4 answer buttons.
    Evidence: .sisyphus/evidence/task-2-no-placeholder-leak.md
  ```

  **Commit**: YES | Message: `fix(quiz): adapt short answers for challenge options` | Files: `src/modules/quiz.js`

- [x] 3. Preserve Existing Validator Behavior While Adding Runtime Guard Evidence

  **What to do**: Run `node scripts/validate-supporting-data.mjs` before and after Task 2. If it passes before and after, leave validator unchanged because user selected no new automated tests and source placeholder records are allowed by current data policy. If Task 2 introduces a small exported/pure helper only inside `quiz.js`, do not create new validator rules. Record why the validator is not changed: it validates canonical data, while this fix normalizes runtime session questions.

  **Must NOT do**: Do not make `scripts/validate-supporting-data.mjs` reject existing promoted textbook placeholder records unless build/validation already fails and the change is necessary. Do not add Playwright spec files.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` - Reason: command verification and evidence documentation.
  - Skills: [] - No special skill needed.
  - Omitted: [`test-driven-development`] - User selected manual QA only.

  **Parallelization**: Can Parallel: YES | Wave 1/2 | Blocks: Task 4 | Blocked By: Task 1

  **References**:
  - Validator: `scripts/validate-supporting-data.mjs` - exploration reported quiz option validation currently allows promoted records with at least one option.
  - Scripts: `package.json` - exploration reported validation/build scripts.

  **Acceptance Criteria**:
  - [ ] `node scripts/validate-supporting-data.mjs` exits `0` after implementation.
  - [ ] Evidence documents whether validator was changed; default is unchanged.
  - [ ] No automated spec files are added.

  **QA Scenarios**:
  ```
  Scenario: Supporting data validator still passes
    Tool: Bash
    Steps: Run node scripts/validate-supporting-data.mjs from repository root.
    Expected: Command exits 0; output captured.
    Evidence: .sisyphus/evidence/task-3-validate-supporting.txt

  Scenario: No automated test files added by accident
    Tool: Bash
    Steps: Inspect git diff for files under tests/**/*.spec.ts.
    Expected: No new .spec.ts files are present unless user explicitly changed scope later.
    Evidence: .sisyphus/evidence/task-3-no-spec-files.md
  ```

  **Commit**: NO | Message: n/a | Files: evidence only unless validator must be minimally adjusted due command failure

- [x] 4. Agent-Executed Browser QA and Scoring Verification

  **What to do**: Run the app locally and use browser automation to exercise the quiz. Because no stable selectors are confirmed, use accessible text visible in the screenshot and UI labels: locate the quiz/challenge entry, start `20题完整挑战`, and inspect answer buttons. If stable selectors are missing and this blocks QA, add minimal `data-testid` attributes only inside quiz UI elements in `src/modules/quiz.js` (`quiz-option`, `quiz-next`, `quiz-progress`, `quiz-feedback`) without changing styling or layout. Verify full challenge count, option count, placeholder absence, and scoring for correct/incorrect choices.

  **Must NOT do**: Do not rely on the user to visually confirm. Do not stop after checking only the first question if no converted/unconvertible-path question is observed. Do not add visual redesign.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: hands-on browser QA and possible selector hardening.
  - Skills: [`playwright`] - Browser automation is required for QA.
  - Omitted: [`frontend-design`] - QA only; no redesign.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Final Verification | Blocked By: Task 2, Task 3

  **References**:
  - UI text from screenshot: `元素知识挑战`, `20题完整挑战`, `第 1 / 20 题`, `下一题`.
  - Runtime: `src/modules/quiz.js` - quiz modal rendering and feedback.
  - Config: `playwright.config.ts`, `tests/setup/global-setup.ts`, `tests/setup/global-teardown.ts` - browser infra exists, but this plan does not require spec files.

  **Acceptance Criteria**:
  - [ ] Browser QA evidence includes at least one screenshot of a full challenge question with 4 options.
  - [ ] Evidence lists rendered option text and confirms none contains `待复核`.
  - [ ] Evidence confirms question progress remains `第 1 / 20 题` style for full challenge and session has 20 questions.
  - [ ] Evidence confirms selecting a correct answer increments score or shows correct feedback.
  - [ ] Evidence confirms selecting an incorrect distractor shows incorrect feedback without breaking navigation.
  - [ ] `npm run build` exits `0` after any selector/source changes.

  **QA Scenarios**:
  ```
  Scenario: Full challenge has four visible options
    Tool: Playwright / browser automation
    Steps: Run npm run dev -- --host 127.0.0.1 --port 5173; open http://127.0.0.1:5173; start 元素知识挑战; choose 20题完整挑战; capture the first question screen and list all option texts.
    Expected: Exactly 4 answer options are present; no option contains 待复核; progress indicates 1 / 20.
    Evidence: .sisyphus/evidence/task-4-full-challenge-four-options.png and .sisyphus/evidence/task-4-full-challenge-options.md

  Scenario: Correct and incorrect converted-choice scoring
    Tool: Playwright / browser automation
    Steps: In a full challenge session, find or force-observe a normalized converted shortAnswer question using the runtime session state if exposed; select the known correct option once in one run and an incorrect distractor in another run; capture feedback and score state.
    Expected: Correct selection is accepted as correct; incorrect distractor is accepted as incorrect; next-question navigation remains enabled only after answer flow allows it.
    Evidence: .sisyphus/evidence/task-4-scoring-correct.png and .sisyphus/evidence/task-4-scoring-incorrect.png
  ```

  **Commit**: YES | Message: `test(quiz): record manual challenge qa evidence` | Files: `.sisyphus/evidence/*` plus optional `src/modules/quiz.js` selector additions

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Prefer one source commit for the quiz adapter: `fix(quiz): adapt short answers for challenge options`.
- Evidence files may be committed only if repository convention includes `.sisyphus/evidence`; otherwise keep them as local execution artifacts and summarize paths in final report.
- Do not commit unrelated formatting, data rewrites, generated tests, or source-map/build artifacts.

## Success Criteria
- Full challenge no longer shows a one-option `待复核` question.
- Every button-rendered quiz question has exactly four answer options.
- Converted `shortAnswer` questions preserve scoring correctness.
- Unconvertible placeholder-only records are safely replaced at session-prep time without reducing quiz length.
- Existing validation/build commands pass.
- Agent-executed browser QA evidence exists and requires zero user intervention.
