
## 2026-05-09 Task 1
- G12 selective 3 batch uses the same sourceImported batch contract as existing grade 9 batches, with assetRoot equal to the book directory and sourceHash recomputed from the source book.
- Textbook workflow registration for a new batch is duplicated across knownTextbookBatches maps/sets in batch validation, extraction, draft generation, draft schema, experiment backlog, promotion manifest, coverage, promote-topic, and regeneration guard scripts.
- Positive batch validation command: npm run validate:textbook-batch -- --textbook rj-chemistry-g12-selective-3-organic-2019.
- Negative unknown-volume guard command: node scripts/textbook/validate-batch-contract.mjs --textbook missing-volume.

## 2026-05-09 Task 2
- The extractor emits `source-inventory.json` with `schemaVersion`, `volumeId`, `sourceHash`, `sourcePath`, `assetRoot`, `status: generated`, and a `sourceSections` array, and every section is marked `reviewStatus: needsReview`.
- The positive extraction command for `rj-chemistry-g12-selective-3-organic-2019` completed with 358 sections and 242 referenced assets.
- Rerunning the extractor produced the same SHA-256 hash for `source-inventory.json`, confirming deterministic output.
- The missing-book fixture cleanly failed with `Source book not found: src/data/textbookIngestion/fixtures/missing-book.md` and exit code 1.

## 2026-05-09 Task 3
- Draft generation for `rj-chemistry-g12-selective-3-organic-2019` produced 280 knowledge topics, 91 quiz candidates, 31 experiment candidates, 79 lab candidates, 85 game candidates, 58 story candidates, 280 achievement candidates, and 280 learning-path candidates.
- Draft validation requires a generated-side `promotion-manifest.json` scaffold; for this unpromoted task it remains identity-only with an empty `entries` array.
- Experiment backlog generation is performed through `npm run validate:textbook-experiments -- --textbook rj-chemistry-g12-selective-3-organic-2019 --write`; the follow-up validation without `--write` passed after the backlog was materialized.
- Invariant checks confirmed generated draft/backlog items use source hash `sha256:ca2e589320be9b996d54698ae24cf27875212d761d2eae979d4047c7995fa4c2`, remain `reviewStatus: needsReview`, and stay `runtimeEligible: false` where applicable.


## 2026-05-09 Task 4
- Empty reviewed promotion manifests follow the same top-level scaffold as generated manifests: schemaVersion, volumeId, sourceHash, generatedAt, and entries: [] so promotion remains gated until reviewed entries are added.
- Workflow validation for rj-chemistry-g12-selective-3-organic-2019 reruns extraction, draft generation, batch/draft/experiment/runtime/coverage gates, and produced a zero-row coverage matrix for the empty reviewed manifest.
- Promotion for unreviewed-generated-topic remains blocked by the reviewed manifest selector with `Promotion blocked: No reviewed manifest entries target curriculumTagId unreviewed-generated-topic`.
- Runtime no-leakage evidence should include canonical runtime file hashes and a deferred experiment ID scan against src/data/reactions.json.
