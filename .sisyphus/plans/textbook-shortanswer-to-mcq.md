# Generate Textbook ShortAnswer MCQs

## TL;DR
> **Summary**: Build an automated AI-assisted data pipeline that converts textbook-derived `shortAnswer` placeholder quiz records into four-option multiple-choice questions by grade/textbook batch, starting with the complete 91-record organic chemistry batch and then extending the same pipeline to the remaining source batches.
> **Deliverables**:
> - Batch-aware conversion script with dry-run and write modes.
> - Quiz data validator for generated MCQ shape, provenance, and placeholder absence.
> - Updated `src/data/quizData.json` records for convertible batches, preserving existing hand-authored MCQs.
> - Conversion reports under `.sisyphus/evidence/` with converted/skipped/invalid counts.
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5 → Task 7 → Final Verification

## Context
### Original Request
User asked how to handle `待复核` questions and said they want AI to use textbook understanding to make the 512 pending-review records into multiple-choice questions.

### Interview Summary
- User wants fully automated AI generation; no human review gate.
- User trusts AI-selected answers/tags as generally correct for chemistry popularization and does not require strict word-for-word textbook matching.
- Scope sequencing: convert by grade/textbook batch.
- Question style: mixed layering with `基础` / `进阶` / `挑战` difficulty labels.

### Metis Review (gaps addressed)
- Start with the complete 91-record organic chemistry batch as the first vertical slice, then apply the same pipeline batch-by-batch.
- Preserve all provenance/source references from placeholder records.
- Do not rewrite hand-authored 26 MCQs except to preserve them in output.
- Define canonical runtime source as `src/data/quizData.json`; leave `src/data/quizData.js` unchanged unless executor proves it must be synchronized.
- Fully automated does not mean blind fabrication: records missing source context or unable to produce valid MCQ shape are skipped with a machine-readable report.

## Work Objectives
### Core Objective
Create a repeatable, agent-executable pipeline that converts textbook `shortAnswer` placeholders into valid runtime MCQs using local textbook source context and AI generation rules, without requiring user/human review.

### Deliverables
- `scripts/convert-short-answer-mcqs.mjs` with `--batch`, `--dry-run`, `--generated <file>`, `--write`, and `--all-ready-batches` support.
- `scripts/validate-quiz-data.mjs` or an equivalent validator focused on generated quiz data.
- Generated reports for every processed batch: `.sisyphus/evidence/mcq-conversion-{batch}.json` and summary markdown.
- Updated `src/data/quizData.json` for processed records only.
- Evidence proving existing 26 hand-authored MCQs remain present and valid.

### Definition of Done (verifiable conditions with commands)
- `node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-g12-selective-3-organic-2019 --dry-run` exits `0` and prints counts.
- `node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-g12-selective-3-organic-2019 --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json --write` exits `0`, updates targeted records, and writes a report.
- `node scripts/validate-quiz-data.mjs` exits `0` for converted records.
- `npm run build` exits `0`.
- Browser QA opens full quiz and observes converted/generated MCQs have exactly four options and no `待复核`.

### Must Have
- Fully automatic generation; no human review gate.
- Batch grouping by textbook/grade; first implementation batch is `rj-chemistry-g12-selective-3-organic-2019`.
- AI generation prompt/template that uses nearby textbook context plus general chemistry knowledge for child-friendly popularization.
- Difficulty enum exactly one of `基础`, `进阶`, `挑战` for generated records.
- Four unique options after trimming whitespace.
- `correctIndex` integer `0..3`, pointing to the correct answer.
- Non-empty explanation that contains no placeholder text.
- Preserve `id`, `sourceReferences`, `sourceVolumeId`, source line/hash fields, and textbook asset references where present.
- Report skipped records with explicit reason, not silent failure.

### Must NOT Have
- No manual review step or “user confirms each generated question.”
- No generated option/explanation containing `待复核`, `TODO`, `请补充`, `待填写`, or similar placeholders.
- No rewrite of existing 26 hand-authored MCQs.
- No broad quiz UI redesign.
- No package dependency additions unless unavoidable; prefer Node built-ins.
- No secrets/API keys committed. Default generation path is agent-generated JSON using the executing AI agent; external provider integration is optional and must use environment variables only.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: automated script validation + build + browser smoke QA. No human review gate.
- AI correctness policy: educational plausibility and basic chemistry correctness, grounded in source context when available; exact textbook wording is not required.
- Evidence: `.sisyphus/evidence/mcq-conversion-{batch}.{json,md}`, `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
Wave 1: Tasks 1-2 inventory and generator contract.
Wave 2: Tasks 3-4 converter and validator implementation.
Wave 3: Tasks 5-6 first batch generation and remaining-batch readiness mapping.
Wave 4: Tasks 7-8 build/browser QA and documentation/report cleanup.

### Dependency Matrix (full, all tasks)
- Task 1: no dependencies; blocks Tasks 2, 3, 6.
- Task 2: blocked by Task 1; blocks Task 3.
- Task 3: blocked by Tasks 1-2; blocks Tasks 5 and 6.
- Task 4: blocked by Task 1; can run parallel with Task 3; blocks Task 5.
- Task 5: blocked by Tasks 3-4; blocks Tasks 7-8.
- Task 6: blocked by Tasks 1 and 3; can run parallel with Task 5 after converter exists.
- Task 7: blocked by Task 5.
- Task 8: blocked by Tasks 5-7.
- Final Verification: blocked by all tasks.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → `deep`, `writing`.
- Wave 2 → 2 tasks → `unspecified-high`, `quick`.
- Wave 3 → 2 tasks → `unspecified-high`, `deep`.
- Wave 4 → 2 tasks → `unspecified-high`, `writing`.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Build Batch Inventory and Source-Context Map

  **What to do**: Inspect all textbook ingestion generated/reviewed directories and `src/data/quizData.json`. Produce a batch inventory mapping every `shortAnswer` runtime record to source batch, textbook path, candidate ID, source line range/hash, and source text availability. Identify the complete first batch `rj-chemistry-g12-selective-3-organic-2019` and group remaining records by grade/textbook readiness. Save machine-readable inventory to `.sisyphus/evidence/mcq-batch-inventory.json` and summary to `.sisyphus/evidence/mcq-batch-inventory.md`.
  **Must NOT do**: Do not modify quiz data. Do not generate questions yet.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: must correlate runtime records with ingestion artifacts and source files.
  - Skills: [] - Local data analysis only.
  - Omitted: [`playwright`] - No browser work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 2, 3, 6 | Blocked By: none

  **References**:
  - Runtime data: `src/data/quizData.json` - 512 `shortAnswer` placeholders.
  - Runtime target: `src/data/textbookIngestion/runtimeTargetMap.js` - quiz target mapping.
  - Schema: `src/data/textbookIngestion/schemas/draftSchemas.js` - provenance contracts.
  - First batch inventory: `src/data/textbookIngestion/generated/rj-chemistry-g12-selective-3-organic-2019/draft-inventory.json`.
  - First batch candidates: `src/data/textbookIngestion/generated/rj-chemistry-g12-selective-3-organic-2019/quiz-candidates.json`.
  - First batch reviewed manifest: `src/data/textbookIngestion/reviewed/rj-chemistry-g12-selective-3-organic-2019/promotion-manifest.json`.
  - Source textbook: `src/data/textbooks/2019版人教版高中化学-选择性必修3 有机化学基础/book.md`.

  **Acceptance Criteria**:
  - [ ] Inventory reports total `shortAnswer` count as 512.
  - [ ] First batch reports 91 records and source text availability.
  - [ ] Every record has a status: `ready`, `missing-source`, `duplicate`, or `unsupported`.
  - [ ] Existing 26 MCQ records are counted but not marked for conversion.

  **QA Scenarios**:
  ```
  Scenario: Inventory covers all placeholders
    Tool: Bash
    Steps: Run the inventory command/script created in this task or a one-off Node command documented in evidence.
    Expected: JSON report totalShortAnswer=512 and no unclassified shortAnswer IDs.
    Evidence: .sisyphus/evidence/mcq-batch-inventory.json

  Scenario: First batch source trace is complete
    Tool: Bash
    Steps: Verify each of the 91 organic batch records maps to source text and sourceReferences.
    Expected: ready count for organic batch is 91 or every non-ready record has explicit reason.
    Evidence: .sisyphus/evidence/mcq-batch-inventory.md
  ```

  **Commit**: NO | Message: n/a | Files: `.sisyphus/evidence/*`

- [x] 2. Define AI MCQ Generation Contract and Prompt Template

  **What to do**: Create a local contract document or script-embedded template that specifies AI output JSON shape for each generated MCQ. Required generated fields: `question`, `options[4]`, `correctIndex`, `category`, `difficulty`, `curriculumTags`, `explanation`, `generatedFromShortAnswer: true`, `generationModel` or `generationSource`, and preserved provenance. Difficulty must be one of `基础`, `进阶`, `挑战`. Prompt must instruct AI to use textbook source context plus general chemistry knowledge for child-friendly education and avoid exact wording requirements.
  **Must NOT do**: Do not require human review. Do not include secrets or provider-specific credentials.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: precise generation contract and prompt writing.
  - Skills: [] - Technical writing + data contract.
  - Omitted: [`frontend-design`] - No UI.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 3 | Blocked By: Task 1

  **References**:
  - Existing quiz shape: `src/data/quizData.json` - valid MCQ records.
  - Existing MCQs: `src/data/quizData.js` - 26 hand-authored style examples.
  - Product context: `原始需求.txt` - Chinese-first children's chemistry learning intent.

  **Acceptance Criteria**:
  - [ ] Contract defines exact JSON schema and required fields.
  - [ ] Prompt forbids placeholder text and requires four unique options.
  - [ ] Prompt includes mixed difficulty layering.
  - [ ] Contract states low-confidence records are skipped with reason, not manually reviewed.

  **QA Scenarios**:
  ```
  Scenario: Contract catches malformed AI output
    Tool: Bash / inspection
    Steps: Compare contract against malformed sample cases: 3 options, duplicate option, invalid correctIndex, placeholder explanation.
    Expected: Each malformed case maps to a validator rejection rule.
    Evidence: .sisyphus/evidence/task-2-generation-contract.md

  Scenario: Child-friendly educational style is explicit
    Tool: Read
    Steps: Inspect prompt text.
    Expected: Prompt includes Chinese child-friendly explanation requirement and allows general chemistry understanding beyond exact textbook wording.
    Evidence: .sisyphus/evidence/task-2-generation-contract.md
  ```

  **Commit**: NO | Message: n/a | Files: evidence/contract unless embedded in script in Task 3

- [x] 3. Implement Batch Conversion Script

  **What to do**: Add `scripts/convert-short-answer-mcqs.mjs`. It must support `--batch <id>`, `--dry-run`, `--generated <path>`, `--write`, and `--all-ready-batches`. For each target record, load source context from inventory/draft source sections, validate generated MCQ JSON supplied by the executing AI agent, preserve provenance/source fields, replace only targeted `shortAnswer` records in `src/data/quizData.json` on `--write`, and write conversion reports. Default mode must not require an external AI API key: the Sisyphus agent generates `.sisyphus/evidence/generated-mcqs-{batch}.json`, then the script validates/applies it. Optional provider-backed generation may be added only if credentials are read from environment variables and missing credentials fail before any data write.
  **Must NOT do**: Do not hardcode generated answers inside the script. Do not commit API keys. Do not modify `src/data/quizData.js` unless a later task proves runtime requires it.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: non-trivial Node script and JSON update logic.
  - Skills: [] - Node/data scripting.
  - Omitted: [`test-driven-development`] - User did not request formal TDD; validation commands are required.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Tasks 5, 6 | Blocked By: Tasks 1, 2

  **References**:
  - Runtime target: `src/data/quizData.json`.
  - Target mapping: `src/data/textbookIngestion/runtimeTargetMap.js`.
  - First batch: `src/data/textbookIngestion/generated/rj-chemistry-g12-selective-3-organic-2019/*`.
  - Existing scripts pattern: `scripts/validate-supporting-data.mjs`.

  **Acceptance Criteria**:
  - [ ] `node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-g12-selective-3-organic-2019 --dry-run` exits `0` and prints counts.
  - [ ] `--generated .sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json --write` updates only matching `shortAnswer` runtime records for the selected batch.
  - [ ] Report includes converted/skipped/invalid/source-unresolved counts and IDs.
  - [ ] Existing 26 hand-authored MCQs remain byte-for-byte equivalent where practical, or structurally identical with no ID changes.
  - [ ] Missing optional AI-provider config fails with clear message before writes; agent-generated JSON path works without provider credentials.

  **QA Scenarios**:
  ```
  Scenario: Dry-run has no data mutation
    Tool: Bash
    Steps: Run git diff before and after dry-run command.
    Expected: No change to src/data/quizData.json; report may be written only if command documents it.
    Evidence: .sisyphus/evidence/task-3-dry-run.txt

  Scenario: Write mode is atomic
    Tool: Bash
    Steps: Run write mode on first batch with generated MCQ JSON; inspect git diff and report.
    Expected: Only targeted records in src/data/quizData.json change; script exits non-zero without write if validation fails.
    Evidence: .sisyphus/evidence/task-3-write-report.md
  ```

  **Commit**: YES | Message: `feat(data): add textbook MCQ conversion pipeline` | Files: `scripts/convert-short-answer-mcqs.mjs`, reports

- [x] 4. Implement Generated Quiz Validator

  **What to do**: Add `scripts/validate-quiz-data.mjs` focused on generated MCQ readiness. It should validate all `generatedFromShortAnswer` records and optionally all runtime quiz records. Rules: exactly four unique non-empty options, no placeholder text in question/options/explanation, integer `correctIndex` 0..3, non-empty explanation, valid difficulty enum, preserved sourceReferences, no duplicate IDs, and existing hand-authored MCQ count remains at least 26.
  **Must NOT do**: Do not replace broad `validate-supporting-data.mjs`; this is a focused validator.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: straightforward Node validator.
  - Skills: [] - Node script.
  - Omitted: [`playwright`] - No browser.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 5 | Blocked By: Task 1

  **References**:
  - Existing validator style: `scripts/validate-supporting-data.mjs`.
  - Generated contract from Task 2.
  - Runtime data: `src/data/quizData.json`.

  **Acceptance Criteria**:
  - [ ] `node scripts/validate-quiz-data.mjs` exits `0` after successful conversion.
  - [ ] Validator rejects fixture/sample with duplicate options.
  - [ ] Validator rejects any `待复核` in converted records.
  - [ ] Validator reports hand-authored MCQ preservation.

  **QA Scenarios**:
  ```
  Scenario: Valid converted data passes
    Tool: Bash
    Steps: Run node scripts/validate-quiz-data.mjs after first batch conversion.
    Expected: Exit 0 and summary includes generated record count.
    Evidence: .sisyphus/evidence/task-4-validate-quiz-data.txt

  Scenario: Placeholder text is rejected
    Tool: Bash
    Steps: Run validator in fixture/negative mode if implemented, or document a temporary invalid fixture command.
    Expected: Non-zero exit with clear error for placeholder field.
    Evidence: .sisyphus/evidence/task-4-validator-negative.txt
  ```

  **Commit**: YES | Message: `test(data): validate generated quiz MCQs` | Files: `scripts/validate-quiz-data.mjs`

- [x] 5. Convert First Organic Chemistry Batch

  **What to do**: Use the executing AI agent to generate `.sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json` from the first batch source contexts and the Task 2 contract, then run the conversion script for `rj-chemistry-g12-selective-3-organic-2019` in dry-run and write mode with `--generated <file>`. Convert all valid records in that batch into MCQs. For each generated record, set `category` to a topic-compatible value rather than `shortAnswer`; set `difficulty` to `基础`, `进阶`, or `挑战`; preserve provenance. Run validator and record conversion statistics.
  **Must NOT do**: Do not convert other batches in this task. Do not manually edit individual generated questions.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: data generation, validation, and careful diff review.
  - Skills: [] - Data pipeline execution.
  - Omitted: [`frontend-design`] - No UI design.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Tasks 7, 8 | Blocked By: Tasks 3, 4

  **References**:
  - First batch candidate data: `src/data/textbookIngestion/generated/rj-chemistry-g12-selective-3-organic-2019/quiz-candidates.json`.
  - First batch source inventory: `src/data/textbookIngestion/generated/rj-chemistry-g12-selective-3-organic-2019/draft-inventory.json`.
  - Runtime data: `src/data/quizData.json`.

  **Acceptance Criteria**:
  - [ ] Organic batch report lists total 91 and converted/skipped counts.
  - [ ] Converted records no longer have `category: "shortAnswer"`.
  - [ ] Converted records have no placeholder fields.
  - [ ] `node scripts/validate-quiz-data.mjs` exits `0`.
  - [ ] Existing 26 MCQs remain present.

  **QA Scenarios**:
  ```
  Scenario: Organic batch conversion succeeds
    Tool: Bash
    Steps: Generate MCQ JSON, run dry-run, then write mode with --generated, then validator.
    Expected: Commands exit 0; report exists; targeted records changed from placeholders to MCQs.
    Evidence: .sisyphus/evidence/mcq-conversion-rj-chemistry-g12-selective-3-organic-2019.md

  Scenario: No hand-authored MCQ regression
    Tool: Bash
    Steps: Compare IDs/options of original 26 MCQs before and after conversion.
    Expected: All 26 remain valid and present.
    Evidence: .sisyphus/evidence/task-5-hand-authored-preservation.txt
  ```

  **Commit**: YES | Message: `data(quiz): generate organic textbook MCQs` | Files: `src/data/quizData.json`, reports

- [x] 6. Map Remaining Grade/Textbook Batches

  **What to do**: Use the inventory and converter readiness logic to create `.sisyphus/evidence/mcq-remaining-batches.md` listing all remaining placeholder batches, source readiness, estimated record counts, and exact commands to process each batch. If `--all-ready-batches` is safe, run it in dry-run only and report what would be converted.
  **Must NOT do**: Do not convert remaining 421 records in this task unless explicitly covered by a later execution wave and source readiness is proven.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: batch mapping and readiness analysis.
  - Skills: [] - Data analysis.
  - Omitted: [`playwright`] - No browser.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 8 | Blocked By: Tasks 1, 3

  **References**:
  - Batch directories under `src/data/textbookIngestion/generated/` and `reviewed/`.
  - Inventory from Task 1.
  - Conversion script from Task 3.

  **Acceptance Criteria**:
  - [ ] Remaining-batches report covers all non-converted placeholder records.
  - [ ] Each batch has a command, readiness status, and blockers if any.
  - [ ] Dry-run all-ready-batches exits `0` or records exact unsupported reasons.

  **QA Scenarios**:
  ```
  Scenario: Remaining placeholders are all accounted for
    Tool: Bash
    Steps: Count remaining category shortAnswer records and compare to report totals.
    Expected: No unaccounted record IDs.
    Evidence: .sisyphus/evidence/mcq-remaining-batches.md

  Scenario: Dry-run does not mutate data
    Tool: Bash
    Steps: Run --all-ready-batches --dry-run and inspect git diff.
    Expected: No quizData mutation from dry-run.
    Evidence: .sisyphus/evidence/task-6-all-ready-dry-run.txt
  ```

  **Commit**: NO | Message: n/a | Files: evidence/report only

- [x] 7. Build and Browser Smoke QA for Generated MCQs

  **What to do**: Run `npm run build`. Start dev server and use browser automation to open full quiz. Verify generated MCQs appear in the pool, have four options, no placeholder text, difficulty/category display is acceptable, and correct/incorrect scoring works. Capture screenshots and option text evidence.
  **Must NOT do**: Do not add automated Playwright specs. Do not redesign UI.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: hands-on browser QA.
  - Skills: [`playwright`] - Browser automation required.
  - Omitted: [`frontend-design`] - QA only.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Task 8 | Blocked By: Task 5

  **References**:
  - Runtime quiz UI: `src/modules/quiz.js`.
  - Evidence from previous fix: `.sisyphus/evidence/task-4-full-challenge-options.md` in prior plan may show QA pattern.

  **Acceptance Criteria**:
  - [ ] `npm run build` exits `0`.
  - [ ] Browser evidence shows at least one generated organic MCQ rendered with four options.
  - [ ] No visible `待复核` in quiz modal for generated question.
  - [ ] Correct and incorrect answer flows work.

  **QA Scenarios**:
  ```
  Scenario: Generated MCQ appears in full quiz
    Tool: Playwright
    Steps: Start app, open full quiz, navigate until a generated organic MCQ appears or use deterministic session control if available.
    Expected: Generated question has 4 options, difficulty/category visible, no placeholder text.
    Evidence: .sisyphus/evidence/task-7-generated-mcq.png

  Scenario: Generated MCQ scoring works
    Tool: Playwright
    Steps: Select correct option in one run and incorrect option in another.
    Expected: Feedback and score reflect correctness; next navigation enabled after answer.
    Evidence: .sisyphus/evidence/task-7-generated-scoring.md
  ```

  **Commit**: YES | Message: `test(quiz): verify generated MCQs in browser` | Files: evidence only unless source selector additions are necessary

- [x] 8. Update Reports and Operator Documentation

  **What to do**: Document the conversion workflow, commands, environment variables for AI provider if used, validation commands, and remaining-batch execution order in `.sisyphus/evidence/mcq-generation-operator-guide.md`. Update notepads with lessons learned. Ensure reports clearly distinguish generated, skipped, invalid, and remaining records.
  **Must NOT do**: Do not create public docs outside `.sisyphus/evidence` unless user requests.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: operator docs and report clarity.
  - Skills: [] - Technical writing.
  - Omitted: [`officecli`] - No Office docs.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification | Blocked By: Tasks 5-7

  **References**:
  - Conversion reports from Tasks 5-6.
  - Scripts from Tasks 3-4.

  **Acceptance Criteria**:
  - [ ] Operator guide includes agent-generation JSON, dry-run/write/validate/build/browser QA commands.
  - [ ] Guide includes no-human-review policy and low-confidence skip policy.
  - [ ] Guide lists next commands for remaining grade/textbook batches.
  - [ ] Notepad records key decisions and blockers.

  **QA Scenarios**:
  ```
  Scenario: Fresh agent can follow guide
    Tool: Read
    Steps: Read operator guide from top to bottom and verify commands are copy-pasteable.
    Expected: No missing variable names or ambiguous steps.
    Evidence: .sisyphus/evidence/task-8-guide-review.md

  Scenario: Reports are complete
    Tool: Bash / Read
    Steps: Cross-check report totals against quizData counts.
    Expected: converted + skipped + remaining equals original placeholder count for planned scope.
    Evidence: .sisyphus/evidence/task-8-report-totals.md
  ```

  **Commit**: NO | Message: n/a | Files: `.sisyphus/evidence/*`, notepads

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Generated Data Quality Review — unspecified-high
- [x] F3. Real Browser QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity and Safety Check — deep

## Commit Strategy
- Commit script infrastructure separately: `feat(data): add textbook MCQ conversion pipeline`.
- Commit validator separately: `test(data): validate generated quiz MCQs`.
- Commit generated first batch separately: `data(quiz): generate organic textbook MCQs`.
- Do not commit AI credentials, build artifacts, unrelated data rewrites, or generated reports unless repository convention accepts `.sisyphus/evidence` artifacts.

## Success Criteria
- First 91-record organic chemistry batch is converted or explicitly skipped per-record with reasons.
- Converted records are four-option MCQs with no placeholder text.
- Existing 26 MCQs are preserved.
- Remaining 421-ish placeholder records are mapped by grade/textbook batch with next commands.
- Build and generated quiz validator pass.
- Browser QA proves generated MCQs display and score correctly.
