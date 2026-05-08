# Textbook Content Import Review Flow Pilot

## TL;DR
> **Summary**: Build the first reviewed real-textbook content import pilot for one topic: C60 / 碳单质. The pilot imports a small visible content loop while enforcing strict reviewed-source metadata before any runtime inclusion.
> **Deliverables**:
> - Reviewed-source contract for textbook-derived runtime records.
> - Exact C60 pilot content inventory: 3 quiz questions, 1 learning/progress relation, 1 game challenge, and 1 draft-only experiment note.
> - Validator extensions and negative self-checks for missing/unreviewed textbook source references.
> - Agent-executed evidence proving the pilot is visible where intended and draft-only where required.
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3-5 → Task 6

## Context
### Original Request
User wants the next step after curriculum extensibility: `真实教材内容导入与审核流程`.

### Interview Summary
- Start from a small slice, not a bulk textbook import.
- Pilot slice: exactly 1 topic.
- Pilot topic: C60 / 碳单质.
- Pilot output: small mixed loop.
- Runtime-visible pilot records: exactly 3 quiz questions, 1 learning/progress relation, and 1 game challenge.
- Experiment content: reviewed draft only, not runtime-visible in lab experiment lists.
- Review gate: strict. Every runtime-visible textbook-derived quiz/progress/challenge record must have reviewed source references.

### Metis Review (gaps addressed)
- Reviewed-source reference ambiguity resolved: use both line-range references and reviewed asset IDs where applicable. For C60 formula/image-backed items, cite `pep-g9-2024-up-figure-6-4-c60-formula` and the textbook line range `book.md:3494-3504`.
- Quiz content ambiguity resolved: at least 2 questions are factual recall; 1 may be interpretation/application only if directly supported by the reviewed C60 source metadata.
- Runtime visibility boundary added: experiment pilot content remains draft-only and must not appear in exported `reactions` or the lab route.
- Scope creep guardrail added: no OCR, no parser for all textbooks, no backend, no UI redesign.

## Work Objectives
### Core Objective
Create a reviewed, validator-enforced pilot workflow that turns one real textbook topic into a small amount of visible app content while proving unreviewed textbook-derived content cannot enter runtime data.

### Deliverables
- A reviewed-source metadata contract for textbook-derived records, using concrete fields consistently across quiz, learning/progress, and game challenge data.
- C60 pilot runtime content:
  - 3 quiz records in `src/data/quizData.json` and mirror `src/data/quizData.js`.
  - 1 learning/progress relation in `src/data/curriculum.js` and/or `src/data/learningPath.json` + mirror `src/data/learningPath.js`.
  - 1 game challenge metadata entry in `src/data/contentMeta.js` under an existing game ID, with no game-rule mutation.
- C60 pilot draft-only experiment content stored outside runtime exports, under an allowed reviewed draft data location such as `src/data/textbookDrafts.js` or `.sisyphus/drafts/` evidence; it must not be imported by runtime modules.
- Validator support proving reviewed references exist and invalid references fail.
- Evidence under `.sisyphus/evidence/task-{N}-*.txt|json|png`.

### Definition of Done (verifiable conditions with commands)
- `npm run validate:curriculum` exits `0`.
- `npm run validate:textbook-assets` exits `0` and confirms `pep-g9-2024-up-figure-6-4-c60-formula` remains `reviewed` with `extractedFormulaText: "C60"`.
- `npm run validate:supporting` exits `0` and verifies every C60 runtime pilot record has reviewed source metadata.
- `npm run validate:chem-notation` exits `0` and C60 formula rendering remains valid.
- New negative self-check for missing reviewed source reference exits `0` only by proving the invalid fixture is rejected.
- New negative self-check for unreviewed textbook source reference exits `0` only by proving the invalid fixture is rejected.
- `node scripts/audit-business-data-imports.mjs` exits `0`.
- `npm run build` exits `0`.
- `npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts` exits `0`.

### Must Have
- Pilot scope is exactly C60 / 碳单质.
- Runtime-visible content count is exactly: 3 quiz questions, 1 learning/progress relation, 1 game challenge.
- Runtime-visible records must cite reviewed source metadata. Required fields:
  - `sourceReviewStatus: "reviewed"`
  - `sourceReferences: [{ volumeId, sourcePath, lineRange, assetId?, reviewedTextField?, note }]`
  - `textbookAssetReferences` when an existing reviewed asset is used.
- For this pilot, use:
  - `volumeId: "pep-chemistry-g9-2024"`
  - `sourcePath: "src/data/textbooks/2024版人教版九年级化学上册/book.md"`
  - `lineRange: "3494-3504"`
  - `assetId: "pep-g9-2024-up-figure-6-4-c60-formula"` when referencing the reviewed C60 formula/image asset.
- C60 formulas use `formulaText: "C60"` and `notationReviewStatus: "reviewed"` when formula rendering is needed.
- Draft-only experiment content must be clearly marked `runtimeStatus: "draft-only"` and must not be exported as `reactions` or rendered in the lab route.
- Existing game IDs remain `drag`, `memory`, `reaction`, `collector`; challenge metadata only, no rule changes.
- Existing data boundary remains through `src/data/index.js`.

### Must NOT Have
- MUST NOT import raw `src/data/textbooks/**/book.md` or images in runtime modules.
- MUST NOT bulk import all textbook content.
- MUST NOT rely on OCR/vision output as canonical content.
- MUST NOT create backend services, accounts, cloud sync, teacher dashboards, or adaptive AI tutoring.
- MUST NOT redesign UI.
- MUST NOT change core game rules by difficulty.
- MUST NOT add visible lab experiment content from this pilot; experiment stays reviewed draft-only.
- MUST NOT remove or weaken existing validators.
- MUST NOT use `npm run validate:data` as the gate; known story-media shard mismatch remains out of scope.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after using existing validators + focused negative self-checks + Playwright smoke/content tests.
- QA policy: Every task has agent-executed happy and failure scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
Wave 1: Task 1 reviewed-source contract and Task 2 pilot source inventory.
Wave 2: Task 3 runtime content import, Task 4 draft-only experiment, Task 5 validators/negative fixtures.
Wave 3: Task 6 aggregate QA and cleanup.

### Dependency Matrix
- Task 1 blocks Tasks 3, 4, 5, 6.
- Task 2 blocks Tasks 3, 4, 5, 6.
- Task 3 blocks Task 6.
- Task 4 blocks Task 6.
- Task 5 blocks Task 6.
- Task 6 blocks Final Verification Wave.

### Agent Dispatch Summary
- Wave 1 → 2 tasks → deep, quick.
- Wave 2 → 3 tasks → unspecified-high, quick, deep.
- Wave 3 → 1 task → deep.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Define reviewed-source contract for textbook-derived runtime records

  **What to do**: Add a single reusable reviewed-source convention for runtime-visible textbook-derived records. Prefer a lightweight data helper module or validator-local contract if runtime code does not need helpers. The contract must accept `sourceReviewStatus: "reviewed"` and `sourceReferences[]` with `volumeId`, `sourcePath`, `lineRange`, optional `assetId`, optional `reviewedTextField`, and `note`. Document the pilot contract in `src/data/textbooks/README.md` or a data-adjacent comment where existing conventions live.
  **Must NOT do**: Do not create a generic Markdown parser. Do not import raw textbook source at runtime.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: This contract gates every future textbook-derived runtime record.
  - Skills: [] - Data/schema validation work only.
  - Omitted: [`frontend-design`] - No UI design.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Tasks 3, 4, 5, 6 | Blocked By: none

  **References**:
  - Pattern: `src/data/textbookAssets.js` - reviewed asset/status model.
  - Pattern: `scripts/validate-textbook-assets.mjs` - reviewed reference enforcement.
  - Pattern: `scripts/validate-supporting-data.mjs` - cross-dataset validation style.
  - Pattern: `src/data/textbooks/README.md` - source convention documentation.

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-assets` exits `0`.
  - [ ] A Node check or validator output proves the C60 reviewed-source contract fields are recognized.
  - [ ] `node scripts/audit-business-data-imports.mjs` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Reviewed-source contract accepts C60 source metadata
    Tool: Bash
    Steps: Run a targeted Node check or validator mode that validates a sample record with `sourceReviewStatus: "reviewed"`, `volumeId: "pep-chemistry-g9-2024"`, `lineRange: "3494-3504"`, and `assetId: "pep-g9-2024-up-figure-6-4-c60-formula"`.
    Expected: Exit 0 and output includes `reviewedSource: valid` or equivalent.
    Evidence: .sisyphus/evidence/task-1-reviewed-source-contract.txt

  Scenario: Raw textbook import boundary remains enforced
    Tool: Bash
    Steps: Run `node scripts/audit-business-data-imports.mjs`.
    Expected: Exit 0 with no runtime import of `src/data/textbooks/**`.
    Evidence: .sisyphus/evidence/task-1-import-boundary.txt
  ```

  **Commit**: NO | Message: `feat(textbooks): define reviewed source contract` | Files: `src/data/*`, `scripts/*`, `src/data/textbooks/README.md`

- [x] 2. Create exact C60 pilot source inventory

  **What to do**: Create a reviewed pilot inventory that names the exact C60 source and intended runtime records before adding runtime content. Store it in an appropriate data-adjacent file such as `src/data/textbookPilotContent.js` or `src/data/textbookDrafts.js`, exported through `src/data/index.js` only if validators/runtime need it. Include exactly these planned IDs: `quiz-c60-structure-source`, `quiz-c60-carbon-allotrope`, `quiz-c60-reviewed-formula-application`, `challenge-c60-carbon-topic`, and `draft-exp-c60-model-observation`. Each inventory item must cite `pep-chemistry-g9-2024`, `book.md:3494-3504`, and asset `pep-g9-2024-up-figure-6-4-c60-formula` where formula/image-backed.
  **Must NOT do**: Do not add visible runtime records in this task. Do not invent unsupported chemistry facts.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Small data inventory with strict IDs.
  - Skills: [] - Data editing and validation only.
  - Omitted: [`playwright`] - No UI in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 3, 4, 5, 6 | Blocked By: none

  **References**:
  - Source: `src/data/textbooks/2024版人教版九年级化学上册/book.md:3494-3504` - C60 source lines.
  - Asset: `src/data/textbookAssets.js` asset `pep-g9-2024-up-figure-6-4-c60-formula`.
  - Pattern: `src/data/index.js` - export boundary if needed.

  **Acceptance Criteria**:
  - [ ] Inventory contains exactly 5 pilot item IDs listed above.
  - [ ] Inventory marks `draft-exp-c60-model-observation` as `runtimeStatus: "draft-only"`.
  - [ ] `npm run validate:textbook-assets` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: C60 pilot inventory is exact
    Tool: Bash
    Steps: Run a Node check that imports/reads the inventory and asserts the exact 5 pilot IDs and exact source references.
    Expected: Exit 0 and output includes all 5 IDs.
    Evidence: .sisyphus/evidence/task-2-c60-inventory.txt

  Scenario: Draft experiment is not runtime-visible
    Tool: Bash
    Steps: Run a Node check that asserts `draft-exp-c60-model-observation` is not present in `reactions` exported from `src/data/index.js`.
    Expected: Exit 0 and output includes `draft experiment not runtime-visible`.
    Evidence: .sisyphus/evidence/task-2-draft-experiment-boundary.txt
  ```

  **Commit**: NO | Message: `feat(textbooks): add c60 pilot inventory` | Files: `src/data/*`

- [x] 3. Import reviewed C60 runtime content into quiz, progress, and game metadata

  **What to do**: Add exactly 3 runtime quiz questions, 1 progress/learning relation, and 1 game challenge metadata entry using the IDs from Task 2. Update both JSON and JS mirrors where the repo uses both. Quiz records must be 4-option MCQ records with `curriculumTags`, `difficulty: "初中"`, reviewed source metadata, and `formulaText: "C60"` where formula rendering is needed. Progress relation should connect the C60 topic to the existing or new C60-capable curriculum tag without broad curriculum expansion. Game challenge must be metadata-only under an existing `GAME_META` key and must not mutate game rules.
  **Must NOT do**: Do not exceed 3 runtime quiz questions. Do not add visible lab experiment records. Do not change game mechanics.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Cross-data update across quiz/progress/game metadata with strict validation.
  - Skills: [] - Data/runtime integration only.
  - Omitted: [`frontend-design`] - No visual redesign.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Task 6 | Blocked By: Tasks 1, 2

  **References**:
  - Pattern: `src/data/quizData.json` and `src/data/quizData.js` - quiz record shape.
  - Pattern: `src/data/learningPath.json` and `src/modules/progress.js` - progress relation display.
  - Pattern: `src/data/contentMeta.js` - `GAME_META.<id>.challengeMetadata`.
  - Validator: `scripts/validate-supporting-data.mjs` - supporting data cross-checks.

  **Acceptance Criteria**:
  - [ ] Exactly 3 new/updated C60 runtime quiz records exist with reviewed source metadata.
  - [ ] Exactly 1 C60 game challenge metadata entry exists under an existing game ID.
  - [ ] Progress route can credit C60 quiz completion through `questionIds`.
  - [ ] `npm run validate:supporting` exits `0`.
  - [ ] `npm run build` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Runtime C60 records validate
    Tool: Bash
    Steps: Run `npm run validate:supporting`.
    Expected: Exit 0 and output confirms supporting data validation; C60 reviewed-source references are accepted.
    Evidence: .sisyphus/evidence/task-3-c60-supporting.txt

  Scenario: C60 quiz/progress path is visible
    Tool: Playwright
    Steps: Run a focused Playwright check that opens the app, starts quiz flow for carbon or full quiz, verifies at least one C60 question can render, then seeds quiz score with `questionIds` for a C60 quiz and verifies progress route shows C60 topic activity.
    Expected: C60 quiz is visible, C60 formula renders as chemistry notation where present, progress shows started/completed activity without console errors.
    Evidence: .sisyphus/evidence/task-3-c60-runtime-qa.png
  ```

  **Commit**: NO | Message: `feat(textbooks): import reviewed c60 pilot content` | Files: `src/data/*`, `src/modules/*`, `tests/*`

- [x] 4. Add draft-only C60 experiment review record without runtime lab visibility

  **What to do**: Add the C60 experiment/observation concept as a reviewed draft record only, using `runtimeStatus: "draft-only"`. It may describe a model observation or classroom discussion based only on reviewed C60 source. Store it in the pilot inventory/draft data location, not in `reactions`. Add validation that draft-only records cannot appear in runtime exports until explicitly promoted in a future plan.
  **Must NOT do**: Do not add this draft to `src/data/reactions.json`, `src/data/reactions.js`, lab UI, or unlock requirements.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Small draft data plus boundary check.
  - Skills: [] - Data validation only.
  - Omitted: [`playwright`] - Command proof is sufficient; route-shell QA later covers lab.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 6 | Blocked By: Tasks 1, 2

  **References**:
  - Runtime reactions: `src/data/reactions.json`, `src/data/reactions.js` - must not include draft item.
  - Lab route: `src/modules/lab.js` - renders `reactions` only.
  - Inventory: created by Task 2.

  **Acceptance Criteria**:
  - [ ] Draft record `draft-exp-c60-model-observation` exists and has `runtimeStatus: "draft-only"`.
  - [ ] `draft-exp-c60-model-observation` is absent from runtime `reactions` export.
  - [ ] `npm run validate:supporting` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Draft experiment stays out of runtime reactions
    Tool: Bash
    Steps: Run a Node check importing `reactions` from `src/data/index.js` and asserting no reaction/experiment ID equals `draft-exp-c60-model-observation`.
    Expected: Exit 0 and output includes `draft-only experiment excluded`.
    Evidence: .sisyphus/evidence/task-4-draft-experiment-excluded.txt

  Scenario: Lab route unchanged by draft experiment
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/route-shells.spec.ts`.
    Expected: Exit 0 and lab shell remains valid; no new C60 draft experiment card is required.
    Evidence: .sisyphus/evidence/task-4-lab-route-boundary.txt
  ```

  **Commit**: NO | Message: `feat(textbooks): keep c60 experiment as reviewed draft` | Files: `src/data/*`, `scripts/*`

- [x] 5. Extend validators with C60 pilot reviewed-reference negative checks

  **What to do**: Extend existing validators, preferably `scripts/validate-supporting-data.mjs` and/or `scripts/validate-textbook-assets.mjs`, to reject runtime-visible textbook-derived records missing reviewed source references or referencing unreviewed source assets. Add `--self-check-invalid missing-reviewed-source-reference` and `--self-check-invalid unreviewed-runtime-source-reference` modes or equivalent existing-style names. Ensure these self-checks exit 0 only when the invalid fixture is rejected.
  **Must NOT do**: Do not weaken existing negative checks. Do not add separate test infrastructure if CLI self-check fits existing style.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Validator correctness protects future imports.
  - Skills: [] - Script validation and fixtures only.
  - Omitted: [`playwright`] - No browser work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 6 | Blocked By: Tasks 1, 2

  **References**:
  - Pattern: `scripts/validate-curriculum.mjs --self-check-invalid`.
  - Pattern: `scripts/validate-supporting-data.mjs --self-check-invalid`.
  - Pattern: `scripts/validate-textbook-assets.mjs --self-check-invalid`.

  **Acceptance Criteria**:
  - [ ] `npm run validate:supporting` exits `0`.
  - [ ] `node scripts/validate-supporting-data.mjs --self-check-invalid missing-reviewed-source-reference` exits `0` by proving rejection.
  - [ ] `node scripts/validate-supporting-data.mjs --self-check-invalid unreviewed-runtime-source-reference` exits `0` by proving rejection.
  - [ ] `npm run validate:textbook-assets` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Missing reviewed source is rejected
    Tool: Bash
    Steps: Run `node scripts/validate-supporting-data.mjs --self-check-invalid missing-reviewed-source-reference`.
    Expected: Exit 0 and output names the invalid C60 fixture and missing reviewed source metadata.
    Evidence: .sisyphus/evidence/task-5-missing-reviewed-source-negative.txt

  Scenario: Unreviewed source reference is rejected
    Tool: Bash
    Steps: Run `node scripts/validate-supporting-data.mjs --self-check-invalid unreviewed-runtime-source-reference`.
    Expected: Exit 0 and output names the invalid C60 fixture and unreviewed source reference.
    Evidence: .sisyphus/evidence/task-5-unreviewed-source-negative.txt
  ```

  **Commit**: NO | Message: `test(textbooks): reject unreviewed runtime source references` | Files: `scripts/*`, `src/data/*`

- [x] 6. Run aggregate pilot verification and record next-import guidance

  **What to do**: Run final verification after C60 pilot import. Capture evidence for validators, build, import audit, and Playwright smoke/content checks. Add a short next-import guidance note to `.sisyphus/notepads/curriculum-extensibility/learnings.md` describing how the C60 pilot workflow should be repeated for the next topic.
  **Must NOT do**: Do not expand beyond C60 pilot. Do not run `npm run validate:data` as the acceptance gate.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Cross-cutting final verification and workflow documentation.
  - Skills: [`playwright`] - Route/content smoke checks may require browser verification.
  - Omitted: [`git-master`] - Commit only if user explicitly requests later.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: Tasks 3, 4, 5

  **References**:
  - Commands: `npm run validate:all:safe`, `npm run validate:chem-notation`, `npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts`.
  - Notepad: `.sisyphus/notepads/curriculum-extensibility/learnings.md`.

  **Acceptance Criteria**:
  - [ ] `npm run validate:all:safe` exits `0`.
  - [ ] `npm run validate:chem-notation` exits `0`.
  - [ ] `node scripts/audit-business-data-imports.mjs` exits `0`.
  - [ ] `npm run build` exits `0`.
  - [ ] `npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts` exits `0`.
  - [ ] Notepad guidance for repeating the reviewed import workflow exists.

  **QA Scenarios**:
  ```
  Scenario: Safe aggregate gate passes
    Tool: Bash
    Steps: Run `npm run validate:all:safe`.
    Expected: Exit 0 with curriculum, textbook asset, supporting data, import audit, and build success.
    Evidence: .sisyphus/evidence/task-6-validate-all-safe.txt

  Scenario: C60 pilot remains app-visible and scoped
    Tool: Playwright
    Steps: Run `npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts`.
    Expected: Exit 0; content and route shells pass after C60 pilot import.
    Evidence: .sisyphus/evidence/task-6-content-route-smoke.txt
  ```

  **Commit**: YES | Message: `feat(textbooks): add reviewed c60 content pilot` | Files: `src/data/*`, `scripts/*`, `tests/*`, `.sisyphus/notepads/*`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Do not commit unless user explicitly requests it.
- Suggested message if requested: `feat(textbooks): add reviewed c60 content pilot`.
- Keep evidence files if repository workflow expects `.sisyphus/evidence`; otherwise confirm before committing evidence.

## Success Criteria
- C60 / 碳单质 appears as reviewed textbook-derived app content in a small, visible way.
- Runtime-visible records all carry reviewed source references.
- Draft-only experiment remains outside runtime lab content.
- Validators reject missing or unreviewed source references.
- Future textbook topics can repeat the same pilot workflow without new architectural decisions.
