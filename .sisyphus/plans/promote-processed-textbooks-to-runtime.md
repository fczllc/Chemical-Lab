# Promote Processed Textbooks to Runtime

## TL;DR
> **Summary**: Implement a safe reviewed-manifest promotion workflow so all currently processed textbook content can enter runtime data without importing generated drafts directly. The work hardens inventory, validation, adapter coverage, deterministic promotion, and runtime QA.
> **Deliverables**:
> - Inventory report for all processed textbook volumes and promotable artifacts
> - Reviewed-manifest scaffolding/population workflow with strict validation
> - Batch promotion command with dry-run/diff and deterministic output
> - Runtime adapters for supported targets: quiz, content metadata, achievements, learning path, and reactions
> - Runtime-boundary, referential-integrity, build, and app-surface QA evidence
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 6 → Task 8 → Final Verification Wave

## Context

### Original Request
The user asked how to make all already-processed textbook content enter runtime state, then confirmed: “好，生成这个计划”.

### Interview Summary
- Generated draft content is not runtime content by design.
- Runtime promotion must be mediated by reviewed manifests and adapters.
- The plan must support all currently discovered processed textbook volumes:
  - `rj-chemistry-g12-selective-3-organic-2019`
  - `rj-chemistry-grade8-54-2024-full`
  - `rj-chemistry-grade9-2024-vol1`
  - `rj-chemistry-grade9-2024-vol2`
- Default applied: if additional complete processed volumes are discovered during Task 1 inventory, include them only if they have matching generated, reviewed, and batch metadata directories/files; otherwise list them as not-ready in the inventory report.

### Metis Review (gaps addressed)
- Added explicit definition of “all processed”: currently discovered complete volumes plus any complete volume discovered by inventory.
- Added guardrail that empty reviewed manifests are scaffolds only and not evidence of reviewed content.
- Added runtime boundary guardrail: no app code imports generated/reviewed ingestion folders.
- Added dry-run/diff, deterministic ordering, duplicate detection, rollback-safe git diff, and source traceability requirements.
- Added edge-case coverage for duplicate IDs, unsupported schemas, partial promotion, learning path cycles, orphan references, non-ASCII IDs/search, and bundle-size impact.

## Work Objectives

### Core Objective
Make reviewed textbook-generated content available through existing runtime data files while preserving runtime safety, traceability, deterministic output, and rollbackability.

### Deliverables
- Inventory and coverage tooling for generated/reviewed/promotable artifacts.
- Reviewed manifest workflow for batch review/promotion.
- Batch promotion command with dry-run, diff, deterministic write behavior, and failure-safe validation.
- Promotion adapters for all supported runtime destinations.
- Runtime validation checks for boundaries, duplicates, references, and build safety.
- Agent-executed QA evidence proving promoted content appears in runtime/app surfaces.

### Definition of Done (verifiable conditions with commands)
- `npm run validate:textbook-runtime-boundary` passes and proves runtime app code does not import ingestion draft/review folders.
- `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed` passes for all non-empty reviewed manifests.
- `npm run textbook:promote -- --all-reviewed --dry-run` reports planned runtime changes without writing runtime files.
- `npm run textbook:promote -- --all-reviewed` updates only approved runtime target files and promotion metadata/report files.
- A repeated `npm run textbook:promote -- --all-reviewed` produces no runtime diff when inputs are unchanged.
- `npm run validate:textbook-workflow -- --all-reviewed` passes.
- `npm run validate:all:safe` passes.
- `npm run build` passes.
- Agent QA evidence exists under `.sisyphus/evidence/` for each task and final verification.

### Must Have
- Reviewed manifests as the sole promotion input.
- Source traceability on every promoted item: textbook volume, chapter/topic, generated artifact, reviewed manifest entry, and source section/page when available.
- Deterministic IDs and ordering.
- Duplicate detection across all runtime targets.
- Referential integrity across quizzes, metadata, learning paths, achievements, reactions, and existing element/content IDs.
- Dry-run output before mutation.
- Partial-failure protection: no target file may be left half-updated if validation fails.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do NOT import from `src/data/textbookIngestion/generated/` or `src/data/textbookIngestion/reviewed/` in runtime app modules.
- Do NOT treat empty reviewed manifests as promoted content.
- Do NOT bypass schema validation to “get all content in”.
- Do NOT redesign the full ingestion pipeline.
- Do NOT create unrelated learning features or UI redesigns.
- Do NOT manually rewrite textbook content outside reviewed manifest edits.
- Do NOT silently overwrite hand-authored runtime data; preserve and merge with explicit namespaced IDs.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + existing Node/Vite validation commands; add focused Node validation scripts if no test framework exists.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Tasks 1-3 — inventory, schema contract audit, runtime target map.
Wave 2: Tasks 4-5 — reviewed manifest workflow and adapter coverage.
Wave 3: Tasks 6-7 — batch promotion command and validation suite.
Wave 4: Task 8 — end-to-end promotion and runtime visibility QA.

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2, 4, 6, 8.
- Task 2 blocks Tasks 4, 5, 7.
- Task 3 blocks Tasks 5, 7, 8.
- Task 4 blocks Tasks 6, 8.
- Task 5 blocks Tasks 6, 7, 8.
- Task 6 blocks Tasks 7, 8.
- Task 7 blocks Task 8.
- Task 8 blocks Final Verification Wave.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → `deep`, `unspecified-high`, `quick`.
- Wave 2 → 2 tasks → `deep`, `unspecified-high`.
- Wave 3 → 2 tasks → `unspecified-high`, `deep`.
- Wave 4 → 1 task → `unspecified-high`.
- Final Wave → 4 review tasks → `oracle`, `unspecified-high`, `unspecified-high`, `deep`.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Build processed-volume inventory and readiness report

  **What to do**: Create or extend tooling that inventories `src/data/textbookIngestion/generated/`, `src/data/textbookIngestion/reviewed/`, and `src/data/textbookIngestion/batches/`. The report must classify each textbook as `generated-only`, `review-scaffold-only`, `reviewed-non-empty`, `promotable`, or `not-ready`, and list artifact counts by content type. Include the four known volume IDs and include any additional complete processed volume discovered during inventory.
  **Must NOT do**: Do not mark a volume promotable because an empty reviewed manifest exists. Do not mutate runtime data in this task.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Requires understanding ingestion directories, metadata, and readiness semantics.
  - Skills: [] - No specialized skill required beyond repo inspection and validation.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 2, 4, 6, 8 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `scripts/textbook/generate-coverage.mjs` - Existing reporting/coverage style.
  - Pattern: `src/data/textbookIngestion/generated/` - Generated draft artifacts to inventory.
  - Pattern: `src/data/textbookIngestion/reviewed/` - Reviewed promotion area to classify.
  - Pattern: `src/data/textbookIngestion/batches/` - Batch metadata to correlate with generated/reviewed artifacts.
  - API/Type: `src/data/textbookIngestion/schemas/draftSchemas.js` - Schema contracts for generated/reviewed artifact interpretation.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Running the inventory command emits a machine-readable JSON report and a readable console summary.
  - [ ] The report includes the four known textbook IDs and their readiness states.
  - [ ] Empty reviewed manifests are classified as `review-scaffold-only`, not `promotable`.
  - [ ] Missing generated/reviewed/batch counterparts are reported as actionable readiness errors.
  - [ ] Evidence file `.sisyphus/evidence/task-1-inventory.json` contains a sample report.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Inventory all known processed volumes
    Tool: Bash
    Steps: Run the inventory command from repo root and redirect JSON output to `.sisyphus/evidence/task-1-inventory.json`.
    Expected: Output includes `rj-chemistry-g12-selective-3-organic-2019`, `rj-chemistry-grade8-54-2024-full`, `rj-chemistry-grade9-2024-vol1`, and `rj-chemistry-grade9-2024-vol2` with explicit readiness states.
    Evidence: .sisyphus/evidence/task-1-inventory.json

  Scenario: Empty reviewed manifest is not promotable
    Tool: Bash
    Steps: Run the inventory command against a textbook whose reviewed manifest is empty, or use a fixture if needed.
    Expected: The item is classified as `review-scaffold-only`; command does not print `promotable` for that volume.
    Evidence: .sisyphus/evidence/task-1-empty-reviewed-not-promotable.txt
  ```

  **Commit**: YES | Message: `feat(textbook): add processed content inventory report` | Files: [`scripts/textbook/*`, `src/data/textbookIngestion/*` if fixtures are required]

- [x] 2. Harden reviewed-manifest validation and review semantics

  **What to do**: Extend reviewed-manifest validation so non-empty entries require source traceability, stable IDs, destination runtime target, content type, and adapter compatibility. Add clear error messages for unsupported schema variants, duplicate IDs, missing source references, and empty scaffold misuse. Preserve the existing valid-empty-scaffold behavior.
  **Must NOT do**: Do not reject empty manifests globally; they are valid scaffolds. Do not permit non-empty entries without traceability.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Validation logic and schema rules require careful edge-case handling.
  - Skills: [] - Existing repository patterns are sufficient.
  - Omitted: [`test-driven-development`] - No current test framework; implement script-level fixtures/commands instead.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 4, 5, 7 | Blocked By: Task 1 for final readiness vocabulary only

  **References**:
  - Pattern: `scripts/textbook/validate-promotion-manifest.mjs` - Existing validation entry point.
  - API/Type: `src/data/textbookIngestion/schemas/draftSchemas.js` - Schema contracts to enforce.
  - Pattern: `src/data/textbookIngestion/reviewed/` - Reviewed manifest files to validate.
  - Test: Existing validation commands in `package.json` - Follow npm script naming and invocation style.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed` succeeds for valid empty scaffolds and valid non-empty manifests.
  - [ ] Invalid non-empty manifest entries fail with exact file path, entry ID, and reason.
  - [ ] Validation rejects duplicate runtime IDs across reviewed manifests.
  - [ ] Validation rejects entries whose destination adapter is unsupported.
  - [ ] Evidence includes successful and failing command output.

  **QA Scenarios**:
  ```
  Scenario: Valid reviewed manifests pass
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed`.
    Expected: Exit code 0; output summarizes checked manifests and distinguishes empty scaffolds from non-empty reviewed manifests.
    Evidence: .sisyphus/evidence/task-2-validate-reviewed-pass.txt

  Scenario: Malformed reviewed entry fails actionably
    Tool: Bash
    Steps: Use a temporary fixture or command-supported fixture mode with a duplicate/missing-source reviewed entry, then run the validator.
    Expected: Non-zero exit; output contains the fixture path, entry ID, and a concrete reason such as `missing sourceTrace` or `duplicate runtimeId`.
    Evidence: .sisyphus/evidence/task-2-validate-reviewed-fail.txt
  ```

  **Commit**: YES | Message: `fix(textbook): enforce reviewed promotion manifest semantics` | Files: [`scripts/textbook/validate-promotion-manifest.mjs`, `src/data/textbookIngestion/schemas/draftSchemas.js`, fixture files if needed]

- [x] 3. Map runtime targets and preservation rules

  **What to do**: Document and encode how reviewed content maps into `src/data/quizData.json`, `src/data/contentMeta.js`, `src/data/achievementsData.json`, `src/data/learningPath.json`, and `src/data/reactions.json`. Define merge rules that preserve hand-authored data, namespace textbook-derived IDs, and keep deterministic ordering. If a generated artifact type has no safe runtime destination, classify it as not promotable and report it.
  **Must NOT do**: Do not overwrite existing runtime records with textbook-derived records unless IDs are explicitly namespaced and merge behavior is validated.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Mostly mapping/documentation plus small validation helpers.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - No UI design.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 5, 7, 8 | Blocked By: none

  **References**:
  - Pattern: `src/data/quizData.json` - Runtime quiz target shape.
  - Pattern: `src/data/contentMeta.js` - Runtime content metadata target.
  - Pattern: `src/data/achievementsData.json` - Runtime achievements target.
  - Pattern: `src/data/learningPath.json` - Runtime learning path target.
  - Pattern: `src/data/reactions.json` - Runtime reactions target.
  - Pattern: `src/modules/` - Existing runtime modules consuming these data files.

  **Acceptance Criteria**:
  - [ ] A runtime target map exists in code or documented metadata used by promotion tooling.
  - [ ] The map lists supported content types, runtime destination files, ID namespace rules, and unsupported cases.
  - [ ] Existing runtime data is preserved in a dry-run merge preview.
  - [ ] Unsupported generated content types produce warnings and do not write runtime data.
  - [ ] Evidence shows the target map and sample merge classification.

  **QA Scenarios**:
  ```
  Scenario: Runtime target map covers known destinations
    Tool: Bash
    Steps: Run the target-map inspection command or print the promotion config.
    Expected: Output lists quiz, content metadata, achievements, learning path, and reactions destinations with namespace rules.
    Evidence: .sisyphus/evidence/task-3-runtime-target-map.txt

  Scenario: Unsupported type is skipped safely
    Tool: Bash
    Steps: Run target classification against a fixture/generated artifact with an unsupported content type.
    Expected: Output marks it `not-promotable: unsupported target`; no runtime file changes occur.
    Evidence: .sisyphus/evidence/task-3-unsupported-type.txt
  ```

  **Commit**: YES | Message: `chore(textbook): define runtime promotion target map` | Files: [`scripts/textbook/*`, `src/data/textbookIngestion/*` if config is stored there]

- [x] 4. Generate/populate reviewed promotion manifests for processed content

  **What to do**: Add a command or workflow that converts inventoried generated draft artifacts into reviewed manifest candidates, then promotes only entries that satisfy review semantics. For this plan, agents may populate reviewed manifests for content that can be mechanically traced and validated from generated artifacts; ambiguous or unsupported entries must remain unpromoted with reasons in the report.
  **Must NOT do**: Do not blindly promote every generated artifact. Do not fabricate source traceability if unavailable; mark those entries blocked.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Requires source traceability and content-type triage across multiple volumes.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Tasks 6, 8 | Blocked By: Tasks 1, 2

  **References**:
  - Pattern: `src/data/textbookIngestion/generated/` - Candidate draft source.
  - Pattern: `src/data/textbookIngestion/reviewed/` - Destination for reviewed manifests.
  - Pattern: `src/data/textbookIngestion/batches/` - Batch metadata/source hash context.
  - API/Type: `src/data/textbookIngestion/schemas/draftSchemas.js` - Required reviewed-entry shape.
  - Validation: `scripts/textbook/validate-promotion-manifest.mjs` - Must pass after manifest population.

  **Acceptance Criteria**:
  - [ ] Candidate-generation command exists and writes reviewed manifest candidates only when requested.
  - [ ] Each non-empty reviewed entry includes source traceability and destination target.
  - [ ] Ambiguous/unsupported artifacts are reported as blocked, not silently discarded.
  - [ ] `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed` passes after population.
  - [ ] Evidence includes a per-volume reviewed/promotable/blocked summary.

  **QA Scenarios**:
  ```
  Scenario: Generate reviewed candidates from processed volumes
    Tool: Bash
    Steps: Run the reviewed-candidate command with `--all-processed --dry-run`, then with write mode if dry-run is clean.
    Expected: Dry-run lists candidate counts per volume; write mode creates/updates reviewed manifests without touching runtime targets.
    Evidence: .sisyphus/evidence/task-4-reviewed-candidates.txt

  Scenario: Ambiguous artifact remains blocked
    Tool: Bash
    Steps: Run candidate generation on an artifact missing traceable source metadata or unsupported destination.
    Expected: Artifact appears in blocked report with reason; validator still passes for written manifests.
    Evidence: .sisyphus/evidence/task-4-blocked-artifacts.json
  ```

  **Commit**: YES | Message: `feat(textbook): prepare reviewed manifests for processed content` | Files: [`scripts/textbook/*`, `src/data/textbookIngestion/reviewed/*`, `src/data/textbookIngestion/*` reports/config if used]

- [x] 5. Extend promotion adapters for all supported runtime destinations

  **What to do**: Update `scripts/textbook/promote-topic.mjs` or its helper modules so reviewed entries can be merged into all supported runtime targets: quizzes, content metadata, achievements, learning path, and reactions. Adapters must preserve existing data, use namespaced textbook IDs, produce deterministic sorting, and report unsupported content types.
  **Must NOT do**: Do not add adapters that guess missing fields. Do not create runtime records with broken references.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Multi-target data transformation with merge safety.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - No frontend styling.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Tasks 6, 7, 8 | Blocked By: Tasks 2, 3

  **References**:
  - Pattern: `scripts/textbook/promote-topic.mjs` - Existing promotion implementation.
  - Runtime: `src/data/quizData.json` - Quiz adapter target.
  - Runtime: `src/data/contentMeta.js` - Content metadata adapter target.
  - Runtime: `src/data/achievementsData.json` - Achievement adapter target.
  - Runtime: `src/data/learningPath.json` - Learning path adapter target.
  - Runtime: `src/data/reactions.json` - Reaction adapter target.
  - Consumers: `src/modules/quiz.js`, `src/modules/achievements.js`, `src/modules/progress.js`, `src/modules/storyMode.js` - Runtime usage patterns/stubs to avoid breaking.

  **Acceptance Criteria**:
  - [ ] Each supported destination has an explicit adapter or adapter branch.
  - [ ] Adapters preserve existing hand-authored records.
  - [ ] Adapters namespace textbook-derived IDs using a stable prefix that includes textbook ID and source topic/entry ID.
  - [ ] Adapter output is deterministic across repeated runs.
  - [ ] Unsupported entries are reported and skipped without runtime mutations.

  **QA Scenarios**:
  ```
  Scenario: Dry-run adapter coverage
    Tool: Bash
    Steps: Run `npm run textbook:promote -- --all-reviewed --dry-run`.
    Expected: Output lists planned writes for quiz, metadata, achievements, learning path, and reactions when reviewed entries exist; unsupported entries are skipped with reasons.
    Evidence: .sisyphus/evidence/task-5-adapter-dry-run.txt

  Scenario: Existing runtime data preserved
    Tool: Bash
    Steps: Capture git diff or checksum before and after dry-run; inspect dry-run merge report for existing record counts.
    Expected: Dry-run creates no file diff; merge report states existing records preserved and textbook records added separately.
    Evidence: .sisyphus/evidence/task-5-preserve-existing.txt
  ```

  **Commit**: YES | Message: `feat(textbook): support runtime promotion adapters` | Files: [`scripts/textbook/promote-topic.mjs`, helper modules if extracted, runtime fixture files if required]

- [x] 6. Add batch promotion command with dry-run, diff, determinism, and rollback safety

  **What to do**: Extend promotion command support for `--all-reviewed`, `--textbook <id>`, `--dry-run`, and machine-readable reporting. Implement write staging so validation occurs before final file writes, and failures leave runtime files unchanged. Include a deterministic no-op behavior where repeated promotion with unchanged inputs produces no diff.
  **Must NOT do**: Do not partially write runtime files before all target outputs validate. Do not require interactive prompts.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: CLI behavior, file safety, deterministic writes, and error handling.
  - Skills: [] - No specialized skill required.
  - Omitted: [`playwright`] - Browser automation not needed for CLI task.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Tasks 7, 8 | Blocked By: Tasks 1, 4, 5

  **References**:
  - Pattern: `package.json` - Existing npm script style.
  - Pattern: `scripts/textbook/promote-topic.mjs` - Promotion CLI entry point.
  - Pattern: `scripts/textbook/validate-promotion-manifest.mjs` - Pre-promotion validation.
  - Pattern: `scripts/textbook/generate-coverage.mjs` - Reporting style to reuse.
  - Runtime targets: `src/data/quizData.json`, `src/data/contentMeta.js`, `src/data/achievementsData.json`, `src/data/learningPath.json`, `src/data/reactions.json`.

  **Acceptance Criteria**:
  - [ ] `npm run textbook:promote -- --all-reviewed --dry-run` exits 0 and writes no runtime files.
  - [ ] `npm run textbook:promote -- --all-reviewed` validates inputs, stages all outputs, then writes only if all outputs are valid.
  - [ ] On fixture failure, command exits non-zero and runtime targets remain byte-for-byte unchanged.
  - [ ] Re-running promotion after a successful run produces no diff.
  - [ ] Promotion report includes promoted/skipped/blocked counts per textbook and destination.

  **QA Scenarios**:
  ```
  Scenario: All-reviewed dry-run is non-mutating
    Tool: Bash
    Steps: Run `git diff -- src/data`, then `npm run textbook:promote -- --all-reviewed --dry-run`, then `git diff -- src/data`.
    Expected: Dry-run reports planned changes; second diff shows no runtime file changes caused by dry-run.
    Evidence: .sisyphus/evidence/task-6-dry-run-non-mutating.txt

  Scenario: Failed promotion leaves files unchanged
    Tool: Bash
    Steps: Run promotion against an invalid fixture or temporary invalid reviewed manifest path supported by the command.
    Expected: Exit non-zero; runtime target checksums before/after are identical.
    Evidence: .sisyphus/evidence/task-6-failure-rollback.txt
  ```

  **Commit**: YES | Message: `feat(textbook): add batch promotion dry-run workflow` | Files: [`package.json`, `scripts/textbook/promote-topic.mjs`, helper modules if extracted]

- [x] 7. Add runtime integrity and boundary validation suite

  **What to do**: Add or extend validation commands that verify no runtime imports from ingestion folders, duplicate IDs across promoted/runtime records, referential integrity, learning path acyclicity, quiz answer correctness, reaction/achievement references, non-ASCII ID/search normalization, and bundle-size/report warnings.
  **Must NOT do**: Do not rely only on `npm run build`; semantic data integrity must be checked before build.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Cross-file semantic validation across runtime data.
  - Skills: [] - No specialized skill required.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Task 8 | Blocked By: Tasks 2, 3, 5, 6

  **References**:
  - Validation command: `npm run validate:textbook-runtime-boundary` - Boundary check target from repo context.
  - Validation command: `npm run validate:textbook-workflow -- --all-reviewed` - End-to-end workflow validation target.
  - Validation command: `npm run validate:all:safe` - Safe aggregate validation target.
  - Runtime targets: `src/data/quizData.json`, `src/data/contentMeta.js`, `src/data/achievementsData.json`, `src/data/learningPath.json`, `src/data/reactions.json`.
  - Runtime modules: `src/modules/search.js`, `src/modules/quiz.js`, `src/modules/achievements.js`, `src/modules/progress.js`, `src/modules/storyMode.js`.

  **Acceptance Criteria**:
  - [ ] Boundary validation fails if runtime source imports from generated/reviewed ingestion folders.
  - [ ] Duplicate runtime IDs fail validation with file paths and IDs.
  - [ ] Broken references fail validation with source and destination details.
  - [ ] Learning path cycles/orphans fail validation.
  - [ ] Quiz correct answer mismatch fails validation.
  - [ ] `npm run validate:all:safe` includes or invokes the new checks.

  **QA Scenarios**:
  ```
  Scenario: Runtime integrity validation passes on promoted data
    Tool: Bash
    Steps: Run `npm run validate:textbook-runtime-boundary`, `npm run validate:textbook-workflow -- --all-reviewed`, and `npm run validate:all:safe`.
    Expected: All commands exit 0 and summarize boundary, duplicate, reference, path, quiz, reaction, and achievement checks.
    Evidence: .sisyphus/evidence/task-7-runtime-integrity-pass.txt

  Scenario: Validator catches a broken reference
    Tool: Bash
    Steps: Run validator against a fixture or supported temporary invalid data path with a missing prerequisite/content ID.
    Expected: Exit non-zero with path, bad ID, and referencing record.
    Evidence: .sisyphus/evidence/task-7-broken-reference-fail.txt
  ```

  **Commit**: YES | Message: `feat(textbook): validate promoted runtime integrity` | Files: [`scripts/textbook/*`, `package.json`, fixtures if required]

- [x] 8. Execute promotion and verify runtime/app visibility

  **What to do**: Run the completed promotion workflow, validate all runtime targets, build the app, and verify promoted content is discoverable through runtime data and app surfaces. If Playwright is not installed, use build plus data/module-level smoke commands; if Playwright is available or added by prior workflow, use browser QA with exact selectors discovered from the app.
  **Must NOT do**: Do not declare success because files changed only. Runtime discoverability and validation evidence are required.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: End-to-end verification across CLI, data, build, and runtime surface.
  - Skills: [`playwright`] - Use only if browser QA is available/needed for app-surface verification.
  - Omitted: [`frontend-design`] - No new UI design.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification Wave | Blocked By: Tasks 1-7

  **References**:
  - Command: `npm run textbook:promote -- --all-reviewed --dry-run` - Required preflight.
  - Command: `npm run textbook:promote -- --all-reviewed` - Runtime promotion execution.
  - Command: `npm run validate:textbook-workflow -- --all-reviewed` - Workflow validation.
  - Command: `npm run validate:textbook-runtime-boundary` - Boundary validation.
  - Command: `npm run validate:all:safe` - Aggregate validation.
  - Command: `npm run build` - Production build verification.
  - App entry: `index.html` -> `src/main.js` - Runtime bootstrap path.

  **Acceptance Criteria**:
  - [ ] Dry-run completed before write promotion and evidence saved.
  - [ ] Write promotion completed with promoted/skipped/blocked report saved.
  - [ ] Re-run promotion produced no diff when inputs unchanged.
  - [ ] Runtime validation and build passed.
  - [ ] App/data smoke QA proves promoted textbook-derived quiz/content/path entries are available at runtime.
  - [ ] Git diff shows only expected runtime targets, promotion scripts, validation scripts, manifests, and evidence/report artifacts.

  **QA Scenarios**:
  ```
  Scenario: Promotion reaches runtime safely
    Tool: Bash
    Steps: Run dry-run promotion, write promotion, validation commands, and `npm run build`; save combined output.
    Expected: All commands exit 0; report lists promoted entries by textbook and runtime destination; no boundary violations.
    Evidence: .sisyphus/evidence/task-8-promotion-runtime.txt

  Scenario: Promoted content is discoverable
    Tool: Bash / Playwright
    Steps: If browser QA is available, start Vite and search/navigate to a promoted textbook-derived item using selectors discovered from the app; otherwise run a Node smoke script importing/parsing runtime data and asserting promoted IDs are reachable from app bootstrap data paths.
    Expected: At least one promoted item from each promotable textbook is discoverable through runtime data/app surface; failures list missing textbook IDs.
    Evidence: .sisyphus/evidence/task-8-runtime-discoverability.txt or .sisyphus/evidence/task-8-runtime-discoverability.png
  ```

  **Commit**: YES | Message: `feat(textbook): promote reviewed textbook content to runtime` | Files: [`src/data/quizData.json`, `src/data/contentMeta.js`, `src/data/achievementsData.json`, `src/data/learningPath.json`, `src/data/reactions.json`, `src/data/textbookIngestion/reviewed/*`, `scripts/textbook/*`, `package.json`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
  - Verify all plan tasks were completed, all guardrails were followed, and generated/reviewed ingestion folders are not runtime imports.
- [x] F2. Code Quality Review — unspecified-high
  - Review promotion scripts, validators, manifests, runtime data diffs, deterministic write behavior, and error messages.
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
  - Execute runtime smoke/browser QA proving promoted content is visible/reachable through app behavior or bootstrap data paths.
- [x] F4. Scope Fidelity Check — deep
  - Confirm the implementation promoted reviewed processed content only, did not redesign ingestion/UI, and preserved existing runtime data.

## Commit Strategy
- Prefer task-level commits matching each task’s listed message.
- Do not commit invalid intermediate runtime data.
- Final promotion commit must be rollback-safe: runtime data changes, reviewed manifests, scripts, validation updates, and evidence/report files should be inspectable in git diff.
- Do not push unless explicitly requested by the user.

## Success Criteria
- All currently processed and reviewed/promotable textbook content is available through runtime targets.
- Non-promotable generated content is explicitly blocked with reasons, not silently ignored.
- Runtime never imports generated/reviewed ingestion draft folders.
- Promotion is deterministic, validated, and rollback-safe.
- `npm run validate:all:safe` and `npm run build` pass after promotion.
- Final verification wave approves and user explicitly confirms completion.
