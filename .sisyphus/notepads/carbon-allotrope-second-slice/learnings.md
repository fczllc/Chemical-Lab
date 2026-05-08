# Learnings - carbon-allotrope-second-slice

## 2026-05-08 Task: initialization
- Source ranges selected by plan: `book.md:3432-3462` for 金刚石/石墨 and `book.md:3490-3504` / existing C60 asset source `3494-3504` for C60.
- Reserved IDs: `g9-carbon-c60-allotrope`, `stage-3`, `challenge-c60-carbon-topic`, `quiz-11`, `pep-g9-2024-up-figure-6-4-c60-formula`.
- Safe aggregate gate is `npm run validate:all:safe`; avoid `npm run validate:data` for this workflow.

## 2026-05-08 Task: validator topic config refactor
- Topic validation now works best when comparison fixtures live in the manifest inventory (`textbookPilotContent`) instead of runtime quiz data; that keeps C60 runtime checks clean while still exercising comparison-specific source and reserved-ID guards.
- C60 game-challenge matching must look at nested `GAME_META.collector.challengeMetadata.curriculumTags`/`challengeId`, not only top-level `GAME_META.collector.curriculumTags`.
- Draft-only leak detection is safest on the manifest side by checking inventory draft IDs against runtime `reactions`, rather than forcing draft records into runtime scope.

## 2026-05-08 Task: validator verification fix
- New comparison self-check modes must exit 1 explicitly; legacy self-check behavior can stay for older modes.
- Comparison challenge validation is safest as a hidden shadow metadata field on the existing collector game meta, so C60 challenge checks stay unchanged while comparison-specific exact counts still validate in self-checks and future data.
- Comparison inventory must include the quiz IDs in `textbookPilotContent` as well as `quizData`, otherwise the exact-count manifest gate never sees them.

## 2026-05-08 Task: final validator stabilization
- Keep legacy `unreviewed-formula-reference` on the original formula asset path only; comparison fixtures must never be reused there.
- Use one builder per data surface: quizzes in `buildQuizDataset`, progress in `buildLearningPathDataset`, challenge metadata in a hidden comparison shadow field, and draft-only leak checks via `reactions` only. That keeps self-checks isolated and prevents duplicate insertion.
- For now, comparison mode fallback errors are acceptable only as a guardrail when the intended fixture path is not yet surfaced; the normal validation path still stays clean and passes.
## 2026-05-08 Task: comparison fixture cleanup
- Reused-mode comparison self-check now keeps the canonical quiz-1 fixture alongside the reused `quiz-11` duplicate, so runtime exact-set validation stays focused on the duplicate-ID defect instead of a missing comparison quiz ID.

## 2026-05-08 Task: quiz comparison slice
- The comparison quiz slice can reuse the existing `intro-element-symbols` curriculum tag because `g9-carbon-allotropes-comparison` is not yet defined in `src/data/curriculum.js`.
- `node scripts/validate-supporting-data.mjs` still blocks until Tasks 4-5 add `relation-carbon-allotropes-comparison` and `challenge-carbon-allotropes-comparison`.
- `npx playwright test tests/shell/content-data-smoke.spec.ts` passed after the quiz data update.

## 2026-05-08 Task: reviewed source inventory
- The comparison source inventory lives in `src/data/textbookPilotContent.js` and can be validated as a single reviewed record with `lineRange: 3432-3462`.
- The active-carbon contamination check still rejects `3483` and `3463-3489`, so the comparison inventory stays isolated from the malformed source area.
- The same record can safely carry the existing reviewed C60 asset as a supplemental `3494-3504` reference without creating a duplicate asset ID.
- Use “碳单质比较” or “金刚石、石墨性质比较” in the note text; avoid calling diamond/graphite/C60 an isotope set.

## 2026-05-08 Task: comparison relation wiring
- `g9-carbon-allotropes-comparison` is still absent from `src/data/curriculum.js`, so the comparison relation and collector challenge keep `intro-element-symbols` to satisfy curriculum validation.
- The comparison collector challenge metadata survives `structuredClone` only when exposed through an inherited `__comparisonChallengeMetadata` getter; making it an own enumerable key breaks the game-meta schema check.

## 2026-05-08 Task: prototype removal follow-up
- Prototype mutation was removed; the comparison challenge now lives as an explicit `collector.comparisonChallengeMetadata` property and is validated directly.
- Re-running the supporting-data validator with UTF-8 console encoding produced readable evidence output in `.sisyphus/evidence/task-4-progress-game.txt`.

## 2026-05-08 Task: explicit comparison validation
- Both validators now schema-check `collector.comparisonChallengeMetadata` directly, while `challenge-c60-carbon-topic` remains unchanged.

## 2026-05-08 Task: draft experiment boundary
- Adding draft-exp-carbon-allotropes-observation activates the comparison inventory exact-set validator, so the supporting manifest also needs challenge-carbon-allotropes-comparison present in src/data/textbookPilotContent.js.
- The draft observation stays draft-only through untimeStatus: 'draft-only' and is verified absent from src/data/reactions.json, src/data/reactions.js, src/data/index.js, runtime eactions, and src/modules lab/UI files.
- Capture validator evidence with explicit UTF-8 console encoding; otherwise Chinese validator output may be written as mojibake in PowerShell evidence files.


## 2026-05-08 Task: aggregate validation evidence
- `npm run validate:all:safe`, `npm run validate:chem-notation`, `node scripts/audit-business-data-imports.mjs`, and `npm run build` all exited 0 with UTF-8 evidence captured in `.sisyphus/evidence/task-6-aggregate-validation.txt`.
- `npx playwright test tests/shell/content-data-smoke.spec.ts tests/ui/route-shells.spec.ts` ran through the configured Playwright setup and exited 0 with 9 passed specs; evidence is in `.sisyphus/evidence/task-6-playwright-smoke.txt`.
- The only validation caveat observed was the known Vite chunk-size warning during build; build still exited 0.

## 2026-05-08 Task: F2 missing reviewed source self-check fix
- Restored missing-reviewed-source-reference as a real legacy self-check fixture by mutating existing quiz-c60-structure-source to sourceReviewStatus: 'reviewed' with empty sourceReferences; the validator now rejects it while legacy self-check semantics still exit 0.

## 2026-05-08 Task: F2 aggregate validation refresh
- Refreshed `.sisyphus/evidence/task-6-aggregate-validation.txt` after the `missing-reviewed-source-reference` self-check fix; `validate:all:safe` now includes the restored `validate:supporting` pass and all aggregate gates exited 0.

## 2026-05-08 Task: F4 scope fidelity fix
- Defined g9-carbon-allotropes-comparison in curriculum and retagged comparison quiz/progress/challenge runtime records plus validator fixtures to use it, while preserving C60 IDs, stage-3, and prerequisites.
- Removed the out-of-scope games overview/challenge-summary rendering diff; route smoke now anchors to the pre-existing games overview stats instead of the rejected header.

## 2026-05-08 Task: slice trace inventory
- Exact comparison IDs are present in `src/data/curriculum.js`, `src/data/learningPath.js`, `src/data/contentMeta.js`, `src/data/textbookPilotContent.js`, and `src/data/quizData.js`.
- User-visible surfaces are generic: home compare preview/modal (`src/modules/homeModules.js`, `src/modules/compare.js`), progress dashboard (`src/modules/progress.js`), quiz modal (`src/modules/quiz.js`), and detail/story/lab entry from the periodic table (`src/modules/renderTable.js`, `src/modules/detailPanel.js`, `src/modules/storyMode.js`, `src/modules/lab.js`).
- No dedicated carbon-allotropes comparison route exists; the topic is surfaced as shared element/content data.
