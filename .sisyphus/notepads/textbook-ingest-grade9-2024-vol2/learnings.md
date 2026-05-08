# Learnings: textbook-ingest-grade9-2024-vol2

## Task 1 exploration - 2026-05-08
- `rg` is not available in this environment; required searches were completed with the platform grep/search tools instead.
- Current batch contract file is `src/data/textbookIngestion/batches/rj-chemistry-grade9-2024-vol1.json:1-18`; required keys are also enforced in `scripts/textbook/validate-batch-contract.mjs:122-155`.
- Known textbook batch registries to update for vol2: `scripts/textbook/validate-batch-contract.mjs:12-17`, `scripts/textbook/extract-textbook.mjs:11-30`, `scripts/textbook/generate-drafts.mjs:10`, `scripts/textbook/validate-draft-schema.mjs:10-19`, `scripts/textbook/validate-experiment-backlog.mjs:9-20`, `scripts/textbook/generate-coverage.mjs:41-50`, `scripts/textbook/validate-coverage.mjs:29-36`, `scripts/textbook/validate-promotion-manifest.mjs:10-19`, `scripts/textbook/promote-topic.mjs:9-17`, and `scripts/textbook/validate-regeneration-guard.mjs:9` if Task 4 uses the regeneration guard.
- `scripts/textbook/validate-workflow.mjs:26-35` runs the per-volume ingestion gates by forwarding `--textbook`; its script-path registry is `scripts/textbook/validate-workflow.mjs:88-98` and needs no volume-specific entry.
- `package.json:15-23` exposes the relevant npm script commands; `package.json:28` exposes coverage validation.
- Runtime boundary check: `src/data/index.js:1-39` imports runtime datasets and does not import `src/data/textbookIngestion/**`; grep for `textbookIngestion` under `src` JS found no runtime imports.
- `scripts/validate-supporting-data.mjs:137` contains `stableIngestionVolumeId = 'rj-chemistry-grade9-2024-vol1'`, but it validates already-promoted runtime provenance and is not a batch registry for this excluded runtime-promotion task.

## 2026-05-08 - Vol1 ingestion artifact patterns
- Vol1 generated artifact root is `src/data/textbookIngestion/generated/rj-chemistry-grade9-2024-vol1/` with source inventory, draft inventory, per-surface candidate arrays, experiment backlog, coverage matrix, and generated promotion manifest scaffold.
- Reviewed promotion manifest root is separate: `src/data/textbookIngestion/reviewed/rj-chemistry-grade9-2024-vol1/promotion-manifest.json`; generator scripts must not write reviewed/ or runtime files.
- Generated/raw ingestion artifacts and `src/data/textbooks/**` must stay non-runtime; runtime boundary validator blocks runtime imports/path mentions of raw textbook and generated ingestion paths, and blocks deferred generated experiment ids in `src/data/reactions.json` unless reviewed/promoted.
- Existing validators and workflow scripts are vol1-hard-coded today; vol2 support must extend known batch maps/sets and paths before validation can target `rj-chemistry-grade9-2024-vol2`.

## Task 1 implementation - 2026-05-08
- Registered `rj-chemistry-grade9-2024-vol2` with source `src/data/textbooks/2024版人教版九年级化学下册/book.md` and source hash `sha256:9541f13a4ecc3d1de8af9e8360777badc9519f8abe7f61a401aa2e32561ee2d5`.
- `validate-batch-contract.mjs` now stores expected source/asset paths in the known batch registry so vol1 and vol2 can validate without a vol1-only hard-coded path check.
- Script registries now recognize vol2 across extraction, draft validation/generation, experiment backlog validation, coverage generation/validation, reviewed manifest validation, promotion gating, and regeneration guard; no generated or reviewed vol2 artifacts were created in this task.
- Required evidence files are `.sisyphus/evidence/grade9-2024-vol2-task-1-batch.txt` and `.sisyphus/evidence/grade9-2024-vol2-task-1-batch-error.txt`.

## Task 2 extraction - 2026-05-09
- `npm run textbook:extract -- --textbook rj-chemistry-grade9-2024-vol2` succeeded and wrote `src/data/textbookIngestion/generated/rj-chemistry-grade9-2024-vol2/source-inventory.json`.
- The generated inventory preserved provenance fields and matched the batch source hash: `volumeId=rj-chemistry-grade9-2024-vol2`, `sourceHash=sha256:9541f13a4ecc3d1de8af9e8360777badc9519f8abe7f61a401aa2e32561ee2d5`.
- The inventory uses `sourceSections`; it contained 283 sections and non-empty section text/asset data, including local textbook asset references where present.
- The unknown-volume negative check failed gracefully with `Unknown textbook batch: missing-volume` and did not create runtime files.

## Task 2 bug fix - 2026-05-09
- `buildProjectRelativeAssetPath` now derives local asset paths from the batch `assetRoot`, so vol2 inventory assets resolve under `src/data/textbooks/2024版人教版九年级化学下册/` instead of the vol1 directory.
- The same extractor still works for vol1 and continues to return `null` for non-local textbook assets.

## Task 3 draft generation - 2026-05-09
- `npm run textbook:generate-drafts -- --textbook rj-chemistry-grade9-2024-vol2` generated 222 knowledge topics, 109 quiz candidates, 42 experiment candidates, 122 lab candidates, 100 game candidates, 87 story candidates, 222 achievement candidates, 222 learning path candidates, and `draft-inventory.json` with 904 generated candidates.
- The generated-side `promotion-manifest.json` scaffold mirrors the existing vol1 shape with empty `entries`; no reviewed manifest under `src/data/textbookIngestion/reviewed/` was created.
- `npm run validate:textbook-experiments -- --textbook rj-chemistry-grade9-2024-vol2 --write` generated `experiment-backlog.json`; the no-write experiment validator then passed against candidates, backlog, and `src/data/reactions.json`.
- Runtime assertions found all generated candidates/backlog items remain `reviewStatus: needsReview` with `runtimeEligible !== true`, provenance preserved for `sourceVolumeId`, `sourcePath`, `sourceHash`, and section line fields, and zero collisions between 42 deferred experiment IDs and runtime reactions.
- Evidence files for this task use the `grade9-2024-vol2-task-3-` prefix, including generation, draft validation, experiment backlog write/validation, runtime assertions, and build output.

## Task 4 reviewed manifest scaffold - 2026-05-09
- Created separate reviewed manifest scaffold at `src/data/textbookIngestion/reviewed/rj-chemistry-grade9-2024-vol2/promotion-manifest.json` with schemaVersion 1, the fixed vol2 source hash, generatedAt `2026-05-09T00:00:00.000Z`, and empty `entries`.
- Full workflow, runtime boundary, regeneration guard, safe validation, and build gates passed with `grade9-2024-vol2-task-4-` evidence files under `.sisyphus/evidence/`.
- Blocked promotion QA for `unreviewed-generated-topic` exited non-zero with `Promotion blocked`, confirming the empty reviewed scaffold does not promote runtime data.
- Runtime no-promotion evidence confirms the reviewed manifest path is separate from the generated manifest path and the vol2 id/hash/topic are absent from runtime boundary files.
