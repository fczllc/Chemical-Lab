# Curriculum Extensibility Infrastructure

## TL;DR
> **Summary**: Build the infrastructure needed for Element Explorer Kids to scale from fixed content into a curriculum-tagged learning system covering future middle-school and high-school chemistry textbook chapters. This plan creates schema, fixtures, validators, migration safety, and runtime consumers; it explicitly does not author the full textbook content set.
> **Deliverables**:
> - Canonical curriculum taxonomy schema and seed fixtures using grade + chapter + topic granularity.
> - Markdown textbook source conventions for one Markdown document per textbook volume.
> - Validators for curriculum tags, difficulty bands, prerequisites, game metadata, lab unlock rules, and negative fixtures.
> - Runtime integration for learning path, lab unlocks, quiz/game metadata, progress display, and localStorage compatibility.
> - Enhanced textbook-grade chemical notation rendering and image-asset extraction workflow.
> - Agent-executed data/build/UI verification.
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Tasks 4-8 → Final Verification Wave

## Context
### Original Request
User wants the current chemistry learning app to support later expansion of the four games, larger lab experiment quantity, and difficulty grading based on all middle-school and high-school chemistry textbook chapters.

### Interview Summary
- Textbook sources will be provided as Markdown, one Markdown document per textbook volume/book.
- Curriculum coverage target is all middle-school and high-school chemistry textbook chapters, but full content authoring is out of scope for this plan.
- Difficulty levels are fixed to four bands: `入门`, `初中`, `高中基础`, `高中进阶`.
- Games must not change rules by difficulty; challenge can vary through goals, scoring thresholds, achievements, unlocks, and metadata.
- Experiments unlock by existing `safetyLevel`, curriculum knowledge topic, and grade/chapter progress.
- Quizzes, experiments, games, and learning path bind to one unified `curriculumTags` taxonomy.
- Curriculum granularity is grade + chapter + topic, e.g. `九年级/酸碱盐/中和反应`, `高一/氧化还原/化合价变化`.
- Preserve current experiment `safetyLevel` compatibility instead of replacing the safety taxonomy.

### Metis Review (gaps addressed)
- Scope narrowed to infrastructure, fixtures, validators, and runtime consumers; full textbook authoring is explicitly excluded.
- Canonical tag IDs will be stable machine IDs, while Chinese path strings remain display/source labels.
- Textbook edition/publisher support defaults to one canonical user-provided source set, with metadata fields prepared for edition/publisher but no multi-edition UI.
- Markdown importer is documentation + fixture validation only in this plan; no full Markdown-to-curriculum importer is required.
- Existing localStorage progress must remain valid after schema upgrade.
- Current `validate:data` story-media mismatch is out of scope except that new validation scripts must be runnable independently and `validate:all` must document/avoid the existing blocker until separately fixed.
- Current chemical notation rendering supports simple/mid-complex formulas but must be enhanced for textbook molecular formulas, hydrates, states, charges, reaction arrows, conditions, and equation notation before generated curriculum questions rely on it.
- Textbook images may contain chemical formulas, experiment流程图, apparatus diagrams, tables, and observations. This plan will preserve and catalog image assets plus require manual/reviewable extraction metadata; it will not treat OCR/vision output as authoritative canonical chemistry content.

## Work Objectives
### Core Objective
Create a decision-complete curriculum extensibility layer so future textbook Markdown content can be mapped into validated curriculum tags and consumed consistently by quizzes, games, experiments, learning path, and progress.

### Deliverables
- `src/data/curriculum.js` or equivalent canonical curriculum taxonomy module exported through `src/data/index.js`.
- `src/data/textbookSources.js` or equivalent metadata/fixture module documenting one-md-per-volume source expectations.
- Raw user-provided textbook sources live under `src/data/textbooks/`, one directory per textbook volume. Directory names may be human-readable Chinese textbook names, e.g. `src/data/textbooks/2024版人教版九年级化学上册/book.md` plus `src/data/textbooks/2024版人教版九年级化学上册/images/`; stable machine `volumeId` must live in frontmatter or `textbookSources` metadata. Runtime modules must not import raw Markdown/images directly.
- Updated supporting datasets to reference `curriculumTags`, `difficulty`, and source metadata where applicable.
- New `scripts/validate-curriculum.mjs` with positive and negative fixture coverage.
- Updated `scripts/validate-supporting-data.mjs` for curriculum-aware cross-reference checks.
- New npm scripts for targeted curriculum validation and safe aggregate validation.
- Runtime integration across learning path/progress, lab unlocks, quiz metadata, and game challenge metadata.
- Enhanced chemical notation parser/rendering coverage for textbook molecular formulas and reactions.
- Textbook image manifest/extraction workflow so formulas/流程图 in images can be cataloged, reviewed, and referenced by generated questions/experiments.
- Playwright and command-based QA evidence under `.sisyphus/evidence/`.

### Definition of Done (verifiable conditions with commands)
- `npm run build` exits `0`.
- `npm run validate:curriculum` exits `0` and prints all of: `curriculumTags: valid`, `difficultyBands: valid`, `prerequisites: acyclic`, `experimentUnlocks: valid`, `gameChallengeRules: valid`.
- `npm run validate:supporting` exits `0` and validates curriculum tag references for quizzes, reactions/experiments, achievements, learning path, and games.
- `npm run validate:chem-notation` exits `0` and covers textbook molecular formulas including hydrates, states, charges, reversible arrows, reaction conditions, and ion equations.
- `npm run validate:textbook-assets` exits `0` and proves every Markdown image reference exists and every extracted image formula/diagram entry has review status metadata.
- `node scripts/audit-business-data-imports.mjs` exits `0`.
- `npx playwright test tests/ui/route-shells.spec.ts` exits `0`.
- Negative validator fixtures fail when invoked by the planned commands for unknown tag, invalid difficulty, prerequisite cycle, invalid experiment unlock reference, and illegal game rule change by difficulty.

### Must Have
- Stable canonical tag IDs, e.g. `g9-acid-base-salt-neutralization`; Chinese labels/paths are display/source metadata, not primary keys.
- Tags include grade, chapter, topic, difficulty band, aliases, source volume ID, source heading/path, and prerequisites.
- One Markdown document per textbook volume is documented and represented with source metadata fixtures.
- Textbook source location is fixed to `src/data/textbooks/{volumeDirectory}/book.md` with colocated images under `src/data/textbooks/{volumeDirectory}/images/`; `{volumeDirectory}` may be a Chinese human-readable folder name, while canonical runtime identity must use stable `volumeId` metadata. Canonical runtime data remains in JavaScript/JSON modules exported through `src/data/index.js`.
- Textbook images are preserved as source assets because they may contain experiment流程图、化学公式、装置图、表格、现象照片; this plan validates references and metadata but does not require runtime display of every textbook image.
- Textbook image content must be handled by a reviewable extraction workflow: OCR/vision tools may propose formulas/diagram summaries, but canonical formulas and question/experiment references must be stored as reviewed text/metadata before runtime use.
- Four fixed difficulty bands only: `入门`, `初中`, `高中基础`, `高中进阶`.
- Preserve game IDs: `drag`, `memory`, `reaction`, `collector`.
- Preserve existing experiment `safetyLevel` compatibility.
- Preserve existing localStorage state shape enough that existing users do not lose learned elements, completed experiments, game scores, or settings.
- All new canonical data must be imported through `src/data/index.js` or accepted repo pattern.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- MUST NOT author complete middle-school/high-school textbook content in this phase.
- MUST NOT generate chemistry facts from AI without source metadata and review path.
- MUST NOT auto-generate quizzes or experiments directly into canonical runtime data from textbook Markdown without validator checks and explicit human/source review workflow.
- MUST NOT discard textbook images or ignore broken Markdown image references; image assets must be preserved and validated as source material.
- MUST NOT rely on raw OCR/vision output from images as canonical chemical formulas, answers, or experiment steps without explicit reviewed metadata.
- MUST NOT add backend services, accounts, teacher dashboards, cloud sync, or adaptive AI tutoring.
- MUST NOT change game rules per difficulty; only goals, scoring thresholds, achievements, unlocks, and display metadata may vary.
- MUST NOT replace or break existing `safetyLevel` values.
- MUST NOT require human visual/manual checks for acceptance.
- MUST NOT add new source-data import paths that bypass the canonical data entry/audit pattern.
- MUST NOT fix unrelated story-media sharding unless required only to keep new validation scripts independently runnable.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + existing validator scripts and Playwright; no TDD mandate because this is a schema/runtime integration retrofit on an existing vanilla JS app.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 foundation schema/source conventions; Task 2 validators/fixtures; Task 3 validation scripts/package integration; Task 13 chemical notation requirements/tests.
Wave 2: Task 4 existing data migration/tagging; Task 5 learning path/progress integration; Task 6 lab unlock integration; Task 7 game challenge metadata integration; Task 14 textbook image asset manifest/extraction workflow.
Wave 3: Task 8 quiz/filter metadata integration; Task 9 localStorage migration compatibility; Task 10 UI route smoke/evidence expansion; Task 15 chemical notation runtime integration.
Wave 4: Task 11 documentation/example content guide; Task 12 aggregate verification and cleanup.

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2, 4, 5, 6, 7, 8, 11.
- Task 2 blocks Tasks 3, 4, 6, 7, 12.
- Task 3 blocks Task 12.
- Task 4 blocks Tasks 5, 6, 8, 12.
- Task 5 blocks Tasks 9, 10, 12.
- Task 6 blocks Tasks 10, 12.
- Task 7 blocks Tasks 10, 12.
- Task 8 blocks Tasks 10, 12.
- Task 9 blocks Task 12.
- Task 10 blocks Task 12.
- Task 11 blocks Task 12.
- Task 13 blocks Tasks 15 and 12.
- Task 14 blocks Tasks 11 and 12.
- Task 15 blocks Task 12.
- Task 12 blocks final verification only.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 4 tasks → deep, quick.
- Wave 2 → 5 tasks → deep, unspecified-high, quick.
- Wave 3 → 4 tasks → unspecified-high, visual-engineering, quick.
- Wave 4 → 2 tasks → writing, deep.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Define canonical curriculum taxonomy schema and seed fixtures

  **What to do**: Create the canonical curriculum data module under `src/data/` and export it through `src/data/index.js`. Use stable machine IDs as canonical keys, with Chinese grade/chapter/topic labels as display/source metadata. Include at least these concrete seed tags: `g9-acid-base-salt-neutralization` with display path `九年级/酸碱盐/中和反应`, `g10-redox-valence-change` with display path `高一/氧化还原/化合价变化`, and one `intro-element-symbols` tag for `入门`. Each tag must include `id`, `grade`, `schoolLevel`, `chapter`, `topic`, `displayPath`, `difficulty`, `aliases`, `sourceVolumeId`, `sourceHeading`, `prerequisites`, and `status`.
  **Must NOT do**: Do not author the full textbook curriculum. Do not use Chinese path strings as canonical IDs. Do not bypass `src/data/index.js` exports.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Foundational schema affects every downstream module and validator.
  - Skills: [] - No special implementation skill required beyond repository pattern following.
  - Omitted: [`frontend-design`] - No UI design work in this task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Tasks 2, 4, 5, 6, 7, 8, 11 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/data/index.js` - canonical data export entry used by runtime modules.
  - Pattern: `src/data/learningPath.json` - existing learning stages to migrate from count/unlock-only model.
  - Pattern: `src/data/contentMeta.js` - existing metadata constants including game keys/meta.
  - Guardrail: `scripts/audit-business-data-imports.mjs` - enforces canonical data imports.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node -e "import('./src/data/index.js').then(m=>{if(!m.curriculumTags) throw new Error('missing curriculumTags'); console.log('curriculumTags export ok')})"` exits `0` and prints `curriculumTags export ok`.
  - [ ] `node -e "import('./src/data/index.js').then(m=>{const ids=Object.keys(m.curriculumTags||{}); for (const id of ['g9-acid-base-salt-neutralization','g10-redox-valence-change','intro-element-symbols']) if(!ids.includes(id)) throw new Error('missing '+id); console.log('seed tags ok')})"` exits `0`.
  - [ ] `node scripts/audit-business-data-imports.mjs` exits `0`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Canonical tag export exists
    Tool: Bash
    Steps: Run `node -e "import('./src/data/index.js').then(m=>{if(!m.curriculumTags) throw new Error('missing curriculumTags'); console.log(Object.keys(m.curriculumTags).join(','))})"`.
    Expected: Command exits 0 and output includes `g9-acid-base-salt-neutralization` and `g10-redox-valence-change`.
    Evidence: .sisyphus/evidence/task-1-curriculum-tags.txt

  Scenario: No non-canonical import bypass added
    Tool: Bash
    Steps: Run `node scripts/audit-business-data-imports.mjs`.
    Expected: Command exits 0 with no business data import violations.
    Evidence: .sisyphus/evidence/task-1-import-audit.txt
  ```

  **Commit**: NO | Message: `feat(curriculum): add canonical curriculum taxonomy` | Files: `src/data/*`, `src/data/index.js`

- [x] 2. Add curriculum validator with positive and negative fixtures

  **What to do**: Add `scripts/validate-curriculum.mjs` and fixture data if needed. Validate canonical tag shape, exact four difficulty bands, unique IDs, valid grade/schoolLevel values, source volume references, aliases, acyclic prerequisites, and experiment/game metadata constraints once available. Include built-in negative fixture modes or fixture files that intentionally fail for: unknown curriculum tag, invalid difficulty, prerequisite cycle, invalid experiment unlock reference, and game metadata attempting to change rules by difficulty.
  **Must NOT do**: Do not silently coerce invalid values. Do not require network access. Do not depend on Playwright.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Validator correctness protects all future content expansion.
  - Skills: [] - Script work only.
  - Omitted: [`test-driven-development`] - Tests-after is chosen for this retrofit, but validator must include negative self-checks.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Tasks 3, 4, 6, 7, 12 | Blocked By: Task 1

  **References**:
  - Pattern: `scripts/validate-supporting-data.mjs` - existing cross-reference validator style.
  - Pattern: `scripts/validate-elements.mjs` - existing strict schema and enum validation style.
  - Pattern: `scripts/validate-story-media.mjs` - existing `--self-check-invalid` style for negative validation.
  - API/Type: `src/data/index.js` - source of canonical curriculum exports.

  **Acceptance Criteria**:
  - [ ] `node scripts/validate-curriculum.mjs` exits `0` and prints `curriculumTags: valid`, `difficultyBands: valid`, `prerequisites: acyclic`, `experimentUnlocks: valid`, `gameChallengeRules: valid`.
  - [ ] `node scripts/validate-curriculum.mjs --self-check-invalid unknown-tag` exits `0` only if it proves the invalid fixture is rejected.
  - [ ] `node scripts/validate-curriculum.mjs --self-check-invalid invalid-difficulty` exits `0` only if it proves the invalid fixture is rejected.
  - [ ] `node scripts/validate-curriculum.mjs --self-check-invalid prerequisite-cycle` exits `0` only if it proves the invalid fixture is rejected.
  - [ ] `node scripts/validate-curriculum.mjs --self-check-invalid invalid-experiment-unlock` exits `0` only if it proves the invalid fixture is rejected.
  - [ ] `node scripts/validate-curriculum.mjs --self-check-invalid game-rule-difficulty-change` exits `0` only if it proves the invalid fixture is rejected.

  **QA Scenarios**:
  ```
  Scenario: Valid curriculum passes
    Tool: Bash
    Steps: Run `node scripts/validate-curriculum.mjs`.
    Expected: Exit 0 and output contains all required valid summaries.
    Evidence: .sisyphus/evidence/task-2-validate-curriculum.txt

  Scenario: Invalid fixtures are rejected
    Tool: Bash
    Steps: Run all five `--self-check-invalid` commands listed in acceptance criteria.
    Expected: Each command exits 0 because the validator detected and rejected the intentionally invalid data.
    Evidence: .sisyphus/evidence/task-2-negative-fixtures.txt
  ```

  **Commit**: NO | Message: `test(curriculum): add curriculum validation fixtures` | Files: `scripts/validate-curriculum.mjs`, `scripts/fixtures/*`

- [x] 3. Wire npm validation scripts without depending on existing story-media blocker

  **What to do**: Add package scripts for `validate:curriculum`, `validate:all:safe`, and optionally `test:e2e`. `validate:all:safe` must run `validate:elements`, `validate:supporting`, `validate:spectral`, `validate:curriculum`, `audit-business-data-imports`, and `build`, but must not invoke the currently failing story-media shard validator unless that existing blocker has been separately fixed. Document in script naming or comments that current `validate:data` story-media mismatch remains separate.
  **Must NOT do**: Do not hide failures with `|| true`. Do not remove existing validation scripts. Do not fix unrelated story media sharding in this task unless unavoidable and separately noted.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Package script wiring is small and mechanical.
  - Skills: [] - No special skills required.
  - Omitted: [`git-master`] - No git operation requested inside task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Task 12 | Blocked By: Task 2

  **References**:
  - Pattern: `package.json` - existing npm scripts.
  - Guardrail: `scripts/validate-story-media.mjs` - known aggregate blocker due expected shard files.
  - Pattern: `playwright.config.ts` - Playwright direct command setup if adding `test:e2e`.

  **Acceptance Criteria**:
  - [ ] `npm run validate:curriculum` exits `0`.
  - [ ] `npm run validate:all:safe` exits `0`.
  - [ ] Existing `npm run validate:supporting` still exits `0`.
  - [ ] `npm run build` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Safe aggregate validation succeeds
    Tool: Bash
    Steps: Run `npm run validate:all:safe`.
    Expected: Exit 0; output includes curriculum validation and build success.
    Evidence: .sisyphus/evidence/task-3-validate-all-safe.txt

  Scenario: Existing support validation remains available
    Tool: Bash
    Steps: Run `npm run validate:supporting`.
    Expected: Exit 0 with existing supporting data summary.
    Evidence: .sisyphus/evidence/task-3-validate-supporting.txt
  ```

  **Commit**: NO | Message: `chore(validation): add safe curriculum validation scripts` | Files: `package.json`

- [x] 4. Migrate existing datasets to curriculum-aware metadata

  **What to do**: Add `curriculumTags` and `difficulty` metadata to existing quizzes, reactions/experiments, learning path stages, achievements where relevant, and game challenge metadata. Use only the seed tags from Task 1 for existing sample content. Keep existing IDs and fields intact. Update `validate-supporting-data.mjs` so it rejects unknown curriculum tags and invalid difficulty values across all supporting datasets.
  **Must NOT do**: Do not rewrite chemistry content. Do not remove current fields used by UI. Do not invent full textbook coverage.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Cross-dataset migration must preserve behavior and enforce references.
  - Skills: [] - Data/schema integration only.
  - Omitted: [`frontend-design`] - No visual work.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Tasks 5, 6, 8, 12 | Blocked By: Tasks 1, 2

  **References**:
  - Pattern: `src/data/quizData.js` - existing quiz data to tag.
  - Pattern: `src/data/reactions.js` - experiment/reaction data with `experimentId`, `safetyLevel`, `steps`, `safetyNotes`.
  - Pattern: `src/data/learningPath.json` - existing stages with `requiredCount`, `focusElements`, `unlockedGames`, `unlockedExperiments`.
  - Pattern: `src/data/achievementsData.js` / `src/data/achievementsData.json` - existing achievement condition shapes.
  - Validator: `scripts/validate-supporting-data.mjs` - must be upgraded for curriculum cross-reference validation.

  **Acceptance Criteria**:
  - [ ] `npm run validate:supporting` exits `0` and prints a curriculum reference validation summary.
  - [ ] `npm run validate:curriculum` exits `0` after migrated datasets are included in checks.
  - [ ] `node -e "import('./src/data/index.js').then(m=>{const bad=[]; for(const r of (m.reactions||[])) if(!Array.isArray(r.curriculumTags)||!r.curriculumTags.length) bad.push(r.id||r.experimentId); if(bad.length) throw new Error('untagged reactions '+bad.join(',')); console.log('reaction tags ok')})"` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Existing supporting data is curriculum-tagged
    Tool: Bash
    Steps: Run `npm run validate:supporting`.
    Expected: Exit 0 and output includes curriculum reference validation.
    Evidence: .sisyphus/evidence/task-4-supporting-curriculum.txt

  Scenario: Existing reactions keep safety and gain tags
    Tool: Bash
    Steps: Run the `node -e` reaction tag command from acceptance criteria.
    Expected: Exit 0 and output is `reaction tags ok`.
    Evidence: .sisyphus/evidence/task-4-reaction-tags.txt
  ```

  **Commit**: NO | Message: `feat(data): tag existing content with curriculum metadata` | Files: `src/data/*`, `scripts/validate-supporting-data.mjs`

- [x] 5. Upgrade learning path and progress to grade/chapter/topic progression

  **What to do**: Adapt learning path/progress consumers so curriculum progression can be computed from grade + chapter + topic tags while preserving current learned-element counts. Progress display should show curriculum-aware labels for the seed tags and retain existing stages as compatible data. Define mastery defaults in code/data: a topic is considered started if any associated element/quiz/experiment is touched; completed if all currently tagged required sample activities are completed, with fallback to existing `requiredCount` for legacy stages.
  **Must NOT do**: Do not remove existing progress route behavior. Do not require complete textbook content. Do not add accounts/backends.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Runtime behavior changes across progress and state require careful compatibility.
  - Skills: [] - Vanilla JS integration.
  - Omitted: [`frontend-design`] - Minimal UI adaptation only, not redesign.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 9, 10, 12 | Blocked By: Task 4

  **References**:
  - Pattern: `src/modules/progress.js` - existing progress rendering from learning path.
  - Pattern: `src/modules/storage.js` - state fields `learnedElements`, `completedExperiments`, `gameScores`, `settings`.
  - Pattern: `src/data/learningPath.json` - current count/unlock stage model.
  - Pattern: `src/main.js` - module initialization sequence.

  **Acceptance Criteria**:
  - [ ] `npm run build` exits `0`.
  - [ ] `npx playwright test tests/ui/route-shells.spec.ts --grep "progress"` exits `0` if grep matches existing test; otherwise run full `tests/ui/route-shells.spec.ts` and confirm `#/progress` route passes.
  - [ ] `node -e "import('./src/data/index.js').then(m=>{const stages=m.learningPath?.stages||m.learningPath||[]; if(!JSON.stringify(stages).includes('g9-acid-base-salt-neutralization')) throw new Error('missing curriculum stage tag'); console.log('progress tags ok')})"` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Progress route loads with curriculum-aware data
    Tool: Playwright
    Steps: Open `/#/progress` through the existing route-shell test or equivalent Playwright command.
    Expected: Page has no uncaught console errors and progress content renders with existing route shell intact.
    Evidence: .sisyphus/evidence/task-5-progress-route.png

  Scenario: Legacy progress data remains valid
    Tool: Bash
    Steps: Run `npm run build` after clearing browser-independent build state.
    Expected: Exit 0; no import/runtime compile errors from changed learning path shape.
    Evidence: .sisyphus/evidence/task-5-build.txt
  ```

  **Commit**: NO | Message: `feat(progress): support curriculum-tagged learning stages` | Files: `src/modules/progress.js`, `src/data/learningPath.json`, `src/modules/storage.js`

- [x] 6. Make lab experiment unlocks curriculum-aware while preserving safetyLevel

  **What to do**: Update lab data/logic so experiments can declare unlock requirements using `safetyLevel`, `curriculumTags`, and grade/chapter progress. Existing experiments must remain visible or locked according to current product behavior, but their metadata must be ready for future expansion. Add validator checks that every experiment unlock references existing curriculum tags and existing/valid safety levels.
  **Must NOT do**: Do not replace `safetyLevel`. Do not add hard-coded experiment-ID unlock branches. Do not add unsafe actionable lab instructions.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Lab safety, unlock semantics, data validation, and UI behavior intersect.
  - Skills: [] - Data/runtime integration.
  - Omitted: [`threejs-animation`] - No Three.js animation work unless existing lab uses it directly; this task is unlock metadata.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 10, 12 | Blocked By: Task 4

  **References**:
  - Pattern: `src/modules/lab.js` - lab list/detail behavior and any experiment-specific rendering.
  - Pattern: `src/data/reactions.js` - experiment source data with `experimentId` and `safetyLevel`.
  - Pattern: `src/modules/storage.js` - `completedExperiments` state.
  - Validator: `scripts/validate-curriculum.mjs` - `experimentUnlocks: valid` summary.

  **Acceptance Criteria**:
  - [ ] `npm run validate:curriculum` exits `0` and prints `experimentUnlocks: valid`.
  - [ ] `npm run build` exits `0`.
  - [ ] `npx playwright test tests/ui/route-shells.spec.ts --grep "lab"` exits `0` if grep matches existing test; otherwise run full `tests/ui/route-shells.spec.ts` and confirm `#/lab` route passes.

  **QA Scenarios**:
  ```
  Scenario: Lab route renders curriculum-tagged experiments
    Tool: Playwright
    Steps: Open `/#/lab`; inspect first experiment card/detail using existing selectors or visible text from current tests.
    Expected: Route loads without console errors and existing experiments remain accessible/appropriately locked.
    Evidence: .sisyphus/evidence/task-6-lab-route.png

  Scenario: Invalid experiment unlock is rejected
    Tool: Bash
    Steps: Run `node scripts/validate-curriculum.mjs --self-check-invalid invalid-experiment-unlock`.
    Expected: Exit 0 because validator proves bad unlock metadata is rejected.
    Evidence: .sisyphus/evidence/task-6-invalid-unlock.txt
  ```

  **Commit**: NO | Message: `feat(lab): add curriculum-aware experiment unlocks` | Files: `src/modules/lab.js`, `src/data/reactions.js`, `scripts/validate-curriculum.mjs`

- [x] 7. Add curriculum-linked game challenge metadata without difficulty rule changes

  **What to do**: Extend game metadata for the existing four games (`drag`, `memory`, `reaction`, `collector`) with `curriculumTags`, challenge goals, scoring thresholds, and unlock metadata. The validator must reject metadata that changes core rules by difficulty. Runtime should display or consume challenge metadata without altering the existing game rules based on difficulty.
  **Must NOT do**: Do not create new games. Do not change gameplay rules based on `入门/初中/高中基础/高中进阶`. Do not rename existing game IDs.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Must preserve game behavior while extending metadata and validation.
  - Skills: [] - Vanilla JS and data validation.
  - Omitted: [`frontend-design`] - Only minimal metadata rendering if existing UI supports it.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 10, 12 | Blocked By: Task 4

  **References**:
  - Pattern: `src/modules/games.js` - existing four game state keys and behavior.
  - Pattern: `src/data/contentMeta.js` - `GAME_KEYS` and `GAME_META` registration/display metadata.
  - Validator: `scripts/validate-supporting-data.mjs` - currently validates fixed game IDs.
  - Validator: `scripts/validate-curriculum.mjs` - must print `gameChallengeRules: valid`.

  **Acceptance Criteria**:
  - [ ] `npm run validate:curriculum` exits `0` and prints `gameChallengeRules: valid`.
  - [ ] `npm run validate:supporting` exits `0` and still recognizes exactly the four existing game IDs.
  - [ ] `npx playwright test tests/ui/games*.spec.ts` exits `0` if matching files exist; otherwise `npx playwright test tests/ui/route-shells.spec.ts` confirms `#/games` route.

  **QA Scenarios**:
  ```
  Scenario: Games route preserves four existing games
    Tool: Playwright
    Steps: Open `/#/games` and use existing games layout test or visible game-card checks.
    Expected: Four existing games render; no console errors; IDs remain `drag`, `memory`, `reaction`, `collector`.
    Evidence: .sisyphus/evidence/task-7-games-route.png

  Scenario: Difficulty rule mutation is rejected
    Tool: Bash
    Steps: Run `node scripts/validate-curriculum.mjs --self-check-invalid game-rule-difficulty-change`.
    Expected: Exit 0 because validator proves per-difficulty rule mutation is rejected.
    Evidence: .sisyphus/evidence/task-7-game-rule-negative.txt
  ```

  **Commit**: NO | Message: `feat(games): add curriculum challenge metadata` | Files: `src/data/contentMeta.js`, `src/modules/games.js`, `scripts/validate-curriculum.mjs`, `scripts/validate-supporting-data.mjs`

- [x] 8. Integrate curriculum metadata into quiz/search/filter surfaces

  **What to do**: Ensure quizzes and any relevant filter surfaces can read `curriculumTags` and `difficulty` from canonical data. Existing quiz behavior should continue, but quiz items must be validatable by difficulty band and curriculum tag. If current UI has filter modules, add non-breaking metadata hooks so future UI can filter by grade/chapter/topic.
  **Must NOT do**: Do not redesign quiz UI. Do not require every future topic to be visible in UI now. Do not alter game rules.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Metadata plumbing should be limited after schema/data migration.
  - Skills: [] - Straightforward data consumer update.
  - Omitted: [`frontend-design`] - No UX redesign requested.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Tasks 10, 12 | Blocked By: Task 4

  **References**:
  - Pattern: `src/modules/quiz.js` - existing quiz runtime.
  - Pattern: `src/modules/filters.js` - existing filter behavior.
  - Pattern: `src/data/quizData.js` - quiz items to tag/validate.

  **Acceptance Criteria**:
  - [ ] `npm run validate:supporting` exits `0` and validates quiz curriculum tags/difficulty.
  - [ ] `npm run build` exits `0`.
  - [ ] Existing route shell or quiz-related Playwright smoke test exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Quiz data validates with curriculum metadata
    Tool: Bash
    Steps: Run `npm run validate:supporting`.
    Expected: Exit 0 and no quiz item has unknown curriculum tags or invalid difficulty.
    Evidence: .sisyphus/evidence/task-8-quiz-validation.txt

  Scenario: Search/filter imports remain stable
    Tool: Bash
    Steps: Run `npm run build`.
    Expected: Exit 0 with no missing import or changed export errors.
    Evidence: .sisyphus/evidence/task-8-build.txt
  ```

  **Commit**: NO | Message: `feat(quiz): expose curriculum metadata for filtering` | Files: `src/modules/quiz.js`, `src/modules/filters.js`, `src/data/quizData.js`

- [x] 9. Preserve localStorage compatibility and add migration safety

  **What to do**: Add or update storage migration logic so existing localStorage state remains valid when curriculum fields are introduced. Existing keys `learnedElements`, `completedExperiments`, `gameScores`, and `settings.difficulty` must survive. If a schema version field exists, increment it safely; if none exists, add non-destructive defaulting. Add test/command coverage for loading old-state fixtures.
  **Must NOT do**: Do not clear user progress. Do not rename existing persisted keys without migration. Do not make migration dependent on browser manual actions.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Persistence mistakes can lose user progress.
  - Skills: [] - Storage and test fixture work.
  - Omitted: [`frontend-design`] - No UI design.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 12 | Blocked By: Task 5

  **References**:
  - Pattern: `src/modules/storage.js` - app state initialization and persistence.
  - Pattern: `src/main.js` - `window.appState` runtime inspection state.
  - Existing state fields from `AGENTS.md`: `learnedElements`, `completedExperiments`, `gameScores`, `settings`.

  **Acceptance Criteria**:
  - [ ] A Node or Playwright migration check loads a fixture containing old progress keys and confirms all keys survive after initialization.
  - [ ] `npm run build` exits `0`.
  - [ ] `npx playwright test tests/ui/route-shells.spec.ts` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Old localStorage state survives upgrade
    Tool: Playwright
    Steps: Before app load, seed localStorage with learned elements, completed experiments, game scores, and settings.difficulty. Open `/`. Inspect localStorage or `window.appState`.
    Expected: Seeded values still exist and new curriculum defaults are added without data loss.
    Evidence: .sisyphus/evidence/task-9-storage-migration.json

  Scenario: Empty localStorage initializes safely
    Tool: Playwright
    Steps: Clear localStorage, open `/`, inspect `window.appState`.
    Expected: App initializes with existing default state plus any new curriculum defaults; no console errors.
    Evidence: .sisyphus/evidence/task-9-empty-storage.json
  ```

  **Commit**: NO | Message: `fix(storage): preserve progress during curriculum migration` | Files: `src/modules/storage.js`, `tests/*`

- [x] 10. Add UI smoke coverage for curriculum-aware routes

  **What to do**: Add or extend Playwright coverage for `/#/games`, `/#/lab`, `/#/progress`, `/#/story`, and `/` after curriculum metadata integration. Tests must verify routes load without uncaught console errors and that existing visible shells still render. If selectors are absent, use stable visible text already present in existing tests; add test IDs only if repository patterns allow and without visual redesign.
  **Must NOT do**: Do not create brittle screenshot-only assertions. Do not require human visual inspection. Do not test full textbook coverage.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI route smoke and Playwright evidence across user-facing pages.
  - Skills: [`playwright`] - Browser automation is required for route QA.
  - Omitted: [`frontend-design`] - This is verification, not redesign.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 12 | Blocked By: Tasks 5, 6, 7, 8

  **References**:
  - Pattern: `playwright.config.ts` - existing Playwright config.
  - Pattern: `tests/ui/route-shells.spec.ts` - existing route shell checks.
  - Pattern: `tests/ui/*games*.spec.ts` if present - existing games UI coverage.
  - Runtime: `src/modules/router.js` - route keys.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/ui/route-shells.spec.ts` exits `0`.
  - [ ] Added/updated curriculum route smoke test exits `0`.
  - [ ] Test output or evidence records route coverage for `/`, `/#/games`, `/#/lab`, `/#/progress`, `/#/story`.

  **QA Scenarios**:
  ```
  Scenario: Curriculum-aware routes load
    Tool: Playwright
    Steps: Visit `/`, `/#/games`, `/#/lab`, `/#/progress`, and `/#/story`; collect console errors.
    Expected: Each route renders its shell and no uncaught console errors occur.
    Evidence: .sisyphus/evidence/task-10-route-smoke.json

  Scenario: Existing route-shell tests still pass
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/route-shells.spec.ts`.
    Expected: Exit 0.
    Evidence: .sisyphus/evidence/task-10-route-shells.txt
  ```

  **Commit**: NO | Message: `test(ui): cover curriculum-aware route smoke` | Files: `tests/ui/*`, optional `src/*` test IDs only if necessary

- [x] 11. Document textbook Markdown conventions and curriculum authoring guide

  **What to do**: Add project-local documentation or data fixture comments describing the one-directory-per-volume convention. The guide must specify that each textbook volume belongs in `src/data/textbooks/{volumeDirectory}/`, where `{volumeDirectory}` may be a Chinese human-readable textbook name, with the Markdown file at `book.md` and colocated images under `images/`, e.g. `src/data/textbooks/2024版人教版九年级化学上册/book.md` and `src/data/textbooks/2024版人教版九年级化学上册/images/neutralization-diagram.png`. The guide must specify required frontmatter/metadata: `volumeId`, `schoolLevel`, `grade`, `bookTitle`, `publisher`, `edition`, `chapters`, and heading conventions. It must explain how headings map to stable tag IDs and Chinese display paths, using examples for `九年级/酸碱盐/中和反应` and `高一/氧化还原/化合价变化`. It must require Markdown image links to be relative paths into `images/` or `./images/` and explain that images are source assets for later question/experiment drafting, not automatically trusted runtime content.
  **Must NOT do**: Do not place docs outside the repository's accepted documentation/data locations if none exist; prefer `src/data/` fixture/readme or `.sisyphus/plans` references if docs path is not established by repo. Do not require full textbook documents now.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: Clear source authoring conventions prevent future content ambiguity.
  - Skills: [] - Technical writing only.
  - Omitted: [`frontend-design`] - No UI.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: Task 12 | Blocked By: Task 1

  **References**:
  - Pattern: `src/data/` - canonical data/source boundary from `AGENTS.md`.
  - Source convention: user confirmed one Markdown document per textbook volume.
  - Schema: curriculum taxonomy from Task 1.

  **Acceptance Criteria**:
  - [ ] Documentation states each textbook volume goes under `src/data/textbooks/{volumeDirectory}/book.md` with images under `src/data/textbooks/{volumeDirectory}/images/`, allows Chinese folder names, requires stable `volumeId` metadata, and states runtime modules must not import raw Markdown/images directly.
  - [ ] Documentation requires Markdown image references to use relative `images/...` or `./images/...` paths and states broken image references must fail source validation.
  - [ ] Documentation/fixture includes exact examples `g9-acid-base-salt-neutralization` and `g10-redox-valence-change`.
  - [ ] Documentation states full textbook content authoring is out of scope for this implementation.
  - [ ] `npm run validate:curriculum` exits `0` after docs/fixtures are added.

  **QA Scenarios**:
  ```
  Scenario: Authoring guide examples match actual seed tags
    Tool: Bash
    Steps: Run a Node script or grep-equivalent command to confirm guide contains both seed IDs and then run `npm run validate:curriculum`.
    Expected: Both seed IDs are present and validator exits 0.
    Evidence: .sisyphus/evidence/task-11-guide-validation.txt

  Scenario: Scope boundary is documented
    Tool: Bash
    Steps: Search the guide for `不包含完整教材内容` or equivalent explicit out-of-scope statement.
    Expected: Statement exists.
    Evidence: .sisyphus/evidence/task-11-scope-boundary.txt
  ```

  **Commit**: NO | Message: `docs(curriculum): document textbook markdown conventions` | Files: `src/data/*`, optional `docs/*` only if repo already accepts docs

- [x] 12. Run aggregate verification and resolve integration gaps

  **What to do**: Run the full safe verification sequence after all implementation tasks. Fix any integration gaps introduced by schema, validator, runtime, or tests. Produce evidence files for each command and a short final summary of remaining out-of-scope blockers, especially the pre-existing `validate:data` story-media shard mismatch.
  **Must NOT do**: Do not mask failures. Do not expand scope to full textbook content. Do not declare complete until all listed commands pass.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Cross-cutting final integration and failure triage.
  - Skills: [] - Verification and small fixes only.
  - Omitted: [`git-master`] - Commit is handled after final approval, not within task unless explicitly requested.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification Wave | Blocked By: Tasks 3, 4, 5, 6, 7, 8, 9, 10, 11

  **References**:
  - Commands: `npm run validate:all:safe`, `npm run build`, `node scripts/audit-business-data-imports.mjs`, `npx playwright test tests/ui/route-shells.spec.ts`.
  - Known blocker: current `npm run validate:data` may fail because `validate-story-media.mjs` expects shard files while runtime imports a single media file.
  - Plan guardrails: full textbook authoring and unrelated story media sharding are out of scope.

  **Acceptance Criteria**:
  - [ ] `npm run validate:all:safe` exits `0`.
  - [ ] `npm run validate:curriculum` exits `0` and prints all required summaries.
  - [ ] `npm run validate:chem-notation` exits `0`.
  - [ ] `npm run validate:textbook-assets` exits `0`.
  - [ ] `npm run validate:supporting` exits `0`.
  - [ ] `node scripts/audit-business-data-imports.mjs` exits `0`.
  - [ ] `npm run build` exits `0`.
  - [ ] `npx playwright test tests/ui/route-shells.spec.ts` exits `0`.
  - [ ] Final note explicitly states whether pre-existing `validate:data` story-media mismatch remains out of scope.

  **QA Scenarios**:
  ```
  Scenario: Full safe command gate passes
    Tool: Bash
    Steps: Run `npm run validate:all:safe`.
    Expected: Exit 0 and output includes data validation, curriculum validation, import audit, and build success.
    Evidence: .sisyphus/evidence/task-12-validate-all-safe.txt

  Scenario: UI route gate passes after all integration
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/route-shells.spec.ts`.
    Expected: Exit 0 with all route shell tests passing.
    Evidence: .sisyphus/evidence/task-12-route-shells.txt
  ```

  **Commit**: YES | Message: `feat(curriculum): add extensible curriculum tagging infrastructure` | Files: `src/data/*`, `src/modules/*`, `scripts/*`, `tests/*`, `package.json`, documentation/fixture files

- [x] 13. Define and test textbook-grade chemical notation support

  **What to do**: Extend the chemical notation test matrix and validation command so the app can render textbook molecular formulas and common reactions before generated questions rely on them. Cover at minimum: `CuSO4·5H2O`, `Fe2(SO4)3`, `NH4+`, `SO4^2-`, `NaOH(aq) + HCl(aq) → NaCl(aq) + H2O(l)`, `CaCO3 → CaO + CO2↑`, `Ag+ + Cl- → AgCl↓`, reversible arrows, and reaction conditions above/below arrows where current renderer can support them. Decide implementation approach in code: extend existing `src/modules/chemNotation.js` if feasible; otherwise introduce a dedicated mhchem-compatible pathway while preserving current renderer API.
  **Must NOT do**: Do not break existing formula rendering call sites. Do not accept silent plain-text fallback for formulas marked as chemical notation. Do not introduce remote rendering services.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Parser/rendering changes affect quiz, lab, story, compare, and textbook-derived content.
  - Skills: [] - Chemistry notation rendering and tests; no special skill required.
  - Omitted: [`frontend-design`] - Rendering correctness, not visual redesign.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 15, 12 | Blocked By: none

  **References**:
  - Pattern: `src/modules/chemNotation.js` - existing KaTeX-backed chemical notation renderer.
  - Pattern: `tests/content/chem-notation.spec.ts` - existing notation coverage for basic formulas/equations.
  - Pattern: `src/modules/lab.js`, `src/modules/quiz.js`, `src/modules/storyMode.js`, `src/modules/compare.js`, `src/modules/renderTable.js` - existing consumers.
  - Dependency: `package.json` - currently includes `katex`; add dependencies only if needed and justified.

  **Acceptance Criteria**:
  - [ ] `npm run validate:chem-notation` exits `0`.
  - [ ] `npx playwright test tests/content/chem-notation.spec.ts` exits `0`.
  - [ ] Test output proves hydrate, state symbols, ions, precipitation/gas arrows, reversible arrows, and at least one reaction condition case render without plain-text fallback.

  **QA Scenarios**:
  ```
  Scenario: Textbook molecular formulas render
    Tool: Bash
    Steps: Run `npm run validate:chem-notation`.
    Expected: Exit 0 and output includes `hydrates: valid`, `states: valid`, `ions: valid`, `reactionSymbols: valid`.
    Evidence: .sisyphus/evidence/task-13-chem-notation.txt

  Scenario: Browser chemical notation tests pass
    Tool: Bash
    Steps: Run `npx playwright test tests/content/chem-notation.spec.ts`.
    Expected: Exit 0 with all notation tests passing.
    Evidence: .sisyphus/evidence/task-13-chem-notation-playwright.txt
  ```

  **Commit**: NO | Message: `feat(chem): support textbook chemical notation` | Files: `src/modules/chemNotation.js`, `tests/content/chem-notation.spec.ts`, `package.json`, `scripts/*`

- [x] 14. Add textbook image asset manifest and reviewable extraction workflow

  **What to do**: Define source asset handling for images under `src/data/textbooks/{volumeId}/images/`. Add a manifest format such as `src/data/textbookAssets.js` or per-volume metadata that records image path, source volume, nearby heading, asset type (`formula`, `experiment-flow`, `apparatus-diagram`, `table`, `photo`, `other`), extraction status (`unreviewed`, `machine-extracted`, `reviewed`, `rejected`), optional extracted formula text, optional diagram summary, and reviewer/source notes. Add validation to ensure Markdown image links resolve, manifest image paths exist, and any formula/diagram used by quiz/experiment data has `reviewed` status.
  **Must NOT do**: Do not rely on OCR/vision output as canonical. Do not delete images. Do not require implementing full OCR in this plan. Do not embed large image binaries into JS modules.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Source assets, validation, and future question generation safety intersect.
  - Skills: [] - Data/schema validation.
  - Omitted: [`multimodal-looker`] - This task defines workflow; it does not perform bulk image interpretation.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 11, 12 | Blocked By: Task 1

  **References**:
  - Source convention: `src/data/textbooks/{volumeId}/book.md` and `src/data/textbooks/{volumeId}/images/`.
  - Validator: `scripts/validate-curriculum.mjs` or new `scripts/validate-textbook-assets.mjs`.
  - Canonical export: `src/data/index.js` for reviewed asset metadata if runtime needs it.

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-assets` exits `0`.
  - [ ] Validator fails a negative fixture with a broken Markdown image path.
  - [ ] Validator fails a negative fixture where quiz/experiment data references an image formula/diagram whose extraction status is not `reviewed`.
  - [ ] No runtime module imports raw textbook Markdown or images directly.

  **QA Scenarios**:
  ```
  Scenario: Textbook image references validate
    Tool: Bash
    Steps: Run `npm run validate:textbook-assets`.
    Expected: Exit 0 and output includes `markdownImages: valid` and `assetReviewStatus: valid`.
    Evidence: .sisyphus/evidence/task-14-textbook-assets.txt

  Scenario: Unreviewed extracted image formula is rejected
    Tool: Bash
    Steps: Run `node scripts/validate-textbook-assets.mjs --self-check-invalid unreviewed-formula-reference`.
    Expected: Exit 0 because validator proves unreviewed image extraction cannot be used by quiz/experiment data.
    Evidence: .sisyphus/evidence/task-14-unreviewed-formula-negative.txt
  ```

  **Commit**: NO | Message: `feat(textbooks): validate image asset extraction workflow` | Files: `src/data/textbookAssets.js`, `scripts/validate-textbook-assets.mjs`, `package.json`, `src/data/textbooks/*`

- [x] 15. Integrate enhanced chemical notation into curriculum-derived question/experiment data paths

  **What to do**: Ensure quiz, lab, and any future curriculum-derived content path can mark fields as chemical notation and render them through the enhanced notation renderer. Add data conventions for `formulaText`, `equationText`, or equivalent fields so formulas extracted from Markdown/images are stored as reviewed text and rendered consistently. Existing consumers must keep working.
  **Must NOT do**: Do not parse formulas directly from images at runtime. Do not render raw OCR output without review metadata. Do not require full textbook content.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Cross-module runtime integration with safety constraints.
  - Skills: [] - Vanilla JS integration and validation.
  - Omitted: [`frontend-design`] - No redesign.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 12 | Blocked By: Tasks 13, 14

  **References**:
  - Renderer: `src/modules/chemNotation.js`.
  - Consumers: `src/modules/quiz.js`, `src/modules/lab.js`, `src/modules/storyMode.js`, `src/modules/compare.js`.
  - Asset workflow: Task 14 manifest/review status.
  - Tests: `tests/content/chem-notation.spec.ts`.

  **Acceptance Criteria**:
  - [ ] `npm run validate:chem-notation` exits `0`.
  - [ ] `npm run validate:textbook-assets` exits `0`.
  - [ ] `npm run validate:supporting` exits `0` and rejects unreviewed formula/image references.
  - [ ] `npm run build` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Reviewed formula text renders in quiz/lab path
    Tool: Playwright
    Steps: Open route containing a seeded formula/equation from reviewed metadata; inspect rendered output for KaTeX/chemical notation markup rather than raw plain text.
    Expected: Formula renders as notation; no console errors.
    Evidence: .sisyphus/evidence/task-15-reviewed-formula-render.png

  Scenario: Raw image extraction is not runtime content
    Tool: Bash
    Steps: Run `npm run validate:textbook-assets` and `npm run validate:supporting`.
    Expected: Both exit 0 only when referenced formula/diagram entries are reviewed; negative fixtures reject unreviewed entries.
    Evidence: .sisyphus/evidence/task-15-reviewed-assets.txt
  ```

  **Commit**: NO | Message: `feat(curriculum): render reviewed textbook formulas consistently` | Files: `src/modules/*`, `src/data/*`, `scripts/*`, `tests/*`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Prefer one commit after all tasks and final verification pass.
- Suggested message: `feat(curriculum): add extensible curriculum tagging infrastructure`
- Do not commit generated evidence files unless repository conventions explicitly include `.sisyphus/evidence`.

## Success Criteria
- Future textbook Markdown volumes can be mapped to stable curriculum tags without changing game/lab/progress architecture.
- Existing app routes and current content still build and load.
- Validators reject broken curriculum references before runtime.
- Games remain rule-stable across difficulty while supporting curriculum-linked challenges.
- Experiments unlock through safety level + topic + grade/chapter progress with existing safety compatibility preserved.
