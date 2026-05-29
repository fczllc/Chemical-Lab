# Undo Last Workspace Commit For Testing

## TL;DR
> **Summary**: Undo only the latest commit `1337746 chore(workspace): commit remaining changes`, returning the main workspace HEAD to `f840fc5 feat(textbook): add PEP learning tabs` so the user can test the PEP learning-tabs state without the unconfirmed final workspace commit.
> **Deliverables**: Pre-reset safety snapshot, reset to `f840fc5`, post-reset HEAD verification.
> **Effort**: Quick
> **Parallel**: NO
> **Critical Path**: Task 1 → Task 2

## Context
- Current HEAD verified: `1337746 chore(workspace): commit remaining changes`.
- Previous commit: `f840fc5 feat(textbook): add PEP learning tabs`.
- User specifically asked to undo only the last commit first and test code, because the last commit contains many unconfirmed things.
- This plan must NOT undo `f840fc5`.

## Work Objectives
### Core Objective
Move `D:\Chemical-Laboratory` from `1337746` back to `f840fc5` by undoing only the latest commit.

### Definition of Done
- `git rev-parse --short HEAD` prints `f840fc5`.
- `git log --oneline -3` shows `f840fc5` as the top commit.
- No commit, push, rebase, or PR is created.

## TODOs

- [x] 1. Capture current state before undoing last commit

  **What to do**: From `D:\Chemical-Laboratory`, save current git state so the last commit can be recovered from reflog if needed.
  **Must NOT do**: Do not reset before saving evidence.

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/undo-last-workspace-commit/status-before.txt` contains `GIT_MASTER=1 git status --short` output.
  - [ ] `.sisyphus/evidence/undo-last-workspace-commit/log-before.txt` contains `GIT_MASTER=1 git log --oneline -5` output showing `1337746` then `f840fc5`.
  - [ ] `.sisyphus/evidence/undo-last-workspace-commit/reflog-before.txt` contains `GIT_MASTER=1 git reflog --date=iso -8` output.

  **QA Scenarios**:
  ```
  Scenario: Safety snapshot exists
    Tool: Bash
    Steps: Save status, log, and reflog before reset.
    Expected: Evidence files exist and identify `1337746` as current HEAD.
    Evidence: .sisyphus/evidence/undo-last-workspace-commit/log-before.txt
  ```

  **Commit**: NO

- [x] 2. Reset HEAD back one commit to `f840fc5`

  **What to do**: Run the reset from `D:\Chemical-Laboratory` to undo only `1337746`.
  **Command**:
  ```powershell
  cmd /c "set GIT_MASTER=1&& git reset --hard f840fc5"
  ```
  **Must NOT do**: Do not reset to `e827e48`. Do not delete untracked files. Do not push.

  **Acceptance Criteria**:
  - [ ] Reset exits 0.
  - [ ] `GIT_MASTER=1 git rev-parse --short HEAD` prints `f840fc5`.
  - [ ] `GIT_MASTER=1 git log --oneline -3` shows `f840fc5` as top commit.
  - [ ] Output is saved to `.sisyphus/evidence/undo-last-workspace-commit/reset-output.txt` and `.sisyphus/evidence/undo-last-workspace-commit/head-after.txt`.

  **QA Scenarios**:
  ```
  Scenario: Only last commit is undone
    Tool: Bash
    Steps: After reset, run `git rev-parse --short HEAD` and `git log --oneline -3`.
    Expected: HEAD is `f840fc5`; `e827e48` is below it, not HEAD.
    Evidence: .sisyphus/evidence/undo-last-workspace-commit/head-after.txt
  ```

  **Commit**: NO

## Success Criteria
- Main workspace is at `f840fc5` for user testing.
- The last commit `1337746` remains recoverable through reflog if needed.
