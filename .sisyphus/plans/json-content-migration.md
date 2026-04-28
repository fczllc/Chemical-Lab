# JSON 内容迁移方案（静态内容 → JSON + Loader）

## TL;DR
> **Summary**: 将当前写在 `src/data/*.js` 中的大块静态内容迁移为 `src/data/*.json`，并通过单一 `src/data/index.js` 同步导出给业务模块使用，保持当前 Vite 纯前端静态站点形态与同步启动链路不变。
> **Deliverables**:
> - `src/data/*.json` 原始内容文件
> - `src/data/index.js` 统一内容访问层
> - `src/data/contentMeta.js` 共享标签/颜色/映射配置
> - 适配后的数据校验脚本与 Playwright 数据烟雾回归
> **Effort**: Medium
> **Parallel**: YES - 2 waves
> **Critical Path**: 1 → (2/3/4/5/6) → 7 → 8

## Context
### Original Request
- 用户确认不采用 SQLite，希望按建议整理一个 **JSON 方案的可执行计划**。

### Interview Summary
- 保持当前 **纯前端静态站点**，不引入后端/API/CMS/SQLite。
- 采用 **`src/data/*.json` + 轻量 loader/normalizer**。
- **用户进度/设置继续保留在 `localStorage`**，不纳入本次迁移。
- 迁移优先级按 **`elements` > `quiz/reactions` > `achievements/learningPath` > 重复标签/映射**。
- 测试策略确认：**tests-after**，即实现后统一执行构建、数据校验与 Playwright 回归。

### Metis Review (gaps addressed)
- 已明确 **不改为 async fetch/bootstrap**；采用 **Vite 静态 JSON import**，保持 `src/main.js` 当前同步初始化节奏。
- 已明确 **唯一数据访问边界**：迁移完成后，业务模块只允许从 `src/data/index.js` 读取内容，不允许直接导入原始 JSON。
- 已明确 **本轮只做内容承载格式迁移**，不顺带做 i18n、字段重命名、状态管理重构、后端化、CI 重构。
- 已明确 **保留现有 ID、键名语义、列表顺序**，除非该字段仅被包装为 JSON 顶层对象的一部分。
- 已明确 **失败路径主要由 build + validator 捕获**；不额外要求本轮实现复杂运行时灾难恢复 UI。

## Work Objectives
### Core Objective
将当前分散在 `src/data/*.js` 的静态教材内容迁移为 JSON 原始文件，并通过统一的数据访问层向业务模块提供同步可用的数据，降低内容维护成本与重复配置漂移风险，同时不破坏现有页面与验证链路。

### Deliverables
- `src/data/elements.json`
- `src/data/quizData.json`
- `src/data/reactions.json`
- `src/data/achievementsData.json`
- `src/data/learningPath.json`
- `src/data/index.js`
- `src/data/contentMeta.js`
- 适配 JSON 的 `scripts/validate-elements.mjs`
- 适配 JSON 的 `scripts/validate-supporting-data.mjs`
- 至少 1 个覆盖数据加载链路的 Playwright smoke 测试

### Definition of Done (verifiable conditions with commands)
- `npm run build` 成功，无 JSON 导入、路径或语法错误。
- `node scripts/validate-elements.mjs` 成功。
- `node scripts/validate-supporting-data.mjs` 成功。
- `npx playwright test tests/shell/home-shell.spec.ts` 成功。
- `npx playwright test tests/shell/content-data-smoke.spec.ts` 成功（新增后）。
- 对 `src/modules/**/*.js` 与 `src/main.js` 执行导入审计，不再存在对原始数据文件的直接导入；唯一允许的业务侧入口为 `src/data/index.js`。

### Must Have
- 保持 `src/main.js:59-87` 的同步初始化模式，不引入运行时 `fetch()`。
- 原始内容迁移到 JSON 后，**字段语义不变**：元素、题库、反应、成就、学习路径的键名与引用关系保持兼容。
- `scripts/validate-elements.mjs:1-104` 与 `scripts/validate-supporting-data.mjs:1-168` 继续作为数据真值校验入口。
- 将重复标签/颜色/安全/游戏元数据收敛到共享配置，消除 `renderTable.js`、`timeline.js`、`detailPanel.js`、`compare.js` 等模块的重复定义。
- 为迁移后的数据链路补一条 **数据驱动 Playwright smoke**，覆盖元素详情与至少一个数据页面入口。

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- 不引入 SQLite、IndexedDB ORM、后端 API、CMS、服务端预处理。
- 不改造 `localStorage` 数据结构，除非仅为兼容现有内容读取所需的最小适配。
- 不顺带重写 UI 样式、文案内容、学习规则、成就逻辑、游戏规则。
- 不允许各模块各自解析 JSON；只能通过 `src/data/index.js` 暴露同步数据。
- 不允许一边迁移一边做开放式“全局常量清理”；仅收敛 **当前已确认重复** 的内容元数据。

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: **tests-after** + `npm run build` + Node 数据校验脚本 + Playwright
- QA policy: 每个任务都包含 happy path 与 failure/edge path；失败场景优先通过临时破坏 JSON 字段/引用并运行 validator 验证
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: foundation + dataset migrations
- 1. 统一 JSON 访问边界与同步 loader 约束
- 2. 迁移 elements 数据与元素校验链
- 3. 迁移 quizData 数据与测验消费链
- 4. 迁移 reactions 数据与实验/游戏消费链
- 5. 迁移 achievementsData 数据与成就消费链
- 6. 迁移 learningPath 数据与进度消费链

Wave 2: consolidation + verification hardening
- 7. 收敛重复内容元数据到 `src/data/contentMeta.js`
- 8. 扩展验证链路、数据烟雾测试与导入审计

### Dependency Matrix (full, all tasks)
- 1 → 2, 3, 4, 5, 6
- 2 → 7, 8
- 3 → 8
- 4 → 7, 8
- 5 → 7, 8
- 6 → 7, 8
- 7 → 8
- 8 → F1, F2, F3, F4

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 6 tasks → `unspecified-high` ×2, `quick` ×4
- Wave 2 → 2 tasks → `unspecified-high` ×2

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. 建立统一内容访问边界与同步 JSON 约束

  **What to do**: 创建 `src/data/index.js` 作为唯一业务侧内容入口，先用它统一导出现有 `elements`、`quizData`、`reactions`、`achievementsData`、`learningPath`，并在文件头明确后续仅允许该文件直接接触原始 JSON。同步把 `src/main.js` 的数据导入切到 `src/data/index.js`。同时定死目标 JSON 形状：`elements.json` 使用对象顶层 `{ allowedCategories, allowedRarities, allowedSafetyLevels, elements }`；其余文件分别采用 `{ quizData }`、`{ reactions }`、`{ achievementsData }`、`{ learningPath }`，避免数组裸导出导致后续脚本/校验入口不统一。
  **Must NOT do**: 不引入 `fetch()`、`import.meta.glob`、异步 bootstrap、运行时缓存层；不在此任务里修改任何业务字段语义。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: 这是后续所有数据迁移的唯一基础边界，涉及入口文件与约束落地。
  - Skills: `[]` - No mandatory skill; 该任务以结构收敛为主。
  - Omitted: `[test-driven-development, frontend-design]` - 已确认 tests-after，且本任务不涉及 UI 设计。

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5, 6 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/main.js:2,59-87` - 当前主入口直接导入 `./data/elements.js` 并同步初始化全部模块；必须保持这条同步链路。
  - Pattern: `src/modules/storyMode.js:2,64-67` - 这是现存业务模块直连原始数据文件的示例，说明后续需要统一入口而非散落导入。
  - API/Type: `package.json:6-18` - 仅有 Vite/Playwright，无后端或 Node 数据服务依赖，适合静态 JSON import。
  - Test: `playwright.config.ts:3-24` - 已有预览服务器与 Playwright 基础设施，后续回归可直接使用。

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/main.js` 不再直接从 `./data/elements.js` 导入内容数据，而是改从 `./data/index.js` 导入。
  - [ ] `npm run build` 成功，证明统一入口未破坏当前同步启动流程。
  - [ ] `src/data/index.js` 中以注释或导出结构明确“业务模块只从此处取内容数据”的约束。

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Unified content boundary compiles
    Tool: Bash
    Steps: Run `npm run build` after switching `src/main.js` to `src/data/index.js`.
    Expected: Vite build succeeds with no unresolved import errors.
    Evidence: .sisyphus/evidence/task-1-content-boundary-build.txt

  Scenario: Broken boundary import fails loudly
    Tool: Bash
    Steps: Backup `src/data/index.js`; temporarily change one re-export/import path inside it to a non-existent file such as `./missing-elements.js`; run `npm run build`; restore file.
    Expected: Build exits non-zero and reports unresolved import from `src/data/index.js`.
    Evidence: .sisyphus/evidence/task-1-content-boundary-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `src/data/index.js`, `src/main.js`

- [x] 2. 迁移 elements 数据并保留元素校验链

  **What to do**: 将 `src/data/elements.js` 迁移为 `src/data/elements.json`，顶层采用 `{ allowedCategories, allowedRarities, allowedSafetyLevels, elements }`。在 `src/data/index.js` 内静态导入该 JSON，并继续向业务侧导出 `elements`、`allowedCategories`、`allowedRarities`、`allowedSafetyLevels`，确保消费方拿到的数据 shape 与迁移前一致。把 `src/modules/storyMode.js` 的直接元素导入改为走统一入口。将 `scripts/validate-elements.mjs` 从 ESM 数据导入改为使用 `fs/promises` 读取 `src/data/elements.json`，并保留当前所有字段、唯一性与位置校验逻辑。
  **Must NOT do**: 不重写元素字段名、不调整元素顺序、不改变 `initializeState(elements)` 接收的数据结构、不顺手修改元素文案内容。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: `elements` 是最大数据集，也是 `main.js` 与 `storyMode.js` 的关键依赖。
  - Skills: `[]` - No mandatory skill; 重点是稳态迁移与校验保持。
  - Omitted: `[frontend-design, test-driven-development]` - 无界面设计任务，且测试策略为 tests-after。

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7, 8 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/data/elements.js:1-30` - 当前文件既导出枚举，也导出元素数组；JSON 必须保留这一信息集合。
  - Pattern: `src/main.js:59-87` - `elements` 在应用启动时被传入多个初始化函数，是内容基线。
  - Pattern: `src/modules/storyMode.js:2,64-67` - 故事模式直接用 `elements.findIndex(...)` 取前后元素，迁移后必须继续可用。
  - Test: `scripts/validate-elements.mjs:1-104` - 当前元素校验标准；迁移后逻辑必须等价保留。

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/data/elements.json` 存在，且 `src/data/index.js` 能同步导出 `elements` 与三组 allowed 枚举。
  - [ ] `node scripts/validate-elements.mjs` 成功，输出 118 个元素通过校验。
  - [ ] `src/modules/storyMode.js` 不再直接导入 `../data/elements.js`。
  - [ ] `npm run build` 成功。

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Elements JSON passes validator and app build
    Tool: Bash
    Steps: Run `node scripts/validate-elements.mjs` and then `npm run build`.
    Expected: Validator exits 0 and build succeeds.
    Evidence: .sisyphus/evidence/task-2-elements-happy.txt

  Scenario: Invalid element enum is rejected
    Tool: Bash
    Steps: Backup `src/data/elements.json`; change the first element's `category` to `"invalid-category"`; run `node scripts/validate-elements.mjs`; restore file.
    Expected: Validator exits non-zero and reports an illegal `category` value.
    Evidence: .sisyphus/evidence/task-2-elements-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `src/data/elements.json`, `src/data/index.js`, `src/modules/storyMode.js`, `scripts/validate-elements.mjs`

- [x] 3. 迁移 quizData 数据并保留测验引用校验

  **What to do**: 将 `src/data/quizData.js` 迁移为 `src/data/quizData.json`，顶层采用 `{ quizData }`。在 `src/data/index.js` 中同步导出 `quizData`，并把 `src/modules/quiz.js` 的导入改为统一入口。将 `scripts/validate-supporting-data.mjs` 的题库部分改为从 JSON 读取，继续校验题目数量、唯一 ID、`relatedElement` 引用、4 个选项与 `correctIndex` 边界。保持 `FULL_QUIZ_COUNT = 20` 与当前业务语义不变。
  **Must NOT do**: 不改变题库题意、题目排序、题目数量阈值，不新增随机加载或分页机制。

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 单数据集迁移，消费者与校验点集中。
  - Skills: `[]` - No mandatory skill; 任务边界清晰。
  - Omitted: `[frontend-design, test-driven-development]` - 无 UI 设计需求，且不走 TDD。

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 8 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/data/quizData.js:1-80` - 当前题库是纯内容数组，适合直接迁为 JSON。
  - API/Type: `src/modules/quiz.js:2,13-20` - `quizData` 是测验模块唯一原始题源，`FULL_QUIZ_COUNT` 当前为 20。
  - Test: `scripts/validate-supporting-data.mjs:14-48` - 题库数量、ID、元素引用与选项边界当前都在此校验。
  - Test: `src/main.js:80` - `initQuiz()` 在启动时同步注册事件，不能因数据迁移改成异步依赖。

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/data/quizData.json` 存在且由 `src/data/index.js` 同步导出 `quizData`。
  - [ ] `src/modules/quiz.js` 通过统一内容入口读取题库。
  - [ ] `node scripts/validate-supporting-data.mjs` 成功，题库相关校验全部通过。
  - [ ] `npm run build` 成功。

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Quiz JSON passes supporting-data validation
    Tool: Bash
    Steps: Run `node scripts/validate-supporting-data.mjs` and then `npm run build`.
    Expected: Supporting-data validator exits 0 and build succeeds.
    Evidence: .sisyphus/evidence/task-3-quiz-happy.txt

  Scenario: Invalid correctIndex is rejected
    Tool: Bash
    Steps: Backup `src/data/quizData.json`; change the first quiz item's `correctIndex` to `4`; run `node scripts/validate-supporting-data.mjs`; restore file.
    Expected: Validator exits non-zero and reports illegal `correctIndex` / option bounds.
    Evidence: .sisyphus/evidence/task-3-quiz-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `src/data/quizData.json`, `src/data/index.js`, `src/modules/quiz.js`, `scripts/validate-supporting-data.mjs`

- [x] 4. 迁移 reactions 数据并保留实验/游戏消费链

  **What to do**: 将 `src/data/reactions.js` 迁移为 `src/data/reactions.json`，顶层采用 `{ reactions }`。在 `src/data/index.js` 中同步导出 `reactions`，并把 `src/modules/lab.js` 与 `src/modules/games.js` 改为走统一入口。将 `scripts/validate-supporting-data.mjs` 的反应校验改为从 JSON 读取，保留当前对 `id`、`experimentId`、`reactants/products`、`safetyLevel`、`visualDescription` 与元素/化学式交叉引用的校验。保持 `lab.js` 中 `EQUATION_MAP`、`SAFETY_THEME` 等 UI 配置暂不改语义，仅保证迁移后消费正常。
  **Must NOT do**: 不改反应 ID、不改 `experimentId` 命名、不扩展实验数量或增加新反应逻辑，不顺带改游戏评分规则。

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 单数据集迁移，但有两个明确消费者和一段现成交叉引用校验。
  - Skills: `[]` - No mandatory skill; 任务主要是机械迁移与引用保持。
  - Omitted: `[frontend-design, test-driven-development]` - 不涉及界面重设计，也不走 TDD。

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7, 8 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/data/reactions.js:1-120` - 当前反应数据是纯内容对象数组，可直接转 JSON。
  - API/Type: `src/modules/lab.js:1-39` - 实验室直接消费 `reactions`，并依赖 `safetyLevel` 与 `experimentId`。
  - API/Type: `src/modules/games.js:1-39` - 游戏中心的反应配对题源来自 `reactions`。
  - Test: `scripts/validate-supporting-data.mjs:18-80` - 当前反应数据的最小数量、ID 唯一性、元素/公式引用与安全等级校验都在这里。

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/data/reactions.json` 存在且由 `src/data/index.js` 同步导出 `reactions`。
  - [ ] `src/modules/lab.js` 与 `src/modules/games.js` 不再直接导入 `../data/reactions.js`。
  - [ ] `node scripts/validate-supporting-data.mjs` 成功，反应相关校验全部通过。
  - [ ] `npm run build` 成功。

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Reactions JSON passes supporting-data validation
    Tool: Bash
    Steps: Run `node scripts/validate-supporting-data.mjs` and then `npm run build`.
    Expected: Supporting-data validator exits 0 and build succeeds.
    Evidence: .sisyphus/evidence/task-4-reactions-happy.txt

  Scenario: Unknown formula or symbol is rejected
    Tool: Bash
    Steps: Backup `src/data/reactions.json`; change the first reaction's first `reactant` to `"XYZ"`; run `node scripts/validate-supporting-data.mjs`; restore file.
    Expected: Validator exits non-zero and reports unknown element symbol or chemical formula.
    Evidence: .sisyphus/evidence/task-4-reactions-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `src/data/reactions.json`, `src/data/index.js`, `src/modules/lab.js`, `src/modules/games.js`, `scripts/validate-supporting-data.mjs`

- [x] 5. 迁移 achievementsData 数据并保留成就判定语义

  **What to do**: 将 `src/data/achievementsData.js` 迁移为 `src/data/achievementsData.json`，顶层采用 `{ achievementsData }`。在 `src/data/index.js` 同步导出 `achievementsData`，并把 `src/modules/achievements.js`、`src/modules/homeModules.js`、`src/modules/progress.js` 的成就数据导入改为统一入口。将 `scripts/validate-supporting-data.mjs` 的成就校验改为读取 JSON，继续覆盖 `id` 唯一性、必填字段、`relatedElements` 引用、`condition.type`/`gameKey` 等规则。保持成就解锁逻辑与现有 `matchesCondition()` 兼容。
  **Must NOT do**: 不新增成就、不调整成就 rarity 或 condition 语义、不重写弹窗/UI 展示逻辑。

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 数据集与校验范围清晰，消费者固定在三个模块。
  - Skills: `[]` - No mandatory skill; 重点是结构平移与校验连续性。
  - Omitted: `[frontend-design, test-driven-development]` - 不涉及设计，且不先写测试再实现。

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7, 8 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/data/achievementsData.js:1-112` - 当前成就数据是对象数组，含对象型 `condition`，JSON 可直接表示。
  - API/Type: `src/modules/achievements.js:1-68` - 成就解锁判定依赖 `achievement.condition` 结构不变。
  - API/Type: `src/modules/homeModules.js:1-4` - 首页会消费成就数据做最近成就预览。
  - API/Type: `src/modules/progress.js:1-18` - 进度页会基于成就数据统计完成率。
  - Test: `scripts/validate-supporting-data.mjs:82-123` - 当前成就字段与条件语义校验都在这里。

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/data/achievementsData.json` 存在且由 `src/data/index.js` 同步导出 `achievementsData`。
  - [ ] `src/modules/achievements.js`、`homeModules.js`、`progress.js` 的成就数据读取都改为统一入口。
  - [ ] `node scripts/validate-supporting-data.mjs` 成功，成就相关校验全部通过。
  - [ ] `npm run build` 成功。

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Achievements JSON passes supporting-data validation
    Tool: Bash
    Steps: Run `node scripts/validate-supporting-data.mjs` and then `npm run build`.
    Expected: Supporting-data validator exits 0 and build succeeds.
    Evidence: .sisyphus/evidence/task-5-achievements-happy.txt

  Scenario: Invalid achievement gameKey is rejected
    Tool: Bash
    Steps: Backup `src/data/achievementsData.json`; change a `condition.gameKey` that currently uses a real game id to `"game-unknown"`; run `node scripts/validate-supporting-data.mjs`; restore file.
    Expected: Validator exits non-zero and reports unknown game ID.
    Evidence: .sisyphus/evidence/task-5-achievements-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `src/data/achievementsData.json`, `src/data/index.js`, `src/modules/achievements.js`, `src/modules/homeModules.js`, `src/modules/progress.js`, `scripts/validate-supporting-data.mjs`

- [x] 6. 迁移 learningPath 数据并保留阶段解锁语义

  **What to do**: 将 `src/data/learningPath.js` 迁移为 `src/data/learningPath.json`，顶层采用 `{ learningPath }`。在 `src/data/index.js` 同步导出 `learningPath`，并把 `src/modules/progress.js` 与 `src/modules/homeModules.js` 的学习路径导入改为统一入口。将 `scripts/validate-supporting-data.mjs` 的学习路径校验改为读取 JSON，继续验证 `stage.id` 唯一性、`focusElements/requiredElements`、`unlockedExperiments`、`unlockedGames`、`unlockedFeatures` 的引用与数组规则。保持 `selectedStageId = learningPath.stages[0]?.id` 的初始化逻辑兼容。
  **Must NOT do**: 不重命名 stage id、不改变 `requiredCount` 规则、不扩展学习阶段数量、不重构进度庆祝逻辑。

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: 数据集小、消费者集中、校验规则已存在。
  - Skills: `[]` - No mandatory skill; 重点在平滑迁移与引用保持。
  - Omitted: `[frontend-design, test-driven-development]` - 不涉及视觉改造，也不走 TDD。

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 7, 8 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/data/learningPath.js:1-54` - 学习路径当前为对象顶层包裹 `stages`，迁移到 JSON 时需保持该外形。
  - API/Type: `src/modules/progress.js:2-3,17-57,91-109` - 进度页直接依赖 `learningPath.stages` 与 `requiredCount`。
  - API/Type: `src/modules/homeModules.js:1-4` - 首页模块会读取学习阶段内容作预览。
  - Test: `scripts/validate-supporting-data.mjs:125-158` - 当前学习路径校验覆盖 stage id、元素引用、实验与游戏解锁关系。

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/data/learningPath.json` 存在且由 `src/data/index.js` 同步导出 `learningPath`。
  - [ ] `src/modules/progress.js` 与 `src/modules/homeModules.js` 不再直接导入 `../data/learningPath.js`。
  - [ ] `node scripts/validate-supporting-data.mjs` 成功，学习路径相关校验全部通过。
  - [ ] `npm run build` 成功。

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Learning path JSON passes supporting-data validation
    Tool: Bash
    Steps: Run `node scripts/validate-supporting-data.mjs` and then `npm run build`.
    Expected: Supporting-data validator exits 0 and build succeeds.
    Evidence: .sisyphus/evidence/task-6-learning-path-happy.txt

  Scenario: Unknown unlocked experiment is rejected
    Tool: Bash
    Steps: Backup `src/data/learningPath.json`; change the first stage's first `unlockedExperiments` entry to `"exp-missing"`; run `node scripts/validate-supporting-data.mjs`; restore file.
    Expected: Validator exits non-zero and reports unknown `experimentId`.
    Evidence: .sisyphus/evidence/task-6-learning-path-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `src/data/learningPath.json`, `src/data/index.js`, `src/modules/progress.js`, `src/modules/homeModules.js`, `scripts/validate-supporting-data.mjs`

- [x] 7. 收敛重复内容元数据到共享配置模块

  **What to do**: 新建 `src/data/contentMeta.js`，只收敛 **当前已确认重复** 的内容元数据，禁止开放式“顺手整理”。至少包括：元素类别中文名/颜色（来自 `renderTable.js`、`timeline.js`、`homeModules.js`、`detailPanel.js`、`compare.js`）、安全等级 label/color/meta（来自 `renderTable.js`、`detailPanel.js`、`compare.js`、`lab.js`）、稀有度标签（来自 `renderTable.js`、`compare.js`、`achievements.js`）、学习路径 label 字典（来自 `progress.js`）、游戏元数据/标签（来自 `games.js`、`progress.js`）、成就类别元数据（来自 `achievements.js`）。将上述模块改为从共享配置导入；仅在 UI 层保留真正模块私有、无重复的常量（例如 `DRAG_BATCH_SIZE`、`MEMORY_PAIR_COUNT`）。
  **Must NOT do**: 不扩大为设计系统改造；不改 CSS 变量命名；不改业务逻辑；不把不重复、强模块私有的常量硬塞进共享配置。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: 这是一次跨多个消费者的去重收敛，容易引入回归，必须严格受控。
  - Skills: `[]` - No mandatory skill; 重点是引用收敛与语义保持。
  - Omitted: `[frontend-design, test-driven-development]` - 不做视觉重设计，也不切换到 TDD 流程。

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 8 | Blocked By: 2, 4, 5, 6

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `src/modules/renderTable.js:9-51` - 现有类别/稀有度/安全元数据集中且最完整，可作为共享配置基线。
  - Pattern: `src/modules/timeline.js:4-30` - 再次定义类别名与颜色，属于明确重复。
  - Pattern: `src/modules/detailPanel.js:13-32` - 再次定义类别与安全标签。
  - Pattern: `src/modules/compare.js:9-44` - 再次定义类别、安全、稀有度与颜色映射。
  - Pattern: `src/modules/homeModules.js:6-17` - 首页类别元数据与前述重复，但颜色值使用 CSS 变量表现层语义。
  - Pattern: `src/modules/progress.js:19-53` - 学习路径相关标签字典必须集中管理。
  - Pattern: `src/modules/lab.js:11-33` - 安全标签与主题元数据在此重复定义。
  - Pattern: `src/modules/games.js:11-41` - 游戏 key 与 meta 是共享内容配置，不应散落。
  - Pattern: `src/modules/achievements.js:14-19` - 成就类别元数据需要共享而非局部重复。

  **Acceptance Criteria** (agent-executable only):
  - [ ] `src/data/contentMeta.js` 存在，并承载上述已确认重复的共享内容元数据。
  - [ ] `renderTable.js`、`timeline.js`、`detailPanel.js`、`compare.js`、`homeModules.js`、`progress.js`、`lab.js`、`games.js`、`achievements.js` 均改为从共享配置读取对应重复元数据。
  - [ ] `npm run build` 成功，证明跨模块收敛未破坏导入链。
  - [ ] 通过文本搜索确认旧的重复字典不再保留多份副本（允许真正模块私有常量继续存在）。

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Shared content meta builds cleanly
    Tool: Bash
    Steps: Run `npm run build`; then run a PowerShell audit such as `Get-ChildItem src/modules -Recurse -Filter *.js | Select-String -Pattern 'const CATEGORY_LABELS|const categoryNames|const SAFETY_LABELS|const RARITY_LABELS|const GAME_LABELS|const EXPERIMENT_LABELS|const FEATURE_LABELS'`.
    Expected: Build succeeds; audit output is empty or limited only to the new shared config import usage, not duplicated constant declarations.
    Evidence: .sisyphus/evidence/task-7-content-meta-happy.txt

  Scenario: Missing shared export breaks build immediately
    Tool: Bash
    Steps: Backup `src/data/contentMeta.js`; temporarily remove one exported shared constant used by a consumer (for example safety labels); run `npm run build`; restore file.
    Expected: Build exits non-zero with a missing export/import error, proving consumers are wired to the shared config.
    Evidence: .sisyphus/evidence/task-7-content-meta-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `src/data/contentMeta.js`, `src/modules/renderTable.js`, `src/modules/timeline.js`, `src/modules/detailPanel.js`, `src/modules/compare.js`, `src/modules/homeModules.js`, `src/modules/progress.js`, `src/modules/lab.js`, `src/modules/games.js`, `src/modules/achievements.js`

- [x] 8. 加固验证链路、数据烟雾测试与导入审计

  **What to do**: 在现有验证链路基础上完成三件事：
  1. 在 `package.json` 中显式新增 `validate:elements`、`validate:supporting`、`validate:data` 三个 scripts，分别包装两个 Node 校验脚本与其组合执行入口；
  2. 新增 `tests/shell/content-data-smoke.spec.ts`，至少覆盖：首页加载后点击一个元素单元格、打开故事入口、打开实验入口或测验入口中的至少两个，并断言对应容器/模态层成功显示；
  3. 增加导入审计，确保 `src/main.js` 与 `src/modules/**/*.js` 不再直接导入原始数据文件，只允许通过 `src/data/index.js` 访问内容数据。
  烟雾测试固定使用已有稳定选择器/结构：如 `.element-cell[data-atomic-number="8"]`、`#btn-story`、`#btn-lab`、`#btn-quiz`、`[data-testid="detail-panel"]`、`#story .story-container`、`#lab`、`#quiz-modal`。
  **Must NOT do**: 不把本任务扩展成全站 E2E 补齐；不在这里做 CI/CD 改造；不为审计引入复杂 AST 工具链，文本级审计即可。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: 该任务收尾并定义最终验收链，涉及脚本、测试与全仓审计。
  - Skills: `[verification-before-completion]` - 用于强制在宣称迁移完成前跑完 build、validator、Playwright 与导入审计。
  - Omitted: `[frontend-design]` - 这是验证任务，不是界面设计任务。

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: F1, F2, F3, F4 | Blocked By: 2, 3, 4, 5, 6, 7

  **References** (executor has NO interview context - be exhaustive):
  - API/Type: `package.json:6-18` - 当前仅有 `dev/build/preview`，尚未暴露数据校验 scripts。
  - Test: `playwright.config.ts:3-24` - 现有 Playwright 已配置 `npm run preview` 作为 webServer。
  - Test: `tests/shell/home-shell.spec.ts:3-228` - 现有壳层测试模式与选择器风格，应保持一致。
  - Pattern: `src/main.js:94-97` - `#global-loader` 在初始化成功后会隐藏，可作为 smoke 起点。
  - Pattern: `src/modules/detailPanel.js:99-116` - `#btn-story` 是稳定故事入口。
  - Pattern: `src/modules/detailPanel.js:119-158` - 详情面板内存在 `#btn-quiz` 与 `#btn-lab` 绑定逻辑，可作为 smoke 入口依据。
  - Pattern: `src/modules/lab.js:98-118` - `#lab` 页面与反应列表依赖数据加载，适合做数据烟雾回归。

  **Acceptance Criteria** (agent-executable only):
  - [ ] `package.json` 新增 `validate:elements`、`validate:supporting`、`validate:data`，且可直接执行成功。
  - [ ] `npm run build`、`npm run validate:data`、`npx playwright test tests/shell/home-shell.spec.ts` 全部成功。
  - [ ] `tests/shell/content-data-smoke.spec.ts` 存在并通过，至少覆盖元素详情 + 两个数据驱动入口。
  - [ ] 业务模块原始数据导入审计通过：`src/main.js` 与 `src/modules/**/*.js` 不再直接导入 `src/data/*.json` 或旧的 `src/data/*.js` 数据文件。

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full verification chain passes
    Tool: Bash
    Steps: Run `npm run build`; run `npm run validate:data`; run `npx playwright test tests/shell/home-shell.spec.ts`; run `npx playwright test tests/shell/content-data-smoke.spec.ts`; run a PowerShell import audit across `src/main.js` and `src/modules/**/*.js`.
    Expected: All commands exit 0; Playwright passes; import audit finds no direct business-side imports of raw data files.
    Evidence: .sisyphus/evidence/task-8-verification-happy.txt

  Scenario: Import audit catches a forbidden raw data import
    Tool: Bash
    Steps: Backup one consumer module such as `src/modules/quiz.js`; temporarily replace its `src/data/index.js` import with a direct raw data import; run the import audit command; restore file.
    Expected: Audit exits with a detectable match showing the forbidden raw data import.
    Evidence: .sisyphus/evidence/task-8-verification-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `package.json`, `tests/shell/content-data-smoke.spec.ts`, `scripts/*.mjs`, `src/main.js`, `src/modules/**/*.js`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle

  **What to do**: 让 oracle 对照本计划逐项核对 1-8 的实现结果，确认是否真的采用了 `src/data/*.json` + `src/data/index.js` 单一入口、是否保持同步 bootstrap、是否未引入 SQLite/backend/fetch 异步加载、是否完成了共享内容元数据收敛与验证链加固。
  **Tool**: task/oracle
  **Steps**:
  1. 读取 `.sisyphus/plans/json-content-migration.md` 与实现后的 diff/关键文件。
  2. 针对计划中的 Must Have / Must NOT Have / 任务 1-8 Acceptance Criteria 逐项核对。
  3. 输出 PASS/FAIL 清单，并标明任何偏离项的文件路径。
  **Expected**: oracle 给出明确 PASS；不存在“实现了 JSON，但绕过 `src/data/index.js`”或“改成 async fetch”之类的偏离。
  **Evidence**: `.sisyphus/evidence/f1-plan-compliance.md`

- [x] F2. Code Quality Review — unspecified-high

  **What to do**: 让高强度审查代理检查 JSON loader、校验脚本、共享配置与消费者改造是否存在重复逻辑、脆弱导入、未使用导出、隐式数据 shape 假设、脏回退兼容代码或可避免的复杂度。
  **Tool**: task/unspecified-high
  **Steps**:
  1. 审查 `src/data/index.js`、`src/data/contentMeta.js`、`scripts/validate-*.mjs`、所有改动过的 `src/modules/*.js`。
  2. 标出重复 mapping、死代码、直接 raw data import 残留、脆弱字符串常量、无必要的兼容层。
  3. 输出 PASS/FAIL 与建议修复清单。
  **Expected**: 无阻塞级代码质量问题；若有建议，必须不超出本次迁移 scope。
  **Evidence**: `.sisyphus/evidence/f2-code-quality.md`

- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)

  **What to do**: 运行完整 agent-executed 验证链，并用 Playwright 做真实 UI 路径冒烟，确认 JSON 内容已被页面实际消费，而不只是脚本通过。
  **Tool**: Bash + Playwright
  **Steps**:
  1. 运行 `npm run build`。
  2. 运行 `npm run validate:data`。
  3. 运行 `npx playwright test tests/shell/home-shell.spec.ts`。
  4. 运行 `npx playwright test tests/shell/content-data-smoke.spec.ts`。
  5. 在 Playwright smoke 中至少验证：`.element-cell[data-atomic-number="8"]` 可点击，`[data-testid="detail-panel"]` 可见，`#btn-story` 可打开 `#story .story-container`，`#btn-lab` 或 `#btn-quiz` 可成功打开 `#lab` 或 `#quiz-modal`。
  **Expected**: 所有命令 exit 0，且 UI smoke 证明 JSON 数据已真实驱动详情/故事/实验或测验入口。
  **Evidence**: `.sisyphus/evidence/f3-manual-qa.txt`

- [x] F4. Scope Fidelity Check — deep

  **What to do**: 让 deep 代理审查最终 diff，确认这次工作没有借 JSON 迁移之名扩展到 SQLite、后端化、i18n、状态管理重写、UI 重设计、成就/游戏规则改写或开放式常量治理。
  **Tool**: task/deep
  **Steps**:
  1. 审查最终 diff 与关键文件清单。
  2. 对照本计划的 OUT-of-scope 与 Must NOT Have 列表。
  3. 输出 PASS/FAIL；若发现越界改动，逐项标出文件与越界原因。
  **Expected**: 最终 diff 严格聚焦 JSON 内容迁移、共享元数据收敛、校验脚本适配与测试加固。
  **Evidence**: `.sisyphus/evidence/f4-scope-fidelity.md`

## Commit Strategy
- Default: **单一整合提交**，在 F1-F4 全部通过并获得用户明确 okay 之后再提交。
- Recommended commit message: `refactor(data): migrate static content modules to json-backed loaders`
- 禁止在迁移中途创建与计划无关的“整理型”提交。

## Success Criteria
- 内容型数据不再以大型 JS 字面量文件为主存储介质。
- 所有业务模块通过统一入口获取内容数据，避免原始数据文件直连。
- 现有构建、数据校验、Playwright 壳层测试全部保持通过。
- 新增的数据烟雾测试可以证明 JSON 迁移未破坏核心内容页面入口。
- 共享元数据不再重复散落于多个模块，后续内容维护入口清晰。
