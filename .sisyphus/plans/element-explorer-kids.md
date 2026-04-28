# Element Explorer Kids

## TL;DR
> **Summary**: Build a sci-fi, Chinese-first periodic-table learning SPA for middle-school and high-school learners, centered on a high-fidelity homepage shell and a canonical learner-state model. Ship in vertical slices, with the first slice proving the periodic-table exploration loop end-to-end.
> **Deliverables**:
> - High-fidelity homepage shell matching `ui.png`
> - Full 118-element dataset plus quiz/reaction/achievement/learning-path data
> - Unified state/persistence/event model
> - Dedicated compare, timeline, story, quiz, lab, games, achievement, and progress views
> - Progressive-enhancement Three.js renderer with explicit performance modes
> **Effort**: XL
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → 2 → 3 → 5 → 6 → 7 → 8 → 10 → 15 → 16

## Context
### Original Request
- Build a Vite vanilla educational chemistry app using HTML/CSS/JS, ES modules, Three.js, GSAP, Canvas 2D, and localStorage.
- Implement 9 major modules, 4 mini-games, 5 virtual experiments, a full 118-element dataset, and a high-fidelity sci-fi interface.

### Interview Summary
- Primary users: **middle-school + high-school learners**.
- Homepage should **closely recreate** the reference shell in `ui.png`.
- UI language: **Chinese-first**, with English element names as learning assist.
- `learnedElements` rule: **opening the detail panel once marks the element as learned**.
- `collectedElements` rule: **learning automatically collects** the element.
- Story / quiz / lab actions leave the panel and open **dedicated views**.
- Games and experiments unlock by **learning stage**.
- First implementation slice: **homepage exploration loop**.
- Rendering strategy: **WebGPU as progressive enhancement only**.
- Settings must expose **explicit performance modes**.

### Metis Review (gaps addressed)
- Added an explicit learner-state contract: `selected`, `learned`, `collected`, `completed`, `unlocked`, `score`.
- Added a concrete support matrix instead of vague “responsive/performance”.
- Added explicit performance-mode behavior instead of “faster/slower” language.
- Added localStorage versioning, corrupt-state recovery, and return-to-selected-element invariants.
- Prevented phase-1 scope creep by fixing the first vertical slice around homepage exploration only.

## Work Objectives
### Core Objective
Deliver a polished sci-fi learning platform whose homepage acts as the canonical exploration console, and whose downstream modes all consume one shared content model and one shared learner-state model.

### Deliverables
- `index.html` + SPA shell matching the reference layout hierarchy.
- Full source tree specified in `原始需求.txt` with no missing required modules.
- 118-element dataset with all required fields populated and normalized.
- Supporting datasets: quizzes, reactions, achievements, learning path.
- Progressive-enhancement Three.js background/orbital/lab visuals.
- Dedicated compare, timeline, story, quiz, lab, games, achievements, and progress experiences.
- Data validation scripts and Playwright coverage for the critical flows.

### Definition of Done (verifiable conditions with commands)
- `npm install` completes without dependency errors.
- `npm run build` completes successfully.
- `node scripts/validate-elements.mjs` passes with 118 unique atomic numbers, required fields present, no duplicate symbols, and valid category values.
- `node scripts/validate-supporting-data.mjs` passes for quiz/reaction/achievement/learning-path cross-references.
- `npx playwright test tests/shell/home-shell.spec.ts` passes.
- `npx playwright test tests/exploration/periodic-flow.spec.ts` passes.
- `npx playwright test tests/modes/compare-timeline-story.spec.ts` passes.
- `npx playwright test tests/modes/quiz-lab-games.spec.ts` passes.
- `npx playwright test tests/state/persistence-recovery.spec.ts` passes.
- `npx playwright test tests/responsive/support-matrix.spec.ts` passes.

### Must Have
- Homepage shell with **top nav + central table + right detail panel + four bottom modules visible together** on desktop breakpoints.
- Full 118-element periodic table with correct main-grid / lanthanide / actinide placement.
- Chinese-first educational copy with English element names retained.
- Dedicated views for story, quiz, lab, compare, timeline, games, achievements, and progress.
- Explicit stage-lock states for unavailable content.
- Performance setting that users can toggle manually.
- WebGPU fallback behavior that never blocks core usage.
- localStorage resilience and safe recovery.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No low-fidelity placeholder dashboard styling.
- No WebGPU-only critical path.
- No dangerous, actionable real-world experiment instructions.
- No separate manual “collect” logic diverging from auto-collect-on-learn.
- No hidden/implicit state mutations outside the canonical learner-state/event layer.
- No English placeholder copy or empty content fields in final deliverable.
- No bottom-module removal on desktop homepage; match the agreed shell contract.

### Support Matrix
- **Primary certification**: Chrome latest, Edge latest on Windows 10/11 at `1920x1080`, `1600x900`, `1366x768`.
- **Secondary graceful-load support**: Firefox latest and Safari latest must load, fall back, and keep core interactions functional, but are not WebGPU targets.
- **Mobile/responsive certification**: `390x844` and `430x932` with horizontal table scroll, bottom-sheet detail panel, and cardified game blocks.

### Learner-State Contract
- `selectedElement`: current in-focus element; not persisted across full reset, but restored when returning from story/quiz/lab within the same session.
- `learnedElements`: add atomic number **the first time the detail panel fully opens**.
- `collectedElements`: mirror learned elements automatically; same atomic number added on the same event.
- `completedExperiments`: experiment IDs completed after the result card successfully renders.
- `quizScores`: append per completed quiz run; store `score`, `total`, `percentage`, `sourceElement`, `timestamp`.
- `gameScores`: per game key store best score and latest score.
- `unlockedAchievements`: persisted achievement IDs derived from canonical event handlers, not scattered UI logic.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: **tests-after** with Node data validation scripts + Playwright end-to-end acceptance.
- QA policy: Every task below includes at least one happy-path and one failure/edge scenario.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
- Required test IDs established in Task 1. Minimum selectors:
  - `data-testid="nav-home|compare|timeline|games|lab|achievements|progress|story"`
  - `data-testid="element-cell-{atomicNumber}"`
  - `data-testid="detail-panel"`
  - `data-testid="bottom-categories|bottom-compare|bottom-timeline|bottom-stats"`
  - `data-testid="performance-mode-toggle"`
  - `data-testid="lock-overlay-{module}"`

## Execution Strategy
### Parallel Execution Waves
Wave 1: foundation and non-negotiable contracts
- 1. Homepage shell + routing/test-id contract
- 2. Canonical content datasets + validators
- 3. Unified state model + localStorage resilience
- 4. Renderer abstraction + performance modes
- 5. Table layout engine + legend + base visuals

Wave 2: core exploration and homepage fidelity
- 6. Filters/search/hover/select/learned markers
- 7. Detail panel + auto-learn/auto-collect + spectrum/orbit lifecycle
- 8. Bottom four homepage modules + preview synchronization
- 9. Dedicated compare view
- 10. Dedicated story/quiz/lab route shells + return-state invariants

Wave 3: deep learning modes and progression
- 11. Full timeline view
- 12. Quiz engine + 20 questions
- 13. Virtual lab + 5 experiments
- 14. Games center + 4 games
- 15. Learning path + achievements + progress dashboards
- 16. Responsive/mobile coverage + content audit + integration polish

### Dependency Matrix (full, all tasks)
- 1 blocks 5-16.
- 2 blocks 5-16.
- 3 blocks 6-16.
- 4 blocks 7, 10, 13, 16.
- 5 blocks 6-10 and supports 14.
- 6 blocks 7-10.
- 7 blocks 8-10 and supports 15.
- 8 depends on 3, 5, 6, 7.
- 9 depends on 3, 7, 8.
- 10 depends on 1, 3, 7.
- 11 depends on 2, 10.
- 12 depends on 2, 10.
- 13 depends on 2, 4, 10.
- 14 depends on 2, 5, 10.
- 15 depends on 2, 3, 7, 12, 13, 14.
- 16 depends on 1-15.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 5 tasks → `visual-engineering` x2, `unspecified-high` x2, `deep` x1
- Wave 2 → 5 tasks → `visual-engineering` x4, `unspecified-high` x1
- Wave 3 → 6 tasks → `visual-engineering` x2, `unspecified-high` x3, `deep` x1

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Establish the homepage shell, routing skeleton, and selector contract

  **What to do**: Build the single-page application shell so desktop matches the agreed reference hierarchy: fixed top nav, center periodic-table stage, right-side detail panel dock, and four bottom modules simultaneously visible. Define the route/view map for `home`, `compare`, `timeline`, `games`, `lab`, `achievements`, `progress`, and `story`. Add a settings entry point that exposes the explicit performance-mode switch. Standardize all `data-testid` attributes listed in the verification strategy before any deeper feature work. Because the current repo bootstrap imports non-existent data/route modules, this task MUST also create **bootstrap-safe stub exports** for every not-yet-implemented import required for `npm run build` to pass; later tasks replace those stubs with real implementations.
  **Must NOT do**: Do not collapse bottom modules on desktop. Do not implement deep business logic in this task. Do not choose ad-hoc selectors later. Do not leave the repo in a non-building state waiting for later tasks.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: shell fidelity and spatial hierarchy are the core deliverable.
  - Skills: [`frontend-design`] - why needed: preserve the sci-fi control-center feel without generic layouts.
  - Omitted: [`threejs-animation`] - why not needed: renderer work belongs to Task 4.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 5-16 | Blocked By: none

  **References**:
  - Pattern: `原始需求.txt:23-44` - visual style and page/module expectations.
  - Pattern: `原始需求.txt:45-91` - required source-tree targets.
  - Pattern: `ui.png` - homepage shell fidelity, module placement, and visual hierarchy.
  - API/Type: `package.json:1-18` - Vite/Three/GSAP baseline scripts and dependencies.
  - API/Type: `src/main.js:1-16` - current bootstrap imports that require temporary stub coverage.
  - Pattern: `src/main.js:36-68` - existing bootstrap order worth either aligning to or replacing cleanly.

  **Acceptance Criteria**:
  - [ ] `npm run build` passes after shell/routing/test-id structure is added.
  - [ ] `npx playwright test tests/shell/home-shell.spec.ts` passes, proving nav, center table stage, right panel container, bottom four modules, and settings trigger are all present at `1440x900`.

  **QA Scenarios**:
  ```
  Scenario: Desktop shell contract
    Tool: Playwright
    Steps: Open `/`; assert `nav-home`, `periodic-table`, `detail-panel`, `bottom-categories`, `bottom-compare`, `bottom-timeline`, `bottom-stats`, `performance-mode-toggle` all exist at 1440x900.
    Expected: All shell regions are visible without forced vertical scroll on first paint.
    Evidence: .sisyphus/evidence/task-1-home-shell.png

  Scenario: Unknown route fallback
    Tool: Playwright
    Steps: Navigate to `#/does-not-exist`; wait for app shell.
    Expected: App falls back to home without blank screen or console error.
    Evidence: .sisyphus/evidence/task-1-home-shell-error.png
  ```

  **Commit**: YES | Message: `feat(shell): establish homepage layout and route skeleton` | Files: `index.html`, `src/main.js`, `src/modules/router.js`, `src/styles/base.css`, `src/styles/layout.css`, route/view containers

- [ ] 2. Build canonical content datasets and validation scripts

  **What to do**: Create the canonical data layer: `elements.js` with 118 fully populated elements, `quizData.js`, `reactions.js`, `achievementsData.js`, and `learningPath.js`. Enforce one category taxonomy, one rarity scale, one safety scale, and normalized cross-references between datasets. Add `scripts/validate-elements.mjs` and `scripts/validate-supporting-data.mjs` so data quality is machine-checked.
  **Must NOT do**: Do not leave blank fields. Do not use mixed category strings or missing IDs. Do not encode view-specific formatting into the raw data.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: large structured content + validator logic.
  - Skills: [] - why needed: discipline matters more than a style skill here.
  - Omitted: [`frontend-design`] - why not needed: this is data-contract work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5-16 | Blocked By: none

  **References**:
  - Pattern: `原始需求.txt:92-129` - required element fields and category list.
  - Pattern: `原始需求.txt:211-314` - game, lab, quiz, learning-path, achievement, and story content requirements.
  - Pattern: `原始需求.txt:324-335` - no empty fields / no placeholder-copy guardrails.
  - Pattern: `src/main.js:18-33` - current state fields that the datasets must feed.

  **Acceptance Criteria**:
  - [ ] `node scripts/validate-elements.mjs` passes with exactly 118 unique atomic numbers, unique symbols, non-empty required fields, valid `x/y` positions, and allowed categories only.
  - [ ] `node scripts/validate-supporting-data.mjs` passes with no broken element IDs, stage references, or achievement references.

  **QA Scenarios**:
  ```
  Scenario: Data integrity sweep
    Tool: Bash
    Steps: Run `node scripts/validate-elements.mjs && node scripts/validate-supporting-data.mjs`.
    Expected: Exit code 0; validation summary reports 118 elements and no missing cross-links.
    Evidence: .sisyphus/evidence/task-2-data-validation.txt

  Scenario: Broken element reference detection
    Tool: Bash
    Steps: Temporarily inject an invalid element ID into a copied fixture used by the validator test harness.
    Expected: Supporting-data validator fails with a clear reference error and non-zero exit code.
    Evidence: .sisyphus/evidence/task-2-data-validation-error.txt
  ```

  **Commit**: YES | Message: `feat(data): add canonical chemistry datasets and validators` | Files: `src/data/*`, `scripts/validate-elements.mjs`, `scripts/validate-supporting-data.mjs`

- [ ] 3. Implement unified learner-state management and storage resilience

  **What to do**: Create one canonical state/event layer for `selectedElement`, `learnedElements`, `collectedElements`, `quizScores`, `completedExperiments`, `unlockedAchievements`, `gameScores`, and settings. Persist via versioned localStorage keys. Add corruption recovery, schema migration, reset behavior, and unavailable-storage fallback. Hard-code the agreed rule that opening the detail panel marks learned and auto-collects the element.
  **Must NOT do**: Do not mutate localStorage directly from individual feature views. Do not separate collected state from learned state semantics.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: cross-module state semantics are the highest coupling risk.
  - Skills: [] - why needed: precision matters more than domain styling.
  - Omitted: [`frontend-design`] - why not needed: this is architecture/state work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6-16 | Blocked By: none

  **References**:
  - Pattern: `原始需求.txt:301-307` - required persisted keys.
  - Pattern: `原始需求.txt:141-143` - learned/rare UI states that must derive from canonical state.
  - API/Type: `src/main.js:18-33` - current global-state shape candidate.
  - API/Type: `src/main.js:36-68` - lifecycle hooks for load/save behavior.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/state/persistence-recovery.spec.ts` passes for learn/collect persistence, corrupted payload recovery, and reset behavior.
  - [ ] `npm run build` passes with no circular-import/runtime initialization errors.

  **QA Scenarios**:
  ```
  Scenario: Learn + auto-collect persistence
    Tool: Playwright
    Steps: Open `/`; click `element-cell-1`; wait for `detail-panel`; inspect localStorage keys; reload.
    Expected: `learnedElements` and `collectedElements` both contain `1`, and UI still marks hydrogen as learned after reload.
    Evidence: .sisyphus/evidence/task-3-persistence.json

  Scenario: Corrupt localStorage recovery
    Tool: Playwright
    Steps: Seed malformed JSON into the app storage key before page load.
    Expected: App boots with safe defaults, surfaces no crash, and replaces bad payload with valid versioned state.
    Evidence: .sisyphus/evidence/task-3-persistence-error.json
  ```

  **Commit**: YES | Message: `feat(state): centralize learner events and resilient storage` | Files: `src/modules/storage.js`, state helpers, migration/reset utilities

- [ ] 4. Create one renderer abstraction with explicit performance modes

  **What to do**: Implement one rendering entry that attempts `WebGPURenderer` with documented fallback and keeps the UI functional under WebGL-only conditions. Define two user-facing modes exactly: `normal` and `high-performance`. In `normal`, use reduced particle counts, lower orbital detail, simplified lab scene defaults, and pause non-visible effects aggressively. In `high-performance`, raise particle density and effect fidelity without changing gameplay semantics.
  **Must NOT do**: Do not maintain separate duplicated render pipelines. Do not make any route fail if WebGPU is unavailable.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: rendering, fallback logic, and settings integration.
  - Skills: [`threejs-animation`] - why needed: procedural animation and lifecycle performance discipline.
  - Omitted: [`frontend-design`] - why not needed: this is renderer behavior, not layout styling.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7, 10, 13, 16 | Blocked By: none

  **References**:
  - Pattern: `原始需求.txt:170-177` - Three.js requirements.
  - Pattern: `原始需求.txt:178-187` - GSAP/animation requirements that will interact with render lifecycle.
  - Pattern: `原始需求.txt:315-323` - responsive/device constraints.
  - External: `https://threejs.org/docs/pages/WebGPURenderer.html` - fallback behavior and renderer contract.
  - External: `https://threejs.org/manual/en/webgpurenderer.html` - implementation caveats and maturity notes.
  - Pattern: `src/three/scene.js` - existing renderer entry point target.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/state/performance-mode.spec.ts` passes, proving mode toggle changes effect profile deterministically.
  - [ ] `npx playwright test tests/state/webgpu-fallback.spec.ts` passes, proving the app still loads and interacts when WebGPU APIs are unavailable.

  **QA Scenarios**:
  ```
  Scenario: Manual performance toggle
    Tool: Playwright
    Steps: Open `/`; switch `performance-mode-toggle` from `normal` to `high-performance`; read DOM state and effect counters from a debug-safe status element.
    Expected: Mode state changes, particle/orbit detail counters update, and the table remains interactive.
    Evidence: .sisyphus/evidence/task-4-performance.png

  Scenario: WebGPU unavailable fallback
    Tool: Playwright
    Steps: Launch with `navigator.gpu` disabled/mocked unavailable.
    Expected: App renders through fallback path, `element-cell-1` is clickable, and no fatal renderer error blocks usage.
    Evidence: .sisyphus/evidence/task-4-performance-error.png
  ```

  **Commit**: YES | Message: `feat(rendering): add progressive enhancement renderer and performance modes` | Files: `src/three/scene.js`, `src/three/particles.js`, settings integration

- [ ] 5. Implement the full periodic-table layout engine and legend

  **What to do**: Render the main 18-column table, separate lanthanide/actinide rows, element-cell positioning, category styling tokens, and homepage legend blocks. Honor the reference layout proportions first, then adapt responsibly for smaller breakpoints later. Ensure cell generation is fully data-driven from `elements.js`.
  **Must NOT do**: Do not hard-code individual cells in HTML. Do not merge lanthanides/actinides back into the main grid.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: table fidelity and visual rhythm matter heavily.
  - Skills: [`frontend-design`] - why needed: make the dense table readable and stylish at once.
  - Omitted: [`threejs-animation`] - why not needed: static table engine first.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 6-10, 14 | Blocked By: 1, 2

  **References**:
  - Pattern: `原始需求.txt:130-143` - homepage table functionality.
  - Pattern: `原始需求.txt:45-91` - required style/module file targets.
  - Pattern: `ui.png` - main grid spacing, glow style, and bottom-legend positioning.
  - Pattern: `src/styles/periodic-table.css` - existing target stylesheet.

  **Acceptance Criteria**:
  - [ ] `node scripts/validate-elements.mjs` confirms `x/y` values fully map to rendered grid positions.
  - [ ] `npx playwright test tests/exploration/table-layout.spec.ts` passes for main-grid and lanthanide/actinide placement.

  **QA Scenarios**:
  ```
  Scenario: Main table placement
    Tool: Playwright
    Steps: Open `/`; verify `element-cell-1`, `element-cell-2`, `element-cell-57`, and `element-cell-89` render in their expected regions.
    Expected: Hydrogen/helium occupy period-1 extremities; lanthanides/actinides render in separated rows.
    Evidence: .sisyphus/evidence/task-5-table-layout.png

  Scenario: Missing-coordinate guard
    Tool: Bash
    Steps: Run `node scripts/validate-elements.mjs` against a test fixture missing an `x` value.
    Expected: Validation fails with an explicit coordinate error.
    Evidence: .sisyphus/evidence/task-5-table-layout-error.txt
  ```

  **Commit**: YES | Message: `feat(table): render full periodic layout and legend` | Files: `src/modules/renderTable.js`, `src/styles/periodic-table.css`, related templates

- [ ] 6. Add filters, search, hover/select states, learned markers, and rare glows

  **What to do**: Implement category filter, period filter, search, reset, hover glow/floating animation, selected-element highlighting, learned markers, and rare-element visual treatment. Filter/search/reset logic must compose predictably and never lose the canonical selected element unless the user explicitly changes it.
  **Must NOT do**: Do not let filters permanently mutate the dataset. Do not clear learned state when a cell becomes hidden.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: interaction states and dense-grid usability.
  - Skills: [`frontend-design`] - why needed: polished hover/selection behavior.
  - Omitted: [`threejs-animation`] - why not needed: CSS/GSAP-level interactivity is sufficient.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7-10 | Blocked By: 3, 5

  **References**:
  - Pattern: `原始需求.txt:134-143` - interaction, filter, search, learned, and rare requirements.
  - Pattern: `ui.png` - filter placement and high-density toolbar behavior.
  - Pattern: `src/modules/filters.js`, `src/modules/search.js`, `src/modules/renderTable.js` - target modules.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/exploration/filter-search.spec.ts` passes for filter/search/reset composition.
  - [ ] `npx playwright test tests/exploration/selection-states.spec.ts` passes for hover/select/learned/rare states.

  **QA Scenarios**:
  ```
  Scenario: Search and reset composition
    Tool: Playwright
    Steps: Filter to `noble gas`; search `He`; reset.
    Expected: Helium remains visible under combined filters, then full table returns after reset with no stale hidden state.
    Evidence: .sisyphus/evidence/task-6-filter-search.png

  Scenario: Repeated selection under active filters
    Tool: Playwright
    Steps: Select hydrogen; apply unrelated filter; clear filter; re-open hydrogen.
    Expected: No duplicate learn events, no broken highlight state, and learned marker persists.
    Evidence: .sisyphus/evidence/task-6-filter-search-error.png
  ```

  **Commit**: YES | Message: `feat(table): add search filters and interaction states` | Files: `src/modules/filters.js`, `src/modules/search.js`, table animation hooks

- [ ] 7. Implement the right detail panel, auto-learn/auto-collect flow, spectrum canvas, and orbital lifecycle

  **What to do**: Build the detail panel as the canonical element entry point. On first successful panel open, fire the canonical learn event and auto-collect event. Render all required element fields, a Canvas spectrum view, and a Three.js orbital view with mount/unmount discipline. Preserve the currently selected element while navigating out to dedicated story/quiz/lab views.
  **Must NOT do**: Do not mark learned on mere hover. Do not leave orphaned render loops when switching elements rapidly.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: the panel is both primary UI and learning engine.
  - Skills: [`frontend-design`, `threejs-animation`] - why needed: dense information design plus orbital visualization lifecycle.
  - Omitted: [] - why not needed: both loaded skills are relevant here.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 8-10, 15 | Blocked By: 3, 4, 6

  **References**:
  - Pattern: `原始需求.txt:145-169` - required fields, visuals, and actions.
  - Pattern: `ui.png` - panel grouping, hierarchy, and prev/next affordances.
  - API/Type: `src/three/electronModel.js` - orbital target module.
  - API/Type: `src/three/elementEnergy.js` - auxiliary detail visualization target.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/exploration/periodic-flow.spec.ts` passes for click-to-open, learn/collect mutation, and persisted return state.
  - [ ] `npx playwright test tests/exploration/detail-lifecycle.spec.ts` passes for rapid panel-switch cleanup without crash.

  **QA Scenarios**:
  ```
  Scenario: First-open learn event
    Tool: Playwright
    Steps: Click `element-cell-1`; wait for `detail-panel`; inspect localStorage and visible panel fields.
    Expected: Hydrogen details render, learned/collected both update once, and panel actions for story/quiz/lab are enabled.
    Evidence: .sisyphus/evidence/task-7-detail-panel.png

  Scenario: Rapid element switching
    Tool: Playwright
    Steps: Click H, He, Li, Be in fast succession while the panel animates.
    Expected: Only the final element remains selected, renderer instances do not stack, and no blank panel occurs.
    Evidence: .sisyphus/evidence/task-7-detail-panel-error.png
  ```

  **Commit**: YES | Message: `feat(detail): add canonical element panel and learn flow` | Files: `src/modules/detailPanel.js`, `src/three/electronModel.js`, spectrum renderer

- [ ] 8. Implement the four always-visible bottom homepage modules and sync them to state

  **What to do**: Build the homepage bottom band exactly as agreed: category module, compare preview, discovery timeline preview, and quick stats. Keep all four visible on desktop and make them react to current state in real time. The compare preview must reflect current compare slots; the timeline preview must reflect discovery data; quick stats must derive from learner state and element metadata.
  **Must NOT do**: Do not hide or lazy-remove a bottom module on desktop. Do not source preview values from hard-coded demo numbers.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: dense dashboard synchronization and fidelity.
  - Skills: [`frontend-design`] - why needed: preserve high density without visual collapse.
  - Omitted: [`threejs-animation`] - why not needed: this task is preview-state UI.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9-10 | Blocked By: 5, 6, 7

  **References**:
  - Pattern: `原始需求.txt:30-32` - bottom data/stat/learning modules.
  - Pattern: `原始需求.txt:188-210` - compare/timeline data requirements.
  - Pattern: `ui.png` - bottom four-module arrangement.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/shell/home-shell.spec.ts` passes with all four bottom modules visible and populated from live state.
  - [ ] `npx playwright test tests/modes/home-preview-sync.spec.ts` passes for real-time updates after learning/compare actions.

  **QA Scenarios**:
  ```
  Scenario: Bottom-band live updates
    Tool: Playwright
    Steps: Learn hydrogen; add oxygen to compare; return to home.
    Expected: Quick stats increment, compare preview updates, and timeline/stat modules remain visible.
    Evidence: .sisyphus/evidence/task-8-home-previews.png

  Scenario: Empty-state dashboard
    Tool: Playwright
    Steps: Launch with cleared storage on a fresh profile.
    Expected: All four modules render safe empty states rather than blank or broken containers.
    Evidence: .sisyphus/evidence/task-8-home-previews-error.png
  ```

  **Commit**: YES | Message: `feat(home): sync bottom dashboard modules to live state` | Files: homepage preview modules, styles, preview data hooks

- [ ] 9. Build the dedicated compare view with max-3 discipline

  **What to do**: Implement the dedicated compare page and keep the bottom compare preview in sync. Enforce a hard max of 3 elements, with remove and clear actions. Display atomic mass, electronegativity, state, category, uses, and danger in card form. Reuse canonical selected-element data rather than duplicating compare payloads.
  **Must NOT do**: Do not allow more than 3 items. Do not fork compare data from the source element model.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: card comparison UI and synchronization.
  - Skills: [`frontend-design`] - why needed: dense comparison cards must remain readable.
  - Omitted: [`threejs-animation`] - why not needed: no renderer-specific work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 15 | Blocked By: 7, 8

  **References**:
  - Pattern: `原始需求.txt:188-200` - compare feature requirements.
  - Pattern: `ui.png` - compare preview motif and card style.
  - Target File: `src/modules/compare.js` - new file required by the spec and missing in the current repo.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/modes/compare-view.spec.ts` passes for add/remove/clear/max-3 behavior.
  - [ ] `npm run build` passes with compare page accessible from nav and detail panel.

  **QA Scenarios**:
  ```
  Scenario: Max-3 comparison
    Tool: Playwright
    Steps: Add H, O, Na, Cl in sequence.
    Expected: First three are accepted; the fourth is blocked with a visible max-limit message and no state corruption.
    Evidence: .sisyphus/evidence/task-9-compare.png

  Scenario: Clear-and-return stability
    Tool: Playwright
    Steps: Open compare view; clear all; navigate back home.
    Expected: Compare page shows empty state, bottom compare preview resets, and home selection remains stable.
    Evidence: .sisyphus/evidence/task-9-compare-error.png
  ```

  **Commit**: YES | Message: `feat(compare): add dedicated max-3 comparison workflow` | Files: `src/modules/compare.js`, compare view templates/styles

- [ ] 10. Create dedicated story, quiz, and lab route shells with return-state invariants and stage locks

  **What to do**: Build the route shells and navigation contracts for story, quiz, and lab pages before deep feature implementation. Preserve `selectedElement` when entering from the detail panel, and restore home/selection context when returning. Add explicit stage-lock overlays and disabled affordances for unavailable content according to learning-path progression.
  **Must NOT do**: Do not dump story/quiz/lab into the detail panel itself. Do not lose selected-element context when returning home.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: navigation/state invariants across dedicated views.
  - Skills: [] - why needed: contract discipline first.
  - Omitted: [`frontend-design`] - why not needed: shells can use system styles from prior tasks.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 11-16 | Blocked By: 1, 3, 4, 7, 8

  **References**:
  - Pattern: `原始需求.txt:164-169` - detail panel action buttons.
  - Pattern: `原始需求.txt:235-314` - lab, quiz, and story functional scopes.
  - Pattern: `src/modules/router.js` - route target.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/modes/route-shells.spec.ts` passes for enter/return selection restoration.
  - [ ] `npx playwright test tests/modes/locked-content.spec.ts` passes for locked-state rendering without progress corruption.

  **QA Scenarios**:
  ```
  Scenario: Return to selected element
    Tool: Playwright
    Steps: Open oxygen detail; click story; return home.
    Expected: Oxygen remains selected and detail panel can be restored without re-learning duplicates.
    Evidence: .sisyphus/evidence/task-10-route-shells.png

  Scenario: Locked route access
    Tool: Playwright
    Steps: Attempt to open a stage-locked lab/game/story entry from an under-qualified profile.
    Expected: Lock overlay explains requirement, no route crash occurs, and state remains unchanged.
    Evidence: .sisyphus/evidence/task-10-route-shells-error.png
  ```

  **Commit**: YES | Message: `feat(routes): add dedicated story quiz and lab shells` | Files: routing logic, shell pages, lock components

- [ ] 11. Implement the full discovery timeline view and preview/page synchronization

  **What to do**: Build the dedicated timeline page from normalized discovery data, including year ordering, key-node highlighting, known-element count evolution, and scientist story hooks. Define a rule for ancient/unknown discoveries: label them `古代已知` in UI while sorting them into a stable pre-modern bucket used consistently across preview and full page.
  **Must NOT do**: Do not leave unknown years unsorted or silently hidden. Do not let preview and full timeline disagree.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: timeline is both data viz and educational storytelling.
  - Skills: [`frontend-design`] - why needed: dense chart-like layout needs refinement.
  - Omitted: [`threejs-animation`] - why not needed: GSAP/page animation is enough.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 16 | Blocked By: 2, 10

  **References**:
  - Pattern: `原始需求.txt:201-210` - timeline requirements.
  - Pattern: `ui.png` - preview chart style and bottom layout proportion.
  - Target File: `src/modules/timeline.js` - new file required by the spec and missing in the current repo.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/modes/timeline-view.spec.ts` passes for chronological ordering, click-through, and preview/full-page sync.
  - [ ] `node scripts/validate-supporting-data.mjs` passes for all timeline discovery references.

  **QA Scenarios**:
  ```
  Scenario: Timeline click-through
    Tool: Playwright
    Steps: Open timeline page; click a modern discovery node; return to home.
    Expected: The linked element opens correctly and preserves route/state expectations.
    Evidence: .sisyphus/evidence/task-11-timeline.png

  Scenario: Ancient discovery normalization
    Tool: Playwright
    Steps: Inspect a `古代已知` entry and its preview counterpart.
    Expected: It displays consistently, sorts deterministically, and does not break the line chart.
    Evidence: .sisyphus/evidence/task-11-timeline-error.png
  ```

  **Commit**: YES | Message: `feat(timeline): add discovery history page and preview sync` | Files: `src/modules/timeline.js`, timeline styles/assets

- [ ] 12. Build the quiz engine, 20-question bank integration, and score persistence

  **What to do**: Implement the dedicated quiz experience with at least 20 questions across single-choice, true/false, symbol recognition, daily-use matching, and safety questions. Support both contextual entry from an element and broader stage-based quiz entry. Persist high score semantics consistently and expose explanation text after each answer.
  **Must NOT do**: Do not show quiz questions without explanations. Do not store ambiguous score formats.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: structured content + scoring + progression hooks.
  - Skills: [] - why needed: logic correctness first.
  - Omitted: [`frontend-design`] - why not needed: shell already exists.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 15-16 | Blocked By: 2, 10

  **References**:
  - Pattern: `原始需求.txt:262-276` - quiz requirements.
  - Pattern: `原始需求.txt:277-288` - learning-path relationship.
  - Target File: `src/modules/quiz.js` - new file required by the spec and missing in the current repo.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/modes/quiz-view.spec.ts` passes for contextual quiz launch, answer evaluation, explanations, and score persistence.
  - [ ] `node scripts/validate-supporting-data.mjs` confirms at least 20 valid questions with referenced elements and stages.

  **QA Scenarios**:
  ```
  Scenario: Contextual quiz run
    Tool: Playwright
    Steps: Open oxygen detail; launch quiz; answer a full run.
    Expected: Score and explanations render, high-score logic persists, and return-home flow preserves selection behavior.
    Evidence: .sisyphus/evidence/task-12-quiz.png

  Scenario: Invalid answer-state guard
    Tool: Playwright
    Steps: Attempt to submit without choosing an answer on a selectable question.
    Expected: Submit is blocked or validation message appears; score does not advance incorrectly.
    Evidence: .sisyphus/evidence/task-12-quiz-error.png
  ```

  **Commit**: YES | Message: `feat(quiz): add scored multi-type quiz system` | Files: `src/modules/quiz.js`, `src/data/quizData.js`, quiz styles

- [ ] 13. Implement the virtual lab, five experiments, and safe-simulation result flow

  **What to do**: Build the lab page and five required experiments: hydrogen burning, rusting, sodium with water, salt formation, and oxygen supporting combustion. Present participants, phenomenon, safety reminder, life connection, principle explanation, animation demo, and a result card. Use safe educational abstraction; favor stylized visual explanation over actionable procedure.
  **Must NOT do**: Do not provide step-by-step dangerous real-world instructions. Do not block the whole page if one effect path is unavailable.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: educational safety constraints + animation orchestration.
  - Skills: [`threejs-animation`] - why needed: scene animation and lifecycle discipline.
  - Omitted: [`frontend-design`] - why not needed: layout comes from shell conventions.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 15-16 | Blocked By: 2, 4, 10

  **References**:
  - Pattern: `原始需求.txt:235-261` - lab requirements and safety note.
  - Target Directory: `src/lab/` - required directory exists but the implementation files must be created in this task.
  - Pattern: `src/three/scene.js` - shared renderer integration point.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/modes/lab-view.spec.ts` passes for experiment selection, animation start, result-card render, and completion persistence.
  - [ ] `node scripts/validate-supporting-data.mjs` confirms all 5 required experiments exist with linked elements and safety copy.

  **QA Scenarios**:
  ```
  Scenario: Complete one experiment
    Tool: Playwright
    Steps: Open lab page; run `hydrogen-burning`; wait for result card.
    Expected: Safety reminder, phenomenon summary, principle explanation, and completion state all render.
    Evidence: .sisyphus/evidence/task-13-lab.png

  Scenario: WebGL-only lab path
    Tool: Playwright
    Steps: Disable WebGPU path; open lab and start an experiment.
    Expected: Simplified animation still runs and no fatal renderer dependency appears.
    Evidence: .sisyphus/evidence/task-13-lab-error.png
  ```

  **Commit**: YES | Message: `feat(lab): add safe virtual experiments and completion flow` | Files: `src/lab/*`, `src/data/reactions.js`, lab routes/styles

- [ ] 14. Implement the game center, four mini-games, and score/lock hooks

  **What to do**: Build the game center and all four required games: drag-to-position, memory match, reaction match, and element collector. Use stage locks from the canonical progression model, persist latest/best scores, and route completion events into achievements/progress. Reuse canonical element/reaction data instead of inventing per-game copies.
  **Must NOT do**: Do not score games with incompatible opaque payloads. Do not unlock games outside the agreed stage rules.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: four distinct interactive modules with shared progression hooks.
  - Skills: [] - why needed: logic and data reuse dominate.
  - Omitted: [`threejs-animation`] - why not needed: game visuals can rely on DOM/Canvas/GSAP unless specifically needed.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 15-16 | Blocked By: 2, 5, 10

  **References**:
  - Pattern: `原始需求.txt:211-234` - full games requirements.
  - Pattern: `原始需求.txt:289-300` - achievement relationships to game completion.
  - Target Directory: `src/games/` - required directory exists but the implementation files must be created in this task.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/modes/games-view.spec.ts` passes for all four games’ minimum playable path and score persistence.
  - [ ] `node scripts/validate-supporting-data.mjs` confirms all game-linked reactions/elements referenced by the modes exist.

  **QA Scenarios**:
  ```
  Scenario: Minimum playable path across four games
    Tool: Playwright
    Steps: Launch each game once; complete the shortest valid success path.
    Expected: Each game reaches a success/completion state and records its score/completion event.
    Evidence: .sisyphus/evidence/task-14-games.png

  Scenario: Locked-game denial path
    Tool: Playwright
    Steps: Use a fresh profile below the required stage and click a locked game.
    Expected: Lock overlay appears, score state is untouched, and the route remains stable.
    Evidence: .sisyphus/evidence/task-14-games-error.png
  ```

  **Commit**: YES | Message: `feat(games): add four learning mini-games and score hooks` | Files: `src/games/*`, game center route/styles

- [ ] 15. Implement the learning path, achievement system, and progress dashboards

  **What to do**: Build the staged learning-path model, progress page, achievement center, unlock evaluator, and quick-stat derivations. Stage advancement must depend on explicit completion rules, not vague activity counts. Recommended defaults: Stage 1 progresses via learned-element thresholds; later stages require a mix of learned elements, one quiz completion, one experiment completion, and one relevant game completion. Surface locked/unlocked explanations in UI.
  **Must NOT do**: Do not unlock achievements from scattered UI events. Do not leave stage requirements implicit.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: progression semantics span nearly every module.
  - Skills: [] - why needed: contract rigor is more important than visual polish here.
  - Omitted: [`frontend-design`] - why not needed: this task is rule orchestration first.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 16 | Blocked By: 2, 3, 7, 9, 12, 13, 14

  **References**:
  - Pattern: `原始需求.txt:277-288` - learning-path requirements.
  - Pattern: `原始需求.txt:289-307` - achievements and persistence keys.
  - Pattern: `ui.png` - quick-stats module style reference.
  - Target File: `src/modules/achievements.js` - new file required by the spec and missing in the current repo.
  - Target File: `src/modules/progress.js` - new file required by the spec and missing in the current repo.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/modes/progress-achievements.spec.ts` passes for unlock, stage progression, quick stats, and achievement popup behavior.
  - [ ] `node scripts/validate-supporting-data.mjs` confirms all achievement IDs and stage references are resolvable.

  **QA Scenarios**:
  ```
  Scenario: Stage advancement via real events
    Tool: Playwright
    Steps: Learn enough elements, complete one quiz, one experiment, and one game according to the seeded test profile.
    Expected: The intended stage unlocks, progress page updates, and achievement center reflects new unlocks.
    Evidence: .sisyphus/evidence/task-15-progress.png

  Scenario: Duplicate-event dedupe
    Tool: Playwright
    Steps: Re-open the same learned element and replay the same completion path.
    Expected: Learned counts and achievements do not increment incorrectly more than once where dedupe is required.
    Evidence: .sisyphus/evidence/task-15-progress-error.png
  ```

  **Commit**: YES | Message: `feat(progress): add learning path achievements and dashboards` | Files: `src/modules/achievements.js`, `src/modules/progress.js`, `src/data/achievementsData.js`, `src/data/learningPath.js`

- [ ] 16. Deliver responsive coverage, bilingual content audit, and integration polish

  **What to do**: Complete the specified responsive behavior: mobile horizontal table scroll, bottom-sheet detail panel, and cardified game modules. Audit all user-facing copy for Chinese-first consistency with English assist only where intended. Ensure no missing modules from the required source tree remain unimplemented. Finalize GSAP transitions so shell/page/panel feedback feels coherent without overwhelming the learning experience.
  **Must NOT do**: Do not silently drop required mobile behaviors. Do not leave mixed-language placeholder strings or unused dead buttons.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: responsive adaptation, polish, and consistency.
  - Skills: [`frontend-design`] - why needed: dense sci-fi UI must survive breakpoint changes gracefully.
  - Omitted: [`threejs-animation`] - why not needed: major renderer logic is already done.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: 4, 10, 11, 12, 13, 14, 15

  **References**:
  - Pattern: `原始需求.txt:315-323` - responsive requirements.
  - Pattern: `原始需求.txt:324-335` - quality bar and no-placeholder rules.
  - Pattern: `ui.png` - desktop fidelity baseline to preserve while adapting.
  - Pattern: `src/styles/` - target responsive/style modules.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/responsive/support-matrix.spec.ts` passes across `1920x1080`, `1600x900`, `1366x768`, `390x844`, and `430x932`.
  - [ ] `npx playwright test tests/content/chinese-first-audit.spec.ts` passes with no forbidden placeholder strings and no dead major actions.

  **QA Scenarios**:
  ```
  Scenario: Mobile adaptation path
    Tool: Playwright
    Steps: Open `/` at 390x844; horizontally scroll the table; open an element.
    Expected: Table scroll works, detail becomes a bottom drawer, and core actions remain tappable.
    Evidence: .sisyphus/evidence/task-16-responsive.png

  Scenario: Dead-button audit
    Tool: Playwright
    Steps: Click every major nav/button path from home, detail, compare, timeline, quiz, lab, games, and progress views.
    Expected: No dead actions, no empty screens, and no mixed-language placeholder output.
    Evidence: .sisyphus/evidence/task-16-responsive-error.png
  ```

  **Commit**: YES | Message: `feat(polish): complete responsive support and integration audit` | Files: `src/styles/responsive.css`, remaining module/styles integration points

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

  **Execution Contract**:
  - F1 command: `task(subagent_type="oracle", prompt="Audit completed work against .sisyphus/plans/element-explorer-kids.md. Return PASS/FAIL with exact deviations.")`
  - F2 command: `task(category="unspecified-high", prompt="Review changed files for correctness, maintainability, dead code, style drift, and unsafe state coupling. Return PASS/FAIL with exact fixes.")`
  - F3 command: `npx playwright test` + targeted manual-flow replay of the home, detail, compare, timeline, quiz, lab, game, progress, and responsive suites.
  - F4 command: `task(category="deep", prompt="Check whether delivered behavior stayed within agreed scope and did not substitute different UX/business semantics. Return PASS/FAIL with exact scope violations.")`

  **QA Scenarios**:
  ```
  Scenario: All final gates pass
    Tool: Playwright + Bash + task
    Steps: Run `npm run build`, both validation scripts, the full Playwright suite, then F1/F2/F4 review agents.
    Expected: Every command returns PASS/exit code 0, and consolidated verification contains no unresolved failures.
    Evidence: .sisyphus/evidence/final-verification-pass.md

  Scenario: Final gate rejection handling
    Tool: Playwright + Bash + task
    Steps: Simulate a failed oracle or scope-fidelity review in the verification loop.
    Expected: Work is not marked complete; failures are surfaced, fixes are applied, and the full gate is re-run before requesting user approval.
    Evidence: .sisyphus/evidence/final-verification-fail.md
  ```

## Commit Strategy
- Commit once per numbered task; do not batch multiple numbered tasks into one commit.
- Use `feat` for new capability, `fix` only for corrections discovered during verification, `refactor` only when behavior does not change.
- Commit order must follow task order unless a blocked task is explicitly re-sequenced by dependency resolution.
- If verification reveals defects after a task commit, create a new fix commit rather than amending old history.

## Success Criteria
- The homepage visually and structurally matches the agreed reference shell while staying readable for middle-school/high-school learners.
- The entire app runs from one canonical content/state backbone with no contradictory learn/collect/progress semantics.
- The first vertical slice proves the exploration loop end-to-end before deeper modules are expanded.
- WebGPU absence never blocks core usage.
- All required modules are reachable, all major buttons respond, all specified data fields are populated, and all required verification commands pass.
