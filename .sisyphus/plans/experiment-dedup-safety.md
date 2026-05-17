# Lab Experiment Deduplication and Safety Notes

## TL;DR
> **Summary**: Implement deterministic build-time deduplication for runtime lab experiments using normalized experiment content, then generate conservative Chinese safety summaries from merged experiment risks instead of copying steps or using fallback text.
> **Deliverables**:
> - Build-time content fingerprint + conservative loose-similarity merge in `scripts/textbook/build-lab-experiments.mjs`.
> - Merged runtime records that preserve first-source title/ID and union all `sourceReferences`.
> - Rule-based Chinese safety summary generation after dedupe.
> - Validation/self-check coverage for duplicate merging, source-reference preservation, and safety-note quality.
> **Effort**: Medium
> **Parallel**: YES - 5 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4/5 → Task 6 → Final Verification

## Context
### Original Request
User requested:
- 实验去重依据：实验内容是否一样，而不是标题、ID、教材卷册、来源 section 是否一样。
- 需要用标准化后的 `textbookContent` / `steps` / `materials` / `observedPhenomena` 做内容指纹。
- 同一实验如果出现在八年级、九年级或不同教材生成目录中，应合并为一个 runtime lab experiment。
- 合并时保留多个 `sourceReferences`，不要丢教材来源。
- 去重后，对唯一实验生成安全注意事项。
- 不再把步骤机械塞进 `safetyNotes`。
- 应根据实验内容和风险总结，例如加热/酒精灯/燃烧、集气瓶/导管/排水法、酸碱/腐蚀性溶液、有毒/刺激性气体、易燃气体等。
- 如果教材没有明确安全提示，也应该根据教材实验步骤和 `safetyLevel` 给出保守中文总结，而不是“未提取到安全提示”。

### Interview Summary
- Deduplication strictness: **宽松相似合并**, but implemented deterministically with hard conflict blockers and audit evidence.
- Merged display title / primary source: **保留首个来源**. Keep first accepted runtime record's `id`, `experimentId`, `title`, `name`, `sourceVolumeId`, and primary unlock grade behavior unless max safety changes unlock stage.
- Verification preference: **验证脚本优先**. Browser/UI checks are optional final-review supplements only.

### Research Findings
- `src/data/index.js:12,38` imports and exports `labExperiments` from `src/data/labExperiments.json`; this is the runtime data boundary.
- `src/modules/lab.js:86-88,206-237` renders/filter labs from the imported runtime array; dedupe should happen before runtime import, not in UI rendering.
- `scripts/textbook/build-lab-experiments.mjs:228-363` reads generated textbook candidates/backlogs, builds runtime records, currently dedupes by `sourceVolumeId|sourceSectionId` and `title|textbookContent` hash, then writes `src/data/labExperiments.json` in `main()` lines 174-180.
- `scripts/textbook/build-lab-experiments.mjs:520-529` currently copies extracted `safetyNotes` or emits fallback text including “教材未提取到明确安全提示”, which violates the request.
- `scripts/textbook/build-lab-experiments.mjs:564-589` already builds `sourceReferences` per source-section group; content-level merge must union references across groups.
- `scripts/validate-lab-experiments.mjs:59-79,477-585` validates schema and arrays; it rejects English fallback text but does not yet reject Chinese fallback text, duplicate content clusters, or step-copy safety notes.
- `package.json:33-34` provides `npm run validate:lab-experiments` and `npm run validate:lab-boundary`; `npm run build` exists. `@playwright/test` is installed but formal test files/config are absent.

### Metis Review (gaps addressed)
- Define “loose similar merge” operationally: exact canonical grouping first; then bounded deterministic similarity scoring with hard conflict blockers.
- Preserve step order in fingerprints; normalize step numbering/spacing but do not sort steps.
- Treat materials and observed phenomena as order-insensitive after normalization.
- Generate safety notes after merge and incorporate explicit extracted notes as risk evidence, not as direct copy output.
- Emit machine-readable merge audit evidence for exact and loose merges.
- Validate no forbidden fallback text, no duplicate content clusters, source-reference union, and safety-note quality.
- Do not add LLM dedupe, runtime UI dedupe, or unrelated lab UI redesign.

## Work Objectives
### Core Objective
Generate one runtime lab experiment per unique experiment content cluster, preserving full provenance and producing conservative Chinese safety notes derived from merged experiment risks.

### Deliverables
- Refactored `scripts/textbook/build-lab-experiments.mjs` pipeline that separates candidate record construction from final content dedupe/merge.
- Deterministic content canonicalization and loose similarity merge implementation using `textbookContent`, `steps`, `materials`, and `observedPhenomena` with exact field weights/metrics: `textbookContent` 0.35 char-3gram Dice, `steps` 0.30 sequence-preserving indexed-step char-3gram Dice average, `materials` 0.20 token Jaccard, `observedPhenomena` 0.15 token/phrase Jaccard.
- Merged runtime experiment policy:
  - first accepted record remains primary for `id`, `experimentId`, `title`, `name`, `description`, and primary `sourceVolumeId`;
  - `sourceReferences`, `curriculumTags`, `materials`, `steps`, and `observedPhenomena` are cleanly unioned;
  - `safetyLevel` becomes the maximum risk level among merged records and inferred hazards;
  - `safetyNotes` regenerated after merge.
- Rule-based Chinese safety summary generator with risk categories for fire/heat, gas collection, corrosives, toxic/irritating gases, flammable gases, glassware/device/backflow, and conservative default by `safetyLevel`.
- Validator enhancements and self-check fixtures in `scripts/validate-lab-experiments.mjs`.
- Evidence reports under `.sisyphus/evidence/` produced by commands in acceptance criteria.

### Definition of Done (verifiable conditions with commands)
- `node scripts/textbook/build-lab-experiments.mjs --check --evidence .sisyphus/evidence/task-4-build-lab-dedup-check.json` exits `0` and evidence includes merge counters/report fields.
- `node scripts/textbook/build-lab-experiments.mjs --write --evidence .sisyphus/evidence/task-4-build-lab-dedup-write.json` exits `0` and writes deduped `src/data/labExperiments.json`.
- `npm run validate:lab-experiments` exits `0` with no duplicate-content, forbidden-fallback, empty-source-reference, or safety-step-copy failures.
- `npm run validate:lab-boundary` exits `0`.
- `npm run build` exits `0`.
- Search command over `src/data/labExperiments.json` finds zero occurrences of `未提取到安全提示`, `教材未提取到明确安全提示`, and `No explicit safety note was extracted`.

### Must Have
- Deduplication uses normalized `textbookContent`, `steps`, `materials`, and `observedPhenomena`; it must not rely on title, ID, volume, or section alone.
- Loose merge must be deterministic, auditable, and blocked by hard chemistry/procedure conflicts.
- Merged records must retain all source provenance through `sourceReferences` union.
- Safety summaries must be Chinese risk summaries generated after dedupe.
- Explicit textbook safety notes may be used as risk signals but must not be copied blindly if they are just steps or placeholders.
- The builder must remain runnable in `--check` and `--write` modes.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- MUST NOT add runtime dedupe in `src/modules/lab.js`.
- MUST NOT redesign lab UI or source reference presentation.
- MUST NOT introduce LLM-based semantic dedupe or non-deterministic scoring.
- MUST NOT normalize chemically distinct substances into broad interchangeable buckets for dedupe (e.g. 盐酸 and 硫酸 are not identical for merge conflict checks).
- MUST NOT sort procedural `steps`; sequence remains meaningful.
- MUST NOT emit safety fallback text equivalent to “未提取到安全提示”.
- MUST NOT make acceptance depend on manual visual inspection.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: validation-script-first using existing Node scripts; add targeted validator self-checks/fixtures rather than a new full test framework.
- QA policy: Every implementation task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.
- Required final commands:
  - `node scripts/textbook/build-lab-experiments.mjs --check --evidence .sisyphus/evidence/task-4-build-lab-dedup-check.json`
  - `node scripts/textbook/build-lab-experiments.mjs --write --evidence .sisyphus/evidence/task-4-build-lab-dedup-write.json`
  - `npm run validate:lab-experiments`
  - `npm run validate:lab-boundary`
  - `npm run build`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 (builder refactor and candidate-record staging)
Wave 2: Task 2 (content canonicalization/dedupe merge)
Wave 3: Task 3 (post-merge safety summarizer)
Wave 4: Task 4 (builder integration/evidence/write behavior) and Task 5 (validator/self-check enhancements) in parallel after Tasks 2-3.
Wave 5: Task 6 (regenerate runtime data and execute validation/build) after Tasks 4-5.

### Dependency Matrix (full, all tasks)
| Task | Blocks | Blocked By |
|---|---|---|
| 1. Refactor builder candidate staging | 2, 3, 4 | none |
| 2. Implement content fingerprint + merge | 3, 4, 5, 6 | 1 |
| 3. Implement post-merge safety summarizer | 4, 5, 6 | 2 |
| 4. Integrate builder output/evidence | 6 | 2, 3 |
| 5. Extend validator and self-check fixtures | 6 | 2, 3 |
| 6. Regenerate runtime data and verify | Final Verification | 4, 5 |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Task Count | Categories |
|---|---:|---|
| 1 | 1 | unspecified-high |
| 2 | 1 | unspecified-high |
| 3 | 1 | unspecified-high |
| 4 | 2 | unspecified-high, unspecified-high |
| 5 | 1 | unspecified-high |
| Final | 4 | oracle, unspecified-high, unspecified-high, deep |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Refactor builder to stage accepted runtime candidates before content dedupe

  **What to do**: In `scripts/textbook/build-lab-experiments.mjs`, refactor `buildLabExperimentPlan()` so it first creates a list of accepted candidate runtime records from each explicit source group, then applies content-level merge in a later step. Preserve all existing inclusion/exclusion checks, title/description/material/step/phenomenon derivation, legacy matching, counters, `--check`, `--write`, and validation behavior. Replace current immediate `seenContent` rejection at lines 296-301 with candidate staging; keep `seenSections` only for exact same source-section duplicate suppression before candidate construction.
  **Must NOT do**: Do not change runtime UI files. Do not remove existing curated legacy preservation. Do not write `src/data/labExperiments.json` except through the existing `--write` path.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Data-pipeline refactor with regression risk.
  - Skills: [`systematic-debugging`] - Use only if existing validation behavior breaks while refactoring.
  - Omitted: [`frontend-design`, `playwright`] - No UI design or browser automation needed for this task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2, 3, 4] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:228-363` - main builder loop, current counters, duplicate rejection, record push, sorting, validation return payload.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:264-301` - current source-section and title/content duplicate logic to preserve/refactor.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:303-334` - runtime record shape to keep unchanged at candidate construction.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:340-345,591-623` - curated legacy preservation must remain.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:637-680` - local runtime validation must still validate final records.
  - Test: `package.json:33-34` - relevant validation scripts available.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node scripts/textbook/build-lab-experiments.mjs --check --evidence .sisyphus/evidence/task-1-builder-staging-check.json` exits `0`.
  - [ ] `.sisyphus/evidence/task-1-builder-staging-check.json` exists and contains `"builder": "scripts/textbook/build-lab-experiments.mjs"` and `"status": "pass"`.
  - [ ] `npm run validate:lab-experiments` exits `0` after the refactor, even before new dedupe behavior is added.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Existing builder check mode still works after staging refactor
    Tool: Bash
    Steps: Run `node scripts/textbook/build-lab-experiments.mjs --check --evidence .sisyphus/evidence/task-1-builder-staging-check.json` from repo root.
    Expected: Command exits 0; evidence JSON status is pass; output still reports accepted/rejected/curated counters.
    Evidence: .sisyphus/evidence/task-1-builder-staging-check.json

  Scenario: Refactor does not emit invalid runtime schema
    Tool: Bash
    Steps: Run `npm run validate:lab-experiments` from repo root.
    Expected: Command exits 0; no missing required field, invalid source kind, invalid safety level, or empty array errors are printed.
    Evidence: .sisyphus/evidence/task-1-validate-lab-experiments.txt
  ```

  **Commit**: NO | Message: `fix(lab): stage experiment candidates before dedupe` | Files: [`scripts/textbook/build-lab-experiments.mjs`]

- [x] 2. Implement deterministic content fingerprinting and conservative loose merge

  **What to do**: Add content canonicalization and merge helpers in `scripts/textbook/build-lab-experiments.mjs`. Fingerprint exactly these field families: `textbookContent`, `steps`, `materials`, `observedPhenomena`. Canonicalization rules: normalize Unicode width where safe, Chinese/ASCII punctuation, whitespace, experiment number labels, markdown/html remnants, step numbering variants (`①`, `1）`, `步骤一`, `（1）`), formula subscript variants (`CO₂`→`CO2`, `H₂`→`H2`), and common unit spacing. Preserve `steps` sequence; do not sort steps. Treat `materials` and `observedPhenomena` as order-insensitive after normalization/dedupe. Exact fingerprint format: JSON string of `{ textbookContent: canonicalText, steps: canonicalStepsInOriginalOrder, materials: sortedUniqueCanonicalMaterials, observedPhenomena: sortedUniqueCanonicalPhenomena }`, hashed with existing `hashText()`. Loose similarity metric is fixed: `textbookContentScore = sorensenDice(charTrigrams(a.textbookContent), charTrigrams(b.textbookContent))`; `stepsScore = average indexed step Dice for matching positions, with unmatched positions scoring 0 and denominator = max(stepCountA, stepCountB)`; `materialsScore = jaccard(sortedUniqueCanonicalMaterialsA, sortedUniqueCanonicalMaterialsB)`; `phenomenaScore = jaccard(sortedUniqueCanonicalPhenomenaA, sortedUniqueCanonicalPhenomenaB)`. Overall score = `0.35 * textbookContentScore + 0.30 * stepsScore + 0.20 * materialsScore + 0.15 * phenomenaScore`. Merge if exact fingerprint matches OR loose overall score >= 0.86 AND at least two field-family scores >= 0.82 AND at least one of `textbookContentScore` or `stepsScore` >= 0.82 AND no hard conflict. Hard blockers: conflicting core reactive substances, conflicting gas identity, conflicting main apparatus/procedure family, or contradictory observed phenomenon. Maintain counters for exact merges, loose merges, and blocked loose candidates.
  **Must NOT do**: Do not dedupe by title/ID/volume/section alone. Do not use random, LLM, embeddings, or external services. Do not collapse distinct acids/bases/gases into generic categories for conflict checks.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Requires careful deterministic algorithm design and data edge cases.
  - Skills: [`test-driven-development`] - Add/extend self-check fixtures before relying on behavior.
  - Omitted: [`frontend-design`] - No UI changes.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [3, 4, 5, 6] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:22-43` - existing normalization/title noise patterns to reuse or extend.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:296-301` - current insufficient duplicate key to replace with content-field merge.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:497-510` - materials derivation; array order should not determine equality.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:474-495` - steps derivation; sequence must remain meaningful.
  - Pattern: `scripts/textbook/experiment-enrichment.mjs:30-37,308-310` - existing text/formula normalization helpers/patterns for inspiration; do not import unless stable and appropriate.
  - API/Type: runtime record fields documented in `scripts/validate-lab-experiments.mjs:8-31`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Builder evidence from `node scripts/textbook/build-lab-experiments.mjs --check --evidence .sisyphus/evidence/task-2-dedupe-check.json` includes counters/details for `exactContentMerges`, `looseContentMerges`, and `blockedContentMergeCandidates`.
  - [ ] A fixture/self-check command introduced by this task proves same content across different volume/section IDs merges to one runtime record and retains `sourceReferences.length >= 2`.
  - [ ] A fixture/self-check command proves same/similar title with conflicting substances or gas identity remains two records.
  - [ ] `npm run validate:lab-experiments` exits `0` after implementation.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Duplicate content from different sources merges
    Tool: Bash
    Steps: Run the new builder or validator self-check for duplicate content, e.g. `node scripts/validate-lab-experiments.mjs --self-check duplicate-content-merge` if implemented there, or the equivalent documented self-check command.
    Expected: Command exits 0; result shows one kept runtime experiment, at least two sourceReferences, first source ID/title retained, and merge reason `exact` or `loose`.
    Evidence: .sisyphus/evidence/task-2-duplicate-content-merge.json

  Scenario: Similar title with different chemistry is blocked
    Tool: Bash
    Steps: Run the new conflict self-check, e.g. `node scripts/validate-lab-experiments.mjs --self-check duplicate-content-conflict` or equivalent.
    Expected: Command exits 0; result shows two separate records and a blocked merge reason naming conflicting substance/gas/phenomenon.
    Evidence: .sisyphus/evidence/task-2-duplicate-content-conflict.json
  ```

  **Commit**: NO | Message: `fix(lab): merge experiments by normalized content` | Files: [`scripts/textbook/build-lab-experiments.mjs`, `scripts/validate-lab-experiments.mjs` if self-checks are colocated]

- [x] 3. Implement post-merge Chinese safety risk summarizer

  **What to do**: Replace `safetyNotesFor(group, safetyLevel)` behavior in `scripts/textbook/build-lab-experiments.mjs` with a post-merge safety generator that receives the merged runtime record content. It must use merged `textbookContent`, `steps`, `materials`, `observedPhenomena`, explicit extracted `safetyNotes` as risk signals only, and final `safetyLevel`. Generate 1-4 concise Chinese safety notes. Required risk rules: heating/alcohol lamp/flame/combustion → fire, hot glass, clamps, keep combustibles away; gas collection/集气瓶/导管/排水法 → airtightness, tube position, backflow prevention, collection bottle handling; acid/base/corrosive solution → goggles, avoid skin/eye contact, spill rinse/report; toxic/irritating gases such as 氯气/氨气/二氧化硫/硫化氢/氮氧化物 → ventilation, teacher demonstration, do not smell directly; flammable gases such as 氢气/乙炔/甲烷 → test purity before ignition, keep away from flames, prevent explosion; default by safetyLevel → conservative teacher-supervised virtual-learning note without saying no safety note was extracted. Explicit textbook safety notes that are clean and non-step-like may influence category selection but final notes must be normalized summaries, not copied steps.
  **Must NOT do**: Do not mechanically append `steps` to `safetyNotes`. Do not output `教材未提取到明确安全提示`, `未提取到安全提示`, or English fallback text. Do not create overly long paragraph notes.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Deterministic rule design with Chinese content-quality requirements.
  - Skills: [`test-driven-development`] - Safety rules need fixture-first checks.
  - Omitted: [`playwright`] - Data validation covers this task.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [4, 5, 6] | Blocked By: [2]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:520-529` - current function to replace; contains forbidden fallback.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:311-333` - current record construction; safety notes must be assigned after merge, not before final content cluster is known.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:512-518` - current safetyLevel derivation; final safety notes must account for safetyLevel.
  - Pattern: `scripts/validate-lab-experiments.mjs:107,561-566` - existing fallback safety-note rejection, to extend later.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Heating/alcohol-lamp fixture produces Chinese note mentioning flame/heat/burn/fire precautions and does not copy a step sentence.
  - [ ] Gas collection/water displacement fixture produces Chinese note mentioning airtightness, tube position/backflow, or collection handling.
  - [ ] Acid/base/corrosive fixture produces Chinese note mentioning goggles/skin-eye protection/corrosion.
  - [ ] Toxic/irritating gas fixture produces Chinese note mentioning ventilation/teacher demonstration/no direct smelling.
  - [ ] Hydrogen/acetylene/flammable gas fixture produces Chinese note mentioning purity test or explosion/fire avoidance.
  - [ ] Fallback string search in generated/check output finds zero forbidden fallback phrases.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Implicit hazards produce conservative Chinese safety notes
    Tool: Bash
    Steps: Run the safety self-check command, e.g. `node scripts/validate-lab-experiments.mjs --self-check safety-risk-summary` or equivalent fixture command.
    Expected: Command exits 0; heating, gas collection, corrosive, toxic gas, and flammable gas fixtures each produce category-appropriate Chinese risk notes.
    Evidence: .sisyphus/evidence/task-3-safety-risk-summary.json

  Scenario: Safety notes are not copied steps or forbidden fallback
    Tool: Bash
    Steps: Run safety quality self-check and grep/search generated data for forbidden phrases.
    Expected: Command exits 0; no note has high similarity to a full step sentence; zero occurrences of `未提取到安全提示`, `教材未提取到明确安全提示`, or `No explicit safety note was extracted`.
    Evidence: .sisyphus/evidence/task-3-safety-quality.json
  ```

  **Commit**: NO | Message: `fix(lab): summarize experiment safety risks` | Files: [`scripts/textbook/build-lab-experiments.mjs`, `scripts/validate-lab-experiments.mjs` if self-checks are colocated]

- [x] 4. Integrate merged output, source-reference union, and audit evidence

  **What to do**: Wire Tasks 2-3 into final `buildLabExperimentPlan()` output. Merge policy: first accepted candidate in existing sorted group order keeps `id`, `experimentId`, `title`, `name`, `description`, primary `sourceVolumeId`, and display ordering basis; final `sourceReferences` is the stable union of all merged records' refs deduped by `candidateId|sourcePath|lineRange|sourceKind`; `curriculumTags`, `materials`, and `observedPhenomena` are stable clean unions; `steps` keeps primary steps and appends non-duplicate supplemental steps only when they add distinct procedural content without reordering primary sequence; `safetyLevel` is max risk using order `safe < caution < dangerous < extremely dangerous`; `unlockRequirements` should be recomputed or upgraded consistently with final `safetyLevel` while preserving primary grade where possible. Add `dedupeAudit`/`mergeReport` to builder evidence containing kept ID/title, merged IDs/titles/source sections, merge type, score/reasons, hard-conflict status, sourceReference count before/after, and safety risk categories. Final `labExperiments` must be sorted by existing `compareRuntimeRecords` after merge.
  **Must NOT do**: Do not lose source refs from secondary sources. Do not expose audit-only fields inside runtime records unless existing schema is updated and validated; prefer evidence report. Do not change `src/data/index.js` import boundary.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Integration of merge semantics and evidence with existing build contract.
  - Skills: [] - Straight implementation with existing scripts.
  - Omitted: [`frontend-design`, `playwright`] - No UI changes required.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: [6] | Blocked By: [2, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:348-362` - final sorting, validation, return payload.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:564-589` - source reference construction and sorting; reuse compare function for union stability.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:544-552` - unlock requirements currently depend on grade and safetyLevel.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:179-180` - evidence writing path.
  - Pattern: `scripts/textbook/build-lab-experiments.mjs:591-623` - curated legacy sourceReferences shape.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node scripts/textbook/build-lab-experiments.mjs --check --evidence .sisyphus/evidence/task-4-build-lab-dedup-check.json` exits `0`.
  - [ ] Evidence JSON includes a merge report with arrays/counters for exact merges, loose merges, blocked candidates, and merged source reference totals.
  - [ ] For at least one exact or fixture merge, evidence shows `sourceReferenceCountAfter >= sourceReferenceCountBefore` and `sourceReferences.length >= 2` for merged output.
  - [ ] Runtime records in evidence/output do not contain audit-only helper fields such as raw similarity score unless validator schema intentionally allows them.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Merge audit evidence is machine-readable
    Tool: Bash
    Steps: Run `node scripts/textbook/build-lab-experiments.mjs --check --evidence .sisyphus/evidence/task-4-build-lab-dedup-check.json`.
    Expected: Command exits 0; evidence JSON has pass status and merge report entries/counters with kept ID, merged source references, merge reason, and blocked candidate details if any.
    Evidence: .sisyphus/evidence/task-4-build-lab-dedup-check.json

  Scenario: Source provenance survives merge
    Tool: Bash
    Steps: Run the duplicate merge self-check or inspect evidence via a Node assertion command added by implementation.
    Expected: The merged runtime experiment retains the first source title/ID and has all sourceReferences from merged grade/source records with no duplicate reference keys.
    Evidence: .sisyphus/evidence/task-4-source-reference-union.json
  ```

  **Commit**: NO | Message: `fix(lab): preserve provenance during experiment merge` | Files: [`scripts/textbook/build-lab-experiments.mjs`]

- [x] 5. Extend lab validation for duplicate clusters and safety-note quality

  **What to do**: Update `scripts/validate-lab-experiments.mjs` to validate the new contract. Add or expose deterministic helpers compatible with builder canonicalization, or duplicate minimal validation-only canonicalization if importing is unsafe. Required validation: no duplicate content clusters by canonical fingerprint among emitted runtime records; no forbidden fallback phrases (`未提取到安全提示`, `教材未提取到明确安全提示`, `No explicit safety note was extracted`); safety notes are non-empty Chinese summaries and not highly similar to full step sentences; merged/provenance fixture has unioned `sourceReferences`; conflict fixture does not merge distinct chemistry. Add self-check names to help text, for example `duplicate-content-merge`, `duplicate-content-conflict`, `source-reference-union`, `safety-risk-summary`, and `safety-note-quality`. Self-checks must write JSON reports when `--report` is provided and fail with exit code 1 on regression.
  **Must NOT do**: Do not weaken existing required-field/schema checks. Do not make validation depend on generated data only; include targeted fixtures so behavior is testable even if current corpus lacks a duplicate.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Validation logic must lock in behavior and avoid false confidence.
  - Skills: [`test-driven-development`] - Start with failing self-check fixtures, then make them pass.
  - Omitted: [`playwright`] - User chose validation-script priority.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: [6] | Blocked By: [2, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `scripts/validate-lab-experiments.mjs:182-217` - CLI parse supports `--self-check` and `--report`.
  - Pattern: `scripts/validate-lab-experiments.mjs:219-235` - help text self-check list to extend.
  - Pattern: `scripts/validate-lab-experiments.mjs:237-252` - self-check dispatcher.
  - Pattern: `scripts/validate-lab-experiments.mjs:477-585` - main runtime record validation loop.
  - Pattern: `scripts/validate-lab-experiments.mjs:561-566` - existing fallback safety note rejection.
  - Pattern: `scripts/validate-lab-experiments.mjs:574-584` - array field validation including sourceReferences.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node scripts/validate-lab-experiments.mjs --self-check duplicate-content-merge --report .sisyphus/evidence/task-5-duplicate-content-merge.json` exits `0`.
  - [ ] `node scripts/validate-lab-experiments.mjs --self-check duplicate-content-conflict --report .sisyphus/evidence/task-5-duplicate-content-conflict.json` exits `0`.
  - [ ] `node scripts/validate-lab-experiments.mjs --self-check source-reference-union --report .sisyphus/evidence/task-5-source-reference-union.json` exits `0`.
  - [ ] `node scripts/validate-lab-experiments.mjs --self-check safety-risk-summary --report .sisyphus/evidence/task-5-safety-risk-summary.json` exits `0`.
  - [ ] `node scripts/validate-lab-experiments.mjs --self-check safety-note-quality --report .sisyphus/evidence/task-5-safety-note-quality.json` exits `0`.
  - [ ] `npm run validate:lab-experiments` exits `0` on generated runtime data.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Validator catches duplicate-content regressions
    Tool: Bash
    Steps: Run `node scripts/validate-lab-experiments.mjs --self-check duplicate-content-merge --report .sisyphus/evidence/task-5-duplicate-content-merge.json`.
    Expected: Command exits 0; report proves content-equivalent records across different source IDs become one accepted runtime record with multiple refs.
    Evidence: .sisyphus/evidence/task-5-duplicate-content-merge.json

  Scenario: Validator rejects bad safety notes
    Tool: Bash
    Steps: Run `node scripts/validate-lab-experiments.mjs --self-check safety-note-quality --report .sisyphus/evidence/task-5-safety-note-quality.json`.
    Expected: Command exits 0; report shows forbidden fallback and step-copy examples are rejected, while concise Chinese risk summaries are accepted.
    Evidence: .sisyphus/evidence/task-5-safety-note-quality.json
  ```

  **Commit**: NO | Message: `test(lab): validate dedupe and safety note quality` | Files: [`scripts/validate-lab-experiments.mjs`]

- [x] 6. Regenerate runtime lab data and run script-first verification

  **What to do**: After Tasks 4-5 pass, run the builder in `--write` mode to regenerate `src/data/labExperiments.json`. Then run all required validation/build commands. Capture evidence under `.sisyphus/evidence/`. If `src/data/labExperiments.json` changes, inspect generated diff for expected effects only: fewer/equal records due to merge, sourceReferences preserved/expanded, no forbidden fallback safety text, safetyNotes are Chinese risk summaries. Do not manually edit JSON output; fix generator if output is wrong and rerun.
  **Must NOT do**: Do not hand-edit generated `src/data/labExperiments.json`. Do not skip build if validation passes. Do not commit unless explicitly asked.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Final data regeneration and validation across scripts/build.
  - Skills: [`verification-before-completion`] - Evidence before success claims.
  - Omitted: [`frontend-design`] - No design work.

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: [Final Verification] | Blocked By: [4, 5]

  **References** (executor has NO interview context - be exhaustive):
  - Command: `node scripts/textbook/build-lab-experiments.mjs --write --evidence .sisyphus/evidence/task-6-build-lab-dedup-write.json` - writes generated runtime data.
  - Command: `npm run validate:lab-experiments` - validates lab runtime schema/content.
  - Command: `npm run validate:lab-boundary` - validates lab data boundary.
  - Command: `npm run build` - production build.
  - Data: `src/data/labExperiments.json` - generated runtime output to verify, not hand-edit.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node scripts/textbook/build-lab-experiments.mjs --write --evidence .sisyphus/evidence/task-6-build-lab-dedup-write.json` exits `0`.
  - [ ] `npm run validate:lab-experiments` exits `0`.
  - [ ] `npm run validate:lab-boundary` exits `0`.
  - [ ] `npm run build` exits `0`.
  - [ ] A grep/search command over `src/data/labExperiments.json` returns zero forbidden safety fallback phrases.
  - [ ] Generated diff contains no sourceReferences loss for merged records.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full script-first verification passes
    Tool: Bash
    Steps: Run, in order, `node scripts/textbook/build-lab-experiments.mjs --write --evidence .sisyphus/evidence/task-6-build-lab-dedup-write.json`, `npm run validate:lab-experiments`, `npm run validate:lab-boundary`, and `npm run build`.
    Expected: All commands exit 0; write evidence status is pass; validation output reports no duplicate-content or safety-note errors.
    Evidence: .sisyphus/evidence/task-6-build-lab-dedup-write.json

  Scenario: Generated data contains no forbidden safety fallback
    Tool: Bash
    Steps: Search `src/data/labExperiments.json` for `未提取到安全提示`, `教材未提取到明确安全提示`, and `No explicit safety note was extracted`.
    Expected: Zero matches for all forbidden phrases.
    Evidence: .sisyphus/evidence/task-6-forbidden-safety-search.txt
  ```

  **Commit**: NO | Message: `fix(lab): regenerate deduped lab experiments` | Files: [`src/data/labExperiments.json`, `.sisyphus/evidence/*` only if requested]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle

  **What to do**: Read this plan and the final diff, then verify every user requirement and guardrail was implemented exactly: build-time content dedupe, normalized content fingerprint fields, first-source primary display, sourceReferences union, post-dedupe Chinese safety summaries, script-first validation, and no runtime UI dedupe.
  **Must NOT do**: Do not modify files. Do not approve if any user requirement is only partially implemented.

  **Recommended Agent Profile**:
  - Category: direct `oracle` - Reason: Independent read-only compliance judgment.
  - Skills: [] - Review only.
  - Omitted: [`frontend-design`, `playwright`] - Not needed for compliance audit.

  **Parallelization**: Can Parallel: YES | Final Wave | Blocks: [completion] | Blocked By: [6]

  **References**:
  - Plan: `.sisyphus/plans/experiment-dedup-safety.md` - source of truth.
  - Builder: `scripts/textbook/build-lab-experiments.mjs` - expected implementation location.
  - Validator: `scripts/validate-lab-experiments.mjs` - expected validation location.
  - Data: `src/data/labExperiments.json` - generated runtime data.

  **Acceptance Criteria**:
  - [ ] Oracle returns APPROVE/GO only if all plan requirements are implemented and verified.
  - [ ] Oracle cites any deviation with exact file path and requirement violated.

  **QA Scenarios**:
  ```
  Scenario: Compliance reviewer approves full implementation
    Tool: task oracle
    Steps: Provide plan path, final diff summary, and verification evidence paths to oracle.
    Expected: Oracle returns APPROVE/GO with no blocking deviations.
    Evidence: .sisyphus/evidence/f1-plan-compliance-audit.md

  Scenario: Compliance reviewer blocks partial implementation
    Tool: task oracle
    Steps: Same review request; if any requirement is missing, oracle must return NO-GO with exact missing item.
    Expected: Any NO-GO triggers fixes and rerun of all affected verification.
    Evidence: .sisyphus/evidence/f1-plan-compliance-audit.md
  ```

  **Commit**: NO | Message: `review: plan compliance audit` | Files: []

- [x] F2. Code Quality Review — unspecified-high

  **What to do**: Review implementation quality in builder and validator: deterministic helpers are cohesive, no duplicated unsafe logic beyond intentional validator independence, no brittle magic outside documented thresholds, no generated-data hand edits, clear counters/evidence, no source provenance loss, no global side effects beyond existing CLI behavior.
  **Must NOT do**: Do not refactor unrelated modules. Do not approve if implementation is non-deterministic or overbroad.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Hands-on code review with data-pipeline quality focus.
  - Skills: [`ai-slop-remover`] - Use only if reviewing one touched file for obvious AI-code smells; otherwise review directly.
  - Omitted: [`frontend-design`] - No UI design.

  **Parallelization**: Can Parallel: YES | Final Wave | Blocks: [completion] | Blocked By: [6]

  **References**:
  - Builder: `scripts/textbook/build-lab-experiments.mjs` - main implementation.
  - Validator: `scripts/validate-lab-experiments.mjs` - test/validation changes.
  - Evidence: `.sisyphus/evidence/task-6-build-lab-dedup-write.json` - final build evidence.

  **Acceptance Criteria**:
  - [ ] Reviewer returns APPROVE only if code is deterministic, maintainable, and scoped.
  - [ ] Reviewer confirms no unrelated UI/runtime changes were made.
  - [ ] Reviewer confirms generated JSON was produced by builder, not manual patching.

  **QA Scenarios**:
  ```
  Scenario: Code quality reviewer approves deterministic implementation
    Tool: task unspecified-high
    Steps: Review touched files and evidence.
    Expected: APPROVE with concise notes on determinism, scope, and maintainability.
    Evidence: .sisyphus/evidence/f2-code-quality-review.md

  Scenario: Code quality reviewer blocks non-deterministic or overbroad code
    Tool: task unspecified-high
    Steps: Same review request; identify any non-deterministic scoring, unrelated UI change, or provenance-loss risk.
    Expected: NO-GO triggers fixes and rerun of affected commands.
    Evidence: .sisyphus/evidence/f2-code-quality-review.md
  ```

  **Commit**: NO | Message: `review: code quality audit` | Files: []

- [x] F3. Real Manual QA — unspecified-high

  **What to do**: Execute the final verification commands and inspect machine-readable evidence/data. Since user selected validation-script priority and no Playwright config exists, QA is command/data based: run or verify outputs for builder write, lab validation, lab boundary validation, build, forbidden safety text search, and representative evidence assertions for duplicate merge and safety rules.
  **Must NOT do**: Do not rely on manual visual inspection. Do not require browser QA unless command/data evidence is insufficient.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Hands-on QA execution and evidence inspection.
  - Skills: [`verification-before-completion`] - Evidence before approval.
  - Omitted: [`playwright`] - No existing Playwright config; user chose script-first validation.

  **Parallelization**: Can Parallel: YES | Final Wave | Blocks: [completion] | Blocked By: [6]

  **References**:
  - Commands: `node scripts/textbook/build-lab-experiments.mjs --write --evidence .sisyphus/evidence/task-6-build-lab-dedup-write.json`, `npm run validate:lab-experiments`, `npm run validate:lab-boundary`, `npm run build`.
  - Data: `src/data/labExperiments.json` - generated data to search for forbidden fallback.
  - Evidence: `.sisyphus/evidence/task-5-*.json`, `.sisyphus/evidence/task-6-*.json`.

  **Acceptance Criteria**:
  - [ ] All required commands exit `0`.
  - [ ] Forbidden safety fallback search returns zero matches.
  - [ ] Evidence proves duplicate merge, conflict blocking, source-reference union, and safety risk summaries.

  **QA Scenarios**:
  ```
  Scenario: Final command suite passes
    Tool: Bash
    Steps: Run required builder, validation, boundary, and build commands or verify fresh captured outputs.
    Expected: Every command exits 0; evidence files exist.
    Evidence: .sisyphus/evidence/f3-command-suite.txt

  Scenario: Generated runtime data satisfies user-visible data contract
    Tool: Bash
    Steps: Search generated `src/data/labExperiments.json` for forbidden fallback phrases and inspect evidence for merged refs/safety categories.
    Expected: Zero forbidden phrase matches; evidence contains expected merge and safety assertions.
    Evidence: .sisyphus/evidence/f3-data-contract.txt
  ```

  **Commit**: NO | Message: `review: qa verification` | Files: []

- [x] F4. Scope Fidelity Check — deep

  **What to do**: Independently assess whether implementation stayed inside scope and faithfully solved the user's Chinese requirements without introducing UI redesign, LLM dedupe, unrelated chemistry ontology expansion, or manual data patching. Confirm final behavior maps to the original eight bullets.
  **Must NOT do**: Do not modify files. Do not approve unrelated feature creep.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Holistic scope/intent fidelity review across requirements and implementation.
  - Skills: [] - Review only.
  - Omitted: [`frontend-design`, `playwright`] - Not needed for scope fidelity.

  **Parallelization**: Can Parallel: YES | Final Wave | Blocks: [completion] | Blocked By: [6]

  **References**:
  - Original requirements in this plan lines 15-24.
  - Scope guardrails in this plan `Must NOT Have` section.
  - Touched implementation files and generated evidence.

  **Acceptance Criteria**:
  - [ ] Reviewer returns APPROVE only if every original bullet is satisfied.
  - [ ] Reviewer confirms no scope creep or unrelated architectural change.
  - [ ] Reviewer flags any mismatch in Chinese safety-note semantics.

  **QA Scenarios**:
  ```
  Scenario: Scope reviewer approves faithful implementation
    Tool: task deep
    Steps: Compare original requirements, plan guardrails, final diff, and evidence.
    Expected: APPROVE with explicit mapping from original bullets to implementation/evidence.
    Evidence: .sisyphus/evidence/f4-scope-fidelity.md

  Scenario: Scope reviewer blocks scope creep or missed Chinese requirement
    Tool: task deep
    Steps: Same review request; check for UI redesign, runtime dedupe, LLM dedupe, fallback safety wording, or lost sourceReferences.
    Expected: NO-GO triggers targeted fixes and rerun of affected verification.
    Evidence: .sisyphus/evidence/f4-scope-fidelity.md
  ```

  **Commit**: NO | Message: `review: scope fidelity audit` | Files: []

## Commit Strategy
- Commit only if the user explicitly asks for a commit.
- Suggested commit message if requested: `fix(lab): dedupe experiments and summarize safety risks`
- Commit should include only relevant files:
  - `scripts/textbook/build-lab-experiments.mjs`
  - `scripts/validate-lab-experiments.mjs`
  - `src/data/labExperiments.json`
  - Any generated evidence only if project convention requires committing `.sisyphus/evidence` (default: do not commit evidence unless requested).

## Success Criteria
- Runtime lab experiment count decreases or stays stable according to content merge report; duplicate content clusters are not emitted as separate runtime records.
- Every merged duplicate cluster retains all provenance through `sourceReferences`.
- Safety notes are Chinese, risk-based, conservative, and free of “未提取到安全提示” fallback text.
- Validator self-checks cover duplicate merging, no false merge for distinct chemistry, source-reference union, implicit hazard notes, and no step-copy notes.
- Existing runtime import/render flow remains unchanged and build passes.
