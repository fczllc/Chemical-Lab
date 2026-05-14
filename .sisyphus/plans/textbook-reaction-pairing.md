# Textbook Reaction Pairing Coverage

## TL;DR
> **Summary**: Replace the reaction-pairing game question pool with reviewed, game-usable reactions derived only from explicit chemical reaction equations in `src/data/textbooks/**/book.md`. Build a fail-closed extraction/review/validation workflow so every detected textbook equation is either included as a reviewed game reaction or explicitly excluded with a reason.
> **Deliverables**:
> - Deterministic textbook equation extractor and candidate report
> - Review/exclusion manifest covering every detected candidate
> - `src/data/reactions.json` updated so reaction-game records are textbook-sourced only
> - Validators for extraction coverage, game-pool purity, notation, and runtime integrity
> - Build + validation evidence under `.sisyphus/evidence/`
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 8 → Final Verification

## Context

### Original Request
User requested, in Chinese: “对于游戏里的反应配对弃，我要求将textbooks下课本里所有已明确的化学反应方程式都纳入进来。需要你制定一个计划，搜索教材里所有明确的反应方程试，做到反应配对游戏中来，覆盖当前的。”

### Interview Summary
- 收录边界：所有显式方程式。正文、表格、实验、习题、复习题里只要明确写出反应方程式就纳入；不从纯文字描述推导。
- 覆盖策略：教材数据替换。反应配对游戏只使用教材明确方程式；当前手写反应若无教材来源则移出游戏题库。
- 测试策略：只做校验。不新增 Playwright UI 自动化测试；使用 Node 校验脚本和 `npm run build`。最终仍执行代理 QA/审查。

### Research Findings
- 教材实际路径是 `src/data/textbooks/`，不是仓库根目录 `textbooks/`。
- 教材结构稳定：`src/data/textbooks/{volume}/book.md` + `images/*.jpg`；Markdown 可文本搜索，共 8 本人教版中文化学教材、3344 张图片。
- 显式方程式以 LaTeX-ish Markdown、HTML 表格、纯文本形式出现，例如 `\mathrm {C} + \mathrm {O}_{2} \xlongequal {点燃} \mathrm {CO}_{2}`、`Fe + CuSO4 = Cu + FeSO4`、`Na2CO3 + 2HCl = ...`。
- 反应游戏入口在 `index.html:149-153`，运行时由 `src/modules/games.js:656-926` 渲染，配对逻辑使用 `reactants[]` ↔ `products[]`，不是直接使用 `equationText`。
- 运行时反应数据来自 `src/data/index.js` 导出的 `src/data/reactions.json`；`src/data/reactions.js` 不是当前运行时入口。
- 游戏可用反应必须有 `id/name/description/reactants/products/curriculumTags`；教材来源记录还必须有 reviewed 来源状态。
- 现有校验/工作流包括 `scripts/validate-supporting-data.mjs`、`scripts/validate-chem-notation.mjs`、`scripts/textbook/validate-runtime-boundary.mjs`、`scripts/textbook/validate-runtime-integrity.mjs`、`playwright.config.ts`。本计划不新增 Playwright 测试。

### Metis Review (gaps addressed)
- Added explicit duplicate default: one runtime game reaction per normalized equation, multiple source references.
- Added explicit Markdown boundary: scan `book.md`; do not OCR images or infer from captions unless equation text appears in Markdown.
- Added fail-closed candidate lifecycle: every detected candidate is included or excluded with a reason.
- Added validator requirements for missing equations, stale/non-textbook game reactions, empty reactants/products, and unreviewed records.
- Added guardrail that no new Playwright specs are allowed.

### Oracle Architecture Review (gaps addressed)
- Keep three artifacts separate: extracted candidates, reviewed runtime game reactions, exclusions.
- Keep runtime `src/data/reactions.json` simple and game-compatible; do not load raw extraction artifacts in app runtime.
- Use stable source-derived/hash IDs, never array-index IDs.
- Exclude ambiguous candidates instead of weakening gameplay assumptions.
- Require generated counts by textbook file before completion.

## Work Objectives

### Core Objective
Every explicit reaction equation in `src/data/textbooks/**/book.md` must be accounted for, and the reaction-pairing game must use only reviewed, textbook-derived, game-usable reaction records.

### Deliverables
- `scripts/textbook/extract-reaction-equations.mjs`: deterministic candidate extractor/report generator.
- `src/data/textbookIngestion/reactionEquationReview.json`: reviewed include/exclude manifest.
- `scripts/textbook/build-reviewed-reactions.mjs`: runtime reaction data generator/updater from reviewed inclusions.
- Updated `src/data/reactions.json`: textbook-derived reviewed game reactions only.
- `scripts/textbook/validate-reaction-extraction.mjs`: candidate coverage validator.
- `scripts/validate-reaction-game-pool.mjs`: game-pool purity/usability validator.
- `package.json` script entries for the new validators/build step if needed.
- Evidence files under `.sisyphus/evidence/` showing validator and build output.

### Definition of Done (verifiable conditions with commands)
- `node scripts/textbook/extract-reaction-equations.mjs --check --report .sisyphus/evidence/textbook-reaction-extraction-report.json` exits 0 and reports all candidates by textbook file.
- `node scripts/textbook/validate-reaction-extraction.mjs` exits 0 and prints `missingExplicitEquations: 0`, `unreviewedCandidates: 0`, and `unaccountedCandidates: 0`.
- `node scripts/validate-reaction-game-pool.mjs` exits 0 and prints `nonTextbookGameReactions: 0`, `unreviewedGameReactions: 0`, and `emptyReactantsOrProducts: 0`.
- `node scripts/validate-supporting-data.mjs` exits 0.
- `node scripts/validate-chem-notation.mjs` exits 0.
- `node scripts/textbook/validate-runtime-boundary.mjs` exits 0.
- `node scripts/textbook/validate-runtime-integrity.mjs` exits 0.
- `npm run build` exits 0.
- `src/modules/games.js` remains compatible with `reactants[]`/`products[]` matching and has no fallback to non-textbook reaction questions.
- No new `tests/**/*.spec.ts` files are added for this task.

### Must Have
- Include every explicit formula reaction equation found in Markdown text, Markdown tables, HTML tables, math blocks, and inline math inside `src/data/textbooks/**/book.md`.
- Treat explicit exercise/review/question equations as in scope if the full equation is present.
- Preserve the exact original equation text in `equationText` or source metadata.
- Store normalized equation text separately from original text.
- Produce non-empty `reactants[]` and `products[]` for every runtime game reaction.
- Store at least one source reference per runtime game reaction: source file, line range or start line, excerpt, and textbook volume.
- Deduplicate runtime game records by normalized equation while retaining all source references.
- Keep excluded candidates in the manifest with reason codes.
- Keep generated/review artifacts out of runtime imports; app runtime imports finalized data through `src/data/index.js` only.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Must NOT infer reactions from prose-only descriptions.
- Must NOT OCR images or treat image-only equations as in scope unless equation text exists in `book.md`.
- Must NOT include word-only reactions like `碳 + 氧气 → 二氧化碳` unless formula tokens are explicitly present and can be split safely.
- Must NOT include incomplete/fill-in-the-blank equations as game records; capture them as excluded candidates with reason.
- Must NOT exclude a complete explicit formula equation merely because automatic parsing failed; provide a reviewed manifest override for `reactants[]`/`products[]` unless the equation cannot be represented by the game model.
- Must NOT keep current hand-authored game reactions unless matched to explicit textbook source metadata.
- Must NOT add new Playwright UI automated tests.
- Must NOT redesign reaction-game UI/mechanics unless strictly required for data compatibility.
- Must NOT build a general chemistry parser/balancer; use conservative parsing and reviewed exclusions.
- Must NOT silently correct textbook equations; preserve source and flag issues separately.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: validation-only + build; no new Playwright automated tests.
- QA policy: Every task has command-based agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 extractor contract, Task 2 parser/normalizer, Task 3 review manifest schema.
Wave 2: Task 4 runtime generator/data replacement, Task 6 validator implementation, Task 7 package script integration.
Wave 3: Task 5 game data boundary compatibility, Task 8 full data review/fill-in, Task 9 documentation/evidence report.
Wave 4: Task 10 validation/build execution and remediation.

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2, 3, 6, 8.
- Task 2 blocks Tasks 4, 6, 8.
- Task 3 blocks Tasks 4, 6, 8.
- Task 4 blocks Tasks 5, 6, 10.
- Task 5 blocks Task 10.
- Task 6 blocks Task 7 and Task 10.
- Task 7 blocks Task 10.
- Task 8 blocks Task 10.
- Task 9 depends on Tasks 1-8 and blocks Task 10 evidence completeness.
- Task 10 blocks Final Verification Wave.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → `unspecified-high`, `deep`, `quick`
- Wave 2 → 3 tasks → `unspecified-high`, `deep`, `quick`
- Wave 3 → 3 tasks → `quick`, `unspecified-high`, `writing`
- Wave 4 → 1 task → `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Define and implement textbook equation candidate extraction

  **What to do**: Create `scripts/textbook/extract-reaction-equations.mjs` that scans `src/data/textbooks/**/book.md`, extracts explicit equation-like candidates from math blocks, inline math, Markdown tables, HTML table cells, and plain text. The extractor must emit deterministic JSON with `candidateId`, `sourceFile`, `volume`, `lineStart`, `lineEnd`, `excerpt`, `rawEquationText`, `sourceContext`, and detected syntax features. Use stable IDs based on source path + line range + raw equation text hash. Add `--check` mode that compares current extraction to the review manifest coverage without writing runtime data.
  **Must NOT do**: Do not OCR images. Do not infer equations from prose. Do not write to `src/data/reactions.json` in this task. Do not parse ambiguous candidates into runtime records here.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Requires careful text processing across Markdown, LaTeX-ish chemistry notation, and tables.
  - Skills: [] - No available dedicated extraction skill applies.
  - Omitted: `playwright` - User requested no new UI automation.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 2, 3, 6, 8 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Source: `src/data/textbooks/README.md` - textbook directory contract.
  - Source: `src/data/textbooks/2024版人教版（五·四学制）八年级化学全一册/book.md:4062-4094` - representative multiline LaTeX equations.
  - Source: `src/data/textbooks/2024版人教版九年级化学下册/book.md:2572-2601` - representative carbonate/HCl and carbonate/base equations.
  - Pattern: `scripts/textbook/experiment-enrichment.mjs:123-148` - existing explicit-equation extraction preference and conservative fallback.
  - Pattern: `scripts/textbook/validate-runtime-boundary.mjs:81-112` - textbook-source boundary style.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node scripts/textbook/extract-reaction-equations.mjs --report .sisyphus/evidence/task-1-extraction-report.json` exits 0.
  - [ ] `.sisyphus/evidence/task-1-extraction-report.json` contains per-file candidate counts for all 8 textbook `book.md` files.
  - [ ] Running the extractor twice produces byte-identical candidate JSON when textbooks are unchanged.
  - [ ] Candidate output includes examples from the known line ranges above.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Extract known textbook equations
    Tool: Bash
    Steps: Run `node scripts/textbook/extract-reaction-equations.mjs --report .sisyphus/evidence/task-1-extraction-report.json`; inspect JSON for candidates referencing `八年级化学全一册/book.md` around lines 4062-4094 and `九年级化学下册/book.md` around lines 2572-2601.
    Expected: Command exits 0; report includes nonzero candidate counts and known equation candidates.
    Evidence: .sisyphus/evidence/task-1-extraction-report.json

  Scenario: Exclude prose-only text from extraction
    Tool: Bash
    Steps: Run extractor; check report candidate list for entries with no equation operator (`=`, `→`, `\\rightarrow`, `\\xlongequal`, `\\xrightarrow`, reversible arrows).
    Expected: No prose-only candidates are emitted.
    Evidence: .sisyphus/evidence/task-1-prose-filter.txt
  ```

  **Commit**: NO | Message: `feat(textbook): extract reaction equation candidates` | Files: `scripts/textbook/extract-reaction-equations.mjs`

- [x] 2. Implement conservative equation normalization and side splitting

  **What to do**: Add normalization utilities under `scripts/textbook/reaction-equation-normalizer.mjs` or equivalent. Convert supported textbook forms into `normalizedEquation`, `reactants[]`, `products[]`, `conditions`, and `phaseMarkers`. Support LaTeX `\mathrm{}`, spaced tokens like `N a _ { 2 } C O _ { 3 }`, subscripts, coefficients, parentheses, `\xlongequal{...}`, `\xrightarrow{...}`, `=`, arrows, `\uparrow`, `\downarrow`, Chinese/fullwidth punctuation, and multiline equations. Return structured `unsupportedReason` instead of guessing.
  **Must NOT do**: Do not balance equations. Do not alter original source text. Do not silently drop reversible/equilibrium/ionic/half-reaction forms; if automatic parsing cannot handle a complete explicit formula equation, return `unsupportedReason` so Task 8 can provide a reviewed override or a specific non-representable exclusion.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Requires precise string normalization with many edge cases and fail-closed behavior.
  - Skills: [] - No dedicated parser skill available.
  - Omitted: `frontend-design` - No UI/design changes.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 4, 6, 8 | Blocked By: Task 1 interface contract

  **References**:
  - Pattern: `scripts/textbook/experiment-enrichment.mjs:123-148` - conservative extraction behavior.
  - Validation: `scripts/validate-chem-notation.mjs:80-82` and `scripts/validate-chem-notation.mjs:171-196` - formula/equation rendering constraints.
  - Runtime need: `src/modules/games.js:762-820` - displays `reactants[]` and `products[]` via `formulaHTML`.
  - Runtime need: `src/modules/games.js:832-854` - matching key is reaction `id`, not equation text.

  **Acceptance Criteria**:
  - [ ] Normalizer converts `N a _ { 2 } C O _ { 3 } + 2 H C l = 2 N a C l + C O _ { 2 } \uparrow + H _ { 2 } O` into non-empty reactants/products arrays.
  - [ ] Normalizer preserves condition text such as `点燃` outside gameplay tokens.
  - [ ] Unsupported forms return `unsupportedReason` and do not produce runtime-ready records.
  - [ ] Normalizer has Node-level assertions or fixture tests callable by a script command.

  **QA Scenarios**:
  ```
  Scenario: Normalize common textbook LaTeX
    Tool: Bash
    Steps: Run the normalizer fixture command added by this task, e.g. `node scripts/textbook/reaction-equation-normalizer.mjs --self-test`.
    Expected: Command exits 0; fixture output shows non-empty reactants/products for combustion, displacement, carbonate-acid, and carbonate-base examples.
    Evidence: .sisyphus/evidence/task-2-normalizer-self-test.txt

  Scenario: Fail closed for ambiguous equations
    Tool: Bash
    Steps: Run self-test fixtures containing incomplete blanks, word-only equations, and unsupported reversible/ionic examples.
    Expected: Each unsupported fixture returns `unsupportedReason`; none is marked game-usable.
    Evidence: .sisyphus/evidence/task-2-normalizer-unsupported.txt
  ```

  **Commit**: NO | Message: `feat(textbook): normalize reaction equations safely` | Files: `scripts/textbook/reaction-equation-normalizer.mjs`

- [x] 3. Create reviewed include/exclude manifest schema

  **What to do**: Add `src/data/textbookIngestion/reactionEquationReview.json` with a deterministic schema covering every candidate ID from Task 1. Each entry must be one of `include`, `exclude_duplicate`, `exclude_ambiguous_equation`, `exclude_not_reaction`, `exclude_unsupported_notation`, `exclude_incomplete_exercise`, `exclude_word_only`, or `exclude_outside_markdown_text`. For included records, store optional reviewer overrides for `name`, `description`, `curriculumTags`, `difficulty`, and any manual `reactants/products` corrections. Default duplicate policy: one runtime game record per normalized equation, with all duplicate occurrences merged into `sourceRefs`.
  **Must NOT do**: Do not use this manifest as runtime app data. Do not allow unreasoned exclusions. Do not use array indexes as candidate identities.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Schema/artifact task with clear fields and constraints.
  - Skills: [] - No dedicated schema skill available.
  - Omitted: `officecli` - No Office documents.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 4, 6, 8 | Blocked By: Task 1 candidate ID format

  **References**:
  - Pattern: `src/data/textbookIngestion/runtimeTargetMap.js:1-13` - textbook namespace conventions.
  - Pattern: `src/data/textbookIngestion/runtimeTargetMap.js:40-44` - reaction target mapping.
  - Guardrail: `scripts/textbook/promote-topic.mjs:690-711` - avoids overwriting non-textbook records and sorts hand-authored vs textbook data.

  **Acceptance Criteria**:
  - [ ] Manifest JSON parses successfully.
  - [ ] Manifest schema supports include/exclude decisions and duplicate merging.
  - [ ] No manifest entry lacks a decision or reason code.
  - [ ] Manifest location is not imported by `src/data/index.js` or runtime modules.

  **QA Scenarios**:
  ```
  Scenario: Manifest schema validation
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-reaction-extraction.mjs --schema-only` after Task 6 exists, or a temporary JSON parse command before Task 6.
    Expected: Command exits 0 and reports all manifest entries have recognized decisions.
    Evidence: .sisyphus/evidence/task-3-manifest-schema.txt

  Scenario: Runtime boundary stays clean
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-runtime-boundary.mjs`.
    Expected: Command exits 0; runtime code does not import `reactionEquationReview.json`.
    Evidence: .sisyphus/evidence/task-3-runtime-boundary.txt
  ```

  **Commit**: NO | Message: `feat(textbook): add reaction review manifest` | Files: `src/data/textbookIngestion/reactionEquationReview.json`

- [x] 4. Generate reviewed textbook-only runtime reactions

  **What to do**: Add `scripts/textbook/build-reviewed-reactions.mjs` that reads extractor candidates + normalizer output + `reactionEquationReview.json` and writes finalized game-usable records to `src/data/reactions.json`. Runtime records must include `id`, `name`, `description`, `equationText`, `normalizedEquation`, `reactants`, `products`, `curriculumTags`, `difficulty`, `sourceKind: "textbook"`, `sourceReviewStatus: "reviewed"`, and `sourceReferences`. Use stable `textbook-reaction-<hash>` IDs. Deduplicate by normalized equation and merge all duplicate source references. Current hand-authored reactions without explicit textbook source must be removed from game data.
  **Must NOT do**: Do not include candidates with `unsupportedReason`. Do not include excluded manifest entries. Do not leave empty `reactants[]` or `products[]`. Do not modify `src/data/reactions.js` unless existing validators require removal/sync; runtime source is JSON.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Mutates canonical runtime data and must preserve data contracts.
  - Skills: [] - Data-generation task; no special skill available.
  - Omitted: `playwright` - No UI automation requested.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 5, 6, 10 | Blocked By: Tasks 1, 2, 3

  **References**:
  - Runtime source: `src/data/index.js:11,36` - exports `reactions` from JSON.
  - Existing schema: `src/data/reactions.json:1-226` - current hand-authored schema examples.
  - Existing promoted examples: `src/data/reactions.json:227+` - textbook IDs and source references but empty sides.
  - Runtime filter: `src/modules/games.js:714-722` - game-usable constraints.
  - Validator contract: `scripts/validate-supporting-data.mjs:1144-1171` - game-usable contract.

  **Acceptance Criteria**:
  - [ ] `src/data/reactions.json` contains only reviewed textbook-sourced game records or non-game records explicitly excluded from game eligibility by validator-compatible fields.
  - [ ] Every runtime game record has non-empty `reactants[]`, `products[]`, `curriculumTags`, and `sourceReferences`.
  - [ ] No old hand-authored game-only record remains without textbook source metadata.
  - [ ] Duplicate normalized equations are represented once with multiple `sourceReferences`.

  **QA Scenarios**:
  ```
  Scenario: Build runtime reactions from reviewed manifest
    Tool: Bash
    Steps: Run `node scripts/textbook/build-reviewed-reactions.mjs`; then run `node scripts/validate-reaction-game-pool.mjs` after Task 6 exists.
    Expected: Runtime data is generated; validator reports zero non-textbook, unreviewed, or empty-side game reactions.
    Evidence: .sisyphus/evidence/task-4-build-reviewed-reactions.txt

  Scenario: No hand-authored leakage
    Tool: Bash
    Steps: Run `node scripts/validate-reaction-game-pool.mjs --assert-textbook-only` after Task 6 exists.
    Expected: Command exits 0 and prints `nonTextbookGameReactions: 0`.
    Evidence: .sisyphus/evidence/task-4-no-hand-authored-leakage.txt
  ```

  **Commit**: NO | Message: `feat(data): replace reaction game pool with textbook reactions` | Files: `scripts/textbook/build-reviewed-reactions.mjs`, `src/data/reactions.json`

- [x] 5. Preserve reaction-game compatibility without UI test additions

  **What to do**: Inspect `src/modules/games.js` reaction-game code and make only compatibility changes required for the new textbook records. The preferred outcome is no gameplay change: keep pairing `reactants[]` to `products[]`, keep `REACTION_ROUND_SIZE = 5`, keep scoring behavior. If display labels need adjustment, use existing `equationText`, `normalizedEquation`, and `sourceReferences` without adding fallback non-textbook records. Keep imports through `src/data/index.js`.
  **Must NOT do**: Do not add Playwright specs. Do not redesign game mechanics. Do not make `equationText`-only records game-usable. Do not import textbook extraction artifacts into runtime modules.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Expected to be small compatibility inspection/change, with strong guardrails.
  - Skills: [] - No frontend redesign requested.
  - Omitted: `frontend-design` - No visual redesign; keep current UI.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 10 | Blocked By: Task 4

  **References**:
  - UI entry: `index.html:149-153` and `index.html:173` - reaction game card and `#game-area`.
  - Init path: `src/main.js:23,83` - imports and initializes games.
  - Game startup/filter: `src/modules/games.js:656-722`.
  - Pairing render: `src/modules/games.js:762-820`.
  - Selection/scoring: `src/modules/games.js:832-854`.
  - Completion summary: `src/modules/games.js:856-926`.
  - Styles: `src/styles/games.css:974-1027` - existing reaction board/chip styles.

  **Acceptance Criteria**:
  - [ ] Runtime reaction game still filters only game-usable reviewed records.
  - [ ] Game does not show unavailable state when at least 5 reviewed textbook reactions exist.
  - [ ] No runtime import references `src/data/textbookIngestion/reactionEquationReview.json` or extractor reports.
  - [ ] No new Playwright spec is added.

  **QA Scenarios**:
  ```
  Scenario: Static runtime import boundary
    Tool: Bash
    Steps: Run `node scripts/audit-business-data-imports.mjs` if present, then `node scripts/textbook/validate-runtime-boundary.mjs`.
    Expected: Commands exit 0; game imports finalized data only through allowed data index boundaries.
    Evidence: .sisyphus/evidence/task-5-import-boundary.txt

  Scenario: Game pool has enough reviewed records
    Tool: Bash
    Steps: Run `node scripts/validate-reaction-game-pool.mjs --min-game-usable 5`.
    Expected: Command exits 0 and reports at least 5 textbook-derived game-usable reactions.
    Evidence: .sisyphus/evidence/task-5-min-game-usable.txt
  ```

  **Commit**: NO | Message: `fix(games): use reviewed textbook reactions only` | Files: `src/modules/games.js` if needed

- [x] 6. Add fail-closed validators for extraction coverage and game-pool purity

  **What to do**: Implement `scripts/textbook/validate-reaction-extraction.mjs` and `scripts/validate-reaction-game-pool.mjs`. Extraction validator must rerun or consume current extractor output and assert every candidate is included or excluded. Game-pool validator must assert every reaction used by the game has `sourceKind: "textbook"`, reviewed status, at least one valid source reference under `src/data/textbooks/**/book.md`, non-empty `reactants[]`, non-empty `products[]`, non-empty `curriculumTags`, and valid notation fields. Include duplicate handling validation: one runtime record per normalized equation unless the manifest explicitly allows otherwise.
  **Must NOT do**: Do not validate only generated runtime output; also validate candidate coverage. Do not allow broad “manual review pending” states to pass.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: Validators are the quality gate for content completeness and need fail-closed logic.
  - Skills: [] - No extra skill needed.
  - Omitted: `playwright` - Command-based validation only.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 7, 10 | Blocked By: Tasks 1, 2, 3, 4 interfaces

  **References**:
  - Existing validator: `scripts/validate-supporting-data.mjs:202-262` - reaction validation entry area.
  - Existing game contract: `scripts/validate-supporting-data.mjs:1144-1171` - game-usable requirements.
  - Notation guardrail: `scripts/validate-supporting-data.mjs:848-873` - `equationText` and review status conventions.
  - Runtime integrity: `scripts/textbook/validate-runtime-integrity.mjs:224-237` - source/formula/safety/tag style checks.
  - Runtime boundary: `scripts/textbook/validate-runtime-boundary.mjs:193-214` - blocks draft/deferred leaks.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/validate-reaction-extraction.mjs` exits 0 only when all current candidates are included or excluded.
  - [ ] Validator output includes `missingExplicitEquations: 0`, `unreviewedCandidates: 0`, `unaccountedCandidates: 0`.
  - [ ] `node scripts/validate-reaction-game-pool.mjs` exits 0 only when all game records are textbook-sourced, reviewed, and game-usable.
  - [ ] Validator output includes `nonTextbookGameReactions: 0`, `unreviewedGameReactions: 0`, `emptyReactantsOrProducts: 0`.

  **QA Scenarios**:
  ```
  Scenario: Candidate coverage validation
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-reaction-extraction.mjs`.
    Expected: Command exits 0 and prints zero missing/unreviewed/unaccounted candidates.
    Evidence: .sisyphus/evidence/task-6-extraction-validator.txt

  Scenario: Game-pool purity validation
    Tool: Bash
    Steps: Run `node scripts/validate-reaction-game-pool.mjs`.
    Expected: Command exits 0 and prints zero non-textbook, unreviewed, or empty-side game reactions.
    Evidence: .sisyphus/evidence/task-6-game-pool-validator.txt
  ```

  **Commit**: NO | Message: `test(data): validate textbook reaction coverage` | Files: `scripts/textbook/validate-reaction-extraction.mjs`, `scripts/validate-reaction-game-pool.mjs`

- [x] 7. Wire package scripts for canonical validation commands

  **What to do**: Update `package.json` scripts to expose the new commands. Add names such as `validate:textbook-reactions`, `validate:reaction-game-pool`, and include them in the safest aggregate validation script if compatible with existing script naming. Preserve existing `dev`, `build`, `preview`, and validation scripts.
  **Must NOT do**: Do not remove existing scripts. Do not add Playwright test scripts as part of this task. Do not rename existing validator commands unless unavoidable.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: Small manifest/script wiring task.
  - Skills: [] - No special skill needed.
  - Omitted: `git-master` - No commit requested during implementation task.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 10 | Blocked By: Task 6 command names

  **References**:
  - Scripts: `package.json:6-30` - existing script naming and validation aggregate.
  - Build workflow: `vite.config.js:3-11` - dev/build environment.

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-reactions` runs extraction coverage validation.
  - [ ] `npm run validate:reaction-game-pool` runs game-pool purity validation.
  - [ ] Existing `npm run build` still works.
  - [ ] Existing validation scripts remain present.

  **QA Scenarios**:
  ```
  Scenario: New package validation scripts run
    Tool: Bash
    Steps: Run `npm run validate:textbook-reactions` and `npm run validate:reaction-game-pool`.
    Expected: Both commands exit 0 and print zero-failure summaries.
    Evidence: .sisyphus/evidence/task-7-package-validation-scripts.txt

  Scenario: Existing scripts preserved
    Tool: Bash
    Steps: Run a Node one-liner to read `package.json` and assert `dev`, `build`, `preview`, `validate:supporting`, and `validate:chem-notation` still exist.
    Expected: Command exits 0.
    Evidence: .sisyphus/evidence/task-7-existing-scripts-preserved.txt
  ```

  **Commit**: NO | Message: `chore(scripts): add textbook reaction validators` | Files: `package.json`

- [x] 8. Complete review manifest decisions for all detected textbook equations

  **What to do**: Run the extractor, review every candidate, and complete `reactionEquationReview.json` so every candidate is included or excluded. For included candidates, ensure normalizer output is valid or provide explicit reviewed overrides. For excluded candidates, use only approved reason codes. Use these defaults: duplicate normalized equation → exclude duplicate from runtime but merge source reference; incomplete/fill-in-blank → exclude_incomplete_exercise; word-only → exclude_word_only; image-only not present in Markdown → exclude_outside_markdown_text; complete explicit formula equations that automatic parsing cannot handle → add reviewed `reactants[]`/`products[]` overrides; exclude_unsupported_notation is allowed only when the equation cannot be represented by the current left-side/right-side pairing model.
  **Must NOT do**: Do not use a blanket exclusion for hard cases. Do not mark a candidate reviewed unless it has either a valid runtime record or a specific exclusion reason. Do not include ambiguous records just to satisfy count targets.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Content review across many candidates requires accuracy and consistency.
  - Skills: [] - No specialized skill available.
  - Omitted: `playwright` - Not a UI test task.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Task 10 | Blocked By: Tasks 1, 2, 3, 4, 6

  **References**:
  - Source directory: `src/data/textbooks/**/book.md` - all candidate sources.
  - Candidate extractor: `scripts/textbook/extract-reaction-equations.mjs` - candidate list.
  - Manifest: `src/data/textbookIngestion/reactionEquationReview.json` - review decisions.
  - Validator: `scripts/textbook/validate-reaction-extraction.mjs` - coverage gate.

  **Acceptance Criteria**:
  - [ ] Extraction coverage validator reports zero unaccounted candidates.
  - [ ] Exclusion reasons are all approved codes.
  - [ ] Included candidate count equals runtime reviewed reaction count after deduplication rules are applied.
  - [ ] Generated report includes per-textbook detected/included/excluded/duplicate counts.

  **QA Scenarios**:
  ```
  Scenario: All candidates reviewed
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-reaction-extraction.mjs --report .sisyphus/evidence/task-8-review-coverage.json`.
    Expected: Command exits 0; report shows `unaccountedCandidates: 0`.
    Evidence: .sisyphus/evidence/task-8-review-coverage.json

  Scenario: Exclusion reason audit
    Tool: Bash
    Steps: Run validator with strict exclusion reason checking.
    Expected: Command exits 0; every excluded candidate has one approved reason and source reference.
    Evidence: .sisyphus/evidence/task-8-exclusion-reasons.txt
  ```

  **Commit**: NO | Message: `data(textbook): review all reaction equation candidates` | Files: `src/data/textbookIngestion/reactionEquationReview.json`, `src/data/reactions.json`

- [x] 9. Produce implementation evidence summary for maintainers

  **What to do**: Generate a concise evidence summary in `.sisyphus/evidence/textbook-reaction-pairing-summary.md` after extraction/review/data generation. Include textbook file list, detected count, included runtime count, duplicate count, excluded count by reason, commands run, and output file paths. This is an execution artifact, not product documentation.
  **Must NOT do**: Do not add docs outside `.sisyphus/evidence/`. Do not include unsupported claims without command output.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: Evidence/reporting task.
  - Skills: [] - No special writing skill required.
  - Omitted: `officecli` - Not an Office document.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 10 evidence completeness | Blocked By: Tasks 1-8

  **References**:
  - Evidence convention: `.sisyphus/evidence/` - use for task outputs.
  - Plan DoD commands in this file - summary must list pass/fail output paths.

  **Acceptance Criteria**:
  - [ ] `.sisyphus/evidence/textbook-reaction-pairing-summary.md` exists.
  - [ ] Summary includes detected/included/excluded/duplicate counts by textbook file.
  - [ ] Summary references exact validation command evidence files.
  - [ ] Summary does not claim UI automation was added or run.

  **QA Scenarios**:
  ```
  Scenario: Evidence summary completeness
    Tool: Bash
    Steps: Check `.sisyphus/evidence/textbook-reaction-pairing-summary.md` for sections: Textbooks, Counts, Exclusions, Commands, Evidence Files.
    Expected: All required sections present and populated.
    Evidence: .sisyphus/evidence/task-9-summary-check.txt

  Scenario: Evidence paths exist
    Tool: Bash
    Steps: Run a Node script or shell command to verify every evidence file path listed in the summary exists.
    Expected: Command exits 0.
    Evidence: .sisyphus/evidence/task-9-evidence-paths.txt
  ```

  **Commit**: NO | Message: `docs(evidence): summarize textbook reaction coverage` | Files: `.sisyphus/evidence/textbook-reaction-pairing-summary.md`

- [x] 10. Run full validation and build, then remediate failures

  **What to do**: Execute the final command suite, capture outputs to `.sisyphus/evidence/`, and fix any failures within the scope of this plan. Required commands: `node scripts/textbook/extract-reaction-equations.mjs --check --report .sisyphus/evidence/final-extraction-report.json`, `node scripts/textbook/validate-reaction-extraction.mjs`, `node scripts/validate-reaction-game-pool.mjs`, `node scripts/validate-supporting-data.mjs`, `node scripts/validate-chem-notation.mjs`, `node scripts/textbook/validate-runtime-boundary.mjs`, `node scripts/textbook/validate-runtime-integrity.mjs`, and `npm run build`.
  **Must NOT do**: Do not skip a failing validator. Do not add Playwright tests or require browser clicks. Do not mark complete if any required command fails.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: Integration validation and remediation across scripts/data/build.
  - Skills: [`verification-before-completion`] - If available to executor, use for evidence-before-claims discipline.
  - Omitted: `playwright` - No new automated UI tests; not needed for final command suite.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification Wave | Blocked By: Tasks 1-9

  **References**:
  - Package scripts: `package.json:6-30` - build and validator script context.
  - Current build config: `vite.config.js:3-11`.
  - Existing validation docs: `.sisyphus/plans/element-explorer-kids.md:52-63` - prior validation command style.

  **Acceptance Criteria**:
  - [ ] Every required command exits 0.
  - [ ] Final extraction report has zero unaccounted candidates.
  - [ ] Game-pool validator has zero non-textbook/unreviewed/empty-side records.
  - [ ] Build succeeds without new Playwright test dependency.
  - [ ] Evidence files exist for each command.

  **QA Scenarios**:
  ```
  Scenario: Full validator suite passes
    Tool: Bash
    Steps: Run all required Node validation commands and save stdout/stderr to `.sisyphus/evidence/task-10-validators.txt`.
    Expected: All commands exit 0; output includes zero-failure summaries.
    Evidence: .sisyphus/evidence/task-10-validators.txt

  Scenario: Production build passes
    Tool: Bash
    Steps: Run `npm run build` and save output to `.sisyphus/evidence/task-10-build.txt`.
    Expected: Command exits 0; Vite build completes successfully.
    Evidence: .sisyphus/evidence/task-10-build.txt
  ```

  **Commit**: NO | Message: `chore: validate textbook reaction pairing coverage` | Files: evidence only if committed by executor policy

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
  - Verify every user requirement is satisfied: all explicit Markdown textbook equations accounted for, game pool textbook-only, no inferred prose equations, no new Playwright tests.
- [x] F2. Code Quality Review — unspecified-high
  - Review extraction, normalization, generation, and validator scripts for maintainability, deterministic behavior, fail-closed logic, and clear errors.
- [x] F3. Real Manual QA — unspecified-high
  - Command-based QA only: inspect generated evidence files and run required validators/build; do not create Playwright tests and do not require browser click-through.
- [x] F4. Scope Fidelity Check — deep
  - Ensure no UI redesign, OCR expansion, prose inference, broad chemistry parser, or unrelated textbook pipeline changes slipped in.

## Commit Strategy
- Do not commit automatically unless the user explicitly requests it.
- If committing later, prefer one atomic commit after validators/build pass: `feat(reactions): use textbook equations in pairing game`.
- Include source/data/script changes together because validators depend on generated data and manifest consistency.
- Do not commit `.sisyphus/evidence/` unless repository convention or user request says evidence artifacts should be tracked.

## Success Criteria
- All explicit reaction-equation candidates from `src/data/textbooks/**/book.md` are included or explicitly excluded with approved reasons.
- Reaction-pairing runtime data contains only reviewed textbook-derived game reactions.
- Every game reaction has non-empty `reactants[]`, `products[]`, curriculum tags, reviewed source status, and source references.
- Current hand-authored reactions without textbook source no longer appear as game questions.
- New extraction/game-pool validators and existing data/notation/runtime validators pass.
- `npm run build` passes.
- No new Playwright automated tests are added.
