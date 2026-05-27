# Missing Textbook Learning Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete ingestion, review, promotion, and learning-page display for the four missing textbook volumes so the 学习 page shows all eight textbook tabs with non-empty learning cards.

**Architecture:** Extend the existing textbook pipeline rather than replacing it: add four `pep-*` batch contracts, register those batches in every hardcoded pipeline registry, run the existing extract → draft → reviewed manifest → promotion flow, and verify runtime data drives the existing 学习 page. Preserve existing `rj-*` records exactly; new volumes use `pep-*` canonical IDs so they can match `textbookAssetManifest.volumes` directly.

**Tech Stack:** Vite vanilla JS app, Node.js ESM scripts, JSON runtime datasets, Playwright browser QA, existing validators from `package.json` and `scripts/`.

---

## TL;DR
> **Summary**: Add four missing `pep-*` textbook batches to the existing ingestion/promotion pipeline, promote all generated candidate types, and verify all eight textbook groups render on the 学习 page.
> **Deliverables**:
> - Four new batch contracts under `src/data/textbookIngestion/batches/`
> - Updated hardcoded registries in textbook pipeline scripts
> - Generated source inventories, draft candidates, reviewed promotion manifests, and promoted runtime data
> - Clean Chinese labels for the four new 学习 page tabs
> - Automated evidence for data integrity and browser-rendered learning-page behavior
> **Effort**: Large
> **Parallel**: YES - 5 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3-6 → Task 7 → Tasks 8-10 → Final Verification Wave

## Context
### Original Request
The user wants the remaining four textbooks to appear on the 学习 page by completing their textbook ingestion / review / promotion workflow and displaying them in the learning template.

### Interview Summary
- Use canonical `pep-*` IDs for the four new volumes:
  - `pep-chemistry-g10-required-1`
  - `pep-chemistry-g10-required-2`
  - `pep-chemistry-g11-selective-1`
  - `pep-chemistry-g11-selective-2`
- Promote all generated candidate types, not only learning-card achievements.
- Verification must be full: textbook manifest/promotion checks, `npm run validate:all:safe`, and browser QA for the 学习 page.
- Preserve existing four `rj-*` batches and their rendered learning cards.

### Metis Review (gaps addressed)
- Guard against hardcoded registry drift by updating every known registry and adding an exact registry assertion.
- Guard against silent partial success by requiring per-volume checks for all four `pep-*` IDs.
- Guard against raw IDs/awkward labels leaking into the UI by requiring Playwright assertions for Chinese-readable labels.
- Guard against over-promotion ambiguity by promoting every non-empty generated candidate type supported by the existing pipeline and explicitly reporting skipped unsupported artifacts.
- Guard against broad data scope creep by allowing runtime dataset changes only through the existing promotion script.

## Work Objectives
### Core Objective
Make the 学习 page display all eight textbook groups, with the four new `pep-*` textbooks populated from the existing textbook ingestion/review/promotion pipeline.

### Deliverables
- `src/data/textbookIngestion/batches/pep-chemistry-g10-required-1.json`
- `src/data/textbookIngestion/batches/pep-chemistry-g10-required-2.json`
- `src/data/textbookIngestion/batches/pep-chemistry-g11-selective-1.json`
- `src/data/textbookIngestion/batches/pep-chemistry-g11-selective-2.json`
- Updated batch registries in:
  - `scripts/textbook/extract-textbook.mjs`
  - `scripts/textbook/generate-drafts.mjs`
  - `scripts/textbook/promote-topic.mjs`
  - `scripts/textbook/validate-promotion-manifest.mjs`
- Generated artifacts under `src/data/textbookIngestion/generated/<pep-id>/`
- Reviewed manifests under `src/data/textbookIngestion/reviewed/<pep-id>/promotion-manifest.json`
- Promoted runtime data through existing adapters in `scripts/textbook/promote-topic.mjs`
- Learning page labels in `src/modules/progress.js` that do not show raw IDs, “人教版”, “化学”, or years for new tabs.

### Definition of Done (verifiable conditions with commands)
- `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed` exits 0 and validates all eight known batches.
- `node scripts/textbook/promote-topic.mjs --all-reviewed --dry-run --json` exits 0 and reports planned/skipped promotion without duplicate errors.
- `npm run validate:all:safe` exits 0.
- Browser QA evidence proves exactly eight textbook tabs are visible and the four new `pep-*` tabs each contain at least one learning card.
- Runtime data inspection proves each new `pep-*` ID has at least one achievement with `condition.type === 'manualReviewAfterPromotion'` and `sourceReviewStatus === 'reviewed'`.

### Must Have
- Existing `rj-*` sourceVolumeIds remain unchanged.
- The four new `pep-*` sourceVolumeIds propagate consistently from batch JSON → generated candidates → reviewed manifest → runtime records → 学习 page tabs.
- All generated supported candidate types are promoted through existing adapters.
- Any unsupported generated artifacts are reported by the existing promotion output and do not block learning-card visibility.
- Learning page tab order is stable: existing current order first if already rendered, then new `pep-*` volumes in curriculum order: 必修第一册, 必修第二册, 选择性必修1, 选择性必修2. If existing runtime grouping order already places all groups by data insertion, make this deterministic in `getTextbookGroups()`.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not rename, migrate, or rewrite existing `rj-*` runtime IDs.
- Do not change learner-state contracts in `src/modules/storage.js`, `window.appState`, learned/collected elements, quiz scores, completed experiments, or achievement unlock semantics.
- Do not manually edit unrelated runtime datasets except for changes produced by `scripts/textbook/promote-topic.mjs`.
- Do not add new dependencies, new UI frameworks, or broad pipeline abstractions unless a current hardcoded registry prevents the required four volumes.
- Do not accept manual-only QA. Every acceptance criterion must be executable by an agent.
- Do not show raw IDs, “人教版”, “化学”, or year strings in new 学习 page tab labels.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + existing Node validators + Playwright browser QA. Do not add test infra.
- QA policy: Every task has agent-executed happy and failure/edge scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
- Required final commands:
  - `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed`
  - `node scripts/textbook/promote-topic.mjs --all-reviewed --dry-run --json`
  - `node scripts/validate-textbook-assets.mjs`
  - `npm run validate:all:safe`
  - Playwright QA against the 学习 page.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1A: Task 1 (registry/test scaffolding)
Wave 1B: Task 2 (batch contracts)
Wave 2: Tasks 3-6 (per-volume extraction/draft/review generation; can run in parallel after Task 1 and Task 2)
Wave 3: Task 7 (promotion and runtime data integration)
Wave 4A: Tasks 8-9 (learning page labels/order and data assertions; can run in parallel after Task 7)
Wave 4B: Task 10 (browser QA; starts after Task 8 and Task 9)
Wave 5: Task 11 (full validation/idempotency)

### Dependency Matrix (full, all tasks)
- Task 1: blocks Tasks 3-7 and Task 11.
- Task 2: blocks Tasks 3-7.
- Tasks 3-6: each blocked by Tasks 1-2; all block Task 7.
- Task 7: blocked by Tasks 3-6; blocks Tasks 8-11.
- Task 8: blocked by Task 7; can run parallel with Task 9.
- Task 9: blocked by Task 7; can run parallel with Task 8.
- Task 10: blocked by Tasks 8-9.
- Task 11: blocked by Tasks 7-10.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1A/1B → 2 sequential tasks → `quick`, `unspecified-high`
- Wave 2 → 4 tasks → `unspecified-high` x4
- Wave 3 → 1 task → `unspecified-high`
- Wave 4A/4B → 3 tasks, 2 parallel then 1 QA → `quick`, `unspecified-high`, `visual-engineering`
- Wave 5 → 1 task → `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Register the four `pep-*` volumes in every textbook pipeline registry

  **What to do**: Update every hardcoded known-batch registry so the current scripts recognize these exact IDs: `pep-chemistry-g10-required-1`, `pep-chemistry-g10-required-2`, `pep-chemistry-g11-selective-1`, `pep-chemistry-g11-selective-2`. Preserve all existing `rj-*` entries and their order. Touch these files: `scripts/textbook/extract-textbook.mjs`, `scripts/textbook/generate-drafts.mjs`, `scripts/textbook/promote-topic.mjs`, `scripts/textbook/validate-promotion-manifest.mjs`. Use the existing `buildTextbookPaths(volumeId)` pattern where present. For `extract-textbook.mjs`, add each new ID to the `knownTextbookBatches` Map with `batchPath: path.join(projectRoot, 'src', 'data', 'textbookIngestion', 'batches', '<id>.json')`.
  **Must NOT do**: Do not remove fixture entries such as `fixture-missing-book`. Do not rename existing `rj-*` entries. Do not centralize the registry unless all current CLI behavior and fixture validation remain unchanged.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: focused edits in four script registries.
  - Skills: [] - No specialized implementation skill is required beyond following this plan.
  - Omitted: [`frontend-design`] - No UI work in this task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [3,4,5,6,7,11] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `scripts/textbook/extract-textbook.mjs:11-48` - hardcoded Map of known batches and fixture entry.
  - Pattern: `scripts/textbook/generate-drafts.mjs:15-20` - hardcoded Set of known batches.
  - Pattern: `scripts/textbook/promote-topic.mjs:17-22` - hardcoded Map using `buildTextbookPaths`.
  - Pattern: `scripts/textbook/validate-promotion-manifest.mjs:10-27` - hardcoded Map for validator.
  - API/Type: `scripts/textbook/extract-textbook.mjs:118-126` - CLI syntax requires `--textbook <volumeId>`.
  - API/Type: `scripts/textbook/generate-drafts.mjs:125-133` - CLI syntax requires `--textbook <volumeId>`.
  - API/Type: `scripts/textbook/promote-topic.mjs:117-131` - CLI syntax supports `--textbook`, `--all-reviewed`, `--dry-run`, `--json`.
  - API/Type: `scripts/textbook/validate-promotion-manifest.mjs:180-192` - CLI syntax supports `--textbook`, `--all-reviewed`, `--fixture`.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `node -e "const fs=require('fs');const files=['scripts/textbook/extract-textbook.mjs','scripts/textbook/generate-drafts.mjs','scripts/textbook/promote-topic.mjs','scripts/textbook/validate-promotion-manifest.mjs'];const ids=['rj-chemistry-grade9-2024-vol1','rj-chemistry-grade9-2024-vol2','rj-chemistry-g12-selective-3-organic-2019','rj-chemistry-grade8-54-2024-full','pep-chemistry-g10-required-1','pep-chemistry-g10-required-2','pep-chemistry-g11-selective-1','pep-chemistry-g11-selective-2'];for(const file of files){const text=fs.readFileSync(file,'utf8');for(const id of ids){if(!text.includes(id)){throw new Error(file+' missing '+id)}}}console.log('registry-ok')"` prints `registry-ok`.
  - [ ] `node scripts/textbook/extract-textbook.mjs --help` exits 0 and prints `Textbook source extractor`.
  - [ ] `node scripts/textbook/generate-drafts.mjs --help` exits 0 and prints `Textbook draft generator`.
  - [ ] `node scripts/textbook/promote-topic.mjs --help` exits 0 and prints `Reviewed textbook promotion`.
  - [ ] `node scripts/textbook/validate-promotion-manifest.mjs --help` exits 0 and prints `Reviewed promotion manifest validator`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Registry accepts a new pep ID at CLI boundary
    Tool: Bash
    Steps: Run `node scripts/textbook/extract-textbook.mjs --textbook pep-chemistry-g10-required-1` before Task 2 batch file exists.
    Expected: Command fails because the batch JSON cannot be read or parsed, NOT because of `Unknown textbook batch`.
    Evidence: .sisyphus/evidence/task-1-registry-cli.txt

  Scenario: Existing rj fixture and batches remain recognized
    Tool: Bash
    Steps: Run `node scripts/textbook/extract-textbook.mjs --textbook does-not-exist` and `node scripts/textbook/extract-textbook.mjs --textbook rj-chemistry-grade9-2024-vol1`.
    Expected: The first command fails with `Unknown textbook batch: does-not-exist`; the second command does not fail with `Unknown textbook batch`.
    Evidence: .sisyphus/evidence/task-1-registry-rj-regression.txt
  ```

  **Commit**: YES | Message: `feat(textbook): register missing pep ingestion batches` | Files: [`scripts/textbook/extract-textbook.mjs`, `scripts/textbook/generate-drafts.mjs`, `scripts/textbook/promote-topic.mjs`, `scripts/textbook/validate-promotion-manifest.mjs`]

- [ ] 2. Add batch contracts for the four missing `pep-*` textbooks

  **What to do**: Create four batch JSON files under `src/data/textbookIngestion/batches/`. Use the exact existing schema shape from `rj-chemistry-grade9-2024-vol1.json`: `volumeId`, `displayName`, `sourcePath`, `assetRoot`, `schemaVersion`, `status`, `activeBatchId`, `generatedAt`, `sourceHash`, `allowedStatuses`. Compute `sourceHash` from each book file as `sha256:<hash>` using Node crypto. Use these exact source paths from `src/data/textbookAssets.js`: `src/data/textbooks/2019版人教版高中化学必修第1册/book.md`, `src/data/textbooks/2019版人教版高中化学必修第2册/book.md`, `src/data/textbooks/2019版人教版高中化学-选择性必修1 化学反应原理/book.md`, `src/data/textbooks/2019版人教版高中化学-选择性必修2 物质结构与性质/book.md`. Set `generatedAt` to `2026-05-22T00:00:00.000Z`. Use active batch IDs `<volumeId>-source-imported-2026-05-22`.
  **Must NOT do**: Do not invent new source paths. Do not use `rj-*` aliases for these four new files. Do not modify `textbookAssets.js` unless a source path typo is proven by a failed file-existence check.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: data contracts require exact source hashes and path validation.
  - Skills: [] - No domain skill needed; use precise file inspection and Node commands.
  - Omitted: [`test-driven-development`] - This task creates data contracts and validates with existing scripts rather than writing code tests first.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [3,4,5,6,7] | Blocked By: []

  **References**:
  - Pattern: `src/data/textbookIngestion/batches/rj-chemistry-grade9-2024-vol1.json:1-18` - exact batch contract shape.
  - Source: `src/data/textbookAssets.js:47-82` - four missing volume metadata and source paths.
  - API/Type: `scripts/textbook/extract-textbook.mjs:138-156` - validates `volumeId`, `sourcePath`, `assetRoot`, `sourceHash`.
  - API/Type: `scripts/textbook/generate-drafts.mjs:153-169` - validates source inventory after extraction.

  **Acceptance Criteria**:
  - [ ] `node -e "const fs=require('fs'),crypto=require('crypto');const specs=[['pep-chemistry-g10-required-1','src/data/textbooks/2019版人教版高中化学必修第1册/book.md'],['pep-chemistry-g10-required-2','src/data/textbooks/2019版人教版高中化学必修第2册/book.md'],['pep-chemistry-g11-selective-1','src/data/textbooks/2019版人教版高中化学-选择性必修1 化学反应原理/book.md'],['pep-chemistry-g11-selective-2','src/data/textbooks/2019版人教版高中化学-选择性必修2 物质结构与性质/book.md']];for(const [id,sourcePath] of specs){const file='src/data/textbookIngestion/batches/'+id+'.json';if(!fs.existsSync(file))throw new Error('missing '+file);const batch=JSON.parse(fs.readFileSync(file,'utf8'));if(batch.volumeId!==id)throw new Error(id+' volumeId mismatch');if(batch.sourcePath!==sourcePath)throw new Error(id+' sourcePath mismatch');if(batch.assetRoot!==sourcePath.replace(/book\.md$/,''))throw new Error(id+' assetRoot mismatch');const hash='sha256:'+crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');if(batch.sourceHash!==hash)throw new Error(id+' sourceHash mismatch');if(batch.status!=='sourceImported')throw new Error(id+' status mismatch');}console.log('batches-ok')"` prints `batches-ok`.
  - [ ] `node scripts/textbook/validate-batch-contract.mjs` exits 0 if it validates all batches automatically; if it requires arguments, run its `--help` and then the documented command for the four new files.

  **QA Scenarios**:
  ```
  Scenario: Batch hash matches source book
    Tool: Bash
    Steps: Run the Node one-liner from Acceptance Criteria.
    Expected: `batches-ok` printed and exit code 0.
    Evidence: .sisyphus/evidence/task-2-batch-hashes.txt

  Scenario: Bad hash would be detected by extractor
    Tool: Bash
    Steps: Copy one batch JSON to C:\Users\fczll\AppData\Local\Temp\opencode\bad-batch.json, change its sourceHash there only, then document that extractor validation uses `batch.sourceHash !== sourceHash` from `extract-textbook.mjs:80-82`; do not modify repo files for the negative test.
    Expected: No repo file changes; evidence explains the negative-path guard and references exact lines.
    Evidence: .sisyphus/evidence/task-2-bad-hash-guard.txt
  ```

  **Commit**: YES | Message: `feat(textbook): add pep textbook batch contracts` | Files: [`src/data/textbookIngestion/batches/pep-chemistry-g10-required-1.json`, `src/data/textbookIngestion/batches/pep-chemistry-g10-required-2.json`, `src/data/textbookIngestion/batches/pep-chemistry-g11-selective-1.json`, `src/data/textbookIngestion/batches/pep-chemistry-g11-selective-2.json`]

- [ ] 3. Generate reviewed pipeline artifacts for `pep-chemistry-g10-required-1`

  **What to do**: Run the existing pipeline for `pep-chemistry-g10-required-1`: extract source inventory, generate drafts, create an initial reviewed manifest if the review generator requires one, generate reviewed candidates with `--write`, and validate the manifest. If `generate-reviewed-candidates.mjs` fails because `reviewed/<id>/promotion-manifest.json` does not exist, create a minimal manifest with `schemaVersion: 1`, `volumeId`, matching `sourceHash`, `generatedAt: "2026-05-22T00:00:00.000Z"`, and `entries: []`, then rerun the command. Generated artifacts must remain under this volume ID only.
  **Must NOT do**: Do not manually curate candidate content. Do not promote runtime data in this task. Do not touch other volume generated directories except if shared script output explicitly requires it.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: executes data generation and validates artifact integrity.
  - Skills: [] - Existing scripts handle generation; no external library research needed.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [7] | Blocked By: [1,2]

  **References**:
  - Command: `node scripts/textbook/extract-textbook.mjs --textbook pep-chemistry-g10-required-1`
  - Command: `node scripts/textbook/generate-drafts.mjs --textbook pep-chemistry-g10-required-1`
  - Command: `node scripts/textbook/generate-reviewed-candidates.mjs --textbook pep-chemistry-g10-required-1 --write`
  - Command: `node scripts/textbook/validate-promotion-manifest.mjs --textbook pep-chemistry-g10-required-1`
  - Pattern: `src/data/textbookIngestion/reviewed/rj-chemistry-grade9-2024-vol1/promotion-manifest.json:1-6` - minimal manifest header shape.

  **Acceptance Criteria**:
  - [ ] All four commands listed in References exit 0 after any required minimal manifest bootstrap.
  - [ ] `src/data/textbookIngestion/generated/pep-chemistry-g10-required-1/source-inventory.json` exists and has `volumeId === 'pep-chemistry-g10-required-1'`.
  - [ ] `src/data/textbookIngestion/generated/pep-chemistry-g10-required-1/achievement-candidates.json` exists and contains at least one item.
  - [ ] `src/data/textbookIngestion/reviewed/pep-chemistry-g10-required-1/promotion-manifest.json` exists and contains at least one `achievementCandidate` entry with `reviewStatus === 'reviewed'`.
  - [ ] `node -e "const fs=require('fs');const id='pep-chemistry-g10-required-1';const root='src/data/textbookIngestion/generated/'+id;const manifest=JSON.parse(fs.readFileSync('src/data/textbookIngestion/reviewed/'+id+'/promotion-manifest.json','utf8'));const specs=[['knowledge-topics.json','curriculumTopic','topicId'],['quiz-candidates.json','quizCandidate','candidateId'],['achievement-candidates.json','achievementCandidate','candidateId'],['game-candidates.json','gameChallengeCandidate','candidateId'],['learning-path-candidates.json','learningPathCandidate','candidateId'],['experiment-candidates.json','experimentCandidate','candidateId']];for(const [file,type,key] of specs){const p=root+'/'+file;if(!fs.existsSync(p))continue;const arr=JSON.parse(fs.readFileSync(p,'utf8'));if(arr.length&&!manifest.entries.some(e=>e.candidateType===type&&e.reviewStatus==='reviewed'))throw new Error(id+' missing reviewed entries for '+type)}console.log(id+' candidate-coverage-ok')"` prints `pep-chemistry-g10-required-1 candidate-coverage-ok`.

  **QA Scenarios**:
  ```
  Scenario: Required volume artifacts generated
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs');const id='pep-chemistry-g10-required-1';const inv=JSON.parse(fs.readFileSync('src/data/textbookIngestion/generated/'+id+'/source-inventory.json','utf8'));const ach=JSON.parse(fs.readFileSync('src/data/textbookIngestion/generated/'+id+'/achievement-candidates.json','utf8'));const man=JSON.parse(fs.readFileSync('src/data/textbookIngestion/reviewed/'+id+'/promotion-manifest.json','utf8'));if(inv.volumeId!==id)throw new Error('bad inventory volume');if(!ach.length)throw new Error('no achievement candidates');if(!man.entries.some(e=>e.candidateType==='achievementCandidate'&&e.reviewStatus==='reviewed'))throw new Error('no reviewed achievement entries');console.log(id+' artifacts-ok')"`.
    Expected: `pep-chemistry-g10-required-1 artifacts-ok`.
    Evidence: .sisyphus/evidence/task-3-g10-required-1-artifacts.txt

  Scenario: Manifest validator rejects missing reviewed traceability
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-promotion-manifest.mjs --textbook pep-chemistry-g10-required-1`.
    Expected: Exit code 0; no schema/traceability errors.
    Evidence: .sisyphus/evidence/task-3-g10-required-1-validator.txt
  ```

  **Commit**: NO | Message: `data(textbook): generate reviewed candidates for pep volumes` | Files: [`src/data/textbookIngestion/generated/pep-chemistry-g10-required-1/**`, `src/data/textbookIngestion/reviewed/pep-chemistry-g10-required-1/promotion-manifest.json`]

- [ ] 4. Generate reviewed pipeline artifacts for `pep-chemistry-g10-required-2`

  **What to do**: Run the same pipeline as Task 3 for `pep-chemistry-g10-required-2`: extract, generate drafts, bootstrap minimal reviewed manifest if needed, generate reviewed candidates with `--write`, validate manifest.
  **Must NOT do**: Do not promote runtime data in this task. Do not use the required-1 source path or hash.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: executes data generation and validates artifact integrity.
  - Skills: [] - Existing scripts handle generation.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [7] | Blocked By: [1,2]

  **References**:
  - Command: `node scripts/textbook/extract-textbook.mjs --textbook pep-chemistry-g10-required-2`
  - Command: `node scripts/textbook/generate-drafts.mjs --textbook pep-chemistry-g10-required-2`
  - Command: `node scripts/textbook/generate-reviewed-candidates.mjs --textbook pep-chemistry-g10-required-2 --write`
  - Command: `node scripts/textbook/validate-promotion-manifest.mjs --textbook pep-chemistry-g10-required-2`
  - Source: `src/data/textbookAssets.js:56-64` - source path and metadata.

  **Acceptance Criteria**:
  - [ ] All four commands listed in References exit 0 after any required minimal manifest bootstrap.
  - [ ] `source-inventory.json`, `achievement-candidates.json`, and `promotion-manifest.json` exist under the `pep-chemistry-g10-required-2` directories.
  - [ ] At least one reviewed `achievementCandidate` entry exists in the promotion manifest.
  - [ ] `node -e "const fs=require('fs');const id='pep-chemistry-g10-required-2';const root='src/data/textbookIngestion/generated/'+id;const manifest=JSON.parse(fs.readFileSync('src/data/textbookIngestion/reviewed/'+id+'/promotion-manifest.json','utf8'));const specs=[['knowledge-topics.json','curriculumTopic','topicId'],['quiz-candidates.json','quizCandidate','candidateId'],['achievement-candidates.json','achievementCandidate','candidateId'],['game-candidates.json','gameChallengeCandidate','candidateId'],['learning-path-candidates.json','learningPathCandidate','candidateId'],['experiment-candidates.json','experimentCandidate','candidateId']];for(const [file,type,key] of specs){const p=root+'/'+file;if(!fs.existsSync(p))continue;const arr=JSON.parse(fs.readFileSync(p,'utf8'));if(arr.length&&!manifest.entries.some(e=>e.candidateType===type&&e.reviewStatus==='reviewed'))throw new Error(id+' missing reviewed entries for '+type)}console.log(id+' candidate-coverage-ok')"` prints `pep-chemistry-g10-required-2 candidate-coverage-ok`.

  **QA Scenarios**:
  ```
  Scenario: Required volume artifacts generated
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs');const id='pep-chemistry-g10-required-2';const inv=JSON.parse(fs.readFileSync('src/data/textbookIngestion/generated/'+id+'/source-inventory.json','utf8'));const ach=JSON.parse(fs.readFileSync('src/data/textbookIngestion/generated/'+id+'/achievement-candidates.json','utf8'));const man=JSON.parse(fs.readFileSync('src/data/textbookIngestion/reviewed/'+id+'/promotion-manifest.json','utf8'));if(inv.volumeId!==id)throw new Error('bad inventory volume');if(!ach.length)throw new Error('no achievement candidates');if(!man.entries.some(e=>e.candidateType==='achievementCandidate'&&e.reviewStatus==='reviewed'))throw new Error('no reviewed achievement entries');console.log(id+' artifacts-ok')"`.
    Expected: `pep-chemistry-g10-required-2 artifacts-ok`.
    Evidence: .sisyphus/evidence/task-4-g10-required-2-artifacts.txt

  Scenario: Manifest validator rejects missing reviewed traceability
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-promotion-manifest.mjs --textbook pep-chemistry-g10-required-2`.
    Expected: Exit code 0; no schema/traceability errors.
    Evidence: .sisyphus/evidence/task-4-g10-required-2-validator.txt
  ```

  **Commit**: NO | Message: `data(textbook): generate reviewed candidates for pep volumes` | Files: [`src/data/textbookIngestion/generated/pep-chemistry-g10-required-2/**`, `src/data/textbookIngestion/reviewed/pep-chemistry-g10-required-2/promotion-manifest.json`]

- [ ] 5. Generate reviewed pipeline artifacts for `pep-chemistry-g11-selective-1`

  **What to do**: Run the same pipeline as Task 3 for `pep-chemistry-g11-selective-1`: extract, generate drafts, bootstrap minimal reviewed manifest if needed, generate reviewed candidates with `--write`, validate manifest. Ensure the source path is `src/data/textbooks/2019版人教版高中化学-选择性必修1 化学反应原理/book.md`.
  **Must NOT do**: Do not promote runtime data in this task. Do not use the selective-2 source path or title.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: executes data generation and validates artifact integrity.
  - Skills: [] - Existing scripts handle generation.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [7] | Blocked By: [1,2]

  **References**:
  - Command: `node scripts/textbook/extract-textbook.mjs --textbook pep-chemistry-g11-selective-1`
  - Command: `node scripts/textbook/generate-drafts.mjs --textbook pep-chemistry-g11-selective-1`
  - Command: `node scripts/textbook/generate-reviewed-candidates.mjs --textbook pep-chemistry-g11-selective-1 --write`
  - Command: `node scripts/textbook/validate-promotion-manifest.mjs --textbook pep-chemistry-g11-selective-1`
  - Source: `src/data/textbookAssets.js:65-73` - source path and metadata.

  **Acceptance Criteria**:
  - [ ] All four commands listed in References exit 0 after any required minimal manifest bootstrap.
  - [ ] `source-inventory.json`, `achievement-candidates.json`, and `promotion-manifest.json` exist under the `pep-chemistry-g11-selective-1` directories.
  - [ ] At least one reviewed `achievementCandidate` entry exists in the promotion manifest.
  - [ ] `node -e "const fs=require('fs');const id='pep-chemistry-g11-selective-1';const root='src/data/textbookIngestion/generated/'+id;const manifest=JSON.parse(fs.readFileSync('src/data/textbookIngestion/reviewed/'+id+'/promotion-manifest.json','utf8'));const specs=[['knowledge-topics.json','curriculumTopic','topicId'],['quiz-candidates.json','quizCandidate','candidateId'],['achievement-candidates.json','achievementCandidate','candidateId'],['game-candidates.json','gameChallengeCandidate','candidateId'],['learning-path-candidates.json','learningPathCandidate','candidateId'],['experiment-candidates.json','experimentCandidate','candidateId']];for(const [file,type,key] of specs){const p=root+'/'+file;if(!fs.existsSync(p))continue;const arr=JSON.parse(fs.readFileSync(p,'utf8'));if(arr.length&&!manifest.entries.some(e=>e.candidateType===type&&e.reviewStatus==='reviewed'))throw new Error(id+' missing reviewed entries for '+type)}console.log(id+' candidate-coverage-ok')"` prints `pep-chemistry-g11-selective-1 candidate-coverage-ok`.

  **QA Scenarios**:
  ```
  Scenario: Required volume artifacts generated
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs');const id='pep-chemistry-g11-selective-1';const inv=JSON.parse(fs.readFileSync('src/data/textbookIngestion/generated/'+id+'/source-inventory.json','utf8'));const ach=JSON.parse(fs.readFileSync('src/data/textbookIngestion/generated/'+id+'/achievement-candidates.json','utf8'));const man=JSON.parse(fs.readFileSync('src/data/textbookIngestion/reviewed/'+id+'/promotion-manifest.json','utf8'));if(inv.volumeId!==id)throw new Error('bad inventory volume');if(!ach.length)throw new Error('no achievement candidates');if(!man.entries.some(e=>e.candidateType==='achievementCandidate'&&e.reviewStatus==='reviewed'))throw new Error('no reviewed achievement entries');console.log(id+' artifacts-ok')"`.
    Expected: `pep-chemistry-g11-selective-1 artifacts-ok`.
    Evidence: .sisyphus/evidence/task-5-g11-selective-1-artifacts.txt

  Scenario: Manifest validator rejects missing reviewed traceability
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-promotion-manifest.mjs --textbook pep-chemistry-g11-selective-1`.
    Expected: Exit code 0; no schema/traceability errors.
    Evidence: .sisyphus/evidence/task-5-g11-selective-1-validator.txt
  ```

  **Commit**: NO | Message: `data(textbook): generate reviewed candidates for pep volumes` | Files: [`src/data/textbookIngestion/generated/pep-chemistry-g11-selective-1/**`, `src/data/textbookIngestion/reviewed/pep-chemistry-g11-selective-1/promotion-manifest.json`]

- [ ] 6. Generate reviewed pipeline artifacts for `pep-chemistry-g11-selective-2`

  **What to do**: Run the same pipeline as Task 3 for `pep-chemistry-g11-selective-2`: extract, generate drafts, bootstrap minimal reviewed manifest if needed, generate reviewed candidates with `--write`, validate manifest. Ensure the source path is `src/data/textbooks/2019版人教版高中化学-选择性必修2 物质结构与性质/book.md`.
  **Must NOT do**: Do not promote runtime data in this task. Do not use the selective-1 source path or title.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: executes data generation and validates artifact integrity.
  - Skills: [] - Existing scripts handle generation.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [7] | Blocked By: [1,2]

  **References**:
  - Command: `node scripts/textbook/extract-textbook.mjs --textbook pep-chemistry-g11-selective-2`
  - Command: `node scripts/textbook/generate-drafts.mjs --textbook pep-chemistry-g11-selective-2`
  - Command: `node scripts/textbook/generate-reviewed-candidates.mjs --textbook pep-chemistry-g11-selective-2 --write`
  - Command: `node scripts/textbook/validate-promotion-manifest.mjs --textbook pep-chemistry-g11-selective-2`
  - Source: `src/data/textbookAssets.js:74-82` - source path and metadata.

  **Acceptance Criteria**:
  - [ ] All four commands listed in References exit 0 after any required minimal manifest bootstrap.
  - [ ] `source-inventory.json`, `achievement-candidates.json`, and `promotion-manifest.json` exist under the `pep-chemistry-g11-selective-2` directories.
  - [ ] At least one reviewed `achievementCandidate` entry exists in the promotion manifest.
  - [ ] `node -e "const fs=require('fs');const id='pep-chemistry-g11-selective-2';const root='src/data/textbookIngestion/generated/'+id;const manifest=JSON.parse(fs.readFileSync('src/data/textbookIngestion/reviewed/'+id+'/promotion-manifest.json','utf8'));const specs=[['knowledge-topics.json','curriculumTopic','topicId'],['quiz-candidates.json','quizCandidate','candidateId'],['achievement-candidates.json','achievementCandidate','candidateId'],['game-candidates.json','gameChallengeCandidate','candidateId'],['learning-path-candidates.json','learningPathCandidate','candidateId'],['experiment-candidates.json','experimentCandidate','candidateId']];for(const [file,type,key] of specs){const p=root+'/'+file;if(!fs.existsSync(p))continue;const arr=JSON.parse(fs.readFileSync(p,'utf8'));if(arr.length&&!manifest.entries.some(e=>e.candidateType===type&&e.reviewStatus==='reviewed'))throw new Error(id+' missing reviewed entries for '+type)}console.log(id+' candidate-coverage-ok')"` prints `pep-chemistry-g11-selective-2 candidate-coverage-ok`.

  **QA Scenarios**:
  ```
  Scenario: Required volume artifacts generated
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs');const id='pep-chemistry-g11-selective-2';const inv=JSON.parse(fs.readFileSync('src/data/textbookIngestion/generated/'+id+'/source-inventory.json','utf8'));const ach=JSON.parse(fs.readFileSync('src/data/textbookIngestion/generated/'+id+'/achievement-candidates.json','utf8'));const man=JSON.parse(fs.readFileSync('src/data/textbookIngestion/reviewed/'+id+'/promotion-manifest.json','utf8'));if(inv.volumeId!==id)throw new Error('bad inventory volume');if(!ach.length)throw new Error('no achievement candidates');if(!man.entries.some(e=>e.candidateType==='achievementCandidate'&&e.reviewStatus==='reviewed'))throw new Error('no reviewed achievement entries');console.log(id+' artifacts-ok')"`.
    Expected: `pep-chemistry-g11-selective-2 artifacts-ok`.
    Evidence: .sisyphus/evidence/task-6-g11-selective-2-artifacts.txt

  Scenario: Manifest validator rejects missing reviewed traceability
    Tool: Bash
    Steps: Run `node scripts/textbook/validate-promotion-manifest.mjs --textbook pep-chemistry-g11-selective-2`.
    Expected: Exit code 0; no schema/traceability errors.
    Evidence: .sisyphus/evidence/task-6-g11-selective-2-validator.txt
  ```

  **Commit**: YES | Message: `data(textbook): generate reviewed candidates for pep volumes` | Files: [`src/data/textbookIngestion/generated/pep-chemistry-g10-required-1/**`, `src/data/textbookIngestion/generated/pep-chemistry-g10-required-2/**`, `src/data/textbookIngestion/generated/pep-chemistry-g11-selective-1/**`, `src/data/textbookIngestion/generated/pep-chemistry-g11-selective-2/**`, `src/data/textbookIngestion/reviewed/pep-chemistry-g10-required-1/promotion-manifest.json`, `src/data/textbookIngestion/reviewed/pep-chemistry-g10-required-2/promotion-manifest.json`, `src/data/textbookIngestion/reviewed/pep-chemistry-g11-selective-1/promotion-manifest.json`, `src/data/textbookIngestion/reviewed/pep-chemistry-g11-selective-2/promotion-manifest.json`]

- [ ] 7. Promote all reviewed `pep-*` candidates into runtime data

  **What to do**: First run `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed` and fix any schema/traceability errors. Then run `node scripts/textbook/promote-topic.mjs --all-reviewed --dry-run --json` and inspect planned writes/skips. Then run `node scripts/textbook/promote-topic.mjs --textbook <id>` once for each of the four new `pep-*` IDs, or `--all-reviewed` if dry-run proves idempotent and no existing `rj-*` data will duplicate. Because `upsertTextbookRecord` should be idempotent, verify after promotion that runtime data contains records for all four `pep-*` IDs and existing `rj-*` counts did not drop.
  **Must NOT do**: Do not hand-edit `achievementsData.json`, `quizData.json`, `learningPath.json`, `reactions.json`, or `contentMeta.js` to simulate promotion. Runtime data changes must come from `promote-topic.mjs`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: broad runtime data generation with cross-file validation.
  - Skills: [] - Existing scripts and validators govern behavior.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [8,9,10,11] | Blocked By: [3,4,5,6]

  **References**:
  - Adapter: `scripts/textbook/promote-topic.mjs:401-429` - achievements get `manualReviewAfterPromotion`, `sourceReviewStatus: 'reviewed'`, and `sourceVolumeId`.
  - Adapter: `scripts/textbook/promote-topic.mjs:342-369` - quiz records.
  - Adapter: `scripts/textbook/promote-topic.mjs:431-458` - learning path records.
  - Adapter: `scripts/textbook/promote-topic.mjs:461+` - reaction records.
  - Runtime: `src/data/achievementsData.json` - learning-card source data.
  - Runtime: `src/data/quizData.json`, `src/data/learningPath.json`, `src/data/reactions.json`, `src/data/contentMeta.js` - other promoted targets.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed` exits 0.
  - [ ] `node scripts/textbook/promote-topic.mjs --all-reviewed --dry-run --json` exits 0.
  - [ ] `node -e "const fs=require('fs');const ids=['pep-chemistry-g10-required-1','pep-chemistry-g10-required-2','pep-chemistry-g11-selective-1','pep-chemistry-g11-selective-2'];const specs=[['knowledge-topics.json','curriculumTopic'],['quiz-candidates.json','quizCandidate'],['achievement-candidates.json','achievementCandidate'],['game-candidates.json','gameChallengeCandidate'],['learning-path-candidates.json','learningPathCandidate'],['experiment-candidates.json','experimentCandidate']];for(const id of ids){const man=JSON.parse(fs.readFileSync('src/data/textbookIngestion/reviewed/'+id+'/promotion-manifest.json','utf8'));for(const [file,type] of specs){const p='src/data/textbookIngestion/generated/'+id+'/'+file;if(!fs.existsSync(p))continue;const arr=JSON.parse(fs.readFileSync(p,'utf8'));if(arr.length&&!man.entries.some(e=>e.candidateType===type&&(e.reviewStatus==='reviewed'||e.reviewStatus==='promoted')))throw new Error(id+' missing promoted/reviewed manifest coverage for '+type)}}console.log('all-pep-candidate-types-covered')"` prints `all-pep-candidate-types-covered`.
  - [ ] `node -e "const fs=require('fs');const ids=['pep-chemistry-g10-required-1','pep-chemistry-g10-required-2','pep-chemistry-g11-selective-1','pep-chemistry-g11-selective-2'];const files=[['src/data/quizData.json',p=>JSON.parse(p).quizData,'quiz'],['src/data/achievementsData.json',p=>JSON.parse(p).achievementsData,'achievement'],['src/data/learningPath.json',p=>JSON.parse(p).stages,'learningPath'],['src/data/reactions.json',p=>JSON.parse(p),'reaction']];for(const [file,read,label] of files){const arr=read(fs.readFileSync(file,'utf8'));for(const id of ids){if(!arr.some(item=>item&&item.sourceVolumeId===id&&item.sourceReviewStatus==='reviewed'))throw new Error(label+' missing reviewed runtime records for '+id)}}const content=fs.readFileSync('src/data/contentMeta.js','utf8');for(const id of ids){if(!content.includes(id))throw new Error('contentMeta missing '+id)}console.log('all-pep-runtime-targets-covered')"` prints `all-pep-runtime-targets-covered`.
  - [ ] `node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync('src/data/achievementsData.json','utf8')).achievementsData;const ids=['pep-chemistry-g10-required-1','pep-chemistry-g10-required-2','pep-chemistry-g11-selective-1','pep-chemistry-g11-selective-2'];for(const id of ids){const rows=data.filter(a=>a.sourceVolumeId===id&&a.sourceReviewStatus==='reviewed'&&a.condition&&a.condition.type==='manualReviewAfterPromotion');if(!rows.length)throw new Error('no reviewed learning achievements for '+id)}console.log('pep-achievements-ok')"` prints `pep-achievements-ok`.
  - [ ] `node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync('src/data/achievementsData.json','utf8')).achievementsData;const ids=['rj-chemistry-grade9-2024-vol1','rj-chemistry-grade9-2024-vol2','rj-chemistry-grade8-54-2024-full','rj-chemistry-g12-selective-3-organic-2019'];for(const id of ids){const count=data.filter(a=>a.sourceVolumeId===id&&a.sourceReviewStatus==='reviewed'&&a.condition&&a.condition.type==='manualReviewAfterPromotion').length;if(count<=0)throw new Error('lost existing achievements for '+id)}console.log('rj-achievements-preserved')"` prints `rj-achievements-preserved`.

  **QA Scenarios**:
  ```
  Scenario: New pep learning achievements are visible in runtime data
    Tool: Bash
    Steps: Run the `pep-achievements-ok` Node command from Acceptance Criteria.
    Expected: `pep-achievements-ok` and exit code 0.
    Evidence: .sisyphus/evidence/task-7-pep-achievements.txt

  Scenario: Re-running dry-run does not show duplicate-id failure
    Tool: Bash
    Steps: Run `node scripts/textbook/promote-topic.mjs --all-reviewed --dry-run --json` after promotion.
    Expected: Exit code 0; output contains no duplicate runtime ID error.
    Evidence: .sisyphus/evidence/task-7-promotion-idempotency-dry-run.txt

  Scenario: Supported runtime targets are all populated
    Tool: Bash
    Steps: Run the `all-pep-runtime-targets-covered` Node command from Acceptance Criteria.
    Expected: `all-pep-runtime-targets-covered` and exit code 0.
    Evidence: .sisyphus/evidence/task-7-runtime-target-coverage.txt
  ```

  **Commit**: YES | Message: `data(textbook): promote pep textbook runtime content` | Files: [`src/data/achievementsData.json`, `src/data/quizData.json`, `src/data/learningPath.json`, `src/data/reactions.json`, `src/data/contentMeta.js`, `src/data/textbookIngestion/reviewed/*/promotion-manifest.json`]



- [ ] 8. Normalize 学习 page textbook tab labels and ordering for `pep-*` groups

  **What to do**: Update `src/modules/progress.js` so `formatTextbookTabLabel()` returns clean Chinese labels for the four new `pep-*` IDs and does not include “人教版”, “化学”, or year strings. Add known-label mappings: `pep-chemistry-g10-required-1` → `高一/10年级·必修第一册`; `pep-chemistry-g10-required-2` → `高一/10年级·必修第二册`; `pep-chemistry-g11-selective-1` → `高二/11年级·选择性必修一·反应原理`; `pep-chemistry-g11-selective-2` → `高二/11年级·选择性必修二·物质结构与性质`. Preserve existing four `rj-*` labels. If group order is insertion-order from `achievementsData.json`, add deterministic sorting in `getTextbookGroups()` using this order: `rj-chemistry-grade8-54-2024-full`, `rj-chemistry-grade9-2024-vol1`, `rj-chemistry-grade9-2024-vol2`, `pep-chemistry-g10-required-1`, `pep-chemistry-g10-required-2`, `pep-chemistry-g11-selective-1`, `pep-chemistry-g11-selective-2`, `rj-chemistry-g12-selective-3-organic-2019`.
  **Must NOT do**: Do not reintroduce the removed learning dashboard/stage UI. Do not display source IDs as labels. Do not change card interaction semantics.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: focused label/order logic in one module.
  - Skills: [] - No visual redesign; only deterministic labels/order.
  - Omitted: [`frontend-design`] - The visual layout already exists; no new design needed.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: [10,11] | Blocked By: [7]

  **References**:
  - Current label function: `src/modules/progress.js:307-345` - `formatTextbookTabLabel()` and `getKnownTextbookLabel()`.
  - Current grouping: `src/modules/progress.js:561-580` - `getTextbookGroups()` builds groups.
  - Current rendering: `src/modules/progress.js:582-602` - `renderTextbookTabs()` renders button labels/counts.
  - User rule: labels must not include “人教版”, “化学”, or years for tabs.

  **Acceptance Criteria**:
  - [ ] `node -e "const fs=require('fs');const text=fs.readFileSync('src/modules/progress.js','utf8');for(const s of ['pep-chemistry-g10-required-1','高一/10年级·必修第一册','pep-chemistry-g10-required-2','高一/10年级·必修第二册','pep-chemistry-g11-selective-1','选择性必修一','pep-chemistry-g11-selective-2','选择性必修二']){if(!text.includes(s))throw new Error('missing '+s)}console.log('progress-label-source-ok')"` prints `progress-label-source-ok`.
  - [ ] Browser QA in Task 10 confirms visible labels do not contain raw `pep-*` IDs, “人教版”, or years.

  **QA Scenarios**:
  ```
  Scenario: Label source contains explicit mappings for all pep IDs
    Tool: Bash
    Steps: Run the `progress-label-source-ok` Node command from Acceptance Criteria.
    Expected: `progress-label-source-ok`.
    Evidence: .sisyphus/evidence/task-8-label-source.txt

  Scenario: Existing rj mappings remain present
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs');const text=fs.readFileSync('src/modules/progress.js','utf8');for(const id of ['rj-chemistry-g12-selective-3-organic-2019','rj-chemistry-grade8-54-2024-full','rj-chemistry-grade9-2024-vol1','rj-chemistry-grade9-2024-vol2']){if(!text.includes(id))throw new Error('missing '+id)}console.log('rj-labels-preserved')"`.
    Expected: `rj-labels-preserved`.
    Evidence: .sisyphus/evidence/task-8-rj-labels-preserved.txt
  ```

  **Commit**: NO | Message: `fix(progress): display pep textbook learning groups` | Files: [`src/modules/progress.js`]

- [ ] 9. Add runtime data assertions for all eight learning groups

  **What to do**: Use an executable Node assertion to prove `src/data/achievementsData.json` contains reviewed manual learning achievements for exactly the expected eight source groups after promotion. The assertion must fail if any of the four new `pep-*` groups have zero cards or if any existing `rj-*` group disappears.
  **Must NOT do**: Do not weaken the assertion to “at least four groups”. Do not count non-learning achievements.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: data validation across generated runtime dataset.
  - Skills: [] - No specialized skill needed.
  - Omitted: [`frontend-design`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: [11] | Blocked By: [7]

  **References**:
  - Runtime source: `src/data/achievementsData.json` - contains `achievementsData` array.
  - Filter: `src/modules/progress.js:43-52` - learning page only reads `manualReviewAfterPromotion` + `reviewed` achievements.
  - Segment ID logic: `src/modules/progress.js:62-70` - requires exactly one string curriculum tag.

  **Acceptance Criteria**:
  - [ ] `node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync('src/data/achievementsData.json','utf8')).achievementsData;const expected=['rj-chemistry-grade8-54-2024-full','rj-chemistry-grade9-2024-vol1','rj-chemistry-grade9-2024-vol2','pep-chemistry-g10-required-1','pep-chemistry-g10-required-2','pep-chemistry-g11-selective-1','pep-chemistry-g11-selective-2','rj-chemistry-g12-selective-3-organic-2019'];const counts=new Map();for(const a of data){if(a&&a.condition&&a.condition.type==='manualReviewAfterPromotion'&&a.sourceReviewStatus==='reviewed'&&Array.isArray(a.curriculumTags)&&a.curriculumTags.length===1){counts.set(a.sourceVolumeId,(counts.get(a.sourceVolumeId)||0)+1)}}for(const id of expected){if((counts.get(id)||0)<=0)throw new Error('missing learning cards for '+id)}const unexpected=[...counts.keys()].filter(id=>!expected.includes(id));if(unexpected.length)throw new Error('unexpected learning groups '+unexpected.join(','));console.log(JSON.stringify(Object.fromEntries(expected.map(id=>[id,counts.get(id)])),null,2))"` exits 0 and prints non-zero counts for all eight IDs.

  **QA Scenarios**:
  ```
  Scenario: Eight expected learning groups exist
    Tool: Bash
    Steps: Run the Node assertion from Acceptance Criteria.
    Expected: JSON object with eight keys and all values > 0.
    Evidence: .sisyphus/evidence/task-9-eight-learning-groups.json

  Scenario: Learning filter excludes non-reviewed/non-manual records
    Tool: Bash
    Steps: Run `node -e "const fs=require('fs');const data=JSON.parse(fs.readFileSync('src/data/achievementsData.json','utf8')).achievementsData;const bad=data.filter(a=>['pep-chemistry-g10-required-1','pep-chemistry-g10-required-2','pep-chemistry-g11-selective-1','pep-chemistry-g11-selective-2'].includes(a.sourceVolumeId)&&(!a.condition||a.condition.type!=='manualReviewAfterPromotion'||a.sourceReviewStatus!=='reviewed'));console.log('non-learning-pep-records='+bad.length)"`.
    Expected: Command exits 0; output is recorded for review. Non-learning promoted records may exist, but Task 9's main assertion proves learning records exist.
    Evidence: .sisyphus/evidence/task-9-non-learning-pep-records.txt
  ```

  **Commit**: NO | Message: `fix(progress): display pep textbook learning groups` | Files: [`src/data/achievementsData.json`]

- [ ] 10. Verify the 学习 page renders eight tabs and non-empty cards

  **What to do**: Use Playwright against the app. Start the Vite preview/dev server using existing project commands or Playwright global setup. Navigate to the app, open the 学习 page/route, assert exactly eight textbook tab buttons render, click each of the four new `pep-*` tabs by visible Chinese text, and assert at least one `[data-testid="learning-card"]` is visible after each click. Also assert visible tab labels do not contain raw `pep-*` IDs, “人教版”, `2019`, or `2024`.
  **Must NOT do**: Do not rely on manual screenshots alone. Do not skip console error checks. Do not mutate localStorage except through normal UI flows.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: browser-rendered UI verification.
  - Skills: [`playwright`] - Required for browser QA.
  - Omitted: [`frontend-design`] - No redesign; QA and minor selector fixes only.

  **Parallelization**: Can Parallel: NO | Wave 4B | Blocks: [11] | Blocked By: [8,9]

  **References**:
  - DOM container: `index.html` contains `#progress` and `.progress-textbook-tabs`.
  - Tab rendering: `src/modules/progress.js:582-602` - tab buttons have `data-textbook-tab`.
  - Card rendering: `src/modules/progress.js:889-917` - cards have `data-testid="learning-card"`.
  - Existing Playwright setup: `tests/setup/global-setup.ts` spawns preview server on `127.0.0.1:4173`.

  **Acceptance Criteria**:
  - [ ] `Test-Path -LiteralPath "tests"` returns `True`, then create `tests/content/pep-learning-tabs.spec.js`.
  - [ ] `npx playwright test tests/content/pep-learning-tabs.spec.js --project=chromium` exits 0 and writes `.sisyphus/evidence/task-10-learning-tabs.json` from the test body.
  - [ ] Playwright QA confirms `document.querySelectorAll('#progress .progress-textbook-tabs [data-textbook-tab]').length === 8`.
  - [ ] Playwright QA confirms each new label is visible and clicking it shows `document.querySelectorAll('#progress [data-testid="learning-card"]').length > 0`.
  - [ ] Playwright QA confirms `document.querySelector('#progress .progress-textbook-tabs').innerText` does not include `pep-chemistry`, `人教版`, `2019`, or `2024`.
  - [ ] Console has no uncaught runtime errors from `progress.js`.

  **QA Scenarios**:
  ```
  Scenario: Happy path — all eight tabs render and new tabs show cards
    Tool: Playwright
    Steps: Open the app at the preview/dev URL; navigate to 学习; run DOM assertions for 8 tabs; click `高一/10年级·必修第一册`, `高一/10年级·必修第二册`, `高二/11年级·选择性必修一·反应原理`, `高二/11年级·选择性必修二·物质结构与性质`; after each click count visible learning cards.
    Expected: 8 tabs; each clicked new tab has at least 1 visible learning card; no console errors.
    Evidence: .sisyphus/evidence/task-10-learning-tabs.png and .sisyphus/evidence/task-10-learning-tabs.json

  Scenario: Failure/edge — raw IDs and banned label terms do not leak
    Tool: Playwright
    Steps: Read `#progress .progress-textbook-tabs` innerText after all tabs render.
    Expected: Text does not contain `pep-chemistry`, `人教版`, `2019`, or `2024`.
    Evidence: .sisyphus/evidence/task-10-label-sanitization.json
  ```

  **Commit**: YES | Message: `fix(progress): display pep textbook learning groups` | Files: [`src/modules/progress.js`]

- [ ] 11. Run full validation, promotion idempotency checks, and final data integrity checks

  **What to do**: Run the final validation suite and capture evidence. Verify textbook assets, reviewed manifests, dry-run promotion, full safe validation, and git diff scope. Re-run the runtime data assertion from Task 9 after all validation. If `npm run validate:all:safe` fails due to newly promoted candidate cross-references, fix the underlying data generation or promotion issue; do not suppress validators.
  **Must NOT do**: Do not claim completion if any validator fails. Do not delete generated artifacts to make validators pass unless the generated artifact is proven invalid and regenerated correctly.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-system validation and final integrity review.
  - Skills: [`verification-before-completion`] - Use evidence-before-assertions discipline.
  - Omitted: [`frontend-design`] - No UI design work.

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: [Final Verification Wave] | Blocked By: [7,8,9,10]

  **References**:
  - Repo commands: `AGENTS.md` lists `npm run validate:all:safe`, `node scripts/validate-textbook-assets.mjs`, and Playwright test guidance.
  - Validator: `scripts/textbook/validate-promotion-manifest.mjs`.
  - Promotion dry-run: `scripts/textbook/promote-topic.mjs`.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/validate-promotion-manifest.mjs --all-reviewed` exits 0.
  - [ ] `node scripts/textbook/promote-topic.mjs --all-reviewed --dry-run --json` exits 0.
  - [ ] `node scripts/validate-textbook-assets.mjs` exits 0.
  - [ ] `npm run validate:all:safe` exits 0.
  - [ ] `git diff --stat -- ':!node_modules'` shows only expected pipeline scripts, textbook ingestion artifacts, promoted runtime data, and `src/modules/progress.js`.
  - [ ] The Task 9 eight-group assertion still exits 0.

  **QA Scenarios**:
  ```
  Scenario: Full validation passes
    Tool: Bash
    Steps: Run `npm run validate:all:safe`.
    Expected: Exit code 0; output includes successful validators and production build.
    Evidence: .sisyphus/evidence/task-11-validate-all-safe.txt

  Scenario: Diff scope remains bounded
    Tool: Bash
    Steps: Run `git diff --stat -- ':!node_modules'` and inspect changed paths.
    Expected: No unrelated edits to learner-state logic, elements data, unrelated lab records, or unrelated UI modules.
    Evidence: .sisyphus/evidence/task-11-diff-scope.txt
  ```

  **Commit**: YES | Message: `test(textbook): verify pep learning card promotion` | Files: [validation evidence if repo convention allows, otherwise no commit]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright for 学习 page)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after Task 2 if registry/batch contracts pass dry-run help/validation checks.
- Commit after Tasks 3-6 as one generated-artifacts commit if all four volumes generate successfully.
- Commit after Task 7 as one promotion/runtime-data commit.
- Commit after Tasks 8-11 as one UI/verification commit.
- Commit messages:
  - `feat(textbook): register missing pep ingestion batches`
  - `data(textbook): generate reviewed candidates for pep volumes`
  - `data(textbook): promote pep textbook runtime content`
  - `fix(progress): display pep textbook learning groups`

## Success Criteria
- All eight textbook groups render in 学习 page.
- Four new `pep-*` groups contain learning cards sourced from promoted achievements.
- Existing four `rj-*` groups still render and retain their cards.
- No new tab label contains raw IDs, “人教版”, “化学”, or year strings.
- All validators and build pass via `npm run validate:all:safe`.
