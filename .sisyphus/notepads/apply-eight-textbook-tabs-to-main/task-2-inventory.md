## Wave 1 Task 2 — Inventory Source Worktree Diff and Lock Migration Allowlist

**Timestamp:** 2026-05-27T20:01:21+08:00
**Agent:** inventory-allowlist-agent
**Status:** DONE

### Summary
Inspected source worktree at `D:\Chemical-Laboratory-worktrees\missing-textbook-learning-cards` and produced four evidence files in main workspace at `D:\Chemical-Laboratory\.sisyphus\evidence\apply-eight-textbook-tabs-to-main\`.

### Findings
- **15 modified tracked files** — all pipeline scripts, validation scripts, and promoted runtime datasets
- **4 new batch JSONs** — PEP Chemistry G10/G11 required and selective volumes
- **4 reviewed promotion manifests** — approved for promotion
- **40 generated candidate files** — across 4 volumes (10 files each)
- **1 new Playwright test** — `tests/content/pep-learning-tabs.spec.js`
- **No CSS changes** in `src/styles/`
- **Total allowlist: 65 files**
- **Forbidden check: PASS** — no directory entries, globs, broad roots, inferred subtrees, dist/index.html, .sisyphus artifacts, screenshots, logs, caches, local config, or node_modules

### Evidence Files Created
1. `task-2-source-status.txt` — git status summary with modified/untracked counts
2. `task-2-source-files.txt` — exact `git diff --name-status` + `git ls-files --others --exclude-standard` output
3. `task-2-allowlist.txt` — locked migration allowlist with 65 explicit file paths, categorized
4. `task-2-allowlist-forbidden-check.txt` — forbidden pattern verification (all checks pass)

### Key Changes Observed
- `src/modules/progress.js` — adds `KNOWN_TEXTBOOK_ORDER`, `TEXTBOOK_TAB_LABELS`, `getTextbookGroups()`, tab rendering in `renderManualLearningSection()`, tab click handlers in `bindStageInteractions()`
- `src/data/textbookIngestion/runtimeTargetMap.js` — `experimentCandidate` now maps to `src/data/reactions.json` instead of `src/data/labExperiments.json`
- `src/data/contentMeta.js` — adds `TEXTBOOK_CHALLENGE_METADATA` entries for 4 PEP volumes
- `src/data/index.js` — exports `reactions` from `reactions.json`
- Runtime datasets (`achievementsData.json`, `learningPath.json`, `quizData.json`, `reactions.json`) — contain promoted PEP records
- Pipeline scripts updated to recognize 4 new PEP batch IDs
- `scripts/validate-lab-data-boundary.mjs` and `scripts/validate-supporting-data.mjs` updated for new volume IDs

### Next Steps
Ready for Wave 1 Task 3: copy migration files from source to main using this locked allowlist.
