# Learnings

## 2026-05-16 Task: start-work
- Plan path: `.sisyphus/plans/experiment-dedup-safety.md`.
- Runtime data boundary is `src/data/index.js` importing `src/data/labExperiments.json`; do not dedupe in UI.
- Main implementation target is `scripts/textbook/build-lab-experiments.mjs`.
- Validation target is `scripts/validate-lab-experiments.mjs`.
- User chose script-first verification and deterministic loose similar merging.

## 2026-05-16 Task 1: builder candidate staging
- `buildLabExperimentPlan()` now stages explicit, source-section-unique runtime candidates before applying title/content duplicate suppression, so future loose dedupe can operate after accepted candidate construction.
- `seenSections` remains in the source-group loop before candidate staging; `seenContent` runs in the later candidate pass and preserves the existing `duplicate title/content` rejection counter/reason.
- Evidence output now carries `builder: "scripts/textbook/build-lab-experiments.mjs"`; Task 1 check and `npm run validate:lab-experiments` both pass with 104 accepted textbook experiments and 107 runtime records.

## 2026-05-16 Task 2: deterministic content fingerprint and loose merge
- `scripts/textbook/build-lab-experiments.mjs` now fingerprints staged runtime candidates from canonical `textbookContent`, ordered `steps`, sorted unique `materials`, and sorted unique `observedPhenomena`; the old title/content key is no longer the merge criterion.
- The merge pass performs exact fingerprint grouping first, then deterministic loose scoring with the planned weights (`0.35/0.30/0.20/0.15`) and hard blockers for core substances, gas identity, apparatus/procedure family, and contradictory phenomena.
- Builder self-checks were added as `--self-check duplicate-content-merge` and `--self-check duplicate-content-conflict`; both write evidence under `.sisyphus/evidence/` and exercise source-reference union plus blocked gas-identity conflict behavior without touching runtime data.
- Required Task 2 builder check passed with `exactContentMerges=2`, `looseContentMerges=14`, `blockedContentMergeCandidates=1`, `acceptedExperiments=89`, and `runtimeRecordCount=92` in check mode; `npm run validate:lab-experiments` and `npm run build` also passed.

## 2026-05-16 Task 3: post-merge safety risk summaries
- `scripts/textbook/build-lab-experiments.mjs` now carries extracted `sourceSafetyNotes` through candidate merge as risk signals only, then generates final normalized `safetyNotes` in `finalizeMergedCandidate()` from merged textbook content, steps, materials, observed phenomena, source safety signals, and final `safetyLevel`.
- Deterministic self-checks `--self-check safety-risk-summary` and `--self-check safety-note-quality` write Task 3 evidence under `.sisyphus/evidence/` and cover heating/alcohol lamp, gas collection/water displacement, corrosive acid/base, toxic or irritating gas, flammable gas, and conservative fallback behavior.
- Task 3 builder check passed in `--check` mode with inherited Task 2 counters unchanged (`acceptedExperiments=89`, `rejectedDuplicates=16`, `exactContentMerges=2`, `looseContentMerges=14`, `blockedContentMergeCandidates=1`, `runtimeRecordCount=92`); `npm run validate:lab-experiments` also passed.

## 2026-05-17 Task 4: merged output and audit evidence
- `scripts/textbook/build-lab-experiments.mjs` now keeps the first accepted candidate as display identity while merging stable provenance/tag/material/phenomena unions, preserving primary step order, applying max `safetyLevel`, and recomputing unlock requirements from the final safety level while preserving the primary grade.
- Evidence now exposes `dedupeAudit`/`mergeReport` with kept and merged candidate sources, merge type, scores/reasons, hard-conflict status, source-reference counts before/after, merged output source refs, and safety risk categories; runtime records remain built only by `buildTextbookRuntimeRecord()` and exclude audit-only merge fields.
- Added `--self-check source-reference-union`, writing `.sisyphus/evidence/task-4-source-reference-union.json`, to assert source-reference union, max safety upgrade, primary step preservation, and audit-field exclusion without writing `src/data/labExperiments.json`.

## 2026-05-17 Task 5: validator duplicate and safety contract
- Extended scripts/validate-lab-experiments.mjs with validation-only canonical fingerprints matching the builder fields: canonical 	extbookContent, ordered canonical steps, sorted unique materials, and sorted unique observedPhenomena.
- Added validator self-checks for duplicate-content-merge, duplicate-content-conflict, source-reference-union, safety-risk-summary, and safety-note-quality; each uses maybeWriteReport() when --report is supplied and returns status: fail on regression.
- Runtime validation now rejects duplicate canonical content clusters, forbidden fallback safety phrases (未提取到安全提示, 教材未提取到明确安全提示, No explicit safety note was extracted), empty/non-Chinese safety notes, step-copy safety notes, invalid source references, and duplicate source references while preserving existing schema/source/unlock/display checks.
- Commands run: all five Task 5 self-check report commands passed; lsp_diagnostics scripts/validate-lab-experiments.mjs reported no diagnostics; phrase verification via Node reported all three forbidden phrases present. 
pm run validate:lab-experiments currently fails on generated runtime data because the stricter validator found 1 duplicate canonical content cluster and 99 invalid safety notes in src/data/labExperiments.json, which Task 5 forbids editing/regenerating.
`nCorrection for Task 5 note above: the canonical fields are textbookContent, steps, materials, and observedPhenomena; the failing runtime command is npm run validate:lab-experiments.

## 2026-05-17 Task 5 follow-up: runtime refresh for strict validator
- Reproduced Atlas failure: npm run validate:lab-experiments failed on the stale 107-record src/data/labExperiments.json with duplicateContentClusters=1 and invalidSafetyNotes=99.
- Confirmed this was stale generated data, not a validator false positive: node scripts/textbook/build-lab-experiments.mjs --check --evidence .sisyphus/evidence/task-5-builder-check-before-write.json passed with runtimeRecordCount=92, exactContentMerges=2, looseContentMerges=14, and curatedLegacyPreserved=3.
- Used the existing builder, not manual JSON edits, to refresh runtime data: node scripts/textbook/build-lab-experiments.mjs --write --evidence .sisyphus/evidence/task-5-builder-write-runtime-refresh.json.
- After refresh, all five Task 5 self-check report commands passed and npm run validate:lab-experiments passed with totalRecords=92, duplicateContentClusters=0, invalidSafetyNotes=0, invalidSourceReferences=0, and duplicateSourceReferences=0.

## 2026-05-17 Task 6: runtime lab data regeneration verification
- Regenerated runtime lab data with `node scripts/textbook/build-lab-experiments.mjs --write --evidence .sisyphus/evidence/task-6-build-lab-dedup-write.json`; builder passed with runtimeRecordCount=92, exactContentMerges=2, looseContentMerges=14, blockedContentMergeCandidates=1, and curatedLegacyPreserved=3.
- Required script-first verification passed in order: `npm run validate:lab-experiments` (totalRecords=92, duplicateContentClusters=0, invalidSafetyNotes=0, invalidSourceReferences=0, duplicateSourceReferences=0), `npm run validate:lab-boundary` (checks=2, failures=0), and `npm run build` (Vite build succeeded with existing large chunk warning).
- Captured forbidden fallback safety evidence at `.sisyphus/evidence/task-6-forbidden-safety-search.txt`; all forbidden phrases (`未提取到安全提示`, `教材未提取到明确安全提示`, `No explicit safety note was extracted`) had 0 matches.
- Runtime/evidence inspection confirmed 92 records, 135 Chinese safety notes, no records missing sourceReferences, and no sourceReferenceCount loss across exact or loose content merges; risk categories include heating/flame, gas collection, corrosive acid/base, toxic/irritating gas, flammable gas, general lab safety, and high safety level.
- LSP diagnostics reported no errors for `src/data/labExperiments.json`, `scripts/textbook/build-lab-experiments.mjs`, and `scripts/validate-lab-experiments.mjs`.
