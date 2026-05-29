# Roll Back To PEP Learning Tabs Completion State

## TL;DR
> **Summary**: Return the main workspace to commit `f840fc5 feat(textbook): add PEP learning tabs`, the state where the four newly added PEP textbooks were processed and the 学习 module had textbook TAB grouping.
> **Deliverables**:
> - Safety snapshot before rollback
> - Hard reset of `D:\Chemical-Laboratory` to `f840fc5`
> - Verification that PEP textbook data and TAB learning-module code are present
> - Main-workspace validation evidence
> **Effort**: Quick
> **Parallel**: NO
> **Critical Path**: Task 1 → Task 2 → Task 3 → Final Verification Wave

## Context
### Original Request
User said the merge caused the 学习 module to revert to the old layout and the TAB-per-textbook learning-module changes were lost. User rejected rolling back too far and confirmed the desired rollback target is the state after the four new textbooks were processed.

### Target Commit
- Target commit: `f840fc5 feat(textbook): add PEP learning tabs`
- Current HEAD observed before plan: `1337746 chore(workspace): commit remaining changes`
- Parent baseline before PEP work: `e827e48 优化模块内容、更换加载动画等`

### Evidence Already Gathered
- `git show --stat --oneline f840fc5` shows PEP runtime/data changes, `src/modules/progress.js`, and `tests/content/pep-learning-tabs.spec.js`.
- `git diff --stat e827e48..1337746 -- src/data src/modules/progress.js tests/content/pep-learning-tabs.spec.js scripts` confirms the PEP textbook processing state spans data, ingestion artifacts, validators/scripts, progress module, and Playwright test.
- The source worktree `D:\Chemical-Laboratory-worktrees\missing-textbook-learning-cards` still contains uncommitted detailed task evidence, but the user-requested rollback target is the committed main state `f840fc5`.

## Work Objectives
### Core Objective
Set `D:\Chemical-Laboratory` back to `f840fc5` so the repository reflects the completed four-new-textbook PEP learning-tabs state, then verify that the 学习 module has textbook TAB code and PEP data.

### Deliverables
- Pre-reset safety evidence under `.sisyphus/evidence/rollback-to-pep-learning-tabs/`.
- `master` reset to `f840fc5`.
- Verification outputs for git state, PEP data presence, TAB code presence, and project validators.

### Definition of Done
- `git rev-parse --short HEAD` prints `f840fc5`.
- `src/modules/progress.js` contains `KNOWN_TEXTBOOK_ORDER`, `TEXTBOOK_TAB_LABELS`, `.progress-textbook-tabs`, `data-textbook-tab`, and `data-testid="learning-card"`.
- `src/data/achievementsData.json` contains all four PEP runtime volume IDs:
  - `pep-chemistry-g10-required-1`
  - `pep-chemistry-g10-required-2`
  - `pep-chemistry-g11-selective-1`
  - `pep-chemistry-g11-selective-2`
- `tests/content/pep-learning-tabs.spec.js` exists.
- `npm run validate:all:safe` passes, or if it fails due a known post-reset environment issue, exact failure output is captured and no success claim is made.
- `npx playwright test tests/content/pep-learning-tabs.spec.js --project=chromium` passes, or exact failure output is captured and no success claim is made.

### Must Have
- Preserve a pre-reset evidence snapshot before running reset.
- Use `GIT_MASTER=1` for every git command.
- Do not commit, amend, rebase, push, or create PR.
- Do not delete the source worktree `D:\Chemical-Laboratory-worktrees\missing-textbook-learning-cards`.

### Must NOT Have
- Do not roll back to `e827e48`; that is too far and loses the processed four-textbook state.
- Do not cherry-pick arbitrary files after reset unless verification proves `f840fc5` is insufficient and user approves a new plan.
- Do not claim UI is fixed without running the targeted Playwright check.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Git state verification: `git rev-parse --short HEAD`.
- Static verification: grep/read for required TAB symbols and PEP IDs.
- Data/build verification: `npm run validate:all:safe`.
- Browser verification: `npx playwright test tests/content/pep-learning-tabs.spec.js --project=chromium`.

## TODOs

- [ ] 1. Capture pre-reset safety snapshot

  **What to do**: From `D:\Chemical-Laboratory`, capture the current state before resetting so there is an audit trail of what was discarded.
  **Must NOT do**: Do not reset before evidence is written.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small safety/evidence task.
  - Skills: [`git-master`, `verification-before-completion`] - Required for git safety and evidence-first status.
  - Omitted: [`frontend-design`] - No UI design.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2] | Blocked By: []

  **References**:
  - Current working directory: `D:\Chemical-Laboratory`.
  - User-approved target: `f840fc5`.

  **Acceptance Criteria**:
  - [ ] Directory `.sisyphus/evidence/rollback-to-pep-learning-tabs/` exists.
  - [ ] `GIT_MASTER=1 git status --short` output saved to `.sisyphus/evidence/rollback-to-pep-learning-tabs/task-1-status-before.txt`.
  - [ ] `GIT_MASTER=1 git log --oneline -5` output saved to `.sisyphus/evidence/rollback-to-pep-learning-tabs/task-1-log-before.txt`.
  - [ ] `GIT_MASTER=1 git show --stat --oneline f840fc5` output saved to `.sisyphus/evidence/rollback-to-pep-learning-tabs/task-1-target-commit.txt`.

  **QA Scenarios**:
  ```
  Scenario: Happy path — rollback has a safety audit trail
    Tool: Bash
    Steps: Save status, recent log, and target commit stat before reset.
    Expected: All three evidence files exist and clearly identify pre-reset HEAD and target `f840fc5`.
    Evidence: .sisyphus/evidence/rollback-to-pep-learning-tabs/task-1-status-before.txt

  Scenario: Failure/edge — target commit is missing
    Tool: Bash
    Steps: Run `GIT_MASTER=1 git show --stat --oneline f840fc5`.
    Expected: Command exits 0; if it fails, stop and do not reset.
    Evidence: .sisyphus/evidence/rollback-to-pep-learning-tabs/task-1-target-commit.txt
  ```

  **Commit**: NO | Message: N/A | Files: [evidence files only]

- [ ] 2. Reset main workspace to `f840fc5`

  **What to do**: From `D:\Chemical-Laboratory`, reset the current workspace to the user-confirmed target commit `f840fc5`. This intentionally discards current uncommitted `.sisyphus` run-state edits and commit `1337746` changes from the working tree.
  **Must NOT do**: Do not push. Do not delete worktrees. Do not reset to `e827e48`.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: one explicit git reset with verification.
  - Skills: [`git-master`, `verification-before-completion`] - Git operation must be controlled and verified.
  - Omitted: [`frontend-design`] - No UI design.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [3] | Blocked By: [1]

  **References**:
  - Target commit: `f840fc5 feat(textbook): add PEP learning tabs`.

  **Acceptance Criteria**:
  - [ ] `GIT_MASTER=1 git reset --hard f840fc5` exits 0.
  - [ ] `GIT_MASTER=1 git rev-parse --short HEAD` prints `f840fc5`.
  - [ ] `GIT_MASTER=1 git status --short` after reset is captured to `.sisyphus/evidence/rollback-to-pep-learning-tabs/task-2-status-after-reset.txt`.

  **QA Scenarios**:
  ```
  Scenario: Happy path — HEAD is exactly the target commit
    Tool: Bash
    Steps: Run `GIT_MASTER=1 git rev-parse --short HEAD` after reset.
    Expected: Output is exactly `f840fc5`.
    Evidence: .sisyphus/evidence/rollback-to-pep-learning-tabs/task-2-head-after-reset.txt

  Scenario: Failure/edge — reset went to wrong commit
    Tool: Bash
    Steps: Compare `git rev-parse --short HEAD` to `f840fc5`.
    Expected: If mismatch, stop immediately and do not run validators or make further changes.
    Evidence: .sisyphus/evidence/rollback-to-pep-learning-tabs/task-2-head-after-reset.txt
  ```

  **Commit**: NO | Message: N/A | Files: [working tree reset only]

- [ ] 3. Verify four-new-textbook learning-tabs state

  **What to do**: After reset, verify static code/data presence and run required validation commands from `D:\Chemical-Laboratory`.
  **Must NOT do**: Do not claim completion if any command fails. Do not modify code to patch failures in this plan; if reset target is insufficient, stop and create a new recovery plan.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: validation and browser QA.
  - Skills: [`verification-before-completion`, `playwright`] - Required for evidence and UI verification.
  - Omitted: [`frontend-design`] - No design changes.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [Final Verification Wave] | Blocked By: [2]

  **References**:
  - `src/modules/progress.js` - 学习 module TAB code.
  - `src/data/achievementsData.json` - PEP learning-card runtime data.
  - `tests/content/pep-learning-tabs.spec.js` - targeted browser verification.
  - `AGENTS.md` - validation scripts.

  **Acceptance Criteria**:
  - [ ] Static check for required progress symbols passes and output is saved to `.sisyphus/evidence/rollback-to-pep-learning-tabs/task-3-progress-symbols.txt`.
  - [ ] Static check for four PEP volume IDs in `src/data/achievementsData.json` passes and output is saved to `.sisyphus/evidence/rollback-to-pep-learning-tabs/task-3-pep-data.txt`.
  - [ ] `npm run validate:all:safe` output is saved to `.sisyphus/evidence/rollback-to-pep-learning-tabs/task-3-validate-all-safe.txt` and exits 0 before claiming success.
  - [ ] `npx playwright test tests/content/pep-learning-tabs.spec.js --project=chromium` output is saved to `.sisyphus/evidence/rollback-to-pep-learning-tabs/task-3-playwright-tabs.txt` and exits 0 before claiming success.

  **QA Scenarios**:
  ```
  Scenario: Happy path — TAB code and PEP data are present
    Tool: Bash
    Steps: Search `src/modules/progress.js` for `KNOWN_TEXTBOOK_ORDER`, `TEXTBOOK_TAB_LABELS`, `progress-textbook-tabs`, `data-textbook-tab`, and `data-testid="learning-card"`; search `src/data/achievementsData.json` for the four PEP volume IDs.
    Expected: All required symbols and IDs are present.
    Evidence: .sisyphus/evidence/rollback-to-pep-learning-tabs/task-3-progress-symbols.txt and task-3-pep-data.txt

  Scenario: Failure/edge — UI still lacks 8 tabs after reset
    Tool: Playwright
    Steps: Run `npx playwright test tests/content/pep-learning-tabs.spec.js --project=chromium`.
    Expected: Test exits 0; if it fails, stop and report exact failure because rollback target is insufficient.
    Evidence: .sisyphus/evidence/rollback-to-pep-learning-tabs/task-3-playwright-tabs.txt
  ```

  **Commit**: NO | Message: N/A | Files: [evidence files only]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE before the plan may be marked complete.
> Rejection or reviewer feedback -> fix -> re-run the rejected review(s) -> require ALL APPROVE.
- [ ] F1. Rollback Target Audit — oracle
- [ ] F2. Code/Data Presence Review — unspecified-high
- [ ] F3. Real Browser QA — unspecified-high (+ playwright)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- No commits.
- No push.
- This plan intentionally changes working tree/HEAD by resetting to an existing commit.

## Success Criteria
- Main workspace HEAD is `f840fc5`.
- Four PEP textbooks remain processed in runtime data.
- 学习 module contains TAB-per-textbook code.
- Targeted Playwright confirms the learning-tabs UI.
