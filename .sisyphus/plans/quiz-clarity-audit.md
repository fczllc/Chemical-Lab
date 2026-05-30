# Quiz Clarity Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every runtime quiz question asks a clear standalone question and no longer forces learners to inspect textbook/source passages to infer what is being asked.

**Architecture:** Add validator-first clarity checks, generate auditable corpus reports over learner-facing quiz fields, remove the 63 exact “学习某片段” runtime records, then classify and remediate broader source-anchored prompts. Keep quiz gameplay unchanged and preserve provenance fields for rewritten textbook-derived records.

**Tech Stack:** Vite, vanilla JS modules, JSON data under `src/data`, Node validation scripts, Playwright UI tests.

---

## TL;DR
> **Summary**: Fix quiz wording quality at the canonical data layer, not with a Full Quiz-only runtime filter. Add a conservative clarity validator, remove exact non-standalone records, classify all learner-facing source-anchor wording, and verify both Full Quiz and Quick Quiz cannot show banned prompts.
> **Deliverables**:
> - `scripts/validate-quiz-data.mjs` rejects exact vague textbook-fragment wording.
> - `scripts/audit-quiz-clarity.mjs` emits stable evidence with `blockingFindings`, `reviewQueue`, `allowedSourceMentions`, `remediatedRecords`, and `unclassifiedSourceAnchors`.
> - `src/data/quizData.json` no longer contains the 63 exact vague-fragment runtime records.
> - All learner-facing `教材` / `片段` / `根据教材正文` style occurrences are classified and remediated when non-standalone.
> - `npm run validate:all:safe` includes quiz validation.
> - Playwright verifies Full Quiz and Quick Quiz prompt clarity.
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3/4 → Task 5 → Final Verification Wave

## Context

### Original Request
User reported screenshot-like quiz wording is unacceptable: “这种表述根本体现不出来要问什么，还得让人去查书才知道，肯定不行。要检查一下所有题目，是否能明确清晰的表达问题，而不是让人去查教材的内容自己找问的问题。”

### Interview Summary
- User approved generating this plan after seeing findings.
- Concrete bad example class: `学习“化学反应前后物质的质量关系”这一片段，应该掌握哪条事实？`
- Required outcome: all quiz questions must clearly express the question without requiring learners to open/inspect教材 content.

### Research Summary
- `src/data/quizData.json` currently has 556 records.
- Direct Node audit found 63 records matching the exact vague-fragment pattern: `学习“...”这一片段，应该掌握哪条事实？`.
- Background audit also found broader source-anchored examples:
  - `quiz-c60-structure-source`: `教材图6-4说明，C60 的分子结构和什么相似？`
  - `quiz-c60-carbon-allotrope`: `教材介绍 C60 时，把它归入哪一类碳物质？`
  - `quiz-c60-reviewed-formula-application`: `根据教材正文，每个 C60 分子由多少个碳原子构成？`
- Coarse `教材` occurrence count was 455, but this includes explanations/provenance and is not a bad-question count.
- `scripts/validate-quiz-data.mjs:80-126` validates corpus shape; `:231-244` validates runtime placeholder/option eligibility; it does not validate standalone semantic clarity.
- `src/modules/quiz.js:550-575` filters Full Quiz through `isRuntimeQuizQuestion()`; `src/modules/quiz.js:577-588` Quick Quiz does not use that filter, so canonical data remediation is required.
- `package.json:26` `validate:all:safe` does not currently include `node scripts/validate-quiz-data.mjs`.
- `tests/ui/full-quiz-textbook-content.spec.ts` currently depends on `.sisyphus/evidence/task-6-added-quiz-ids.json` and may need replacement with clarity-focused runtime assertions.

### Metis / Oracle Guardrails Incorporated
- Do not treat every `教材` occurrence as invalid.
- Do classify every learner-facing `教材` occurrence in `question`, `options`, and `explanation` as `allowed`, `rewrite`, or `remove` with a reason.
- Do not use Full Quiz-only quarantine because Quick Quiz can still surface records.
- Do add `node scripts/validate-quiz-data.mjs` to `npm run validate:all:safe`.
- Do verify post-removal pool size and supporting-data/curriculum references.

## Work Objectives

### Core Objective
Make quiz prompts standalone and age-appropriate by removing or rewriting non-standalone source-passage wording while preserving source provenance for reviewed textbook-derived records.

### Deliverables
- `scripts/audit-quiz-clarity.mjs` with stable report schema and `--classification <path>` support.
- Updated `scripts/validate-quiz-data.mjs` with `vague-textbook-fragment` self-check mode and corpus validation.
- Updated `package.json` `validate:all:safe` to run quiz validation after supporting validation and before spectral/build checks.
- Updated `src/data/quizData.json` with exact vague-fragment records removed and broader source-anchor findings remediated.
- Updated or new Playwright clarity test, preferably `tests/ui/full-quiz-clarity.spec.ts` or a replacement for stale `tests/ui/full-quiz-textbook-content.spec.ts`.
- Evidence files under `.sisyphus/evidence/`.

### Definition of Done
- `node scripts/audit-quiz-clarity.mjs --classification .sisyphus/evidence/quiz-clarity-classification.json --report .sisyphus/evidence/quiz-clarity-final.json --fail-on-blocking --fail-on-unclassified` exits 0 and reports `blockingFindings: []` and `unclassifiedSourceAnchors: []`.
- Every learner-facing `教材` occurrence in final quiz data is classified in the audit report as `allowed`, `rewrite`, or `remove`; no unclassified occurrences remain.
- `node scripts/validate-quiz-data.mjs --self-check-invalid vague-textbook-fragment` rejects the fixture.
- `node scripts/validate-quiz-data.mjs` passes.
- `node scripts/validate-supporting-data.mjs` passes.
- `npm run validate:all:safe` passes.
- `npx playwright test tests/ui/full-quiz-clarity.spec.ts` passes, or equivalent updated clarity test passes.

### Must Have
- Chinese-first, learner-facing wording.
- Questions answerable from the rendered prompt/options alone.
- Four-option MCQ shape preserved for generated records.
- Existing source references/generation metadata preserved for rewritten records.
- Full Quiz remains 20 questions: do not change `FULL_QUIZ_COUNT = 20`.

### Must NOT Have
- No `学习“...”这一片段，应该掌握哪条事实？` runtime records.
- No raw教材 excerpt as an answer option.
- No explanation that only says `教材片段说明：...` without concept explanation.
- No mass-delete of all `教材` text without field/context classification.
- No new textbook mining beyond remediating existing records.
- No gameplay redesign.

## Standalone Clarity Rubric

### Hard Fail: remove or rewrite
- Question references unseen context instead of asking a concrete concept: `学习“...”这一片段`, `这一片段`, `上述材料`, `根据教材正文`, `教材图...说明` when the figure/text is not included in prompt.
- Answer option is a raw textbook passage rather than a concise choice.
- Explanation only repeats source framing: `教材片段说明：...`.
- Prompt asks what should be learned from a passage instead of asking the chemistry concept directly.

### Rewrite
- Source-anchored stem can become standalone by replacing `根据教材...` with the actual concept question.
- Keep `sourceReferences`, `sourceReviewStatus`, `generationSource`, `generationMetadata`, `curriculumTags`, `difficulty`, `correctIndex`, and option uniqueness intact.

### Allow
- `教材` appears only in provenance/source metadata.
- `教材` appears in an explanation that is self-contained and does not require opening a book.
- Question includes the full necessary context directly in the stem/options.

### Remove
- Source content is too broad, truncated, image-dependent, or ambiguous to rewrite safely without inventing facts.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.

- Test decision: validator-first / tests-after using Node script self-checks, corpus audit report, existing validators, `validate:all:safe`, and Playwright smoke coverage.
- QA policy: Every task has agent-executed scenarios.
- Evidence:
  - `.sisyphus/evidence/quiz-clarity-baseline.json`
  - `.sisyphus/evidence/quiz-clarity-removal.json`
  - `.sisyphus/evidence/quiz-clarity-classification.json`
  - `.sisyphus/evidence/quiz-clarity-final.json`
  - `.sisyphus/evidence/quiz-clarity-runtime.json`

## Execution Strategy

### Parallel Execution Waves
Wave 1: Task 1 foundation audit script and Task 2 validator self-check can proceed after reading current data; Task 2 should consume Task 1 pattern names but can be implemented independently if patterns are copied from this plan.

Wave 2: Task 3 canonical data removal depends on Task 1 report; Task 4 standard validation integration depends on Task 2.

Wave 3: Task 5 broader classification/remediation and Task 6 runtime UI tests depend on Tasks 1-4.

Final: F1-F4 review agents.

### Dependency Matrix
- Task 1 blocks Task 3 and Task 5.
- Task 2 blocks Task 4 and contributes to Task 5 acceptance.
- Task 3 blocks Task 5 and Task 6.
- Task 4 blocks final safe validation.
- Task 5 blocks Task 6 and final verification.
- Task 6 blocks final verification.

### Agent Dispatch Summary
- Wave 1: 2 tasks — `quick`, `quick`
- Wave 2: 2 tasks — `quick`, `quick`
- Wave 3: 2 tasks — `unspecified-high`, `visual-engineering`

## TODOs

- [x] 1. Add quiz clarity audit report script

  **What to do**: Create `scripts/audit-quiz-clarity.mjs`. It must import `quizData` from `src/data/index.js`, scan learner-facing fields only (`question`, `options`, `explanation`), optionally load a classification file, and emit JSON with this exact top-level schema:
  ```json
  {
    "checkedAt": "ISO timestamp",
    "totalQuizRecords": 0,
    "runtimeEligibleQuestionCount": 0,
    "explicitVagueFragmentCount": 0,
    "blockingFindings": [],
    "reviewQueue": [],
    "allowedSourceMentions": [],
    "remediatedRecords": [],
    "unclassifiedSourceAnchors": []
  }
  ```
  Implement CLI options:
  - `--report <path>` writes the JSON report.
  - `--classification <path>` reads `.sisyphus/evidence/quiz-clarity-classification.json` entries with `{ id, field, text, disposition, reason }`.
  - `--fail-on-blocking` exits 1 when `blockingFindings.length > 0`.
  - `--fail-on-unclassified` exits 1 when `unclassifiedSourceAnchors.length > 0`.
  Blocking patterns must include quote variants for `学习“...”这一片段，应该掌握哪条事实？`: `“”`, `""`, `「」`, optional whitespace, and `这一(段|片段)`.
  Review-queue patterns must include source anchors in learner-facing fields: `教材图`, `根据教材`, `教材正文`, `教材介绍`, `教材提醒`, `教材指出`, `教材说明`, `课文`, `课本`, `文中`, `材料`, `上述材料`, `片段`.
  Classification handling must be mechanical: every review-queue source-anchor hit is matched by exact `{ id, field, text }`; dispositions `allowed`, `rewrite`, and `remove` populate `allowedSourceMentions` or `remediatedRecords`; unmatched hits populate `unclassifiedSourceAnchors`. The script must not scan `sourceReferences`, `generationSource`, `generationMetadata`, or IDs as learner-facing failures.

  **Must NOT do**: Do not edit `src/data/quizData.json` in this task. Do not fail all plain `教材` occurrences automatically.

  **Recommended Agent Profile**:
  - Category: `quick` - single script with deterministic JSON output.
  - Skills: [`test-driven-development`] - validator/audit should be proven with failing/pass behavior.
  - Omitted: [`frontend-design`] - no UI design needed.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 3, 5 | Blocked By: none

  **References**:
  - Pattern: `scripts/validate-quiz-data.mjs:1-63` - CLI parsing style with `parseArgs`.
  - Pattern: `scripts/validate-quiz-data.mjs:388-399` - pass/fail output convention.
  - API/Type: `src/data/index.js` - import canonical `quizData` from runtime data exports.
  - Evidence: `.sisyphus/drafts/quiz-clarity-audit.md` - known counts and patterns.

  **Acceptance Criteria**:
  - [ ] `node scripts/audit-quiz-clarity.mjs --report .sisyphus/evidence/quiz-clarity-baseline.json` exits 0 and writes valid JSON.
  - [ ] Report has `totalQuizRecords >= 556` before data removal unless previous work changed count.
  - [ ] Report has `explicitVagueFragmentCount >= 63` before data removal unless data already changed.
  - [ ] `node scripts/audit-quiz-clarity.mjs --report .sisyphus/evidence/quiz-clarity-baseline-failing.json --fail-on-blocking` exits 1 before remediation and lists blocking IDs.
  - [ ] `node scripts/audit-quiz-clarity.mjs --report .sisyphus/evidence/quiz-clarity-baseline-unclassified.json --fail-on-unclassified` exits 1 before classification when source-anchor hits exist.

  **QA Scenarios**:
  ```
  Scenario: Baseline audit finds current bad wording
    Tool: Bash
    Steps: Run `node scripts/audit-quiz-clarity.mjs --report .sisyphus/evidence/quiz-clarity-baseline.json`; parse JSON and assert `blockingFindings.length > 0` and each finding has `id`, `field`, `text`, `pattern`, `disposition`.
    Expected: JSON report exists and identifies exact vague-fragment records.
    Evidence: .sisyphus/evidence/quiz-clarity-baseline.json

  Scenario: Fail flag fails when blockers exist
    Tool: Bash
    Steps: Run `node scripts/audit-quiz-clarity.mjs --report .sisyphus/evidence/quiz-clarity-baseline-failing.json --fail-on-blocking`.
    Expected: Exit code 1 before remediation, with stderr/stdout identifying blocking findings.
    Evidence: .sisyphus/evidence/quiz-clarity-baseline-failing.json

  Scenario: Unclassified flag fails before classification
    Tool: Bash
    Steps: Run `node scripts/audit-quiz-clarity.mjs --report .sisyphus/evidence/quiz-clarity-baseline-unclassified.json --fail-on-unclassified`.
    Expected: Exit code 1 before classification if any learner-facing source-anchor hits exist, with `unclassifiedSourceAnchors.length > 0`.
    Evidence: .sisyphus/evidence/quiz-clarity-baseline-unclassified.json
  ```

  **Commit**: YES | Message: `test(quiz): add clarity audit report` | Files: [`scripts/audit-quiz-clarity.mjs`, `.sisyphus/evidence/quiz-clarity-baseline.json`]

- [x] 2. Add strict quiz validator rule for exact vague-fragment wording

  **What to do**: Modify `scripts/validate-quiz-data.mjs` to add self-check mode `vague-textbook-fragment`. Add a `validateStandaloneClarity(quiz, label, errors)` call from `validateRuntimeEligibility()` after placeholder checks. The blocking validator should reject exact source-passage question shapes and raw-passage option/explanation shapes:
  - `学习[“"「].+[”"」]这一(段|片段)，?应该掌握哪条事实[？?]`
  - `这一(段|片段)` in `question` when paired with `学习` or `应该掌握`
  - `教材片段说明：` in `explanation`
  Keep broader patterns such as plain `教材` out of hard validator errors; those belong in the audit review queue.
  Add invalid fixture in `buildInvalidFixture()`:
  ```js
  } else if (mode === 'vague-textbook-fragment') {
    items.push({
      id: 'invalid-vague-textbook-fragment',
      question: '学习“化学反应前后物质的质量关系”这一片段，应该掌握哪条事实？',
      options: ['化学反应前后物质的质量关系【问题】...', '错误选项A', '错误选项B', '错误选项C'],
      correctIndex: 0,
      category: '测试',
      difficulty: '基础',
      curriculumTags: ['test-tag'],
      explanation: '教材片段说明：化学反应前后物质的质量关系',
      generatedFromShortAnswer: true,
      generationSource: 'test-fixture',
      sourceReferences: [
        { sourceVolumeId: 'test-volume', candidateId: 'test-candidate', note: 'test' }
      ]
    });
  }
  ```

  **Must NOT do**: Do not reject every occurrence of `教材`. Do not remove records in this task.

  **Recommended Agent Profile**:
  - Category: `quick` - targeted validator edit.
  - Skills: [`test-driven-development`] - self-check must fail/pass deterministically.
  - Omitted: [`playwright`] - no browser interaction.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 4 | Blocked By: none

  **References**:
  - Pattern: `scripts/validate-quiz-data.mjs:6-15` - self-check mode registry.
  - Pattern: `scripts/validate-quiz-data.mjs:231-244` - runtime eligibility hook.
  - Pattern: `scripts/validate-quiz-data.mjs:252-370` - invalid fixture construction.

  **Acceptance Criteria**:
  - [ ] `node scripts/validate-quiz-data.mjs --self-check-invalid vague-textbook-fragment` exits 0 and prints `quiz invalid fixture rejected: vague-textbook-fragment`.
  - [ ] Before data removal, `node scripts/validate-quiz-data.mjs` exits 1 because current corpus contains vague-fragment records.
  - [ ] After Task 3, `node scripts/validate-quiz-data.mjs` exits 0.

  **QA Scenarios**:
  ```
  Scenario: Validator rejects deterministic vague fixture
    Tool: Bash
    Steps: Run `node scripts/validate-quiz-data.mjs --self-check-invalid vague-textbook-fragment`.
    Expected: Exit 0 and output contains `quiz invalid fixture rejected: vague-textbook-fragment` plus a standalone clarity error.
    Evidence: .sisyphus/evidence/quiz-clarity-validator-self-check.log

  Scenario: Validator does not over-block plain source metadata
    Tool: Bash
    Steps: Run `node scripts/validate-quiz-data.mjs --self-check-invalid missing-source-references` to prove existing self-check modes still work; after remediation run `node scripts/validate-quiz-data.mjs`.
    Expected: Existing self-check still rejects only its intended fixture; final corpus validation passes.
    Evidence: .sisyphus/evidence/quiz-clarity-validator-final.log
  ```

  **Commit**: YES | Message: `test(quiz): reject vague textbook fragment prompts` | Files: [`scripts/validate-quiz-data.mjs`]

- [x] 3. Remove the 63 exact vague-fragment records from canonical quiz data

  **What to do**: Use the Task 1 audit report to remove records whose `id` appears in `blockingFindings` for the exact vague-fragment pattern from `src/data/quizData.json`. Write `.sisyphus/evidence/quiz-clarity-removal.json` with:
  ```json
  {
    "checkedAt": "ISO timestamp",
    "removedCount": 63,
    "removedIds": [],
    "beforeTotal": 556,
    "afterTotal": 493,
    "runtimeEligibleQuestionCount": 0,
    "postRemovalValidation": {
      "validateQuizData": "pass",
      "validateSupportingData": "pass"
    }
  }
  ```
  Accept updated totals if prior work changed corpus size, but `removedCount` must equal the number of exact vague-fragment blockers in the baseline report. After removal, run the audit with `--fail-on-blocking`; exact blockers must be zero.

  **Must NOT do**: Do not remove every `教材` hit. Do not rewrite or invent replacement questions in this task. Do not edit Full Quiz mechanics.

  **Recommended Agent Profile**:
  - Category: `quick` - deterministic JSON data removal.
  - Skills: [] - data edit with validators; no special domain skill beyond plan instructions.
  - Omitted: [`frontend-design`] - no UI design.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Tasks 5, 6 | Blocked By: Task 1

  **References**:
  - Data: `src/data/quizData.json` - canonical quiz corpus.
  - Evidence: `.sisyphus/evidence/quiz-clarity-baseline.json` - source of removal IDs.
  - Validator: `scripts/validate-quiz-data.mjs` - must pass after removal.
  - Validator: `scripts/validate-supporting-data.mjs` - catch stale supporting references.

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/quiz-clarity-removal.json` exists and lists every removed ID.
  - [ ] `node scripts/audit-quiz-clarity.mjs --report .sisyphus/evidence/quiz-clarity-after-removal.json --fail-on-blocking` exits 0 for exact vague-fragment blockers.
  - [ ] `node scripts/validate-quiz-data.mjs` exits 0 after removal.
  - [ ] `node scripts/validate-supporting-data.mjs` exits 0 after removal.
  - [ ] Final quiz pool count remains greater than 20.

  **QA Scenarios**:
  ```
  Scenario: Exact blockers removed from canonical data
    Tool: Bash
    Steps: Parse `.sisyphus/evidence/quiz-clarity-baseline.json` and `src/data/quizData.json`; assert no removed ID remains.
    Expected: Removed IDs are absent from canonical quiz data.
    Evidence: .sisyphus/evidence/quiz-clarity-removal.json

  Scenario: Quick and Full Quiz pools remain viable
    Tool: Bash
    Steps: Import `quizData` from `src/data/index.js`; assert total records > 20 and no `question` matches exact vague-fragment regex.
    Expected: Canonical data can still supply a 20-question Full Quiz and Quick Quiz fillers.
    Evidence: .sisyphus/evidence/quiz-clarity-after-removal.json
  ```

  **Commit**: YES | Message: `fix(quiz): remove vague textbook fragment prompts` | Files: [`src/data/quizData.json`, `.sisyphus/evidence/quiz-clarity-removal.json`]

- [x] 4. Add quiz validation to the standard safe validation pipeline

  **What to do**: Modify `package.json:26` so `validate:all:safe` includes `node scripts/validate-quiz-data.mjs` after `npm run validate:supporting` and before `npm run validate:spectral`. Keep existing command order otherwise.

  **Must NOT do**: Do not remove existing validators from `validate:all:safe`. Do not add commands that mutate files.

  **Recommended Agent Profile**:
  - Category: `quick` - package script update.
  - Skills: [] - straightforward config edit.
  - Omitted: [`test-driven-development`] - acceptance is command output.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: final validation | Blocked By: Task 2

  **References**:
  - Config: `package.json:26` - current safe validation chain.
  - Validator: `scripts/validate-quiz-data.mjs` - command to insert.

  **Acceptance Criteria**:
  - [ ] `package.json` `validate:all:safe` contains `node scripts/validate-quiz-data.mjs` exactly once.
  - [ ] `npm run validate:all:safe` runs quiz validation and exits 0 after data remediation.

  **QA Scenarios**:
  ```
  Scenario: Safe validation includes quiz data validator
    Tool: Bash
    Steps: Run `node -e "const p=require('./package.json'); if(!p.scripts['validate:all:safe'].includes('node scripts/validate-quiz-data.mjs')) process.exit(1);"`.
    Expected: Exit 0.
    Evidence: .sisyphus/evidence/quiz-clarity-safe-validation.json

  Scenario: Full safe validation passes
    Tool: Bash
    Steps: Run `npm run validate:all:safe`.
    Expected: Exit 0; output includes `quizData: valid` and build succeeds with only existing Vite warnings.
    Evidence: .sisyphus/evidence/quiz-clarity-validate-all-safe.log
  ```

  **Commit**: YES | Message: `chore(validation): include quiz data in safe checks` | Files: [`package.json`]

- [x] 5. Classify and remediate all remaining learner-facing source anchors

  **What to do**: Run `scripts/audit-quiz-clarity.mjs` after Task 3. For every learner-facing hit in `question`, `options`, or `explanation`, write one exact-match classification entry in `.sisyphus/evidence/quiz-clarity-classification.json` with `{ id, field, text, disposition, reason }` and choose exactly one disposition:
  - `allowed`: self-contained and not requiring教材 lookup.
  - `rewrite`: update `question`, `options`, and/or `explanation` to standalone wording while preserving provenance.
  - `remove`: delete record because it is image-dependent, broad, truncated, or ambiguous.
  Known examples to classify include `quiz-c60-structure-source`, `quiz-c60-carbon-allotrope`, and `quiz-c60-reviewed-formula-application`.
  For rewrites, use this pattern:
  - Bad: `根据教材正文，每个 C60 分子由多少个碳原子构成？`
  - Good: `每个 C60 分子由多少个碳原子构成？`
  - Preserve answer/options/provenance.
  For image-dependent prompts like `教材图6-4说明...`, rewrite only if all necessary fact content is present in `options` and `explanation`; otherwise remove.

  **Must NOT do**: Do not generate new facts. Do not use external chemistry knowledge to rewrite beyond what the current record/source reference supports. Do not edit source references except to preserve valid structure.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - requires careful semantic review of multiple records.
  - Skills: [`test-driven-development`] - maintain audit/validator red-green loop.
  - Omitted: [`frontend-design`] - no visual design.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Task 6 | Blocked By: Tasks 1, 3

  **References**:
  - Data: `src/data/quizData.json` - records to classify/remediate.
  - Audit: `scripts/audit-quiz-clarity.mjs` - source of review queue.
  - Rubric: this plan’s “Standalone Clarity Rubric”.
  - Validator: `scripts/validate-quiz-data.mjs` - final hard gate.

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/quiz-clarity-classification.json` classifies every learner-facing source-anchor hit as `allowed`, `rewrite`, or `remove` with `reason`.
  - [ ] `node scripts/audit-quiz-clarity.mjs --classification .sisyphus/evidence/quiz-clarity-classification.json --report .sisyphus/evidence/quiz-clarity-final.json --fail-on-blocking --fail-on-unclassified` exits 0.
  - [ ] `.sisyphus/evidence/quiz-clarity-final.json` has `blockingFindings: []` and `unclassifiedSourceAnchors: []`.
  - [ ] `node scripts/validate-quiz-data.mjs` exits 0.
  - [ ] `node scripts/validate-supporting-data.mjs` exits 0.

  **QA Scenarios**:
  ```
  Scenario: Every learner-facing source anchor has a disposition
    Tool: Bash
    Steps: Parse `.sisyphus/evidence/quiz-clarity-classification.json`; assert every entry has `id`, `field`, `text`, `disposition`, `reason`; assert dispositions are only `allowed`, `rewrite`, or `remove`.
    Expected: No unclassified entries remain.
    Evidence: .sisyphus/evidence/quiz-clarity-classification.json

  Scenario: Final audit has no blocking runtime prompts
    Tool: Bash
    Steps: Run `node scripts/audit-quiz-clarity.mjs --classification .sisyphus/evidence/quiz-clarity-classification.json --report .sisyphus/evidence/quiz-clarity-final.json --fail-on-blocking --fail-on-unclassified`.
    Expected: Exit 0 with `blockingFindings: []` and `unclassifiedSourceAnchors: []`.
    Evidence: .sisyphus/evidence/quiz-clarity-final.json
  ```

  **Commit**: YES | Message: `fix(quiz): remediate source-anchored prompts` | Files: [`src/data/quizData.json`, `.sisyphus/evidence/quiz-clarity-classification.json`, `.sisyphus/evidence/quiz-clarity-final.json`]

- [x] 6. Add runtime clarity coverage for Full Quiz and Quick Quiz

  **What to do**: Replace or supplement `tests/ui/full-quiz-textbook-content.spec.ts` with clarity-focused coverage. Preferred: create `tests/ui/full-quiz-clarity.spec.ts` and keep old provenance test only if its Task 6 IDs still exist. The runtime test must use the final audit/classification report to avoid over-blocking allowed self-contained source mentions. The test must:
  - Start Full Quiz via `window.dispatchEvent(new CustomEvent('startfullquiz'))`.
  - Assert `.quiz-mode-badge` has `20题完整挑战` and `.quiz-scoreboard` has `第 1 / 20 题`.
  - Read `#quiz-modal .quiz-question-text`, all `.quiz-option-btn`, and `.quiz-feedback-panel` after answering.
  - Assert no rendered text matches hard banned regexes: `学习.+这一(段|片段)`, `应该掌握哪条事实`, `教材片段说明`.
  - For broader source-anchor regexes such as `根据教材正文` and `教材图\d+`, assert the exact `{ id, field, text }` appears in `.sisyphus/evidence/quiz-clarity-final.json.allowedSourceMentions` or `.sisyphus/evidence/quiz-clarity-final.json.remediatedRecords`; otherwise fail.
  - Start a Quick Quiz by selecting an element/detail quiz flow already used in existing tests, or directly invoke the same app event/path used by quiz module if available; assert the first quick quiz prompt/options do not match the exact banned vague-fragment patterns.
  - Write `.sisyphus/evidence/quiz-clarity-runtime.json`.

  **Must NOT do**: Do not depend on removed Task 6 IDs. Do not change UI solely to make tests easier.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - browser/user-facing verification.
  - Skills: [`playwright`] - required for browser runtime QA.
  - Omitted: [`frontend-design`] - no new UI styling.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: final verification | Blocked By: Tasks 3, 5

  **References**:
  - UI test pattern: `tests/ui/full-quiz-textbook-content.spec.ts:16-65` - shell readiness, Full Quiz event, modal selectors, progression.
  - App logic: `src/modules/quiz.js:520-588` - Full Quiz and Quick Quiz selection paths.
  - Test helpers: `tests/ui/full-quiz-textbook-content.spec.ts:119-163` - shell ready and evidence writing patterns.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/ui/full-quiz-clarity.spec.ts` exits 0.
  - [ ] `.sisyphus/evidence/quiz-clarity-runtime.json` exists and includes rendered Full Quiz and Quick Quiz prompt text.
  - [ ] Runtime evidence shows no hard banned exact vague-fragment pattern in question/options/explanation and any broader source-anchor text is backed by final audit classification.

  **QA Scenarios**:
  ```
  Scenario: Full Quiz does not render banned prompts
    Tool: Playwright
    Steps: Load app, wait for shell ready, dispatch `startfullquiz`, inspect first question/options, answer one option, inspect feedback/explanation, advance to second question.
    Expected: Scoreboard progresses from `第 1 / 20 题` to `第 2 / 20 题`; no inspected learner-facing text matches hard banned exact patterns; broader source-anchor text is allowed only when classified in the final audit report.
    Evidence: .sisyphus/evidence/quiz-clarity-runtime.json

  Scenario: Quick Quiz does not render banned prompts
    Tool: Playwright
    Steps: Start a Quick Quiz through existing UI/event path, inspect first question/options and feedback after one answer.
    Expected: No inspected learner-facing text matches hard banned exact patterns; broader source-anchor text is allowed only when classified in the final audit report.
    Evidence: .sisyphus/evidence/quiz-clarity-runtime.json
  ```

  **Commit**: YES | Message: `test(quiz): cover runtime prompt clarity` | Files: [`tests/ui/full-quiz-clarity.spec.ts`, optionally `tests/ui/full-quiz-textbook-content.spec.ts`, `.sisyphus/evidence/quiz-clarity-runtime.json`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [x] F1. Plan Compliance Audit — oracle
  - Verify every task was completed, no gameplay changes were made, `FULL_QUIZ_COUNT = 20` remains unchanged, and all acceptance evidence exists.

- [x] F2. Data Quality Review — unspecified-high
  - Review `src/data/quizData.json`, `quiz-clarity-classification.json`, and `quiz-clarity-final.json` for over-deletion, unsupported rewrites, source reference preservation, and Chinese-first wording.

- [x] F3. Real Runtime QA — unspecified-high (+ playwright)
  - Run app and inspect Full Quiz + Quick Quiz manually through browser automation. Confirm no banned prompts and no console errors.

- [x] F4. Scope Fidelity Check — deep
  - Confirm implementation fixed quiz clarity only, did not mine unrelated new content, did not redesign quiz mechanics, and did not remove acceptable source-backed learning content unnecessarily.

## Commit Strategy
- Commit after each task if verification passes.
- Do not commit unrelated pre-existing working tree changes.
- Suggested sequence:
  1. `test(quiz): add clarity audit report`
  2. `test(quiz): reject vague textbook fragment prompts`
  3. `fix(quiz): remove vague textbook fragment prompts`
  4. `chore(validation): include quiz data in safe checks`
  5. `fix(quiz): remediate source-anchored prompts`
  6. `test(quiz): cover runtime prompt clarity`

## Success Criteria
- All current exact vague-fragment records removed from canonical runtime quiz data.
- Every remaining learner-facing source-anchor occurrence is classified and defensible.
- Validator prevents recurrence of the exact unacceptable wording class.
- Safe validation pipeline includes quiz data validation.
- Full Quiz and Quick Quiz runtime tests pass without banned prompt text.
- User can run `/start-work` against this plan without making judgment calls about what counts as “unclear”.
