## Task 1: Register pep-* volumes in textbook pipeline registries
**Timestamp:** 2026-05-28

### Findings
- All four `pep-*` IDs were already present in all four pipeline scripts:
  - `scripts/textbook/extract-textbook.mjs` — `knownTextbookBatches` Map with `batchPath`
  - `scripts/textbook/generate-drafts.mjs` — `knownTextbookBatches` Set
  - `scripts/textbook/promote-topic.mjs` — `knownTextbookBatches` Map with `buildTextbookPaths()`
  - `scripts/textbook/validate-promotion-manifest.mjs` — `knownTextbookBatches` Map with `buildTextbookPaths()`
- All existing `rj-*` entries and `fixture-missing-book` remain intact.
- Curriculum order preserved: required-1, required-2, selective-1, selective-2.

### Verification Results
- Registry presence check: `registry-ok` — all 8 IDs present in all 4 files.
- Help outputs confirmed for all 4 scripts with expected titles.
- CLI boundary (pep ID): fails on `Batch sourceHash does not match source book` (batch JSON exists but hash mismatch), NOT `Unknown textbook batch`. This confirms registry recognition.
- CLI boundary (invalid ID): correctly fails with `Unknown textbook batch: does-not-exist`.
- CLI boundary (existing rj ID): succeeds without `Unknown textbook batch` error.
- generate-drafts, promote-topic --dry-run, and validate-promotion-manifest all succeed with pep ID.

### Evidence Files
- `.sisyphus/evidence/task-1-registry-cli.txt`
- `.sisyphus/evidence/task-1-registry-rj-regression.txt`

### No Code Changes Required
The registries were already correctly configured. This task was verification-only.
