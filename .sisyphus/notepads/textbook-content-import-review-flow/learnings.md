# Learnings

## 2026-05-07 Task: session-start
- Work session started for `.sisyphus/plans/textbook-content-import-review-flow.md` in current workspace.
- Pilot scope is exactly C60 / 碳单质 with strict reviewed-source runtime gate.

## 2026-05-07 Task: reviewed-source contract
- Runtime-visible textbook-derived records now use `sourceReviewStatus: reviewed` plus `sourceReferences[]` for volume/path/line/asset/text-field provenance.
- `validate-supporting-data.mjs` is the validator-local contract gate for runtime records; `validate:textbook-assets` remains focused on Markdown/manifest asset integrity.
- The C60 pilot proof record is `quiz-c60-reviewed-formula` with `pep-chemistry-g9-2024`, `book.md:3494-3504`, and reviewed asset `pep-g9-2024-up-figure-6-4-c60-formula`.

## 2026-05-07 Task: c60 pilot inventory
- The exact pilot inventory lives in `src/data/textbookPilotContent.js` and contains 5 IDs only.
- The draft-only experiment record is `draft-exp-c60-model-observation`, and it is intentionally absent from runtime `reactions`.
- `npm run validate:textbook-assets` stayed green after adding the inventory file.

## 2026-05-08 Task: import C60 runtime content into quiz, progress, and game metadata
- Runtime C60 quiz records already existed in both `quizData.json` and `quizData.js` with exactly the 3 required IDs: `quiz-c60-structure-source`, `quiz-c60-carbon-allotrope`, `quiz-c60-reviewed-formula-application`.
- Learning path already had the C60 relation on `stage-3` with `curriculumTags` including `g9-carbon-c60-allotrope` and reviewed source references.
- `contentMeta.js` already had the C60 challenge metadata under `GAME_META.collector` with `challengeId: challenge-c60-carbon-topic`.
- The validator `validate-supporting-data.mjs` already enforced exact counts and contracts; no edits were needed.
- `npm run validate:supporting` and `npm run build` both passed cleanly.
- Evidence files written to `.sisyphus/evidence/task-3-c60-supporting.txt` and `.sisyphus/evidence/task-3-c60-runtime-qa.txt`.

## 2026-05-08 Task: draft-only C60 experiment boundary
- `draft-exp-c60-model-observation` already exists in `src/data/textbookPilotContent.js` with `runtimeStatus: draft-only` and reviewed source metadata.
- `validate-supporting-data.mjs` already blocks any C60 runtime leakage by checking the runtime quiz scope and the single progress/challenge surface.
- Runtime `reactions` export stayed clean without any draft experiment ID, so no data change was required for this task.
- `npm run validate:supporting` and `npx playwright test tests/ui/route-shells.spec.ts` both passed.

## 2026-05-08 Task: C60 reviewed-reference negative checks
- `validate-supporting-data.mjs` self-check fixtures can mutate existing runtime C60 quiz records to exercise reviewed-source failures without changing production runtime counts.
- `missing-reviewed-source-reference` proves a `sourceReviewStatus: reviewed` runtime record without non-empty `sourceReferences` is rejected.
- `unreviewed-runtime-source-reference` proves a runtime source reference to `pep-g9-2024-up-figure-1-1-water-boiling` is rejected because that asset is still `unreviewed`.

## 2026-05-08 Task: aggregate pilot verification
- Task 6 aggregate verification passed with the verified C60 pilot unchanged: `validate:all:safe`, `validate:chem-notation`, `node scripts/audit-business-data-imports.mjs`, `npm run build`, and `npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts` all exited 0.
- Evidence files written: `.sisyphus/evidence/task-6-validate-all-safe.txt`, `.sisyphus/evidence/task-6-validate-chem-notation.txt`, `.sisyphus/evidence/task-6-import-audit.txt`, `.sisyphus/evidence/task-6-build.txt`, and `.sisyphus/evidence/task-6-content-route-smoke.txt`.
- No runtime content changes were needed beyond the already verified C60 pilot; `validate:data` remains intentionally outside the acceptance gate because the safe aggregate gate avoids the known story-media shard mismatch.
