# Convert Remaining ShortAnswer MCQs

## TL;DR
> **Summary**: Continue the completed `textbook-shortanswer-to-mcq` pipeline and convert the remaining 421 textbook `shortAnswer` quiz placeholders into validated four-option MCQs across the three ready batches. Process each batch independently inside one plan, preserving the existing 91 generated organic MCQs and 26 hand-authored MCQs by ID and content.
> **Deliverables**:
> - Generated MCQ JSON files for grade8 full textbook, grade9 volume 1, and grade9 volume 2.
> - Per-batch dry-run/write reports under `.sisyphus/evidence/`.
> - Updated `src/data/quizData.json` for valid converted records only.
> - Aggregate reconciliation proving converted + skipped + remaining equals the initial 421 scope.
> - Build, validator, and browser QA evidence covering one newly converted MCQ from each batch.
> **Effort**: Large
> **Parallel**: YES - 5 waves
> **Critical Path**: Task 1 → Tasks 2-4 → Task 5 → Tasks 6-8 → Task 9 → Task 10 → Final Verification

## Context
### Original Request
The user completed `.sisyphus/plans/textbook-shortanswer-to-mcq.md`, manually verified some generated test questions, and chose to continue converting the remaining questions. When asked for execution granularity, the user selected converting all remaining 421 records in one work plan.

### Interview Summary
- Continue from the completed first-batch conversion pipeline rather than redesigning it.
- Process all remaining 421 records in one plan.
- Preserve the prior no-human-review policy: generated records either pass automated validation or are skipped/reported with reasons.
- Do not revise the already converted 91 organic generated MCQs or 26 hand-authored MCQs unless an automated preservation check exposes corruption caused by this work.

### Metis Review (gaps addressed)
- Added mandatory preflight recount to detect stale evidence before generation/write.
- Treat the 3 remaining batches as separate execution units inside one plan.
- Preserve existing 117 MCQs by ID and content, not only by count.
- Require dry-run before write for every batch.
- Require per-batch and aggregate evidence reports.
- Browser QA must inspect at least one converted item from each of the 3 new batches.
- Acceptance allows automated skips only with machine-readable reasons; it never adds a human per-question review gate.

## Work Objectives
### Core Objective
Convert all valid remaining textbook `shortAnswer` placeholders into child-friendly Chinese four-option MCQs using the existing batch conversion pipeline, while proving automated validation, preservation, and runtime behavior with evidence.

### Deliverables
- `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json`
- `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json`
- `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json`
- `.sisyphus/evidence/mcq-conversion-rj-chemistry-grade8-54-2024-full.{json,md}`
- `.sisyphus/evidence/mcq-conversion-rj-chemistry-grade9-2024-vol1.{json,md}`
- `.sisyphus/evidence/mcq-conversion-rj-chemistry-grade9-2024-vol2.{json,md}`
- `.sisyphus/evidence/remaining-mcq-final-reconciliation.{json,md}`
- Updated `src/data/quizData.json` containing converted valid records from the three batches.
- Browser QA evidence for one newly converted MCQ from each batch.

### Definition of Done (verifiable conditions with commands)
- Preflight recount command exits `0` and confirms: total records `538`, generated organic MCQs `91`, hand-authored MCQs `26`, remaining placeholders `421`.
- Generated JSON exists for all three remaining batches and every generated item passes converter dry-run validation.
- For each batch, dry-run command exits `0` before write mode.
- For each batch, write command exits `0` and updates only records in that batch whose generated entries are valid.
- `node scripts/validate-quiz-data.mjs` exits `0` after each batch write and at final state.
- `npm run build` exits `0` after final conversion.
- Browser QA proves one generated MCQ from each new batch renders with four options, no `待复核`, and correct/incorrect scoring feedback.
- Final reconciliation proves: initial remaining scope `421`; `convertedNew + skippedNew + finalRemainingFromInitialScope = 421`; total quiz records remains `538`; preserved MCQ snapshot comparison passes.

### Must Have
- Process all three remaining batches inside this single plan:
  - `rj-chemistry-grade8-54-2024-full` — 157 records.
  - `rj-chemistry-grade9-2024-vol1` — 155 records.
  - `rj-chemistry-grade9-2024-vol2` — 109 records.
- Use existing scripts where possible: `scripts/convert-short-answer-mcqs.mjs` and `scripts/validate-quiz-data.mjs`.
- Generate batch JSON before write mode.
- Validate by dry-run before every write.
- Preserve source provenance fields and runtime record IDs.
- Preserve existing 91 organic generated MCQs and 26 hand-authored MCQs by content snapshot.
- Skip invalid/low-confidence generated entries only with explicit report fields: `id`, `sourceVolumeId`, `reason`, and `nextAction`.
- Keep evidence files under `.sisyphus/evidence/`.

### Must NOT Have
- No human per-question review gate.
- No placeholders in generated `question`, `options`, or `explanation`: `待复核`, `TODO`, `请补充`, `待填写`, `待确认`, `需人工`, or similar.
- No rewrite of existing 91 organic generated MCQs or 26 hand-authored MCQs.
- No conversion of records outside the 421 remaining scope.
- No modification of `src/data/quizData.js` unless runtime import analysis proves it is required; if required, document proof and synchronize only generated quiz data shape.
- No quiz UI redesign.
- No new dependencies unless the executor proves existing Node/browser tooling cannot perform required validation.
- No API keys/secrets in source, evidence, generated JSON, prompts, or command history.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: automated script validation + deterministic Node checks + build + browser smoke QA.
- QA policy: Every task includes happy-path and failure/edge scenarios.
- Batch policy: batch JSON generation can run in parallel; writes to `src/data/quizData.json` must be sequential.
- Skip policy: invalid generated entries must not be written; they remain placeholders only if reported with explicit machine-readable reasons.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}` plus per-batch reports.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. This plan has unavoidable sequential writes to one JSON data file, but generation and review work are parallelized.

Wave 1: Task 1 — preflight baseline and preservation snapshot.
Wave 2: Tasks 2-4 — generate batch MCQ JSON files in parallel.
Wave 3: Task 5 — dry-run all generated JSON and validate failure behavior.
Wave 4: Tasks 6-8 — sequential batch writes with validator after each write.
Wave 5: Tasks 9-10 — final reconciliation/reporting and browser/build QA.

### Dependency Matrix (full, all tasks)
- Task 1: no dependencies; blocks Tasks 2-10.
- Task 2: blocked by Task 1; blocks Task 5.
- Task 3: blocked by Task 1; blocks Task 5.
- Task 4: blocked by Task 1; blocks Task 5.
- Task 5: blocked by Tasks 2-4; blocks Tasks 6-8.
- Task 6: blocked by Task 5; blocks Task 7 and contributes to Tasks 9-10.
- Task 7: blocked by Task 6; blocks Task 8 and contributes to Tasks 9-10.
- Task 8: blocked by Task 7; blocks Tasks 9-10.
- Task 9: blocked by Tasks 6-8; blocks Final Verification.
- Task 10: blocked by Tasks 6-8; blocks Final Verification.
- Final Verification: blocked by Tasks 1-10.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 1 task → `deep`.
- Wave 2 → 3 tasks → `unspecified-high` x3.
- Wave 3 → 1 task → `unspecified-high`.
- Wave 4 → 3 tasks → `unspecified-high` x3.
- Wave 5 → 2 tasks → `deep`, `unspecified-high`.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Preflight Recount and Preservation Snapshot

  **What to do**: Confirm the current runtime state before any generation or write. Create a machine-readable baseline snapshot of all records that must not change: the existing 91 organic generated MCQs and 26 hand-authored MCQs. Save counts to `.sisyphus/evidence/task-1-remaining-mcq-preflight.json` and the preservation snapshot to `.sisyphus/evidence/task-1-preserved-mcq-snapshot-before.json`.
  **Must NOT do**: Do not generate questions. Do not modify `src/data/quizData.json`. Do not rely only on prior evidence if the live file differs.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: establishes safety baseline and stale-evidence detection before mutation.
  - Skills: [] - Local data analysis only.
  - Omitted: [`playwright`] - No browser work.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Tasks 2-10 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Prior plan: `.sisyphus/plans/textbook-shortanswer-to-mcq.md:42-48` - original done conditions.
  - Prior totals: `.sisyphus/evidence/task-8-report-totals.md:13-37` - expected current runtime counts.
  - Remaining batches: `.sisyphus/evidence/mcq-remaining-batches.md:12-25` - 421 records across 3 ready batches.
  - Runtime data: `src/data/quizData.json` - authoritative quiz records.

  **Acceptance Criteria** (agent-executable only):
  - [ ] A Node count command confirms total quiz records `538`.
  - [ ] Existing generated organic MCQs count is `91` for `sourceVolumeId === "rj-chemistry-g12-selective-3-organic-2019"` and `generatedFromShortAnswer === true`.
  - [ ] Existing hand-authored MCQ count is `26` for records where `category !== "shortAnswer"` and `generatedFromShortAnswer !== true`.
  - [ ] Remaining `shortAnswer` count is `421` with batch counts: grade8 `157`, grade9 vol1 `155`, grade9 vol2 `109`.
  - [ ] Preservation snapshot includes IDs and stable content hashes for all 117 protected MCQs.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Current runtime baseline matches expected scope
    Tool: Bash
    Steps: Run a Node script against `src/data/quizData.json` that emits total, generated organic, hand-authored, remaining shortAnswer, and remaining shortAnswer by `sourceVolumeId` to `.sisyphus/evidence/task-1-remaining-mcq-preflight.json`.
    Expected: JSON contains total=538, organicGenerated=91, handAuthored=26, shortAnswer=421, and batch counts 157/155/109.
    Evidence: .sisyphus/evidence/task-1-remaining-mcq-preflight.json

  Scenario: Protected MCQ snapshot is complete
    Tool: Bash
    Steps: Generate `.sisyphus/evidence/task-1-preserved-mcq-snapshot-before.json` containing each protected record ID plus SHA-256 hash of the canonical JSON string for that record.
    Expected: Snapshot length is 117 and contains no `category: "shortAnswer"` records.
    Evidence: .sisyphus/evidence/task-1-preserved-mcq-snapshot-before.json
  ```

  **Commit**: NO | Message: n/a | Files: `.sisyphus/evidence/task-1-*`

- [x] 2. Generate Grade 8 Full Textbook MCQ JSON

  **What to do**: Generate `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json` for the 157 records in `rj-chemistry-grade8-54-2024-full`. Use the prior generation contract: child-friendly Chinese MCQ, exactly 4 unique options, integer `correctIndex`, explanation, difficulty `基础`/`进阶`/`挑战`, category not `shortAnswer`, preserved provenance, and no placeholder text. Use textbook source context and general chemistry knowledge; if a record cannot be confidently generated, encode it as a skipped entry according to the existing converter/report format rather than fabricating.
  **Must NOT do**: Do not write runtime data. Do not alter generated JSON for other batches. Do not include API keys or provider metadata beyond non-secret `generationSource`/`generationModel`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: high-volume educational data generation with schema constraints.
  - Skills: [] - Data generation and validation.
  - Omitted: [`frontend-design`] - No UI design.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 5 | Blocked By: Task 1

  **References** (executor has NO interview context - be exhaustive):
  - Operator guide: `.sisyphus/evidence/mcq-generation-operator-guide.md:70-86` - grade8 dry-run/write paths.
  - Remaining map: `.sisyphus/evidence/mcq-remaining-batches.md:14-18` - grade8 count and readiness.
  - Prior generated JSON example: `.sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json` - output shape to follow.
  - Source batch candidates: `src/data/textbookIngestion/generated/rj-chemistry-grade8-54-2024-full/quiz-candidates.json` - source candidate data.
  - Runtime data: `src/data/quizData.json` - target record IDs and existing fields.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Generated JSON file exists at `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json`.
  - [ ] It accounts for 157 grade8 target IDs as generated or explicitly skipped.
  - [ ] Every generated MCQ has exactly four unique non-empty options and valid `correctIndex` `0..3`.
  - [ ] No generated field contains placeholder text.
  - [ ] Every generated entry preserves or references the original runtime ID and source volume.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Grade8 generated JSON covers the batch
    Tool: Bash
    Steps: Run a Node check comparing generated/skipped IDs in `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json` to runtime `shortAnswer` IDs for `sourceVolumeId === "rj-chemistry-grade8-54-2024-full"`.
    Expected: Exactly 157 target IDs accounted for and no IDs outside the grade8 batch.
    Evidence: .sisyphus/evidence/task-2-grade8-generated-json-check.txt

  Scenario: Grade8 malformed output is rejected locally
    Tool: Bash
    Steps: Run a Node validation snippet over the generated JSON checking option count, duplicate options, correctIndex range, difficulty enum, placeholder text, and missing explanation.
    Expected: Zero validation errors for generated entries; skipped entries include non-empty reasons.
    Evidence: .sisyphus/evidence/task-2-grade8-generated-json-validation.txt
  ```

  **Commit**: YES | Message: `data(quiz): generate grade8 textbook MCQs` | Files: `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json`, `.sisyphus/evidence/task-2-*`

- [x] 3. Generate Grade 9 Volume 1 MCQ JSON

  **What to do**: Generate `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json` for the 155 records in `rj-chemistry-grade9-2024-vol1`. Apply the same generation contract and skip policy as Task 2. Match generated entries by runtime `id` and preserve source provenance.
  **Must NOT do**: Do not write runtime data. Do not modify grade8 or grade9 vol2 generated files. Do not create placeholder/low-confidence questions for later human cleanup.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: high-volume educational data generation with chemistry correctness constraints.
  - Skills: [] - Data generation and validation.
  - Omitted: [`frontend-design`] - No UI design.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 5 | Blocked By: Task 1

  **References** (executor has NO interview context - be exhaustive):
  - Operator guide: `.sisyphus/evidence/mcq-generation-operator-guide.md:88-100` - grade9 volume 1 commands.
  - Remaining map: `.sisyphus/evidence/mcq-remaining-batches.md:14-18` - grade9 vol1 count and readiness.
  - Prior generated JSON example: `.sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json` - output shape to follow.
  - Source batch candidates: `src/data/textbookIngestion/generated/rj-chemistry-grade9-2024-vol1/quiz-candidates.json` - source candidate data.
  - Runtime data: `src/data/quizData.json` - target record IDs and existing fields.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Generated JSON file exists at `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json`.
  - [ ] It accounts for 155 grade9 vol1 target IDs as generated or explicitly skipped.
  - [ ] Every generated MCQ has exactly four unique non-empty options and valid `correctIndex` `0..3`.
  - [ ] No generated field contains placeholder text.
  - [ ] Every generated entry preserves or references the original runtime ID and source volume.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Grade9 volume 1 generated JSON covers the batch
    Tool: Bash
    Steps: Run a Node check comparing generated/skipped IDs in `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json` to runtime `shortAnswer` IDs for `sourceVolumeId === "rj-chemistry-grade9-2024-vol1"`.
    Expected: Exactly 155 target IDs accounted for and no IDs outside the grade9 vol1 batch.
    Evidence: .sisyphus/evidence/task-3-grade9-vol1-generated-json-check.txt

  Scenario: Grade9 volume 1 malformed output is rejected locally
    Tool: Bash
    Steps: Run a Node validation snippet over the generated JSON checking option count, duplicate options, correctIndex range, difficulty enum, placeholder text, and missing explanation.
    Expected: Zero validation errors for generated entries; skipped entries include non-empty reasons.
    Evidence: .sisyphus/evidence/task-3-grade9-vol1-generated-json-validation.txt
  ```

  **Commit**: YES | Message: `data(quiz): generate grade9 volume1 textbook MCQs` | Files: `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json`, `.sisyphus/evidence/task-3-*`

- [x] 4. Generate Grade 9 Volume 2 MCQ JSON

  **What to do**: Generate `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json` for the 109 records in `rj-chemistry-grade9-2024-vol2`. Apply the same generation contract and skip policy as Tasks 2-3. Match generated entries by runtime `id` and preserve source provenance.
  **Must NOT do**: Do not write runtime data. Do not modify grade8 or grade9 vol1 generated files. Do not create placeholder/low-confidence questions for later human cleanup.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: high-volume educational data generation with chemistry correctness constraints.
  - Skills: [] - Data generation and validation.
  - Omitted: [`frontend-design`] - No UI design.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 5 | Blocked By: Task 1

  **References** (executor has NO interview context - be exhaustive):
  - Operator guide: `.sisyphus/evidence/mcq-generation-operator-guide.md:102-114` - grade9 volume 2 commands.
  - Remaining map: `.sisyphus/evidence/mcq-remaining-batches.md:14-18` - grade9 vol2 count and readiness.
  - Prior generated JSON example: `.sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json` - output shape to follow.
  - Source batch candidates: `src/data/textbookIngestion/generated/rj-chemistry-grade9-2024-vol2/quiz-candidates.json` - source candidate data.
  - Runtime data: `src/data/quizData.json` - target record IDs and existing fields.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Generated JSON file exists at `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json`.
  - [ ] It accounts for 109 grade9 vol2 target IDs as generated or explicitly skipped.
  - [ ] Every generated MCQ has exactly four unique non-empty options and valid `correctIndex` `0..3`.
  - [ ] No generated field contains placeholder text.
  - [ ] Every generated entry preserves or references the original runtime ID and source volume.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Grade9 volume 2 generated JSON covers the batch
    Tool: Bash
    Steps: Run a Node check comparing generated/skipped IDs in `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json` to runtime `shortAnswer` IDs for `sourceVolumeId === "rj-chemistry-grade9-2024-vol2"`.
    Expected: Exactly 109 target IDs accounted for and no IDs outside the grade9 vol2 batch.
    Evidence: .sisyphus/evidence/task-4-grade9-vol2-generated-json-check.txt

  Scenario: Grade9 volume 2 malformed output is rejected locally
    Tool: Bash
    Steps: Run a Node validation snippet over the generated JSON checking option count, duplicate options, correctIndex range, difficulty enum, placeholder text, and missing explanation.
    Expected: Zero validation errors for generated entries; skipped entries include non-empty reasons.
    Evidence: .sisyphus/evidence/task-4-grade9-vol2-generated-json-validation.txt
  ```

  **Commit**: YES | Message: `data(quiz): generate grade9 volume2 textbook MCQs` | Files: `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json`, `.sisyphus/evidence/task-4-*`

- [x] 5. Dry-Run All Remaining Batches and Prove Invalid-Input Safety

  **What to do**: Run converter dry-run with generated JSON for each of the three remaining batches before any write. Capture outputs to task evidence. Also prove invalid generated data cannot corrupt runtime data by running either the converter's existing negative/fixture path or a temporary copied malformed generated JSON input that is never written to `src/data/quizData.json`.
  **Must NOT do**: Do not run `--write`. Do not edit generated JSON to force success without preserving evidence of errors. Do not proceed to write tasks if any dry-run has unexpected invalid records not represented as explicit skips.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: validates three generated datasets and converter failure behavior before mutation.
  - Skills: [] - Node/data scripting.
  - Omitted: [`playwright`] - No browser work.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Tasks 6-8 | Blocked By: Tasks 2-4

  **References** (executor has NO interview context - be exhaustive):
  - Converter script: `scripts/convert-short-answer-mcqs.mjs` - dry-run/write behavior.
  - Validator script: `scripts/validate-quiz-data.mjs` - final runtime validation.
  - Operator guide: `.sisyphus/evidence/mcq-generation-operator-guide.md:70-128` - command patterns and report buckets.
  - Generated JSON files from Tasks 2-4.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Grade8 dry-run command exits `0`: `node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade8-54-2024-full --dry-run --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json`.
  - [ ] Grade9 vol1 dry-run command exits `0`: `node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol1 --dry-run --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json`.
  - [ ] Grade9 vol2 dry-run command exits `0`: `node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol2 --dry-run --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json`.
  - [ ] Dry-run leaves `src/data/quizData.json` unchanged by content hash.
  - [ ] Invalid generated fixture exits non-zero or reports invalid without modifying runtime data.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: All three batches pass dry-run without mutation
    Tool: Bash
    Steps: Record SHA-256 of `src/data/quizData.json`, run all three dry-run commands with generated JSON, record SHA-256 again.
    Expected: All dry-runs exit 0; before/after hash is identical; dry-run outputs include converted/skipped/invalid counts.
    Evidence: .sisyphus/evidence/task-5-all-batches-dry-run.txt

  Scenario: Invalid generated input cannot corrupt runtime data
    Tool: Bash
    Steps: Create or use a temporary malformed generated JSON outside committed source, run converter in dry-run or guarded mode, and compare runtime data hash before/after.
    Expected: Converter rejects malformed entry or reports invalid; runtime data hash remains unchanged.
    Evidence: .sisyphus/evidence/task-5-invalid-generated-safety.txt
  ```

  **Commit**: NO | Message: n/a | Files: `.sisyphus/evidence/task-5-*`

- [x] 6. Write Grade 8 Full Textbook Conversion

  **What to do**: After Task 5 passes, run write mode for `rj-chemistry-grade8-54-2024-full` using `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json`. Then run `node scripts/validate-quiz-data.mjs`, verify only grade8 target records changed, and update/report converted/skipped/invalid counts.
  **Must NOT do**: Do not write grade9 batches in this task. Do not modify protected MCQs. Do not proceed if write mode reports unexpected invalid entries without skip reasons.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: mutates canonical quiz data and requires careful diff/count validation.
  - Skills: [] - Node/data scripting.
  - Omitted: [`playwright`] - Browser work deferred to Task 10.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Task 7 and contributes to Tasks 9-10 | Blocked By: Task 5

  **References** (executor has NO interview context - be exhaustive):
  - Write command pattern: `.sisyphus/evidence/mcq-generation-operator-guide.md:82-86`.
  - Runtime data: `src/data/quizData.json` - only file expected to change under source.
  - Preservation snapshot: `.sisyphus/evidence/task-1-preserved-mcq-snapshot-before.json` - protected records must still match.
  - Validator: `scripts/validate-quiz-data.mjs` - must pass after write.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Write command exits `0`: `node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade8-54-2024-full --write --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json`.
  - [ ] `node scripts/validate-quiz-data.mjs` exits `0` after write.
  - [ ] Grade8 remaining `shortAnswer` count decreases by the number of valid generated entries; any remaining grade8 placeholders equal explicit skipped count.
  - [ ] Existing protected 117 MCQ snapshot still matches.
  - [ ] Conversion report exists and contains converted/skipped/invalid counts.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Grade8 valid entries are written and validated
    Tool: Bash
    Steps: Run grade8 write command, then `node scripts/validate-quiz-data.mjs`, then count grade8 generated/remaining/skipped IDs.
    Expected: Commands exit 0; grade8 converted count equals valid generated count; invalid written count is 0.
    Evidence: .sisyphus/evidence/task-6-grade8-write-validation.txt

  Scenario: Grade8 write does not touch protected MCQs
    Tool: Bash
    Steps: Recompute protected MCQ content hashes from `src/data/quizData.json` and compare to `.sisyphus/evidence/task-1-preserved-mcq-snapshot-before.json`.
    Expected: All 117 protected IDs and hashes match exactly.
    Evidence: .sisyphus/evidence/task-6-grade8-preservation-check.txt
  ```

  **Commit**: YES | Message: `data(quiz): convert grade8 textbook MCQs` | Files: `src/data/quizData.json`, `.sisyphus/evidence/mcq-conversion-rj-chemistry-grade8-54-2024-full.*`, `.sisyphus/evidence/task-6-*`

- [x] 7. Write Grade 9 Volume 1 Conversion

  **What to do**: After Task 6 passes, run write mode for `rj-chemistry-grade9-2024-vol1` using `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json`. Then run `node scripts/validate-quiz-data.mjs`, verify only grade9 vol1 target records changed in this task, and update/report converted/skipped/invalid counts.
  **Must NOT do**: Do not write grade9 vol2 in this task. Do not modify grade8 records already converted except through validator/report reads. Do not modify protected MCQs.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: mutates canonical quiz data and requires sequential safety checks.
  - Skills: [] - Node/data scripting.
  - Omitted: [`playwright`] - Browser work deferred to Task 10.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Task 8 and contributes to Tasks 9-10 | Blocked By: Task 6

  **References** (executor has NO interview context - be exhaustive):
  - Write command pattern: `.sisyphus/evidence/mcq-generation-operator-guide.md:96-100`.
  - Runtime data: `src/data/quizData.json` - only file expected to change under source.
  - Preservation snapshot: `.sisyphus/evidence/task-1-preserved-mcq-snapshot-before.json` - protected records must still match.
  - Validator: `scripts/validate-quiz-data.mjs` - must pass after write.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Write command exits `0`: `node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol1 --write --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json`.
  - [ ] `node scripts/validate-quiz-data.mjs` exits `0` after write.
  - [ ] Grade9 vol1 remaining `shortAnswer` count decreases by the number of valid generated entries; any remaining grade9 vol1 placeholders equal explicit skipped count.
  - [ ] Grade8 converted counts remain stable after this write.
  - [ ] Existing protected 117 MCQ snapshot still matches.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Grade9 volume 1 valid entries are written and validated
    Tool: Bash
    Steps: Run grade9 vol1 write command, then `node scripts/validate-quiz-data.mjs`, then count grade9 vol1 generated/remaining/skipped IDs.
    Expected: Commands exit 0; grade9 vol1 converted count equals valid generated count; invalid written count is 0.
    Evidence: .sisyphus/evidence/task-7-grade9-vol1-write-validation.txt

  Scenario: Grade9 volume 1 write preserves prior conversions and protected MCQs
    Tool: Bash
    Steps: Verify grade8 generated counts are unchanged and recompute protected MCQ hashes against `.sisyphus/evidence/task-1-preserved-mcq-snapshot-before.json`.
    Expected: Grade8 counts stable; all 117 protected IDs and hashes match exactly.
    Evidence: .sisyphus/evidence/task-7-grade9-vol1-preservation-check.txt
  ```

  **Commit**: YES | Message: `data(quiz): convert grade9 volume1 textbook MCQs` | Files: `src/data/quizData.json`, `.sisyphus/evidence/mcq-conversion-rj-chemistry-grade9-2024-vol1.*`, `.sisyphus/evidence/task-7-*`

- [x] 8. Write Grade 9 Volume 2 Conversion

  **What to do**: After Task 7 passes, run write mode for `rj-chemistry-grade9-2024-vol2` using `.sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json`. Then run `node scripts/validate-quiz-data.mjs`, verify only grade9 vol2 target records changed in this task, and update/report converted/skipped/invalid counts.
  **Must NOT do**: Do not modify grade8 or grade9 vol1 records already converted except through validator/report reads. Do not modify protected MCQs.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: final sequential data write and validation before aggregate reconciliation.
  - Skills: [] - Node/data scripting.
  - Omitted: [`playwright`] - Browser work deferred to Task 10.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Tasks 9-10 | Blocked By: Task 7

  **References** (executor has NO interview context - be exhaustive):
  - Write command pattern: `.sisyphus/evidence/mcq-generation-operator-guide.md:110-114`.
  - Runtime data: `src/data/quizData.json` - only file expected to change under source.
  - Preservation snapshot: `.sisyphus/evidence/task-1-preserved-mcq-snapshot-before.json` - protected records must still match.
  - Validator: `scripts/validate-quiz-data.mjs` - must pass after write.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Write command exits `0`: `node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol2 --write --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json`.
  - [ ] `node scripts/validate-quiz-data.mjs` exits `0` after write.
  - [ ] Grade9 vol2 remaining `shortAnswer` count decreases by the number of valid generated entries; any remaining grade9 vol2 placeholders equal explicit skipped count.
  - [ ] Grade8 and grade9 vol1 converted counts remain stable after this write.
  - [ ] Existing protected 117 MCQ snapshot still matches.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Grade9 volume 2 valid entries are written and validated
    Tool: Bash
    Steps: Run grade9 vol2 write command, then `node scripts/validate-quiz-data.mjs`, then count grade9 vol2 generated/remaining/skipped IDs.
    Expected: Commands exit 0; grade9 vol2 converted count equals valid generated count; invalid written count is 0.
    Evidence: .sisyphus/evidence/task-8-grade9-vol2-write-validation.txt

  Scenario: Grade9 volume 2 write preserves earlier conversions and protected MCQs
    Tool: Bash
    Steps: Verify grade8 and grade9 vol1 generated counts are unchanged and recompute protected MCQ hashes against `.sisyphus/evidence/task-1-preserved-mcq-snapshot-before.json`.
    Expected: Earlier-batch counts stable; all 117 protected IDs and hashes match exactly.
    Evidence: .sisyphus/evidence/task-8-grade9-vol2-preservation-check.txt
  ```

  **Commit**: YES | Message: `data(quiz): convert grade9 volume2 textbook MCQs` | Files: `src/data/quizData.json`, `.sisyphus/evidence/mcq-conversion-rj-chemistry-grade9-2024-vol2.*`, `.sisyphus/evidence/task-8-*`

- [x] 9. Aggregate Reconciliation and Operator Report Update

  **What to do**: Produce final machine-readable and markdown reconciliation reports proving all initial 421 records are accounted for as converted, skipped, or still remaining due to explicit skip reasons. Update `.sisyphus/evidence/mcq-generation-operator-guide.md` or create a new internal evidence note with final commands/results for the remaining-batch conversion. Compare final protected MCQ content hashes to the Task 1 snapshot.
  **Must NOT do**: Do not change runtime quiz data in this task unless the reconciliation command exposes a concrete bug from Tasks 6-8 that must be fixed and revalidated. Do not publish docs outside `.sisyphus/evidence/`.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: cross-checks counts, reports, preservation, and residual placeholders across all batches.
  - Skills: [] - Data analysis and evidence writing.
  - Omitted: [`playwright`] - Browser work handled in Task 10.

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: Final Verification | Blocked By: Tasks 6-8

  **References** (executor has NO interview context - be exhaustive):
  - Prior reconciliation pattern: `.sisyphus/evidence/task-8-report-totals.md:40-60`.
  - Operator guide: `.sisyphus/evidence/mcq-generation-operator-guide.md:116-128` - report bucket definitions.
  - Per-batch conversion reports from Tasks 6-8.
  - Preservation snapshot: `.sisyphus/evidence/task-1-preserved-mcq-snapshot-before.json`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `.sisyphus/evidence/remaining-mcq-final-reconciliation.json` exists and includes per-batch converted/skipped/invalid/remaining counts.
  - [ ] `.sisyphus/evidence/remaining-mcq-final-reconciliation.md` exists and summarizes the same counts.
  - [ ] Formula passes: `convertedNew + skippedNew + finalRemainingFromInitialScope === 421`.
  - [ ] Total quiz records remains `538`.
  - [ ] Protected MCQ snapshot comparison passes for all 117 records.
  - [ ] `node scripts/validate-quiz-data.mjs` exits `0` at final state.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Final counts reconcile the full 421-record scope
    Tool: Bash
    Steps: Run a Node reconciliation script over `src/data/quizData.json`, generated JSON files, and per-batch reports; emit JSON and markdown evidence.
    Expected: convertedNew + skippedNew + finalRemainingFromInitialScope equals 421; total records remains 538; invalidWritten equals 0.
    Evidence: .sisyphus/evidence/remaining-mcq-final-reconciliation.json

  Scenario: Operator report is copy-pasteable and complete
    Tool: Read / Bash
    Steps: Read final operator guide/report and verify it lists commands run, outputs, report paths, skip policy, and final totals.
    Expected: No missing batch IDs, no ambiguous manual-review instructions, and no secrets.
    Evidence: .sisyphus/evidence/task-9-operator-report-review.md
  ```

  **Commit**: YES | Message: `docs(evidence): reconcile remaining MCQ conversion` | Files: `.sisyphus/evidence/remaining-mcq-final-reconciliation.*`, `.sisyphus/evidence/mcq-generation-operator-guide.md`, `.sisyphus/evidence/task-9-*`

- [x] 10. Build and Browser QA for Three Newly Converted Batches

  **What to do**: Run production build and browser smoke QA after all writes. Use deterministic browser control if needed to render one newly converted generated MCQ from each batch: grade8 full textbook, grade9 volume 1, and grade9 volume 2. For each sampled question, verify four options, no placeholder text, correct answer feedback, incorrect answer feedback, score behavior, and no console errors related to the quiz flow.
  **Must NOT do**: Do not redesign UI. Do not add Playwright test infrastructure unless necessary for deterministic QA evidence. Do not use human visual confirmation as the pass condition.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: browser QA with deterministic setup and evidence capture.
  - Skills: [`playwright`] - Browser automation required.
  - Omitted: [`frontend-design`] - QA only, no design changes.

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: Final Verification | Blocked By: Tasks 6-8

  **References** (executor has NO interview context - be exhaustive):
  - Prior browser QA evidence: `.sisyphus/evidence/task-7-generated-scoring.md:10-43` - deterministic QA method and expected observations.
  - Quiz UI module: `src/modules/quiz.js` - runtime quiz behavior.
  - Build command: `package.json` script `npm run build`.
  - Runtime data: `src/data/quizData.json` - identify converted record IDs from each batch.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run build` exits `0`.
  - [ ] Browser QA captures one generated MCQ from `rj-chemistry-grade8-54-2024-full` with four options and no placeholder text.
  - [ ] Browser QA captures one generated MCQ from `rj-chemistry-grade9-2024-vol1` with four options and no placeholder text.
  - [ ] Browser QA captures one generated MCQ from `rj-chemistry-grade9-2024-vol2` with four options and no placeholder text.
  - [ ] Correct and incorrect answer flows are verified for at least one sampled question, and option rendering is verified for all three samples.
  - [ ] Console has no quiz-flow errors; favicon 404 alone does not fail QA if unrelated.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Build succeeds after remaining conversion
    Tool: Bash
    Steps: Run `npm run build` and capture stdout/stderr.
    Expected: Exit 0; existing large-chunk warnings are acceptable if build succeeds.
    Evidence: .sisyphus/evidence/task-10-build.txt

  Scenario: Browser renders one converted MCQ from each new batch
    Tool: Playwright
    Steps: Start dev server with `npm run dev`; use deterministic quiz selection or runtime state injection to display one generated MCQ from each of the three new sourceVolumeIds; capture question text, options, placeholder check, and screenshots.
    Expected: Each sample has exactly four visible options, no `待复核` text, and category/difficulty display does not break the modal.
    Evidence: .sisyphus/evidence/task-10-browser-three-batches.md and .sisyphus/evidence/task-10-*.png

  Scenario: Generated MCQ scoring still works
    Tool: Playwright
    Steps: For one sampled newly converted question, answer correctly in one run and incorrectly in another.
    Expected: Correct feedback increments score; incorrect feedback marks correct option and does not increment score; next navigation remains usable.
    Evidence: .sisyphus/evidence/task-10-scoring.md
  ```

  **Commit**: YES | Message: `test(quiz): verify remaining generated MCQs` | Files: `.sisyphus/evidence/task-10-*`




## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Data Quality and Preservation Review — unspecified-high
- [x] F3. Real Browser QA Review — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity and Safety Check — deep

## Commit Strategy
- Follow each task's `Commit` field if the executing session is asked to commit work.
- If combining commits is required by user preference, keep source-data mutation separate from QA-only evidence:
  1. `data(quiz): generate remaining textbook MCQs` — `src/data/quizData.json`, generated JSON evidence, conversion reports, reconciliation evidence.
  2. `test(quiz): verify remaining generated MCQs` — browser/build/validator evidence only, if evidence is committed by repository convention.
- Commit generated batch data and reports separately from any script fixes if script fixes are needed.
- Do not commit API credentials, build artifacts, dev-server logs unless they are already accepted evidence artifacts and contain no secrets.
- Do not amend prior commits unless explicitly instructed and safe under git protocol.

## Success Criteria
- All three remaining ready batches have generated JSON, dry-run evidence, and write/report evidence.
- All valid generated entries are converted to MCQs; any non-converted records are explicitly skipped with machine-readable reasons.
- Existing 91 organic generated MCQs and 26 hand-authored MCQs are preserved by snapshot comparison.
- `node scripts/validate-quiz-data.mjs` and `npm run build` pass.
- Browser QA covers one newly converted MCQ from grade8, grade9 vol1, and grade9 vol2.
- Aggregate reconciliation proves the original remaining 421 scope is fully accounted for.
