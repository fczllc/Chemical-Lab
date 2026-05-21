# Experiment Achievement 92 Alignment

## TL;DR
> **Summary**: Align experiment achievements and progress totals with the current 92 canonical lab experiments instead of the old 5-experiment model.
> **Deliverables**:
> - Experiment achievement thresholds become `1, 5, 20, 50, 92`.
> - Existing `1` and `5` achievement IDs are preserved.
> - Progress experiment denominator derives from `labExperiments.length`.
> - Validators/build confirm data consistency.
> **Effort**: Short
> **Parallel**: NO
> **Critical Path**: Task 1 → Task 2 → Final Verification Wave

## Context
### Original Request
用户发现实验室模块有 92 个实验，但成就模块实验分类只有 2 个成就，并询问为什么这样设计。确认原因是旧版 5 个精选实验设计残留后，用户说“好，按这个改”。

### Interview Summary
- 实验室当前 canonical 数据量是 92 条。
- 成就实验分类不应继续只覆盖 1/5 两档。
- 进度模块不应继续硬编码 `TOTAL_EXPERIMENTS = 5`。
- 用户认可建议阈值：`1, 5, 20, 50, 92`。

### Metis Review (gaps addressed)
- 保留已有成就 ID，避免已有用户已解锁成就丢失：`achievement-first-experiment` 保持 1 档，`achievement-lab-safety` 保持 5 档。
- 新增 20/50/92 三档成就，不做 storage migration。
- 不重构成就系统；现有 `completedExperiments.size >= condition.count` 已支持任意阈值。
- 进度 denominator 必须来自 `labExperiments.length`，不要再硬编码 92 或 5。

## Work Objectives
### Core Objective
Make Achievements and Progress accurately represent the 92-experiment Lab module.

### Deliverables
- Update `src/data/achievementsData.json` experiment achievements.
- If `src/data/achievementsData.js` remains as a repo mirror, update it consistently or document why it is obsolete.
- Update `src/modules/progress.js` to derive experiment total from canonical `labExperiments.length`.
- Update any tests/validators that assume exactly 2 experiment achievements or total 5 experiments.

### Definition of Done (verifiable conditions with commands)
- `node scripts/validate-supporting-data.mjs` exits `0`.
- `node scripts/validate-lab-experiments.mjs` exits `0` and reports/accepts 92 lab records.
- `npm run build` exits `0`.
- A focused Node assertion confirms experiment achievement thresholds are `[1, 5, 20, 50, 92]` and lab total is `92`.

### Must Have
- Exactly five experiment-category achievements.
- Experiment achievement `condition.count` values sorted ascending equal `[1, 5, 20, 50, 92]`.
- Existing IDs preserved:
  - `achievement-first-experiment` remains count `1`.
  - `achievement-lab-safety` remains count `5`.
- No experiment achievement copy says `完成全部 5 个实验`.
- `src/modules/progress.js` has no hardcoded `TOTAL_EXPERIMENTS = 5`.
- Progress experiment percentage uses canonical `labExperiments.length`.

### Must NOT Have
- Do not change `completedExperiments` storage format.
- Do not change `markExperimentCompleted(experimentId)`.
- Do not edit `src/data/labExperiments.json` experiment content.
- Do not add a new achievement engine, migration, UI redesign, badge animation, or new category.
- Do not hardcode `92` in progress module logic.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after/data validators; existing condition logic already supports counts.
- QA policy: Each implementation task includes command-based checks.
- Evidence: `.sisyphus/evidence/experiment-achievement-92-alignment-validation.txt`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 `[quick]` — Update achievement data thresholds/copy.
Wave 2: Task 2 `[quick]` — Update progress denominator and verification assumptions.
Final Wave: F1-F4 review agents in parallel.

### Dependency Matrix (full, all tasks)
| Task | Blocks | Blocked By |
| --- | --- | --- |
| 1. Update experiment achievement thresholds | 2, F1-F4 | none |
| 2. Derive progress experiment total from lab data | F1-F4 | 1 |
| F1-F4 | completion | 1, 2 |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Count | Categories |
| --- | --- | --- |
| 1 | 1 | quick |
| 2 | 1 | quick |
| Final | 4 | oracle, unspecified-high, unspecified-high, deep |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Update experiment achievement thresholds and copy

  **What to do**:
  1. Edit `src/data/achievementsData.json` experiment-category achievements.
  2. Preserve and update existing achievements:
     - `achievement-first-experiment`: keep `condition.count: 1`; title can remain `实验室新手`; copy should say completing 1 experiment.
     - `achievement-lab-safety`: keep ID, set/keep `condition.count: 5`; update title/copy so it means a 5-experiment milestone, not “全部 5 个实验”. Recommended title: `实验观察员`; recommended unlockText: `完成 5 个实验`.
  3. Add three experiment-category achievements after the 5-count item:
     - `achievement-experiment-assistant`: title `实验小助手`, rarity `rare`, condition `{ type: "completedExperiments", count: 20 }`, unlockText `完成 20 个实验`.
     - `achievement-experiment-researcher`: title `实验研究员`, rarity `rare`, condition `{ type: "completedExperiments", count: 50 }`, unlockText `完成 50 个实验`.
     - `achievement-experiment-master`: title `实验大师`, rarity `legendary`, condition `{ type: "completedExperiments", count: 92 }`, unlockText `完成全部 92 个实验`.
  4. Use existing experiment icon style unless there is a clear local pattern:
     - 1: `flask-conical`
     - 5: `shield`
     - 20: `microscope`
     - 50: `clipboard-check`
     - 92: `trophy`
  5. Set `curriculumTags` exactly to `['g10-redox-valence-change']`, matching existing experiment achievements.
  6. If `src/data/achievementsData.js` is still present as a maintained mirror, update the same five experiment achievements there. If runtime only imports JSON via `src/data/index.js`, still keep the mirror consistent because it is repo data and may be used by scripts.
  7. Search and update tests/validators that assume only two experiment achievements if present.

  **Must NOT do**:
  - Do not rename `achievement-first-experiment`.
  - Do not remove `achievement-lab-safety` ID unless adding migration, which is out of scope.
  - Do not edit lab experiment records.
  - Do not create per-experiment achievements for all 92 experiments.

  **Recommended Agent Profile**:
  - Category: `quick` - data-only threshold/copy update.
  - Skills: [] - no special skill needed beyond validators.
  - Omitted: [`frontend-design`] - no visual design change.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Task 2, F1-F4 | Blocked By: none

  **References**:
  - Data: `src/data/achievementsData.json:71-104` - current experiment achievements.
  - Mirror: `src/data/achievementsData.js` - keep consistent if retained.
  - Logic: `src/modules/achievements.js:152-154` - completed experiment conditions already use count thresholds.
  - Canonical lab count: `src/data/labExperiments.json` - 92 records.

  **Acceptance Criteria**:
  - [ ] Experiment achievement counts sorted equal `[1, 5, 20, 50, 92]`.
  - [ ] Exactly five achievements have `category: "experiment"`.
  - [ ] Existing IDs `achievement-first-experiment` and `achievement-lab-safety` still exist.
  - [ ] No experiment achievement text contains `全部 5 个实验`.
  - [ ] `node scripts/validate-supporting-data.mjs` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Experiment achievement data matches 92-lab milestone design
    Tool: Bash / node
    Steps:
      1. Load `src/data/achievementsData.json` and filter category `experiment`.
      2. Assert count is 5.
      3. Assert sorted condition counts equal [1, 5, 20, 50, 92].
      4. Assert preserved IDs exist.
      5. Assert no title/description/unlockText contains "全部 5 个实验".
    Expected: All assertions pass.
    Evidence: .sisyphus/evidence/experiment-achievement-thresholds.txt
  ```

  **Commit**: NO | Message: `fix(achievements): align experiment milestones with lab count` | Files: `src/data/achievementsData.json`, `src/data/achievementsData.js`, relevant tests/validators

- [x] 2. Derive progress experiment total from canonical lab data

  **What to do**:
  1. In `src/modules/progress.js`, import `labExperiments` from `../data/index.js` alongside existing data imports.
  2. Replace `const TOTAL_EXPERIMENTS = 5;` with a derived total, e.g. `const TOTAL_EXPERIMENTS = labExperiments.length;`.
  3. Ensure existing progress calculations continue to use `completedExperiments.size / TOTAL_EXPERIMENTS`.
  4. Search for other `TOTAL_EXPERIMENTS = 5`, `完成全部 5 个实验`, or hardcoded experiment total assumptions and update only directly related code/tests.
  5. Run focused data checks and validators.

  **Must NOT do**:
  - Do not hardcode `92` in `progress.js`.
  - Do not count invalid/stale completed experiment IDs unless existing code already does; if discovered, document as optional follow-up rather than expanding scope.
  - Do not change layout or progress UI design.

  **Recommended Agent Profile**:
  - Category: `quick` - one module constant/import update plus validation.
  - Skills: [] - no special skill needed.
  - Omitted: [`frontend-design`] - no UI redesign.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: F1-F4 | Blocked By: Task 1

  **References**:
  - Progress: `src/modules/progress.js:20` - stale hardcoded total.
  - Progress calculations: `src/modules/progress.js:281` - experiment percent uses total.
  - Data export: `src/data/index.js:38` - exports `labExperiments`.
  - Validator command list: `AGENTS.md` - required data validators.

  **Acceptance Criteria**:
  - [ ] `src/modules/progress.js` imports `labExperiments` from `../data/index.js`.
  - [ ] `src/modules/progress.js` no longer contains `TOTAL_EXPERIMENTS = 5`.
  - [ ] `TOTAL_EXPERIMENTS` derives from `labExperiments.length`.
  - [ ] `node scripts/validate-lab-experiments.mjs` exits `0`.
  - [ ] `node scripts/validate-supporting-data.mjs` exits `0`.
  - [ ] `npm run build` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Progress denominator follows canonical lab experiment count
    Tool: Bash / grep / node
    Steps:
      1. Assert `src/modules/progress.js` contains an import/use of `labExperiments`.
      2. Assert `src/modules/progress.js` does not contain `TOTAL_EXPERIMENTS = 5`.
      3. Load `src/data/labExperiments.json` and assert length is 92.
      4. Run lab/supporting validators and build.
    Expected: Progress total is data-derived and validators/build pass.
    Evidence: .sisyphus/evidence/experiment-progress-total.txt
  ```

  **Commit**: NO | Message: `fix(progress): derive experiment total from lab data` | Files: `src/modules/progress.js`, relevant tests/validators

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI verification needed)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Do not commit unless explicitly requested.
- If committing later, stage only relevant data/source/test/evidence files.

## Success Criteria
- Lab module count remains 92.
- Experiment achievements show 5 milestones: 1, 5, 20, 50, 92.
- Progress experiment denominator is 92 via `labExperiments.length`.
- No user-facing copy claims all experiments are 5.
- Required validators and build pass.
