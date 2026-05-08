
- 2026-04-28 Task 1: Re-exported only the current JS datasets through `src/data/index.js` and kept `src/main.js` synchronous so later JSON migration can happen behind one stable import surface.

- 2026-04-28 23:28:34+08:00 Task 2: Chose static JSON plus synchronous import in src/data/index.js for browser consumers, while scripts/validate-elements.mjs reads the same JSON via fs/promises so the runtime boundary and validator share one source of truth.

- 2026-04-28 23:31:07+08:00 Task 2: Kept validator and runtime aligned on one source of truth by leaving browser imports synchronous through src/data/index.js and reading the same JSON file directly in scripts/validate-elements.mjs.

- 2026-04-28 23:40:00+08:00 Task 3: Used JSON import attributes in `src/data/index.js` so Node-side validation can consume the synchronous boundary without introducing async loading.

- 2026-04-28 23:42:14+08:00 Task 4: Moved only the reactions dataset to JSON for this task and updated `src/data/index.js` to export it synchronously, leaving achievements and learningPath for later tasks.

- 2026-04-28 23:53:05+08:00 Task 4 follow-up: Removed the undefined `highlightRelatedExperiments` call from `src/modules/detailPanel.js` instead of inventing a new highlight implementation, because there was no existing target in `src` and the user asked for the minimal bugfix.

- 2026-04-28 23:48:21+08:00 Task 5: Kept achievement unlock logic unchanged by moving only the data boundary to JSON and validating the existing object condition schema instead of introducing any runtime loading or async behavior.

- 2026-04-28 23:56:12+08:00 Task 6: Preserved stage ordering, required counts, and unlock semantics exactly while switching only the import boundary to `src/data/index.js`, because the progress and home modules already depend on synchronous dataset access.

- 2026-04-29T00:05:00.2643965+08:00 Task 7: Introduced `src/data/contentMeta.js` as a dedicated shared UI-metadata module instead of folding these constants into `src/data/index.js`, so content metadata consolidation stays scoped to duplicated labels/themes and does not blur the existing canonical JSON dataset boundary.

- 2026-04-29T00:05:00.2643965+08:00 Task 7: Preserved consumer-specific text/color differences by exporting separate shared variants where needed (for example compare rarity labels and lab/render-table safety themes) rather than normalizing display strings during the refactor.

- 2026-04-29T00:09:17.6804056+08:00 Task 7 follow-up: Added only `ELEMENT_CATEGORY_LABELS` and `ELEMENT_CATEGORY_TABLE_COLORS` to `src/data/contentMeta.js` so the four flagged consumers could import the exact shapes they needed instead of rebuilding labels from `ELEMENT_CATEGORY_META` locally.

- 2026-04-29T00:16:16.5125565+08:00 Task 7 remediation: Fixed the startup crash by swapping the three stale `categoryNames` reads in `src/modules/renderTable.js` and `src/modules/timeline.js` to the existing shared `ELEMENT_CATEGORY_LABELS` binding, instead of restoring any local alias object.

- 2026-04-29T00:39:33.3341640+08:00 Task 8: Exposed the branch verification chain through `validate:elements`, `validate:supporting`, and `validate:data`, with `validate:data` ending in the import audit so one command verifies both dataset shape and business-side boundary discipline.

- 2026-04-29T00:39:33.3341640+08:00 Task 8: Replaced Playwright's `webServer` block with `tests/setup/global-setup.ts` instead of changing app runtime code, because the task only needed stable test infrastructure and the browser suites were already semantically correct.

- 2026-04-29T01:03:56.3864875+08:00 Task 7 final follow-up: Added `ACHIEVEMENT_RARITY_LABELS` to `src/data/contentMeta.js` and reused it in `src/modules/achievements.js` instead of leaving a function-local object in `formatRarity()`, because Oracle specifically required achievement rarity labels to come from shared metadata.

- 2026-04-29T01:22:02.2646029+08:00 Final-wave remediation: Kept the import-audit hardening textual by extending the existing scanner to cover `import`, `export ... from`, and `import()` specifier forms, instead of adding a parser dependency that would exceed the task scope.

- 2026-04-29T01:22:02.2646029+08:00 Final-wave remediation: Kept Playwright server setup intact in `tests/setup/global-setup.ts` but made page readiness stricter inside the specs, so HTTP availability and UI interactivity are verified separately.

- 2026-04-29T01:30:35.0919787+08:00 F3 server-lifecycle remediation: Chose Playwright `globalSetup` + `globalTeardown` with a detached Vite process and pid file over the custom attached child or a flaky `webServer` retry, because this remains Playwright-managed while surviving Windows setup-process exit semantics.

- 2026-04-29T01:30:35.0919787+08:00 F3 server-lifecycle remediation: Removed the earlier non-detached setup launcher and replaced it with explicit detached process ownership so the server lifecycle matches the whole suite, not just setup completion.
