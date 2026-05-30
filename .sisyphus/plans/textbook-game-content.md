# Textbook Game Content Expansion

## TL;DR
> **Summary**: Expand “反应配对” and “完整测验挑战” so they consume all reviewed, reliably collectible textbook reaction formulas and textbook-grounded quiz questions from all eight textbooks, including the four newly added learning-module textbooks.
> **Deliverables**:
> - Concrete inventory of all textbook volumes and the four newly added volume IDs.
> - Updated textbook reaction extraction/review/build flow so every reliably collectible formula is included in `src/data/reactions.json` for Reaction Link.
> - Updated quiz content so Full Quiz Challenge includes textbook-collected and newly authored Chinese-first textbook-grounded questions.
> - Validators and Playwright tests proving data coverage and game behavior.
> **Effort**: Large
> **Parallel**: YES - 6 waves
> **Critical Path**: Reaction branch Task 1 → Task 2 → Task 3 → Task 5; Quiz branch Task 1 → Task 4 → Task 6 → Task 8; both branches → Task 9 → Task 10 → Final Verification Wave

## Context

### Original Request
The user said four textbooks were previously added to the learning module, and the game module cards “反应配对” and “完整测验挑战” must include those new textbook contents. In concrete terms:
- “反应配对” must collect formulas from all textbooks.
- “完整测验挑战” must collect textbook quiz questions.

User follow-up requirements:
- The current structure of the newly added textbook data is uncertain; implementation must discover it from repo files.
- Preserve existing gameplay and expand data sources only.
- Reaction Link must include **all formulas that can be reliably collected** from textbooks.
- Full Quiz Challenge must use collected textbook questions and, where feasible, create new Chinese-first questions based on textbook requirements/content.
- Test strategy is **tests-after**.

### Interview Summary
- Scope is data/content aggregation, not UI/gameplay redesign.
- Runtime modules must continue consuming reviewed data through `src/data/index.js`; games must not directly import `book.md` or source assets.
- New quiz questions are allowed only when grounded in explicit textbook content/requirements and traceable through source metadata.
- OCR/image-only extraction is out of scope unless the project already has machine-readable reviewed content.

### Metis Review (gaps addressed)
- Added a first discovery task to identify all eight textbooks and explicitly identify the four newly added volumes.
- Added deterministic inclusion/exclusion rules for “reliably collectible formulas”.
- Required provenance/source tracking and skipped/ambiguous content reports.
- Required schema compatibility with `isReactionGameUsable(reaction)` and `quizData`.
- Required Node validators and Playwright tests with zero human intervention.

## Work Objectives

### Core Objective
Make the two target games use expanded, reviewed, textbook-grounded data pools while preserving current game behavior.

### Deliverables
- `src/data/textbookIngestion/batches/*.json` and `src/data/textbooks/*/book.md` inventory report in `.sisyphus/evidence/task-1-textbook-inventory.json`.
- Updated `src/data/textbookIngestion/reactionEquationReview.json` covering all current extractor candidates.
- Regenerated `src/data/reactions.json` from reviewed textbook reactions.
- Updated `src/data/quizData.json` with textbook-collected and textbook-authored questions.
- Updated/added validation commands and Playwright tests for reaction and quiz coverage.

### Definition of Done (verifiable conditions with commands)
- `node scripts/textbook/extract-reaction-equations.mjs --report .sisyphus/evidence/task-2-reaction-candidates.json --check` exits `0`.
- `npm run validate:textbook-reactions -- --report .sisyphus/evidence/task-3-reaction-validation.json` exits `0`.
- `node scripts/textbook/build-reviewed-reactions.mjs --check` exits `0`.
- `npm run validate:reaction-game-pool -- --assert-textbook-only --min-game-usable 5 --report .sisyphus/evidence/task-5-reaction-game-pool.json` exits `0`.
- `node scripts/validate-quiz-data.mjs` exits `0`.
- `npm run validate:textbook-coverage -- --textbook pep-chemistry-g10-required-1 --status reviewed` exits `0` after Task 7 extends coverage validation to all eight generated volume IDs.
- `npm run validate:textbook-coverage -- --textbook pep-chemistry-g10-required-2 --status reviewed` exits `0` after Task 7 extends coverage validation to all eight generated volume IDs.
- `npm run validate:textbook-coverage -- --textbook pep-chemistry-g11-selective-1 --status reviewed` exits `0` after Task 7 extends coverage validation to all eight generated volume IDs.
- `npm run validate:textbook-coverage -- --textbook pep-chemistry-g11-selective-2 --status reviewed` exits `0` after Task 7 extends coverage validation to all eight generated volume IDs.
- `npm run validate:textbook-coverage -- --textbook rj-chemistry-g12-selective-3-organic-2019 --status reviewed` exits `0`.
- `npm run validate:textbook-coverage -- --textbook rj-chemistry-grade8-54-2024-full --status reviewed` exits `0`.
- `npm run validate:textbook-coverage -- --textbook rj-chemistry-grade9-2024-vol1 --status reviewed` exits `0`.
- `npm run validate:textbook-coverage -- --textbook rj-chemistry-grade9-2024-vol2 --status reviewed` exits `0`.
- `npx playwright test tests/ui/reaction-game-completion.spec.ts tests/ui/games-layout.spec.ts tests/content/pep-learning-tabs.spec.ts` exits `0`.
- `npm run validate:all:safe` exits `0`.

### Must Have
- Identify all eight textbook volumes from `src/data/textbookIngestion/batches/` and `src/data/textbooks/`.
- Define and apply reliable formula inclusion rules:
  - Include machine-readable equations from Markdown text that extractor finds and reviewer marks `include`.
  - Include formulas with supported one-way equation operators: `=`, `→`, `->`, `\\rightarrow`, `\\longrightarrow`, `\\xrightarrow`, `\\xlongequal`, supported condition annotations.
  - Exclude reversible/equilibrium notation unsupported by Reaction Link pairing.
  - Exclude word-only, incomplete exercise, ambiguous, non-reaction, unsupported notation, or outside-main-text candidates unless existing reviewed metadata resolves them.
  - Deduplicate by `normalizedEquation`, preserving merged provenance.
- Ensure every included game reaction has `id`, `name`, `description`, non-empty `reactants`, non-empty `products`, non-empty `curriculumTags`, `sourceReviewStatus: 'reviewed'`, `sourceKind: 'textbook'`, and source references.
- Ensure every generated/authored quiz question is Chinese-first, has exactly one correct answer, no duplicate options, no placeholders, valid `correctIndex`, valid `difficulty`, non-empty `curriculumTags`, and source references.

### Must NOT Have
- Do not redesign game UI, cards, scoring, timers, achievements, routing, or persistence.
- Do not make `src/modules/games.js` or `src/modules/quiz.js` import raw `book.md` or image assets.
- Do not OCR images or use image-only formulas unless already present as reviewed machine-readable data.
- Do not invent reactions or quiz facts not grounded in textbook content.
- Do not silently drop ambiguous formula/question candidates; report them with source references.
- Do not refactor unrelated data modules.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after using existing Node validators and Playwright.
- QA policy: Every task has agent-executed happy and failure/edge scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 (inventory)
Wave 2: Task 2 (reaction candidates), Task 4 (quiz source audit), Task 7 (validator hardening)
Wave 3: Task 3 (reaction manifest), Task 6 (quiz authoring)
Wave 4: Task 5 (runtime reactions), Task 8 (quiz runtime)
Wave 5: Task 9 (Playwright coverage)
Wave 6: Task 10 (full verification/evidence consolidation)

### Dependency Matrix (full, all tasks)
- Task 1: blocks Tasks 2, 3, 4, 6, 7, 10.
- Task 2: blocked by Task 1; blocks Task 3.
- Task 3: blocked by Tasks 1, 2; blocks Task 5.
- Task 4: blocked by Task 1; blocks Task 6.
- Task 5: blocked by Task 3; blocks Task 9 and Task 10.
- Task 6: blocked by Task 4; blocks Task 8.
- Task 7: blocked by Task 1; supports Tasks 5, 8, 10.
- Task 8: blocked by Task 6; blocks Task 9 and Task 10.
- Task 9: blocked by Tasks 5, 8; blocks Task 10.
- Task 10: blocked by all prior tasks.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 1 task → quick
- Wave 2 → 3 tasks → unspecified-high, unspecified-high, quick
- Wave 3 → 2 tasks → unspecified-high, writing
- Wave 4 → 2 tasks → quick, quick
- Wave 5 → 1 task → unspecified-high
- Wave 6 → 1 task → unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Inventory all textbooks and identify the four newly added volumes

  **What to do**: Read `src/data/textbookIngestion/batches/`, `src/data/textbooks/`, and `src/data/learningSegmentTextbookContent.js`. Produce `.sisyphus/evidence/task-1-textbook-inventory.json` with exactly eight discovered volumes, their batch file, sourcePath, displayName/bookTitle, volumeId, and whether they are one of the four newly added learning-module volumes. Use the learning-tabs test target labels to classify the four older PEP learning tabs as already established: `pep-chemistry-g10-required-1`, `pep-chemistry-g10-required-2`, `pep-chemistry-g11-selective-1`, `pep-chemistry-g11-selective-2`. Classify the four newer volumes as `rj-chemistry-g12-selective-3-organic-2019`, `rj-chemistry-grade8-54-2024-full`, `rj-chemistry-grade9-2024-vol1`, `rj-chemistry-grade9-2024-vol2` unless the batch/source metadata proves otherwise; if metadata contradicts this, record the contradiction and use batch `generatedAt`/learning tab evidence as tiebreaker.
  **Must NOT do**: Do not edit source data in this task. Do not guess paths not present in batch JSON.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: focused inventory/report generation.
  - Skills: [] - No implementation skill needed beyond careful file inspection.
  - Omitted: [`frontend-design`] - No UI design changes.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 2, 3, 4, 6, 7, 10 | Blocked By: none

  **References**:
  - Pattern: `src/data/textbookIngestion/batches/pep-chemistry-g10-required-1.json:1-18` - batch schema includes `volumeId`, `displayName`, `sourcePath`, `assetRoot`, `sourceHash`.
  - Pattern: `src/data/textbooks/README.md:17-35` - expected textbook directory structure and runtime boundary.
  - Pattern: `tests/content/pep-learning-tabs.spec.ts:114-120` - four pre-existing tab labels from earlier learning-module coverage.
  - Pattern: `src/data/textbookIngestion/generated/` - eight generated volume directories already discovered.

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/task-1-textbook-inventory.json` exists and is valid JSON.
  - [ ] JSON contains exactly eight volume records.
  - [ ] JSON marks exactly four records as `newlyAddedForThisRequest: true`.
  - [ ] Every record has `volumeId`, `displayName`, `batchPath`, `sourcePath`, `bookExists`, `coverageMatrixPath`, and `newlyAddedForThisRequest`.
  - [ ] Running `node -e "const fs=require('fs'); const p='.sisyphus/evidence/task-1-textbook-inventory.json'; const d=JSON.parse(fs.readFileSync(p,'utf8')); if(d.volumes.length!==8) throw new Error('expected 8'); if(d.volumes.filter(v=>v.newlyAddedForThisRequest).length!==4) throw new Error('expected 4 new'); if(d.volumes.some(v=>!v.volumeId||!v.sourcePath||!v.batchPath)) throw new Error('missing fields');"` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Inventory includes all textbook batches
    Tool: Bash
    Steps: Run the node one-liner in Acceptance Criteria after creating the inventory report.
    Expected: Command exits 0; report has eight volumes and four newlyAddedForThisRequest volumes.
    Evidence: .sisyphus/evidence/task-1-textbook-inventory.json

  Scenario: Missing batch is detected
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('.sisyphus/evidence/task-1-textbook-inventory.json','utf8')); if(!d.volumes.some(v=>v.batchPath.endsWith('rj-chemistry-grade9-2024-vol1.json'))) throw new Error('missing vol1');"`.
    Expected: Command exits 0; if the expected batch is absent, it fails with `missing vol1` and task remains incomplete.
    Evidence: .sisyphus/evidence/task-1-textbook-inventory-check.log
  ```

  **Commit**: YES | Message: `chore(textbook): inventory game content sources` | Files: [.sisyphus/evidence/task-1-textbook-inventory.json]

- [x] 2. Refresh textbook reaction candidate extraction for all eight books

  **What to do**: Run the existing extractor across `src/data/textbooks/*/book.md`, generate `.sisyphus/evidence/task-2-reaction-candidates.json`, and verify the report includes all eight files from Task 1. Use extractor output to determine every reliably collectible formula candidate. Treat only machine-readable Markdown text candidates as eligible.
  **Must NOT do**: Do not edit `reactionEquationReview.json` in this task. Do not OCR images. Do not add formulas not emitted by the extractor.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: requires careful data inspection and validation.
  - Skills: [] - No special skill needed.
  - Omitted: [`threejs-animation`] - No animation work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 3 | Blocked By: Task 1

  **References**:
  - Pattern: `scripts/textbook/extract-reaction-equations.mjs:119-160` - builds extraction report with `fileCount`, `candidateCount`, `perFileCounts`, and `candidates`.
  - Pattern: `scripts/textbook/extract-reaction-equations.mjs:162-175` - discovers `book.md` under each textbook directory.
  - Pattern: `src/data/textbookIngestion/reactionEquationReview.json:17-39` - allowed inclusion/exclusion decisions and semantics.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/extract-reaction-equations.mjs --report .sisyphus/evidence/task-2-reaction-candidates.json --check` exits `0`.
  - [ ] `.sisyphus/evidence/task-2-reaction-candidates.json` has `fileCount: 8`.
  - [ ] `perFileCounts` includes every `sourcePath` from `.sisyphus/evidence/task-1-textbook-inventory.json`.
  - [ ] Candidate report is not manually edited; it is generated by the extractor.

  **QA Scenarios**:
  ```
  Scenario: Extractor sees all textbooks
    Tool: Bash
    Steps: Run `node scripts/textbook/extract-reaction-equations.mjs --report .sisyphus/evidence/task-2-reaction-candidates.json --check`.
    Expected: Exit 0; report has `fileCount` 8 and non-empty `candidates` array.
    Evidence: .sisyphus/evidence/task-2-reaction-candidates.json

  Scenario: Inventory/extractor mismatch fails
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs'); const inv=JSON.parse(fs.readFileSync('.sisyphus/evidence/task-1-textbook-inventory.json','utf8')); const rep=JSON.parse(fs.readFileSync('.sisyphus/evidence/task-2-reaction-candidates.json','utf8')); const seen=new Set(rep.perFileCounts.map(x=>x.sourceFile)); const missing=inv.volumes.filter(v=>!seen.has(v.sourcePath)); if(missing.length) throw new Error('extractor missing: '+missing.map(v=>v.volumeId).join(','));"`.
    Expected: Exit 0; any missing textbook source fails with explicit volume IDs.
    Evidence: .sisyphus/evidence/task-2-extractor-inventory-check.log
  ```

  **Commit**: YES | Message: `chore(textbook): refresh reaction candidates` | Files: [.sisyphus/evidence/task-2-reaction-candidates.json]

- [x] 3. Complete reaction review manifest coverage for all collectible formulas

  **What to do**: Update `src/data/textbookIngestion/reactionEquationReview.json` so every current candidate from Task 2 has exactly one review decision. Set `candidateSourceReport` to `.sisyphus/evidence/task-2-reaction-candidates.json`, set `candidateCount` to the Task 2 report `candidateCount`, and keep `reviewStatus` in a completed value accepted by `scripts/textbook/build-reviewed-reactions.mjs` (`reviewed-complete` is the preferred value). Mark every reliably collectible formula `include`. Mark skipped candidates with one of the existing `exclude_*` decision codes and a concrete `reason`. Preserve existing included decisions unless the refreshed candidate report proves they are stale. For duplicate normalized equations, mark non-canonical candidates `exclude_duplicate` and merge their `sourceRefs` into the canonical included review.
  **Must NOT do**: Do not create new decision codes unless validator forces it. Do not include unsupported reversible/equilibrium formulas in Reaction Link. Do not silently delete stale review context without recording why in git diff.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: high-volume content review with chemistry/data correctness implications.
  - Skills: [] - Use existing validator workflow.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Task 5 | Blocked By: Tasks 1, 2

  **References**:
  - Pattern: `src/data/textbookIngestion/reactionEquationReview.json:17-39` - allowed decisions and exact semantics.
  - Pattern: `scripts/textbook/validate-reaction-extraction.mjs:138-240` - validates unreviewed, stale, duplicate, invalid decisions, missing reasons, and unusable includes.
  - Pattern: `scripts/textbook/build-reviewed-reactions.mjs:136-203` - runtime builder fails closed on incomplete/stale reviews.

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-reactions -- --report .sisyphus/evidence/task-3-reaction-validation.json` exits `0`.
  - [ ] `.sisyphus/evidence/task-3-reaction-validation.json` reports zero unreviewed current candidates.
  - [ ] `src/data/textbookIngestion/reactionEquationReview.json.candidateSourceReport` equals `.sisyphus/evidence/task-2-reaction-candidates.json`.
  - [ ] `src/data/textbookIngestion/reactionEquationReview.json.candidateCount` equals `.sisyphus/evidence/task-2-reaction-candidates.json.candidateCount`.
  - [ ] Every excluded candidate in `reactionEquationReview.json` has a non-empty `reason`.
  - [ ] Every included candidate has usable `reactants`, `products`, or builder-resolvable normalized output.
  - [ ] The manifest `candidateCount` matches `.sisyphus/evidence/task-2-reaction-candidates.json.candidateCount`.

  **QA Scenarios**:
  ```
  Scenario: Complete review coverage passes
    Tool: Bash
    Steps: Run `npm run validate:textbook-reactions -- --report .sisyphus/evidence/task-3-reaction-validation.json`.
    Expected: Exit 0; JSON report status is `pass`.
    Evidence: .sisyphus/evidence/task-3-reaction-validation.json

  Scenario: Missing exclusion reason is rejected
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('src/data/textbookIngestion/reactionEquationReview.json','utf8')); const bad=m.reviews.filter(r=>String(r.decision).startsWith('exclude_')&&r.decision!=='exclude_duplicate'&&!(r.reason&&r.reason.trim())); if(bad.length) throw new Error('missing exclusion reasons: '+bad.slice(0,5).map(r=>r.candidateId).join(','));"`.
    Expected: Exit 0; otherwise fails with the first candidate IDs missing reasons.
    Evidence: .sisyphus/evidence/task-3-exclusion-reason-check.log

  Scenario: Manifest points at refreshed candidate report
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('src/data/textbookIngestion/reactionEquationReview.json','utf8')); const r=JSON.parse(fs.readFileSync('.sisyphus/evidence/task-2-reaction-candidates.json','utf8')); if(m.candidateSourceReport!=='.sisyphus/evidence/task-2-reaction-candidates.json') throw new Error('candidateSourceReport not refreshed'); if(m.candidateCount!==r.candidateCount) throw new Error('candidateCount mismatch');"`.
    Expected: Exit 0; manifest source report and count match Task 2.
    Evidence: .sisyphus/evidence/task-3-manifest-source-check.log
  ```

  **Commit**: YES | Message: `data(reactions): review textbook equation candidates` | Files: [src/data/textbookIngestion/reactionEquationReview.json, .sisyphus/evidence/task-3-reaction-validation.json]

- [x] 4. Audit textbook quiz source material and choose grounded question candidates

  **What to do**: Inspect `src/data/quizData.json`, `src/data/learningSegmentTextbookContent.js`, textbook coverage matrices, and textbook Markdown content to identify existing textbook-derived questions and source sections suitable for additional authored multiple-choice questions. Produce `.sisyphus/evidence/task-4-quiz-source-audit.json` listing per volume: collected existing quiz IDs, candidate source sections, sourcePath, lineRange, curriculumTags, and recommended number of new questions. Minimum target: at least two valid textbook-grounded Full Quiz questions per newly added textbook unless the source audit proves insufficient machine-readable reviewed content; if insufficient, record explicit reason.
  **Must NOT do**: Do not add questions in this task. Do not create questions from unsupported image-only content.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: requires source-content judgment and provenance planning.
  - Skills: [] - Content audit only.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 6 | Blocked By: Task 1

  **References**:
  - Pattern: `src/data/quizData.json:1-20` - quizData top-level shape and normal MCQ fields.
  - Pattern: `src/data/learningSegmentTextbookContent.js:1-15` - generated learning segment records include `sourceVolumeId`, `sourcePath`, `lineRange`, `textbookName`, and blocks.
  - Pattern: `scripts/validate-quiz-data.mjs:177-226` - generated/authored records require source references and no placeholders.
  - Pattern: `src/data/textbooks/README.md:156-188` - runtime source review contract.

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/task-4-quiz-source-audit.json` exists and is valid JSON.
  - [ ] Audit covers all eight volumes from Task 1.
  - [ ] Each newly added volume has either at least two recommended new MCQ candidates or a concrete `insufficientSourceReason`.
  - [ ] Every candidate has `sourceVolumeId`, `sourcePath`, `lineRange`, `sourceHeading`, `curriculumTags`, `questionBasis`, and `allowedQuestionType: "singleChoice"`.

  **QA Scenarios**:
  ```
  Scenario: Quiz source audit covers all volumes
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs'); const inv=JSON.parse(fs.readFileSync('.sisyphus/evidence/task-1-textbook-inventory.json','utf8')); const audit=JSON.parse(fs.readFileSync('.sisyphus/evidence/task-4-quiz-source-audit.json','utf8')); const ids=new Set(audit.volumes.map(v=>v.sourceVolumeId)); const missing=inv.volumes.filter(v=>!ids.has(v.volumeId)); if(missing.length) throw new Error('missing audit volumes: '+missing.map(v=>v.volumeId).join(','));"`.
    Expected: Exit 0; all inventory volumes are covered.
    Evidence: .sisyphus/evidence/task-4-quiz-source-audit.json

  Scenario: Newly added volume without candidates is explicitly justified
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs'); const audit=JSON.parse(fs.readFileSync('.sisyphus/evidence/task-4-quiz-source-audit.json','utf8')); const bad=audit.volumes.filter(v=>v.newlyAddedForThisRequest && (!Array.isArray(v.newQuestionCandidates)||v.newQuestionCandidates.length<2) && !(v.insufficientSourceReason&&v.insufficientSourceReason.trim())); if(bad.length) throw new Error('unjustified sparse quiz candidates: '+bad.map(v=>v.sourceVolumeId).join(','));"`.
    Expected: Exit 0; sparse volumes have explicit reasons.
    Evidence: .sisyphus/evidence/task-4-sparse-volume-check.log
  ```

  **Commit**: YES | Message: `chore(quiz): audit textbook question sources` | Files: [.sisyphus/evidence/task-4-quiz-source-audit.json]

- [x] 5. Regenerate and validate runtime Reaction Link data

  **What to do**: Use existing builder to regenerate `src/data/reactions.json` from the completed review manifest. Ensure all included reaction records are game-usable and textbook-sourced. Do not change `src/modules/games.js` unless validation proves current import/filter path cannot consume the expanded pool; current code already filters `reactions` from `src/data/index.js` with `isReactionGameUsable`.
  **Must NOT do**: Do not hand-edit generated reaction records if builder supports the needed fields. Do not change `REACTION_ROUND_SIZE`, scoring, timer, or UI copy except if a validation message is inaccurate.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: deterministic builder + validation.
  - Skills: [] - No special skills.
  - Omitted: [`systematic-debugging`] - Use only if validators fail unexpectedly.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Tasks 9, 10 | Blocked By: Task 3

  **References**:
  - Pattern: `scripts/textbook/build-reviewed-reactions.mjs:102-115` - CLI usage for `--check` and `--write`.
  - Pattern: `src/modules/games.js:689-755` - Reaction Link reads `reactions`, selects five playable records, and uses `isReactionGameUsable`.
  - Pattern: `scripts/validate-reaction-game-pool.mjs:95-193` - runtime reaction game-pool validation.
  - Pattern: `src/data/index.js:34-39` - exports `reactions` to runtime modules.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/build-reviewed-reactions.mjs --check` exits `0` before writing.
  - [ ] `node scripts/textbook/build-reviewed-reactions.mjs --write` exits `0` and updates only `src/data/reactions.json` among runtime data files.
  - [ ] `npm run validate:reaction-game-pool -- --assert-textbook-only --min-game-usable 5 --report .sisyphus/evidence/task-5-reaction-game-pool.json` exits `0`.
  - [ ] `.sisyphus/evidence/task-5-reaction-game-pool.json` reports `gameUsableReactions >= 5` and zero invalid source references.
  - [ ] `src/modules/games.js` remains behaviorally unchanged unless a direct compatibility defect is found and documented.

  **QA Scenarios**:
  ```
  Scenario: Runtime reaction game pool is valid
    Tool: Bash
    Steps: Run `node scripts/textbook/build-reviewed-reactions.mjs --check`, then `node scripts/textbook/build-reviewed-reactions.mjs --write`, then `npm run validate:reaction-game-pool -- --assert-textbook-only --min-game-usable 5 --report .sisyphus/evidence/task-5-reaction-game-pool.json`.
    Expected: All commands exit 0; report status is `pass`.
    Evidence: .sisyphus/evidence/task-5-reaction-game-pool.json

  Scenario: Duplicate normalized equations are rejected unless allowed
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync('.sisyphus/evidence/task-5-reaction-game-pool.json','utf8')); if((r.counters?.duplicateNormalizedEquations??0)!==0) throw new Error('duplicate normalized equations remain');"`.
    Expected: Exit 0; duplicates counter is 0.
    Evidence: .sisyphus/evidence/task-5-duplicate-check.log
  ```

  **Commit**: YES | Message: `data(reactions): expand reaction link textbook pool` | Files: [src/data/reactions.json, .sisyphus/evidence/task-5-reaction-game-pool.json]

- [x] 6. Add textbook-grounded quiz questions

  **What to do**: Update `src/data/quizData.json` with selected existing/collected textbook questions and newly authored Chinese-first single-choice questions from Task 4. For newly authored questions, use IDs prefixed with `textbook-generated-` or the existing textbook namespace if already used in `quizData.json`. Each authored question must have four options, one correct answer, explanation grounded in source, `generatedFromShortAnswer: true` if following the existing generated-record contract, `generationSource` naming the source audit file and source section, `curriculumTags`, valid difficulty (`基础`, `进阶`, or `挑战` for generated records), and `sourceReferences` containing `sourceVolumeId` and `candidateId`. Prefer 2-4 new questions per newly added textbook when source content supports it.
  **Must NOT do**: Do not add placeholder text. Do not add multiple-correct-answer questions. Do not duplicate existing canonical quiz questions. Do not use English-first prompts.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: Chinese-first educational content authoring with strict schema.
  - Skills: [] - No additional skill required.
  - Omitted: [`frontend-design`] - No UI changes.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Task 8 | Blocked By: Task 4

  **References**:
  - Pattern: `scripts/validate-quiz-data.mjs:78-123` - validates IDs, generated records, hand-authored MCQ count.
  - Pattern: `scripts/validate-quiz-data.mjs:126-175` - validates basic shape.
  - Pattern: `scripts/validate-quiz-data.mjs:177-226` - validates generated records, source references, no placeholders.
  - Pattern: `src/modules/quiz.js:532-539` - Full Quiz uses shuffled `quizData` and slices 20 questions.

  **Acceptance Criteria**:
  - [ ] `node scripts/validate-quiz-data.mjs` exits `0`.
  - [ ] `node scripts/validate-quiz-data.mjs --self-check-invalid duplicate-options` exits `0`.
  - [ ] `node scripts/validate-quiz-data.mjs --self-check-invalid placeholder` exits `0`.
  - [ ] `node scripts/validate-quiz-data.mjs --self-check-invalid missing-source-references` exits `0`.
  - [ ] Every newly added quiz item has Chinese-first `question`, four non-empty unique options, valid `correctIndex`, non-empty `explanation`, non-empty `curriculumTags`, and source metadata.
  - [ ] `.sisyphus/evidence/task-6-added-quiz-ids.json` has exact shape `{ "quizIds": ["<quiz-id>"], "items": [{ "id": "<quiz-id>", "sourceVolumeId": "<volume-id>", "sourceBasis": "<source summary>", "sourceReferences": [{ "sourceVolumeId": "<volume-id>", "candidateId": "<candidate-id>" }] }] }`.
  - [ ] Every string in `quizIds` appears exactly once as an `items[].id` value.

  **QA Scenarios**:
  ```
  Scenario: Quiz data accepts new textbook questions
    Tool: Bash
    Steps: Run `node scripts/validate-quiz-data.mjs` and write `.sisyphus/evidence/task-6-added-quiz-ids.json`, then run `node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync('.sisyphus/evidence/task-6-added-quiz-ids.json','utf8')); if(!Array.isArray(r.quizIds)||!Array.isArray(r.items)) throw new Error('invalid evidence shape'); const itemIds=new Set(r.items.map(i=>i.id)); const missing=r.quizIds.filter(id=>!itemIds.has(id)); if(missing.length) throw new Error('quizIds missing item records: '+missing.join(',')); if(r.items.some(i=>!i.id||!i.sourceVolumeId||!i.sourceBasis||!Array.isArray(i.sourceReferences)||i.sourceReferences.length===0)) throw new Error('missing item provenance');"`.
    Expected: Validator exits 0; evidence has the exact schema and provenance for all new quiz IDs.
    Evidence: .sisyphus/evidence/task-6-added-quiz-ids.json

  Scenario: Validator rejects bad generated quiz shapes
    Tool: Bash
    Steps: Run `node scripts/validate-quiz-data.mjs --self-check-invalid duplicate-options && node scripts/validate-quiz-data.mjs --self-check-invalid placeholder && node scripts/validate-quiz-data.mjs --self-check-invalid missing-source-references`.
    Expected: All self-check commands exit 0, proving invalid fixtures are rejected.
    Evidence: .sisyphus/evidence/task-6-quiz-validator-self-check.log
  ```

  **Commit**: YES | Message: `data(quiz): add textbook grounded challenge questions` | Files: [src/data/quizData.json, .sisyphus/evidence/task-6-added-quiz-ids.json]

- [x] 7. Extend validators for all-eight textbook coverage and game content evidence

  **What to do**: Mandatory validator work. First, extend `scripts/textbook/validate-coverage.mjs` `knownTextbookBatches` so it recognizes all eight generated volume IDs and maps each to `src/data/textbookIngestion/generated/<volumeId>/coverage-matrix.json`: `pep-chemistry-g10-required-1`, `pep-chemistry-g10-required-2`, `pep-chemistry-g11-selective-1`, `pep-chemistry-g11-selective-2`, `rj-chemistry-g12-selective-3-organic-2019`, `rj-chemistry-grade8-54-2024-full`, `rj-chemistry-grade9-2024-vol1`, `rj-chemistry-grade9-2024-vol2`. Then extend existing validators only if current validators cannot prove this plan’s remaining acceptance criteria. Preferred minimal changes: add report output to `scripts/validate-quiz-data.mjs` if needed. If a new `scripts/validate-textbook-game-content.mjs` is necessary, design it so Task 7 validates CLI/schema behavior with local fixtures that Task 7 creates under `.sisyphus/evidence/task-7-fixtures/`; real Task 5/Task 6 evidence validation must be performed in Task 10 after those artifacts exist.
  **Must NOT do**: Do not rewrite validators broadly. Do not change unrelated validation behavior. Do not weaken existing fail-closed behavior.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: targeted validator addition/hardening.
  - Skills: [] - No special skills.
  - Omitted: [`test-driven-development`] - User chose tests-after; include validator self-checks after implementation.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 10 | Blocked By: Task 1

  **References**:
  - Pattern: `package.json:6-35` - existing validation script naming.
  - Pattern: `scripts/validate-reaction-game-pool.mjs:40-80` - CLI option parser style.
  - Pattern: `scripts/validate-quiz-data.mjs:42-61` - `parseArgs` style and self-check modes.
  - Pattern: `scripts/textbook/validate-coverage.mjs:29-54` - eight known textbook batches.

  **Acceptance Criteria**:
  - [ ] `scripts/textbook/validate-coverage.mjs` recognizes all eight volume IDs listed in Task 1.
  - [ ] Each of these commands exits `0`: `npm run validate:textbook-coverage -- --textbook pep-chemistry-g10-required-1 --status reviewed`, `npm run validate:textbook-coverage -- --textbook pep-chemistry-g10-required-2 --status reviewed`, `npm run validate:textbook-coverage -- --textbook pep-chemistry-g11-selective-1 --status reviewed`, `npm run validate:textbook-coverage -- --textbook pep-chemistry-g11-selective-2 --status reviewed`, `npm run validate:textbook-coverage -- --textbook rj-chemistry-g12-selective-3-organic-2019 --status reviewed`, `npm run validate:textbook-coverage -- --textbook rj-chemistry-grade8-54-2024-full --status reviewed`, `npm run validate:textbook-coverage -- --textbook rj-chemistry-grade9-2024-vol1 --status reviewed`, `npm run validate:textbook-coverage -- --textbook rj-chemistry-grade9-2024-vol2 --status reviewed`.
  - [ ] `.sisyphus/evidence/task-7-validator-gap-analysis.json` states existing/new commands that cover each criterion.
  - [ ] If a new script is created, `node scripts/validate-textbook-game-content.mjs --inventory .sisyphus/evidence/task-7-fixtures/valid-inventory.json --reaction-report .sisyphus/evidence/task-7-fixtures/valid-reaction-report.json --quiz-report .sisyphus/evidence/task-7-fixtures/valid-quiz-report.json` exits `0`.
  - [ ] If `package.json` is modified, `npm run validate:textbook-game-content -- --inventory .sisyphus/evidence/task-7-fixtures/valid-inventory.json --reaction-report .sisyphus/evidence/task-7-fixtures/valid-reaction-report.json --quiz-report .sisyphus/evidence/task-7-fixtures/valid-quiz-report.json` exits `0`.
  - [ ] Existing `npm run validate:all:safe` command semantics are not weakened.

  **QA Scenarios**:
  ```
  Scenario: Validator coverage is explicit
    Tool: Bash
    Steps: Run all eight `npm run validate:textbook-coverage -- --textbook <id> --status reviewed` commands and save output to `.sisyphus/evidence/task-7-validator-run.log`.
    Expected: Every command exits 0; log identifies coverage for all eight volumes.
    Evidence: .sisyphus/evidence/task-7-validator-run.log

  Scenario: Missing new volume fails or is justified
    Tool: Bash
    Steps: If a new script exists, run it against an intentionally copied inventory fixture with one newly added volume removed under `.sisyphus/evidence/task-7-invalid-inventory.json`.
    Expected: Command exits non-zero and names the missing volume; if no new script exists, record why existing validators make this redundant in gap analysis.
    Evidence: .sisyphus/evidence/task-7-validator-gap-analysis.json

  Scenario: Coverage validator recognizes PEP and RJ IDs
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs'); const s=fs.readFileSync('scripts/textbook/validate-coverage.mjs','utf8'); for (const id of ['pep-chemistry-g10-required-1','pep-chemistry-g10-required-2','pep-chemistry-g11-selective-1','pep-chemistry-g11-selective-2','rj-chemistry-g12-selective-3-organic-2019','rj-chemistry-grade8-54-2024-full','rj-chemistry-grade9-2024-vol1','rj-chemistry-grade9-2024-vol2']) { if(!s.includes(id)) throw new Error('missing coverage id '+id); }"`.
    Expected: Exit 0; validator source includes all eight IDs.
    Evidence: .sisyphus/evidence/task-7-coverage-id-check.log
  ```

  **Commit**: YES | Message: `test(data): validate textbook game coverage` | Files: [scripts/textbook/validate-coverage.mjs, scripts/validate-textbook-game-content.mjs, package.json, .sisyphus/evidence/task-7-validator-gap-analysis.json]

- [x] 8. Verify Full Quiz Challenge consumes expanded quizData without gameplay changes

  **What to do**: Confirm `src/modules/quiz.js` continues to use `quizData` from `src/data/index.js` for full mode. Change no quiz gameplay unless the expanded schema requires a compatibility fix. If compatibility fix is needed, keep it limited to rendering/source metadata-safe fields and preserve `FULL_QUIZ_COUNT = 20`, scoring, result card, and persistence behavior. Produce `.sisyphus/evidence/task-8-full-quiz-data-check.json` listing total quiz count, new textbook quiz IDs, and whether each can enter the full-quiz pool.
  **Must NOT do**: Do not change the 20-question challenge size. Do not add source filters or UI badges. Do not alter quick quiz behavior.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: mostly verification of existing data flow.
  - Skills: [] - No special skills.
  - Omitted: [`frontend-design`] - No UI redesign.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: Tasks 9, 10 | Blocked By: Task 6

  **References**:
  - Pattern: `src/modules/quiz.js:15-18` - `FULL_QUIZ_COUNT = 20` and game key.
  - Pattern: `src/modules/quiz.js:50-52` - full quiz starts via `startfullquiz`.
  - Pattern: `src/modules/quiz.js:532-539` - full mode shuffles `quizData` and slices 20.
  - Pattern: `src/data/index.js:34` - exports `quizData` from `quizData.json`.

  **Acceptance Criteria**:
  - [ ] `node scripts/validate-quiz-data.mjs` exits `0` after any compatibility adjustments.
  - [ ] `.sisyphus/evidence/task-8-full-quiz-data-check.json` exists and lists every Task 6 quiz ID as `eligibleForFullQuiz: true`.
  - [ ] `src/modules/quiz.js` either has no diff or only minimal compatibility diff unrelated to gameplay rules.
  - [ ] Full mode still selects 20 questions by `shuffleArray([...quizData]).slice(0, FULL_QUIZ_COUNT)` or an equivalent that includes the full expanded pool.

  **QA Scenarios**:
  ```
  Scenario: Full quiz pool includes new textbook quiz IDs
    Tool: Bash
    Steps: Run `node -e "import('./src/data/index.js').then(({quizData})=>{const fs=require('fs'); const ids=JSON.parse(fs.readFileSync('.sisyphus/evidence/task-6-added-quiz-ids.json','utf8')).quizIds; const set=new Set(quizData.map(q=>q.id)); const missing=ids.filter(id=>!set.has(id)); if(missing.length) throw new Error('missing quiz ids: '+missing.join(',')); fs.writeFileSync('.sisyphus/evidence/task-8-full-quiz-data-check.json', JSON.stringify({totalQuizCount:quizData.length, quizIds:ids.map(id=>({id, eligibleForFullQuiz:set.has(id)}))}, null, 2));})"`.
    Expected: Exit 0; evidence file lists each new quiz ID as eligible.
    Evidence: .sisyphus/evidence/task-8-full-quiz-data-check.json

  Scenario: Full quiz count remains 20
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs'); const s=fs.readFileSync('src/modules/quiz.js','utf8'); if(!/FULL_QUIZ_COUNT\s*=\s*20/.test(s)) throw new Error('FULL_QUIZ_COUNT changed');"`.
    Expected: Exit 0; full quiz challenge size remains 20.
    Evidence: .sisyphus/evidence/task-8-full-quiz-count-check.log
  ```

  **Commit**: YES | Message: `test(quiz): verify textbook quiz pool eligibility` | Files: [.sisyphus/evidence/task-8-full-quiz-data-check.json, src/modules/quiz.js]

- [x] 9. Add or update Playwright coverage for target games

  **What to do**: Extend `tests/ui/reaction-game-completion.spec.ts` to assert visible Reaction Link session reactions come from textbook reviewed records and complete/mismatch flows still work. Extend `tests/ui/games-layout.spec.ts` or create `tests/ui/full-quiz-textbook-content.spec.ts` to prove Full Quiz Challenge can display at least one Task 6 textbook-derived/generated question when quizData is deterministically seeded in browser context. Prefer deterministic `Math.random` seeding or app-state inspection over flaky random waiting. Save runtime evidence screenshots/JSON under `.sisyphus/evidence/`.
  **Must NOT do**: Do not rely on manual visual inspection. Do not make tests depend on random chance. Do not skip existing completion/mismatch assertions.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Playwright test design requires deterministic runtime coverage.
  - Skills: [] - Use existing test patterns.
  - Omitted: [`frontend-design`] - No visual redesign.

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: Task 10 | Blocked By: Tasks 5, 8

  **References**:
  - Pattern: `tests/ui/reaction-game-completion.spec.ts:59-83` - helper to open Reaction Link game.
  - Pattern: `tests/ui/reaction-game-completion.spec.ts:111-143` - helper to complete pairs and choose mismatch.
  - Pattern: `tests/ui/games-layout.spec.ts:41-70` - existing full quiz 20-question flow.
  - Pattern: `playwright.config.ts:3-24` - test directory, base URL, setup/teardown.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/ui/reaction-game-completion.spec.ts` exits `0`.
  - [ ] `npx playwright test tests/ui/games-layout.spec.ts` exits `0` if modified.
  - [ ] If `tests/ui/full-quiz-textbook-content.spec.ts` is created, `npx playwright test tests/ui/full-quiz-textbook-content.spec.ts` exits `0`.
  - [ ] Reaction test evidence proves at least one visible reaction session ID exists in `src/data/reactions.json` with `sourceKind: 'textbook'` and `sourceReviewStatus: 'reviewed'`.
  - [ ] Quiz test evidence proves at least one Task 6 quiz ID is renderable in the Full Quiz modal without breaking scoring progression.

  **QA Scenarios**:
  ```
  Scenario: Reaction Link still completes with textbook reactions
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/reaction-game-completion.spec.ts`.
    Expected: Exit 0; completion screenshot/evidence written; test asserts visible reaction IDs are reviewed textbook records.
    Evidence: .sisyphus/evidence/task-9-reaction-textbook-runtime.json

  Scenario: Full Quiz Challenge renders a textbook-derived question deterministically
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/full-quiz-textbook-content.spec.ts` if created, otherwise run updated `npx playwright test tests/ui/games-layout.spec.ts`.
    Expected: Exit 0; quiz modal shows a Task 6 question ID/text in a controlled session and answering one option enables next step.
    Evidence: .sisyphus/evidence/task-9-full-quiz-textbook-runtime.json
  ```

  **Commit**: YES | Message: `test(games): cover textbook reaction and quiz content` | Files: [tests/ui/reaction-game-completion.spec.ts, tests/ui/games-layout.spec.ts, tests/ui/full-quiz-textbook-content.spec.ts, .sisyphus/evidence/task-9-reaction-textbook-runtime.json, .sisyphus/evidence/task-9-full-quiz-textbook-runtime.json]

- [x] 10. Run full data, build, and content coverage verification

  **What to do**: Run the complete verification set and consolidate results in `.sisyphus/evidence/task-10-final-verification.json`. Include command, exit code, and concise pass/fail status for every validator and Playwright command. If any command fails, stop, fix the underlying issue in the relevant prior task scope, then rerun the failed command and update evidence.
  **Must NOT do**: Do not claim completion with failing commands. Do not remove failing assertions to pass tests. Do not skip `npm run validate:all:safe`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: final integration verification across data, build, and Playwright.
  - Skills: [`verification-before-completion`] - Evidence-before-assertions discipline.
  - Omitted: [`frontend-design`] - No UI design work.

  **Parallelization**: Can Parallel: NO | Wave 6 | Blocks: Final Verification Wave | Blocked By: Tasks 1-9

  **References**:
  - Pattern: `package.json:26-32` - safe aggregate validation and textbook/game validation scripts.
  - Pattern: `playwright.config.ts:11-16` - Playwright preview server setup and base URL.
  - Pattern: `AGENTS.md` - build and validation commands required before completion.

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-reactions -- --report .sisyphus/evidence/task-10-textbook-reactions.json` exits `0`.
  - [ ] `npm run validate:reaction-game-pool -- --assert-textbook-only --min-game-usable 5 --report .sisyphus/evidence/task-10-reaction-game-pool.json` exits `0`.
  - [ ] `node scripts/validate-quiz-data.mjs` exits `0`.
  - [ ] All eight `npm run validate:textbook-coverage -- --textbook <id> --status reviewed` commands exit `0`.
  - [ ] `npx playwright test tests/ui/reaction-game-completion.spec.ts tests/ui/games-layout.spec.ts tests/content/pep-learning-tabs.spec.ts` exits `0`.
  - [ ] If `scripts/validate-textbook-game-content.mjs` exists, `node scripts/validate-textbook-game-content.mjs --inventory .sisyphus/evidence/task-1-textbook-inventory.json --reaction-report .sisyphus/evidence/task-5-reaction-game-pool.json --quiz-report .sisyphus/evidence/task-6-added-quiz-ids.json` exits `0`.
  - [ ] `npm run validate:all:safe` exits `0`.
  - [ ] `.sisyphus/evidence/task-10-final-verification.json` records all commands and `overallStatus: "pass"`.

  **QA Scenarios**:
  ```
  Scenario: Full verification passes
    Tool: Bash
    Steps: Run all commands listed in Acceptance Criteria and write a JSON summary to `.sisyphus/evidence/task-10-final-verification.json`.
    Expected: Every command exits 0; `overallStatus` is `pass`.
    Evidence: .sisyphus/evidence/task-10-final-verification.json

  Scenario: Failure blocks completion
    Tool: Bash
    Steps: Inspect `.sisyphus/evidence/task-10-final-verification.json` with `node -e "const fs=require('fs'); const r=JSON.parse(fs.readFileSync('.sisyphus/evidence/task-10-final-verification.json','utf8')); if(r.overallStatus!=='pass') throw new Error('verification did not pass');"`.
    Expected: Exit 0 only when all commands passed; otherwise task remains incomplete.
    Evidence: .sisyphus/evidence/task-10-final-verification.json
  ```

  **Commit**: YES | Message: `chore: verify textbook game content expansion` | Files: [.sisyphus/evidence/task-10-final-verification.json]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after each task when source files or durable evidence are updated.
- Do not commit transient logs unless referenced by acceptance criteria.
- Suggested branch-level final message if squashing: `feat(games): include textbook reactions and quiz content`.

## Success Criteria
- Reaction Link uses all reviewed, reliably collectible textbook formulas represented in `src/data/reactions.json`.
- Full Quiz Challenge can draw from existing and newly added textbook-grounded `quizData` questions.
- All new/derived content has source provenance and passes validators.
- Existing game UI, scoring, and navigation behavior remain unchanged.
- All listed verification commands pass with evidence saved under `.sisyphus/evidence/`.
