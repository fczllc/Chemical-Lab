# Apply Eight Textbook Tabs To Main Workspace

## TL;DR
> **Summary**: Safely migrate the already-verified 8-textbook 学习 module implementation from `D:\Chemical-Laboratory-worktrees\missing-textbook-learning-cards` into the currently running main workspace `D:\Chemical-Laboratory`, then verify the main app shows exactly 8教材 TABs with content.
> **Deliverables**:
> - Explicit preflight inventory of main dirty state and source worktree diff
> - Allowlisted migration of `pep-*` textbook ingestion/runtime data, learning-tab UI logic, and targeted Playwright test coverage
> - Main-workspace validation evidence proving 8 tabs, exact labels/order, original 4 preserved, new 4 populated
> - No destructive git operations, no commits, no unrelated artifact migration
> **Effort**: Medium
> **Parallel**: YES - 4 waves
> **Critical Path**: Tasks 1-2 → Tasks 3-4 → Task 5 → Task 6 → Final Verification Wave

## Context
### Original Request
The user reports the current 学习 module still shows only 4教材 TABs and wants all 8教材 added so the top of 学习 shows 8教材 options and each tab contains that textbook's learning content.

### Interview Summary
- User confirmed the implementation should be migrated from `D:\Chemical-Laboratory-worktrees\missing-textbook-learning-cards` into current main workspace `D:\Chemical-Laboratory`.
- User wants the new 4教材 to follow the same processing standard as the current 4教材.
- Current screenshot shows only 4 tabs: `高三/12年级有机基础`, `八年级全册`, `九年级上册`, `九年级下册`.
- Current main workspace lacks `src/data/textbookIngestion/batches/pep-*.json`, lacks 8-tab helpers in `src/modules/progress.js`, and has only minimal `pep-chemistry` matches in `src/data/achievementsData.json`.
- Isolated worktree evidence already proves 8 tabs with clean labels and populated new PEP content.

### Metis Review (gaps addressed)
- Require source worktree inventory and exact file allowlist before applying any file.
- Preserve unrelated dirty files in main; do not use `git reset --hard`, broad checkout, clean, stash, or commit.
- Verify from `D:\Chemical-Laboratory`, not from the isolated worktree.
- Assert exact 8 labels/order and content counts, not merely tab count.
- Prevent UI redesign, learner-state changes, dependency changes, and unrelated `.sisyphus`/report/cache artifact migration.

### Oracle Phase 1
- `VERDICT: GO`: interview completeness, scope, and test strategy are sufficient to proceed without more user questions.

## Work Objectives
### Core Objective
Make the currently running main workspace 学习 page display exactly 8教材 tabs with each tab showing that textbook's learning cards, by safely migrating the already-verified implementation from the isolated worktree.

### Deliverables
- Main workspace contains four `pep-*` textbook batch contracts and reviewed/generated ingestion artifacts required by validators.
- Main workspace runtime datasets include promoted `pep-*` learning-card content and related supported runtime records.
- Main workspace `src/modules/progress.js` groups manual learning cards by textbook, renders 8 deterministic tabs, and uses clean Chinese labels.
- Main workspace includes targeted Playwright coverage for 8教材 tabs.
- Evidence under `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/` records preflight, exact migration allowlist, validation, Playwright, and final diff scope.

### Definition of Done (verifiable conditions with commands)
- From `D:\Chemical-Laboratory`, `npm run validate:all:safe` exits 0.
- From `D:\Chemical-Laboratory`, targeted Playwright test for learning tabs exits 0 and proves exactly 8 tabs.
- Main 学习 tab labels in order are exactly:
  1. `八年级·全册`
  2. `九年级·上册`
  3. `九年级·下册`
  4. `高一/10年级·必修第一册`
  5. `高一/10年级·必修第二册`
  6. `高二/11年级·选择性必修一·反应原理`
  7. `高二/11年级·选择性必修二·物质结构与性质`
  8. `高三/12年级·有机基础`
- New PEP tabs show learning-card counts exactly `213`, `263`, `198`, `146` respectively.
- Existing 4 tabs still show positive counts and render cards.
- No page errors or console errors occur during 学习 tab QA.
- Final changed-file list is bounded to the explicit migration allowlist plus pre-existing dirty files recorded before migration.

### Must Have
- Preflight inventory of main dirty state before any migration.
- Source worktree inventory before allowlist finalization.
- File-by-file migration method: direct copy only when safe; manual merge when main file is dirty or diverged.
- Preserve learner-state contract from `AGENTS.md`.
- Preserve existing 4 textbook IDs and content.
- Use current app conventions and the already-verified worktree implementation; do not redesign UI.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not run `git reset --hard`, `git clean`, broad `git checkout -- .`, broad directory copy, rebase, stash, commit, or push.
- Do not overwrite unrelated dirty files in `D:\Chemical-Laboratory`.
- Do not migrate `.sisyphus` plan/evidence/notepad files from the isolated worktree except new evidence created for this task in main.
- Do not add dependencies, frameworks, or a new textbook ingestion architecture.
- Do not change storage APIs, `window.appState` semantics, achievement unlock semantics, learned/collected elements, quiz-score persistence, or completed experiment persistence.
- Do not add textbooks beyond the 8 confirmed教材.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after migration using existing validators + targeted Playwright + full safe validation.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-{N}-{slug}.{ext}`.
- Final commands run from `D:\Chemical-Laboratory` only:
  - `node scripts/validate-textbook-assets.mjs`
  - `node scripts/validate-supporting-data.mjs`
  - `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed`
  - `node scripts/textbook/promote-topic.mjs --all-reviewed --dry-run --json`
  - `npm run validate:all:safe`
  - `npx playwright test tests/content/pep-learning-tabs.spec.js --project=chromium`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 (main preflight) and Task 2 (source worktree inventory) can run in parallel because both are read-only.
Wave 2: Tasks 3-4 after allowlist is known; data/scripts and UI migration can be applied by separate agents only if they respect the locked allowlist and do not overlap files.
Wave 3: Task 5 after Tasks 3-4; test migration/static review depends on migrated runtime selectors and data shape.
Wave 4: Task 6 final validation, targeted Playwright execution, and diff-scope audit after all migrations.

### Dependency Matrix (full, all tasks)
- Task 1: blocks Tasks 3-6.
- Task 2: blocks Tasks 3-6.
- Task 3: blocked by Tasks 1-2; blocks Task 6.
- Task 4: blocked by Tasks 1-2; blocks Task 6.
- Task 5: blocked by Tasks 3-4; blocks Task 6.
- Task 6: blocked by Tasks 3-5; blocks Final Verification Wave.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → `quick` x2
- Wave 2 → 2 tasks → `unspecified-high`, `quick`
- Wave 3 → 1 task → `visual-engineering`
- Wave 4 → 1 task → `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Record main workspace safety inventory before migration

  **What to do**: From `D:\Chemical-Laboratory`, create an evidence directory and record current main workspace state before any file migration. Capture `git status --short`, relevant existing `pep-*` absence/presence, current `progress.js` tab-helper absence/presence, and current 学习-related data counts. This task is read-only except creating evidence files under `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/`.
  **Must NOT do**: Do not modify source files. Do not run destructive git commands. Do not stash, reset, clean, checkout, or commit.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: read-only inventory with evidence capture.
  - Skills: [`verification-before-completion`] - Evidence-before-claims discipline.
  - Omitted: [`frontend-design`] - No UI design work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [3,4,5,6] | Blocked By: []

  **References**:
  - Main workspace: `D:\Chemical-Laboratory` - final target and only workspace whose runtime matters.
  - AGENTS: `AGENTS.md` - verification commands and learner-state contract.
  - Current finding: main has no `src/data/textbookIngestion/batches/pep-*.json` and no 8-tab helpers in `src/modules/progress.js`.

  **Acceptance Criteria**:
  - [ ] Evidence directory exists: `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/`.
  - [ ] `git status --short` output is saved to `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-1-main-status-before.txt`.
  - [ ] `node -e "const fs=require('fs');const ids=['pep-chemistry-g10-required-1','pep-chemistry-g10-required-2','pep-chemistry-g11-selective-1','pep-chemistry-g11-selective-2'];const batches=ids.map(id=>['src/data/textbookIngestion/batches/'+id+'.json',fs.existsSync('src/data/textbookIngestion/batches/'+id+'.json')]);const achievements=fs.readFileSync('src/data/achievementsData.json','utf8');const progress=fs.readFileSync('src/modules/progress.js','utf8');console.log(JSON.stringify({batches,pepMatches:(achievements.match(/pep-chemistry/g)||[]).length,hasKnownTextbookOrder:progress.includes('KNOWN_TEXTBOOK_ORDER'),hasRenderTextbookTabs:progress.includes('renderTextbookTabs'),hasProgressTextbookTabs:progress.includes('progress-textbook-tabs')},null,2));"` output is saved to `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-1-main-baseline.json`.
  - [ ] The baseline JSON confirms the current main workspace still does not have all four PEP batch files before migration, unless another actor already applied them; if already present, record that as a pre-existing state and continue with diff-scope preservation.

  **QA Scenarios**:
  ```
  Scenario: Happy path — main dirty state is captured before migration
    Tool: Bash
    Steps: From `D:\Chemical-Laboratory`, run `git status --short` and save exact output to task-1 evidence.
    Expected: Evidence file exists and can be used later to distinguish pre-existing dirty files from migration changes.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-1-main-status-before.txt

  Scenario: Failure/edge — no blind overwrite risk is hidden
    Tool: Bash
    Steps: Run the Node baseline command above and inspect whether any expected migration target is already dirty or present in main.
    Expected: Baseline JSON explicitly records PEP batch existence, `pep-chemistry` match count, and 8-tab helper presence booleans.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-1-main-baseline.json
  ```

  **Commit**: NO | Message: N/A | Files: [`.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-1-main-status-before.txt`, `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-1-main-baseline.json`]

- [x] 2. Inventory source worktree diff and lock migration allowlist

  **What to do**: From `D:\Chemical-Laboratory-worktrees\missing-textbook-learning-cards`, inventory the completed implementation files. Save source `git status --short`, source diff/name-status, and a proposed allowlist file in the main evidence directory. The allowlist must include only files required for 8教材 学习 behavior: textbook pipeline registries, PEP batch/generated/reviewed artifacts, promoted runtime datasets, runtime target/validators, `src/modules/progress.js`, targeted Playwright test, and any CSS/style file if source diff proves it changed for tabs. The allowlist must contain exact relative file paths only, one path per line: no directory-only entries, no glob entries, and no inferred subtree imports. Explicitly exclude `.sisyphus/` artifacts from the source worktree.
  **Must NOT do**: Do not copy files yet. Do not include unrelated build output such as `dist/index.html`. Do not include source worktree `.sisyphus` artifacts except as read-only evidence references.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: read-only inventory and allowlist creation.
  - Skills: [`verification-before-completion`] - Verify evidence exists before proceeding.
  - Omitted: [`git-master`] - No commit/history surgery; if using git, set `GIT_MASTER=1` per repo convention.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [3,4,5,6] | Blocked By: []

  **References**:
  - Source worktree: `D:\Chemical-Laboratory-worktrees\missing-textbook-learning-cards`.
  - Source evidence: `.sisyphus/evidence/task-10-learning-tabs.json` in source worktree shows 8 tabs and PEP counts.
  - Source plan: `.sisyphus/plans/missing-textbook-learning-cards.md` in source worktree documents expected files and final scope.

  **Acceptance Criteria**:
  - [ ] Source `git status --short` saved to main evidence file `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-source-status.txt`.
  - [ ] Source changed-file inventory saved to `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-source-files.txt`.
  - [ ] Migration allowlist saved to `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-allowlist.txt` and contains exact file paths, one per line, relative to repo root.
  - [ ] Allowlist includes `src/modules/progress.js` and `tests/content/pep-learning-tabs.spec.js`.
  - [ ] Allowlist includes these four batch files: `src/data/textbookIngestion/batches/pep-chemistry-g10-required-1.json`, `src/data/textbookIngestion/batches/pep-chemistry-g10-required-2.json`, `src/data/textbookIngestion/batches/pep-chemistry-g11-selective-1.json`, `src/data/textbookIngestion/batches/pep-chemistry-g11-selective-2.json`.
  - [ ] Allowlist contains no directory-only entries and no glob-style entries such as `generated/<id>/`, `reviewed/<id>/`, `*.json`, or `**/*`.
  - [ ] Allowlist excludes `dist/index.html`, `.sisyphus/boulder.json`, source worktree `.sisyphus/evidence/*`, source worktree `.sisyphus/notepads/*`, screenshots, logs, caches, local config, and `node_modules`.

  **QA Scenarios**:
  ```
  Scenario: Happy path — allowlist names all migration files explicitly
    Tool: Bash
    Steps: Generate and read `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-allowlist.txt`.
    Expected: Every path is relative, exact, and necessary for 8教材 学习 behavior; no directories, globs, or broad copy roots are listed.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-allowlist.txt

  Scenario: Failure/edge — source artifacts are not blindly imported
    Tool: Bash
    Steps: Search allowlist for forbidden patterns: `dist/`, `.sisyphus/boulder`, `.sisyphus/evidence/task-`, `.sisyphus/notepads`, `node_modules`, `.log`, `.png`, `*`, and lines ending in `/`.
    Expected: Search finds no forbidden allowlist entries, no glob entries, and no directory-only entries.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-allowlist-forbidden-check.txt
  ```

  **Commit**: NO | Message: N/A | Files: [`.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-source-status.txt`, `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-source-files.txt`, `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-allowlist.txt`, `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-allowlist-forbidden-check.txt`]

- [x] 3. Migrate textbook pipeline artifacts and promoted runtime data into main

  **What to do**: Using the locked allowlist from Task 2 and main dirty-state evidence from Task 1, migrate only the data/script artifacts required for the four missing PEP textbooks. This includes PEP batch contracts, generated/reviewed artifacts, pipeline registries, promotion/runtime target changes, validator adjustments, and promoted runtime data files such as `src/data/achievementsData.json`, `src/data/quizData.json`, `src/data/learningPath.json`, `src/data/reactions.json`, `src/data/contentMeta.js`, and `src/data/index.js` only if present in the allowlist. If a target file is dirty in main before migration, do a manual merge and record the merge rationale; otherwise direct-copy the source version. After migration, run data-focused validators from main.
  **Must NOT do**: Do not overwrite pre-existing main edits without manual merge. Do not copy `dist/` or `.sisyphus` artifacts from source. Do not change learner-state modules or unrelated datasets.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: multiple data/script files and conflict-safety requirements.
  - Skills: [`verification-before-completion`] - Verify validators before claiming success.
  - Omitted: [`frontend-design`] - No visual design work in this task.

  **Parallelization**: Can Parallel: YES with Task 4 only if allowlist file ownership is non-overlapping | Wave 2 | Blocks: [5,6] | Blocked By: [1,2]

  **References**:
  - Allowlist: `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-allowlist.txt`.
  - Source runtime data: `D:\Chemical-Laboratory-worktrees\missing-textbook-learning-cards\src\data\achievementsData.json` and related allowlisted files.
  - Main validators: `scripts/validate-supporting-data.mjs`, `scripts/validate-textbook-assets.mjs`, `scripts/textbook/validate-promotion-manifest.mjs`, `scripts/textbook/promote-topic.mjs`.

  **Acceptance Criteria**:
  - [ ] In main, all four PEP batch files exist under `src/data/textbookIngestion/batches/`.
  - [ ] In main, `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed` exits 0.
  - [ ] In main, `node scripts/textbook/promote-topic.mjs --all-reviewed --dry-run --json` exits 0.
  - [ ] In main, `node scripts/validate-textbook-assets.mjs` exits 0.
  - [ ] In main, `node scripts/validate-supporting-data.mjs` exits 0.
  - [ ] In main, this count assertion exits 0 and prints `pep-counts-ok`: `node -e "const data=require('./src/data/achievementsData.json');const expected={'pep-chemistry-g10-required-1':213,'pep-chemistry-g10-required-2':263,'pep-chemistry-g11-selective-1':198,'pep-chemistry-g11-selective-2':146};for(const [id,count] of Object.entries(expected)){const actual=data.filter(a=>a?.condition?.type==='manualReviewAfterPromotion'&&a.sourceReviewStatus==='reviewed'&&(a.sourceVolumeId===id||a.sourceReferences?.some(r=>r.sourceVolumeId===id||r.volumeId===id))).length;if(actual!==count){throw new Error(id+' expected '+count+' got '+actual)}}console.log('pep-counts-ok')"`.

  **QA Scenarios**:
  ```
  Scenario: Happy path — PEP runtime learning data exists in main
    Tool: Bash
    Steps: Run the `pep-counts-ok` Node assertion from main.
    Expected: Counts are exactly 213, 263, 198, 146 for the four added PEP volumes.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-3-pep-counts.txt

  Scenario: Failure/edge — validators catch broken migration links
    Tool: Bash
    Steps: Run `node scripts/validate-textbook-assets.mjs` and `node scripts/validate-supporting-data.mjs` from main.
    Expected: Both exit 0; any missing manifest path, image link, achievement reference, or supporting-data cross-reference fails the task.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-3-data-validators.txt
  ```

  **Commit**: NO | Message: N/A | Files: [allowlisted data/script files only]

- [x] 4. Migrate 学习 module 8-tab rendering logic without changing learner-state semantics

  **What to do**: Migrate only allowlisted 学习 module UI/runtime code needed for textbook tabs, primarily `src/modules/progress.js`. Preserve main workspace behavior that may have advanced beyond the source worktree. Required outcome: manual learning segments are grouped by `sourceVolumeId`; deterministic order follows the 8-label list in Definition of Done; tab buttons render at the top; active tab controls visible learning cards; cards keep `data-testid="learning-card"`; no storage or learner-state behavior changes. If source `progress.js` is older than main or missing functions that main currently has, manually merge only the textbook grouping/tab sections rather than replacing the whole file.
  **Must NOT do**: Do not remove current main functions such as detail sections, lesson modal behavior, or current `__progressTestHooks`. Do not modify `src/modules/storage.js`. Do not change achievement completion semantics.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: focused UI module merge when guided by source worktree pattern.
  - Skills: [] - No creative UI redesign; follow existing verified pattern.
  - Omitted: [`frontend-design`] - The design already exists; no visual redesign.

  **Parallelization**: Can Parallel: YES with Task 3 if file ownership is non-overlapping | Wave 2 | Blocks: [5,6] | Blocked By: [1,2]

  **References**:
  - Main target: `D:\Chemical-Laboratory\src\modules\progress.js`.
  - Source pattern: `D:\Chemical-Laboratory-worktrees\missing-textbook-learning-cards\src\modules\progress.js:198-245` for `KNOWN_TEXTBOOK_ORDER`, `TEXTBOOK_TAB_LABELS`, `formatTextbookTabLabel`, `getTextbookGroups`.
  - Source evidence: `D:\Chemical-Laboratory-worktrees\missing-textbook-learning-cards\.sisyphus\evidence\task-10-learning-tabs.json`.

  **Acceptance Criteria**:
  - [ ] Main `src/modules/progress.js` contains all 8 IDs in a deterministic order constant or equivalent deterministic function.
  - [ ] Main `src/modules/progress.js` contains clean labels for all 8教材 and no new label contains `pep-chemistry`, `人教版`, `2019`, or `2024`.
  - [ ] Main `src/modules/progress.js` renders a `.progress-textbook-tabs` container or existing equivalent targeted by the Playwright test.
  - [ ] Main `src/modules/progress.js` renders learning cards with `data-testid="learning-card"`.
  - [ ] `lsp_diagnostics` on `src/modules/progress.js` reports no errors.

  **QA Scenarios**:
  ```
  Scenario: Happy path — render code exposes 8 clean textbook tabs
    Tool: Bash + lsp_diagnostics
    Steps: Search `src/modules/progress.js` for all 8 IDs and clean labels; run LSP diagnostics for the file.
    Expected: All IDs and labels are present; diagnostics report no errors.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-4-progress-static.txt

  Scenario: Failure/edge — learner-state semantics were not touched
    Tool: Bash
    Steps: Run `git diff -- src/modules/storage.js src/modules/progress.js` and inspect that `src/modules/storage.js` is unchanged and `progress.js` changes are limited to textbook grouping/tabs/card selectors plus safe integration.
    Expected: No storage API changes; no learned/collected/quiz/completed experiment persistence changes.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-4-learner-state-guard.txt
  ```

  **Commit**: NO | Message: N/A | Files: [`src/modules/progress.js`]

- [x] 5. Migrate or create targeted Playwright coverage for 8教材 学习 tabs

  **What to do**: Ensure main workspace has a targeted Playwright test at `tests/content/pep-learning-tabs.spec.js` or equivalent allowlisted path. Prefer migrating the source worktree test if it matches current main selectors; otherwise adapt it minimally. The test must navigate to 学习, assert exactly 8 tab buttons, assert exact clean labels/order, click all 8 tabs, assert each tab shows at least one `data-testid="learning-card"`, assert new PEP counts `213/263/198/146`, and fail on page/console errors. In this task, perform static review of the test only; actual Playwright execution belongs to Task 6 after Tasks 3-5 are complete.
  **Must NOT do**: Do not weaken assertions to only count buttons. Do not require user visual inspection. Do not add test dependencies.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: browser QA and UI-selector verification.
  - Skills: [`playwright`] - Browser automation and console/page error verification.
  - Omitted: [`frontend-design`] - No redesign; test existing UI.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [6] | Blocked By: [3,4]

  **References**:
  - Source test: `D:\Chemical-Laboratory-worktrees\missing-textbook-learning-cards\tests\content\pep-learning-tabs.spec.js`.
  - Main Playwright config: `playwright.config.ts`.
  - Main test conventions: `tests/content/`, `tests/ui/`.

  **Acceptance Criteria**:
  - [ ] Main contains `tests/content/pep-learning-tabs.spec.js` or an equivalent explicitly named in evidence.
  - [ ] Test asserts exact 8 labels/order from Definition of Done.
  - [ ] Test asserts new PEP counts exactly `213`, `263`, `198`, `146`.
  - [ ] Test records page errors and console errors and fails if either list is non-empty.
  - [ ] Static review confirms the test uses selectors that exist after Task 4, including `.progress-textbook-tabs` or the final tab selector, and `[data-testid="learning-card"]`.

  **QA Scenarios**:
  ```
  Scenario: Happy path — targeted browser test proves 8 tabs in main
    Tool: Bash
    Steps: Read `tests/content/pep-learning-tabs.spec.js` and verify exact expected labels and counts are hard assertions.
    Expected: Test contains exact labels/order and PEP counts 213/263/198/146; it fails on page/console errors.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-5-test-static-review.txt

  Scenario: Failure/edge — raw IDs and banned terms do not leak into labels
    Tool: Bash
    Steps: Read test assertions for banned terms `pep-chemistry`, `人教版`, `2019`, and `2024`.
    Expected: Test includes assertions that fail if any banned term appears in tab labels.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-5-label-sanitization.json
  ```

  **Commit**: NO | Message: N/A | Files: [`tests/content/pep-learning-tabs.spec.js`]

- [x] 6. Run final main-workspace validation, browser QA, and diff-scope audit

  **What to do**: From `D:\Chemical-Laboratory`, run final validators and browser QA after Tasks 3-5. Capture command outputs. Compare final changed files against Task 1 preflight status and Task 2 allowlist. If validation/build modifies generated artifacts such as `dist/index.html`, do not use git checkout/reset/clean/stash; either leave and report the generated artifact change, or restore it only by non-git copying from a verified clean source after proving it was not pre-existing dirty. Produce final evidence summary with exact 8 labels/counts.
  **Must NOT do**: Do not claim completion if any validator, Playwright test, or diff-scope check fails. Do not commit. Do not use destructive git commands. Do not silently restore or discard generated artifacts.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: full validation, evidence collation, and diff-scope safety.
  - Skills: [`verification-before-completion`] - Completion claims require fresh evidence.
  - Omitted: [`frontend-design`] - No UI implementation here.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: [Final Verification Wave] | Blocked By: [3,4,5]

  **References**:
  - Required commands from `AGENTS.md`.
  - Preflight evidence: `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-1-main-status-before.txt`.
  - Allowlist: `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-2-allowlist.txt`.

  **Acceptance Criteria**:
  - [ ] `node scripts/validate-textbook-assets.mjs` exits 0.
  - [ ] `node scripts/validate-supporting-data.mjs` exits 0.
  - [ ] `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed` exits 0.
  - [ ] `node scripts/textbook/promote-topic.mjs --all-reviewed --dry-run --json` exits 0.
  - [ ] `npm run validate:all:safe` exits 0.
  - [ ] `npx playwright test tests/content/pep-learning-tabs.spec.js --project=chromium` exits 0.
  - [ ] If feasible within execution time, `npx playwright test` exits 0; if not run, final evidence must explicitly state it was skipped and why, while `npm run validate:all:safe` and targeted Playwright remain mandatory.
  - [ ] Final `git status --short` and `git diff --stat -- ':!node_modules'` are captured and reviewed against preflight + allowlist.
  - [ ] Final evidence summary lists exact labels/order and counts for all 8教材.

  **QA Scenarios**:
  ```
  Scenario: Happy path — full validation passes in current main workspace
    Tool: Bash
    Steps: From `D:\Chemical-Laboratory`, run `npm run validate:all:safe` and targeted Playwright.
    Expected: Both exit 0; targeted Playwright proves current main app renders exactly 8 textbook tabs.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-6-final-validation.txt

  Scenario: Failure/edge — migration did not touch unrelated dirty files
    Tool: Bash
    Steps: Compare `git status --short` after migration to Task 1 preflight status and Task 2 allowlist.
    Expected: New changes are only allowlisted migration files plus new evidence files; pre-existing dirty files remain identifiable and are not overwritten.
    Evidence: .sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-6-diff-scope.txt
  ```

  **Commit**: NO | Message: N/A | Files: [validation/evidence only]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE before the plan may be marked complete.
> Rejection or reviewer feedback -> fix -> re-run the rejected review(s) -> require ALL APPROVE.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright for 学习 page)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- No commits unless the user explicitly asks.
- If user later requests a commit, inspect `git status`, `git diff`, and recent log first; stage only verified migration files and exclude pre-existing unrelated dirty files.

## Success Criteria
- Main app 学习 module displays 8教材 tabs at the top.
- Each of the 8教材 tabs displays its own learning-card content.
- The four originally visible tabs remain populated.
- The four added PEP tabs have counts `213`, `263`, `198`, `146`.
- All validators and browser QA pass in `D:\Chemical-Laboratory`.
