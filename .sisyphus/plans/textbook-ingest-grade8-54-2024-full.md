# Textbook Ingest: 2024版人教版（五·四学制）八年级化学全一册

## TL;DR
> **Summary**: Register and process `src/data/textbooks/2024版人教版（五·四学制）八年级化学全一册/book.md` through the reusable textbook ingestion workflow as generated, non-runtime draft content.
> **Deliverables**: Batch contract, source inventory, draft inventories, experiment backlog, reviewed manifest scaffold, validation evidence.
> **Effort**: Medium
> **Parallel**: NO
> **Critical Path**: Task 1 → 2 → 3 → 4 → Final Verification

## Context
### Original Request
Create one executable `/start-work` task for this textbook so it can be processed with the reusable workflow.

### Fixed Decisions
- Source textbook: `src/data/textbooks/2024版人教版（五·四学制）八年级化学全一册/book.md`
- Stable ingestion volume ID: `rj-chemistry-grade8-54-2024-full`
- Runtime promotion: excluded until a reviewed topic manifest is deliberately authored.

## Work Objectives
### Core Objective
Make the 五四制八年级全一册 textbook available as validated generated draft content without runtime leakage.

### Definition of Done
- Batch validation, extraction, draft generation, experiment backlog validation, workflow validation, runtime boundary validation, and `validate:all:safe` all pass for `rj-chemistry-grade8-54-2024-full`.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after via existing npm validators.
- Evidence: `.sisyphus/evidence/grade8-54-2024-full-task-{N}.txt`.

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
- Task 4 must also prove `npm run validate:textbook-runtime-boundary` passes and `npm run textbook:promote -- --textbook rj-chemistry-grade8-54-2024-full --topic unreviewed-generated-topic` remains blocked with `Promotion blocked`.

## TODOs
- [ ] 1. Register textbook batch and script support

  **What to do**: Create `src/data/textbookIngestion/batches/rj-chemistry-grade8-54-2024-full.json` with computed `sourceHash`, source path above, asset root, schemaVersion, status, activeBatchId, and generatedAt. Add the volume ID to known textbook maps in textbook scripts.
  **Must NOT do**: Do not import this batch into runtime modules.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: shared script support.
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-4 | Blocked By: none

  **References**:
  - Batch pattern: `src/data/textbookIngestion/batches/rj-chemistry-grade9-2024-vol1.json`
  - Source: `src/data/textbooks/2024版人教版（五·四学制）八年级化学全一册/book.md`

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-batch -- --textbook rj-chemistry-grade8-54-2024-full` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Batch validates
    Tool: Bash
    Steps: npm run validate:textbook-batch -- --textbook rj-chemistry-grade8-54-2024-full
    Expected: exit 0
    Evidence: .sisyphus/evidence/grade8-54-2024-full-task-1-batch.txt
  ```

  **Commit**: NO

- [ ] 2. Extract source inventory

  **What to do**: Run extraction for `rj-chemistry-grade8-54-2024-full` and produce deterministic `source-inventory.json`.
  **Must NOT do**: Do not modify runtime data files.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: deterministic command execution.
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 3-4 | Blocked By: 1

  **References**:
  - Extractor: `scripts/textbook/extract-textbook.mjs`

  **Acceptance Criteria**:
  - [ ] `npm run textbook:extract -- --textbook rj-chemistry-grade8-54-2024-full` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Extract source inventory
    Tool: Bash
    Steps: npm run textbook:extract -- --textbook rj-chemistry-grade8-54-2024-full
    Expected: exit 0; stdout includes Extracted sections
    Evidence: .sisyphus/evidence/grade8-54-2024-full-task-2-extract.txt
  ```

  **Commit**: NO

- [ ] 3. Generate draft candidates and deferred experiment backlog

  **What to do**: Generate all draft candidate surfaces and validate generated drafts plus experiment backlog.
  **Must NOT do**: Do not mark drafts reviewed/promoted/runtimeEligible.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: generated artifacts across many surfaces.
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 4 | Blocked By: 2

  **References**:
  - Draft generator: `scripts/textbook/generate-drafts.mjs`
  - Draft schema validator: `scripts/textbook/validate-draft-schema.mjs`

  **Acceptance Criteria**:
  - [ ] `npm run textbook:generate-drafts -- --textbook rj-chemistry-grade8-54-2024-full` exits `0`.
  - [ ] `npm run validate:textbook-drafts -- --textbook rj-chemistry-grade8-54-2024-full` exits `0`.
  - [ ] `npm run validate:textbook-experiments -- --textbook rj-chemistry-grade8-54-2024-full` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Draft generation validates
    Tool: Bash
    Steps: npm run textbook:generate-drafts -- --textbook rj-chemistry-grade8-54-2024-full && npm run validate:textbook-drafts -- --textbook rj-chemistry-grade8-54-2024-full
    Expected: exit 0
    Evidence: .sisyphus/evidence/grade8-54-2024-full-task-3-drafts.txt
  ```

  **Commit**: NO

- [ ] 4. Create reviewed manifest scaffold and final gates

  **What to do**: Create empty reviewed manifest scaffold under `src/data/textbookIngestion/reviewed/rj-chemistry-grade8-54-2024-full/promotion-manifest.json`, then run workflow and safe validators.
  **Must NOT do**: Do not promote runtime records.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: integration gates.
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: final | Blocked By: 1-3

  **References**:
  - Workflow validator: `scripts/textbook/validate-workflow.mjs`

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-workflow -- --textbook rj-chemistry-grade8-54-2024-full` exits `0`.
  - [ ] `npm run validate:textbook-runtime-boundary` exits `0`.
  - [ ] `npm run validate:all:safe` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Full workflow validates
    Tool: Bash
    Steps: npm run validate:textbook-workflow -- --textbook rj-chemistry-grade8-54-2024-full && npm run validate:all:safe
    Expected: exit 0
    Evidence: .sisyphus/evidence/grade8-54-2024-full-task-4-workflow.txt
  ```

  **Commit**: NO

## Final Verification Wave
> Run F1-F4 in PARALLEL after Tasks 1-4. ALL must approve. Present consolidated findings to the user and wait for explicit approval before marking complete.
- [ ] F1. Plan compliance audit — oracle — verify every acceptance criterion, evidence file, and dependency above was satisfied.
- [ ] F2. Code quality review — unspecified-high — review script/batch additions for maintainability, deterministic output, and no generated/runtime leakage.
- [ ] F3. Runtime boundary and validator QA — unspecified-high — rerun runtime-boundary, workflow, and safe validation commands; inspect evidence.
- [ ] F4. Scope fidelity check — deep — confirm this plan did not runtime-promote content, did not edit unrelated textbook data, and preserved reviewed-manifest gating.

## Success Criteria
- Textbook artifacts are generated and validated.
- Generated content remains outside runtime until reviewed.
- Workflow can be rerun deterministically for this volume.
