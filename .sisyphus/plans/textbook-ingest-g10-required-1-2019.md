# Textbook Ingest: 2019版人教版高中化学必修第1册

## TL;DR
> **Summary**: Register and process `src/data/textbooks/2019版人教版高中化学必修第1册/book.md` through the reusable textbook ingestion pipeline.
> **Deliverables**: Batch contract, generated source inventory, draft candidates, experiment backlog, empty reviewed manifest scaffold, validation evidence.
> **Effort**: Medium
> **Parallel**: NO
> **Critical Path**: Task 1 → 2 → 3 → 4 → Final Verification

## Context
### Original Request
Create one executable `/start-work` task for this textbook.

### Fixed Decisions
- Source textbook: `src/data/textbooks/2019版人教版高中化学必修第1册/book.md`
- Stable ingestion volume ID: `rj-chemistry-g10-required-1-2019`
- Canonical runtime/source-reference volume mapping if promoted later: `pep-chemistry-g10-required-1`
- Runtime promotion: excluded in this plan.

## Work Objectives
### Core Objective
Make 高中化学必修第1册 available as validated generated draft content.

### Definition of Done
- `validate:textbook-workflow`, `validate:textbook-runtime-boundary`, and `validate:all:safe` pass for `rj-chemistry-g10-required-1-2019`.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Evidence: `.sisyphus/evidence/g10-required-1-2019-task-{N}.txt`.

## Execution Strategy
### Parallel Execution Waves
Wave 1: Task 1 only — register batch and known-volume script support.
Wave 2: Task 2 only — extract source inventory after batch validation.
Wave 3: Task 3 only — generate/validate draft surfaces and deferred experiment backlog.
Wave 4: Task 4 only — scaffold reviewed manifest and run full workflow/runtime gates.

### Dependency Matrix
- Task 1 blocks Tasks 2-4.
- Task 2 blocks Task 3.
- Task 3 blocks Task 4.
- Task 4 blocks Final Verification Wave.

### Agent Dispatch Summary
- Wave 1 → 1 task → deep
- Wave 2 → 1 task → quick
- Wave 3 → 1 task → deep
- Wave 4 → 1 task → unspecified-high

### Mandatory Failure/Edge QA Mapping
- Task 1 must also prove `node scripts/textbook/validate-batch-contract.mjs --textbook missing-volume` exits non-zero and prints `Unknown textbook batch`.
- Task 2 must also prove extraction fails gracefully for a missing/unknown source fixture or missing volume, without creating runtime files.
- Task 3 must also prove generated draft candidates remain `reviewStatus: needsReview`/not runtime eligible and deferred experiments do not appear in `src/data/reactions.json`.
- Task 4 must also prove `npm run validate:textbook-runtime-boundary` passes and `npm run textbook:promote -- --textbook rj-chemistry-g10-required-1-2019 --topic unreviewed-generated-topic` remains blocked with `Promotion blocked`.

## TODOs
- [ ] 1. Register textbook batch and known-volume script support

  **What to do**: Create `src/data/textbookIngestion/batches/rj-chemistry-g10-required-1-2019.json` with computed source hash and add this volume to all textbook script known-volume registries.
  **Must NOT do**: Do not runtime-import the batch or generated artifacts.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: shared workflow extension.
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-4 | Blocked By: none

  **References**:
  - Source: `src/data/textbooks/2019版人教版高中化学必修第1册/book.md`
  - Existing batch: `src/data/textbookIngestion/batches/rj-chemistry-grade9-2024-vol1.json`

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-batch -- --textbook rj-chemistry-g10-required-1-2019` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Batch validates
    Tool: Bash
    Steps: npm run validate:textbook-batch -- --textbook rj-chemistry-g10-required-1-2019
    Expected: exit 0
    Evidence: .sisyphus/evidence/g10-required-1-2019-task-1-batch.txt
  ```

  **Commit**: NO

- [ ] 2. Extract textbook source inventory

  **What to do**: Run extraction and generate `src/data/textbookIngestion/generated/rj-chemistry-g10-required-1-2019/source-inventory.json`.
  **Must NOT do**: Do not modify runtime files.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: command and artifact check.
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 3-4 | Blocked By: 1

  **References**:
  - Extractor: `scripts/textbook/extract-textbook.mjs`

  **Acceptance Criteria**:
  - [ ] `npm run textbook:extract -- --textbook rj-chemistry-g10-required-1-2019` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Extract inventory
    Tool: Bash
    Steps: npm run textbook:extract -- --textbook rj-chemistry-g10-required-1-2019
    Expected: exit 0
    Evidence: .sisyphus/evidence/g10-required-1-2019-task-2-extract.txt
  ```

  **Commit**: NO

- [ ] 3. Generate drafts and experiment backlog

  **What to do**: Generate draft candidates for all surfaces and validate drafts/backlog.
  **Must NOT do**: Do not mark generated content reviewed/promoted/runtimeEligible.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: full multi-surface draft validation.
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 4 | Blocked By: 2

  **References**:
  - Generator: `scripts/textbook/generate-drafts.mjs`
  - Experiment backlog validator: `scripts/textbook/validate-experiment-backlog.mjs`

  **Acceptance Criteria**:
  - [ ] `npm run textbook:generate-drafts -- --textbook rj-chemistry-g10-required-1-2019` exits `0`.
  - [ ] `npm run validate:textbook-drafts -- --textbook rj-chemistry-g10-required-1-2019` exits `0`.
  - [ ] `npm run validate:textbook-experiments -- --textbook rj-chemistry-g10-required-1-2019` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Drafts validate
    Tool: Bash
    Steps: npm run textbook:generate-drafts -- --textbook rj-chemistry-g10-required-1-2019 && npm run validate:textbook-drafts -- --textbook rj-chemistry-g10-required-1-2019
    Expected: exit 0
    Evidence: .sisyphus/evidence/g10-required-1-2019-task-3-drafts.txt
  ```

  **Commit**: NO

- [ ] 4. Create reviewed manifest scaffold and run workflow gates

  **What to do**: Create empty reviewed manifest scaffold with `entries: []`, then run workflow validation, runtime boundary, and safe validation.
  **Must NOT do**: Do not promote runtime content.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: integration validation.
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: final | Blocked By: 1-3

  **References**:
  - Workflow validator: `scripts/textbook/validate-workflow.mjs`

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-workflow -- --textbook rj-chemistry-g10-required-1-2019` exits `0`.
  - [ ] `npm run validate:textbook-runtime-boundary` exits `0`.
  - [ ] `npm run validate:all:safe` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Full workflow validates
    Tool: Bash
    Steps: npm run validate:textbook-workflow -- --textbook rj-chemistry-g10-required-1-2019 && npm run validate:all:safe
    Expected: exit 0
    Evidence: .sisyphus/evidence/g10-required-1-2019-task-4-workflow.txt
  ```

  **Commit**: NO

## Final Verification Wave
> Run F1-F4 in PARALLEL after Tasks 1-4. ALL must approve. Present consolidated findings to the user and wait for explicit approval before marking complete.
- [ ] F1. Plan compliance audit — oracle — verify every acceptance criterion, evidence file, and dependency above was satisfied.
- [ ] F2. Code quality review — unspecified-high — review script/batch additions for maintainability, deterministic output, and no generated/runtime leakage.
- [ ] F3. Runtime boundary and validator QA — unspecified-high — rerun runtime-boundary, workflow, and safe validation commands; inspect evidence.
- [ ] F4. Scope fidelity check — deep — confirm this plan did not runtime-promote content, did not edit unrelated textbook data, and preserved reviewed-manifest gating.

## Success Criteria
- This textbook is fully source-ingested into generated draft artifacts.
- No runtime content changes occur without future reviewed topic promotion.
