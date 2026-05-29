# 学习模块教材复习确认页实施计划

## TL;DR
> **Summary**: 将 `#/progress` 学习页收敛为“教材复习确认页”：只保留教材 Tab、教材卡片、教材内容弹窗和弹窗内“确定已学习”确认；移除学习页上的五阶段路径、实验/解锁/元素数量/被动进度等展示。新增兼容的学习片段确认日期持久化，卡片右下角显示 `未学习` 或 `学习确认：YYYY-MM-DD`。
> **Deliverables**:
> - `src/modules/storage.js` 新增 `learningSegmentCompletionDates` 持久化字段与读取 API，保留 `completedLearningSegments` 兼容性。
> - `src/modules/progress.js` 只渲染教材复习确认内容，不再渲染五阶段学习路径或被动统计。
> - `tests/ui/learning-content-modal.spec.ts`、`tests/content/pep-learning-tabs.spec.ts`、`tests/ui/achievements-progress-coupling.spec.ts` 更新/新增自动化覆盖。
> - 验证命令和证据输出覆盖学习确认、日期持久化、移除内容缺失、成就耦合、实验室回归。
> **Effort**: Medium
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Tasks 4-6 → Final Verification Wave

## Context

### Original Request
用户要求调整中文优先儿童化学学习应用的“学习”模块：
- 教材 Tab 下的教材卡片不应包含实验卡片，实验属于“实验室”。
- “学习”页不应包含与教材内容无关的“五阶段学习路径”、前六个元素学习项或最终“初级探索者”。
- 被动统计、进度、解锁、元素数量、探索者等级等应属于“成就”，不属于“学习”。
- 学习必须有交互确认：卡片本身点击后打开弹窗显示教材内容；弹窗里有“确定已学习”按钮；确认后记录状态和时间。
- 卡片右下角显示：未确认时 `未学习`；确认后 `学习确认：YYYY-MM-DD`。
- 当前只处理学习模块；成就页、实验室、学习流/路径的后续迁移明确不在本计划范围内。

### Interview Summary
- 已确认方案：学习页瘦身为“教材复习确认页”。
- 卡片粒度：按现有教材学习片段 `segmentId` 确认。
- 确认日期语义：首次确认日期保留；重复打开或重复确认不得覆盖原日期。
- 兼容策略：继续使用 `completedLearningSegments` 表示已完成；新增 `learningSegmentCompletionDates` 映射保存日期。
- 旧数据策略：旧用户若已有 `completedLearningSegments` 但没有日期，仍视为已学习，卡片显示 `学习确认：日期待补充`，不自动伪造历史日期。
- 非教材内容策略：不删除或重塑 `learningPath.json`；学习页只筛选/渲染具有教材来源的片段，如存在有效 `sourceVolumeId` 的片段。
- 空状态文案：`暂无教材复习内容`。

### Metis Review (gaps addressed)
- 已采用 Metis 建议：首次日期保留、兼容日期映射、稳定 `segmentId` 键、已确认弹窗不可覆盖日期、学习页范围内移除“初级探索者”、仅 UI 过滤非教材内容、保留中文优先文案。
- 已设定防线：不得修改 `src/modules/lab.js`；不得迁移成就页；不得删除/重塑 `src/data/learningPath.json`；不得在学习页重新引入百分比、解锁、元素数量、游戏、实验或成就摘要。
- 已补充验收：移除内容缺失断言、弹窗唯一确认入口、日期持久化/刷新、卡片无按钮、成就耦合继续生效、实验室回归、构建和全量安全验证。

## Work Objectives

### Core Objective
把 `#/progress` 学习页改为只面向教材复习确认的交互页面，让学生主动打开教材卡片并在弹窗中确认已学习，确认状态和首次确认日期可持久化。

### Deliverables
- `src/modules/storage.js`
  - 新增默认状态字段：`learningSegmentCompletionDates: {}`。
  - 新增导出函数：`getLearningSegmentCompletionDates()`，返回浅拷贝对象。
  - `markLearningSegmentCompleted(segmentId, metadata = {})` 在首次完成时写入本地日期 `YYYY-MM-DD`。
  - 序列化、迁移、normalize、snapshot 均包含 `learningSegmentCompletionDates`。
- `src/modules/progress.js`
  - `renderProgress()` 不再计算或渲染五阶段路径、阶段卡片、实验/游戏/功能解锁、元素数量百分比、被动统计或活动流。
  - 只渲染教材复习确认区域；若没有教材片段显示 `暂无教材复习内容`。
  - 教材片段筛选为有有效 `sourceVolumeId` 的 `manualReviewAfterPromotion` 片段。
  - 卡片右下角状态为 `未学习` 或 `学习确认：YYYY-MM-DD` / `学习确认：日期待补充`。
  - 弹窗按钮文字改为 `确定已学习`，只出现在弹窗里。
- Playwright 测试更新：学习弹窗、教材 Tab、成就耦合、实验室回归。

### Definition of Done (verifiable conditions with commands)
- `npx playwright test tests/ui/learning-content-modal.spec.ts` 通过。
- `npx playwright test tests/content/pep-learning-tabs.spec.ts` 通过。
- `npx playwright test tests/ui/achievements-progress-coupling.spec.ts` 通过。
- `npx playwright test tests/ui/lab-textbook-experiments.spec.ts` 通过。
- `npm run build` 通过。
- `npm run validate:all:safe` 通过。
- 证据文件写入 `.sisyphus/evidence/`，至少包含学习确认日期、学习页移除内容、成就耦合、实验室回归四类证据。

### Must Have
- 学习页保留 route `#/progress` 和容器 `#progress .progress-path`。
- 学习页保留 8 个教材 Tab 和非空教材卡片。
- 卡片自身可点击/键盘打开弹窗；卡片内没有按钮。
- 弹窗显示教材内容章节，并包含 `确定已学习` 按钮，仅未学习时显示。
- 打开弹窗、关闭弹窗、按 Escape 均不标记学习完成。
- 点击弹窗 `确定已学习` 后，`window.appState.completedLearningSegments` 包含该 `segmentId`，`window.appState.learningSegmentCompletionDates[segmentId]` 为本地 `YYYY-MM-DD`。
- 刷新页面后确认状态和日期保持一致。
- 手动确认仍能解锁对应 `manualReviewAfterPromotion` 成就。

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- 不修改 `src/modules/lab.js`。
- 不迁移或重构成就页。
- 不删除或改写 `src/data/learningPath.json` 的 stages、records 或教材数据。
- 不在学习页显示“五阶段学习路径”“初级探索者”、实验卡、实验数量、游戏解锁、功能解锁、元素学习数量、被动百分比、活动流或成就统计。
- 不把卡片本身变成确认按钮；卡片只负责打开弹窗。
- 不为旧数据伪造历史学习日期。
- 不新增新的 gamification、badge、level、unlock 或统计摘要。

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after using existing Playwright suite; storage schema change is verified by browser-localStorage assertions and full safe validation.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 storage confirmation-date persistence `[quick]`.

Wave 2: Task 2 learning page render simplification `[visual-engineering]`.

Wave 3: Task 3 learning modal/card confirmation UI `[visual-engineering]`.

Wave 4: Task 4 modal/date tests `[unspecified-high]`; Task 5 learning page absence/tab tests `[unspecified-high]`; Task 6 achievement/lab regression tests `[unspecified-high]`.

Final Verification Wave: F1-F4 review agents in parallel after all tasks and commands pass.

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1. Storage date persistence | none | 2, 3, 4, 6 |
| 2. Learning page render simplification | 1 | 3, 4, 5, 6 |
| 3. Card/modal confirmation UI | 1, 2 | 4, 6 |
| 4. Modal/date tests | 1, 2, 3 | Final Verification |
| 5. Learning page absence/tab tests | 2 | Final Verification |
| 6. Achievement/lab regression tests | 1, 2, 3 | Final Verification |

### Agent Dispatch Summary (wave → task count → categories)
| Wave | Task Count | Categories |
|---|---:|---|
| 1 | 1 | quick |
| 2 | 1 | visual-engineering |
| 3 | 1 | visual-engineering |
| 4 | 3 | unspecified-high |
| Final | 4 review agents | oracle, unspecified-high, unspecified-high, deep |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add compatible learning confirmation date persistence

  **What to do**:
  1. Modify `src/modules/storage.js` only.
  2. In `createDefaultState(elements = [])` around lines 20-38, add `learningSegmentCompletionDates: {}` immediately after `completedLearningSegments: new Set()`.
  3. Add a date-map normalizer for learning segments. Reuse the validation rules from `normalizeExperimentCompletionDates(value)` at lines 286-316: only keep plain-object entries whose key is a non-empty trimmed string and date matches a valid local `YYYY-MM-DD`.
  4. Keep `formatLocalDateYYYYMMDD(date = new Date())` at lines 318-323 as the date source. Do not use UTC or locale-specific date formatting.
  5. In `serializeState()` around lines 414-434, add `learningSegmentCompletionDates: { ...appState.learningSegmentCompletionDates }` immediately after `completedLearningSegments`.
  6. In `migrateV0ToV1(data)` around lines 442-459, include `learningSegmentCompletionDates: data.learningSegmentCompletionDates || {}`.
  7. In `migratePersistedEnvelope(envelope)` around lines 474-505, preserve `learningSegmentCompletionDates` for unversioned, v0, v1, v2, and current v3 payloads using the new normalizer. Do not bump `SCHEMA_VERSION`; keep `v3` because the field is additive and backwards-compatible.
  8. In `normalizePersistedData(data)` around lines 519-551, assign `learningSegmentCompletionDates: normalizeLearningSegmentCompletionDates(data.learningSegmentCompletionDates)`.
  9. In `getStateSnapshot()` around lines 637-658, add `learningSegmentCompletionDates: { ...appState.learningSegmentCompletionDates }`.
  10. Export `getLearningSegmentCompletionDates()` immediately after `getCompletedLearningSegments()` around lines 882-884. It must return `{ ...appState.learningSegmentCompletionDates }`.
  11. Update `markLearningSegmentCompleted(segmentId, metadata = {})` around lines 886-913:
      - If `segmentId` is not a string or trims empty, return `false`.
      - If `appState.completedLearningSegments` already has the normalized id, return `false` and do not create/overwrite a date.
      - Before mutating, clone both `oldSegments` and `oldDates`.
      - Add normalized id to `completedLearningSegments`.
      - Set `appState.learningSegmentCompletionDates = { ...appState.learningSegmentCompletionDates, [normalizedSegmentId]: formatLocalDateYYYYMMDD() }`.
      - Include `completedDate: appState.learningSegmentCompletionDates[normalizedSegmentId]` in `appendActivity` metadata and `emitStateChange` extra detail.
      - Keep event field as `completedLearningSegments`; do not introduce a second `statechange` event for dates.
  12. Do not change quiz, element, experiment, achievement, or game persistence semantics.

  **Must NOT do**:
  - Do not reshape `completedLearningSegments` from array/set into objects.
  - Do not overwrite existing learning dates on duplicate confirmation.
  - Do not backfill old completed segments with today's date.
  - Do not change `experimentCompletionDates` behavior.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: bounded single-file additive storage change with existing patterns.
  - Skills: [`test-driven-development`] - Use existing storage/date behavior as regression target before UI work.
  - Omitted: [`frontend-design`] - No visual design work in this task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2, 3, 4, 6] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/storage.js:20-38` - default learner state shape.
  - Pattern: `src/modules/storage.js:286-323` - local `YYYY-MM-DD` validation and formatter for experiment completion dates.
  - Pattern: `src/modules/storage.js:414-434` - persisted state serialization.
  - Pattern: `src/modules/storage.js:474-505` - version envelope migration.
  - Pattern: `src/modules/storage.js:519-551` - persisted data normalization.
  - Pattern: `src/modules/storage.js:637-658` - read-only app state snapshot exposed via `window.appState`.
  - Pattern: `src/modules/storage.js:882-913` - existing learning segment completion API.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `window.appState.learningSegmentCompletionDates` exists after app initialization and is a plain object.
  - [ ] Calling `markLearningSegmentCompleted('knowledge-topic-0001-source-section-l1-l5-bd27b23b45')` once adds the segment to `completedLearningSegments` and adds a valid `YYYY-MM-DD` date under the same key.
  - [ ] Calling `markLearningSegmentCompleted` a second time for the same segment returns `false` and keeps the original date unchanged.
  - [ ] A seeded v3 payload with `completedLearningSegments` but no `learningSegmentCompletionDates` hydrates without errors and leaves the date map empty.
  - [ ] `npm run build` exits with code 0.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: First modal confirmation stores local date
    Tool: Playwright
    Steps: Open `/`; clear localStorage/sessionStorage; reload; evaluate dynamic import of `/src/modules/storage.js`; call `markLearningSegmentCompleted('knowledge-topic-0001-source-section-l1-l5-bd27b23b45')`; inspect `window.appState.completedLearningSegments` and `window.appState.learningSegmentCompletionDates`.
    Expected: Segment is present; date matches `/^\d{4}-\d{2}-\d{2}$/`; date equals local browser date formatted as `YYYY-MM-DD`.
    Evidence: .sisyphus/evidence/task-1-learning-date-storage.json

  Scenario: Duplicate completion does not overwrite date
    Tool: Playwright
    Steps: Seed localStorage with v3 data containing `completedLearningSegments: ['knowledge-topic-0001-source-section-l1-l5-bd27b23b45']` and `learningSegmentCompletionDates: { 'knowledge-topic-0001-source-section-l1-l5-bd27b23b45': '2026-05-01' }`; load app; call `markLearningSegmentCompleted` for the same segment.
    Expected: Return value is `false`; stored date remains `2026-05-01`; no second activity entry is required.
    Evidence: .sisyphus/evidence/task-1-duplicate-date-preserved.json
  ```

  **Commit**: NO by default | Suggested Message if user explicitly requests commits: `feat(progress): persist learning confirmation dates` | Files: [`src/modules/storage.js`]

- [x] 2. Render learning page as textbook review confirmation page only

  **What to do**:
  1. Modify `src/modules/progress.js` only.
  2. Update imports at lines 2-26:
      - Keep imports required by the manual textbook flow: `achievementsData`, `curriculumTags`, `elements`, `labExperiments`, `learningPath`, `quizData`, `reactions`, `textbookAssetManifest` only if still used by exported test hooks and helper functions.
      - Add `getLearningSegmentCompletionDates` from `./storage.js`.
      - Remove imports that become unused after `renderProgress()` simplification only if no remaining helper/test hook references need them.
  3. Keep exported `__progressTestHooks` at lines 105-114 stable unless a referenced helper is actually removed. Prefer leaving existing helper functions in place to avoid broad refactors.
  4. Update `getManualLearningSegments(unlockedAchievements, completedLearningSegments)` around lines 116-138:
      - Add optional third parameter `learningSegmentCompletionDates = {}`.
      - Exclude any mapped segment whose `sourceVolumeId` is empty after trimming. This is the deterministic “教材来源” filter.
      - Include `completionDate: learningSegmentCompletionDates[segmentId] || ''` on returned segment objects.
  5. Update `renderProgress()` around lines 570-625:
      - Keep `const container = document.querySelector('#progress .progress-path');` and null guard.
      - Keep `readAchievementActionFocus();` so achievement navigation focus still works.
      - Read only `unlockedAchievements`, `completedLearningSegments`, and `learningSegmentCompletionDates` for rendering.
      - Set `container.innerHTML = renderManualLearningSection(unlockedAchievements, completedLearningSegments, learningSegmentCompletionDates);`.
      - Remove rendering of `<section class="progress-learning-path hud-shell">`, `五阶段学习路径`, `renderStageCard`, `renderStageDetail`, and all stage progress markup from the learning page.
      - Replace `bindStageInteractions();` with `bindLearningInteractions();`.
  6. Rename `bindStageInteractions()` around line 653 to `bindLearningInteractions()` and delete only the `[data-stage-select]` binding block at lines 654-659. Keep textbook tab, card, modal close, modal backdrop, Escape key, confirm, and focus logic.
  7. Update `renderManualLearningSection(...)` around lines 930-979:
      - Accept `learningSegmentCompletionDates` and pass it to `getManualLearningSegments`.
      - If no manual segments remain after textbook-source filtering, return a visible shell containing the exact Chinese text `暂无教材复习内容`.
      - Keep the heading Chinese-first; change `<h4>教材片段学习</h4>` to `<h4>教材复习确认</h4>`.
      - The header count may remain as `${manualSegments.length} 个片段`; this is active content count, not passive progress.
      - In each textbook tab, remove or replace `<span class="textbook-tab-progress">${group.completed}/${group.total}</span>` because it is a passive progress count. Use a neutral count label `共 ${group.total} 节` if a count is needed. Do not show completed/total.
  8. Leave `renderStageCard`, `renderStageDetail`, `getStageStates`, `computeStageCurriculum`, and related helpers in the file if they are still used by test hooks or other modules; unused cleanup is optional only if no tests or imports break. The required behavior is that they are not rendered on `#/progress`.
  9. Keep `selectStageForLearningSegment(segmentId)` safe: if no stage is rendered, it may still set `selectedStageId`; this is harmless. Do not remove achievement focus support.

  **Must NOT do**:
  - Do not edit `src/data/learningPath.json`.
  - Do not edit `src/modules/lab.js`.
  - Do not render experiment, game, feature unlock, element count, stage progress, activity log, or achievement summary UI under `#progress`.
  - Do not remove route `#/progress` or container `#progress .progress-path`.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI rendering and interaction binding changes with visible layout outcome.
  - Skills: [`frontend-design`] - Use only to maintain polished Chinese-first UI while removing clutter; no new redesign beyond scope.
  - Omitted: [`threejs-animation`] - No Three.js or animation work.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [3, 4, 5, 6] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/progress.js:116-138` - manual textbook segment construction from manual achievements.
  - Pattern: `src/modules/progress.js:322-348` - known textbook order and Chinese tab labels.
  - Pattern: `src/modules/progress.js:570-625` - current `renderProgress()` mixes manual lessons and five-stage path; remove stage rendering here.
  - Pattern: `src/modules/progress.js:653-726` - current interaction binding includes obsolete stage selection and required textbook/modal bindings.
  - Pattern: `src/modules/progress.js:930-979` - manual learning section, tabs, panels, modal insertion.
  - Test: `tests/content/pep-learning-tabs.spec.ts:32-219` - eight textbook tabs and non-empty card expectations.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Navigating to `#/progress` shows `教材复习确认`.
  - [ ] `#progress [data-textbook-tab]` count remains exactly 8.
  - [ ] `#progress [data-testid="learning-card"]` count is greater than 0.
  - [ ] `#progress` text does not contain `五阶段学习路径` or `初级探索者`.
  - [ ] `#progress [data-stage-select]`, `.progress-stage-card`, `.progress-stage-detail`, and `.progress-learning-path` counts are 0.
  - [ ] `#progress` text does not contain old stage reward phrases such as `解锁 0 个游戏`, `需要元素`, or `项功能`; do not globally ban legitimate textbook body words.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Learning page shows textbook review confirmation only
    Tool: Playwright
    Steps: Open `/`; click `[data-testid="nav-progress"]`; inspect `#progress` text and selectors.
    Expected: Heading `教材复习确认` visible; 8 textbook tabs visible; at least one learning card visible; old stage selectors and sections absent.
    Evidence: .sisyphus/evidence/task-2-learning-page-only-textbook.json

  Scenario: Empty textbook-source filter has Chinese fallback
    Tool: Playwright
    Steps: In a targeted browser-evaluated module test or temporary test hook invocation, force `getManualLearningSegments` inputs to produce no textbook-sourced segments; render progress section.
    Expected: `暂无教材复习内容` is visible; app does not throw; no stage path fallback appears.
    Evidence: .sisyphus/evidence/task-2-empty-learning-fallback.json
  ```

  **Commit**: NO by default | Suggested Message if user explicitly requests commits: `refactor(progress): show textbook review only` | Files: [`src/modules/progress.js`]

- [x] 3. Update learning cards and modal confirmation UI for dated active confirmation

  **What to do**:
  1. Modify `src/modules/progress.js` only.
  2. Update `renderLearningCard(segment)` around lines 981-1009:
      - Destructure `completionDate` from `segment`.
      - Keep `const isCompleted = status === 'completed';`.
      - Set status text exactly:
        - incomplete: `未学习`
        - completed with date: `学习确认：${completionDate}`
        - completed without date: `学习确认：日期待补充`
      - Keep `data-testid="learning-card-status"` on the status span.
      - Keep `role="button"`, `tabindex="0"`, click and keyboard behavior.
      - Do not add any `<button>` inside the card.
  3. Update `renderLessonModal(segment)` around lines 1011-1032:
      - Destructure `completionDate`.
      - Remove `const isRawCompleted = status === 'pending';` because `getLearningSegmentStatus` only returns `completed` or `not-started`.
      - For incomplete segment, render a single button exactly `<button type="button" data-testid="confirm-learning" data-manual-achievement-id="...">确定已学习</button>`.
      - For completed segment, render no confirm button and show `<span class="lesson-modal-completed-label">已学习：YYYY-MM-DD</span>` if date exists, otherwise `<span class="lesson-modal-completed-label">已学习：日期待补充</span>`.
  4. Update confirm handler inside `bindLearningInteractions()` around lines 697-707:
      - Keep calling `markLearningSegmentCompleted(segmentId, { achievementId, source: 'progress-learning-modal' })`.
      - Keep modal open and call `renderProgress()` so tests can observe updated modal/card status.
      - Do not close modal automatically.
  5. Ensure opening a card only sets `activeLearningSegmentId`/`focusedLearningSegmentId`; it must not mark the segment completed.
  6. Ensure already confirmed cards can reopen modal and read content, but cannot overwrite stored date because no confirm button is rendered.

  **Must NOT do**:
  - Do not change the card into a submit/confirm action.
  - Do not render `确定已学习` outside `[data-testid="lesson-modal"]`.
  - Do not overwrite first confirmation date from UI.
  - Do not change modal content section escaping.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: visible card/footer/modal behavior.
  - Skills: [`frontend-design`] - Maintain clear Chinese-first status wording without expanding design scope.
  - Omitted: [`test-driven-development`] - Task depends on tests in Tasks 4-6; implementation here is focused UI rendering.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [4, 6] | Blocked By: [1, 2]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/progress.js:674-688` - card click and keyboard opening behavior.
  - Pattern: `src/modules/progress.js:697-707` - modal confirm handler and re-render behavior.
  - Pattern: `src/modules/progress.js:981-1009` - current card status span.
  - Pattern: `src/modules/progress.js:1011-1032` - current modal footer.
  - Test: `tests/ui/learning-content-modal.spec.ts:8-175` - existing modal and no-card-button coverage.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Before confirmation, card status is exactly `未学习`.
  - [ ] Before confirmation, no card contains any `<button>`.
  - [ ] Opening a card shows modal with `确定已学习` button.
  - [ ] After clicking `确定已学习`, card status matches `/^学习确认：\d{4}-\d{2}-\d{2}$/`.
  - [ ] After confirmation, modal remains open and shows `已学习：YYYY-MM-DD` with no `confirm-learning` button.
  - [ ] Reload preserves same card date.
  - [ ] Old completed segment without a date displays `学习确认：日期待补充` and modal displays `已学习：日期待补充`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Modal-only confirmation updates card footer with date
    Tool: Playwright
    Steps: Clear storage; navigate to `#/progress`; locate card `[data-learning-segment-id="knowledge-topic-0001-source-section-l1-l5-bd27b23b45"]`; assert footer `未学习`; click card; click modal `确定已学习`; read card footer and modal footer.
    Expected: Card footer matches `学习确认：YYYY-MM-DD`; modal footer says `已学习：YYYY-MM-DD`; modal has no confirm button after completion.
    Evidence: .sisyphus/evidence/task-3-modal-confirmation-date.json

  Scenario: Legacy completed segment without date remains readable
    Tool: Playwright
    Steps: Seed v3 localStorage with `completedLearningSegments: ['knowledge-topic-0001-source-section-l1-l5-bd27b23b45']` and no `learningSegmentCompletionDates`; navigate to `#/progress`; open that card.
    Expected: Card footer `学习确认：日期待补充`; modal footer `已学习：日期待补充`; modal body content sections render; no confirm button appears.
    Evidence: .sisyphus/evidence/task-3-legacy-date-missing.json
  ```

  **Commit**: NO by default | Suggested Message if user explicitly requests commits: `feat(progress): show dated learning confirmations` | Files: [`src/modules/progress.js`]

- [x] 4. Update modal and persistence Playwright tests for active dated confirmation

  **What to do**:
  1. Modify `tests/ui/learning-content-modal.spec.ts` only.
  2. Keep constants `STORAGE_KEY`, `MANUAL_SEGMENT_ID`, and `MANUAL_ACHIEVEMENT_ID` at lines 3-5.
  3. Add a helper near existing helpers after line 287:
      - `getTodayLocalDateInBrowser(page)` returns `YYYY-MM-DD` using browser local `new Date()`.
      - `getStoredLearningDate(page, segmentId)` reads `window.appState.learningSegmentCompletionDates[segmentId]`.
  4. Update `seedStoredState` default data at lines 291-313 to include `learningSegmentCompletionDates: {}` and `experimentCompletionDates: {}` so seeded v3 payload matches current state shape.
  5. In `modal confirmation completes segment and persists after reload` at lines 78-130:
      - Assert confirm button text is exactly `确定已学习`.
      - After click, poll until `window.appState.completedLearningSegments.has(segmentId)` is true and `window.appState.learningSegmentCompletionDates[segmentId]` matches `YYYY-MM-DD`.
      - Replace expected card status `已学习` with `学习确认：${date}`.
      - In localStorage polling at lines 104-114, also assert `envelope.data.learningSegmentCompletionDates[MANUAL_SEGMENT_ID] === date`.
      - After reload, assert the same `学习确认：${date}`.
  6. Update `completed lesson can still open modal and read content` at lines 132-158:
      - Seed both `completedLearningSegments: [MANUAL_SEGMENT_ID]` and `learningSegmentCompletionDates: { [MANUAL_SEGMENT_ID]: '2026-05-01' }`.
      - Expect card status `学习确认：2026-05-01`.
      - Expect modal footer `已学习：2026-05-01` and no confirm button.
  7. Add a new test `legacy completed lesson without stored date shows date pending`:
      - Seed only `completedLearningSegments: [MANUAL_SEGMENT_ID]`.
      - Expect card status `学习确认：日期待补充`.
      - Open modal; expect footer `已学习：日期待补充`; expect no confirm button.
  8. Keep existing tests for open-without-completion, close/Escape, no card button, content sections, XSS, and scroll. Update only status/button text expectations as required.

  **Must NOT do**:
  - Do not reduce XSS coverage.
  - Do not skip reload persistence assertions.
  - Do not weaken selectors from `data-testid` to broad text-only selectors where a stable test id exists.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: multi-case Playwright regression updates with storage assertions.
  - Skills: [`test-driven-development`] - Update tests to describe new contract before final verification.
  - Omitted: [`frontend-design`] - Test-only task.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: [Final Verification] | Blocked By: [1, 2, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Test: `tests/ui/learning-content-modal.spec.ts:78-130` - confirmation and persistence test currently expects `已学习`.
  - Test: `tests/ui/learning-content-modal.spec.ts:132-158` - completed lesson reopen test.
  - Test: `tests/ui/learning-content-modal.spec.ts:160-175` - no card-level button test.
  - Test: `tests/ui/learning-content-modal.spec.ts:287-317` - seeded v3 localStorage helper.
  - API: `window.appState.completedLearningSegments` remains a Set; `window.appState.learningSegmentCompletionDates` must be a plain object.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/learning-content-modal.spec.ts` exits with code 0.
  - [ ] The test suite proves opening/closing modal does not complete a segment.
  - [ ] The test suite proves modal confirmation stores date in both `window.appState` and localStorage envelope.
  - [ ] The test suite proves card footer uses `学习确认：YYYY-MM-DD` after confirmation and reload.
  - [ ] The test suite proves legacy completed-without-date state displays `日期待补充`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Targeted modal suite passes
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/learning-content-modal.spec.ts` from repository root.
    Expected: Command exits 0; report contains all tests passed.
    Evidence: .sisyphus/evidence/task-4-learning-modal-playwright.txt

  Scenario: Stored envelope includes learning confirmation date
    Tool: Playwright
    Steps: During the modal confirmation test, write JSON evidence with `completedLearningSegments`, `learningSegmentCompletionDates`, card status text, modal footer text, and reload status text.
    Expected: JSON date values are identical and match `YYYY-MM-DD`; card/reload status uses `学习确认：{date}`.
    Evidence: .sisyphus/evidence/task-4-learning-date-persistence.json
  ```

  **Commit**: NO by default | Suggested Message if user explicitly requests commits: `test(progress): cover dated learning confirmation` | Files: [`tests/ui/learning-content-modal.spec.ts`]

- [x] 5. Update textbook tab tests to assert removal of passive learning systems

  **What to do**:
  1. Modify `tests/content/pep-learning-tabs.spec.ts` only.
  2. Keep the existing test `学习 page renders eight textbook tabs with non-empty cards` and its evidence writing behavior at lines 32-219.
  3. After navigating to `#/progress` and confirming `#progress` visible around lines 50-56, add assertions:
      - `await expect(page.locator('#progress')).toContainText('教材复习确认');`
      - `await expect(page.locator('#progress')).not.toContainText('五阶段学习路径');`
      - `await expect(page.locator('#progress')).not.toContainText('初级探索者');`
      - `await expect(page.locator('#progress [data-stage-select]')).toHaveCount(0);`
      - `await expect(page.locator('#progress .progress-stage-card')).toHaveCount(0);`
      - `await expect(page.locator('#progress .progress-stage-detail')).toHaveCount(0);`
      - `await expect(page.locator('#progress .progress-learning-path')).toHaveCount(0);`
  4. Add passive-content text absence checks that are scoped to the old stage UI terms:
      - `解锁 0 个游戏`, `项功能`, `个实验`, `需要元素` must not appear in `#progress`.
      - Do not ban the word `实验` globally because教材正文 may mention experiments; only ban old stage reward/requirement phrases.
  5. In tab assertions, keep exactly 8 textbook tabs and clean labels. If tab count label changed from completed/total to `共 N 节`, update evidence to record the new raw tab labels.
  6. Extend evidence JSON at lines 198-218 with:
      - `removedStageSelectorCount`
      - `removedStageCardCount`
      - `removedStageDetailCount`
      - `hasFiveStageText`
      - `hasJuniorExplorerText`
      - `hasOldRewardCopy`

  **Must NOT do**:
  - Do not reduce the existing exactly-8-tab assertion.
  - Do not make broad assertions that fail on legitimate textbook body copy.
  - Do not add sleeps beyond existing tab click stabilization unless Playwright locator waits are insufficient.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: targeted content regression tests with careful negative assertions.
  - Skills: [`test-driven-development`] - Absence assertions define the removed UI contract.
  - Omitted: [`frontend-design`] - Test-only task.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: [Final Verification] | Blocked By: [2]

  **References** (executor has NO interview context - be exhaustive):
  - Test: `tests/content/pep-learning-tabs.spec.ts:32-219` - existing tab/card/evidence test.
  - UI: `src/modules/progress.js:609-621` - old stage section that must not render.
  - UI: `src/modules/progress.js:843-879` - old stage card phrases `需要元素`, `解锁`, `个实验`, `项功能`.
  - UI: `src/modules/progress.js:881-928` - old stage detail section that must not render.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/content/pep-learning-tabs.spec.ts` exits with code 0.
  - [ ] Evidence confirms 8 textbook tabs.
  - [ ] Evidence confirms old stage selectors/cards/details count 0.
  - [ ] Test fails if `五阶段学习路径` or `初级探索者` appears on `#progress`.
  - [ ] Test fails if old stage reward copy appears on `#progress`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Textbook tabs remain while passive learning path is gone
    Tool: Bash
    Steps: Run `npx playwright test tests/content/pep-learning-tabs.spec.ts` from repository root.
    Expected: Command exits 0; evidence JSON reports 8 tabs and zero old stage selectors/cards/details.
    Evidence: .sisyphus/evidence/task-5-learning-tabs-passive-removal.txt

  Scenario: Negative assertions are scoped to old UI, not textbook content
    Tool: Playwright
    Steps: Navigate to `#/progress`; inspect `#progress` for `.progress-stage-card`, `.progress-stage-detail`, `[data-stage-select]`, `五阶段学习路径`, `初级探索者`, `解锁 0 个游戏`, `需要元素`.
    Expected: All old UI selectors absent and old stage phrases absent; textbook cards still visible.
    Evidence: .sisyphus/evidence/task-5-passive-content-absent.json
  ```

  **Commit**: NO by default | Suggested Message if user explicitly requests commits: `test(progress): assert learning page removes passive path` | Files: [`tests/content/pep-learning-tabs.spec.ts`]

- [x] 6. Update achievement coupling and lab regression coverage for the new learning contract

  **What to do**:
  1. Modify `tests/ui/achievements-progress-coupling.spec.ts` only for achievement coupling updates.
  2. Do not modify `tests/ui/lab-textbook-experiments.spec.ts` unless it fails because of the learning-page-only changes; the preferred action is to run it unchanged as regression coverage.
  3. In `tests/ui/achievements-progress-coupling.spec.ts`, replace every expected learning card status `已学习` with a helper that accepts dated confirmation:
      - Add `expectLearningCardConfirmed(page, segmentId)` that reads `[data-testid="learning-card-status"]`, asserts text matches `/^学习确认：\d{4}-\d{2}-\d{2}$/`, and returns the date string.
      - Keep `expectLearningCardStatus(page, segmentId, '未学习')` for unconfirmed checks.
  4. Update all post-confirm assertions at lines 117, 157, and 256 to use `expectLearningCardConfirmed`.
  5. Update legacy/raw-completed status assertions at lines 299 and 320:
      - When seeding only `completedLearningSegments`, expect `学习确认：日期待补充`.
      - When seeding both `completedLearningSegments` and `unlockedAchievements` without a date, expect `学习确认：日期待补充` unless the seed also includes `learningSegmentCompletionDates`.
  6. Update the audit in `all manual review achievements expose progress rows` at lines 340-366 so valid status is either exactly `未学习`, matches `/^学习确认：\d{4}-\d{2}-\d{2}$/`, or equals `学习确认：日期待补充`; `已学习` is no longer valid card footer text.
  7. Update `waitForStoredSegment(...)` around the later helper section to assert the localStorage envelope includes `data.learningSegmentCompletionDates[segmentId]` matching `YYYY-MM-DD` in addition to `completedLearningSegments` and `unlockedAchievements`.
  8. Update evidence JSON in `modal confirmation unlocks achievement and syncs progress` around lines 162-181 and `completed learning segment persists after reload` around lines 269-285 to include stored `learningSegmentCompletionDates` before and after.
  9. Remove or rewrite the test `progress escapes persisted activity text` at lines 184-228 because learning page no longer displays activity feed. Required replacement:
      - Rename it to `learning page does not render persisted activity feed`.
      - Seed the same unsafe `activityLog`.
      - Navigate to `#/progress`.
      - Assert `.activity-item` count is 0 under `#progress`.
      - Assert unsafe injected nodes and handler flags remain 0/false.
      - Do not expect unsafe text to appear on learning page.
  10. Rewrite `raw completedLearningSegments evidence does not inflate general progress` at lines 457-477:
      - Keep state assertions that `completedLearningSegments` contains the manual segment while `learnedElements` and `collectedElements` remain empty.
      - Replace `.progress-ring` assertions with learning-page absence assertions: `#progress .progress-ring` count is 0 and `#progress` does not show `0 / 118`, `0%`, or other passive general-progress widgets.
      - Also assert the card still shows `学习确认：日期待补充` for the raw completed segment.
  11. Keep tests proving manual review achievement unlocks after modal confirmation; achievement cards remain read-only.
  12. Run `npx playwright test tests/ui/lab-textbook-experiments.spec.ts` unchanged after the above to prove experiment ownership remains in lab.

  **Must NOT do**:
  - Do not move activity feed behavior to achievements in this task.
  - Do not change `src/modules/achievements.js` or `src/modules/lab.js`.
  - Do not weaken achievement unlock assertions.
  - Do not make lab regression depend on learning page selectors.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-module regression tests and scoped rewrite of obsolete progress activity assertion.
  - Skills: [`test-driven-development`] - Maintain coupling coverage while updating contract.
  - Omitted: [`frontend-design`] - Test-only task.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: [Final Verification] | Blocked By: [1, 2, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:31-75` - manual review condition and unlock after completion.
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:77-118` - explicit completion required; currently expects `已学习`.
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:120-182` - modal confirmation unlocks achievement and writes evidence.
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:184-228` - obsolete progress activity feed XSS assertion; replace with absence-on-learning-page test.
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:230-260` - completed segment persists after reload; currently expects `已学习`.
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:288-330` - raw/manual topic progress tests have legacy `已学习` expectations.
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:340-366` - status audit currently permits only `未学习` or `已学习`.
  - Test: `tests/ui/achievements-progress-coupling.spec.ts:457-477` - `.progress-ring` assertions contradict removal of passive progress from learning page.
  - Regression: `tests/ui/lab-textbook-experiments.spec.ts` - experiments remain owned/rendered by lab module.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npx playwright test tests/ui/achievements-progress-coupling.spec.ts` exits with code 0.
  - [ ] Confirming a learning segment still unlocks `MANUAL_ACHIEVEMENT_ID`.
  - [ ] Stored envelope contains `completedLearningSegments`, `learningSegmentCompletionDates`, and `unlockedAchievements` after confirmation.
  - [ ] Learning page does not render persisted `.activity-item` feed or unsafe activity content.
  - [ ] Raw completed learning segment evidence does not render `.progress-ring`, `0%`, or `0 / 118` on the learning page.
  - [ ] `npx playwright test tests/ui/lab-textbook-experiments.spec.ts` exits with code 0 without source changes to lab.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Achievement coupling survives dated learning confirmation
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/achievements-progress-coupling.spec.ts` from repository root.
    Expected: Command exits 0; evidence shows segment completed, confirmation date stored, and manual achievement unlocked.
    Evidence: .sisyphus/evidence/task-6-achievement-coupling.txt

  Scenario: Experiments remain in lab after learning page removal
    Tool: Bash
    Steps: Run `npx playwright test tests/ui/lab-textbook-experiments.spec.ts` from repository root.
    Expected: Command exits 0; lab textbook experiment behavior still passes with no modifications to `src/modules/lab.js`.
    Evidence: .sisyphus/evidence/task-6-lab-regression.txt
  ```

  **Commit**: NO by default | Suggested Message if user explicitly requests commits: `test(progress): preserve achievement and lab regressions` | Files: [`tests/ui/achievements-progress-coupling.spec.ts`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
  - Verify implemented diff matches this plan exactly: learning page only; no `src/modules/lab.js`; no `src/data/learningPath.json`; no achievement migration; `completedLearningSegments` compatibility retained; `learningSegmentCompletionDates` additive field present.
  - Evidence: `.sisyphus/evidence/f1-plan-compliance.md`.
- [x] F2. Code Quality Review — unspecified-high
  - Review changed files for unused imports, over-broad refactors, brittle selectors, duplicated date logic beyond acceptable surgical reuse, and Chinese-first copy consistency.
  - Evidence: `.sisyphus/evidence/f2-code-quality.md`.
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
  - Run browser QA on `#/progress`: verify 8 tabs, card opens modal, close/Escape no completion, confirm date, reload persistence, old stage content absent, already confirmed modal has no button.
  - Evidence: `.sisyphus/evidence/f3-real-manual-qa.json` plus screenshot if available.
- [x] F4. Scope Fidelity Check — deep
  - Check user intent fidelity: learning module is active textbook confirmation only; passive/statistical content removed from learning, not migrated; experiments remain lab-owned.
  - Evidence: `.sisyphus/evidence/f4-scope-fidelity.md`.

## Commit Strategy
- Do not commit unless the user explicitly requests commits during execution.
- If commits are explicitly requested, commit only after each implementation/test task's targeted checks pass and use these suggested messages unless the repository style demands a narrower scope:
  1. `feat(progress): persist learning confirmation dates`
  2. `refactor(progress): show textbook review only`
  3. `feat(progress): show dated learning confirmations`
  4. `test(progress): cover dated learning confirmation`
  5. `test(progress): assert learning page removes passive path`
  6. `test(progress): preserve achievement and lab regressions`
- Before any final commit/PR, run:
  - `git status`
  - `git diff`
  - `npm run build`
  - `npm run validate:all:safe`
  - targeted Playwright commands listed in Definition of Done.

## Success Criteria
- 学习页只呈现教材复习确认内容：教材 Tab、教材卡片、教材内容弹窗、弹窗内确认按钮。
- 学习页不再呈现五阶段路径、初级探索者、实验卡/实验数量、游戏/功能解锁、元素数量、被动统计、活动流或成就摘要。
- 卡片无确认按钮；点击卡片只打开弹窗，不完成学习。
- 弹窗 `确定已学习` 是唯一确认入口。
- 首次确认写入 `completedLearningSegments` 和 `learningSegmentCompletionDates[segmentId]`。
- 确认后卡片右下角显示 `学习确认：YYYY-MM-DD`；刷新后保持不变。
- 旧的已完成但无日期数据保持已学习状态，并显示 `学习确认：日期待补充`。
- 手动学习确认仍能解锁对应成就；实验相关行为仍由实验室模块负责。
- 所有 Definition of Done 命令通过，并生成 `.sisyphus/evidence/` 证据。
