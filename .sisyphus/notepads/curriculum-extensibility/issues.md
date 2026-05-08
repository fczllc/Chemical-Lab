# Issues

## 2026-05-07 Task: session-start
- Existing `npm run validate:data` may fail due the pre-existing story-media shard mismatch; plan requires safe validation scripts that avoid masking this blocker.
- Task dependency matrix has Task 14 blocked by Task 1 in the task body, but the top dependency matrix omitted Task 1 -> Task 14; treat Task 14 as blocked by Task 1.

## 2026-05-07 Task 2 retry: validator game metadata correction
- Atlas verification found the Task 2 validator used prefixed game IDs (`game-memory`, etc.) for curriculum game challenge rules, but the plan requires preserving game IDs as `drag`, `memory`, `reaction`, and `collector`.
- The `game-rule-difficulty-change` self-check must use a valid game ID and valid difficulty, then prove rejection through a forbidden per-difficulty core rule mutation such as `rulesByDifficulty`.

## 2026-05-07 Task 5: browser QA deferred
- Task 5 implementation and non-browser checks passed (`npm run build`, `npm run validate:supporting`, progress tag import, progress module import, LSP), but the required Playwright route QA is deferred because the user reported frequent frontend service restarts.
- Do not mark Task 5 complete until a batched browser QA run can verify `/#/progress` once without repeated Vite startup churn.

## 2026-05-07 Task 6: browser QA deferred
- Task 6 implementation and non-browser checks passed (`npm run validate:curriculum`, `npm run validate:supporting`, invalid experiment unlock self-check, `npm run build`, LSP), but the required Playwright lab route QA is deferred because the user reported frequent frontend service restarts.
- Do not mark Task 6 complete until a batched browser QA run can verify `/#/lab` once without repeated Vite startup churn.

## 2026-05-07 Task 5: browser QA deferred
- Browser progress route QA remains deferred for this task because the task explicitly forbids Playwright and Vite/server starts; command evidence covers build/import validation only.

## 2026-05-07 Task 6: browser QA deferred
- Browser lab route QA was explicitly deferred for this task because frontend service restarts are forbidden; command/static verification evidence is stored under `.sisyphus/evidence/task-6-*`.

## 2026-05-07 Task 7: browser QA deferred
- Browser games route QA was explicitly deferred for this task because Playwright and Vite/server starts are forbidden after the user's frontend service restart complaint; command/static verification evidence is stored under .sisyphus/evidence/task-7-*.

## 2026-05-07 Task 8: browser QA deferred
- Browser route QA remains deferred for this task because the prompt explicitly forbids Playwright and any Vite start/restart command; command evidence is limited to validation/build outputs.
- `src/modules/search.js` does not exist in the current source tree, so task 8 was satisfied through the available quiz/filter metadata hooks.

## 2026-05-07 Task 13: diagnostics note
- LSP diagnostics were clean for src/modules/chemNotation.js, scripts/validate-chem-notation.mjs, and tests/content/chem-notation.spec.ts; package.json diagnostics could not run because the configured biome language server binary is not installed in this environment.

## Task 10 — Observed Issues (2026-05-07)

- Story media JSON (src/data/storyMedia/media.json) has many empty source fields and no sourceOrigin / allbackReason / iDisclosureZh fields for most elements. The smoke test originally expected .story-media-disclosure to be present and non-empty only when xpectFallbackDisclosure: true; because most records lack disclosure metadata, the test would fail unless the renderer provides a fallback note for every card. We chose to add a universal fallback disclosure instead of changing the test, because the test represents the intended shell contract.

