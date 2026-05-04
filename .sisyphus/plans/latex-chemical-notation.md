# KaTeX Chemistry Notation Rendering Migration

## TL;DR
> **Summary**: Add professional KaTeX rendering for formula-like chemistry notation across the app while preserving canonical plain data and keeping standalone element symbols as semantic text. Centralize all conversion/rendering in one chemistry notation boundary so search, quiz scoring, filtering, storage, and data validators remain plain-text based.
> **Deliverables**:
> - KaTeX dependency/style integration for Vite.
> - Centralized `src/modules/chemNotation.js` renderer/converter with safe KaTeX options.
> - App-wide migration of formulas, reaction equations, electron configurations, and formula-like quiz/game/story text display surfaces.
> - Playwright/data-validation coverage for rendering, accessibility, layout, and no-regression behavior.
> **Effort**: Medium
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3-5 → Tasks 6-8 → Task 9

## Context
### Original Request
The user asked, in Chinese: “整个应用中，所有的化学公式符号我想采用 latex 表示更专业，有没有可能？”

### Interview Summary
- Scope: app-wide formula-like notation rendering.
- Library: KaTeX.
- Data strategy: render-time conversion; do not migrate canonical source data to stored LaTeX strings.
- Test strategy: tests-after using current Playwright and validation infrastructure.
- Final scope refinement: render formulas/equations/electron configurations/formula-like snippets with KaTeX, but keep standalone periodic-table symbols such as `H`, `Fe`, `Na` as plain text.

### Metis Review (gaps addressed)
- Added strict boundary: `src/data/*` remains plain, searchable, and not KaTeX-coupled.
- Added guardrails preventing KaTeX from entering quiz scoring, search/filter logic, storage, or periodic-table cell symbols.
- Added explicit conversion requirements for Unicode superscripts, arrows, charges/ions, states, and malformed/empty input.
- Added test updates because existing Playwright text assertions may break when KaTeX expands DOM content.
- Added Vite/KaTeX font and production-build verification because no `vite.config.*` currently exists at repo root.

## Work Objectives
### Core Objective
Render all formula-like chemistry notation professionally through KaTeX at display boundaries without changing canonical data semantics or app logic behavior.

### Deliverables
- `package.json` / `package-lock.json` updated with `katex` dependency.
- Optional new `vite.config.js` only if needed to control KaTeX font asset handling after production-build verification.
- New `src/modules/chemNotation.js` with safe, category-specific rendering/conversion APIs.
- New `src/styles/chemNotation.css` for app-local KaTeX sizing/layout overrides.
- Updated rendering call sites in `src/modules/lab.js`, `renderTable.js`, `compare.js`, `storyMode.js`, `games.js`, and `quiz.js` for formula-like display only.
- New/updated Playwright tests under `tests/content/` or `tests/ui/` covering KaTeX rendering and regressions.

### Definition of Done (verifiable conditions with commands)
- `npm run validate:data` passes.
- `npm run build` passes.
- `npx playwright test tests/content/chem-notation.spec.ts` passes.
- `npx playwright test tests/ui/periodic-table-controls.spec.ts tests/shell/home-shell.spec.ts` passes.
- Browser console contains no KaTeX-related errors while navigating periodic table, lab, games, quiz, story, compare, and timeline.

### Must Have
- Centralized rendering boundary; no scattered ad hoc `katex.render()` calls outside the approved helper.
- Plain canonical strings remain available through `data-plain-text`, `aria-label`, or equivalent metadata on rendered notation nodes.
- KaTeX uses safe defaults: `throwOnError: false`, `trust: false`, accessible output (`htmlAndMathml` default), bounded sizing.
- Existing app behavior remains plain-data based: search/filter, quiz answer comparison, compare selection, storage/progress, and data validation.
- Standalone periodic-table/cell/card element symbols remain plain text and contain no `.katex` child.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do NOT migrate `src/data/elements.js`, `src/data/reactions.js`, or `src/data/quizData.js` to stored KaTeX strings.
- Do NOT render standalone element symbols in periodic-table cells, hero symbols, compare symbol boxes, story orbital badges, or timeline symbols with KaTeX.
- Do NOT add a new unit-test framework, CI pipeline, formula editor, user-input LaTeX feature, or Three.js changes.
- Do NOT pass raw user-controlled strings into KaTeX or HTML rendering.
- Do NOT use broad “detect chemistry everywhere” DOM scanning; use category-specific APIs and explicit call sites.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + existing Playwright framework and npm data validators.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 foundation dependency integration; Task 2 renderer/converter boundary.
Wave 2: Tasks 3-5 migrate high-value static/formula surfaces in parallel after renderer exists.
Wave 3: Tasks 6-8 migrate interactive/text-heavy surfaces and tests in parallel after renderer call contract stabilizes.
Wave 4: Task 9 build/performance/a11y hardening and regression verification.

### Dependency Matrix (full, all tasks)
| Task | Blocks | Blocked By |
|---|---|---|
| 1. Add KaTeX dependency and asset baseline | 2, 9 | None |
| 2. Create chemistry notation renderer | 3, 4, 5, 6, 7, 8, 9 | 1 |
| 3. Migrate lab and reaction displays | 8, 9 | 2 |
| 4. Migrate detail/compare electron configurations | 8, 9 | 2 |
| 5. Migrate formula-like story/timeline-safe surfaces | 8, 9 | 2 |
| 6. Migrate reaction game formula displays | 8, 9 | 2 |
| 7. Migrate formula-like quiz text rendering without scoring changes | 8, 9 | 2 |
| 8. Add/adjust Playwright notation coverage | 9 | 3, 4, 5, 6, 7 |
| 9. Final build, layout, performance, and accessibility hardening | Final Verification | 1-8 |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Task Count | Recommended Categories |
|---|---:|---|
| 1 | 2 | business-logic, visual-engineering |
| 2 | 3 | business-logic, visual-engineering |
| 3 | 3 | business-logic, visual-engineering |
| 4 | 1 | deep |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add KaTeX dependency and Vite asset baseline

  **What to do**: Add `katex` to dependencies, import KaTeX CSS from the app bootstrap path, and verify production asset output. If production build inlines/breaks KaTeX fonts, add a minimal `vite.config.js` with `build.assetsInlineLimit: 0`; otherwise do not create config churn. Add a short inline comment only where asset handling is non-obvious.
  **Must NOT do**: Do not use CDN scripts, auto-render extension, MathJax, or global DOM scanning. Do not alter app logic or source data.

  **Recommended Agent Profile**:
  - Category: `business-logic` - Reason: dependency/bootstrap change with build verification.
  - Skills: [] - no specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - not primarily a design task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 9 | Blocked By: None

  **References** (executor has NO interview context - be exhaustive):
  - Manifest: `package.json:6-24` - current scripts/dependencies; `katex` is not present.
  - Bootstrap: `src/main.js:1-25` - main import location; add app-wide CSS import here unless renderer-local import is cleaner.
  - Test config: `playwright.config.ts:3-24` - Playwright base URL and setup.
  - External: `https://katex.org/docs/browser.html` - CSS/font loading requirements.
  - External: `https://github.com/KaTeX/KaTeX/issues/4065` - Vite font inlining consideration.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm install katex` completes and updates `package.json` / `package-lock.json`.
  - [ ] `npm run build` passes.
  - [ ] Built output contains KaTeX CSS/font assets or a verified Vite-safe equivalent; evidence recorded with directory listing or build log.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: KaTeX dependency builds in production
    Tool: Bash
    Steps: Run `npm run build` from repo root.
    Expected: Exit code 0; no unresolved `katex` imports; no missing font asset errors.
    Evidence: .sisyphus/evidence/task-1-katex-build.txt

  Scenario: No CDN/auto-render regression introduced
    Tool: Bash
    Steps: Run a repository search for `cdn.jsdelivr`, `renderMathInElement`, and `auto-render`.
    Expected: No matches in `src/` or `index.html` for CDN/auto-render usage.
    Evidence: .sisyphus/evidence/task-1-no-cdn.txt
  ```

  **Commit**: NO | Message: `feat(ui): add katex chemistry rendering foundation` | Files: `package.json`, `package-lock.json`, `src/main.js`, optional `vite.config.js`

- [x] 2. Create centralized chemistry notation renderer

  **What to do**: Create `src/modules/chemNotation.js` exposing explicit APIs: `renderFormulaToElement(value, element, options)`, `formulaHTML(value, options)` only if needed for template-string call sites, `renderEquationToElement(value, element, options)`, `electronConfigHTML(value, options)`, `plainChemText(value)`, and conversion helpers for formulas/equations/electron configurations. Convert `H2O` → `\mathrm{H_2O}`, `CO2` → `\mathrm{CO_2}`, `2H2 + O2 → 2H2O` → `2\mathrm{H_2} + \mathrm{O_2} \rightarrow 2\mathrm{H_2O}`, Unicode superscripts like `1s¹` → `1s^{1}`, charges like `Na+` / `SO4^2-` to safe superscripts, and `↑` to `\uparrow`. Add `data-plain-text` and `aria-label` on rendered wrappers. Cache repeat renders by category+input+displayMode.
  **Must NOT do**: Do not mutate input data. Do not run KaTeX on arbitrary prose. Do not expose dangerous KaTeX trust options. Do not let helper throw for `null`, `undefined`, empty, or malformed strings.

  **Recommended Agent Profile**:
  - Category: `business-logic` - Reason: core conversion contract and safe rendering API.
  - Skills: [] - no specialized skill needed.
  - Omitted: [`playwright`] - this task uses command/browser checks through normal project tooling, not direct browser automation.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3, 4, 5, 6, 7, 8, 9 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Existing helper: `src/modules/lab.js:739-741` - replace this behavior with centralized helper.
  - Lab formulas: `src/modules/lab.js:12-18` - representative equation inputs.
  - Reaction data: `src/data/reactions.js:1-134` - formula arrays stay canonical.
  - Electron configs: `src/modules/renderTable.js:285-288`, `src/modules/compare.js:282-287`, `src/modules/storyMode.js:94-98` - representative display consumers.
  - External: `https://katex.org/docs/api.html` - use `katex.render()` or `katex.renderToString()` deliberately.
  - External: `https://katex.org/docs/options.html` - keep accessible `htmlAndMathml` default.
  - External: `https://katex.org/docs/security.html` - keep `trust: false`; cap size/expansion.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Helper renders representative inputs with `.katex` output and preserved `data-plain-text`: `H2O`, `CO2`, `NaOH`, `Fe2O3`, `2H2 + O2 → 2H2O`, `SO4^2-`, `Na+`, `1s¹`, `[Ar] 3d⁵ 4s¹`.
  - [ ] Helper returns safe plain text fallback for `''`, `null`, `undefined`, and malformed formula input without throwing.
  - [ ] No source data file under `src/data/` is modified by this task.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Representative conversions produce accessible KaTeX wrappers
    Tool: Bash
    Steps: Run a temporary Node/jsdom-free smoke script or Playwright page evaluation importing `src/modules/chemNotation.js` and rendering `H2O`, `2H2 + O2 → 2H2O`, and `[Ar] 3d⁵ 4s¹` into detached elements.
    Expected: Each wrapper has `.katex`, `data-plain-text` equal to the original canonical string, and `aria-label` containing the original canonical string.
    Evidence: .sisyphus/evidence/task-2-renderer-smoke.txt

  Scenario: Malformed and empty input degrades safely
    Tool: Bash
    Steps: Execute the same smoke harness with `null`, `undefined`, `''`, and `'{bad'`.
    Expected: No thrown exception; output is empty or escaped fallback text; no raw `<script>`/HTML is injected.
    Evidence: .sisyphus/evidence/task-2-renderer-edge.txt
  ```

  **Commit**: NO | Message: `feat(ui): add centralized chemistry notation renderer` | Files: `src/modules/chemNotation.js`

- [x] 3. Migrate lab and reaction displays to the renderer

  **What to do**: Replace `formatFormula()` usage in `src/modules/lab.js` with the centralized notation renderer. Preserve current `EQUATION_MAP` strings and `reactions` data. For template strings, use the helper’s safe HTML-wrapper API only if direct DOM `katex.render()` cannot fit the existing render flow; otherwise render placeholders after `innerHTML` assignment. Add stable selectors or `data-chem-notation` attributes to lab formula containers.
  **Must NOT do**: Do not alter safety confirmation flow, lab completion storage, modal timing, canvas simulation logic, or reaction data.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI rendering migration with layout/a11y implications.
  - Skills: [] - no specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - no new visual design required beyond fitting KaTeX into current UI.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 9 | Blocked By: 2

  **References** (executor has NO interview context - be exhaustive):
  - Current list rendering: `src/modules/lab.js:115-137`, especially `line 125`.
  - Stage equation/reactants/products: `src/modules/lab.js:251-263`.
  - Simulation modal equation: `src/modules/lab.js:368-379`.
  - Old helper: `src/modules/lab.js:739-741` - remove or replace with import wrapper.
  - Reaction data: `src/data/reactions.js:3-118` - canonical examples.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Lab list cards, lab equation card, reactant/product cards, and simulation modal equation contain KaTeX markup for formula-like notation.
  - [ ] `data-plain-text` / `aria-label` preserves original strings such as `2H2 + O2 → 2H2O`.
  - [ ] Lab safety confirmation and completion behavior still works for dangerous reaction `reaction-hydrogen-combustion`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Lab equations render through KaTeX
    Tool: Playwright
    Steps: Navigate to `/`; click `data-testid=nav-lab`; wait for `.lab-equation-card strong`; inspect `.lab-equation-card strong .katex` and its closest `[data-plain-text]`.
    Expected: `.katex` count is greater than 0; `data-plain-text` contains `2H2 + O2 → 2H2O`; no page errors.
    Evidence: .sisyphus/evidence/task-3-lab-katex.png

  Scenario: Lab safety flow still works
    Tool: Playwright
    Steps: In lab, open the hydrogen combustion reaction, click `data-lab-start`, check `data-safety-confirm`, click `data-launch-simulation`, wait for `.lab-modal`.
    Expected: Modal opens, `.lab-simulation-meta .katex` is visible, close button works, no KaTeX console errors.
    Evidence: .sisyphus/evidence/task-3-lab-safety-flow.txt
  ```

  **Commit**: NO | Message: `feat(lab): render reaction notation with katex` | Files: `src/modules/lab.js`

- [x] 4. Migrate detail panel and compare electron configurations

  **What to do**: Render electron configurations with KaTeX in element detail properties and compare attribute rows. Keep all standalone element symbols plain text. Add classes/selectors such as `.chem-notation--electron-config` only to electron configuration values. Preserve existing escaping behavior when inserting any non-notation user/content strings.
  **Must NOT do**: Do not KaTeX-render `.element-cell .symbol`, `.element-hero .symbol`, `.compare-card-symbol`, atomic masses, category labels, period/group text, or application lists.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: detail and compare surfaces are layout-sensitive.
  - Skills: [] - no specialized skill needed.
  - Omitted: [`git-master`] - no git operation requested during execution task.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 9 | Blocked By: 2

  **References** (executor has NO interview context - be exhaustive):
  - Periodic-cell symbols to preserve: `src/modules/renderTable.js:126-131`.
  - Detail hero symbol to preserve: `src/modules/renderTable.js:255-266`.
  - Detail electron configuration target: `src/modules/renderTable.js:285-288`.
  - Compare symbol to preserve and electron config target: `src/modules/compare.js:268-287`.
  - Compare row wrapper: `src/modules/compare.js:302-309`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Selecting Hydrogen shows detail electron configuration rendered with `.katex` and plain label `1s¹` preserved in `data-plain-text`/`aria-label`.
  - [ ] Periodic table cell symbol for Hydrogen remains text `H` with zero `.katex` descendants.
  - [ ] Compare card electron configuration renders with `.katex`, while compare-card symbol remains plain text.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Detail electron configuration renders, element symbol stays plain
    Tool: Playwright
    Steps: Navigate to `/`; click `[data-testid="element-cell-1"]`; inspect `[data-testid="detail-panel"]` electron configuration row and `[data-testid="element-cell-1"] .symbol`.
    Expected: Electron configuration row contains `.katex`; its plain text metadata contains `1s¹`; cell symbol text is exactly `H`; cell symbol `.katex` count is 0.
    Evidence: .sisyphus/evidence/task-4-detail-electron-config.png

  Scenario: Compare electron configuration renders without corrupting card identity
    Tool: Playwright
    Steps: Add Hydrogen and Oxygen to compare through existing UI flow or app-state-supported interaction; navigate to compare view/preview; inspect `.compare-attr-row--electron-configuration .katex` and `.compare-card-symbol`.
    Expected: Electron configuration rows contain `.katex`; `.compare-card-symbol` values are `H`/`O` as plain text with zero `.katex` descendants.
    Evidence: .sisyphus/evidence/task-4-compare-electron-config.txt
  ```

  **Commit**: NO | Message: `feat(elements): render electron configurations with katex` | Files: `src/modules/renderTable.js`, `src/modules/compare.js`

- [x] 5. Migrate story and timeline-safe formula-like surfaces

  **What to do**: In story mode, render transcript-header electron configuration with the centralized renderer. In timeline, preserve standalone `.timeline-entry-symbol` as plain text; only render formula-like text if a timeline description or future content has explicit notation category support. Add no broad parser to full timeline prose unless it is routed through a helper that safely tokenizes formula-like snippets and leaves Chinese prose escaped.
  **Must NOT do**: Do not render timeline standalone symbols with KaTeX. Do not run a global regex over all story/timeline HTML. Do not weaken `escapeHTML`/`escapeAttribute` protections.

  **Recommended Agent Profile**:
  - Category: `business-logic` - Reason: preserving escaping/security boundaries while updating rendering.
  - Skills: [] - no specialized skill needed.
  - Omitted: [`visual-engineering`] - minimal styling expected after renderer/style exists.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 9 | Blocked By: 2

  **References** (executor has NO interview context - be exhaustive):
  - Story symbol/plain fields: `src/modules/storyMode.js:73-98`; target is `line 97` only.
  - Timeline symbol/plain fields: `src/modules/timeline.js:180-208`; preserve `line 197` plain.
  - Existing escaping pattern: `src/modules/storyMode.js:78-98`, `src/modules/timeline.js:188-208`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Story transcript header electron configuration renders with KaTeX for selected element.
  - [ ] Story hero/orbital element symbols remain plain text with zero `.katex` descendants.
  - [ ] Timeline entry symbols remain plain text; timeline layout and search metadata are unchanged.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Story electron configuration renders safely
    Tool: Playwright
    Steps: Navigate to `/`; click `data-testid=nav-story`; wait for `.story-transcript-header`; inspect `.story-transcript-header .katex` and `.story-symbol`.
    Expected: Transcript header contains `.katex`; `.story-symbol` text is a plain element symbol and has zero `.katex` descendants.
    Evidence: .sisyphus/evidence/task-5-story-notation.png

  Scenario: Timeline standalone symbols remain plain and searchable metadata remains
    Tool: Playwright
    Steps: Navigate to timeline; inspect first `.timeline-entry-symbol` and first `.timeline-entry[data-search-key]`.
    Expected: `.timeline-entry-symbol .katex` count is 0; `data-search-key` is present and non-empty; no console/page errors.
    Evidence: .sisyphus/evidence/task-5-timeline-plain-symbols.txt
  ```

  **Commit**: NO | Message: `feat(story): render electron notation safely` | Files: `src/modules/storyMode.js`, optional `src/modules/timeline.js`

- [x] 6. Migrate reaction game formula displays

  **What to do**: Update reaction matching game chips so reactants/products display via the chemistry renderer, while matching IDs, selected state, score, feedback, and game session data remain unchanged. Add stable notation attributes to formula containers for tests. Keep memory/collector standalone element symbols plain text.
  **Must NOT do**: Do not change game scoring, timer, randomization, session structure, product IDs, or chip click handlers. Do not render memory/collector element-symbol cards with KaTeX.

  **Recommended Agent Profile**:
  - Category: `business-logic` - Reason: interactive UI with state/scoring invariants.
  - Skills: [] - no specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - use existing chip layout and style constraints.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8, 9 | Blocked By: 2

  **References** (executor has NO interview context - be exhaustive):
  - Reaction game render target: `src/modules/games.js:682-729`, especially `lines 694` and `704`.
  - Reaction data: `src/data/reactions.js:1-134` - canonical reactant/product strings.
  - User decision: standalone symbols in other games remain plain text.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Reaction game reactant/product chips render formula-like content with `.katex`.
  - [ ] Correct matching still increases score and marks matched chips.
  - [ ] Memory/collector standalone symbols remain plain text with no `.katex` descendants.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Reaction game chips render KaTeX and still match
    Tool: Playwright
    Steps: Navigate to games; start reaction game; inspect `.reaction-chip strong .katex`; click matching reactant/product pair using their `data-reaction-left` and `data-reaction-right` IDs.
    Expected: Formula chips contain `.katex`; matched pair becomes `.is-matched`; score increases by 10; no page errors.
    Evidence: .sisyphus/evidence/task-6-reaction-game-match.txt

  Scenario: Non-formula game symbols stay plain
    Tool: Playwright
    Steps: Start memory or collector game; inspect symbol-bearing cards/chips.
    Expected: Standalone element symbols such as `H`/`O` are visible as text and contain zero `.katex` descendants.
    Evidence: .sisyphus/evidence/task-6-games-plain-symbols.png
  ```

  **Commit**: NO | Message: `feat(games): render reaction notation with katex` | Files: `src/modules/games.js`

- [x] 7. Migrate formula-like quiz display without changing scoring

  **What to do**: Add display-only rendering for formula-like snippets in quiz questions, options, and explanations when the text contains chemical notation tokens. Use a helper that tokenizes escaped prose into text nodes plus notation nodes instead of using broad `innerHTML` replacement. Preserve option values and correctness checks as canonical plain strings. Current known quiz data mostly uses standalone element symbols; standalone symbols in “元素符号 H” should remain plain text unless token category is explicitly formula/equation-like.
  **Must NOT do**: Do not modify `correctIndex`, quiz scoring, selected option comparison, quiz scores storage, or `src/data/quizData.js`. Do not KaTeX-render every capital letter in Chinese prose.

  **Recommended Agent Profile**:
  - Category: `business-logic` - Reason: display rendering must not affect quiz correctness logic.
  - Skills: [] - no specialized skill needed.
  - Omitted: [`visual-engineering`] - no new design requested.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8, 9 | Blocked By: 2

  **References** (executor has NO interview context - be exhaustive):
  - Quiz data example: `src/data/quizData.js:17-29` - standalone `H` is symbol-recognition text and should remain plain.
  - Quiz module: `src/modules/quiz.js` - inspect current rendering and scoring before changes.
  - Storage state: `src/main.js:26-37` and AGENTS note on `window.appState.quizScores` - scoring remains storage-based.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Quiz question/option rendering supports formula-like notation when present, without changing answer values.
  - [ ] Existing `quiz-2` standalone `H` remains readable plain text and quiz answer “氢” still scores correctly.
  - [ ] No KaTeX markup appears inside hidden answer values, scoring comparisons, or stored quiz scores.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Existing symbol-recognition quiz still scores correctly
    Tool: Playwright
    Steps: Navigate to quiz; reach or select `quiz-2` if UI allows; choose answer `氢`; submit/check answer; inspect score/progress feedback.
    Expected: Answer is marked correct; `元素符号 H` remains visible; no `.katex` is required for standalone `H`; no console/page errors.
    Evidence: .sisyphus/evidence/task-7-quiz-scoring.txt

  Scenario: Formula-like quiz text renderer does not corrupt prose
    Tool: Playwright
    Steps: Inject or use a renderer smoke case containing `水的化学式是 H2O` through the quiz display helper in a detached DOM context.
    Expected: Chinese prose remains text; `H2O` renders as `.katex`; plain metadata contains `H2O`; no HTML injection occurs.
    Evidence: .sisyphus/evidence/task-7-quiz-formula-token.txt
  ```

  **Commit**: NO | Message: `feat(quiz): render formula notation without scoring changes` | Files: `src/modules/quiz.js`

- [x] 8. Add and update Playwright notation coverage

  **What to do**: Add `tests/content/chem-notation.spec.ts` (create `tests/content/` if needed) covering representative formulas/equations/electron configs, standalone-symbol guardrails, accessibility metadata, no KaTeX console errors, and responsive layout. Update any existing tests that fail because KaTeX changes text-node structure; prefer assertions on `data-plain-text`, `.katex`, `aria-label`, and preserved canonical app state instead of brittle `textContent` where formulas render.
  **Must NOT do**: Do not add Vitest/Jest. Do not use visual baseline snapshots unless Playwright screenshot evidence is enough. Do not weaken unrelated shell/control assertions.

  **Recommended Agent Profile**:
  - Category: `business-logic` - Reason: test suite contract and regression coverage.
  - Skills: [] - no specialized skill needed.
  - Omitted: [`playwright`] - execution can use repository Playwright tests; direct browser MCP not required unless debugging.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 9 | Blocked By: 3, 4, 5, 6, 7

  **References** (executor has NO interview context - be exhaustive):
  - Existing Playwright config: `playwright.config.ts:3-24`.
  - Existing shell wait pattern: `tests/shell/home-shell.spec.ts:71-82`.
  - Existing console-error capture pattern: `tests/ui/periodic-table-controls.spec.ts:92-119`.
  - Existing selectors: `tests/shell/home-shell.spec.ts:10-68` and `tests/ui/periodic-table-controls.spec.ts:14-24`.
  - Package scripts: `package.json:6-14` - no test script exists; use `npx playwright test ...` directly unless adding script is necessary.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `tests/content/chem-notation.spec.ts` covers lab, detail, compare or story, games, quiz smoke, standalone-symbol guardrails, and mobile/desktop layout.
  - [ ] Existing tests impacted by formula text DOM changes are updated without removing meaningful assertions.
  - [ ] `npx playwright test tests/content/chem-notation.spec.ts` passes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: New chemistry notation Playwright suite passes
    Tool: Bash
    Steps: Run `npx playwright test tests/content/chem-notation.spec.ts`.
    Expected: Exit code 0; tests verify `.katex`, `data-plain-text`, `aria-label`, and standalone-symbol no-KaTeX constraints.
    Evidence: .sisyphus/evidence/task-8-chem-notation-test.txt

  Scenario: Existing shell/control tests still pass
    Tool: Bash
    Steps: Run `npx playwright test tests/shell/home-shell.spec.ts tests/ui/periodic-table-controls.spec.ts`.
    Expected: Exit code 0; no removed shell/control coverage; no KaTeX console errors.
    Evidence: .sisyphus/evidence/task-8-regression-tests.txt
  ```

  **Commit**: NO | Message: `test(ui): cover chemistry notation rendering` | Files: `tests/content/chem-notation.spec.ts`, any updated existing test files

- [x] 9. Final build, layout, performance, accessibility, and security hardening

  **What to do**: Add `src/styles/chemNotation.css` overrides only as needed for KaTeX sizing/wrapping in cards, chips, detail rows, and mobile layouts, and import it through the same bootstrap/style path used for KaTeX CSS. Verify no catastrophic horizontal overflow at desktop/tablet/mobile widths. Confirm KaTeX font assets load in production preview. Confirm no raw user input reaches rendering helper. Confirm no ad hoc KaTeX calls outside `chemNotation.js`. Run final validation commands and save evidence.
  **Must NOT do**: Do not broaden scope to redesign chemistry UI, add CI, add user formula editing, or alter Three.js performance settings. Do not hide failures by disabling tests.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: cross-cutting final hardening across build, UI, a11y, and security.
  - Skills: [] - no specialized skill needed.
  - Omitted: [`frontend-ui-ux`] - style changes are constrained to regression fixes, not redesign.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification | Blocked By: 1, 2, 3, 4, 5, 6, 7, 8

  **References** (executor has NO interview context - be exhaustive):
  - Overflow test helper pattern: `tests/ui/periodic-table-controls.spec.ts:27-45`.
  - Shell responsive patterns: `tests/shell/home-shell.spec.ts:96-120`.
  - Build/validation scripts: `package.json:6-14`.
  - KaTeX security: `https://katex.org/docs/security.html` - `trust:false`, size/expansion limits.
  - KaTeX accessibility: `https://katex.org/docs/options.html` - default `htmlAndMathml`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run validate:data` passes.
  - [ ] `npm run build` passes.
  - [ ] `npx playwright test tests/content/chem-notation.spec.ts tests/ui/periodic-table-controls.spec.ts tests/shell/home-shell.spec.ts` passes.
  - [ ] Search/filter, quiz scoring, compare selection, lab completion, and game scoring remain plain-data based in tests or explicit smoke checks.
  - [ ] Source search confirms `katex.render`/`renderToString` is only called inside `src/modules/chemNotation.js`.
  - [ ] Production preview loads KaTeX fonts/assets without 404s.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full validation command set passes
    Tool: Bash
    Steps: Run `npm run validate:data`, `npm run build`, and `npx playwright test tests/content/chem-notation.spec.ts tests/ui/periodic-table-controls.spec.ts tests/shell/home-shell.spec.ts` sequentially.
    Expected: All commands exit 0; no KaTeX console/page errors; no horizontal overflow failures.
    Evidence: .sisyphus/evidence/task-9-final-commands.txt

  Scenario: Security and architecture boundary audit
    Tool: Bash
    Steps: Search `src/` for `katex.render`, `renderToString`, `trust: true`, `innerHTML` additions involving chemistry notation, and `src/data/` diffs.
    Expected: KaTeX API calls only in `src/modules/chemNotation.js`; no `trust: true`; no source data migrations; no raw user-controlled input rendered.
    Evidence: .sisyphus/evidence/task-9-boundary-audit.txt
  ```

  **Commit**: YES | Message: `feat(ui): render chemistry notation with KaTeX` | Files: dependency files, `src/modules/chemNotation.js`, `src/styles/chemNotation.css`, migrated modules, tests

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit once after implementation and verification pass.
- Suggested message: `feat(ui): render chemistry notation with KaTeX`
- Commit includes dependency lockfile changes, renderer/style files, migrated modules, and Playwright tests.

## Success Criteria
- Formula-like notation displays through KaTeX consistently across lab, reaction game, detail/compare electron configurations, story/quiz formula-like snippets, and representative mobile/desktop layouts.
- Standalone element symbols remain plain text and not KaTeX-rendered.
- Plain-data behavior remains unchanged for search/filter/quiz scoring/storage.
- Validation/build/Playwright commands pass with evidence artifacts.
