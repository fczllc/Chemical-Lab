
## Task 2 issues

- Extra integrity probe initially found duplicate runtime IDs when multiple textbook sections semantically matched the same legacy curated experiment; fixed by preserving a legacy ID only for the first deterministic match and generating unique lab-experiment-* IDs for later matches.
- npm run build passes but Vite still reports the existing large chunk warning for assets/index-*.js; this task did not modify bundling or UI scope.

## Task 2 retry issues

- Initial retry scrubber only removed numeric/empty labels such as 【实验1-1】 and missed semantic labels such as 【实验步骤】, 【实验与记录】, plus malformed labels missing the closing bracket; widened the shared pattern to remove any visible 【实验...】 prefix before display generation.
- Stricter cleaning rejected 4 previously accepted records whose remaining display content was not meaningful after label removal; final accepted textbook count is 104 instead of the prior 108.
- npm run build still passes with the existing Vite large chunk warning; no bundling changes were made for this task.

## Task 3 issues

- Default npm run validate:lab-boundary currently fails as expected until Tasks 5/6 update src/modules/lab.js and src/data/textbookIngestion/runtimeTargetMap.js. The validator reports both known boundary violations: lab.js still imports/uses reactions for lab cards, and runtimeTargetMap.js still maps experimentCandidate to src/data/reactions.json.

## Task 4 issues

- Direct grep calls for validator/progress symbols returned no matches despite targeted Read output showing the symbols; targeted reads were used instead to avoid spending more search budget.
- progress.js remains a known follow-up for Task 5 because it imports reactions for curriculum experiment progress and uses TOTAL_EXPERIMENTS = 5; it was intentionally not edited in Task 4.

## Task 6 issues

- Initial broad regex in scripts/validate-lab-data-boundary.mjs falsely treated unsupportedArtifactTypes.labCandidate as runtime-mapped because it crossed object boundaries; fixed by extracting only supportedDestinations object blocks.
- First manifest-validator attempt removed reaction adapter support for experimentCandidate and caused npm run validate:textbook-workflow -- --all-reviewed to fail on existing reviewed reaction entries; fixed by preserving experimentCandidate reaction/labOrReaction compatibility and removing only labCandidate from that adapter.
- npm run validate:textbook-workflow -- --all-reviewed passes with the existing runtime-integrity bundle-size warning for dist/assets/index-CF2dz5nR.js (8275 KiB); no bundling changes were made for this task.

Fixed generator to reject '实验现象的观察与描述' as a generic title.
