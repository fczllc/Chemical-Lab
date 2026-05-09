# Issues: promote-processed-textbooks-to-runtime

- The ingestion tree did not yet contain a runtime target map, so this task needed a new config file plus an inspector script before evidence could be produced.
- `storyCandidate`, `labCandidate`, `curriculumTopic`, `sourceSection`, and `reviewedSourceReference` currently classify as `not-promotable: unsupported target` or provenance-only, so they do not get runtime file writes.
- `package.json` declares `scripts/textbook/*` commands, but the repository snapshot did not contain a populated `scripts/textbook/` tree at the time of inspection, so the mapper had to be added before the workflow can execute end-to-end.

## Task 1 Inventory Report - 2026-05-09
- Environment issue: g was unavailable in the PowerShell path, so direct filesystem inspection used dedicated read/glob tools instead.
- Environment issue: JSON LSP diagnostics could not run because the configured iome server is not installed; JS diagnostics for the inventory script were clean and JSON was exercised via Node/npm commands.
- Build warning remains pre-existing/untouched: Vite reports a chunk larger than 500 kB after minification.


## 2026-05-09 - Task 2 reviewed manifest validation
- g is not installed on PATH in this environment, so file/content searches used the provided filesystem search tools instead.
- JSON LSP diagnostics could not run because the configured iome language server is not installed; JSON syntax was exercised through Node manifest parsing instead.

## 2026-05-09 - Task 2 reviewed manifest validation (corrected)
- `rg` is not installed on PATH in this environment, so file/content searches used the provided filesystem search tools instead.
- JSON LSP diagnostics could not run because the configured `biome` language server is not installed; JSON syntax was exercised through Node manifest parsing instead.

## 2026-05-09 - Task 4 reviewed candidate generation
- curriculumTopic, labCandidate, and storyCandidate generated artifacts remain blocked because untimeTargetMap.js does not allow them as promotion destinations in this workflow slice.
- JSON/YAML diagnostics remain unavailable in this environment due to missing language-server support; generated JSON was validated through Node parsing and the promotion-manifest validator instead.
- 
pm run build still emits the pre-existing Vite chunk-size warning for the main bundle, but exits 0.


## 2026-05-09 - Task 5 promotion adapters
- Runtime JSON/YAML diagnostics remain limited by environment language-server availability; `promote-topic.mjs` diagnostics were clean and JSON inputs were exercised through Node parsing, manifest validation, and dry-run promotion.
- `npm run build` exits 0 but still emits the pre-existing Vite chunk-size warning for the main bundle.

## 2026-05-09 - Task 6 promotion safety
- The machine-readable report is intentionally emitted as a single `PROMOTION_REPORT_JSON` line so Task 5 console output remains stable for existing dry-run readers.
- Full write-mode determinism was not executed in this task because that would promote runtime data and reviewed manifest statuses ahead of the planned end-to-end promotion task; dry-run and simulated failure evidence prove the non-mutating safety surfaces.

## 2026-05-09 - Task 7 runtime integrity validation
- JSON diagnostics still cannot run because the configured `biome` language server is not installed; JSON syntax and fixtures were exercised through Node validators instead.
- `npm run build` and the new runtime integrity validator both report the existing main bundle size warning (`dist/assets/index-*.js` over 500 kB), but the build exits 0.
- Existing runtime source references intentionally include `src/data/textbooks/...` provenance strings, so the boundary gate now targets forbidden `textbookIngestion/generated` and `textbookIngestion/reviewed` runtime imports/reads rather than source-provenance text.

## 2026-05-09 - Task 8 runtime promotion execution
- The preferred Task 8 delegated session timed out/aborted without file changes, so Atlas executed the command sequence directly to avoid another stall.
- Project-wide LSP diagnostics still trip over missing `yaml-language-server`; targeted diagnostics on `src/data/contentMeta.js` and `scripts/textbook/promote-topic.mjs` are clean.
- Build and runtime-integrity validation still report the known large Vite bundle warning, but exit 0.
