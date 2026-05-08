# Textbook Ingestion Workflow

## TL;DR
> **Summary**: Build a repeatable, one-textbook-at-a-time ingestion workflow that turns `src/data/textbooks/2024版人教版九年级化学上册/book.md` into reviewed draft inventories, promotable runtime data, and verified coverage across quiz, progress, games, lab, story, and achievements without adding a database.
> **Deliverables**:
> - Per-volume batch contract and stable textbook ID: `rj-chemistry-grade9-2024-vol1`
> - Deterministic extraction/generation scripts for inventory, drafts, coverage, promotion, and validation
> - Runtime-boundary validators that prevent raw textbook/draft leakage
> - Coverage matrix proving every reviewed topic has required/optional/not-applicable surface status
> - First-textbook workflow pilot using `2024版人教版九年级化学上册`
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3-6 → Tasks 7-10 → Task 11 → Task 12

## Context
### Original Request
User wants a workflow where they select one textbook, then the system follows the architecture order to process and load the textbook into the app. Final content must be represented in games, lab, story, achievements, and related learning surfaces. First target textbook: `2024版人教版九年级化学上册`. Workflow must include reusable scripts, use developer code submission plus validation-script review, and keep experiments captured now even if experiment animation development is deferred.

### Interview Summary
- Database is not needed now; use static JS/JSON and validation scripts.
- Raw textbook Markdown/images are source corpus only.
- Runtime data must be reviewed curated content, exported through `src/data/index.js`.
- Completion standard is layered: current runtime surfaces receive supported content; unsupported/animation-heavy experiments enter draft/backlog with structured metadata.
- Workflow must be reusable for every textbook under `src/data/textbooks`.

### Metis Review (gaps addressed)
- Added explicit pilot definition: infrastructure-first plus first-volume workflow support, not full manual ingestion of all content in one task.
- Added review/promotion manifest so generated drafts cannot auto-promote.
- Added surface obligations via coverage matrix with `required`, `optional`, and `notApplicable` statuses.
- Added copyright guardrail: runtime content stores curated/paraphrased learning records plus provenance, not bulk textbook replication.
- Added regeneration/rollback rules and negative runtime-boundary gates.

## Work Objectives
### Core Objective
Create a repeatable content-ingestion workflow for `rj-chemistry-grade9-2024-vol1` that can later be run one textbook at a time for all directories under `src/data/textbooks`.

### Deliverables
- `src/data/textbookIngestion/` generated/draft data structure, excluded from runtime exports.
- `scripts/textbook/` CLI scripts for extract, draft generation, promotion, coverage, and validation.
- Package scripts for one-command workflow gates.
- Runtime promotion pathways for quiz, learning path, games, lab draft/eligible reactions, story, achievements, and curriculum.
- Coverage matrix artifact for `rj-chemistry-grade9-2024-vol1`.
- Tests and evidence proving draft isolation, promotion blocking, and runtime surface coverage.

### Definition of Done (verifiable conditions with commands)
- `npm run textbook:extract -- --textbook rj-chemistry-grade9-2024-vol1` exits `0` and writes deterministic draft inventory only.
- `npm run textbook:generate-drafts -- --textbook rj-chemistry-grade9-2024-vol1` exits `0` and writes draft records for knowledge, experiments, games, story, achievements, quiz candidates, and lab candidates.
- `npm run textbook:promote -- --textbook rj-chemistry-grade9-2024-vol1 --topic g9-carbon-allotropes-comparison` exits non-zero without reviewed promotion metadata and prints `Promotion blocked`.
- `npm run validate:textbook-runtime-boundary` exits `0` and reports no runtime imports from `src/data/textbooks/**` or draft ingestion data.
- `npm run validate:textbook-coverage -- --textbook rj-chemistry-grade9-2024-vol1 --status reviewed` exits `0` after reviewed pilot promotion.
- `npm run validate:all:safe` exits `0`.
- `npm run validate:chem-notation` exits `0`.
- `npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts` exits `0`.

### Must Have
- Stable textbook ID: `rj-chemistry-grade9-2024-vol1`.
- Source path: `src/data/textbooks/2024版人教版九年级化学上册/book.md`.
- Source assets path: `src/data/textbooks/2024版人教版九年级化学上册/`.
- Promote by `curriculumTagId` topic, never by full chapter.
- Experiments captured as structured draft/backlog metadata even when animation is deferred.
- Runtime-visible textbook-derived records require reviewed source references.
- Generated scripts must be deterministic and idempotent.

### Must NOT Have
- No database, CMS, backend API, or admin UI.
- No runtime module imports raw textbook Markdown/images directly.
- No auto-promoting generated content into runtime.
- No full textbook text replication in runtime records.
- No unreviewed experiment in `src/data/reactions.json`.
- No game engine rewrite or animation system build in this plan.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + existing npm validators + new validator scripts + Playwright smoke tests.
- QA policy: Every task has agent-executed happy-path and failure/edge scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 batch contract, Task 2 schemas/manifests
Wave 2: Task 3 extractor, Task 4 draft generators, Task 5 promotion manifest, Task 6 runtime-boundary validator
Wave 3: Task 7 coverage matrix, Task 8 runtime promotion adapters, Task 9 experiment backlog, Task 10 package scripts/tests
Wave 4: Task 11 pilot reviewed topic run, Task 12 documentation/evidence polish

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2-12.
- Task 2 blocks Tasks 3-10.
- Task 3 blocks Tasks 4, 7, 11.
- Task 4 blocks Tasks 5, 8, 9, 11.
- Task 5 blocks Tasks 8, 11.
- Task 6 blocks Tasks 10-12.
- Task 7 blocks Tasks 10-12.
- Task 8 blocks Task 11.
- Task 9 blocks Task 11.
- Task 10 blocks Tasks 11-12.
- Task 11 blocks Task 12.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → deep, unspecified-high
- Wave 2 → 4 tasks → deep, unspecified-high, quick
- Wave 3 → 4 tasks → unspecified-high, deep, quick
- Wave 4 → 2 tasks → unspecified-high, writing

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Define textbook batch contract and identity

  **What to do**: Add a stable per-volume contract for `rj-chemistry-grade9-2024-vol1`. Create a data location such as `src/data/textbookIngestion/batches/rj-chemistry-grade9-2024-vol1.json` containing `volumeId`, `displayName`, `sourcePath`, `assetRoot`, `schemaVersion`, `status`, `activeBatchId`, `generatedAt`, `sourceHash`, and allowed statuses (`sourceImported`, `drafted`, `partiallyReviewed`, `reviewed`, `promoted`). Ensure generated/draft files are not exported from `src/data/index.js`.
  **Must NOT do**: Do not import this batch contract into runtime modules. Do not modify runtime content records yet.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: establishes architecture contract used by every later task.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-12 | Blocked By: none

  **References**:
  - Runtime boundary: `src/data/index.js:1` - business modules must consume through one content boundary.
  - Runtime exports: `src/data/index.js:2-38` - current canonical runtime datasets.
  - Source corpus: `src/data/textbooks/2024版人教版九年级化学上册/` - first textbook target.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/validate-batch-contract.mjs --textbook rj-chemistry-grade9-2024-vol1` exits `0`.
  - [ ] `node scripts/textbook/validate-batch-contract.mjs --textbook missing-volume` exits non-zero and prints `Unknown textbook batch`.
  - [ ] `node scripts/audit-business-data-imports.mjs` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Valid batch contract loads
    Tool: Bash
    Steps: node scripts/textbook/validate-batch-contract.mjs --textbook rj-chemistry-grade9-2024-vol1
    Expected: exit 0; stdout includes rj-chemistry-grade9-2024-vol1 and sourcePath
    Evidence: .sisyphus/evidence/task-1-batch-contract.txt

  Scenario: Unknown batch fails
    Tool: Bash
    Steps: node scripts/textbook/validate-batch-contract.mjs --textbook bad-volume
    Expected: non-zero exit; stdout/stderr includes Unknown textbook batch
    Evidence: .sisyphus/evidence/task-1-batch-contract-error.txt
  ```

  **Commit**: YES | Message: `feat(textbook): add ingestion batch contract` | Files: `src/data/textbookIngestion/**`, `scripts/textbook/validate-batch-contract.mjs`

- [x] 2. Define draft inventory and promotion schemas

  **What to do**: Create schema-like JS modules or JSON schema validators for: source sections, curriculum topics, experiment candidates, lab candidates, game challenge candidates, story candidates, achievement candidates, quiz candidates, reviewed source references, and promotion manifest entries. Required statuses: `generated`, `needsReview`, `reviewed`, `promoted`, `deferred`, `notApplicable`. Required provenance fields: `sourceVolumeId`, `sourcePath`, `sourceHeading`, `sourceLineStart`, `sourceLineEnd`, `sourceHash`, `reviewStatus`, `reviewedBy`, `reviewedAt`.
  **Must NOT do**: Do not make draft schema looser than runtime schema for promoted fields. Do not allow missing provenance on reviewed/promoted content.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-data schema design and validators.
  - Skills: [] - No specialized skill required.
  - Omitted: [`test-driven-development`] - This is plan execution with tests-after validators, per user workflow.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3-12 | Blocked By: 1

  **References**:
  - Existing package validator pattern: `package.json:10-18` - current validators are npm-script driven.
  - Existing data locations: `src/data/` - current canonical JSON/JS data files.
  - Existing draft/support location: `src/data/textbookPilotContent.js` - prior pilot source/draft pattern.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/validate-draft-schema.mjs --textbook rj-chemistry-grade9-2024-vol1` exits `0` for valid empty/generated files.
  - [ ] A fixture missing `sourceLineStart` fails with `Missing required provenance field: sourceLineStart`.
  - [ ] A fixture with `reviewStatus: reviewed` and no `reviewedAt` fails.

  **QA Scenarios**:
  ```
  Scenario: Draft schema accepts valid generated inventory
    Tool: Bash
    Steps: node scripts/textbook/validate-draft-schema.mjs --textbook rj-chemistry-grade9-2024-vol1
    Expected: exit 0; stdout includes Draft schema valid
    Evidence: .sisyphus/evidence/task-2-draft-schema.txt

  Scenario: Reviewed item without reviewer metadata fails
    Tool: Bash
    Steps: node scripts/textbook/validate-draft-schema.mjs --fixture missing-reviewed-metadata
    Expected: non-zero exit; output includes reviewedAt
    Evidence: .sisyphus/evidence/task-2-draft-schema-error.txt
  ```

  **Commit**: YES | Message: `feat(textbook): define draft promotion schemas` | Files: `src/data/textbookIngestion/**`, `scripts/textbook/validate-draft-schema.mjs`

- [x] 3. Implement deterministic textbook extractor

  **What to do**: Add `scripts/textbook/extract-textbook.mjs` and package script `textbook:extract`. For `rj-chemistry-grade9-2024-vol1`, read `book.md`, split into stable source sections by headings and line ranges, compute hashes, enumerate referenced images/assets, and write generated source inventory under `src/data/textbookIngestion/generated/rj-chemistry-grade9-2024-vol1/source-inventory.json`. The script must not modify runtime data files.
  **Must NOT do**: Do not use OCR. Do not infer science facts beyond source section extraction. Do not write to `src/data/index.js`, `quizData.json`, `learningPath.json`, `reactions.json`, or runtime data files.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: parsing and deterministic artifact generation.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 4, 7, 11 | Blocked By: 1, 2

  **References**:
  - Source target: `src/data/textbooks/2024版人教版九年级化学上册/book.md` - first textbook.
  - Existing script style: `scripts/validate-textbook-assets.mjs` - file-based textbook asset validation pattern.
  - Package scripts: `package.json:6-18` - add new commands here.

  **Acceptance Criteria**:
  - [ ] `npm run textbook:extract -- --textbook rj-chemistry-grade9-2024-vol1` exits `0`.
  - [ ] Re-running the command produces byte-identical `source-inventory.json` except allowed generated timestamp field if present; prefer no timestamp in deterministic artifact.
  - [ ] `git diff -- src/data/quizData.json src/data/learningPath.json src/data/reactions.json src/data/index.js` shows no changes after extraction.

  **QA Scenarios**:
  ```
  Scenario: Extract source inventory
    Tool: Bash
    Steps: npm run textbook:extract -- --textbook rj-chemistry-grade9-2024-vol1
    Expected: exit 0; generated source-inventory.json exists; stdout includes Extracted sections
    Evidence: .sisyphus/evidence/task-3-extract.txt

  Scenario: Missing book fails safely
    Tool: Bash
    Steps: node scripts/textbook/extract-textbook.mjs --textbook fixture-missing-book
    Expected: non-zero exit; output includes Source book not found; no runtime files changed
    Evidence: .sisyphus/evidence/task-3-extract-error.txt
  ```

  **Commit**: YES | Message: `feat(textbook): extract textbook source inventory` | Files: `scripts/textbook/extract-textbook.mjs`, `package.json`, `src/data/textbookIngestion/generated/**`

- [x] 4. Implement draft content generators for all target surfaces

  **What to do**: Add `scripts/textbook/generate-drafts.mjs` and package script `textbook:generate-drafts`. Generate draft candidates from source inventory into separate files: `knowledge-topics.json`, `quiz-candidates.json`, `experiment-candidates.json`, `lab-candidates.json`, `game-candidates.json`, `story-candidates.json`, `achievement-candidates.json`, and `learning-path-candidates.json`. Every candidate must include provenance, `reviewStatus: needsReview`, and `runtimeEligible: false` by default. Experiment candidates must include `animationStatus: deferred`, `hazardLevel`, `safetyNotes`, `materials`, `observations`, and `deferredReason` when not runtime-safe.
  **Must NOT do**: Do not write runtime files. Do not mark generated content reviewed. Do not create animations.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: structured generator across many surfaces.
  - Skills: [] - No specialized skill required.
  - Omitted: [`threejs-animation`] - Animation implementation is deferred.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5, 8, 9, 11 | Blocked By: 1, 2, 3

  **References**:
  - Runtime datasets: `src/data/index.js:32-38` - quiz, learning path, curriculum, reactions, achievements, spectral/story exports.
  - Existing data directory: `src/data/` - canonical runtime target locations.
  - First textbook source: `src/data/textbooks/2024版人教版九年级化学上册/`.

  **Acceptance Criteria**:
  - [ ] `npm run textbook:generate-drafts -- --textbook rj-chemistry-grade9-2024-vol1` exits `0` after extraction.
  - [ ] Draft files exist for all target surfaces.
  - [ ] `node scripts/textbook/validate-draft-schema.mjs --textbook rj-chemistry-grade9-2024-vol1` exits `0`.
  - [ ] No generated draft has `reviewStatus: reviewed`.

  **QA Scenarios**:
  ```
  Scenario: Generate all surface drafts
    Tool: Bash
    Steps: npm run textbook:extract -- --textbook rj-chemistry-grade9-2024-vol1 && npm run textbook:generate-drafts -- --textbook rj-chemistry-grade9-2024-vol1
    Expected: exit 0; stdout lists quiz, experiment, lab, game, story, achievement, learning path drafts
    Evidence: .sisyphus/evidence/task-4-generate-drafts.txt

  Scenario: Drafts cannot be runtime eligible by default
    Tool: Bash
    Steps: node scripts/textbook/validate-draft-schema.mjs --textbook rj-chemistry-grade9-2024-vol1 --assert-no-generated-reviewed
    Expected: exit 0; stdout includes No generated drafts are reviewed
    Evidence: .sisyphus/evidence/task-4-generate-drafts-error.txt
  ```

  **Commit**: YES | Message: `feat(textbook): generate surface draft candidates` | Files: `scripts/textbook/generate-drafts.mjs`, `package.json`, `src/data/textbookIngestion/generated/**`

- [x] 5. Implement reviewed promotion manifest

  **What to do**: Add promotion manifest support, e.g. `src/data/textbookIngestion/reviewed/rj-chemistry-grade9-2024-vol1/promotion-manifest.json`. Manifest entries must map `topicId` / `curriculumTagId` to specific draft candidate IDs, surface requirements, reviewer metadata, and target runtime files. Add `scripts/textbook/validate-promotion-manifest.mjs`. Promotion cannot run unless a topic manifest entry is valid and `reviewStatus: reviewed`.
  **Must NOT do**: Do not let generator scripts create reviewed manifest entries. Do not permit wildcard chapter promotion.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this is the safety gate between generated and runtime content.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 11 | Blocked By: 2, 4

  **References**:
  - Existing runtime export boundary: `src/data/index.js:1`.
  - Prior pilot support file: `src/data/textbookPilotContent.js` - existing reviewed/draft evidence pattern.
  - Package validators: `package.json:10-18`.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/validate-promotion-manifest.mjs --textbook rj-chemistry-grade9-2024-vol1` exits `0` for valid reviewed pilot manifest.
  - [ ] Manifest entry missing `reviewedBy` fails.
  - [ ] Manifest entry with `promoteScope: chapter` fails with `Promotion must target curriculumTagId`.

  **QA Scenarios**:
  ```
  Scenario: Valid reviewed topic manifest passes
    Tool: Bash
    Steps: node scripts/textbook/validate-promotion-manifest.mjs --textbook rj-chemistry-grade9-2024-vol1
    Expected: exit 0; stdout includes Promotion manifest valid
    Evidence: .sisyphus/evidence/task-5-promotion-manifest.txt

  Scenario: Chapter-wide promotion is rejected
    Tool: Bash
    Steps: node scripts/textbook/validate-promotion-manifest.mjs --fixture chapter-wide-promotion
    Expected: non-zero exit; output includes Promotion must target curriculumTagId
    Evidence: .sisyphus/evidence/task-5-promotion-manifest-error.txt
  ```

  **Commit**: YES | Message: `feat(textbook): add reviewed promotion manifest` | Files: `src/data/textbookIngestion/reviewed/**`, `scripts/textbook/validate-promotion-manifest.mjs`

- [x] 6. Add runtime boundary and draft leakage validators

  **What to do**: Add `scripts/textbook/validate-runtime-boundary.mjs` and package script `validate:textbook-runtime-boundary`. It must scan runtime modules and canonical data exports to ensure no imports/read paths from `src/data/textbooks/**` or `src/data/textbookIngestion/generated/**`. It must also assert draft experiment IDs do not appear in `src/data/reactions.json` unless explicitly promoted via reviewed manifest.
  **Must NOT do**: Do not replace `scripts/audit-business-data-imports.mjs`; extend with a textbook-specific gate.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: focused validator script.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10-12 | Blocked By: 1, 2

  **References**:
  - Runtime boundary comment: `src/data/index.js:1`.
  - Canonical runtime data imports: `src/data/index.js:2-13`.
  - Existing import audit command: `package.json:15-16`.

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-runtime-boundary` exits `0`.
  - [ ] Fixture import from `src/data/textbooks/**` fails.
  - [ ] Fixture draft experiment in runtime reactions without reviewed manifest fails.

  **QA Scenarios**:
  ```
  Scenario: Runtime boundary is clean
    Tool: Bash
    Steps: npm run validate:textbook-runtime-boundary
    Expected: exit 0; stdout includes Textbook runtime boundary valid
    Evidence: .sisyphus/evidence/task-6-runtime-boundary.txt

  Scenario: Raw textbook import is blocked
    Tool: Bash
    Steps: node scripts/textbook/validate-runtime-boundary.mjs --fixture raw-textbook-import
    Expected: non-zero exit; output includes Raw textbook import forbidden
    Evidence: .sisyphus/evidence/task-6-runtime-boundary-error.txt
  ```

  **Commit**: YES | Message: `test(textbook): guard runtime data boundary` | Files: `scripts/textbook/validate-runtime-boundary.mjs`, `package.json`

- [x] 7. Generate and validate per-topic coverage matrix

  **What to do**: Add `scripts/textbook/generate-coverage.mjs`, `scripts/textbook/validate-coverage.mjs`, and package scripts `textbook:coverage` and `validate:textbook-coverage`. Coverage matrix rows are `curriculumTagId`; columns: `sourceEvidence`, `assets`, `quiz`, `learningPath`, `labOrReaction`, `experimentBacklog`, `story`, `achievement`, `gameChallenge`, `runtimeStatus`, `reviewStatus`, and `notes`. Status values: `required`, `optional`, `notApplicable`, `covered`, `deferred`, `missing`. For reviewed topics, validation fails if any required column is `missing`.
  **Must NOT do**: Do not require every generated draft topic to be runtime promoted. Only reviewed topics have strict surface coverage.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: central completeness validator.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10-12 | Blocked By: 3, 5

  **References**:
  - Runtime exported datasets: `src/data/index.js:32-38`.
  - Curriculum validation command: `package.json:13`.
  - Supporting validation command: `package.json:11`.

  **Acceptance Criteria**:
  - [ ] `npm run textbook:coverage -- --textbook rj-chemistry-grade9-2024-vol1` exits `0` and writes coverage artifact.
  - [ ] `npm run validate:textbook-coverage -- --textbook rj-chemistry-grade9-2024-vol1 --status reviewed` exits `0` for complete reviewed pilot topics.
  - [ ] Fixture reviewed topic missing achievement/progress discoverability fails.

  **QA Scenarios**:
  ```
  Scenario: Coverage matrix generated
    Tool: Bash
    Steps: npm run textbook:coverage -- --textbook rj-chemistry-grade9-2024-vol1
    Expected: exit 0; coverage JSON contains columns sourceEvidence, quiz, labOrReaction, story, achievement, gameChallenge
    Evidence: .sisyphus/evidence/task-7-coverage.txt

  Scenario: Missing required surface fails reviewed validation
    Tool: Bash
    Steps: node scripts/textbook/validate-coverage.mjs --fixture reviewed-missing-surface
    Expected: non-zero exit; output includes Missing required surface coverage
    Evidence: .sisyphus/evidence/task-7-coverage-error.txt
  ```

  **Commit**: YES | Message: `feat(textbook): add coverage matrix validation` | Files: `scripts/textbook/generate-coverage.mjs`, `scripts/textbook/validate-coverage.mjs`, `package.json`, `src/data/textbookIngestion/generated/**`

- [x] 8. Implement runtime promotion adapters for current app surfaces

  **What to do**: Add `scripts/textbook/promote-topic.mjs` and package script `textbook:promote`. Given a reviewed `curriculumTagId`, update only approved runtime destinations: `src/data/curriculum.js`, `src/data/quizData.json`, `src/data/learningPath.json`, `src/data/contentMeta.js`, `src/data/achievementsData.json`, story data location used by current story system, and `src/data/reactions.json` only for lab-safe reviewed items. Promotion must produce stable IDs, preserve JSON formatting, and include reviewed source references. If story/achievement schema lacks source-reference fields, extend schema and validators minimally rather than embedding raw textbook text.
  **Must NOT do**: Do not promote unreviewed generated candidates. Do not place unsafe/deferred experiments in `reactions.json`. Do not rewrite current game/lab/story engines.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: multi-file runtime adapter with safety constraints.
  - Skills: [] - No specialized skill required.
  - Omitted: [`threejs-animation`] - Experiment animations are deferred.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 11-12 | Blocked By: 4, 5, 7

  **References**:
  - Quiz runtime export: `src/data/index.js:32`.
  - Learning path runtime export: `src/data/index.js:33`.
  - Curriculum runtime export: `src/data/index.js:34`.
  - Reactions runtime export: `src/data/index.js:36`.
  - Achievements runtime export: `src/data/index.js:37`.

  **Acceptance Criteria**:
  - [ ] `npm run textbook:promote -- --textbook rj-chemistry-grade9-2024-vol1 --topic g9-carbon-allotropes-comparison` exits non-zero if topic is not reviewed.
  - [ ] With reviewed pilot manifest, promotion updates only manifest-approved runtime files.
  - [ ] Promoted records include `sourceVolumeId: rj-chemistry-grade9-2024-vol1` and reviewed source references.
  - [ ] Deferred experiment candidates remain outside `src/data/reactions.json`.

  **QA Scenarios**:
  ```
  Scenario: Reviewed pilot topic promotes to approved surfaces
    Tool: Bash
    Steps: npm run textbook:promote -- --textbook rj-chemistry-grade9-2024-vol1 --topic g9-carbon-allotropes-comparison
    Expected: exit 0; stdout lists updated runtime files; coverage matrix marks reviewed topic covered/deferred/notApplicable per surface
    Evidence: .sisyphus/evidence/task-8-promote-topic.txt

  Scenario: Unreviewed topic promotion is blocked
    Tool: Bash
    Steps: npm run textbook:promote -- --textbook rj-chemistry-grade9-2024-vol1 --topic unreviewed-generated-topic
    Expected: non-zero exit; output includes Promotion blocked
    Evidence: .sisyphus/evidence/task-8-promote-topic-error.txt
  ```

  **Commit**: YES | Message: `feat(textbook): promote reviewed topics to runtime` | Files: `scripts/textbook/promote-topic.mjs`, `src/data/*.json`, `src/data/*.js`, `package.json`

- [x] 9. Capture experiments as deferred animation backlog

  **What to do**: Add explicit experiment backlog output for textbook experiments, e.g. `src/data/textbookIngestion/generated/rj-chemistry-grade9-2024-vol1/experiment-backlog.json`. Every textbook experiment candidate must include source references, safety classification, materials, observed phenomena, learning goal, current runtime eligibility, `animationStatus`, and recommended future implementation type (`labSimulation`, `threeAnimation`, `gsapAnimation`, `staticGuide`, `notSuitable`). Ensure validators prove backlog exists even when no experiment is promoted to runtime lab.
  **Must NOT do**: Do not implement experiment animations now. Do not add hazardous or deferred experiments to runtime `reactions.json`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: safety-sensitive education metadata.
  - Skills: [] - No specialized skill required.
  - Omitted: [`threejs-animation`] - Capturing backlog only, not animation.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11-12 | Blocked By: 4, 7

  **References**:
  - Reactions runtime export: `src/data/index.js:36`.
  - Existing reactions file: `src/data/reactions.json` - only safe promoted lab items belong here.
  - Source textbook: `src/data/textbooks/2024版人教版九年级化学上册/book.md`.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/validate-experiment-backlog.mjs --textbook rj-chemistry-grade9-2024-vol1` exits `0`.
  - [ ] Every experiment candidate has `animationStatus` and `safetyNotes`.
  - [ ] `node scripts/textbook/validate-runtime-boundary.mjs --assert-no-deferred-experiments-in-reactions` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Experiment backlog validates
    Tool: Bash
    Steps: node scripts/textbook/validate-experiment-backlog.mjs --textbook rj-chemistry-grade9-2024-vol1
    Expected: exit 0; stdout includes Experiment backlog valid
    Evidence: .sisyphus/evidence/task-9-experiment-backlog.txt

  Scenario: Deferred experiment cannot appear in reactions
    Tool: Bash
    Steps: node scripts/textbook/validate-experiment-backlog.mjs --fixture deferred-in-reactions
    Expected: non-zero exit; output includes Deferred experiment cannot be runtime reaction
    Evidence: .sisyphus/evidence/task-9-experiment-backlog-error.txt
  ```

  **Commit**: YES | Message: `feat(textbook): capture experiment animation backlog` | Files: `src/data/textbookIngestion/generated/**`, `scripts/textbook/validate-experiment-backlog.mjs`

- [x] 10. Wire npm scripts and automated tests for the workflow

  **What to do**: Update `package.json` with commands: `textbook:extract`, `textbook:generate-drafts`, `textbook:coverage`, `textbook:promote`, `validate:textbook-batch`, `validate:textbook-drafts`, `validate:textbook-runtime-boundary`, `validate:textbook-coverage`, `validate:textbook-experiments`, and `validate:textbook-workflow`. Add tests/fixtures for failure paths. Ensure `validate:all:safe` either includes stable textbook validators or document `validate:textbook-workflow` as the pre-promotion gate if generated drafts are intentionally warning-tolerant.
  **Must NOT do**: Do not replace existing validators. Do not make `validate:all:safe` depend on generated draft warnings that should not block runtime builds.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: script wiring and targeted tests.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 11-12 | Blocked By: 3, 6, 7, 9

  **References**:
  - Existing scripts section: `package.json:6-18`.
  - Existing safe validation chain: `package.json:15`.
  - Existing Playwright dependency: `package.json:20-23`.

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-workflow -- --textbook rj-chemistry-grade9-2024-vol1` exits `0` after extraction/draft generation.
  - [ ] `npm run validate:all:safe` exits `0`.
  - [ ] `npm run validate:chem-notation` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Full textbook workflow validation passes
    Tool: Bash
    Steps: npm run validate:textbook-workflow -- --textbook rj-chemistry-grade9-2024-vol1
    Expected: exit 0; stdout lists batch, draft, boundary, coverage, experiment gates
    Evidence: .sisyphus/evidence/task-10-workflow-validation.txt

  Scenario: Existing safe validation remains green
    Tool: Bash
    Steps: npm run validate:all:safe && npm run validate:chem-notation
    Expected: both commands exit 0
    Evidence: .sisyphus/evidence/task-10-safe-validation.txt
  ```

  **Commit**: YES | Message: `test(textbook): wire workflow validation scripts` | Files: `package.json`, `scripts/textbook/**`, `tests/**`

- [x] 11. Run first-textbook pilot with one reviewed topic and all surfaces

  **What to do**: Use `rj-chemistry-grade9-2024-vol1` to run extract → draft generation → reviewed promotion manifest for the known prior-slice pilot topic `g9-carbon-allotropes-comparison`. Promote or verify it across all applicable current surfaces: curriculum, quiz, learning path/progress, game challenge metadata, story, achievement, and lab/reaction only if safe; otherwise experiment backlog with `deferred`. Generate coverage and evidence.
  **Must NOT do**: Do not claim the whole textbook is runtime-complete. Do not promote unsafe experiments to lab. Do not skip achievement/story if current schemas can support minimal reviewed references.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: end-to-end pilot across generated and runtime data.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - Existing route smoke tests only; no redesign.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 12 | Blocked By: 1-10

  **References**:
  - First textbook source: `src/data/textbooks/2024版人教版九年级化学上册/book.md`.
  - Runtime boundary: `src/data/index.js:1-38`.
  - Existing validation commands: `package.json:10-18`.

  **Acceptance Criteria**:
  - [ ] `npm run textbook:extract -- --textbook rj-chemistry-grade9-2024-vol1` exits `0`.
  - [ ] `npm run textbook:generate-drafts -- --textbook rj-chemistry-grade9-2024-vol1` exits `0`.
  - [ ] `npm run textbook:promote -- --textbook rj-chemistry-grade9-2024-vol1 --topic g9-carbon-allotropes-comparison` exits `0` only after valid reviewed manifest.
  - [ ] `npm run validate:textbook-coverage -- --textbook rj-chemistry-grade9-2024-vol1 --status reviewed` exits `0`.
  - [ ] `npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: End-to-end reviewed pilot topic works
    Tool: Bash
    Steps: npm run textbook:extract -- --textbook rj-chemistry-grade9-2024-vol1 && npm run textbook:generate-drafts -- --textbook rj-chemistry-grade9-2024-vol1 && npm run textbook:promote -- --textbook rj-chemistry-grade9-2024-vol1 --topic g9-carbon-allotropes-comparison && npm run validate:textbook-coverage -- --textbook rj-chemistry-grade9-2024-vol1 --status reviewed
    Expected: all commands exit 0; coverage marks topic covered/deferred/notApplicable with no missing required surfaces
    Evidence: .sisyphus/evidence/task-11-pilot-topic.txt

  Scenario: Playwright smoke confirms app shell survives promoted content
    Tool: Bash
    Steps: npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts
    Expected: exit 0; all tests pass
    Evidence: .sisyphus/evidence/task-11-playwright-smoke.txt
  ```

  **Commit**: YES | Message: `feat(textbook): pilot first volume ingestion workflow` | Files: `src/data/**`, `scripts/textbook/**`, `tests/**`, `.sisyphus/evidence/**`

- [x] 12. Document repeatable operator workflow and regeneration rules

  **What to do**: Add workflow documentation in `.sisyphus/drafts` or repo-appropriate planning docs only if requested by user during execution; otherwise keep implementation notes in evidence. The runnable instructions must specify: choose one textbook, validate batch, extract, generate drafts, review/promotion manifest, promote reviewed topics, generate coverage, run validators, run Playwright smoke, and commit. Include regeneration rule: generator output can be regenerated; reviewed manifest/runtime edits are source of truth and must not be overwritten without explicit command. Include rollback: revert promotion commit or run a planned demotion script only if implemented.
  **Must NOT do**: Do not create user-facing docs outside allowed execution scope unless Sisyphus confirms repository convention. Do not delete generated review evidence.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: precise operational instructions and evidence summary.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: final verification | Blocked By: 1-11

  **References**:
  - Package scripts: `package.json:6-18`.
  - Evidence pattern: `.sisyphus/evidence/`.
  - Active plan: `.sisyphus/plans/textbook-ingestion-workflow.md`.

  **Acceptance Criteria**:
  - [ ] Workflow evidence includes command transcript for full extraction/draft/coverage/promotion validation.
  - [ ] Regeneration rules explicitly state reviewed manifest/runtime data must not be overwritten by generators.
  - [ ] `git status --short` shows only intentional workflow files and runtime pilot changes.

  **QA Scenarios**:
  ```
  Scenario: Operator workflow evidence is complete
    Tool: Bash
    Steps: Test-Path -LiteralPath ".sisyphus/evidence/task-12-workflow-summary.txt"
    Expected: command returns True; summary lists all workflow commands in order
    Evidence: .sisyphus/evidence/task-12-workflow-summary.txt

  Scenario: Regeneration guard documented
    Tool: Bash
    Steps: node scripts/textbook/validate-regeneration-guard.mjs --textbook rj-chemistry-grade9-2024-vol1
    Expected: exit 0; stdout includes Reviewed manifest protected from generator overwrite
    Evidence: .sisyphus/evidence/task-12-regeneration-guard.txt
  ```

  **Commit**: YES | Message: `docs(textbook): document ingestion workflow` | Files: `.sisyphus/evidence/**`, optional docs if approved

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit per wave or per coherent task group; do not commit unless user explicitly requests implementation session to commit.
- Suggested sequence:
  1. `feat(textbook): add ingestion contracts and schemas`
  2. `feat(textbook): generate textbook drafts and coverage`
  3. `test(textbook): add workflow validation gates`
  4. `feat(textbook): pilot first volume promotion workflow`
- Never commit secrets, generated temp files, or unrelated changes.

## Success Criteria
- The user can select `rj-chemistry-grade9-2024-vol1` and run a deterministic extraction/draft/coverage workflow.
- Reviewed topic promotion is blocked without a valid promotion manifest.
- Promoted textbook content appears in all applicable current surfaces: quiz, learning path/progress, games, story, achievements, and lab/reactions only when safe.
- Experiment content is captured now as backlog/draft metadata even when animation is deferred.
- Raw textbook files remain source-only and never become direct runtime imports.
- Existing validation/build/smoke commands remain green.
