
- 2026-04-28 Task 1: Introduced `src/data/index.js` as the single synchronous business-side dataset boundary and confirmed `src/main.js` can switch to it without changing bootstrap behavior.

- 2026-04-28 23:28:34+08:00 Task 2: Migrated canonical element content into src/data/elements.json using the exact top-level shape { allowedCategories, allowedRarities, allowedSafetyLevels, elements } and kept src/data/index.js as the synchronous business-side boundary.

- 2026-04-28 23:31:07+08:00 Task 2: Re-verified that src/data/elements.json is the canonical element dataset and that src/data/index.js preserves the synchronous named-export boundary for app consumers.

- 2026-04-28 23:40:00+08:00 Task 3: Migrated quiz data into `src/data/quizData.json` with the exact top-level `{ quizData: [...] }` shape and kept `src/data/index.js` as the synchronous business-side boundary export.

- 2026-04-28 23:40:00+08:00 Task 3: Confirmed `scripts/validate-supporting-data.mjs` now validates quiz data through the shared boundary and still rejects invalid `correctIndex` values.

- 2026-04-28 23:42:14+08:00 Task 4: Migrated reactions into `src/data/reactions.json` with the exact top-level `{ reactions: [...] }` shape and kept lab/game consumers on the synchronous `src/data/index.js` boundary.

- 2026-04-28 23:42:14+08:00 Task 4: The supporting-data validator still catches invalid reaction formulas after the JSON migration, so the reaction data contract remains enforced at the shared boundary.

- 2026-04-28 23:48:21+08:00 Task 5: Migrated `achievementsData` into `src/data/achievementsData.json` with the exact top-level `{ achievementsData: [...] }` shape and redirected achievements/home/progress consumers to the shared synchronous boundary in `src/data/index.js`.

- 2026-04-28 23:48:21+08:00 Task 5: The supporting-data validator now enforces the object-based achievement condition semantics, including known condition types, positive counts, and valid `gameKey` values for game-score achievements.

- 2026-04-28 23:53:05+08:00 Task 4 follow-up: `src/modules/detailPanel.js` was the only caller of `highlightRelatedExperiments`, so removing the dead call fixed the lab button crash without affecting `#/lab` navigation.

- 2026-04-28 23:53:05+08:00 Task 4 follow-up: `npm run build` passed after the fix, confirming the minimal detail-panel change stayed within the existing runtime flow.

- 2026-04-28 23:56:12+08:00 Task 6: Migrated `learningPath` into `src/data/learningPath.json` with the exact `{ "learningPath": { "stages": [...] } }` shape and kept progress/home consumers on the synchronous `src/data/index.js` boundary.

- 2026-04-29T00:05:00.2643965+08:00 Task 7: Consolidated repeated category, safety, game, experiment, feature, and achievement metadata into `src/data/contentMeta.js`, while preserving each consumer's existing display text and color/theme variants through named exports.

- 2026-04-29T00:05:00.2643965+08:00 Task 7: Keeping `src/data/contentMeta.js` separate from `src/data/index.js` preserved the current JSON dataset boundary while giving UI modules a reviewable shared metadata surface for non-dataset constants.

- 2026-04-29T00:09:17.6804056+08:00 Task 7 follow-up: Exporting direct category label/color maps from `src/data/contentMeta.js` let the remaining consumers stop recreating alias objects locally, which made the duplicate-constant audit pass without changing displayed text or color behavior.

- 2026-04-29T00:16:16.5125565+08:00 Task 7 remediation: After removing the local alias constants, the remaining runtime risk was stale identifier usage, so grepping for `categoryNames` across `src` was the fastest reliable way to catch the last post-consolidation references blocking startup.

- 2026-04-29T00:39:33.3341640+08:00 Task 8: Keeping the new smoke spec on the same `data-testid` and route/class assertions as `tests/shell/home-shell.spec.ts` let the added detail/story/lab/quiz coverage exercise real migrated content without adding new app hooks.

- 2026-04-29T00:39:33.3341640+08:00 Task 8: A simple textual import audit that only allows business modules to import `src/data/index.js` or `src/data/contentMeta.js` was enough to prove the JSON/content boundary stayed intact after the migration wave.

- 2026-04-29T01:03:56.3864875+08:00 Task 7 final follow-up: Achievement rarity labels were the last remaining inline metadata map in the targeted consumer set, and moving them into `src/data/contentMeta.js` preserved the exact display strings while closing Oracle's remaining plan-compliance gap.

- 2026-04-29T01:22:02.2646029+08:00 Final-wave remediation: Guarding malformed top-level and nested supporting-data shapes with `ensureArray`/`ensureObject` let `scripts/validate-supporting-data.mjs` keep reporting readable validation failures for bad reactions or learningPath data instead of crashing mid-run.

- 2026-04-29T01:22:02.2646029+08:00 Final-wave remediation: Replacing loader-only waits with shell-ready checks (`nav-home`, detail panel, first element cell, and populated `window.appState.elements`) made the planned Playwright command chain depend on actual app interactivity rather than a single CSS class.

- 2026-04-29T01:30:35.0919787+08:00 F3 server-lifecycle remediation: On Windows, keeping the Vite child attached to Playwright setup-process lifetime was the reason the local server could disappear mid-suite, so detached setup plus explicit teardown was the reliable way to keep the exact shell command green.

- 2026-04-29T01:30:35.0919787+08:00 F3 server-lifecycle remediation: The stricter shell-ready checks in the specs remained useful after the lifecycle fix because they validate app interactivity separately from raw HTTP availability.
