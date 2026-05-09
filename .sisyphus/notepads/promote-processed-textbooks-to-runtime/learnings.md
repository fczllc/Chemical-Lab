# Learnings: promote-processed-textbooks-to-runtime

- Runtime promotions now have a single ingestion-side source of truth in `src/data/textbookIngestion/runtimeTargetMap.js`; the supported destinations are `quizData.json`, `contentMeta.js`, `achievementsData.json`, `learningPath.json`, and `reactions.json`.
- Textbook-derived IDs should use the namespace pattern `textbook-{textbookId}-{topicId}-{entryId}` so hand-authored runtime records stay untouched by default.
- Deterministic promotion order should sort by `targetRuntimeFile`, `textbookId`, `topicId`, `entryId`, then `candidateId`.
- Runtime/business modules should continue importing through `src/data/index.js` only, with `contentMeta.js` remaining the only direct runtime metadata edit surface for comparison/game metadata.

## Task 1 Inventory Report - 2026-05-09
- Added scripts/textbook/inventory-processed-volumes.mjs to inventory generated, reviewed, and batch textbook artifacts with deterministic JSON plus a readable summary.
- Current processed-volume readiness: 1 promotable volume (j-chemistry-grade9-2024-vol1) and 3 review-scaffold-only volumes (j-chemistry-g12-selective-3-organic-2019, j-chemistry-grade8-54-2024-full, j-chemistry-grade9-2024-vol2).
- Empty reviewed manifests are explicitly counted as eview-scaffold-only with zero promotable entries; evidence saved in .sisyphus/evidence/task-1-empty-reviewed-not-promotable.txt.


## 2026-05-09 - Task 2 reviewed manifest validation
- alidate-promotion-manifest.mjs --all-reviewed now treats ntries: [] as a valid empty scaffold and reports it separately from non-empty reviewed manifests.
- Reviewed entries use surface/contentType plus candidateType and 	argetRuntimeFiles to verify adapter compatibility for quiz, content metadata, achievements, learning path, and reactions.
- Source traceability is checked against the referenced generated candidate so reviewed entries cannot drift from source path, heading, lines, volume, or source hash.

## 2026-05-09 - Task 2 reviewed manifest validation (corrected)
- `validate-promotion-manifest.mjs --all-reviewed` now treats `entries: []` as a valid empty scaffold and reports it separately from non-empty reviewed manifests.
- Reviewed entries use `surface`/`contentType` plus `candidateType` and `targetRuntimeFiles` to verify adapter compatibility for quiz, content metadata, achievements, learning path, and reactions.
- Source traceability is checked against the referenced generated candidate so reviewed entries cannot drift from source path, heading, lines, volume, or source hash.

## 2026-05-09 - Task 4 reviewed candidate generation
- Added scripts/textbook/generate-reviewed-candidates.mjs as a dry-run-by-default workflow; --write is required before reviewed manifests are mutated.
- Mechanically traceable supported candidates now populate reviewed manifests with source provenance, topic scope, target runtime files, reviewer metadata, and namespaced runtime IDs while preserving existing entries.
- Task 4 evidence is in .sisyphus/evidence/task-4-reviewed-candidates.txt, and blocked unsupported artifacts are enumerated in .sisyphus/evidence/task-4-blocked-artifacts.json.


## 2026-05-09 - Task 5 promotion adapters
- `promote-topic.mjs` now supports `--all-reviewed` and `--dry-run` while preserving the existing `--textbook`/`--topic` path for focused promotion.
- Generic adapters stage all five approved runtime destinations: `quizData.json`, `contentMeta.js`, `achievementsData.json`, `learningPath.json`, and `reactions.json`.
- Dry-run planning reports existing record counts, preserved hand-authored records, textbook namespace counts, destination coverage, and unsupported generated artifact counts without writing runtime files.

## 2026-05-09 - Task 6 promotion safety
- `promote-topic.mjs` now runs reviewed-manifest validation before staging promotion writes, so write mode cannot bypass `validate-promotion-manifest.mjs` semantics.
- Staged promotion outputs are validated before any runtime file write; runtime records must have stable unique ids, textbook ids cannot duplicate across targets, and manifest rewrites must parse with an `entries` array.
- `--json` emits a `PROMOTION_REPORT_JSON` line with promoted/skipped/blocked counts by textbook and runtime destination, while preserving the existing human-readable dry-run output.
- `--simulate-write-failure` fails after staging/output validation and before file writes, providing a deterministic rollback-safety proof path without mutating runtime targets.

## 2026-05-09 - Task 7 runtime integrity validation
- `validate:textbook-runtime-boundary` now runs both source-boundary checks and `validate-runtime-integrity.mjs`, so generated/reviewed ingestion imports are blocked before build while runtime IDs and references are checked semantically.
- Runtime integrity coverage includes duplicate IDs, non-ASCII/normalization-safe IDs, quiz answer indexes, element/curriculum/game/stage/experiment references, learning-path and curriculum acyclicity, achievement conditions, content metadata unlock references, and bundle-size warnings.
- `validate:textbook-workflow -- --all-reviewed` is a non-mutating all-reviewed gate that validates reviewed manifests, runtime boundary checks, and runtime integrity without running extraction or promotion writes.

## 2026-05-09 - Task 8 runtime promotion execution
- Task 8 promotion evidence is saved in `.sisyphus/evidence/task-8-promotion-runtime.txt`; dry-run, write promotion, deterministic re-run hash proof, workflow validation, runtime-boundary validation, aggregate safe validation, and build all exited 0.
- Runtime discoverability evidence is saved in `.sisyphus/evidence/task-8-runtime-discoverability.txt`; all four reviewed textbook IDs are reachable through runtime data surfaces imported from `src/data/index.js` plus `TEXTBOOK_CHALLENGE_METADATA` from `src/data/contentMeta.js`.
- Actual promotion reports 3498 selected reviewed entries across the five approved runtime destinations: 1189 achievements, 424 content metadata records, 1189 learning-path stages, 512 quizzes, and 184 reactions.
