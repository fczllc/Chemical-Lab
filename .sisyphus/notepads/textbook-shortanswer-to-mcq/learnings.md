# Learnings — textbook-shortanswer-to-mcq

## 2026-05-11 — MCQ batch inventory

- Runtime quiz data contains 538 records: 512 `shortAnswer` textbook placeholders and 26 existing hand-authored non-shortAnswer MCQs.
- Source-context mapping chain works across all four generated batches: runtime `sourceReferences[0].candidateId` → generated quiz candidate → `sourceSectionId` → draft/source inventory `sourceText`; reviewed promotion manifests are present for all four batches.
- First organic batch `rj-chemistry-g12-selective-3-organic-2019` has 91 shortAnswer records and all 91 are source-context ready; candidate answers are placeholders and should not be reused as final answers.

## 2026-05-12 — AI MCQ Generation Contract

- Contract file created at `.sisyphus/evidence/task-2-generation-contract.md` with 8 major sections.
- Required generated fields: `id`, `question`, `options` (exactly 4 unique strings), `correctIndex` (0-3), `category`, `difficulty` (`基础`/`进阶`/`挑战`), `curriculumTags`, `explanation`, `generatedFromShortAnswer: true`, `generationSource`.
- Provenance fields copied unchanged: `id`, `sourceVolumeId`, `sourceReviewStatus`, `sourceReferences` (deep copy), `curriculumTags`, `textbookAssetReferences`, `formulaText`, `notationReviewStatus`.
- 13 malformed sample cases defined with validator rejection rules covering: option count, duplicates, correctIndex, placeholders in question/option/explanation, empty explanation, invalid difficulty, missing provenance, missing generation source, missing generation flag, empty option, empty question.
- AI prompt template written in Chinese with placeholders for runtime context, source excerpt, and provenance.
- Child-friendly language guidelines included: simple sentences, analogies, positive tone, second person engagement.
- Low-confidence skipping policy: skip with specific reason instead of generating low-quality MCQs; no human review gate.
- Difficulty layering guidelines: 50-60% `基础`, 30-40% `进阶`, 10-20% `挑战`.
- Placeholder answers (`待复核：依据来源片段补全标准答案。`) explicitly forbidden and must not be reused.
- No API keys, secrets, or provider-specific credentials in the contract.
- Contract validated with 19 automated checks, all passing.

## 2026-05-12 — Batch conversion script

- Converter script added at `scripts/convert-short-answer-mcqs.mjs`; it reads canonical runtime data from `src/data/quizData.json` and inventory/source context from `.sisyphus/evidence/mcq-batch-inventory.json` without importing runtime JS.
- First organic batch dry-run reports 91 selected/ready records, 0 source-unresolved records, and 91 missing generated entries when no generated JSON is supplied.
- `--all-ready-batches --dry-run` reports 512 selected/ready records across all four ready batches, matching the Task 1 inventory total.
- Write-mode fixture validation converted exactly one generated entry, then runtime data was restored so no real conversion remains in the final tree.

## 2026-05-12 — Quiz data validator (Task 4)

- Validator script created at `scripts/validate-quiz-data.mjs`.
- Validates all `quizData` records from `src/data/index.js`.
- Enforces duplicate ID detection across all records.
- Counts hand-authored MCQs as non-`shortAnswer` and non-`generatedFromShortAnswer`; requires at least 26 (current count: 26).
- For `generatedFromShortAnswer === true` records, enforces:
  - `category !== "shortAnswer"`
  - exactly 4 unique trimmed options
  - `correctIndex` integer 0..3
  - non-empty question and explanation
  - placeholder-free question/options/explanation (patterns: `待复核`, `TODO`, `请补充`, `待填写`, `依据来源片段补全标准答案`, `placeholder`)
  - `difficulty` exactly one of `基础`, `进阶`, `挑战`
  - non-empty `curriculumTags`
  - non-empty `sourceReferences` with `sourceVolumeId` and `candidateId`
  - `generationSource` or `generationModel` as non-empty string
  - no `answer` field
- Self-check / negative fixture modes supported: `duplicate-options`, `placeholder`, `missing-generation-source`, `invalid-correct-index`, `invalid-difficulty`, `missing-source-references`.
- Normal mode exits 0 on current pre-conversion state (538 records, 512 shortAnswer placeholders, 26 hand-authored MCQs, 0 generated records).
- All six negative self-check modes exit 0 after rejecting the injected invalid fixture with clear error messages.
- Evidence captured:
  - `.sisyphus/evidence/task-4-validate-quiz-data.txt` — normal mode pass output.
  - `.sisyphus/evidence/task-4-validator-negative.txt` — all six negative self-check rejection outputs.
- No modifications to `src/data/quizData.json` or `src/data/quizData.js`.
- No new package dependencies added.
- `npm run build` passes (exit 0).

## 2026-05-12 — First organic MCQ conversion batch (Task 5)

- Generated `.sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json` with 91 entries for only `rj-chemistry-g12-selective-3-organic-2019`.
- All 91 generated entries validated through `scripts/convert-short-answer-mcqs.mjs --dry-run` with 91 converted, 0 skipped, 0 invalid, and 0 missing generated records.
- Converter write mode replaced the first organic batch shortAnswer records through `scripts/convert-short-answer-mcqs.mjs --write --generated ...`; no manual edits were made to individual `quizData.json` records.
- Post-conversion validation passed with `node scripts/validate-quiz-data.mjs`, and `npm run build` completed successfully.
- Hand-authored preservation proof at `.sisyphus/evidence/task-5-hand-authored-preservation.txt` compares current hand-authored MCQs to `HEAD` and reports 26 baseline/current, 0 missing, 0 changed, and 0 invalid.
- Generated organic batch status after write: 91 `generatedFromShortAnswer` records and 0 remaining `shortAnswer` records for the organic volume.

## 2026-05-12 — Remaining batch map (Task 6)

- Current post-Task-5 runtime state has 421 remaining `category: "shortAnswer"` records, all non-organic: grade8 full textbook 157, grade9 volume 1 155, grade9 volume 2 109.
- `.sisyphus/evidence/mcq-remaining-batches.md` maps all three remaining batches with ready status counts from `.sisyphus/evidence/mcq-batch-inventory.json`; all remaining inventory records are ready, with 0 missing-source, 0 duplicate, and 0 unsupported.
- `node scripts/convert-short-answer-mcqs.mjs --all-ready-batches --dry-run` exits 0 and reports 512 selected/ready inventory records because the Task 1 inventory still includes the Task 5 organic baseline batch; current runtime remaining placeholders are reconciled separately to 421.
- A repeat all-ready dry-run preserved `src/data/quizData.json` and `src/data/quizData.js` SHA-256 hashes, confirming dry-run did not mutate runtime quiz data.

## 2026-05-12 — Generated MCQ browser smoke QA (Task 7)

- `npm run build` exits 0 after the generated organic MCQ conversion; the only build caveat remains the existing Vite large-chunk warning.
- Browser QA used a deterministic `Math.random` override before dispatching `startfullquiz` so the first generated organic MCQ rendered immediately without changing source files or quiz data.
- The generated question `为什么碳元素能让有机化合物形成一个特别庞大的家族？` rendered with exactly four options and no visible `待复核` placeholder text.
- Correct answer selection showed score `1/20`; incorrect answer selection showed score `0/20` and marked the correct option.
- Browser console showed no generated-MCQ flow errors; only `/favicon.ico` returned 404.

## 2026-05-12, Operator guide and report reconciliation (Task 8)

- Operator guide created at `.sisyphus/evidence/mcq-generation-operator-guide.md` with concrete dry-run, write, validation, build, browser QA startup, and remaining-batch commands.
- Current reconciliation remains stable: 512 original textbook `shortAnswer` placeholders, 91 organic generated and converted MCQs, 0 skipped, 0 invalid, 421 remaining placeholders, and 26 hand-authored MCQs preserved.
- Runtime data check from `src/data/quizData.json` confirms `91 + 0 + 421 = 512`, total records remain 538, and the organic volume has 91 generated records with 0 remaining `shortAnswer` records.
- Guide policy states no human review gate and requires low-confidence items to be skipped with a reason instead of written as placeholder MCQs.
- Task 8 evidence files added: `.sisyphus/evidence/task-8-guide-review.md` and `.sisyphus/evidence/task-8-report-totals.md`.

## 2026-05-12 — Final-wave scope-check discipline

- Final verification reviewers F1 and F4 rejected scope creep in `src/modules/quiz.js` (runtime short-answer normalization/distractor generation) and unrelated build artifact changes in `dist/index.html`.
- Root-level browser QA screenshots (e.g., `generated-organic-mcq-live.png`) must not be committed; evidence-only browser QA artifacts belong exclusively under `.sisyphus/evidence/`.
- Data-pipeline scope means changes are confined to `src/data/quizData.json`, converter/validator scripts, and `.sisyphus/evidence/`; runtime quiz behavior files like `src/modules/quiz.js` must remain untouched.
- Build artifacts are out of scope; if `npm run build` is run for verification, restore `dist/index.html` afterward to keep the working tree clean.
