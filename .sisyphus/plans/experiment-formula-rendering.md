# Experiment Formula Rendering Fix

## TL;DR
> **Summary**: Fix raw LaTeX/chemistry formula fragments leaking in experiment UI by centralizing safe mixed prose + KaTeX rendering and routing every visible experiment text surface through it. Add validation and Playwright regression coverage so experiment cards, details, steps, safety notes, simulation, and result views cannot regress.
> **Deliverables**:
> - Safe mixed prose/formula renderer built on existing `src/modules/chemNotation.js` KaTeX utilities
> - Full experiment field/render-path audit and routing updates in `src/modules/lab.js`
> - Formula-content validation for `src/data/reactions.json`
> - Committed Playwright config/spec covering cards, details, arrays, simulation/result surfaces, and raw-token absence
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Tasks 2-4 → Task 5 → Final Verification Wave

## Context
### Original Request
User reported screenshots where experiment cards and experiment details show unrendered chemistry/math tokens such as `$2 \\mathrm{~mL}$`, `\\mathrm{mL}`, and `\\frac{...}`. User requested a plan to check all formulas in experiment card summaries and detail text and ensure correct rendering.

### Interview Summary
- Scope expanded and confirmed: include all experiment-related visible text fields, not only card summaries and detail body. Include steps, safety notes, visual descriptions, simulation modal text, result view text, and any visible locked/unlocked requirement text.
- Test strategy confirmed: add committed Playwright setup/specs, plus validation/build commands.
- Data authoring decision: preserve existing LaTeX-style content in `src/data/reactions.json`; do not convert dataset content to plain text.

### Metis Review (gaps addressed)
- Added explicit field-to-renderer audit requirement to prevent partial fixes.
- Locked parser support to observed syntax only: `$...$`, `\\(...\\)`, `\\[...\\]`, raw `\\mathrm{...}`, raw `\\frac{...}{...}`, and formula-like unit fragments already present in experiment data.
- Defined fallback behavior: if KaTeX parsing fails, render escaped original text visibly without executing HTML, and record validation/test coverage for malformed input.
- Added security guardrail: normal prose must be HTML-escaped; only KaTeX-generated output may be inserted as HTML, with KaTeX trust disabled.
- Added Playwright selector directive so tests are stable rather than visual-only.

## Work Objectives
### Core Objective
All visible experiment text surfaces render chemistry/math formulas correctly and safely, with no raw authoring tokens visible to learners in normal experiment UI flows.

### Deliverables
- Renderer helper for mixed Chinese prose + inline chemistry/math formulas.
- Updated experiment UI rendering paths in `src/modules/lab.js`.
- Validation coverage for formula-bearing experiment fields in `src/data/reactions.json`.
- Playwright browser regression coverage.

### Definition of Done (verifiable conditions with commands)
- `npm run build` exits `0`.
- `node scripts/validate-elements.mjs` exits `0`.
- `node scripts/validate-supporting-data.mjs` exits `0`.
- `node scripts/validate-chem-notation.mjs` exits `0` and includes experiment prose/formula checks.
- `npx playwright test` exits `0`.
- Playwright evidence shows `.katex` appears in formula-bearing experiment cards/details and raw tokens such as `\\mathrm`, `\\frac`, and `$2 \\mathrm{~mL}$` do not appear in visible experiment UI text.

### Must Have
- Preserve `src/data/reactions.json` LaTeX-style authoring syntax except for correcting clearly malformed content discovered by validation.
- Centralize mixed prose/formula rendering; no scattered ad-hoc replacement chains.
- Escape all non-formula prose before HTML insertion.
- Cover these visible fields/surfaces:
  - `description`: cards and result summaries
  - `textbookContent`: detail body
  - `steps`: ordered/detail checklist
  - `safetyNotes`: safety/detail bullet lists
  - `visualDescription`: sidebar/detail, simulation overlay, result view
  - visible `unlockRequirements`/locked-state text if rendered in lab UI
  - `equationText`, `reactants`, `products`: keep using structured formula/equation helpers, but include in audit to ensure no prose renderer regression

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not build a broad Markdown renderer.
- Do not globally rewrite non-experiment modules unless a shared helper requires import-safe adjustment.
- Do not remove KaTeX or replace it with plain text.
- Do not trust dataset HTML.
- Do not make Playwright assertions depend only on screenshots or vague visual checks.
- Do not change textbook ingestion behavior unless validation proves generated `reactions.json` cannot stay correct otherwise.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: Playwright browser regression + validation scripts + build.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 foundation audit/renderer contract.
Wave 2: Tasks 2, 3, 4 in parallel after Task 1: UI routing, data validation, Playwright setup/spec.
Wave 3: Task 5 integration hardening and full verification.

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2, 3, 4, 5.
- Task 2 blocks Task 5.
- Task 3 blocks Task 5.
- Task 4 blocks Task 5.
- Task 5 blocks Final Verification Wave.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 1 task → `deep`
- Wave 2 → 3 tasks → `quick`, `quick`, `visual-engineering`
- Wave 3 → 1 task → `unspecified-high`
- Final Verification → 4 review agents → oracle, unspecified-high, unspecified-high, deep

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Audit experiment formula surfaces and define renderer contract

  **What to do**: Inspect `src/data/reactions.json`, `src/modules/lab.js`, and `src/modules/chemNotation.js`. Produce an in-code or test-side inventory of every experiment-visible field and whether it uses mixed prose rendering or structured formula/equation rendering. Define the mixed renderer contract in `src/modules/chemNotation.js` or `src/modules/lab.js` adjacent to existing helpers: support `$...$`, `\\(...\\)`, `\\[...\\]`, raw `\\mathrm{...}`, raw `\\frac{...}{...}`, multiple formulas in one Chinese sentence, formula at beginning/end, and malformed formula fallback. The contract must specify: escape normal prose, render only KaTeX output as HTML, `trust: false`, fallback to escaped original text on render errors.
  **Must NOT do**: Do not rewrite experiment copy to avoid rendering. Do not add Markdown parsing. Do not alter unrelated story/table modules.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Requires careful audit across data/schema/render paths and security constraints.
  - Skills: [`systematic-debugging`] - Treat raw token leakage as a rendering pipeline defect requiring evidence before fixes.
  - Omitted: [`frontend-design`] - No visual redesign requested.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Tasks 2, 3, 4, 5 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/lab.js` - current card/detail/safety/simulation/result render paths: `renderLabShell`, `renderReactionDetail`, `renderSafetyView`, `openSimulationModal`, `renderResultView`, `renderProseContent`, `renderMixedTitle`, `renderLatexSafe`.
  - API/Type: `src/modules/chemNotation.js` - existing KaTeX helpers: `formulaHTML`, `equationHTML`, `chemicalNotationFieldHTML`, `plainChemText`, `formulaToLatex`, `equationToLatex`.
  - Data: `src/data/reactions.json` - fields to audit: `description`, `textbookContent`, `visualDescription`, `steps`, `safetyNotes`, `equationText`, `reactants`, `products`, `unlockRequirements`, `experimentId`.
  - Style: `src/styles/chemNotation.css` - current rendered notation styling.

  **Acceptance Criteria** (agent-executable only):
  - [ ] A field-to-renderer inventory exists in code comments, validation output, or Playwright/test constants and lists every included field/surface from Must Have.
  - [ ] Mixed renderer supports observed syntax and fallback cases without throwing when called from a Node or browser context.
  - [ ] Non-formula prose is escaped before joining with KaTeX output.
  - [ ] KaTeX rendering uses safe defaults (`trust: false` or equivalent no-trust behavior).

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Renderer contract sample cases
    Tool: Bash
    Steps: Run the project validation command chosen/updated by the task, including examples with Chinese prose + `$2 \\mathrm{~mL}$`, raw `\\mathrm{mL}`, and `\\frac{1}{4}`.
    Expected: Command exits 0; output or assertions confirm rendered HTML contains `.katex` for valid formulas and no unescaped raw formula token in valid cases.
    Evidence: .sisyphus/evidence/task-1-renderer-contract.txt

  Scenario: Malformed formula fallback
    Tool: Bash
    Steps: Run the same validation against malformed input such as `向试管加入 $\\frac{1}{`.
    Expected: Command exits 0; fallback output is escaped visible text and does not throw or inject HTML.
    Evidence: .sisyphus/evidence/task-1-renderer-malformed.txt
  ```

  **Commit**: YES | Message: `fix(lab): define safe experiment formula rendering contract` | Files: `src/modules/chemNotation.js`, `src/modules/lab.js` if contract/helper placement requires it

- [x] 2. Route all experiment visible prose through the mixed renderer

  **What to do**: Update `src/modules/lab.js` so every visible experiment prose field uses the centralized mixed prose/formula renderer. Required surfaces: experiment card summary, detail body, steps list, safety notes, visual description sidebar, safety view, simulation modal, result/completion view, and visible locked/unlocked requirement text if present. Keep structured equation/formula rows (`equationText`, `reactants`, `products`) on existing equation/formula helpers unless the Task 1 audit proves they need mixed rendering.
  **Must NOT do**: Do not use `innerHTML` with raw data. Do not duplicate regex parsing in each render function. Do not change routing/navigation behavior.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Focused render-path replacement once Task 1 contract exists.
  - Skills: [] - Bounded implementation task; no special UI design needed.
  - Omitted: [`frontend-design`] - Preserve existing visual design.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 5 | Blocked By: Task 1

  **References**:
  - Pattern: `src/modules/lab.js` - render functions named in Task 1.
  - API/Type: `src/modules/chemNotation.js` - use the Task 1 mixed renderer.
  - Data: `src/data/reactions.json` - formula-bearing prose examples include textbook-derived records with raw LaTeX-like syntax.

  **Acceptance Criteria**:
  - [ ] `description`, `textbookContent`, `steps`, `safetyNotes`, and `visualDescription` call the centralized mixed renderer at every visible lab surface.
  - [ ] Visible raw tokens `\\mathrm`, `\\frac`, and `$...$` are not emitted for valid formula-bearing experiment fields.
  - [ ] Chinese prose remains readable and not double-escaped (no visible `&lt;`, `&gt;`, `&amp;` artifacts unless source text intentionally contains those characters).
  - [ ] `npm run build` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Card and detail prose render formulas
    Tool: Playwright
    Steps: Open the app, navigate to the lab/experiment section, locate an experiment card containing measured volumes/concentration formulas, open its detail view.
    Expected: Card and detail body contain `.katex`; visible text does not include `\\mathrm`, `\\frac`, or literal `$2 \\mathrm{~mL}$`.
    Evidence: .sisyphus/evidence/task-2-card-detail.png

  Scenario: Array/supplemental fields render formulas safely
    Tool: Playwright
    Steps: In the same experiment detail flow, inspect steps, safety notes, visual description, simulation modal, and result view.
    Expected: Formula-bearing array/supplemental fields show rendered KaTeX where applicable; no raw formula tokens leak; non-formula fields remain plain readable Chinese.
    Evidence: .sisyphus/evidence/task-2-all-surfaces.png
  ```

  **Commit**: YES | Message: `fix(lab): render experiment prose formulas safely` | Files: `src/modules/lab.js`, `src/modules/chemNotation.js` if helper import/export changes are needed

- [x] 3. Extend chemistry notation validation for experiment prose data

  **What to do**: Update `scripts/validate-chem-notation.mjs` so it scans `src/data/reactions.json` experiment prose fields: `description`, `textbookContent`, `visualDescription`, every `steps[]`, every `safetyNotes[]`, and any visible `unlockRequirements` strings/labels if they exist. Validation must classify formula-bearing text and assert it can be passed through the mixed renderer or equivalent parser without producing unhandled errors. Add checks for raw unsupported patterns that are likely to leak (`\\mathrm`, `\\frac`, `$...$`) if not renderable. Keep existing validation behavior intact.
  **Must NOT do**: Do not require every experiment field to contain formulas. Do not reject safe plain Chinese prose. Do not mutate `reactions.json` from the validator.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Script extension bounded to existing validation file/data.
  - Skills: [] - Existing script pattern should be followed.
  - Omitted: [`test-driven-development`] - Validation script itself supplies regression checks; no full unit test framework exists.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 5 | Blocked By: Task 1

  **References**:
  - Pattern: `scripts/validate-chem-notation.mjs` - existing chemistry notation validation entry.
  - Data: `src/data/reactions.json` - experiment fields and formula-bearing examples.
  - Data boundary: `src/data/textbookIngestion/runtimeTargetMap.js` - confirms textbook experiment content feeds reactions data.

  **Acceptance Criteria**:
  - [ ] `node scripts/validate-chem-notation.mjs` scans all included experiment prose fields.
  - [ ] Validator reports field path and experiment id/title for any failing formula-bearing field.
  - [ ] Validator exits nonzero for intentionally unsupported raw formula syntax when tested locally by the executor, then exits `0` with committed data.
  - [ ] Existing `node scripts/validate-elements.mjs` and `node scripts/validate-supporting-data.mjs` still exit `0`.

  **QA Scenarios**:
  ```
  Scenario: Current experiment data validates
    Tool: Bash
    Steps: Run `node scripts/validate-chem-notation.mjs`.
    Expected: Exit code 0; output confirms experiment prose fields were scanned or no failures were found.
    Evidence: .sisyphus/evidence/task-3-validate-chem-notation.txt

  Scenario: Failing field diagnostics are actionable
    Tool: Bash
    Steps: Temporarily introduce an invalid local-only formula token in a copy or controlled dry-run fixture if the script supports fixtures; run validator; revert the local-only change before completion.
    Expected: Validator fails with experiment id/title and field path; repository is clean after reverting local-only fixture/change.
    Evidence: .sisyphus/evidence/task-3-validator-diagnostics.txt
  ```

  **Commit**: YES | Message: `test(data): validate experiment formula prose` | Files: `scripts/validate-chem-notation.mjs`, optional validator fixture under `scripts/` only if consistent with existing script patterns

- [x] 4. Add Playwright configuration and formula regression spec

  **Status override**: Skipped by user instruction after repeated subagent aborts. User will manually verify this browser regression path; Task 5 must still run build/data validation and browser raw-token sweep evidence where possible.

  **What to do**: Add committed Playwright configuration and a focused lab formula rendering spec. Use `@playwright/test` already present in dev dependencies. Configure Vite dev server startup or document/use `webServer` in `playwright.config.*`. Add minimal stable `data-testid` selectors only if needed for reliable tests: `lab-experiment-card`, `experiment-detail`, `experiment-step`, `experiment-safety-note`, `experiment-simulation`, `experiment-result`. The spec must navigate from app load to experiment cards, open a formula-bearing experiment, assert `.katex` appears, and assert raw tokens do not appear in visible lab UI surfaces.
  **Must NOT do**: Do not depend on screenshots as the only assertion. Do not use brittle selectors based on long Chinese copy if stable test ids can be added. Do not skip the test in normal runs.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: Browser automation over visible UI flows and selectors.
  - Skills: [`playwright`] - Required for browser verification work.
  - Omitted: [`frontend-design`] - Testing selectors only; no visual redesign.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 5 | Blocked By: Task 1

  **References**:
  - Config: `package.json` - scripts and `@playwright/test` dependency.
  - App: `index.html` -> `src/main.js` - Vite bootstrap.
  - UI: `src/modules/lab.js` - selectors and render surfaces.
  - Existing plan reference: `.sisyphus/plans/element-explorer-kids.md` - planned Playwright direction, if useful.

  **Acceptance Criteria**:
  - [ ] A `playwright.config.*` file exists and starts/targets the Vite app consistently.
  - [ ] At least one committed Playwright spec covers experiment formula rendering in card and detail flows.
  - [ ] Spec asserts absence of raw `\\mathrm`, `\\frac`, and literal `$2 \\mathrm{~mL}$` or equivalent observed raw token in visible experiment UI.
  - [ ] Spec asserts presence of `.katex` in formula-bearing surfaces.
  - [ ] `npx playwright test` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Browser regression test passes
    Tool: Bash
    Steps: Run `npx playwright test` from repository root.
    Expected: Exit code 0; lab formula rendering spec passes.
    Evidence: .sisyphus/evidence/task-4-playwright-output.txt

  Scenario: Stable selectors cover all target surfaces
    Tool: Playwright
    Steps: Run the formula spec with trace/screenshot evidence enabled or capture after opening detail/simulation/result surfaces.
    Expected: Evidence shows tested elements include card, detail, steps, safety notes, visual description, simulation, and result surfaces when available in flow.
    Evidence: .sisyphus/evidence/task-4-playwright-surfaces.png
  ```

  **Commit**: YES | Message: `test(lab): cover experiment formula rendering` | Files: `playwright.config.*`, `tests/**`, `src/modules/lab.js` only for stable selectors if needed, `package.json` only if adding a script is necessary

- [x] 5. Integrate, harden edge cases, and run full verification

  **What to do**: Merge outputs from Tasks 2-4, resolve conflicts, and run the complete verification set. Confirm edge cases: multiple formulas in one Chinese sentence, formula at beginning/end, units with `\\mathrm{~mL}` and `\\mathrm{mL}`, fractions with `\\frac{...}{...}`, malformed formula fallback, formula-only fields, array fields, and locked/hidden experiments if visible. Fix any missed render paths by routing them through the centralized helper.
  **Must NOT do**: Do not mark complete if any raw formula token is visible in normal experiment UI. Do not leave Playwright config/spec broken or dependent on local-only server state.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Cross-task integration, edge-case hardening, and full verification.
  - Skills: [`verification-before-completion`] - Evidence before completion claims.
  - Omitted: [`frontend-design`] - No redesign; only correctness and regression hardening.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: Tasks 2, 3, 4

  **References**:
  - All files changed by Tasks 1-4.
  - Verification commands in Definition of Done.
  - Metis edge cases listed in this plan.

  **Acceptance Criteria**:
  - [ ] `npm run build` exits `0`.
  - [ ] `node scripts/validate-elements.mjs` exits `0`.
  - [ ] `node scripts/validate-supporting-data.mjs` exits `0`.
  - [ ] `node scripts/validate-chem-notation.mjs` exits `0`.
  - [ ] `npx playwright test` exits `0`.
  - [ ] Evidence files exist under `.sisyphus/evidence/` for command outputs and at least one browser surface screenshot/trace.

  **QA Scenarios**:
  ```
  Scenario: Full command verification
    Tool: Bash
    Steps: Run `npm run build`, `node scripts/validate-elements.mjs`, `node scripts/validate-supporting-data.mjs`, `node scripts/validate-chem-notation.mjs`, and `npx playwright test`.
    Expected: All commands exit 0.
    Evidence: .sisyphus/evidence/task-5-full-verification.txt

  Scenario: Raw-token sweep in browser-visible experiment UI
    Tool: Playwright
    Steps: Navigate through experiment card, detail, safety, simulation, and result views for at least one formula-bearing experiment. Query visible text for `\\mathrm`, `\\frac`, `$2 \\mathrm{~mL}$`, and unmatched dollar delimiters.
    Expected: No raw tokens are visible; valid formulas render with `.katex`; malformed fallback, if present only in controlled test fixture, is escaped and non-executable.
    Evidence: .sisyphus/evidence/task-5-browser-token-sweep.png
  ```

  **Commit**: YES | Message: `fix(lab): complete experiment formula rendering regression` | Files: all implementation/test/validation files touched by integration fixes

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Prefer one commit per task if tasks are executed by separate agents.
- If execution is done in one session, squash only if requested by the user; otherwise keep logical commits matching task messages.
- Never commit local-only evidence artifacts unless the repository already tracks `.sisyphus/evidence/` by convention or the user explicitly requests it.

## Success Criteria
- All experiment-visible formula-bearing prose renders formulas with KaTeX where valid.
- All non-formula Chinese prose remains readable and escaped safely.
- All included experiment UI surfaces are covered by either validation, Playwright, or both.
- No raw LaTeX authoring tokens leak in cards/details/steps/safety/visual/simulation/result flows.
- Build, validation scripts, and Playwright tests pass with recorded evidence.
