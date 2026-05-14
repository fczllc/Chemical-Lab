# 完成“反应配对完成”游戏内容

## TL;DR
> **Summary**: 完成现有 `reaction` / “反应配对”小游戏的教材成果内容、完成态反馈和可验证 QA。不得新建“反应配置”玩法，也不得直接导入原始教材 markdown。
> **Deliverables**:
> - 反应配对游戏使用已审核/已运行时提升的仓库内教材成果反应内容
> - “反应配对完成”完成态展示明确成绩、教材知识点、进度反馈
> - 专门 Playwright 完成态/错误态测试与 agent 生成证据
> - 数据校验、化学标记校验、构建、定向 Playwright 全部通过
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Tasks 2/3/4 → Task 5 → Final Verification

## Context
### Original Request
用户请求：“现在游戏的‘反应配置完成’内容还有处理，请根据教材成果完成这个游戏内容”。

### Interview Summary
- 用户确认“教材成果”指仓库内已有成果，不等待外部材料。
- 探索发现仓库内没有精确字符串“反应配置完成”；现有小游戏是 `reaction` / “反应配对”，完成标题为“反应配对完成”。用户确认按“反应配对完成”处理。
- 用户选择验证策略：自动化 + 手工 QA。

### Metis Review (gaps addressed)
- 默认权威来源：`src/data/reactions.*` 中已运行时提升的反应记录 + 现有 reviewed/source metadata 约束；冲突时以运行时数据边界 `src/data/index.js` 导出的 reviewed/promoted 内容为准。
- 默认完成规模：至少覆盖一次完整 5 题游戏会话；若 reviewed/promoted 反应超过 5 条，游戏可抽样但测试必须能确定性完成。
- 手工 QA 定义：agent 执行的真实浏览器流程，输出截图/trace/console/checklist 到 `.sisyphus/evidence/`，不要求人工主观确认。

## Work Objectives
### Core Objective
把现有反应配对小游戏补齐为可交付的教材成果游戏内容：内容来自仓库内 reviewed/runtime-promoted 反应数据，玩法保持现有配对模式，完成态准确呈现“反应配对完成”，并通过自动化与真实浏览器 QA 证明。

### Deliverables
- 反应配对内容数据补齐/规范化：可支持完整游戏会话，含反应名、反应物、产物、教材/课程标签、说明。
- 游戏运行逻辑补强：确定性测试钩子、错误选择反馈、空/不足数据降级提示。
- 完成态 UI：精确标题“反应配对完成”，展示得分、正确配对数、教材知识点/反应摘要、进度/成就提示。
- Playwright 测试：新建或更新专门反应完成态 spec，覆盖 happy path、错误选择、重启/进度保存。
- Evidence：所有任务输出命令日志、截图或 trace 到 `.sisyphus/evidence/`。

### Definition of Done (verifiable conditions with commands)
- `npm run validate:data` exits `0`.
- `npm run validate:chem-notation` exits `0`.
- `npm run build` exits `0`.
- `npx playwright test tests/ui/reaction-game-completion.spec.ts` exits `0`.
- Completion-state evidence exists at `.sisyphus/evidence/task-5-reaction-completion.png` and `.sisyphus/evidence/task-5-reaction-completion-trace.zip` or equivalent Playwright trace artifact.

### Must Have
- Preserve game key `reaction` and storage/achievement key `game-reaction`.
- Preserve exact completion heading text `反应配对完成`.
- Use only in-repo reviewed/runtime-promoted教材成果; do not use external chemistry sources.
- Keep implementation within existing vanilla JS/Vite patterns.
- QA scenarios must be executable by agents with commands/selectors.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- MUST NOT rename the game to “反应配置完成”.
- MUST NOT create a separate new “reaction configuration” game.
- MUST NOT directly import/read raw textbook markdown from runtime modules.
- MUST NOT redesign storage, achievements, router, learning path architecture, or the full games framework.
- MUST NOT add vague subjective acceptance criteria such as “looks good” without binary checks.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + existing Playwright and validation scripts.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.
- Required command sequence after implementation tasks:
  1. `npm run validate:data`
  2. `npm run validate:chem-notation`
  3. `npm run build`
  4. `npx playwright test tests/ui/reaction-game-completion.spec.ts`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. This plan is intentionally smaller because the request is bounded to one game and its data/test surface.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 (content/data contract foundation)
Wave 2: Tasks 2, 3, 4 (metadata, gameplay, completion UI; Task 3/4 depend on Task 1 outputs but can be split after data contract is fixed)
Wave 3: Task 5 (automated QA) and Task 6 (agent manual QA/evidence consolidation)

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2, 3, 4, 5.
- Task 2 blocks Task 5 only.
- Task 3 blocks Tasks 4 and 5.
- Task 4 blocks Task 5.
- Task 5 blocks Task 6.
- Task 6 blocks Final Verification.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 1 task → `deep`
- Wave 2 → 3 tasks → `quick`, `unspecified-high`, `visual-engineering`
- Wave 3 → 2 tasks → `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Establish reviewed reaction content contract for the game

  **What to do**: Audit the runtime reaction data that is already exported through `src/data/index.js`. Define the game-usable subset as records that have all of: stable `id`, non-empty `name`, `reactants[]`, `products[]`, displayable `description`, `curriculumTags[]`, and reviewed/promoted source status where present. If the current validators do not reject insufficient reaction-game data, extend the existing supporting-data validator so `npm run validate:data` fails when fewer than 5 game-usable reactions exist or when a reaction used by the game has empty reactants/products.
  **Must NOT do**: Do not import raw textbook markdown, do not create a separate content pipeline, do not use external chemistry sources, and do not mark draft-only textbook content as runtime-visible.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: requires careful source-authority decisions across data, textbook plans, validators, and runtime exports.
  - Skills: [] - No special runtime skill needed; follow existing repo patterns.
  - Omitted: [`frontend-design`] - This task is data/validation, not UI.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2, 3, 4, 5] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/data/index.js:1-38` - Runtime data boundary; app modules should consume canonical exports from here.
  - Pattern: `src/data/reactions.json:3-226` - Existing core reaction record shape.
  - Pattern: `src/data/reactions.json:227` - Textbook-promoted reaction records begin here per exploration.
  - Pattern: `src/data/reactions.js` - JS mirror of core reaction records; keep in sync if the repo still consumes both forms.
  - Validator: `scripts/validate-supporting-data.mjs` - Extend existing cross-link validation rather than adding an unrelated validator.
  - Guardrail: `.sisyphus/plans/textbook-ingestion-workflow.md:20-24` - Runtime data must be reviewed/exported through data boundary.
  - Guardrail: `.sisyphus/plans/textbook-ingestion-workflow.md:55-70` - No raw imports or auto-promotion.
  - Guardrail: `.sisyphus/plans/promote-processed-textbooks-to-runtime.md:61-78` and `202-220` - Runtime promotion targets and reviewed-manifest workflow.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run validate:data` exits `0` with at least 5 game-usable reaction records.
  - [ ] If a temporary local mutation removes all `products` from one game-usable reaction, `npm run validate:data` fails with a clear message mentioning the affected reaction id; revert the temporary mutation before completing the task.
  - [ ] No runtime source file imports from `src/data/textbooks/**` or raw textbook markdown.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Reviewed reaction subset validates
    Tool: Bash
    Steps: Run `npm run validate:data`.
    Expected: Exit code 0; output contains no reaction-game data errors.
    Evidence: .sisyphus/evidence/task-1-validate-data.txt

  Scenario: Missing products are rejected
    Tool: Bash
    Steps: Temporarily remove `products` from one game-usable reaction, run `npm run validate:data`, capture output, then revert the temporary change.
    Expected: Exit code non-zero during the temporary mutation; error names the reaction id and missing products.
    Evidence: .sisyphus/evidence/task-1-invalid-reaction.txt
  ```

  **Commit**: NO | Message: `feat(data): validate reaction pairing content` | Files: [`src/data/reactions.json`, `src/data/reactions.js`, `scripts/validate-supporting-data.mjs`]

- [x] 2. Complete reaction-game metadata and unlock copy without changing keys

  **What to do**: Ensure `src/data/contentMeta.js` describes the reaction game as a textbook成果 “反应配对” activity with child-friendly Chinese copy, clear scoring, and references to the reviewed reaction data. Keep `GAME_KEYS.reaction` and any existing `GAME_META.reaction` identity stable. Verify learning path and achievement references still point to `game-reaction`; update only copy/description if needed, not ids.
  **Must NOT do**: Do not rename `reaction`, do not rename `game-reaction`, do not add a new unlock stage, and do not modify unrelated games.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: bounded metadata/copy update with key-preservation guardrails.
  - Skills: [] - No special skill needed.
  - Omitted: [`frontend-design`] - Metadata copy only; visual treatment is Task 4.

  **Parallelization**: Can Parallel: YES after Task 1 | Wave 2 | Blocks: [5] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/data/contentMeta.js:114-119` - Game key conventions.
  - Pattern: `src/data/contentMeta.js:156-171` - Existing reaction game metadata.
  - Pattern: `src/data/learningPath.js:146-179` - Stage 4 unlocks `game-reaction`.
  - Pattern: `src/data/achievementsData.js:173-188` - `反应专家` uses `game-reaction` threshold.
  - Pattern: `src/modules/achievements.js:59-103` - Achievement condition matching for game scores.
  - Product requirement: `原始需求.txt:211-234` - Required game modules.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `grep`/search confirms `GAME_KEYS.reaction` or equivalent key remains `reaction`.
  - [ ] `grep`/search confirms `game-reaction` remains in learning path and achievement data.
  - [ ] `npm run validate:data` exits `0` after metadata changes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Metadata validates and key is preserved
    Tool: Bash
    Steps: Run `npm run validate:data` and search for `game-reaction` references in data files.
    Expected: Exit code 0; `game-reaction` still appears in content/unlock/achievement references.
    Evidence: .sisyphus/evidence/task-2-metadata-validation.txt

  Scenario: No accidental new game key
    Tool: Bash
    Steps: Search source for `反应配置` and any new `game-reaction-config` style key.
    Expected: No new runtime game key for “反应配置”; user-facing copy may mention only “反应配对”.
    Evidence: .sisyphus/evidence/task-2-no-new-key.txt
  ```

  **Commit**: NO | Message: `chore(content): clarify reaction pairing metadata` | Files: [`src/data/contentMeta.js`, `src/data/learningPath.js`, `src/data/achievementsData.js`]

- [x] 3. Harden reaction matching gameplay for textbook-rich content and deterministic QA

  **What to do**: Update `src/modules/games.js` reaction flow to use the validated game-usable reaction subset from Task 1. Keep the existing matching interaction, but add deterministic non-visual selectors/data attributes: `data-reaction-id` on each reactant row/chip, `data-reaction-product` on each product choice, `data-reaction-result="correct|incorrect"` on feedback status, and `data-testid="reaction-board"` on the board container. If fewer than 5 game-usable reactions are available at runtime despite validation, render a clear Chinese fallback message inside the game frame and do not crash. Wrong selections must show child-friendly feedback and must not increment matched count or complete the game.
  **Must NOT do**: Do not change the game key, timer model, storage API, or other mini-games. Do not make tests depend on random order.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: modifies core gameplay flow and must preserve integrations.
  - Skills: [] - No special skill needed.
  - Omitted: [`threejs-animation`] - No 3D/animation work required.

  **Parallelization**: Can Parallel: YES after Task 1 | Wave 2 | Blocks: [4, 5] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/games.js:235-264` - Existing `launchGame('reaction')` dispatch.
  - Pattern: `src/modules/games.js:649-681` - `startReactionGame()` samples reactions and starts timer.
  - Pattern: `src/modules/games.js:683-747` - `renderReactionGame()` renders reactants/products.
  - Pattern: `src/modules/games.js:758-778` - `handleReactionSelection()` scoring behavior.
  - Pattern: `src/modules/games.js:803-891` - Collector wall game rendering style for content-rich cards.
  - UI shell: `index.html:149-153` - Reaction game card uses `data-game="reaction"`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Opening `[data-game="reaction"]` renders an element matching `[data-testid="reaction-board"]`.
  - [ ] At least 5 game-usable reactions can be represented in one complete session.
  - [ ] Incorrect product selection does not increment score or completion count.
  - [ ] Runtime insufficient-data path renders a clear fallback message rather than throwing an uncaught exception.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Reaction board exposes deterministic selectors
    Tool: Playwright
    Steps: Open app, click `[data-game="reaction"]`, wait for `[data-testid="reaction-board"]`, collect `[data-reaction-id]` and `[data-reaction-product]` counts.
    Expected: Board visible; reactant/product selector counts are each >= 5 for a full session.
    Evidence: .sisyphus/evidence/task-3-reaction-board.png

  Scenario: Wrong match does not complete
    Tool: Playwright
    Steps: Click a reactant and a product whose `data-reaction-product` does not match that row's expected product; read `[data-reaction-result]` and score text.
    Expected: Feedback is `incorrect`; score remains unchanged; no `反应配对完成` heading appears.
    Evidence: .sisyphus/evidence/task-3-wrong-match.png
  ```

  **Commit**: NO | Message: `feat(games): harden reaction pairing flow` | Files: [`src/modules/games.js`]

- [x] 4. Complete the “反应配对完成” result experience

  **What to do**: Enhance the existing completion rendering so finishing all required matches shows exact heading `反应配对完成`, score, matched count, best-score/progress note, and a short textbook成果 summary drawn from the matched reactions (for example: reaction names, core products, and curriculum tags). Add/adjust CSS only in the existing relevant style files used by games; keep the visual direction playful/toy-like and Chinese-first, but avoid broad redesign. Ensure completion still calls `updateGameScore('game-reaction', score)` through the existing path.
  **Must NOT do**: Do not require manual user confirmation, do not change storage schema, do not create a separate modal system, and do not rename title text.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: user-facing completion content and styling require polished UI details.
  - Skills: [`frontend-design`] - Use to make the result state distinctive while respecting existing UI.
  - Omitted: [`threejs-animation`] - No Three.js animation needed.

  **Parallelization**: Can Parallel: YES after Tasks 1 and 3 | Wave 2 | Blocks: [5] | Blocked By: [1, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/games.js:780-801` - Existing `finishReactionGame()` and completion title.
  - Pattern: `src/modules/storage.js:927-960` - `updateGameScore(gameKey, score)` persistence path.
  - Pattern: `src/modules/progress.js:184-307` - Dashboard consumes persisted metrics.
  - Pattern: `src/modules/lab.js:639-718` - Detail content renderer style for chemistry descriptions.
  - Pattern: `src/modules/chemNotation.js:153-210` - Shared formula/equation helpers if formulas must be displayed.
  - Shell: `index.html:132-174` - Game center card layout and style context.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Completing all matches shows exact visible text `反应配对完成`.
  - [ ] Completion view includes score, matched count, and at least one matched reaction summary.
  - [ ] Local storage state records/retains `gameScores['game-reaction']` via existing storage path.
  - [ ] Completion styling does not introduce horizontal overflow at 390px viewport width.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Completion screen presents textbook成果 summary
    Tool: Playwright
    Steps: Complete all reaction matches using deterministic selectors, wait for heading text `反应配对完成`, screenshot the result view.
    Expected: Heading visible; score and matched count visible; at least one reaction name/product summary visible.
    Evidence: .sisyphus/evidence/task-4-completion-summary.png

  Scenario: Mobile-width completion has no overflow
    Tool: Playwright
    Steps: Set viewport to 390x844, complete the game, measure `document.documentElement.scrollWidth <= window.innerWidth`.
    Expected: Expression is true; completion content remains readable.
    Evidence: .sisyphus/evidence/task-4-mobile-completion.png
  ```

  **Commit**: NO | Message: `feat(games): complete reaction pairing result state` | Files: [`src/modules/games.js`, `src/styles/*.css`]

- [x] 5. Add dedicated automated coverage for reaction completion and failure paths

  **What to do**: Create `tests/ui/reaction-game-completion.spec.ts`. Use existing Playwright setup. Test must open the app, click `[data-game="reaction"]`, complete all matches deterministically using `data-reaction-id` / `data-reaction-product`, assert exact heading `反应配对完成`, assert score persistence under `game-reaction`, capture screenshot to `.sisyphus/evidence/task-5-reaction-completion.png`, and cover an incorrect-match path. If trace capture is configured globally, retain trace artifact; otherwise explicitly attach screenshot and console output to evidence.
  **Must NOT do**: Do not write brittle tests that depend on shuffled visual order or fixed nth-child positions. Do not skip assertions because selectors are missing; add selectors in Task 3 instead.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: requires test design around randomized gameplay and storage assertions.
  - Skills: [] - Native Playwright repo patterns are sufficient.
  - Omitted: [`frontend-design`] - Test implementation only.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [6] | Blocked By: [2, 3, 4]

  **References** (executor has NO interview context - be exhaustive):
  - Test pattern: `playwright.config.ts` - Playwright config, base URL, project settings.
  - Test pattern: `tests/setup/global-setup.ts` and `tests/setup/global-teardown.ts` - Vite lifecycle.
  - Test pattern: `tests/ui/games-layout.spec.ts` - Existing game-launch coverage including reaction board.
  - Test pattern: `tests/content/chem-notation.spec.ts:73-96` - Existing sodium-water reaction matching smoke.
  - Test pattern: `tests/ui/storage-migration.spec.ts` - Storage/evidence conventions.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/reaction-game-completion.spec.ts` exits `0`.
  - [ ] Test asserts exact text `反应配对完成`.
  - [ ] Test verifies wrong match does not complete game.
  - [ ] Test verifies `game-reaction` score is persisted or improved in localStorage/app state.
  - [ ] Evidence screenshot exists at `.sisyphus/evidence/task-5-reaction-completion.png`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Automated happy path completion
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/reaction-game-completion.spec.ts --grep "completes reaction pairing"`.
    Expected: Exit code 0; screenshot saved; completion heading asserted exactly.
    Evidence: .sisyphus/evidence/task-5-reaction-completion.txt

  Scenario: Automated wrong-match guard
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/reaction-game-completion.spec.ts --grep "rejects incorrect reaction pairing"`.
    Expected: Exit code 0; no completion heading after wrong match; score unchanged.
    Evidence: .sisyphus/evidence/task-5-wrong-match.txt
  ```

  **Commit**: NO | Message: `test(games): cover reaction pairing completion` | Files: [`tests/ui/reaction-game-completion.spec.ts`, `src/modules/games.js`]

- [x] 6. Run full agent QA sequence and consolidate evidence

  **What to do**: Execute the required validation/build/Playwright sequence, then run a real browser manual-style QA pass through the game: open game center, start reaction game, intentionally choose one wrong product, complete all matches, confirm completion, restart or revisit the game, confirm progress is not corrupted. Save command outputs and QA notes under `.sisyphus/evidence/`.
  **Must NOT do**: Do not mark complete based on visual inspection alone. Do not require the user to manually test.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: requires end-to-end verification and evidence collection.
  - Skills: [] - Use existing Bash/Playwright workflow.
  - Omitted: [`git-master`] - No git operation requested.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [Final Verification] | Blocked By: [5]

  **References** (executor has NO interview context - be exhaustive):
  - Commands: `package.json` - Existing npm scripts for validation and build.
  - Evidence pattern: `.sisyphus/evidence/` - Existing logs/screenshots/manual QA artifacts.
  - Runtime state: `src/modules/storage.js:20-36` - App state shape includes `gameScores`.
  - Storage: `src/modules/storage.js:337-355` - Serialization path.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run validate:data` exits `0`; output saved to `.sisyphus/evidence/task-6-validate-data.txt`.
  - [ ] `npm run validate:chem-notation` exits `0`; output saved to `.sisyphus/evidence/task-6-validate-chem-notation.txt`.
  - [ ] `npm run build` exits `0`; output saved to `.sisyphus/evidence/task-6-build.txt`.
  - [ ] `npx playwright test tests/ui/reaction-game-completion.spec.ts` exits `0`; output saved to `.sisyphus/evidence/task-6-playwright-reaction.txt`.
  - [ ] Manual-style QA notes include wrong-match, completion, progress persistence, and restart/revisit checks.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full command verification
    Tool: Bash
    Steps: Run required commands in order: `npm run validate:data`, `npm run validate:chem-notation`, `npm run build`, `npx playwright test tests/ui/reaction-game-completion.spec.ts`.
    Expected: Every command exits 0; outputs are saved to task-6 evidence files.
    Evidence: .sisyphus/evidence/task-6-command-summary.txt

  Scenario: Real browser manual-style flow
    Tool: Playwright
    Steps: Use browser automation to click `[data-game="reaction"]`, make one wrong match, finish all correct matches, screenshot completion, reload/revisit game center, inspect `game-reaction` score.
    Expected: Wrong match feedback appears; completion heading appears after all correct matches; score persists after reload/revisit.
    Evidence: .sisyphus/evidence/task-6-manual-qa.txt
  ```

  **Commit**: NO | Message: `test(games): verify reaction pairing delivery` | Files: [`.sisyphus/evidence/*`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit only if user explicitly requests it after implementation and verification.
- Suggested commit message if requested: `feat(games): complete reaction pairing content`
- Do not include `.sisyphus/evidence/` in commit unless user explicitly asks for evidence artifacts to be tracked.

## Success Criteria
- Existing reaction card opens the same `reaction` game route/frame.
- At least one complete game session can be played using in-repo reviewed/runtime-promoted reaction content.
- Completion screen shows exact text `反应配对完成` and records `game-reaction` score.
- Wrong match path is visible and does not falsely complete the game.
- Validation, build, and targeted Playwright commands exit `0`.
