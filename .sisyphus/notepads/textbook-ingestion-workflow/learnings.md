
## 2026-05-08 - Task 1 batch contract
- Textbook ingestion batch contracts live under `src/data/textbookIngestion/batches/` and are intentionally not exported from `src/data/index.js`.
- The first stable volume ID is `rj-chemistry-grade9-2024-vol1`; its source hash is `sha256:05fc966e6fa296ce1f240a2ea03f6556dd610dcc5563fce19fe42f5e9acba901` for `src/data/textbooks/2024版人教版九年级化学上册/book.md`.
- Validator scripts should derive project paths with `node:path` helpers; nested textbook scripts resolve the repo root from `scripts/textbook/` with `path.resolve(__dirname, '../..')`.

## 2026-05-08 - Task 2 draft schema validators
- Draft ingestion schema validation now lives in `src/data/textbookIngestion/schemas/draftSchemas.js` and remains outside `src/data/index.js` runtime exports.
- Generated per-volume draft artifacts use `src/data/textbookIngestion/generated/<volumeId>/draft-inventory.json` and `promotion-manifest.json`; the validator reads them through `scripts/textbook/validate-draft-schema.mjs` using the same `path.resolve(__dirname, '../..')` root convention as Task 1.
- Reviewed/promoted provenance is intentionally stricter: `reviewStatus` values `reviewed` and `promoted` require `reviewedBy` and `reviewedAt`; all candidate arrays require the shared provenance field set before later extraction/promotion tasks can pass.

## 2026-05-08 - Task 3 source inventory extractor
- `scripts/textbook/extract-textbook.mjs` reads the batch contract and source `book.md`, verifies the batch `sourceHash`, splits on non-empty Markdown headings, and writes deterministic JSON to `src/data/textbookIngestion/generated/<volumeId>/source-inventory.json` without timestamps.
- Each generated source section keeps Task 2 provenance fields (`sourceVolumeId`, `sourcePath`, `sourceHeading`, `sourceLineStart`, `sourceLineEnd`, `sourceHash`, `reviewStatus`) plus `sectionHash`, `sourceText`, and local Markdown image references under `assets`.
- Determinism is enforced by stable heading order, line ranges, SHA-256 hashes, pretty JSON with trailing newline, and no runtime data writes; the extractor produced 419 sections and 142 asset references for `rj-chemistry-grade9-2024-vol1`.

## 2026-05-08 - Task 4 draft generators
- `scripts/textbook/generate-drafts.mjs` reads `source-inventory.json` and deterministically writes per-surface candidate arrays plus a schema-covered `draft-inventory.json`; it does not write runtime data or timestamps.
- Candidate IDs are derived from the source `sectionId` and surface prefix, and every candidate defaults to `reviewStatus: needsReview` and `runtimeEligible: false` with copied provenance.
- Experiment candidates are intentionally conservative: only source headings labeled with `实验` become experiment drafts, with `animationStatus: deferred`, safety/material/observation scaffolds, and a deferred runtime reason.

## 2026-05-08 - Task 5 reviewed promotion manifest
- Reviewed promotion manifests live under `src/data/textbookIngestion/reviewed/<volumeId>/promotion-manifest.json`, separate from generated drafts and runtime exports.
- The pilot topic uses `topicId` and `curriculumTagId` `g9-carbon-allotropes-comparison`, mapped to generated carbon allotrope section candidates such as `quiz-0295-source-section-l3610-l3664-d45787521d`.
- `scripts/textbook/validate-promotion-manifest.mjs` is the reviewed gate: it requires topic scope plus `curriculumTagId`, reviewer metadata, explicit `src/data/` target files, and generated candidate references before later promotion adapters can run.

## 2026-05-08 - Task 6 runtime boundary validator
- `scripts/textbook/validate-runtime-boundary.mjs` scans `src/main.js`, `src/data/index.js`, and every `src/modules/**/*.js` file for forbidden textbook source or generated ingestion paths, while allowing `scripts/textbook/**` fixture checks to exercise the same detection logic.
- Runtime reactions are checked directly from `src/data/reactions.json`; any `experimentId` starting with `draft-` or matching a generated experiment candidate ID fails unless a reviewed/promoted `experimentCandidate` entry in `src/data/textbookIngestion/reviewed/**/promotion-manifest.json` explicitly targets `src/data/reactions.json`.
- Generated experiment IDs are taken from `src/data/textbookIngestion/generated/**/experiment-candidates.json` and `draft-inventory.json` so the validator catches real draft IDs like `experiment-0006-...`, not just `draft-*` placeholders.
- The validator exposes two deterministic fixtures: `raw-textbook-import` and `deferred-reaction-leak`, which produce the required failure modes without editing runtime data.

## 2026-05-08 - Task 7 coverage matrix
- `scripts/textbook/generate-coverage.mjs` groups reviewed promotion manifest entries by `curriculumTagId` and writes deterministic `coverage-matrix.json` rows with the required coverage columns and status vocabulary.
- Reviewed-topic coverage treats generated candidates with matching source line/hash evidence as surface coverage, while runtime promotion and experiment backlog remain explicit `deferred` statuses until later tasks.
- `scripts/textbook/validate-coverage.mjs` only fails reviewed rows when a `required` cell is `missing`; `deferred` and `notApplicable` are accepted as intentional states.

## 2026-05-08 - Task 8 runtime promotion adapters
- `scripts/textbook/promote-topic.mjs` promotes only reviewed manifest entries for an explicit `--topic`/`curriculumTagId`; generated-only topics exit non-zero with `Promotion blocked`.
- The pilot adapter maps the reviewed carbon-allotropes quiz/game/achievement candidates into `src/data/quizData.json`, `src/data/contentMeta.js`, and `src/data/achievementsData.json` while keeping `sourceVolumeId`, reviewer metadata, source line/hash references, and candidate IDs on promoted records.
- Runtime promotion intentionally does not write `src/data/reactions.json`; deferred experiment candidates remain outside runtime reactions and the runtime boundary validator confirms no draft experiment leakage.

## 2026-05-08 - Task 9 experiment backlog
- `experiment-backlog.json` is a generated, non-runtime artifact under `src/data/textbookIngestion/generated/<volumeId>/`; it mirrors every real `experiment-*` candidate ID, keeps `animationStatus: deferred`, and records `runtimeEligible: false` until a reviewed manifest explicitly promotes an experiment.
- `scripts/textbook/validate-experiment-backlog.mjs` reconstructs the deterministic backlog from `experiment-candidates.json`, requires provenance/safety/material/observation/learning-goal fields, and checks `src/data/reactions.json` so deferred backlog IDs cannot leak into runtime reactions.
- The negative fixture `deferred-in-reactions` intentionally places `experiment-0006-1-1-l27-l50-e9eba2d49e` in reactions and must fail with `Deferred experiment cannot be runtime reaction`.

## 2026-05-08 - Task 10 workflow gates
- `scripts/textbook/validate-workflow.mjs` now runs the workflow steps directly with `process.execPath` instead of shelling through `npm`, which avoided Windows `spawnSync npm.cmd EINVAL` failures during validation.
- The one-command workflow gate prints each stage in order: extraction, draft generation, batch validation, draft schema validation, experiment backlog validation, runtime boundary validation, coverage generation, and coverage validation.
- `validate:all:safe` is intentionally left separate from the generated-draft workflow gate; it still depends on the stable runtime/safe checks rather than warning-tolerant textbook generation outputs.
- Reviewed comparison-topic promotion now emits canonical comparison/C60 source ranges (`3432-3462` and `3494-3504`) while keeping `sourceVolumeId: rj-chemistry-grade9-2024-vol1` on the runtime records.
- Supporting-data and curriculum validators now accept the reviewed-textbook provenance shape used by the promoted quiz/game/achievement records without relaxing unrelated checks.

## 2026-05-08 - Task 11 pilot topic run
- The first-volume pilot topic remains scoped to g9-carbon-allotropes-comparison; extraction produced 419 sections/142 assets and draft generation produced 1276 draft records before promotion.
- scripts/textbook/promote-topic.mjs now treats eviewStatus: promoted as idempotently promotable and writes promoted status back to the reviewed manifest after successful runtime writes, allowing coverage untimeStatus to become covered after promotion.
- Post-promotion coverage for the pilot shows required surfaces covered, experiment backlog deferred, and 55 deferred experiment backlog IDs with no leakage into src/data/reactions.json.

## 2026-05-08 - Task 11 notepad correction
- Correction for escaped inline code above: `scripts/textbook/promote-topic.mjs` treats `reviewStatus: promoted` as idempotently promotable and writes promoted status back to the reviewed manifest after successful runtime writes, allowing coverage `runtimeStatus` to become `covered` after promotion.


## 2026-05-08 - Task 12 workflow documentation and regeneration guard
- Workflow summary lives in .sisyphus/evidence/task-12-workflow-summary.txt and lists all 10 operator steps from choosing a textbook through commit.
- Regeneration guard rules live in .sisyphus/evidence/task-12-regeneration-guard.txt and explicitly state that reviewed manifest and runtime data are source of truth and must not be overwritten by generators.
- scripts/textbook/validate-regeneration-guard.mjs statically analyzes generator scripts to prove they do not write to eviewed/ directories or runtime data files; it exits 0 with message Reviewed manifest protected from generator overwrite.
- Rollback policy states: revert the promotion commit via git, or use a future demotion script if implemented; no demotion script currently exists.
- Generated drafts remain untimeEligible: false and eviewStatus: needsReview by default; only the human-reviewed promotion manifest can change this.
- Deferred experiments (55 backlog items for vol1) stay out of src/data/reactions.json per runtime boundary validator.


## 2026-05-08 - Final Verification Wave coverage correction
- Required runtime surface coverage must be reviewed-manifest-backed; generated candidates may appear as evidence details but cannot alone set `status: covered`.
- Pilot learning path/progress has a current runtime location in `src/data/learningPath.json`, so `g9-carbon-allotropes-comparison` is promoted through `relation-carbon-allotropes-comparison` and the learning path candidate is now represented in the manifest.
- Current story runtime is element-level (`elements` plus `storyMediaByAtomicNumber` in `src/modules/storyMode.js`), not topic-story based; topic story coverage should be `notApplicable` with rationale unless a real runtime story data location is added later.
