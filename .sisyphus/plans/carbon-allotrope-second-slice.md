# Carbon Allotropes Comparison Reviewed Slice

## TL;DR
> **Summary**: Add a second small reviewed textbook-derived slice for `金刚石/石墨/C60 对比`, reusing the completed C60 pilot workflow while generalizing validator configuration to avoid C60-only hardcoding.
> **Deliverables**:
> - Reviewed source inventory for diamond/graphite and C60 comparison evidence
> - Exactly 3 quiz questions, 1 progress relation, 1 game challenge, and 1 draft-only experiment note
> - Topic-specific validator config with exact count gates and negative self-checks
> - Agent-executed validation and Playwright smoke evidence
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3-5 → Task 6 → Final Verification Wave

## Context
### Original Request
- User agreed to continue after selecting `第二教材切片`.
- User selected topic: `金刚石/石墨/C60 对比`.
- User selected scale: `小闭环 = 3道测验 + 1个进度关系 + 1个游戏挑战 + 1个draft-only实验草稿`.

### Interview Summary
- The previous C60 reviewed textbook pilot is complete and should be treated as the repeatable workflow.
- The next slice must stay small, source-bound, and validation-first.
- The slice must not bulk import textbook content, redesign UI, add backend services, or promote draft experiment content into runtime reactions/lab content.

### Metis Review (gaps addressed)
- Adopt concrete fresh IDs up front to avoid semantic duplication.
- Split source evidence into high-signal line ranges: `3432-3462` and `3490-3504`.
- Forbid active-carbon facts from `3463-3489` unless separately reviewed in a future plan.
- Generalize C60-specific validator constants into topic-specific config/manifest before adding the new topic gate.
- Add negative self-checks for reviewed-source absence, existing-ID reuse, draft/runtime boundary leakage, and active-carbon source contamination.

## Work Objectives
### Core Objective
Implement a second reviewed textbook-derived content slice that teaches comparison of carbon allotropes using only reviewed source evidence and the proven C60 pilot validation pattern.

### Deliverables
- New topic/runtime slice ID: `g9-carbon-allotropes-comparison`.
- New source inventory ID: `pep-g9-2024-up-carbon-diamond-graphite-comparison` for `book.md:3432-3462`.
- Reuse existing reviewed C60 asset ID only as a cited asset: `pep-g9-2024-up-figure-6-4-c60-formula` for `book.md:3494-3504`.
- New quiz IDs:
  - `quiz-carbon-allotropes-comparison-1`
  - `quiz-carbon-allotropes-comparison-2`
  - `quiz-carbon-allotropes-comparison-3`
- New progress relation ID: `relation-carbon-allotropes-comparison`.
- New game challenge ID: `challenge-carbon-allotropes-comparison`.
- New draft-only experiment ID: `draft-exp-carbon-allotropes-observation`.
- Validator topic config/manifest replacing C60-only literals for exact-count gates.
- Evidence files under `.sisyphus/evidence/` for every task.

### Definition of Done (verifiable conditions with commands)
- `node scripts/validate-supporting-data.mjs` passes.
- `node scripts/validate-textbook-assets.mjs` passes.
- `node scripts/validate-curriculum.mjs` passes.
- `node scripts/audit-business-data-imports.mjs` passes.
- `npm run validate:all:safe` passes.
- `npm run validate:chem-notation` passes.
- `npm run build` passes.
- `npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts` passes.

### Must Have
- Exactly 3 new quiz questions, 1 progress relation, 1 game challenge, and 1 draft-only experiment note for the new comparison topic.
- All runtime-visible new records must cite reviewed source references.
- All new claims must be limited to facts supported by:
  - `src/data/textbooks/2024版人教版九年级化学上册/book.md:3432-3462`
  - `src/data/textbooks/2024版人教版九年级化学上册/book.md:3490-3504`
- Existing C60 pilot must remain valid unchanged.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- MUST NOT reuse these existing IDs: `g9-carbon-c60-allotrope`, `stage-3`, `challenge-c60-carbon-topic`, `quiz-11`, `pep-g9-2024-up-figure-6-4-c60-formula` as a new ID.
- MUST NOT cite `book.md:3463-3489` or line `3483` as core comparison evidence.
- MUST NOT add active-carbon content to this slice except as an explicitly excluded boundary in comments/tests.
- MUST NOT add runtime reaction/lab content for `draft-exp-carbon-allotropes-observation`.
- MUST NOT change core game IDs `drag`, `memory`, `reaction`, `collector` or game rules.
- MUST NOT add backend services, routes, UI redesigns, OCR/vision-derived canonical content, or bulk textbook imports.

### Reserved Existing IDs
- `g9-carbon-c60-allotrope` - existing C60 curriculum tag; do not reuse for the new comparison topic.
- `stage-3` - existing learning stage; do not rename or replace.
- `challenge-c60-carbon-topic` - existing C60 collector challenge; do not reuse for the comparison challenge.
- `quiz-11` - existing graphite quiz stub; do not reuse.
- `pep-g9-2024-up-figure-6-4-c60-formula` - existing reviewed C60 asset; may be cited as a reference but must not be recreated as a new ID.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + existing Node validators and Playwright smoke tests.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 validator/config foundation, Task 2 reviewed source inventory.
Wave 2: Task 3 quiz/runtime content, Task 4 progress/game metadata, Task 5 draft-only experiment boundary.
Wave 3: Task 6 aggregate QA/evidence consolidation.

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 3-6.
- Task 2 blocks Tasks 3-6.
- Task 3 blocked by Tasks 1-2; blocks Task 6.
- Task 4 blocked by Tasks 1-2; blocks Task 6.
- Task 5 blocked by Tasks 1-2; blocks Task 6.
- Task 6 blocked by Tasks 1-5.
- Final Verification Wave blocked by Task 6.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → `deep`, `quick`.
- Wave 2 → 3 tasks → `quick`, `quick`, `deep`.
- Wave 3 → 1 task → `deep`.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Generalize supporting-data validator into topic config

  **What to do**: Refactor `scripts/validate-supporting-data.mjs` so C60 exact-count/source checks are driven by a topic-specific config/manifest structure. Add a new config entry for `g9-carbon-allotropes-comparison` with expected counts: 3 quiz questions, 1 progress relation, 1 game challenge, 1 draft-only experiment note. Preserve existing C60 checks unchanged. Add deterministic invalid modes for `missing-allotropes-reviewed-source`, `reused-carbon-existing-id`, `allotropes-active-carbon-source-contamination`, and `allotropes-draft-runtime-leak`.
  **Must NOT do**: Do not weaken any existing C60 validation. Do not replace exact-count gates with “at least” gates. Do not add dependencies.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: validator refactor affects correctness gates and must preserve the pilot contract.
  - Skills: [] - No separate implementation skill required.
  - Omitted: [`frontend-design`, `threejs-animation`] - No UI or animation work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 3, 4, 5, 6 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `scripts/validate-supporting-data.mjs` - existing C60 reviewed-source checks, count gates, and negative self-check style.
  - Pattern: `scripts/validate-curriculum.mjs` - strict schema and self-check-invalid CLI pattern.
  - Pattern: `scripts/validate-story-media.mjs` - deterministic invalid-fixture rejection style.
  - Guardrail: `.sisyphus/plans/textbook-content-import-review-flow.md` - completed C60 pilot workflow.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node scripts/validate-supporting-data.mjs` exits 0 before and after adding the second topic config.
  - [ ] Invalid mode for missing reviewed source exits non-zero and mentions the new comparison topic.
  - [ ] Invalid mode for reusing `g9-carbon-c60-allotrope`, `stage-3`, `challenge-c60-carbon-topic`, or `quiz-11` exits non-zero.
  - [ ] Existing C60 exact counts still pass with no ID/name changes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Validator config preserves C60 and accepts configured topics
    Tool: Bash
    Steps: Run `node scripts/validate-supporting-data.mjs`.
    Expected: Exit 0; output contains no validator errors.
    Evidence: .sisyphus/evidence/task-1-validator-config.txt

  Scenario: Invalid comparison topic fixture is rejected
    Tool: Bash
    Steps: Run all new `--self-check-invalid` modes added in this task.
    Expected: Each exits non-zero with the expected topic-specific rejection message.
    Evidence: .sisyphus/evidence/task-1-validator-negative.txt
  ```

  **Commit**: NO | Message: `refactor(data): configure reviewed topic validation` | Files: [`scripts/validate-supporting-data.mjs`]

- [x] 2. Add reviewed source inventory for diamond/graphite comparison

  **What to do**: Add source inventory metadata for `pep-g9-2024-up-carbon-diamond-graphite-comparison` using `volumeId: "pep-chemistry-g9-2024"`, `sourcePath: "src/data/textbooks/2024版人教版九年级化学上册/book.md"`, and `lineRange: "3432-3462"`. Mark review status as reviewed using the same contract as the C60 pilot. Reuse existing C60 asset `pep-g9-2024-up-figure-6-4-c60-formula` only as a source reference for C60 facts from `3494-3504`; do not create a duplicate asset ID.
  **Must NOT do**: Do not mark active-carbon line `3483` as reviewed. Do not add unreviewed image assets. Do not broaden source range to `3432-3504` for the core comparison.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: bounded data inventory addition following an existing pattern.
  - Skills: [] - No separate skill required.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 3, 4, 5, 6 | Blocked By: none

  **References**:
  - Source: `src/data/textbooks/2024版人教版九年级化学上册/book.md:3432-3462` - 金刚石/石墨 comparison facts.
  - Source: `src/data/textbooks/2024版人教版九年级化学上册/book.md:3494-3504` - C60 formula/structure caption.
  - Pattern: `src/data/textbookAssets.js` - reviewed asset records and source issue records.
  - Existing asset: `pep-g9-2024-up-figure-6-4-c60-formula` - must be reused only as a reference.

  **Acceptance Criteria**:
  - [ ] New inventory ID `pep-g9-2024-up-carbon-diamond-graphite-comparison` exists exactly once.
  - [ ] New inventory uses line range `3432-3462` and reviewed status.
  - [ ] No new record uses line `3483` as reviewed evidence.
  - [ ] `node scripts/validate-textbook-assets.mjs` exits 0.

  **QA Scenarios**:
  ```
  Scenario: Reviewed source inventory validates
    Tool: Bash
    Steps: Run `node scripts/validate-textbook-assets.mjs`.
    Expected: Exit 0; new comparison inventory is accepted.
    Evidence: .sisyphus/evidence/task-2-source-inventory.txt

  Scenario: Active-carbon malformed source remains excluded
    Tool: Bash
    Steps: Run the validator/audit command that checks reviewed source ranges and rejected source issues.
    Expected: Line `3483` is not accepted as reviewed comparison evidence.
    Evidence: .sisyphus/evidence/task-2-active-carbon-excluded.txt
  ```

  **Commit**: NO | Message: `data(textbook): add carbon allotrope comparison source` | Files: [`src/data/textbookAssets.js`, `src/data/textbookPilotContent.js`]

- [x] 3. Add exactly three reviewed quiz questions for the comparison topic

  **What to do**: Add quiz records with IDs `quiz-carbon-allotropes-comparison-1`, `quiz-carbon-allotropes-comparison-2`, and `quiz-carbon-allotropes-comparison-3`. Questions must cover: all three are carbon单质/composition; diamond vs graphite physical-property difference due to different atom arrangement; C60 formula/structure identification from reviewed C60 source. Each record must include reviewed source references to `pep-g9-2024-up-carbon-diamond-graphite-comparison` and/or `pep-g9-2024-up-figure-6-4-c60-formula` as appropriate.
  **Must NOT do**: Do not reuse `quiz-11` or any C60 pilot quiz IDs. Do not introduce unsourced bonding/crystal-lattice facts beyond the cited lines.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: bounded data addition with exact IDs and source references.
  - Skills: [] - No separate skill required.
  - Omitted: [`test-driven-development`] - Tests are validator/QA commands after data addition.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 6 | Blocked By: Tasks 1, 2

  **References**:
  - Pattern: `src/data/quizData.json` - runtime quiz dataset.
  - Pattern: `src/data/quizData.js` - JS mirror/stub pattern if present.
  - Existing ID to avoid: `quiz-11` - existing graphite quiz stub.
  - Source: `book.md:3432-3462`, `book.md:3494-3504`.

  **Acceptance Criteria**:
  - [ ] Exactly three new quiz records exist with the specified IDs.
  - [ ] Each new quiz has reviewed source references.
  - [ ] No new quiz cites `3463-3489` or active-carbon facts.
  - [ ] `node scripts/validate-supporting-data.mjs` exits 0.

  **QA Scenarios**:
  ```
  Scenario: Quiz records are visible through existing quiz flow
    Tool: Playwright
    Steps: Run `npx playwright test tests/shell/content-data-smoke.spec.ts`.
    Expected: Quiz/content smoke passes and no missing-source validation errors appear.
    Evidence: .sisyphus/evidence/task-3-quiz-smoke.txt

  Scenario: Duplicate/unsourced quiz fixture is rejected
    Tool: Bash
    Steps: Run the relevant `node scripts/validate-supporting-data.mjs --self-check-invalid ...` mode for reused IDs or missing reviewed source.
    Expected: Non-zero exit with rejection for duplicate existing ID or missing reviewed source.
    Evidence: .sisyphus/evidence/task-3-quiz-negative.txt
  ```

  **Commit**: NO | Message: `data(quiz): add carbon allotrope comparison questions` | Files: [`src/data/quizData.json`, `src/data/quizData.js`]

- [x] 4. Add one progress relation and one collector challenge for the comparison topic

  **What to do**: Add exactly one progress relation with ID `relation-carbon-allotropes-comparison` connecting the comparison topic to the existing C60 pilot as an extension/related concept without altering `stage-3` semantics. Add exactly one collector challenge metadata record with ID `challenge-carbon-allotropes-comparison`. Use reviewed source references and the new topic ID `g9-carbon-allotropes-comparison`.
  **Must NOT do**: Do not rename `stage-3`. Do not alter game IDs or core game rules. Do not create more than one relation or challenge.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: bounded metadata wiring.
  - Skills: [] - No separate skill required.
  - Omitted: [`frontend-design`] - No new UI design.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 6 | Blocked By: Tasks 1, 2

  **References**:
  - Pattern: `src/data/learningPath.json` - C60 `stage-3` relation pattern.
  - Pattern: `src/data/learningPath.js` - mirror/stub pattern if present.
  - Pattern: `src/data/contentMeta.js` - `GAME_META.collector.challengeMetadata` C60 challenge pattern.
  - Existing IDs to avoid: `stage-3`, `challenge-c60-carbon-topic`.

  **Acceptance Criteria**:
  - [ ] Exactly one new relation ID `relation-carbon-allotropes-comparison` exists.
  - [ ] Exactly one new challenge ID `challenge-carbon-allotropes-comparison` exists.
  - [ ] Existing `stage-3` and `challenge-c60-carbon-topic` remain unchanged.
  - [ ] `node scripts/validate-curriculum.mjs` and `node scripts/validate-supporting-data.mjs` exit 0.

  **QA Scenarios**:
  ```
  Scenario: Progress and collector challenge metadata validate
    Tool: Bash
    Steps: Run `node scripts/validate-curriculum.mjs` then `node scripts/validate-supporting-data.mjs`.
    Expected: Both exit 0; exact count gate reports one relation and one challenge for the comparison topic.
    Evidence: .sisyphus/evidence/task-4-progress-game.txt

  Scenario: Route shell remains stable after metadata wiring
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/route-shells.spec.ts`.
    Expected: Route shell smoke passes; game route still loads existing shells.
    Evidence: .sisyphus/evidence/task-4-route-shells.txt
  ```

  **Commit**: NO | Message: `data(progress): link carbon allotrope comparison` | Files: [`src/data/learningPath.json`, `src/data/learningPath.js`, `src/data/contentMeta.js`]

- [x] 5. Add draft-only experiment note and enforce runtime boundary

  **What to do**: Add `draft-exp-carbon-allotropes-observation` only to the draft/supporting inventory location used by the C60 pilot. It should describe a classroom observation/comparison note for diamond/graphite/C60 conceptually, with `runtimeStatus: "draft-only"` or equivalent existing field. Add/extend validator or audit checks proving this ID is absent from `src/data/reactions.json`, `src/data/reactions.js`, runtime `reactions` exports, and lab UI data.
  **Must NOT do**: Do not create a runtime experiment, reaction, lab card, route, or UI affordance.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: boundary enforcement must prevent silent runtime leakage.
  - Skills: [] - No separate skill required.
  - Omitted: [`frontend-design`] - No UI addition.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 6 | Blocked By: Tasks 1, 2

  **References**:
  - Pattern: `src/data/textbookPilotContent.js` - C60 draft-only record pattern.
  - Runtime boundary: `src/data/index.js` - canonical runtime exports.
  - Forbidden runtime files: `src/data/reactions.json`, `src/data/reactions.js`.
  - Audit pattern: `scripts/audit-business-data-imports.mjs`.

  **Acceptance Criteria**:
  - [ ] Draft-only ID `draft-exp-carbon-allotropes-observation` exists exactly once in draft/supporting content.
  - [ ] Draft-only ID does not appear in runtime reactions files or runtime exports.
  - [ ] Validator negative mode for draft/runtime leak exits non-zero when simulated.
  - [ ] `node scripts/audit-business-data-imports.mjs` exits 0.

  **QA Scenarios**:
  ```
  Scenario: Draft experiment is excluded from runtime data
    Tool: Bash
    Steps: Run `node scripts/audit-business-data-imports.mjs` and the supporting-data validator boundary check.
    Expected: Exit 0; draft ID absent from runtime reaction/lab exports.
    Evidence: .sisyphus/evidence/task-5-draft-boundary.txt

  Scenario: Draft leakage fixture is rejected
    Tool: Bash
    Steps: Run `node scripts/validate-supporting-data.mjs --self-check-invalid allotropes-draft-runtime-leak`.
    Expected: Non-zero exit with message naming `draft-exp-carbon-allotropes-observation`.
    Evidence: .sisyphus/evidence/task-5-draft-negative.txt
  ```

  **Commit**: NO | Message: `data(textbook): add draft carbon allotrope experiment note` | Files: [`src/data/textbookPilotContent.js`, `scripts/validate-supporting-data.mjs`]

- [x] 6. Run aggregate validation and consolidate evidence

  **What to do**: Run the full safe validation/build/smoke set once after Tasks 1-5 are complete. Capture outputs into `.sisyphus/evidence/` files. If a command fails, fix the underlying issue in the responsible task area and rerun the full command; do not mark complete with partial success.
  **Must NOT do**: Do not use `npm run validate:data` as the aggregate gate because the known safe aggregate is `npm run validate:all:safe`. Do not repeatedly start frontend services manually; rely on Playwright config/global setup.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: multi-command validation and failure triage.
  - Skills: [] - No separate skill required.
  - Omitted: [`frontend-design`] - No UI design.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: Tasks 1, 2, 3, 4, 5

  **References**:
  - Commands: `package.json` scripts.
  - Smoke tests: `tests/shell/content-data-smoke.spec.ts`, `tests/ui/route-shells.spec.ts`.
  - Prior evidence pattern: `.sisyphus/evidence/task-6-validate-all-safe.txt` from C60 pilot.

  **Acceptance Criteria**:
  - [ ] `npm run validate:all:safe` exits 0.
  - [ ] `npm run validate:chem-notation` exits 0.
  - [ ] `node scripts/audit-business-data-imports.mjs` exits 0.
  - [ ] `npm run build` exits 0.
  - [ ] `npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts` exits 0.

  **QA Scenarios**:
  ```
  Scenario: Safe aggregate and build pass
    Tool: Bash
    Steps: Run `npm run validate:all:safe`, `npm run validate:chem-notation`, `node scripts/audit-business-data-imports.mjs`, and `npm run build`.
    Expected: All commands exit 0.
    Evidence: .sisyphus/evidence/task-6-aggregate-validation.txt

  Scenario: Existing browser smoke remains stable
    Tool: Playwright
    Steps: Run `npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts`.
    Expected: Both specs pass; no draft experiment appears in lab/runtime surfaces.
    Evidence: .sisyphus/evidence/task-6-playwright-smoke.txt
  ```

  **Commit**: NO | Message: `test(data): verify carbon allotrope comparison slice` | Files: [`.sisyphus/evidence/*`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep
## Commit Strategy
- Do not commit unless the user explicitly requests a commit.
- If committing later, prefer one atomic commit after all validation passes: `data(textbook): add carbon allotrope comparison slice`.
- Never include secrets or unrelated local files.

## Success Criteria
- New comparison slice is visible only through intended runtime surfaces: quiz/progress/collector metadata.
- Draft-only experiment remains absent from runtime reactions and lab UI.
- Existing C60 pilot still validates unchanged.
- New validators reject missing reviewed sources, reused existing IDs, active-carbon source contamination, and draft runtime leakage.
- All Definition of Done commands pass and evidence files exist.
