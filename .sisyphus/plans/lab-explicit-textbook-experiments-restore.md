# Restore Lab to Explicit Textbook Experiments

## TL;DR
> **Summary**: Separate the virtual lab from the reaction-pairing game pool, preserving `src/data/reactions.json` as the correct reviewed textbook formula dataset while rebuilding the lab from explicit textbook experiment candidates with restored unlock behavior.
> **Deliverables**:
> - Dedicated `labExperiments` runtime dataset/export for explicit textbook experiments
> - Lab module reads `labExperiments`, not the game reaction pool
> - Deterministic lab experiment transform with provenance, observations, safety, materials, and unlock metadata
> - Human-readable Chinese experiment titles and summaries derived from textbook content, not raw candidate/source IDs
> - Data-boundary validators and Playwright regression tests proving game/lab separation
> - Preservation/migration handling for the original five curated lab experiments where semantically matched
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → 2 → 3 → 5 → 7 → 8

## Context
### Original Request
- The reaction-pairing game was intentionally changed so every pairing comes from textbook reaction formulas.
- That game change is correct and must be preserved.
- The lab module was accidentally changed as a side effect: experiment cards now all show open/unlocked and lab content looks like a reaction formula pool.
- Lab content should come from all explicit experiments in the textbooks, not every reviewed textbook reaction formula.

### Interview Summary
- Game reaction pairing and lab experiments may share textbook provenance, but must not share one interchangeable runtime dataset.
- `src/data/reactions.json` should remain the reviewed textbook reaction formula pool used by the reaction-pairing game.
- Lab should consume an explicit textbook experiment dataset with experiment-specific fields: title, content, materials, steps/observations, safety notes, visual/observed phenomena, source provenance, and unlock metadata.
- Lab experiment titles and descriptions must be processed/summarized from textbook content so users see meaningful Chinese experiment content, not candidate IDs, source section IDs, or textbook experiment numbering such as `【实验1-1】`; numbering can remain provenance metadata only, not part of the display title.
- User selected full rebuild/import of all explicit textbook experiments in this pass.
- User selected adding regression tests.

### Metis Review (gaps addressed)
- Added guardrail that `src/data/reactions.json` remains game-owned and must not be weakened or reverted.
- Added explicit data ownership boundary: export `reactions` for the game pool and `labExperiments` for lab cards.
- Added runtime inclusion rules so plain reaction formulas, generic inquiry review sections, and deferred/raw backlog records cannot leak into lab without transformation.
- Added required unlock metadata and tests proving lab is not all unlocked in clean state.
- Added `runtimeTargetMap.js` correction to prevent future experimentCandidate → reactions.json conflation.
- Added saved-progress compatibility and original curated five-experiment preservation requirements.

## Work Objectives
### Core Objective
Restore the virtual lab as a first-class experiment surface backed by explicit textbook experiment records, while preserving the already-correct reaction-pairing game dataset and preventing future data-source cross-contamination.

### Deliverables
- `src/data/labExperiments.json` containing transformed explicit textbook experiments, plus only the original five curated records as `curatedLegacy` if no deterministic semantic textbook match exists.
- `src/data/index.js` exporting `labExperiments` separately from `reactions`.
- `src/modules/lab.js` importing/using `labExperiments` and renaming local lab collection variables away from generic `reactions` where practical.
- A build/generation script for lab experiments from textbook candidate/backlog/lab-candidate inputs.
- A validator for lab experiment runtime schema and data-boundary invariants.
- Updates to `src/data/textbookIngestion/runtimeTargetMap.js` so experiment candidates target lab experiments, not `src/data/reactions.json`.
- Playwright regression tests covering lab content source, locked/unlocked state, and game preservation.

### Definition of Done (verifiable conditions with commands)
- `node scripts/textbook/build-lab-experiments.mjs --check` exits `0` and reports explicit experiment counts without writing.
- `node scripts/validate-lab-experiments.mjs` exits `0` and confirms every lab experiment has required fields, source provenance, and `unlockRequirements`.
- `node scripts/validate-lab-data-boundary.mjs` exits `0` and fails if lab imports/uses `src/data/reactions.json` or if runtime target mapping sends experiment candidates to `reactions.json`.
- `node scripts/validate-reaction-game-pool.mjs` exits `0`, preserving the textbook reaction formula pool.
- `npm run validate:supporting` exits `0` after it understands separate `labExperiments` and `reactions` datasets.
- `npx playwright test tests/ui/lab-textbook-experiments.spec.ts` exits `0` with new regression assertions.
- `npx playwright test tests/ui/reaction-game-completion.spec.ts` exits `0` to confirm the game path remains intact.
- `npm run build` exits `0`.

### Must Have
- Lab cards are sourced from explicit textbook experiments only, except preserved `curatedLegacy` records for the original five experiments when no deterministic textbook match exists.
- The reaction-pairing game still uses reviewed textbook reaction formulas from `src/data/reactions.json`.
- Clean-state lab page includes both explicitly available starter experiments and locked experiments; it must not show every card as open because of missing metadata.
- Every runtime lab experiment has deterministic `unlockRequirements`; missing `unlockRequirements` is invalid for lab records.
- Explicit textbook experiment selection must be deterministic and provenance-backed.
- Original five curated lab experiments from `src/data/reactions.js:1-226` must either retain stable IDs when semantically matched or have documented compatibility aliases/migration handling.
- Lab UI must not show formula-pool placeholders like `教材已审核反应：...` as lab experiment content.
- Lab UI must not show raw candidate IDs, source section IDs, hash suffixes, or labels like `【实验1-1】` in the display title; each title must be only a content-bearing Chinese phrase derived from the textbook experiment, such as `水的沸腾与石蜡熔化观察`.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not revert or weaken the reaction-pairing game change.
- Do not make lab cards from all 127 reviewed reaction formula records.
- Do not treat a missing `unlockRequirements` field as valid for lab experiment records.
- Do not have UI directly consume raw `experiment-backlog.json`, `experiment-candidates.json`, or `lab-candidates.json`; runtime data must be transformed and validated.
- Do not invent rich real-world procedures beyond textbook-backed content; transform and summarize source content safely.
- Do not expose meaningless generated identifiers or raw source numbering as user-facing experiment titles/descriptions.
- Do not redesign unrelated quiz, achievement, story, compare, timeline, or overall lab visual layout.
- Do not remove existing safety gating for dangerous experiments.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: add regression tests + Node validators + existing game validator + build.
- QA policy: Every task has agent-executed happy-path and failure/edge scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Tasks 1-3 establish schema/source rules, generator, and validators.
Wave 2: Tasks 4-6 update data exports, lab UI consumption, runtime target mapping, and supporting validation.
Wave 3: Tasks 7-8 add regression tests and run integration verification.

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2, 3, 4, 5, 7.
- Task 2 blocks Tasks 3, 4, 5, 7, 8.
- Task 3 blocks Tasks 4, 5, 7, 8.
- Task 4 blocks Tasks 5, 7, 8.
- Task 5 blocks Tasks 7, 8.
- Task 6 blocks Task 8 and can run after Task 1.
- Task 7 blocks Task 8.
- Task 8 depends on Tasks 1-7.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → `unspecified-high` x2, `deep` x1
- Wave 2 → 3 tasks → `unspecified-high` x2, `visual-engineering` x1
- Wave 3 → 2 tasks → `unspecified-high` x1, `deep` x1

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Define lab experiment runtime schema and explicit-source inclusion rules

  **What to do**: Create the schema contract for runtime lab experiments and document it in code comments/JSDoc inside the new validator or generator, not as a separate docs file. The runtime lab schema MUST include: `id`, `experimentId`, `title`, `name` alias for existing UI compatibility, `description`, `textbookContent`, `materials`, `steps`, `observedPhenomena`, `visualDescription`, `safetyLevel`, `safetyNotes`, `curriculumTags`, `difficulty`, `unlockRequirements`, `sourceKind`, `sourceReviewStatus`, `sourceVolumeId`, and `sourceReferences`. Allowed `sourceKind` values are exactly `textbookExperiment` for transformed explicit textbook experiments and `curatedLegacy` only for preserved unmatched records from the original five curated lab experiments. Define content-quality rules: `title` and `name` must be human-readable Chinese summaries derived from the textbook experiment content; raw `candidateId`, `sourceSectionId`, hash suffixes, and textbook numbering labels such as `【实验1-1】` are invalid in final display titles. The correct transformation is from a raw heading like `【实验1-1】` to a content-only title such as `水的沸腾与石蜡熔化观察`; store the raw numbering only in provenance/source metadata if needed. `description` must summarize what the learner will observe/do in one or two Chinese sentences and must not be a raw copied ID/heading. Define inclusion rules: include explicit experiment sections only from `experiment-candidates.json` and/or `lab-candidates.json` records where title/source heading is an explicit experiment marker such as `【实验...】` or `activityType: "experimentReview"`; exclude generic `inquiryReview`, plain reaction formulas, and non-experiment source sections. Use `experiment-backlog.json` only as enrichment source for `observedPhenomena`, `materials`, `safetyNotes`, and provenance; do not expose backlog records directly.
  **Must NOT do**: Do not include all `lab-candidates.json` records. Do not include all reviewed reaction formulas. Do not accept lab records without `unlockRequirements`. Do not mutate game reaction data. Do not allow user-facing titles/descriptions to be meaningless IDs, hashes, or raw experiment numbers.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: needs careful data-contract design across ingestion, runtime, and validation.
  - Skills: [] - no implementation-specific skill required beyond codebase discipline.
  - Omitted: [`frontend-design`] - schema/data boundary work, not visual design.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5, 7 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/data/textbookIngestion/generated/rj-chemistry-grade9-2024-vol1/experiment-candidates.json:1-120` - explicit experiment candidate fields including title, content, materials, observations, provenance.
  - Pattern: `src/data/textbookIngestion/generated/rj-chemistry-grade9-2024-vol1/experiment-backlog.json:1-120` - backlog enrichment fields including `observedPhenomena` and deferred/runtime eligibility metadata.
  - Pattern: `src/data/textbookIngestion/generated/rj-chemistry-grade9-2024-vol1/lab-candidates.json:53-88` - `activityType: "experimentReview"` candidate signal.
  - Pattern: `src/data/reactions.js:1-226` - original curated lab experiment shape, stable IDs, safety/steps/visual descriptions, and unlock metadata style.
  - Guardrail: `src/data/reactions.json` - current game-owned reviewed reaction formula pool; do not change ownership semantics.

  **Acceptance Criteria** (agent-executable only):
  - [ ] A runtime lab experiment schema is encoded in `scripts/validate-lab-experiments.mjs` or `scripts/textbook/build-lab-experiments.mjs` as named required-field lists and explicit comments.
  - [ ] Inclusion predicate rejects `activityType: "inquiryReview"` and accepts explicit experiment records such as `lab-0006-1-1-l27-l50-e9eba2d49e`.
  - [ ] Inclusion predicate excludes formula-only reviewed reactions by requiring output sourceKind to be `textbookExperiment` or allowed five-record-only `curatedLegacy`, never `sourceKind: "textbook"`.
  - [ ] Title-quality predicate rejects raw IDs, hash-like strings, source section IDs, and any title containing textbook experiment numbering labels like `【实验1-1】`.
  - [ ] Description-quality predicate rejects `教材已审核反应：...`, raw headings, and descriptions shorter than a meaningful Chinese phrase threshold chosen in the validator.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Explicit experiment inclusion predicate accepts textbook experiment
    Tool: Bash
    Steps: Run `node scripts/validate-lab-experiments.mjs --self-check explicit-include` after the validator self-check is added.
    Expected: Exit code 0; output includes `explicit-include: pass` and references `lab-0006-1-1-l27-l50-e9eba2d49e` or its matching experiment candidate.
    Evidence: .sisyphus/evidence/task-1-lab-schema-explicit-include.json

  Scenario: Generic inquiry and formula-only records are rejected
    Tool: Bash
    Steps: Run `node scripts/validate-lab-experiments.mjs --self-check reject-non-experiment`.
    Expected: Exit code 0; output includes `reject-non-experiment: pass`; validator demonstrates rejection of `activityType: inquiryReview` and `sourceKind: textbook` formula-pool shapes.
    Evidence: .sisyphus/evidence/task-1-lab-schema-reject-non-experiment.json

  Scenario: Meaningless titles and descriptions are rejected
    Tool: Bash
    Steps: Run `node scripts/validate-lab-experiments.mjs --self-check reject-meaningless-title`.
    Expected: Exit code 0; output confirms rejection of raw `candidateId`, `sourceSectionId`, hash suffix, any display title containing `【实验1-1】`, and placeholder description samples.
    Evidence: .sisyphus/evidence/task-1-lab-schema-reject-meaningless-title.json
  ```

  **Commit**: NO | Message: `fix(lab): define explicit textbook experiment schema` | Files: [`scripts/validate-lab-experiments.mjs`, `scripts/textbook/build-lab-experiments.mjs`]

- [x] 2. Build dedicated lab experiment runtime dataset from explicit textbook experiments

  **What to do**: Add `scripts/textbook/build-lab-experiments.mjs` that reads all four generated volume directories under `src/data/textbookIngestion/generated/`: `rj-chemistry-grade9-2024-vol1`, `rj-chemistry-grade9-2024-vol2`, `rj-chemistry-grade8-54-2024-full`, and `rj-chemistry-g12-selective-3-organic-2019`. The script must join `experiment-candidates.json`, `experiment-backlog.json`, and `lab-candidates.json` by `candidateId`/source section where possible, transform accepted explicit experiments into runtime records, deduplicate by `sourceVolumeId + sourceSectionId` first and normalized title/content hash second, and write `src/data/labExperiments.json` only with `--write`. `--check` must preview count and validation without writing. Generate deterministic IDs as `lab-experiment-{sourceVolumeId}-{sourceSectionId}` slug/hash, but preserve original curated IDs from `src/data/reactions.js:1-226` when a semantic match exists for these five `experimentId`s: `exp-hydrogen-combustion`, `exp-iron-rusting`, `exp-sodium-water`, `exp-salt-formation`, `exp-oxygen-supports-combustion`. If no clear semantic match exists for a curated record, include the curated record as `sourceKind: "curatedLegacy"` with provenance note and keep its original ID so saved progress and animations remain compatible. The transform must derive user-facing `title`/`name` from content-bearing textbook phrases and strip raw IDs, hashes, and textbook numbering. If source heading is only `【实验N-M】`, replace it with a summarized content phrase extracted from `summary`, `textbookContent`, or materials/observations, e.g. `水的沸腾与石蜡熔化观察` (without `【实验1-1】`). If no meaningful phrase can be derived, exclude the candidate and report it under `rejectedMeaninglessTitle` rather than emitting bad UI content. Preserve the original numbering only in `sourceReferences`/metadata, not display fields.
  **Must NOT do**: Do not overwrite `src/data/reactions.json`. Do not import raw deferred backlog wholesale. Do not generate lab records without provenance or unlock metadata. Do not invent procedural steps not supported by candidate/backlog text; use source summary/textbookContent safely.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: file generation, deterministic transforms, and data migration logic.
  - Skills: [] - no special skill required.
  - Omitted: [`frontend-design`] - data pipeline task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3, 4, 5, 7, 8 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `scripts/textbook/validate-experiment-backlog.mjs:9-37` - known textbook volume IDs and generated paths.
  - Pattern: `scripts/textbook/validate-experiment-backlog.mjs:64-80` - required backlog fields including `observedPhenomena`.
  - Pattern: `scripts/textbook/build-reviewed-reactions.mjs:74-115` - CLI style for `--check`/`--write` and help text.
  - Pattern: `scripts/textbook/build-reviewed-reactions.mjs:459-468` - canonical text/hash helper style for deterministic IDs.
  - Pattern: `src/data/reactions.js:1-226` - legacy curated records to preserve or semantically match.
  - API/Type: `src/data/textbookIngestion/generated/rj-chemistry-grade9-2024-vol1/experiment-candidates.json:1-120` - candidate input shape.
  - API/Type: `src/data/textbookIngestion/generated/rj-chemistry-grade9-2024-vol1/experiment-backlog.json:1-120` - backlog enrichment shape.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node scripts/textbook/build-lab-experiments.mjs --check` exits `0` and prints a nonzero accepted explicit experiment count.
  - [ ] `node scripts/textbook/build-lab-experiments.mjs --write` creates/updates `src/data/labExperiments.json` with top-level `{ "labExperiments": [...] }`.
  - [ ] `src/data/labExperiments.json` contains no record with `sourceKind: "textbook"`; textbook-derived lab records use `sourceKind: "textbookExperiment"`.
  - [ ] `src/data/labExperiments.json` contains no user-facing `title`, `name`, or `description` equal to raw `candidateId`, raw `sourceSectionId`, hash-like suffixes, or containing textbook experiment numbering labels such as `【实验1-1】`.
  - [ ] Generator `--check` output includes counters for accepted experiments, rejected non-experiments, rejected duplicates, and rejected meaningless-title/content records.
  - [ ] `src/data/reactions.json` is not modified by this task except if already modified before task start; verify with `git diff -- src/data/reactions.json` showing no changes from the lab generator.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Check mode previews without writing
    Tool: Bash
    Steps: Run `git diff -- src/data/labExperiments.json src/data/reactions.json`; run `node scripts/textbook/build-lab-experiments.mjs --check`; run `git diff -- src/data/labExperiments.json src/data/reactions.json` again.
    Expected: Check command exits 0; second diff shows no new changes caused by `--check`.
    Evidence: .sisyphus/evidence/task-2-build-lab-experiments-check.json

  Scenario: Write mode creates separate lab dataset and preserves game pool
    Tool: Bash
    Steps: Run `node scripts/textbook/build-lab-experiments.mjs --write`; run `node scripts/validate-reaction-game-pool.mjs`.
    Expected: Lab dataset exists; game validator exits 0; `src/data/reactions.json` remains valid formula pool.
    Evidence: .sisyphus/evidence/task-2-build-lab-experiments-write.json
  ```

  **Commit**: NO | Message: `fix(data): build explicit textbook lab experiments` | Files: [`scripts/textbook/build-lab-experiments.mjs`, `src/data/labExperiments.json`]

- [x] 3. Add lab experiment validator and data-boundary validator

  **What to do**: Add `scripts/validate-lab-experiments.mjs` to validate `src/data/labExperiments.json` runtime schema. It must require every lab experiment to have non-empty title/name, description/textbookContent, safetyLevel from allowed levels, arrays for materials/steps/safetyNotes/observedPhenomena, source provenance, allowed `sourceKind`, and valid `unlockRequirements`. For `sourceKind: "curatedLegacy"`, the validator must require the ID/experimentId to be one of the original five curated records from `src/data/reactions.js:1-226`; all other runtime lab records must be `sourceKind: "textbookExperiment"`. It must fail if every lab experiment is unlocked by default, fail if any lab record lacks `unlockRequirements`, and fail if formula-pool placeholders like `教材已审核反应：` appear in lab-facing text fields. It must also validate content quality: reject titles/names/descriptions containing raw `candidateId`/`sourceSectionId`, SHA/hash-like suffixes, meaningless generated IDs, or textbook experiment numbering labels such as `【实验N-M】` in display fields. Add `scripts/validate-lab-data-boundary.mjs` to statically check that `src/modules/lab.js` imports/uses `labExperiments` rather than `reactions` as card source, and that `src/data/textbookIngestion/runtimeTargetMap.js` does not map `experimentCandidate` to `src/data/reactions.json`. Add npm scripts `validate:lab-experiments` and `validate:lab-boundary`.
  **Must NOT do**: Do not weaken `scripts/validate-reaction-game-pool.mjs`. Do not let promoted textbook formula records pass as lab experiments. Do not rely on Playwright alone for data correctness.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: validation scripts with self-checks and package integration.
  - Skills: [] - no special skill required.
  - Omitted: [`frontend-design`] - no UI changes.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4, 5, 7, 8 | Blocked By: 1, 2

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `scripts/validate-supporting-data.mjs:1075-1141` - existing unlockRequirements validation rules.
  - Pattern: `scripts/validate-reaction-game-pool.mjs:95-204` - validator result shape and game-usable filtering.
  - API/Type: `package.json:6-32` - current npm validation scripts naming style.
  - Guardrail: `src/modules/lab.js:180-293` - card source must be `labExperiments` after Task 5.
  - Guardrail: `src/data/textbookIngestion/runtimeTargetMap.js:40-44` - mapping currently conflates experiment candidates with `reactions.json`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run validate:lab-experiments` exits `0` with current generated lab data.
  - [ ] `npm run validate:lab-boundary` exits `0` after Tasks 5-6 update imports/mapping.
  - [ ] `node scripts/validate-lab-experiments.mjs --self-check missing-unlock` exits `0` by proving the validator rejects a record without `unlockRequirements`.
  - [ ] `node scripts/validate-lab-experiments.mjs --self-check placeholder-text` exits `0` by proving the validator rejects `教材已审核反应：` in lab-facing text.
  - [ ] `node scripts/validate-lab-experiments.mjs --self-check reject-meaningless-title` exits `0` by proving the validator rejects raw IDs, source section IDs, hash strings, and bare experiment numbers.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Validator rejects missing unlock metadata
    Tool: Bash
    Steps: Run `node scripts/validate-lab-experiments.mjs --self-check missing-unlock`.
    Expected: Exit code 0; output confirms invalid fixture was rejected for missing `unlockRequirements`.
    Evidence: .sisyphus/evidence/task-3-lab-validator-missing-unlock.json

  Scenario: Boundary validator catches lab/game data conflation
    Tool: Bash
    Steps: Run `node scripts/validate-lab-data-boundary.mjs --self-check lab-imports-reactions`.
    Expected: Exit code 0; output confirms fixture/source sample importing `reactions` for lab card source is rejected.
    Evidence: .sisyphus/evidence/task-3-boundary-validator-self-check.json

  Scenario: Validator rejects meaningless user-facing content
    Tool: Bash
    Steps: Run `node scripts/validate-lab-experiments.mjs --self-check reject-meaningless-title`.
    Expected: Exit code 0; output confirms rejection of raw IDs/hashes and bare experiment-number-only titles.
    Evidence: .sisyphus/evidence/task-3-lab-validator-meaningful-title.json
  ```

  **Commit**: NO | Message: `test(data): validate lab experiment boundary` | Files: [`scripts/validate-lab-experiments.mjs`, `scripts/validate-lab-data-boundary.mjs`, `package.json`]

- [x] 4. Export separate `labExperiments` dataset and update supporting data validation

  **What to do**: Update `src/data/index.js` to import `./labExperiments.json` and export `labExperiments` separately from `reactions`. Keep `reactions` exactly as the game formula pool export from `src/data/reactions.json`. Update `scripts/validate-supporting-data.mjs` so reaction-pairing validation still applies to `reactions`, while lab-specific checks apply to `labExperiments`. Learning path cross-reference checks must consider `labExperiments[].experimentId` for `stage.unlockedExperiments`, not only reaction records. Update any runtime state/count assumptions such as progress display if needed so completed experiments still count lab experiments. Preserve backward compatibility for completed experiment IDs in localStorage.
  **Must NOT do**: Do not rename `reactions` globally in a way that breaks the reaction game. Do not make `reactions` include lab experiments. Do not make `labExperiments` an alias of `reactions`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: data boundary and cross-validator updates across modules.
  - Skills: [] - no special skill required.
  - Omitted: [`frontend-design`] - no visual work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 5, 7, 8 | Blocked By: 2, 3

  **References** (executor has NO interview context - be exhaustive):
  - API/Type: `src/data/index.js:1-39` - current central content boundary and `reactions` export.
  - Pattern: `scripts/validate-supporting-data.mjs:203-263` - current reaction loop and experiment ID collection.
  - Pattern: `scripts/validate-supporting-data.mjs:362-365` - learning path unlocked experiment cross-reference validation.
  - Pattern: `src/data/learningPath.json:21-26` - learning stages reference original experiment IDs.
  - Pattern: `src/modules/progress.js` - progress display may still assume original experiment count; inspect before editing.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/data/index.js` exports both `reactions` and `labExperiments`.
  - [ ] `node -e "import('./src/data/index.js').then(m=>{if(!Array.isArray(m.reactions)||!Array.isArray(m.labExperiments)||m.reactions===m.labExperiments) process.exit(1)})"` exits `0`.
  - [ ] `npm run validate:supporting` exits `0` and validates learning path experiment IDs against `labExperiments`.
  - [ ] `node scripts/validate-reaction-game-pool.mjs` exits `0` after export changes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Central data boundary exposes separate concepts
    Tool: Bash
    Steps: Run `node -e "import('./src/data/index.js').then(m=>{console.log({reactions:m.reactions.length,labExperiments:m.labExperiments.length,same:m.reactions===m.labExperiments}); if(!Array.isArray(m.reactions)||!Array.isArray(m.labExperiments)||m.reactions===m.labExperiments) process.exit(1)})"`.
    Expected: Exit code 0; printed JSON shows nonzero counts and `same:false`.
    Evidence: .sisyphus/evidence/task-4-data-boundary-export.json

  Scenario: Supporting validator still preserves game pool
    Tool: Bash
    Steps: Run `npm run validate:supporting` and `node scripts/validate-reaction-game-pool.mjs`.
    Expected: Both commands exit 0; no errors about learning path missing original experiment IDs if those IDs exist in `labExperiments` or are migrated.
    Evidence: .sisyphus/evidence/task-4-supporting-validation.json
  ```

  **Commit**: NO | Message: `fix(data): export lab experiments separately` | Files: [`src/data/index.js`, `scripts/validate-supporting-data.mjs`, `src/data/labExperiments.json`]

- [x] 5. Refactor lab module to consume lab experiments, not reaction formula pool

  **What to do**: Update `src/modules/lab.js` so the lab card/detail/simulation flow imports `labExperiments` from `src/data/index.js` and uses a local collection name such as `labExperiments` or `experiments`, not `reactions`, for lab cards. Preserve existing UI layout and safety gates. Adapt field reads as needed: `title`/`name`, `observedPhenomena`, `visualDescription`, `materials`, `steps`, `safetyNotes`, `reactants/products/equationText` only when present. The UI must display processed meaningful `title`/`name` and summarized `description` from the runtime lab dataset; if a malformed record still has a raw ID/hash/experiment number, render a safe fallback like `教材实验` while keeping source heading/numbering only in hidden/provenance metadata, never as the main title. Ensure missing chemistry rows remain hidden for experiments without reaction formulas, following the existing ambiguous chemistry pattern. Change unlock behavior for lab records so missing `unlockRequirements` is not silently treated as open; ideally this cannot occur because validator blocks it, but UI should show locked/error-safe fallback rather than open if malformed data appears. Preserve original animation cases for curated records and provide a safe generic animation/guide for textbook experiments without custom animation IDs.
  **Must NOT do**: Do not import `reactions as importedReactions` for lab card source. Do not require every lab experiment to have reactants/products. Do not expose `教材已审核反应：` placeholders in lab descriptions. Do not show raw candidate IDs, source section IDs, hashes, or labels like `【实验1-1】` in the user-facing main title. Do not redesign lab visuals.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI module refactor with visible lab behavior and safety state preservation.
  - Skills: [`frontend-design`] - keep existing lab UX coherent while changing data shape.
  - Omitted: [`threejs-animation`] - no new custom animations required; only preserve/generic fallback.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7, 8 | Blocked By: 1, 2, 3, 4

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/lab.js:180-293` - card rendering, filters, active record, and result count currently iterate `reactions`.
  - Pattern: `src/modules/lab.js:639-719` - detail view uses description, steps, safety, visual description, and unlock state.
  - Pattern: `src/modules/lab.js:721-756` - chemistry rows already hide missing formulas when `reactants/products` are empty.
  - Pattern: `src/modules/lab.js:809-838` - current unlock function; missing requirements currently open every card and must be fixed for lab records.
  - Pattern: `src/modules/lab.js:1022-1058` - result view currently displays `reaction.description` and `reaction.visualDescription`.
  - Pattern: `tests/ui/lab-textbook-experiments.spec.ts:127-169` - ambiguous chemistry test pattern for hiding equation rows.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node scripts/validate-lab-data-boundary.mjs` exits `0`, proving lab source is not `reactions.json`.
  - [ ] `npx playwright test tests/ui/lab-textbook-experiments.spec.ts --grep "ambiguous chemistry"` exits `0`.
  - [ ] Clean-state lab route does not display 127 reviewed formula-pool cards as lab experiments.
  - [ ] Lab detail opens for an explicit textbook experiment and shows textbook content plus safety/observation fields.
  - [ ] Lab card titles are meaningful Chinese experiment summaries; no visible card title matches raw ID/hash/source-section patterns or contains `【实验N-M】` numbering.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Lab source boundary is separated from game reactions
    Tool: Bash
    Steps: Run `node scripts/validate-lab-data-boundary.mjs`; then run `node scripts/validate-reaction-game-pool.mjs`.
    Expected: Both exit 0; boundary output confirms `src/modules/lab.js` consumes `labExperiments` and game pool remains valid.
    Evidence: .sisyphus/evidence/task-5-lab-boundary-separated.json

  Scenario: Explicit textbook lab card opens with experiment content
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/lab-textbook-experiments.spec.ts --grep "card excerpt and detail full content"` after updating the test to use `labExperiments` fixtures if needed.
    Expected: Exit code 0; modal contains experiment text, not formula-pool placeholder text.
    Evidence: .sisyphus/evidence/task-5-lab-detail-content.json

  Scenario: Lab titles are meaningful summaries
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/lab-textbook-experiments.spec.ts --grep "lab titles are meaningful textbook summaries"` after adding the test in Task 7.
    Expected: Exit code 0; visible lab card titles contain content-bearing Chinese phrases and no raw candidate/source IDs, hashes, or textbook experiment numbers.
    Evidence: .sisyphus/evidence/task-5-lab-meaningful-titles.json
  ```

  **Commit**: NO | Message: `fix(lab): consume explicit textbook experiments` | Files: [`src/modules/lab.js`, `tests/ui/lab-textbook-experiments.spec.ts`]

- [x] 6. Correct textbook runtime target mapping and generation guardrails

  **What to do**: Update `src/data/textbookIngestion/runtimeTargetMap.js` so `experimentCandidate` no longer targets `src/data/reactions.json`. It should target `src/data/labExperiments.json` with target field `labExperiments`, or a new `labExperiment` candidate type should be introduced if that better matches current ingestion semantics. Preserve the map's existing preservation rules. Ensure any promotion/generation scripts that inspect this map do not attempt to push lab experiments into the game reaction pool. If scripts need updates, make the smallest changes necessary to keep map validation/build passing.
  **Must NOT do**: Do not remove reaction formula promotion support for the game pool if it exists elsewhere. Do not map `labCandidate` generic inquiry records directly to runtime unless filtered by Task 1 rules.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: data-ingestion map and future-regression guardrail.
  - Skills: [] - no special skill required.
  - Omitted: [`frontend-design`] - no UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/data/textbookIngestion/runtimeTargetMap.js:1-13` - preservation and namespace rules.
  - Problem: `src/data/textbookIngestion/runtimeTargetMap.js:40-44` - current `experimentCandidate` → `src/data/reactions.json` mapping to correct.
  - Pattern: `src/data/textbookIngestion/runtimeTargetMap.js:60-62` - `labCandidate` currently unsupported; do not blindly promote generic lab candidates.
  - Validator: `scripts/validate-lab-data-boundary.mjs` from Task 3 must fail if this regression returns.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `runtimeTargetMap.js` no longer maps any experiment/lab candidate destination to `src/data/reactions.json` unless it is explicitly a reaction-formula candidate.
  - [ ] `node scripts/validate-lab-data-boundary.mjs` exits `0` and reports runtime target map separation.
  - [ ] Existing textbook workflow validator still passes if available via `npm run validate:textbook-workflow`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Runtime target map no longer conflates experiments with reactions
    Tool: Bash
    Steps: Run `node scripts/validate-lab-data-boundary.mjs --check-runtime-target-map`.
    Expected: Exit code 0; output confirms `experimentCandidate` targets `src/data/labExperiments.json` or is otherwise prevented from targeting `src/data/reactions.json`.
    Evidence: .sisyphus/evidence/task-6-runtime-target-map.json

  Scenario: Textbook workflow remains valid
    Tool: Bash
    Steps: Run `npm run validate:textbook-workflow`.
    Expected: Exit code 0; no workflow errors from map update.
    Evidence: .sisyphus/evidence/task-6-textbook-workflow.json
  ```

  **Commit**: NO | Message: `fix(textbook): route experiment candidates to lab dataset` | Files: [`src/data/textbookIngestion/runtimeTargetMap.js`, related validator/script files if required]

- [x] 7. Add lab/game separation regression tests

  **What to do**: Extend `tests/ui/lab-textbook-experiments.spec.ts` with regression coverage that starts from clean localStorage, opens `/#/lab`, and proves the lab uses explicit textbook experiments rather than the game reaction formula pool. Add or update tests to assert: at least one explicit textbook experiment card is visible; no formula-only `textbook-reaction-*` card title from `src/data/reactions.json` is rendered as a lab card; at least one lab card is locked and at least one starter card is available; opening a lab card shows materials/steps/safety/observed phenomena or textbook content; no lab card/detail/result text contains `教材已审核反应：`; visible lab titles/descriptions are meaningful Chinese summaries and do not match raw `candidateId`, `sourceSectionId`, hash, or contain `【实验N-M】` numbering. Add a game preservation test if existing `tests/ui/reaction-game-completion.spec.ts` does not already prove reaction game still consumes textbook formula records; otherwise add assertions to the existing test.
  **Must NOT do**: Do not weaken existing lab tests by relying only on injected fixtures. Keep at least one test using real runtime data. Do not add brittle selectors if existing semantic/class selectors suffice; if new selectors are necessary, add stable `data-testid` attributes in the lab UI.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Playwright regression design across lab and game surfaces.
  - Skills: [] - no additional skill required.
  - Omitted: [`frontend-design`] - tests, not design implementation.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 8 | Blocked By: 3, 4, 5

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `tests/ui/lab-textbook-experiments.spec.ts:1-67` - existing card/detail test and evidence helper.
  - Pattern: `tests/ui/lab-textbook-experiments.spec.ts:127-169` - ambiguous chemistry row assertions.
  - Pattern: `tests/ui/lab-textbook-experiments.spec.ts:171-238` - safety gate test pattern.
  - Pattern: `tests/ui/lab-textbook-experiments.spec.ts:240-302` - simulation completion result view pattern.
  - Pattern: `tests/ui/reaction-game-completion.spec.ts` - reaction game completion and persistence coverage.
  - Config: `playwright.config.ts:1-24` - Playwright setup and base URL.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/lab-textbook-experiments.spec.ts` exits `0`.
  - [ ] `npx playwright test tests/ui/reaction-game-completion.spec.ts` exits `0`.
  - [ ] Lab tests include a real runtime data regression test that fails if lab cards are sourced from `src/data/reactions.json` formula-pool records.
  - [ ] Lab tests include a clean-state locked/unlocked assertion and placeholder-text rejection assertion.
  - [ ] Lab tests include title/content quality assertions rejecting raw IDs, hashes, and any experiment-number labels in visible UI titles.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Lab runtime regression test proves explicit experiments and locks
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/lab-textbook-experiments.spec.ts --grep "runtime lab uses explicit textbook experiments"`.
    Expected: Exit code 0; test evidence reports visible explicit experiment count, locked count > 0, unlocked count > 0, and formula-pool placeholder count 0.
    Evidence: .sisyphus/evidence/task-7-lab-runtime-regression.json

  Scenario: Reaction game remains backed by textbook formulas
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/reaction-game-completion.spec.ts`.
    Expected: Exit code 0; existing or added assertions confirm game still completes with reviewed textbook formula records.
    Evidence: .sisyphus/evidence/task-7-reaction-game-preserved.json

  Scenario: Lab titles are meaningful textbook summaries
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/lab-textbook-experiments.spec.ts --grep "lab titles are meaningful textbook summaries"`.
    Expected: Exit code 0; evidence reports zero visible raw candidate IDs, source section IDs, hash suffixes, or textbook experiment-number labels in titles.
    Evidence: .sisyphus/evidence/task-7-lab-title-quality.json
  ```

  **Commit**: NO | Message: `test(lab): prevent reaction pool regression` | Files: [`tests/ui/lab-textbook-experiments.spec.ts`, `tests/ui/reaction-game-completion.spec.ts`, `src/modules/lab.js` if selectors needed]

- [x] 8. Run full validation and fix integration fallout

  **What to do**: Execute the full validation sequence and fix any integration issues without expanding scope. Required commands, in order: `node scripts/textbook/build-lab-experiments.mjs --check`, `npm run validate:lab-experiments`, `npm run validate:lab-boundary`, `node scripts/validate-reaction-game-pool.mjs`, `npm run validate:supporting`, `npm run validate:textbook-workflow`, `npx playwright test tests/ui/lab-textbook-experiments.spec.ts`, `npx playwright test tests/ui/reaction-game-completion.spec.ts`, `npm run build`. If `npm run validate:textbook-workflow` fails for unrelated pre-existing reasons, capture output and run the narrower changed validators; do not hide the failure. Write consolidated evidence to `.sisyphus/evidence/task-8-final-validation.json`.
  **Must NOT do**: Do not skip failing validators. Do not remove tests to make validation pass. Do not broaden into unrelated data cleanup unless directly required by the lab/game separation.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: integration fallout may span data, validators, UI, and tests.
  - Skills: [`verification-before-completion`] - evidence-before-claim discipline.
  - Omitted: [`frontend-design`] - only minor UI fixes if validation reveals them.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: final verification | Blocked By: 1, 2, 3, 4, 5, 6, 7

  **References** (executor has NO interview context - be exhaustive):
  - Commands: `package.json:6-32` - available validation/build scripts.
  - Config: `playwright.config.ts:1-24` - Playwright global setup.
  - Validator: `scripts/validate-reaction-game-pool.mjs:82-92` - game pool CLI.
  - Validator: `scripts/textbook/validate-experiment-backlog.mjs:139-151` - backlog validator CLI if needed for source checks.
  - Evidence helper: `tests/ui/lab-textbook-experiments.spec.ts:318-325` - existing evidence write pattern.

  **Acceptance Criteria** (agent-executable only):
  - [ ] All required commands either exit `0` or have documented unrelated pre-existing failure with narrower changed-scope validators passing.
  - [ ] `.sisyphus/evidence/task-8-final-validation.json` records command, exit code, and summary for every required validation command.
  - [ ] `git diff -- src/data/reactions.json` confirms no unintended game pool revert; if changes exist, they are explicitly required and game validator passes.
  - [ ] `npm run build` exits `0`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Changed-scope validators all pass
    Tool: Bash
    Steps: Run `node scripts/textbook/build-lab-experiments.mjs --check && npm run validate:lab-experiments && npm run validate:lab-boundary && node scripts/validate-reaction-game-pool.mjs && npm run validate:supporting`.
    Expected: Exit code 0; output shows lab dataset valid, boundary separated, game pool valid, supporting data valid.
    Evidence: .sisyphus/evidence/task-8-changed-scope-validators.json

  Scenario: Browser and production build pass
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/lab-textbook-experiments.spec.ts && npx playwright test tests/ui/reaction-game-completion.spec.ts && npm run build`.
    Expected: Exit code 0; Playwright and Vite build pass.
    Evidence: .sisyphus/evidence/task-8-browser-build.json
  ```

  **Commit**: YES | Message: `fix(lab): separate textbook experiments from reaction game pool` | Files: [`src/data/index.js`, `src/data/labExperiments.json`, `src/modules/lab.js`, `src/data/textbookIngestion/runtimeTargetMap.js`, `scripts/textbook/build-lab-experiments.mjs`, `scripts/validate-lab-experiments.mjs`, `scripts/validate-lab-data-boundary.mjs`, `scripts/validate-supporting-data.mjs`, `package.json`, `tests/ui/lab-textbook-experiments.spec.ts`, `tests/ui/reaction-game-completion.spec.ts`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep
## Commit Strategy
- One commit after all verification passes and user approves final verification results.
- Suggested message: `fix(lab): separate textbook experiments from reaction game pool`
- Do not commit `.sisyphus/evidence` unless project convention requires evidence artifacts.

## Success Criteria
- Lab route renders explicit textbook experiment cards from `labExperiments`, not reviewed formula-pool records from `reactions`.
- Clean localStorage state shows at least one locked lab card and at least one available starter lab card.
- Reaction-pairing game validator and UI tests continue to pass with `src/data/reactions.json` as the reviewed formula pool.
- No `教材已审核反应：...` placeholder appears in lab card descriptions, detail descriptions, visual description, or observed phenomena fields.
- Build and validation commands listed in Definition of Done all pass.
