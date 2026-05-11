# Laboratory Textbook Experiment Content Enrichment

## TL;DR
> **Summary**: Fix the laboratory experiment pipeline so textbook-derived experiments preserve full textbook content, use deterministic 100-Chinese-character card excerpts, generate meaningful local-rule titles, and populate only high-confidence chemical metadata.
> **Deliverables**:
> - Enriched experiment record contract for textbook candidates and promoted runtime reactions
> - Deterministic local utilities for full content preservation, excerpting, title generation, and chemistry metadata extraction
> - Updated draft generation and promotion scripts
> - Validation fixtures plus Playwright/browser QA for lab cards/details
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 6 → Final Verification

## Context

### Original Request
- 实验室实现三个功能：
  1. 从教材中获取实验的全部内容，不要截取。
  2. 从实验内容自动总结一个实验标题，而不是现在的不明确名称，如“实验2-1”。
  3. 根据教材实验内容，尽可能生成反应方程式、反应物、生成物的化学公式。

### Interview Summary
- Card excerpts must be consistent, capped at **100 Chinese characters**.
- Generation must be **local deterministic rules**, not external AI/LLM.
- Chemical metadata must be **high-confidence only**; ambiguous cases should not produce speculative equations/reactants/products.
- Test strategy: **tests-after**, with agent-executed QA.

### Metis Review (gaps addressed)
- Data contract is explicit: runtime `name` becomes generated title; original heading is preserved as `sourceHeading`; full content is stored separately as `textbookContent`; `description` remains card excerpt for compatibility.
- Excerpt counting default: count visible Chinese/CJK characters after whitespace normalization; prefer sentence boundary when possible, otherwise hard cap at 100 CJK characters without ellipsis beyond the cap.
- Low-confidence metadata behavior: leave `reactants` and `products` as empty arrays and omit `equationText`; add no low-confidence display fields.
- Scope guard: fix ingestion/enrichment/promotion first; touch `src/modules/lab.js` only if needed to surface `textbookContent` in detail view.

## Work Objectives

### Core Objective
Make textbook-derived lab experiments data-complete and learner-friendly by preserving full experiment text, generating clear titles and concise excerpts locally, and enriching reaction metadata only when the source text clearly supports it.

### Deliverables
- Shared enrichment module under `scripts/textbook/` for excerpt/title/chemistry rules.
- Updated `scripts/textbook/generate-drafts.mjs` candidate output.
- Updated `scripts/textbook/promote-topic.mjs` runtime reaction mapping.
- Updated runtime lab detail display if it currently only shows clipped `description` and not full `textbookContent`.
- Fixture validator `scripts/textbook/validate-enrichment-fixtures.mjs` and npm script entry.
- Playwright coverage for laboratory card excerpt/detail behavior if UI changes are made.

### Definition of Done (verifiable conditions with commands)
- `node scripts/textbook/validate-enrichment-fixtures.mjs` exits 0 and prints `PASS textbook enrichment fixtures`.
- `npm run validate:chem-notation` exits 0.
- `npm run validate:data` exits 0.
- `npm run build` exits 0 and `dist/index.html` exists.
- If Playwright spec is added/changed: `npx playwright test tests/ui/lab-textbook-experiments.spec.ts` exits 0 and writes evidence under `.sisyphus/evidence/`.

### Must Have
- Full textbook experiment content preserved in promoted records as `textbookContent`.
- Runtime `description` is a deterministic card excerpt capped at 100 Chinese/CJK characters.
- Runtime `name` is a meaningful generated title when source heading is vague (`实验`, `实验2-1`, `【实验1-1】`, etc.).
- Original heading retained as `sourceHeading`.
- High-confidence `equationText`, `reactants`, and `products` generated only from explicit equations or allowlisted unambiguous experiment patterns.
- Ambiguous experiment text produces no speculative equation and keeps `reactants: []`, `products: []`.

### Must NOT Have
- No external AI/LLM calls.
- No broad chemistry-knowledge guessing when textbook text does not clearly support metadata.
- No primary fix that merely patches card text in `src/modules/lab.js` while leaving pipeline output clipped/vague.
- No UI redesign, games redesign, achievements changes, or progress behavior expansion.
- No new unit-test framework unless a later explicit plan changes test architecture.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after using Node fixture validators + existing validation scripts + Playwright where UI behavior is affected.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy

### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 contract/utilities first, then Task 5 fixture validator scaffold using that contract.
Wave 2: Task 2 draft generation, Task 3 title generation, and Task 4 chemistry enrichment rules depend on Task 1.
Wave 3: Task 6 runtime lab detail verification/UI adjustment and Task 7 validation/package scripts depend on enriched data contract.

### Dependency Matrix (full, all tasks)
- Task 1: blocks Tasks 2, 3, 4, 5, 6, 7.
- Task 2: blocked by Task 1; feeds Task 6 promotion/runtime QA.
- Task 3: blocked by Task 1; feeds Task 6 promotion/runtime QA.
- Task 4: blocked by Task 1; feeds Task 6 promotion/runtime QA.
- Task 5: blocked by Task 1; can be authored before Tasks 2-4 pass.
- Task 6: blocked by Tasks 2-4.
- Task 7: blocked by Tasks 5 and 6.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → `unspecified-high`, `quick`
- Wave 2 → 3 tasks → `unspecified-high`, `quick`
- Wave 3 → 2 tasks → `visual-engineering`, `quick`
- Final → 4 review tasks → oracle / unspecified-high / unspecified-high / deep

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Define enriched textbook experiment contract and shared utilities

  **What to do**: Create a shared utility module under `scripts/textbook/` (for example `experiment-enrichment.mjs`) that exports deterministic functions for: `normalizeExperimentText`, `createExperimentExcerpt`, `isVagueExperimentHeading`, `generateExperimentTitle`, and a placeholder `extractHighConfidenceChemistry`. Define the output contract used by later tasks: `name` = generated title, `description` = <=100 CJK-char card excerpt, `textbookContent` = full normalized experiment content, `sourceHeading` = original heading, `equationText` only when high confidence, `reactants`/`products` arrays with formula strings only when high confidence.
  **Must NOT do**: Do not mutate source/runtime data in this task; do not add AI calls; do not change app UI.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: establishes cross-script data contract and utility behavior.
  - Skills: [] - No unavailable special skill required.
  - Omitted: [`frontend-design`] - No UI design work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 2, 3, 4, 5, 6, 7 | Blocked By: none

  **References**:
  - Pattern: `scripts/textbook/generate-drafts.mjs:369` - existing `summarizeSection()` behavior to replace/bypass for experiments.
  - Pattern: `scripts/textbook/generate-drafts.mjs:387` - existing `firstNonEmptyExcerpt(text, maxLength)` truncation behavior.
  - Pattern: `scripts/textbook/promote-topic.mjs:460` - `adaptReactionRecord()` runtime mapping to consume contract.
  - API/Type: `src/data/reactions.json:227` - runtime reaction record shape and problematic textbook records.

  **Acceptance Criteria**:
  - [ ] Utility module exports named functions listed above.
  - [ ] `createExperimentExcerpt` returns text with <=100 Chinese/CJK characters for long Chinese content.
  - [ ] `createExperimentExcerpt` never truncates `textbookContent`; it only creates `description`.
  - [ ] `isVagueExperimentHeading` returns true for `实验`, `实验2-1`, `【实验1-1】` and false for meaningful titles like `氢气燃烧`.

  **QA Scenarios**:
  ```
  Scenario: Excerpt utility preserves full content separately
    Tool: Bash
    Steps: Run `node -e "import('./scripts/textbook/experiment-enrichment.mjs').then(m=>{const t='观察锌粒与稀盐酸反应产生气泡，并用燃着的木条检验生成的气体。'.repeat(8); const e=m.createExperimentExcerpt(t,{maxCjkChars:100}); if((e.match(/[\u3400-\u9fff]/g)||[]).length>100) process.exit(1); if(t.length<=e.length) process.exit(2); console.log('PASS excerpt utility')})"`
    Expected: Exit code 0 and stdout contains `PASS excerpt utility`.
    Evidence: .sisyphus/evidence/task-1-contract-excerpt.txt

  Scenario: Vague heading detection is deterministic
    Tool: Bash
    Steps: Run `node -e "import('./scripts/textbook/experiment-enrichment.mjs').then(m=>{if(!m.isVagueExperimentHeading('实验2-1')) process.exit(1); if(!m.isVagueExperimentHeading('【实验1-1】')) process.exit(2); if(m.isVagueExperimentHeading('氢气燃烧')) process.exit(3); console.log('PASS heading utility')})"`
    Expected: Exit code 0 and stdout contains `PASS heading utility`.
    Evidence: .sisyphus/evidence/task-1-contract-heading.txt
  ```

  **Commit**: NO | Message: n/a | Files: [`scripts/textbook/experiment-enrichment.mjs`]

- [x] 2. Preserve full experiment content and generate 100-character excerpts in draft generation

  **What to do**: Update `scripts/textbook/generate-drafts.mjs` so experiment candidates carry full normalized textbook content in `textbookContent` and use `description`/`summary` only as the deterministic <=100 CJK-char excerpt. Replace the current 120-char ellipsis truncation path for experiment candidates with the shared utility. Keep non-experiment candidate behavior unchanged unless the shared helper is explicitly safe there.
  **Must NOT do**: Do not reduce full experiment content to excerpt; do not change unrelated textbook candidate surfaces.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: careful data pipeline change with regression risk.
  - Skills: [] - No unavailable special skill required.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 6 runtime QA | Blocked By: Task 1

  **References**:
  - Pattern: `scripts/textbook/generate-drafts.mjs:210` - experiment candidate title currently from source heading.
  - Pattern: `scripts/textbook/generate-drafts.mjs:369` - `summarizeSection()`.
  - Pattern: `scripts/textbook/generate-drafts.mjs:392` - hard truncation to 120 chars and ellipsis.
  - Pattern: `scripts/textbook/extract-textbook.mjs:166` - section splitting source for full text.

  **Acceptance Criteria**:
  - [ ] Experiment candidate output includes `textbookContent` containing normalized full section experiment content with no ellipsis truncation.
  - [ ] Experiment candidate `summary` or `description` used for cards is <=100 CJK characters.
  - [ ] Regression fixture with >120 Chinese characters proves full content length remains > excerpt length.

  **QA Scenarios**:
  ```
  Scenario: Long textbook experiment preserves full content
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-enrichment-fixtures.mjs --case full-content-preservation`
    Expected: Exit code 0 and stdout contains `PASS full-content-preservation`.
    Evidence: .sisyphus/evidence/task-2-full-content.txt

  Scenario: Excerpt cap regression
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-enrichment-fixtures.mjs --case excerpt-cap-100`
    Expected: Exit code 0 and stdout contains `PASS excerpt-cap-100`; fixture asserts no card excerpt exceeds 100 CJK chars.
    Evidence: .sisyphus/evidence/task-2-excerpt-cap.txt
  ```

  **Commit**: NO | Message: n/a | Files: [`scripts/textbook/generate-drafts.mjs`, `scripts/textbook/experiment-enrichment.mjs`]

- [x] 3. Generate meaningful experiment titles from content and preserve original headings

  **What to do**: Implement deterministic local title generation for vague headings. Rule order: (1) if heading is meaningful, use cleaned heading; (2) if content contains an explicit “观察/探究/检验/制取/比较 + substance/action” pattern, generate concise Chinese title like `检验氢气的可燃性`; (3) if content includes a high-confidence reaction pattern, use reaction/action title like `锌与稀盐酸反应制取氢气`; (4) fallback to cleaned heading only if no meaningful local title can be derived. Preserve original heading in `sourceHeading` for all experiment candidates/promoted reactions.
  **Must NOT do**: Do not produce vague runtime `name` for records where content supports a meaningful title; do not use random/LLM phrasing.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: bounded rule implementation once contract exists.
  - Skills: [] - No unavailable special skill required.
  - Omitted: [`frontend-design`] - No UI design work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 6 UI QA | Blocked By: Task 1

  **References**:
  - Pattern: `scripts/textbook/generate-drafts.mjs:210` - current title from `cleanHeading(section.sourceHeading)`.
  - Pattern: `src/data/reactions.json:229` - examples of vague names (`【实验1-1】`, `【实验】`).
  - API/Type: `scripts/textbook/promote-topic.mjs:472` - runtime `name = candidate.title`.

  **Acceptance Criteria**:
  - [ ] Fixture heading `实验2-1` with content about zinc and dilute hydrochloric acid yields meaningful title, not `实验2-1`.
  - [ ] Original heading is preserved in `sourceHeading`.
  - [ ] Meaningful existing titles are not overwritten unnecessarily.

  **QA Scenarios**:
  ```
  Scenario: Vague heading replaced by content-derived title
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-enrichment-fixtures.mjs --case generated-title-vague-heading`
    Expected: Exit code 0; stdout contains `PASS generated-title-vague-heading`; fixture asserts `name !== '实验2-1'` and `sourceHeading === '实验2-1'`.
    Evidence: .sisyphus/evidence/task-3-title-vague.txt

  Scenario: Meaningful heading remains stable
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-enrichment-fixtures.mjs --case generated-title-meaningful-heading`
    Expected: Exit code 0 and stdout contains `PASS generated-title-meaningful-heading`.
    Evidence: .sisyphus/evidence/task-3-title-stable.txt
  ```

  **Commit**: NO | Message: n/a | Files: [`scripts/textbook/experiment-enrichment.mjs`, `scripts/textbook/generate-drafts.mjs`]

- [x] 4. Extract high-confidence chemistry metadata with local allowlisted rules

  **What to do**: Implement `extractHighConfidenceChemistry(text)` using deterministic rules only. Support: explicit balanced equation text already present in source; unambiguous phrase patterns for common textbook experiments only when reactants/products are explicit (e.g., `锌` + `稀盐酸` + `氢气` → `Zn + 2HCl -> ZnCl2 + H2`; `氢气` + `氧气` + `水` → `2H2 + O2 -> 2H2O`). Return `{ equationText, reactants, products, confidence: 'high', evidenceText }` only for high-confidence matches; otherwise return empty arrays and no `equationText`.
  **Must NOT do**: Do not infer from broad chemistry knowledge unless all substances/products are explicit in text or allowlisted fixture pattern; do not display/emit low-confidence metadata.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: chemistry correctness and safety require conservative logic.
  - Skills: [] - No unavailable special skill required.
  - Omitted: [`threejs-animation`] - No animation work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 3, 5, 7 | Blocked By: Task 1

  **References**:
  - Pattern: `scripts/textbook/promote-topic.mjs:474` - current `reactants: []`.
  - Pattern: `scripts/textbook/promote-topic.mjs:475` - current `products: []`.
  - Pattern: `src/modules/lab.js:608` - `getReactionEquationText()` fallback chain uses `equationText` or reactants/products.
  - Consumer: `src/modules/games.js:654` - products labels derive from `reaction.products`.
  - Consumer: `src/modules/progress.js:70` - progress derives element coverage from `reactants/products`.

  **Acceptance Criteria**:
  - [ ] Clear fixture with explicit reactants/products produces exact expected `equationText`, `reactants`, and `products`.
  - [ ] Ambiguous fixture produces no `equationText`, `reactants: []`, and `products: []`.
  - [ ] Formula strings are plain chemical formulas compatible with existing notation consumers.

  **QA Scenarios**:
  ```
  Scenario: High-confidence reaction extraction
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-enrichment-fixtures.mjs --case chemistry-high-confidence`
    Expected: Exit code 0; stdout contains `PASS chemistry-high-confidence`; fixture asserts exact formula arrays and equation text.
    Evidence: .sisyphus/evidence/task-4-chem-high.txt

  Scenario: Ambiguous chemistry is omitted
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-enrichment-fixtures.mjs --case chemistry-ambiguous-omitted`
    Expected: Exit code 0; stdout contains `PASS chemistry-ambiguous-omitted`; fixture asserts no equation and empty arrays.
    Evidence: .sisyphus/evidence/task-4-chem-ambiguous.txt
  ```

  **Commit**: NO | Message: n/a | Files: [`scripts/textbook/experiment-enrichment.mjs`]

- [x] 5. Add fixture validator for enrichment behavior

  **What to do**: Add `scripts/textbook/validate-enrichment-fixtures.mjs` with deterministic inline fixtures covering: full-content preservation, excerpt cap, vague-title generation, meaningful-heading stability, high-confidence chemistry, ambiguous chemistry omission, and promotion-shape compatibility. Support optional `--case <name>` to run a single case. Print exact pass messages used by task QA and `PASS textbook enrichment fixtures` when all cases pass.
  **Must NOT do**: Do not require network, browser, or human inspection; do not depend on current huge textbook manifests for unit-like fixture validation.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: isolated validation script.
  - Skills: [] - No unavailable special skill required.
  - Omitted: [`playwright`] - This is Node validation, not browser testing.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 7 | Blocked By: Task 1

  **References**:
  - Pattern: `scripts/validate-chem-notation.mjs` - existing style for Node validation scripts.
  - Pattern: `package.json:10` - validation scripts convention.
  - Research: existing validators under `scripts/` and `scripts/textbook/`.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/validate-enrichment-fixtures.mjs` exits 0 and prints `PASS textbook enrichment fixtures`.
  - [ ] Each `--case` named in Tasks 2-4 exits 0 and prints its exact `PASS ...` message.
  - [ ] Failure output identifies expected vs actual values.

  **QA Scenarios**:
  ```
  Scenario: All enrichment fixtures pass
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-enrichment-fixtures.mjs`
    Expected: Exit code 0 and stdout contains `PASS textbook enrichment fixtures`.
    Evidence: .sisyphus/evidence/task-5-fixtures-all.txt

  Scenario: Unknown case fails clearly
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-enrichment-fixtures.mjs --case does-not-exist`
    Expected: Non-zero exit code and stderr/stdout mentions `Unknown fixture case: does-not-exist`.
    Evidence: .sisyphus/evidence/task-5-fixtures-error.txt
  ```

  **Commit**: NO | Message: n/a | Files: [`scripts/textbook/validate-enrichment-fixtures.mjs`]

- [x] 6. Promote enriched fields and verify lab detail display uses full content

  **What to do**: Update `scripts/textbook/promote-topic.mjs` `adaptReactionRecord()` so promoted reaction records use enriched fields: `name` generated title, `description` 100-CJK excerpt, `textbookContent` full content, `sourceHeading` original heading, `equationText`/`reactants`/`products` from high-confidence extraction only. Then inspect `src/modules/lab.js`: if detail modal currently displays only `description` and therefore cannot show full textbook content, add the minimal display fallback so detail view shows `textbookContent || description` while cards keep `description`.
  **Must NOT do**: Do not make cards show full content; do not change unrelated lab interactions or visual design.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: may include minimal UI display verification while preserving existing layout.
  - Skills: [`frontend-design`] - Use only if UI change is needed for detail content presentation.
  - Omitted: [`threejs-animation`] - No Three.js animation work.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Task 7 | Blocked By: Tasks 2, 3, 4

  **References**:
  - Pattern: `scripts/textbook/promote-topic.mjs:460` - `adaptReactionRecord()`.
  - Pattern: `scripts/textbook/promote-topic.mjs:472` - runtime `name = candidate.title`.
  - Pattern: `scripts/textbook/promote-topic.mjs:473` - runtime `description = candidate.summary`.
  - Pattern: `src/modules/lab.js:342` - card title/description rendering area.
  - Pattern: `src/modules/lab.js:526` - `renderReactionDetail()`.
  - Pattern: `src/modules/lab.js:818` - `openDetailModal()`.

  **Acceptance Criteria**:
  - [ ] Promoted textbook reaction records include `textbookContent` and `sourceHeading`.
  - [ ] Card text remains capped via `description` and does not render full content.
  - [ ] Detail modal renders full textbook content when `textbookContent` exists.
  - [ ] Existing static/manual reaction records remain compatible if they lack `textbookContent`.

  **QA Scenarios**:
  ```
  Scenario: Lab card excerpt and detail full content
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/lab-textbook-experiments.spec.ts --grep "card excerpt and detail full content"`
    Expected: Test opens lab route, finds a textbook-derived experiment card, asserts visible card excerpt <=100 CJK chars, opens detail modal, and asserts detail content length > card excerpt length.
    Evidence: .sisyphus/evidence/task-6-lab-detail.json

  Scenario: Static reaction fallback still displays
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/lab-textbook-experiments.spec.ts --grep "static reaction fallback"`
    Expected: Test opens an existing static reaction such as hydrogen combustion and asserts detail opens without `textbookContent` errors.
    Evidence: .sisyphus/evidence/task-6-static-fallback.json
  ```

  **Commit**: NO | Message: n/a | Files: [`scripts/textbook/promote-topic.mjs`, `src/modules/lab.js` if needed, `tests/ui/lab-textbook-experiments.spec.ts`]

- [x] 7. Wire validation commands and run full regression suite

  **What to do**: Add a package script such as `validate:textbook-enrichment` mapped to `node scripts/textbook/validate-enrichment-fixtures.mjs`. Run the enrichment validator, existing relevant validators, build, and Playwright lab spec if added. Store command outputs/evidence under `.sisyphus/evidence/`.
  **Must NOT do**: Do not add CI or a new unit-test framework in this plan; do not modify unrelated package scripts.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: package script wiring and verification execution.
  - Skills: [] - No unavailable special skill required.
  - Omitted: [`git-master`] - No commit requested.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification | Blocked By: Tasks 5, 6

  **References**:
  - Pattern: `package.json:10` - existing `validate:*` script style.
  - Pattern: `playwright.config.ts:1` - existing Playwright config using `tests/`.
  - Test: `tests/ui/storage-migration.spec.ts:103` - example evidence-writing pattern.

  **Acceptance Criteria**:
  - [ ] `npm run validate:textbook-enrichment` exits 0 and prints `PASS textbook enrichment fixtures`.
  - [ ] `npm run validate:chem-notation` exits 0.
  - [ ] `npm run validate:data` exits 0.
  - [ ] `npm run build` exits 0 and `dist/index.html` exists.
  - [ ] If `tests/ui/lab-textbook-experiments.spec.ts` exists, its targeted Playwright command exits 0.

  **QA Scenarios**:
  ```
  Scenario: Validator command succeeds
    Tool: Bash
    Steps: Run `npm run validate:textbook-enrichment`
    Expected: Exit code 0 and stdout contains `PASS textbook enrichment fixtures`.
    Evidence: .sisyphus/evidence/task-7-validator.txt

  Scenario: Build and relevant regressions pass
    Tool: Bash
    Steps: Run `npm run validate:chem-notation && npm run validate:data && npm run build`
    Expected: Exit code 0 for all commands and `dist/index.html` exists after build.
    Evidence: .sisyphus/evidence/task-7-regression.txt
  ```

  **Commit**: NO | Message: n/a | Files: [`package.json`, `.sisyphus/evidence/*`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Do not commit unless explicitly requested by the user.
- Recommended commit after implementation approval: `fix(lab): enrich textbook experiment content`.
- Keep changes grouped around textbook enrichment utilities, generation/promotion scripts, minimal lab display adjustment if needed, tests/validators, and package validation script.

## Success Criteria
- Textbook-derived experiment cards show concise, consistent excerpts capped at 100 Chinese/CJK characters.
- Experiment detail view exposes full textbook experiment content.
- Vague runtime names like `实验2-1` are replaced by deterministic content-derived titles when possible.
- Original textbook heading remains traceable via `sourceHeading`.
- High-confidence chemistry metadata appears for supported cases; ambiguous cases remain empty and non-speculative.
- Existing build, validation, and relevant Playwright checks pass without human inspection.
