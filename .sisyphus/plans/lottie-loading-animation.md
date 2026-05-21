# Lottie Loading Animation Replacement

## TL;DR
> **Summary**: Replace the existing CSS global loader spinner with the user's converted cat Lottie JSON animation while preserving the current `#global-loader.hidden` startup lifecycle. Functional progress indicators remain untouched.
> **Deliverables**:
> - `public/animations/d4980_cat360.json` copied from `D:\迅雷下载\d4980_cat360.json`
> - `lottie-web` dependency installed and locked
> - Global loader DOM/CSS/JS updated for a 90px × 90px rounded Lottie animation
> - Loader text changed exactly to `打滚加载中...`
> - Focused Playwright coverage for asset serving, DOM/CSS contract, lifecycle, and fallback
> **Effort**: Short
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 6 → Final Verification

## Context
### Original Request
用户要更换现在的加载动画，先提供 dotLottie `.lottie` 文件，随后转换为普通 Lottie JSON：`D:\迅雷下载\d4980_cat360.json`。最终要求：所有加载统一替换、动画圆角 `15px`、尺寸 `90px * 90px`、加载文字改为“打滚加载中...”。

### Interview Summary
- 格式选择：普通 Lottie JSON（`.json`），不是 dotLottie `.lottie`。
- 推荐资源位置：`public/animations/d4980_cat360.json`。
- 运行时 URL：`/animations/d4980_cat360.json`。
- “所有加载统一替换”经探索后解释为：替换实际视觉加载器；学习进度、实验进度、成就/游戏进度等功能性 progress 不属于加载动画，必须保留。
- 用户将原定 `160px * 160px` 改为 `100px * 100px`，最终改为 `90px * 90px`。

### Research Findings
- `index.html`: 全局加载器 DOM 为 `#global-loader.global-loader`，内部有 `.loader-spinner` 与 `.loader-text`。
- `src/styles/base.css`: 全局 loader 样式约在 240-279 行，当前使用 CSS spinner 与 `loader-spin`。
- `src/main.js`: 全局 loader 隐藏逻辑约在 201-214 行，通过给 `#global-loader` 添加 `.hidden` 完成。
- 依赖现状：没有 Lottie/dotLottie 相关依赖。
- 测试基础设施：Playwright 已配置；`tests/shell/home-shell.spec.ts` 已使用 `#global-loader.hidden` + `window.appState.elements` 判断启动完成。
- 补充探索：其它 `progress` 命中主要是业务进度展示，不能替换。

### Metis Review (gaps addressed)
- 明确依赖决策：使用 `lottie-web`，更新 `package.json` 与 lockfile。
- 明确 fallback：Lottie 文件缺失/损坏不能阻塞应用初始化；保留文案和非阻塞 fallback。
- 明确生命周期：loader 隐藏后暂停/销毁 Lottie 实例，避免持续运行。
- 明确测试：检查资源 200、文字、90px/90px/15px、隐藏生命周期、`window.appState.elements`、无 happy-path Lottie 控制台错误。
- 明确防范围蔓延：不替换功能性 progress UI。

## Work Objectives
### Core Objective
Use the converted Lottie JSON cat animation as the project's unified visual startup loader without changing app initialization semantics or business progress indicators.

### Deliverables
- Static animation asset at `public/animations/d4980_cat360.json`.
- `lottie-web` installed as a production dependency.
- Global loader DOM updated to host a Lottie container while preserving `#global-loader` and `.loader-text`.
- Global loader CSS updated to render the animation container at exactly 90px × 90px with 15px radius.
- Runtime loader initialization added in `src/main.js`, with graceful fallback and cleanup on hide.
- Playwright tests covering loader contract and fallback behavior.

### Definition of Done (verifiable conditions with commands)
- `Test-Path -LiteralPath "public/animations/d4980_cat360.json"` returns `True`.
- `npm run build` exits 0.
- `npx playwright test tests/shell/home-shell.spec.ts` exits 0.
- `npx playwright test tests/shell/global-loader.spec.ts` exits 0 after the new focused spec is added.
- During Playwright preview, `/animations/d4980_cat360.json` returns HTTP 200.
- In browser runtime, `#global-loader` eventually receives `.hidden`, and `window.appState.elements.length >= 118` remains true.

### Must Have
- Loader text exactly `打滚加载中...` with three ASCII periods.
- Animation container computed `width` exactly `90px`.
- Animation container computed `height` exactly `90px`.
- Animation container computed `border-radius` exactly `15px`.
- Runtime URL exactly `/animations/d4980_cat360.json`.
- No committed reference to `D:\迅雷下载\d4980_cat360.json`; that path is copy source only.
- Happy path has no console errors containing `lottie`, `d4980_cat360`, or `/animations/d4980_cat360.json`.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- MUST NOT modify learner-state behavior, `window.appState`, storage APIs, router behavior, or initialization ordering beyond loader visual handling.
- MUST NOT replace learning progress, lab experiment progress, achievement/game progress, progress rings, progress bars, or dashboard stats with the cat animation.
- MUST NOT add dotLottie `.lottie` support or `@dotlottie/*` dependencies.
- MUST NOT hardcode the local Windows download path in source code, tests, or docs beyond this plan's asset-copy instruction.
- MUST NOT require manual visual inspection for acceptance.
- MUST NOT remove `#global-loader` or break existing `.hidden` readiness checks.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after with existing Playwright framework, because current implementation exists and this is a UI replacement.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.
- Required commands:
  - `npm run build`
  - `npx playwright test tests/shell/home-shell.spec.ts`
  - `npx playwright test tests/shell/global-loader.spec.ts`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. This plan is short; fewer tasks are intentional because the change is tightly coupled around one global loader.

Wave 1: Task 1 asset/dependency foundation `[quick]`
Wave 2: Task 2 DOM/CSS and Task 4 test authoring can run in parallel after Task 1 `[quick, quick]`
Wave 3: Task 3 runtime Lottie lifecycle, Task 5 fallback test refinement, Task 6 verification `[quick, quick, unspecified-high]`

### Dependency Matrix (full, all tasks)
- Task 1: no blockers.
- Task 2: blocked by Task 1 for asset name and dependency decision.
- Task 3: blocked by Task 1 and Task 2.
- Task 4: blocked by Task 1 and can be written before Task 3 completes if it targets intended selectors.
- Task 5: blocked by Task 3 and Task 4.
- Task 6: blocked by Tasks 1-5.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 1 task → `quick`
- Wave 2 → 2 tasks → `quick`
- Wave 3 → 3 tasks → `quick`, `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add the Lottie asset and dependency foundation

  **What to do**:
  1. Verify the user-provided source asset exists at `D:\迅雷下载\d4980_cat360.json`.
  2. Create `public/animations/` if it does not already exist.
  3. Copy the file to `public/animations/d4980_cat360.json`.
  4. Validate that `public/animations/d4980_cat360.json` is parseable JSON.
  5. Install `lottie-web` as a production dependency so the implementation can load ordinary Lottie JSON.
  6. Confirm `package.json` and the package lockfile changed only as expected.

  **Must NOT do**:
  - Do not commit or reference `D:\迅雷下载\d4980_cat360.json` in application source or tests.
  - Do not install `@dotlottie/*` packages.
  - Do not rename the destination file; downstream tasks depend on exactly `public/animations/d4980_cat360.json`.

  **Recommended Agent Profile**:
  - Category: `quick` - Asset copy, dependency install, and JSON validation are straightforward.
  - Skills: [] - No specialized skill required beyond normal repo discipline.
  - Omitted: [`frontend-design`] - No design work is needed; design is already decided.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2, 3, 4, 5, 6] | Blocked By: []

  **References**:
  - Asset source: `D:\迅雷下载\d4980_cat360.json` - copy source only, never hardcode in app runtime.
  - Asset destination: `public/animations/d4980_cat360.json` - static Vite public asset.
  - Runtime URL: `/animations/d4980_cat360.json` - browser fetch path after Vite serves `public/`.
  - Manifest: `package.json` - add `lottie-web` dependency.

  **Acceptance Criteria**:
  - [ ] `Test-Path -LiteralPath "public/animations/d4980_cat360.json"` returns `True`.
  - [ ] `node -e "JSON.parse(require('fs').readFileSync('public/animations/d4980_cat360.json','utf8')); console.log('valid')"` prints `valid` and exits 0.
  - [ ] `npm ls lottie-web` exits 0 and lists `lottie-web`.
  - [ ] `package.json` contains `lottie-web` under dependencies.
  - [ ] No source file under `src/`, `tests/`, or `index.html` contains `D:\迅雷下载`.

  **QA Scenarios**:
  ```
  Scenario: Asset copied and parseable
    Tool: Bash
    Steps: Run `Test-Path -LiteralPath "public/animations/d4980_cat360.json"`; then run `node -e "JSON.parse(require('fs').readFileSync('public/animations/d4980_cat360.json','utf8')); console.log('valid')"`.
    Expected: First command outputs `True`; second command outputs `valid` and exits 0.
    Evidence: .sisyphus/evidence/task-1-asset-valid.txt

  Scenario: No local download path leaked
    Tool: Bash
    Steps: Search tracked implementation files for `D:\迅雷下载` after the asset copy.
    Expected: No matches in application source, tests, `index.html`, `package.json`, or lockfile.
    Evidence: .sisyphus/evidence/task-1-no-local-path.txt
  ```

  **Commit**: YES | Message: `feat(loader): add lottie asset and dependency` | Files: [`public/animations/d4980_cat360.json`, `package.json`, package lockfile]

- [x] 2. Replace global loader markup and CSS contract

  **What to do**:
  1. Modify `index.html` global loader only.
  2. Preserve the outer element: `<div id="global-loader" class="global-loader">`.
  3. Replace or augment the old `.loader-spinner` element with a Lottie host element using stable selectors:
     ```html
     <div class="loader-lottie" data-loader-lottie aria-hidden="true"></div>
     <span class="loader-text">打滚加载中...</span>
     ```
  4. Update `src/styles/base.css` loader section around the existing `.global-loader`, `.loader-spinner`, `.loader-text`, and `loader-spin` styles.
  5. Add `.loader-lottie` styles with exact sizing:
     ```css
     .loader-lottie {
       width: 90px;
       height: 90px;
       border-radius: 15px;
       overflow: hidden;
       display: flex;
       align-items: center;
       justify-content: center;
     }

     .loader-lottie svg,
     .loader-lottie canvas {
       width: 100% !important;
       height: 100% !important;
       display: block;
     }
     ```
  6. Remove old visual spinner usage from the global loader. If keeping `.loader-spinner` for fallback, it must not be visible on the happy path and must not use the old spinning border as the primary UI.
  7. Preserve `.global-loader.hidden` behavior.

  **Must NOT do**:
  - Do not remove `#global-loader`.
  - Do not change app structure outside the global loader markup.
  - Do not alter functional progress bars/rings in modules.
  - Do not use CSS dimensions other than `90px`, `90px`, and `15px` for the Lottie host.

  **Recommended Agent Profile**:
  - Category: `quick` - Small DOM/CSS update in known files.
  - Skills: [] - Visual values are specified; no design exploration needed.
  - Omitted: [`frontend-design`] - The visual design is already fixed by user requirements.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [3, 5, 6] | Blocked By: [1]

  **References**:
  - Pattern: `index.html` - existing `#global-loader.global-loader` markup must be preserved at the outer level.
  - Pattern: `src/styles/base.css` around loader styles - keep loader-related CSS co-located.
  - Test: `tests/shell/home-shell.spec.ts` - existing tests depend on `#global-loader.hidden`.

  **Acceptance Criteria**:
  - [ ] `index.html` contains `data-loader-lottie` exactly once inside `#global-loader`.
  - [ ] `index.html` contains loader text exactly `打滚加载中...`.
  - [ ] `src/styles/base.css` defines `.loader-lottie` with `width: 90px`, `height: 90px`, `border-radius: 15px`, and `overflow: hidden`.
  - [ ] Existing `.global-loader.hidden` rule still exists and still hides the loader.

  **QA Scenarios**:
  ```
  Scenario: Static DOM/CSS contract exists
    Tool: Bash
    Steps: Search `index.html` for `data-loader-lottie` and `打滚加载中...`; search `src/styles/base.css` for `.loader-lottie`, `width: 90px`, `height: 90px`, and `border-radius: 15px`.
    Expected: All required strings exist exactly in the expected files.
    Evidence: .sisyphus/evidence/task-2-static-contract.txt

  Scenario: Existing readiness selector preserved
    Tool: Bash
    Steps: Search `index.html` for `id="global-loader"`; search `src/styles/base.css` for `.global-loader.hidden`.
    Expected: Both selectors still exist.
    Evidence: .sisyphus/evidence/task-2-readiness-selector.txt
  ```

  **Commit**: YES | Message: `feat(loader): update global loader shell` | Files: [`index.html`, `src/styles/base.css`]

- [x] 3. Initialize and clean up the Lottie animation lifecycle

  **What to do**:
  1. Modify `src/main.js` only in the loader-related area and imports.
  2. Import `lottie-web` using the package API supported by the installed version.
  3. Add a small loader initializer near the current startup loader code. The implementation must:
     - Find `document.querySelector('[data-loader-lottie]')`.
     - Load `/animations/d4980_cat360.json`.
     - Set `renderer: 'svg'`, `loop: true`, `autoplay: true`.
     - Use `rendererSettings.preserveAspectRatio = 'xMidYMid meet'`.
     - Store the returned animation instance.
     - Catch initialization errors and add a fallback class such as `lottie-fallback` to the host or loader.
     - Register Lottie failure/error event handling in addition to synchronous `try/catch`, because asset fetch/parse failures may surface asynchronously after `loadAnimation` returns.
  4. Update the existing code path that adds `.hidden` to `#global-loader` so it also stops or destroys the Lottie instance after the loader is hidden.
  5. Make repeated initialization safe during Vite dev/HMR by destroying an existing instance before creating a new one if needed.
  6. Honor reduced motion by stopping or not autoplaying when `window.matchMedia('(prefers-reduced-motion: reduce)').matches` is true. The loader text must remain visible.

  **Must NOT do**:
  - Do not change the order of application data initialization.
  - Do not block app startup on Lottie asset fetch completion.
  - Do not throw uncaught errors if the Lottie JSON is missing or malformed.
  - Do not rely only on synchronous `try/catch` for missing/malformed asset handling; handle asynchronous Lottie error events too.
  - Do not mutate `window.appState` or storage APIs.

  **Recommended Agent Profile**:
  - Category: `quick` - Focused runtime integration in one file.
  - Skills: [] - API usage is straightforward; no external research should be necessary beyond installed package docs if needed.
  - Omitted: [`systematic-debugging`] - Not debugging an observed failure unless verification fails.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [5, 6] | Blocked By: [1, 2]

  **References**:
  - Pattern: `src/main.js` around lines 201-214 - preserve current `#global-loader` hide behavior.
  - API/Library: `lottie-web` `loadAnimation({ container, renderer, loop, autoplay, path, rendererSettings })` - ordinary Lottie JSON loading.
  - DOM: `index.html` `data-loader-lottie` - animation mount point.

  **Acceptance Criteria**:
  - [ ] App startup does not wait for the Lottie file before continuing initialization.
  - [ ] On happy path, Lottie renders inside `[data-loader-lottie]`.
  - [ ] On loader hide, the animation instance is stopped or destroyed.
  - [ ] Missing/malformed animation does not prevent `#global-loader.hidden` from eventually being added.
  - [ ] Reduced-motion users do not get a continuously autoplaying loader animation.

  **QA Scenarios**:
  ```
  Scenario: Happy-path runtime lifecycle
    Tool: Playwright
    Steps: Start the app through existing Playwright setup; navigate to `/`; inspect `[data-loader-lottie]` before or during startup if visible; wait for `#global-loader.hidden`; inspect `window.appState.elements.length`.
    Expected: Lottie host exists; `#global-loader` becomes hidden; `window.appState.elements.length >= 118`; no uncaught Lottie errors.
    Evidence: .sisyphus/evidence/task-3-lifecycle.png

  Scenario: Lottie asset failure is non-blocking
    Tool: Playwright
    Steps: Temporarily simulate `/animations/d4980_cat360.json` returning 404 via route interception in a test; navigate to `/`; wait for app readiness.
    Expected: Loader text remains in DOM; app initializes; `#global-loader.hidden` eventually appears; no uncaught exception blocks startup.
    Evidence: .sisyphus/evidence/task-3-fallback.txt
  ```

  **Commit**: YES | Message: `feat(loader): render lottie animation` | Files: [`src/main.js`]

- [x] 4. Add focused Playwright coverage for the loader contract

  **What to do**:
  1. Create `tests/shell/global-loader.spec.ts`.
  2. Use existing Playwright project conventions from `tests/shell/home-shell.spec.ts`.
  3. Add a helper that navigates to `/`, records console errors, and checks the static contract before the loader fully disappears when possible.
  4. Include assertions for:
     - `/animations/d4980_cat360.json` returns HTTP 200.
     - `#global-loader` exists.
     - `[data-loader-lottie]` exists inside `#global-loader`.
     - `.loader-text` has exact text `打滚加载中...`.
     - computed width is `90px`.
     - computed height is `90px`.
     - computed border-radius is `15px`.
     - `#global-loader` eventually has class `hidden`.
     - `window.appState.elements.length >= 118`.
     - no happy-path console error mentions `lottie`, `d4980_cat360`, or `/animations/d4980_cat360.json`.
  5. Add a mobile viewport test, e.g. `390x844`, that repeats the computed size/radius and hidden checks.

  **Must NOT do**:
  - Do not rely on manual screenshots as pass/fail.
  - Do not require the loader to stay visible for an arbitrary delay; tests must be robust if startup is fast.
  - Do not update unrelated tests unless the preserved selectors require it.

  **Recommended Agent Profile**:
  - Category: `quick` - Adds focused Playwright spec using existing setup.
  - Skills: [] - Existing Playwright patterns are enough.
  - Omitted: [`playwright`] - Plan execution agents may use Playwright tooling, but no separate browser skill is needed for writing the spec.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [5, 6] | Blocked By: [1]

  **References**:
  - Test: `tests/shell/home-shell.spec.ts` - reuse readiness pattern checking `#global-loader.hidden` and `window.appState.elements`.
  - Config: `playwright.config.ts` - existing Playwright setup.
  - Setup: `tests/setup/global-setup.ts` - preview server management.

  **Acceptance Criteria**:
  - [ ] `tests/shell/global-loader.spec.ts` exists.
  - [ ] The spec checks asset 200, exact text, computed `90px` width, computed `90px` height, computed `15px` radius, hidden lifecycle, and appState readiness.
  - [ ] `npx playwright test tests/shell/global-loader.spec.ts` passes after implementation.

  **QA Scenarios**:
  ```
  Scenario: Desktop loader contract test
    Tool: Playwright
    Steps: Run `npx playwright test tests/shell/global-loader.spec.ts` with default viewport.
    Expected: Test passes and verifies asset serving, DOM, text, computed style, hidden lifecycle, and app state.
    Evidence: .sisyphus/evidence/task-4-desktop-playwright.txt

  Scenario: Mobile loader contract test
    Tool: Playwright
    Steps: Run the same focused spec including a `390x844` viewport case.
    Expected: Test passes; computed loader dimensions remain 90px × 90px and radius remains 15px.
    Evidence: .sisyphus/evidence/task-4-mobile-playwright.txt
  ```

  **Commit**: NO | Message: `test(loader): verify lottie loader behavior` | Files: [`tests/shell/global-loader.spec.ts`]

- [x] 5. Add explicit fallback and no-scope-creep tests

  **What to do**:
  1. Extend `tests/shell/global-loader.spec.ts` with a failure-path test using Playwright route interception:
     - Intercept `**/animations/d4980_cat360.json`.
     - Fulfill with HTTP 404 or malformed JSON.
     - Navigate to `/`.
     - Assert app still initializes and `#global-loader.hidden` eventually appears.
  2. Add a no-scope-creep assertion using stable selectors or text from existing pages where available:
     - Verify progress-related UI is not globally replaced by `[data-loader-lottie]` outside `#global-loader`.
     - At minimum assert `document.querySelectorAll('[data-loader-lottie]').length === 1` on app startup.
  3. If a known progress page selector is stable, assert progress elements remain progress elements and do not contain the cat loader host.

  **Must NOT do**:
  - Do not make tests brittle by depending on exact progress percentages.
  - Do not navigate deep flows requiring learner state mutation unless existing test helpers already do so safely.
  - Do not accept a fallback that leaves the app stuck behind a visible loader.

  **Recommended Agent Profile**:
  - Category: `quick` - Focused Playwright failure-path coverage.
  - Skills: [] - Existing test setup is sufficient.
  - Omitted: [`systematic-debugging`] - Only use if this test exposes a failure during execution.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [6] | Blocked By: [3, 4]

  **References**:
  - Test: `tests/shell/global-loader.spec.ts` - extend focused loader spec.
  - Runtime: `src/main.js` fallback behavior from Task 3.
  - Guardrail: `src/modules/progress.js`, `src/lab-sim/experiments/apparatus-recognition.js`, `src/modules/achievements.js`, `src/modules/games.js`, `src/modules/homeModules.js` - functional progress must not be replaced.

  **Acceptance Criteria**:
  - [ ] Route-intercepted missing/malformed asset test passes.
  - [ ] App readiness still succeeds in the fallback test.
  - [ ] Test asserts `[data-loader-lottie]` is not duplicated across the app.
  - [ ] No functional progress component is intentionally changed by implementation diffs.

  **QA Scenarios**:
  ```
  Scenario: Missing animation asset fallback
    Tool: Playwright
    Steps: Run focused spec case that intercepts `/animations/d4980_cat360.json` with 404; wait for readiness.
    Expected: App reaches readiness; `#global-loader.hidden` is true; no uncaught exception blocks startup.
    Evidence: .sisyphus/evidence/task-5-missing-asset-fallback.txt

  Scenario: No duplicate/global progress replacement
    Tool: Playwright
    Steps: After app readiness, evaluate `document.querySelectorAll('[data-loader-lottie]').length`.
    Expected: Value is exactly `1`, and that element is inside `#global-loader`.
    Evidence: .sisyphus/evidence/task-5-no-scope-creep.txt
  ```

  **Commit**: YES | Message: `test(loader): verify lottie fallback` | Files: [`tests/shell/global-loader.spec.ts`]

- [x] 6. Run full verification and clean up implementation edges

  **What to do**:
  1. Run `npm run build`.
  2. Run `npx playwright test tests/shell/global-loader.spec.ts`.
  3. Run `npx playwright test tests/shell/home-shell.spec.ts`.
  4. Inspect diffs to confirm only intended files changed:
     - `public/animations/d4980_cat360.json`
     - `package.json`
     - package lockfile
     - `index.html`
     - `src/styles/base.css`
     - `src/main.js`
     - `tests/shell/global-loader.spec.ts`
  5. If any validation fails, fix only the smallest necessary loader-related issue and rerun the failed command.
  6. Capture evidence logs under `.sisyphus/evidence/`.

  **Must NOT do**:
  - Do not run formatters that rewrite unrelated files.
  - Do not broaden scope into progress modules or learner-state code.
  - Do not mark complete if Playwright or build fails.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Verification needs careful interpretation of build/test output and diffs.
  - Skills: [`verification-before-completion`] - Evidence before success claims.
  - Omitted: [`requesting-code-review`] - Final verification wave separately handles review.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [Final Verification] | Blocked By: [1, 2, 3, 4, 5]

  **References**:
  - Commands: `npm run build`, `npx playwright test tests/shell/global-loader.spec.ts`, `npx playwright test tests/shell/home-shell.spec.ts`.
  - Repo instructions: `AGENTS.md` verification section - build must pass before completion claim.
  - Existing readiness: `tests/shell/home-shell.spec.ts`.

  **Acceptance Criteria**:
  - [ ] `npm run build` exits 0.
  - [ ] `npx playwright test tests/shell/global-loader.spec.ts` exits 0.
  - [ ] `npx playwright test tests/shell/home-shell.spec.ts` exits 0.
  - [ ] Diff contains no modifications to `src/modules/progress.js`, lab progress logic, achievements progress, games progress, learner-state storage, or `src/data`.
  - [ ] Evidence files exist for build and both Playwright commands.

  **QA Scenarios**:
  ```
  Scenario: Production build remains healthy
    Tool: Bash
    Steps: Run `npm run build`.
    Expected: Command exits 0 with successful Vite production build output.
    Evidence: .sisyphus/evidence/task-6-build.txt

  Scenario: Existing shell readiness remains healthy
    Tool: Playwright
    Steps: Run `npx playwright test tests/shell/home-shell.spec.ts`.
    Expected: Existing shell tests pass, including readiness based on `#global-loader.hidden` and app state.
    Evidence: .sisyphus/evidence/task-6-home-shell.txt
  ```

  **Commit**: YES | Message: `test(loader): finalize lottie loader verification` | Files: [`tests/shell/global-loader.spec.ts`, any minimal fixes from verification]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: `feat(loader): add lottie asset and dependency`
- Commit 2: `feat(loader): render cat lottie global loader`
- Commit 3: `test(loader): verify lottie loader behavior`
- If fallback fixes are required, include them before Commit 3 or in `fix(loader): harden lottie fallback`.

## Success Criteria
- The app uses `/animations/d4980_cat360.json` for the global loading animation.
- The visible loading text is exactly `打滚加载中...`.
- The animation container is exactly 90px × 90px with 15px rounded corners.
- Existing app startup and `#global-loader.hidden` behavior still works.
- Business progress indicators are untouched.
- Build and focused Playwright tests pass.
