# Learning Card Modal Textbook Content

## TL;DR
> **Summary**: Refactor the learning-card modal so its body shows only learner-facing textbook source and formatted textbook content from the same extracted segment that generated the card. Add a runtime-safe extracted-content data module, formula-aware rendering, and automated validation/tests.
> **Deliverables**:
> - New runtime data module for reviewed learning segment textbook blocks.
> - `src/modules/progress.js` modal body reduced to `章节来源` and `教材内容`.
> - Formula-safe prose rendering via existing KaTeX helper.
> - Updated Playwright tests and supporting-data validation.
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 5 → Final Verification

## Context
### Original Request
- 修改学习模块中，学习卡片点击后弹窗的内容。
- 章节来源，改为显示教材名称+页码范围。
- “本节要学什么”取消。
- 教材内容，要提取该卡片页码范围的教材文档，并以格式化的形式展示，这是主要内容，注意段落和公式渲染。
- 关键知识点，取消。
- 相关资料，取消。
- 学习确认，取消。

### Interview Summary
- User clarified that a learning card with a range exists because it was generated from extracted textbook content; the plan must not treat the range as arbitrary metadata.
- Approved direction: use the card generation extraction segment as the sole source of modal body content; keep only source + formatted textbook content.
- Preserve the existing modal footer confirmation behavior. The user asked to remove the body section titled `学习确认`, not the `确定已学习` action button/state.

### Research Findings
- `src/modules/progress.js:108-138` builds manual learning segments through `getManualLearningSegments`.
- `src/modules/progress.js:183-194` currently returns six modal body sections from `buildLearningSegmentDetailSections`.
- `src/modules/progress.js:234-255` currently renders source metadata including internal IDs, hash, notes, and line numbers.
- `src/modules/progress.js:273-284` currently renders asset-adjacent metadata, not textbook body text.
- `src/modules/progress.js:1002-1078` renders the modal and block HTML; paragraph blocks currently use `escapeHtml(text)` only.
- `src/modules/chemNotation.js:273-299` exports `mixedProseFormulaHTML`, which safely escapes prose and renders embedded formula delimiters through KaTeX.
- `src/data/index.js:1-40` is the required data boundary for runtime content imports.
- `src/data/textbookAssets.js:17-91` maps volume IDs to display names/source paths. Note alias mismatch: runtime achievements use `rj-chemistry-g12-selective-3-organic-2019`, while manifest volume ID is `pep-chemistry-g12-selective-3` for the same `sourcePath`.
- `src/data/textbooks/2019版人教版高中化学必修第1册/book.md:63-74` contains deterministic content for `knowledge-topic-0004-source-section-l63-l74-105f9964c8`, including “世界是由物质构成的”.
- `src/data/textbooks/2019版人教版高中化学-选择性必修3 有机化学基础/book.md:8-12` contains deterministic formula prose including `$\mathrm{C}_{60}$`.
- `tests/ui/learning-content-modal.spec.ts:224-253` currently asserts all six old section names and must be updated.
- Existing validation commands: `node scripts/validate-supporting-data.mjs`, `node scripts/validate-textbook-assets.mjs`, `npm run validate:all:safe`, `npm run build`.

### Metis Review (gaps addressed)
- Exact two-section body contract is mandatory: `章节来源`, `教材内容`.
- Runtime must not read raw Markdown from filesystem in the browser; use generated/bundled JS data exported through `src/data/index.js`.
- If real page metadata is unavailable, display range as line range `L{lineRange}` instead of inventing page numbers.
- Preserve footer confirmation behavior.
- Do not implement a full Markdown engine or raw HTML renderer.
- Add validator coverage so promoted reviewed learning segments with source ranges resolve to non-empty extracted content.

## Work Objectives
### Core Objective
Make the learning-card modal display only the textbook source and the extracted textbook body content for that card, rendered safely with paragraph/list/heading formatting and formula support.

### Deliverables
- `src/data/learningSegmentTextbookContent.js`: reviewed, runtime-safe content records keyed by source identity.
- `src/data/index.js`: export `learningSegmentTextbookContent`.
- `src/modules/progress.js`: resolve content records, reduce sections, format source text, and render formula-aware content blocks.
- `scripts/validate-supporting-data.mjs`: validate every reviewed manual learning achievement source resolves to exactly one non-empty content record.
- `tests/ui/learning-content-modal.spec.ts`: update modal assertions for new content contract, formula rendering, XSS safety, and preserved completion behavior.
- Optional small CSS adjustment only if existing `.lesson-modal-section` styles make formatted content unreadable.

### Definition of Done (verifiable conditions with commands)
- `npx playwright test tests/ui/learning-content-modal.spec.ts` exits `0`.
- `npx playwright test tests/content/pep-learning-tabs.spec.ts` exits `0`.
- `node scripts/validate-supporting-data.mjs` exits `0` and validates learning segment content linkage.
- `node scripts/validate-textbook-assets.mjs` exits `0`.
- `npm run build` exits `0`.
- `npm run validate:all:safe` exits `0`.

### Must Have
- Modal body section headings must equal exactly `['章节来源', '教材内容']`.
- `章节来源` must show learner-facing textbook name and range.
- If real page fields are absent, range label must be `范围：L{lineRange}`. Do not label line ranges as pages.
- `教材内容` must come from `learningSegmentTextbookContent`, matched by source identity.
- Use match order in code: `sourceVolumeId + candidateId`, then `sourceVolumeId + sourceSectionId`, then `sourceVolumeId + lineRange` only if unique. `segmentId` may be indexed for diagnostics/tests but must not be the first runtime resolution key.
- Formula prose blocks must render with `mixedProseFormulaHTML`.
- Non-formula text must remain escaped; arbitrary raw HTML from content records must not execute.
- Footer behavior remains unchanged: incomplete shows `确定已学习`, completed shows `已学习：...`.

### Must NOT Have
- No learner-facing internal IDs, raw source paths, source hashes, reviewer names, review notes, or candidate IDs.
- No body sections titled `本节要学什么`, `关键知识点`, `相关资料`, or `学习确认`.
- No use of `achievement.description`, `achievement.title`, `achievement.keyPoints`, `reviewedAsset.diagramSummary`, `extractedFormulaText`, or `sourceNotes` as substitute textbook body content.
- No runtime direct import of `book.md` or textbook images into business modules.
- No full Markdown engine, no raw HTML rendering, no image rendering, no table rendering in this change.
- No unrelated regeneration of quizzes, reactions, lab experiments, achievements, learning path, or textbook ingestion outputs.
- Do not rename existing test IDs: `[data-testid="learning-card"]`, `[data-testid="lesson-modal"]`, `[data-testid="lesson-modal-body"]`, `[data-testid="confirm-learning"]`, `[data-testid="lesson-modal-close"]`.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: TDD + Playwright for UI behavior; validator-first for data linkage.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: Task 1 (runtime content data + export). This creates the shared generated module/schema needed by all later work.

Wave 2: Task 2 (modal data resolution/rendering) and Task 3 (supporting-data validator linkage) can proceed in parallel after Task 1.

Wave 3: Task 4 (Playwright modal contract tests) depends on Task 2 and generated content from Task 1. Task 5 (final integration cleanup and validation) follows after Tasks 1-4.

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1. Runtime extracted content map | None | 2, 3, 4, 5 |
| 2. Modal section/data/render refactor | 1 | 4, 5 |
| 3. Supporting-data validator linkage | 1 | 5 |
| 4. Playwright modal contract tests | 1, 2 | 5 |
| 5. Integration verification and cleanup | 1, 2, 3, 4 | Final Verification |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 1 task → `quick` for Task 1.
- Wave 2 → 2 tasks → `quick` for Task 2, `quick` for Task 3.
- Wave 3 → 2 tasks → `quick` for Task 4, `unspecified-low` for Task 5.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Generate and export runtime learning-segment textbook content

  **What to do**: Create a narrow generator that slices reviewed manual learning source ranges from existing textbook `book.md` files and writes a runtime-safe JS data module. This is a build-time/source-data task only; browser runtime must consume the generated module through `src/data/index.js`.

  **Files**:
  - Create: `scripts/textbook/generate-learning-segment-content.mjs`
  - Create: `src/data/learningSegmentTextbookContent.js`
  - Modify: `src/data/index.js`
  - Read/reference: `src/data/achievementsData.json`, `src/data/textbookAssets.js`, `src/data/textbooks/*/book.md`

  **Implementation decisions**:
  - Generator input: `achievementsData` records where `condition.type === 'manualReviewAfterPromotion'`, `sourceReviewStatus === 'reviewed'`, `category === 'learning'`, and `sourceReferences[0].lineRange` exists.
  - Source identity fields in each output record:
    - `segmentId`: first and only `achievement.curriculumTags[0]`.
    - `achievementId`: `achievement.id`.
    - `sourceVolumeId`: `achievement.sourceVolumeId || reference.sourceVolumeId || reference.volumeId`.
    - `manifestVolumeId`: matching `textbookAssetManifest.volumes[].volumeId` by exact `sourceVolumeId`; if not found, match by `reference.sourcePath`; this handles `rj-chemistry-g12-selective-3-organic-2019` vs `pep-chemistry-g12-selective-3`.
    - `candidateId`: `reference.candidateId || ''`.
    - `sourceSectionId`: if `candidateId` starts with `achievement-`, remove that prefix; otherwise `''`.
    - `sourcePath`, `sourceHeading`, `lineRange` from `reference`.
    - `rangeLabel`: `第 {pageStart}–{pageEnd} 页` only if future fields `pageStart` and `pageEnd` both exist; otherwise `L{lineRange}`.
    - `textbookName`: `volume.displayName || volume.sourceVolume || sourceVolumeId`.
    - `blocks`: generated content blocks.
  - Generator must parse `lineRange` as `start-end`, 1-indexed inclusive, and slice lines from `sourcePath` exactly.
  - Generator must strip YAML frontmatter only when sliced lines include frontmatter fences; do not remove normal `---` lines outside frontmatter.
  - Markdown-to-block conversion must be intentionally small:
    - Blank lines separate paragraphs.
    - Lines starting with `#`, `##`, `###`, `####` become `{ type: 'heading', level: 1|2|3|4, text }`.
    - Consecutive unordered list lines starting with `- `, `* `, or `+ ` become `{ type: 'list', style: 'unordered', items }`.
    - Consecutive ordered list lines matching `/^\d+[.)]\s+/` become `{ type: 'list', style: 'ordered', items }`.
    - Markdown image lines like `![](images/x.jpg)` are omitted.
    - Markdown tables (lines containing `|` plus separator rows) are flattened into paragraph text by removing leading/trailing pipes and joining cells with `；`; do not implement table HTML.
    - Raw HTML lines are kept as plain text; rendering will escape them later.
    - No empty block may be emitted.
  - Output module shape:
    ```js
    // Generated by scripts/textbook/generate-learning-segment-content.mjs. Do not edit by hand.
    export const learningSegmentTextbookContent = [
      {
        segmentId: 'knowledge-topic-0004-source-section-l63-l74-105f9964c8',
        achievementId: 'textbook-pep-chemistry-g10-required-1-knowledge-topic-0004-source-section-l63-l74-105f9964c8-promote-knowledge-topic-0004-source-section-l63-l74-105f9964c8-achievement-achievement-0004-source-section-l63-l74-105f9964c8',
        sourceVolumeId: 'pep-chemistry-g10-required-1',
        manifestVolumeId: 'pep-chemistry-g10-required-1',
        candidateId: 'achievement-0004-source-section-l63-l74-105f9964c8',
        sourceSectionId: '0004-source-section-l63-l74-105f9964c8',
        sourcePath: 'src/data/textbooks/2019版人教版高中化学必修第1册/book.md',
        sourceHeading: '物质及其变化',
        lineRange: '63-74',
        rangeLabel: 'L63-74',
        textbookName: '2019版人教版高中化学必修第1册',
        blocks: [
          { type: 'heading', level: 1, text: '物质及其变化' },
          { type: 'list', style: 'unordered', items: ['物质的分类及转化', '离子反应', '氧化还原反应'] },
          { type: 'paragraph', text: '世界是由物质构成的，目前人类发现和合成的物质已超过1亿种。对于这么多的物质和更为丰富的化学变化，人们是怎样认识和研究的呢？' },
          { type: 'paragraph', text: '分类是认识和研究物质及其变化的一种常用的科学方法。通过分类，可以将纷繁复杂的物质分成不同的类别，还可以从离子、电子等微观视角揭示化学反应的规律。依据物质类别和元素价态，可以解释和预测物质的性质，设计物质间的转化途径。' }
        ]
      }
    ];

    export default learningSegmentTextbookContent;
    ```
  - Update `src/data/index.js` to import and export the generated data:
    ```js
    import learningSegmentTextbookContentData from './learningSegmentTextbookContent.js';
    export const learningSegmentTextbookContent = learningSegmentTextbookContentData;
    ```
    If the module exports a named value only, use `import { learningSegmentTextbookContent as learningSegmentTextbookContentData } from './learningSegmentTextbookContent.js';` and then export the constant.
  - Run the generator once and commit the generated `src/data/learningSegmentTextbookContent.js`.

  **Must NOT do**:
  - Do not import `book.md` in `src/modules/progress.js` or any browser business module.
  - Do not include images, image paths, source hashes, reviewer names, raw internal paths in learner-facing output.
  - Do not manually write content records by hand except if the generator itself is being bootstrapped in the same task.

  **Recommended Agent Profile**:
  - Category: `quick` - bounded data-generator and export work.
  - Skills: [`test-driven-development`] - write generator/validator expectations before relying on output.
  - Omitted: [`frontend-design`] - no UI design decisions in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [2, 3, 4, 5] | Blocked By: []

  **References**:
  - Pattern: `src/data/index.js:1-40` - runtime data boundary; all business modules must consume through this file.
  - Pattern: `src/data/textbooks/README.md` - runtime modules must not directly import raw Markdown or images.
  - Data: `src/data/achievementsData.json:349-378` - deterministic `knowledge-topic-0004-source-section-l63-l74-105f9964c8` record with source range `63-74`.
  - Source: `src/data/textbooks/2019版人教版高中化学必修第1册/book.md:63-74` - expected generated blocks and unique phrase “世界是由物质构成的”.
  - Source: `src/data/textbooks/2019版人教版高中化学-选择性必修3 有机化学基础/book.md:8-12` - formula prose source containing `$\mathrm{C}_{60}$`.
  - Volume metadata: `src/data/textbookAssets.js:47-55` and `src/data/textbookAssets.js:83-90` - display names and source path alias handling.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/generate-learning-segment-content.mjs` exits `0`.
  - [ ] `src/data/learningSegmentTextbookContent.js` exists and exports a non-empty array.
  - [ ] The generated record for `knowledge-topic-0004-source-section-l63-l74-105f9964c8` contains `textbookName: '2019版人教版高中化学必修第1册'`, `rangeLabel: 'L63-74'`, and a paragraph containing `世界是由物质构成的`.
  - [ ] At least one generated record contains formula markup `$\mathrm{C}_{60}$` or `\mathrm{C}_{60}` in a block text, sourced from the selective compulsory 3 book.
  - [ ] `node -e "import('./src/data/index.js').then(m => { if (!Array.isArray(m.learningSegmentTextbookContent) || !m.learningSegmentTextbookContent.length) process.exit(1); })"` exits `0`.

  **QA Scenarios**:
  ```
  Scenario: Generate deterministic content record
    Tool: Bash
    Steps: Run `node scripts/textbook/generate-learning-segment-content.mjs`, then run `node -e "import('./src/data/index.js').then(m => { const r = m.learningSegmentTextbookContent.find(x => x.segmentId === 'knowledge-topic-0004-source-section-l63-l74-105f9964c8'); if (!r) throw new Error('missing record'); if (r.textbookName !== '2019版人教版高中化学必修第1册') throw new Error('wrong textbookName'); if (r.rangeLabel !== 'L63-74') throw new Error('wrong rangeLabel'); if (!JSON.stringify(r.blocks).includes('世界是由物质构成的')) throw new Error('missing extracted phrase'); })"`.
    Expected: Both commands exit 0.
    Evidence: .sisyphus/evidence/task-1-runtime-content.json

  Scenario: Generated data omits image-only runtime blocks
    Tool: Bash
    Steps: Run `node -e "import('./src/data/index.js').then(m => { const bad = m.learningSegmentTextbookContent.flatMap(r => r.blocks).filter(b => JSON.stringify(b).includes('![](') || JSON.stringify(b).includes('images/')); if (bad.length) throw new Error('image markdown leaked'); })"`.
    Expected: Command exits 0; no image markdown or image path appears inside generated block content.
    Evidence: .sisyphus/evidence/task-1-no-image-leak.json
  ```

  **Commit**: YES | Message: `feat(data): generate learning segment textbook content` | Files: [`scripts/textbook/generate-learning-segment-content.mjs`, `src/data/learningSegmentTextbookContent.js`, `src/data/index.js`]

- [x] 2. Refactor progress modal to resolve and render extracted textbook content

  **What to do**: Update `src/modules/progress.js` so each manual learning segment resolves a content record from `learningSegmentTextbookContent`, builds exactly two body sections, displays learner-safe source text, and renders formula-aware content blocks.

  **Files**:
  - Modify: `src/modules/progress.js`
  - Read/reference: `src/modules/chemNotation.js`, `src/data/index.js`

  **Implementation decisions**:
  - Add imports in `src/modules/progress.js`:
    ```js
    import { mixedProseFormulaHTML } from './chemNotation.js';
    ```
    and add `learningSegmentTextbookContent` to the destructured import from `../data/index.js`.
  - Build indexes once near existing constants:
    - `LEARNING_CONTENT_BY_SEGMENT_ID`
    - `LEARNING_CONTENT_BY_VOLUME_AND_CANDIDATE`
    - `LEARNING_CONTENT_BY_VOLUME_AND_SECTION`
    - `LEARNING_CONTENT_BY_VOLUME_AND_LINE_RANGE`, but store arrays so ambiguous line-range matches are not used.
  - Add resolver:
    ```js
    function findLearningSegmentTextbookContent(achievement, reference, segmentId) {
      const sourceVolumeId = normalizeText(achievement?.sourceVolumeId || reference?.sourceVolumeId || reference?.volumeId);
      const candidateId = normalizeText(reference?.candidateId);
      const sourceSectionId = candidateId.startsWith('achievement-') ? candidateId.slice('achievement-'.length) : '';
      const lineRange = normalizeText(reference?.lineRange);
      return (sourceVolumeId && candidateId ? LEARNING_CONTENT_BY_VOLUME_AND_CANDIDATE.get(`${sourceVolumeId}::${candidateId}`) : null)
        || (sourceVolumeId && sourceSectionId ? LEARNING_CONTENT_BY_VOLUME_AND_SECTION.get(`${sourceVolumeId}::${sourceSectionId}`) : null)
        || findUniqueLineRangeContent(sourceVolumeId, lineRange)
        || null;
    }
    ```
    Ensure actual code uses helpers already present (`normalizeText`) and does not throw on missing optional fields.
  - In `getManualLearningSegments`, compute `textbookContent = findLearningSegmentTextbookContent(achievement, reference, segmentId)` and pass it to `buildLearningSegmentDetailSections(achievement, reference, segmentId, textbookContent)`.
  - Change `buildLearningSegmentDetailSections` to return exactly:
    ```js
    return [
      buildDetailSection('source', '章节来源', buildSourceBlocks(achievement, reference, textbookContent)),
      buildDetailSection('content', '教材内容', buildTextbookContentBlocks(textbookContent))
    ];
    ```
  - Replace `buildSourceBlocks` behavior:
    - Display only one paragraph: `教材：{textbookName}；范围：{rangeLabel}`.
    - `textbookName` is `textbookContent.textbookName || volume.displayName || volume.sourceVolume || sourceVolumeId`.
    - `rangeLabel` is `textbookContent.rangeLabel || (reference.lineRange ? `L${reference.lineRange}` : '')`.
    - If `rangeLabel` is empty, render `教材：{textbookName}` only.
    - Do not include source heading unless needed as fallback when textbook name is unavailable; if used, label it `章节：{sourceHeading}` and never include internal IDs/path/hash.
  - Replace `buildTextbookContentBlocks` behavior:
    - Use `textbookContent.blocks` only.
    - Allowed block types: `heading`, `paragraph`, `list`.
    - If no content record or no blocks, return `[paragraphBlock('未找到该学习卡片对应的教材正文，请运行数据校验修复来源映射。')]`; validator should prevent this in normal reviewed data.
  - Extend `renderLessonModalBlock` minimally:
    - `paragraph`: render `<p>${mixedProseFormulaHTML(text)}</p>`.
    - `heading`: render `<h6 class="lesson-modal-content-heading">${mixedProseFormulaHTML(text)}</h6>` for all heading levels; do not create multiple h1/h2 inside modal.
    - `list`: render `<ul>` or `<ol>` based on `block.style === 'ordered'`; each item uses `mixedProseFormulaHTML(item)`.
    - Keep `source` and `asset` render branches only if used elsewhere, but modal sections from this task should not create those block types.
  - Do not change `renderLessonModal` footer logic at `src/modules/progress.js:1006-1021`.

  **Must NOT do**:
  - Do not render `achievement.description`, `achievement.title`, `achievement.keyPoints`, or `reviewedAsset` metadata in `教材内容`.
  - Do not add raw HTML parsing.
  - Do not remove the confirmation footer.

  **Recommended Agent Profile**:
  - Category: `quick` - focused module refactor.
  - Skills: [`test-driven-development`] - keep existing modal tests red/green.
  - Omitted: [`frontend-design`] - no visual redesign beyond content structure.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [4, 5] | Blocked By: [1]

  **References**:
  - Pattern: `src/modules/progress.js:108-138` - segment construction location.
  - Pattern: `src/modules/progress.js:183-194` - replace six-section array with two-section array.
  - Pattern: `src/modules/progress.js:234-255` - simplify source block.
  - Pattern: `src/modules/progress.js:273-284` - replace asset metadata content with extracted content blocks.
  - Pattern: `src/modules/progress.js:1046-1078` - extend renderer for formula-aware paragraph/list/heading.
  - API: `src/modules/chemNotation.js:273-299` - use `mixedProseFormulaHTML` for safe prose + formula rendering.

  **Acceptance Criteria**:
  - [ ] Opening `knowledge-topic-0004-source-section-l63-l74-105f9964c8` modal shows only `章节来源` and `教材内容` section headings.
  - [ ] Source section contains `教材：2019版人教版高中化学必修第1册；范围：L63-74`.
  - [ ] Source section does not contain `卷册 ID`, `来源哈希`, `reviewedBy`, `src/data/textbooks`, or raw source volume ID.
  - [ ] Textbook section contains `世界是由物质构成的`.
  - [ ] Textbook section does not contain `暂无已审核的结构化正文`, `待审成就：学习并复核`, `相邻标题`, `图示摘要`, or `来源记录`.
  - [ ] A formula-containing modal content path renders at least one `.katex` element when the selected generated content contains `$\mathrm{C}_{60}$` or equivalent delimiter.
  - [ ] Footer confirm button behavior is unchanged.

  **QA Scenarios**:
  ```
  Scenario: Modal renders simplified content contract
    Tool: Playwright
    Steps: Navigate to `/#/progress`; open `[data-testid="learning-card"][data-learning-segment-id="knowledge-topic-0004-source-section-l63-l74-105f9964c8"]`; inspect `[data-testid="lesson-modal-body"]`.
    Expected: Section headings equal `['章节来源', '教材内容']`; source text contains `教材：2019版人教版高中化学必修第1册；范围：L63-74`; content contains `世界是由物质构成的`; forbidden old labels and metadata are absent.
    Evidence: .sisyphus/evidence/task-2-modal-content.json

  Scenario: Missing mapping fallback is deterministic and learner-safe
    Tool: Playwright or unit-style browser evaluation through test hook
    Steps: Temporarily exercise `buildLearningSegmentDetailSections` via `__progressTestHooks` with a reviewed-looking segment and `null` content record.
    Expected: Content block text is exactly `未找到该学习卡片对应的教材正文，请运行数据校验修复来源映射。`; no internal IDs/paths/hashes are emitted.
    Evidence: .sisyphus/evidence/task-2-missing-content-fallback.json
  ```

  **Commit**: YES | Message: `feat(progress): show extracted textbook content in lesson modal` | Files: [`src/modules/progress.js`]

- [x] 3. Add validator coverage for learning segment content linkage

  **What to do**: Extend supporting-data validation so reviewed manual learning achievements cannot reach runtime without a matching non-empty extracted textbook content record.

  **Files**:
  - Modify: `scripts/validate-supporting-data.mjs`
  - Read/reference: `src/data/index.js`, `src/data/learningSegmentTextbookContent.js`, `src/data/achievementsData.json`

  **Implementation decisions**:
  - Import `learningSegmentTextbookContent` from `../src/data/index.js`.
  - Build maps in validator using the same identity rules as runtime:
    - `sourceVolumeId + candidateId`
    - `sourceVolumeId + sourceSectionId`
    - `sourceVolumeId + lineRange`, requiring uniqueness.
    - `segmentId` for diagnostics/duplicate detection only, not primary resolution.
  - Add function `validateLearningSegmentTextbookContentLinkage()` and call it after `safeAchievementsData` is initialized and before final error reporting.
  - Validate every `achievement` where:
    - `achievement.category === 'learning'`
    - `achievement.condition?.type === 'manualReviewAfterPromotion'`
    - `achievement.sourceReviewStatus === 'reviewed'`
    - `achievement.sourceReferences?.[0]?.lineRange` is non-empty
  - Required checks per achievement:
    - `curriculumTags` contains exactly one non-empty `segmentId`.
    - Exactly one content record resolves through match order.
    - `record.blocks` is a non-empty array.
    - Each block has allowed type `heading`, `paragraph`, or `list`.
    - `paragraph`/`heading` text is non-empty string.
    - `list.items` is a non-empty array of non-empty strings.
    - `record.sourceVolumeId` equals achievement source volume ID.
    - `record.candidateId` equals `reference.candidateId` when the reference candidate exists.
    - `record.lineRange` equals `reference.lineRange`.
    - `record.textbookName` and `record.rangeLabel` are non-empty strings.
  - Duplicate checks:
    - No duplicate `segmentId`.
    - No duplicate `sourceVolumeId + candidateId` when `candidateId` is present.
    - No duplicate `sourceVolumeId + sourceSectionId` when `sourceSectionId` is present.
    - `sourceVolumeId + lineRange` duplicates are allowed in the data array only if runtime does not need them for fallback; validator must report a warning-style error only when a promoted achievement lacks candidate/section and the fallback key is ambiguous.
  - Add deterministic self-check modes to the existing `selfCheckModes` mechanism; these are required, not optional:
    - `missing-learning-segment-textbook-content`: remove the record for `knowledge-topic-0004-source-section-l63-l74-105f9964c8` in memory before linkage validation; validation must fail and mention the missing segment ID.
    - `empty-learning-segment-textbook-content`: replace that record's `blocks` with `[]`; validation must fail and mention empty blocks.
    - `invalid-learning-segment-textbook-content-block`: replace the first block with `{ type: 'raw-html', text: '<img onerror="window.bad=true">' }`; validation must fail and mention unsupported block type.

  **Must NOT do**:
  - Do not relax existing supporting-data validations.
  - Do not mutate generated content or achievements from validator.
  - Do not validate images/tables here; those are out of scope.

  **Recommended Agent Profile**:
  - Category: `quick` - focused validator update.
  - Skills: [`test-driven-development`] - add failing validation condition first if self-check mode is practical.
  - Omitted: [`frontend-design`] - no UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [5] | Blocked By: [1]

  **References**:
  - Pattern: `scripts/validate-supporting-data.mjs:1-18` - imports from `src/data/index.js`.
  - Pattern: `scripts/validate-supporting-data.mjs:117-135` - achievement condition type setup.
  - Data boundary: `src/data/index.js:1-40` - import content through this file.
  - Runtime source contract: `src/data/textbooks/README.md` section “运行时教材来源审核合同”.

  **Acceptance Criteria**:
  - [ ] `node scripts/validate-supporting-data.mjs` exits `0`.
  - [ ] Validator fails if a reviewed manual learning achievement with a line range lacks matching content.
  - [ ] Validator fails if a matching content record has empty `blocks`.
  - [ ] Validator fails if a block has unsupported type or empty text/items.
  - [ ] Validator fails if `candidateId` or `lineRange` does not match the promoted achievement source reference.

  **QA Scenarios**:
  ```
  Scenario: Valid learning content linkage passes
    Tool: Bash
    Steps: Run `node scripts/validate-supporting-data.mjs`.
    Expected: Exit code 0; output reports supporting data validation success using the repository's existing success message style.
    Evidence: .sisyphus/evidence/task-3-validator-pass.txt

  Scenario: Missing content linkage is catchable
    Tool: Bash
    Steps: Run `node scripts/validate-supporting-data.mjs --self-check=missing-learning-segment-textbook-content`, `node scripts/validate-supporting-data.mjs --self-check=empty-learning-segment-textbook-content`, and `node scripts/validate-supporting-data.mjs --self-check=invalid-learning-segment-textbook-content-block`.
    Expected: Each self-check exits non-zero with an error mentioning the corrupted condition; no repository files are modified.
    Evidence: .sisyphus/evidence/task-3-validator-missing-link.txt
  ```

  **Commit**: YES | Message: `test(data): validate learning segment textbook content links` | Files: [`scripts/validate-supporting-data.mjs`]

- [x] 4. Update Playwright modal tests for the new learner-facing contract

  **What to do**: Update and extend `tests/ui/learning-content-modal.spec.ts` so automated UI tests assert the new two-section modal, source formatting, extracted content, formula rendering, XSS safety, long-content scroll, and unchanged confirmation behavior.

  **Files**:
  - Modify: `tests/ui/learning-content-modal.spec.ts`
  - Read/reference: `tests/content/pep-learning-tabs.spec.ts`

  **Implementation decisions**:
  - Keep existing constants for completion behavior where useful:
    - `MANUAL_SEGMENT_ID = 'knowledge-topic-0001-source-section-l1-l5-bd27b23b45'`
    - `MANUAL_ACHIEVEMENT_ID = ...`
  - Add deterministic content constants:
    ```ts
    const TEXTBOOK_CONTENT_SEGMENT_ID = 'knowledge-topic-0004-source-section-l63-l74-105f9964c8';
    const TEXTBOOK_CONTENT_SOURCE = '教材：2019版人教版高中化学必修第1册；范围：L63-74';
    const TEXTBOOK_CONTENT_PHRASE = '世界是由物质构成的';
    const FORMULA_SEGMENT_ID = 'knowledge-topic-0002-source-section-l6-l38-d782b15af6';
    ```
    If `FORMULA_SEGMENT_ID` is not visible in the default selected tab, find the visible card by text/segment ID after switching to the selective compulsory 3 tab. Do not weaken formula assertion; choose a deterministic visible card containing `$\mathrm{C}_{60}$` from generated data.
  - Replace old test `modal content has distinct sections without undefined or null` at `tests/ui/learning-content-modal.spec.ts:224-253` with assertions:
    - section headings array equals `['章节来源', '教材内容']`.
    - body does not contain `undefined` or `null`.
    - body contains `TEXTBOOK_CONTENT_SOURCE` and `TEXTBOOK_CONTENT_PHRASE`.
    - body does not contain `本节要学什么`, `关键知识点`, `相关资料`, body heading `学习确认`, `卷册 ID`, `来源哈希`, `reviewedBy`, `src/data/textbooks`, `暂无已审核的结构化正文`, `待审成就：学习并复核`.
  - Add helper `openLearningCard(page, segmentId)` that navigates to progress if needed, shows card using existing `showLearningCard`, clicks it, and returns modal locator. Reuse it across new tests.
  - Add formula test:
    - Open deterministic formula-containing segment.
    - Locate the `教材内容` section.
    - Assert `section.locator('.katex').count()` is greater than `0`.
    - Assert section text contains accessible `C` or `60` text as Playwright can observe from KaTeX output. Prefer `.toContainText('60')` if stable.
  - Extend XSS test to inspect textbook content rendering path:
    - Do not mutate production generated file.
    - Use existing unsafe metadata test for title/description and add a test-hook/unit-style assertion only if `__progressTestHooks` can render blocks. If that hook is not exposed to browser easily, add an assertion that source/content text containing `<` from real data appears escaped and no injected nodes exist.
    - Required safety checks remain: no injected title/description/timestamp nodes; handler flags false.
  - Keep existing completion tests unchanged except update any modal body text expectations that referred to removed sections.
  - Keep long modal scroll test; update it to use content-rich card if needed.

  **Must NOT do**:
  - Do not remove tests for close button, Escape close, confirm completion, persistence, completed reopen state, card-level no-button behavior.
  - Do not assert implementation internals such as imported map names in Playwright.

  **Recommended Agent Profile**:
  - Category: `quick` - focused E2E test update.
  - Skills: [`test-driven-development`] - tests should fail before Task 2 and pass after Task 2.
  - Omitted: [`frontend-design`] - no design changes.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [5] | Blocked By: [1, 2]

  **References**:
  - Test pattern: `tests/ui/learning-content-modal.spec.ts:1-90` - existing constants and open/confirm flow.
  - Old assertion to replace: `tests/ui/learning-content-modal.spec.ts:224-253`.
  - Regression pattern: `tests/content/pep-learning-tabs.spec.ts:32-248` - progress page/tab expectations.

  **Acceptance Criteria**:
  - [ ] `npx playwright test tests/ui/learning-content-modal.spec.ts` exits `0`.
  - [ ] Test suite asserts modal section headings equal exactly `['章节来源', '教材内容']`.
  - [ ] Test suite asserts source text includes textbook display name + `L63-74` range and excludes internal metadata.
  - [ ] Test suite asserts extracted textbook phrase `世界是由物质构成的` appears.
  - [ ] Test suite asserts formula content renders `.katex` for a deterministic formula segment.
  - [ ] Existing completion behavior tests still pass.
  - [ ] Existing XSS safety test still passes and is not weakened.

  **QA Scenarios**:
  ```
  Scenario: E2E modal contract passes
    Tool: Playwright
    Steps: Run `npx playwright test tests/ui/learning-content-modal.spec.ts`.
    Expected: Exit code 0; all modal interaction tests pass.
    Evidence: .sisyphus/evidence/task-4-learning-modal-tests.txt

  Scenario: Learning tabs regression passes
    Tool: Playwright
    Steps: Run `npx playwright test tests/content/pep-learning-tabs.spec.ts`.
    Expected: Exit code 0; eight textbook tabs render, learning cards remain visible, experiment-style cards excluded, no console/page errors.
    Evidence: .sisyphus/evidence/task-4-learning-tabs-regression.txt
  ```

  **Commit**: YES | Message: `test(progress): assert textbook-only lesson modal content` | Files: [`tests/ui/learning-content-modal.spec.ts`]

- [x] 5. Integration cleanup and full verification

  **What to do**: Run targeted searches and full verification commands, fix only issues directly caused by Tasks 1-4, and record evidence. This task does not add new features.

  **Files**:
  - Modify only if verification reveals direct regressions from Tasks 1-4.
  - Evidence output: `.sisyphus/evidence/task-5-*`.

  **Implementation decisions**:
  - Search implementation and tests for forbidden old learner-facing section labels in modal contexts. It is acceptable for the plan file to contain old labels; source/tests should not assert/display them in the modal body.
  - Run commands in this exact order:
    1. `node scripts/textbook/generate-learning-segment-content.mjs`
    2. `node scripts/validate-supporting-data.mjs`
    3. `node scripts/validate-textbook-assets.mjs`
    4. `npx playwright test tests/ui/learning-content-modal.spec.ts`
    5. `npx playwright test tests/content/pep-learning-tabs.spec.ts`
    6. `npm run build`
    7. `npm run validate:all:safe`
  - If the generator changes `src/data/learningSegmentTextbookContent.js` during this task, inspect the diff and commit only if it is expected deterministic output.
  - If any command fails, fix the root cause within the scoped files from Tasks 1-4 and rerun the failed command plus any later commands.

  **Must NOT do**:
  - Do not broaden scope into unrelated UI redesign, content rewriting, ingestion pipeline rewrite, or data cleanup.
  - Do not delete tests to make verification pass.
  - Do not skip `npm run validate:all:safe` before claiming completion.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` - verification and scoped cleanup.
  - Skills: [`verification-before-completion`] - evidence before success claims.
  - Omitted: [`frontend-design`] - no design changes.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [Final Verification] | Blocked By: [1, 2, 3, 4]

  **References**:
  - Commands: `package.json:6-34` - scripts and validation aggregate.
  - Project instructions: `AGENTS.md` - `npm run validate:all:safe` and Playwright expectations.

  **Acceptance Criteria**:
  - [ ] `node scripts/textbook/generate-learning-segment-content.mjs` exits `0` with deterministic output.
  - [ ] `node scripts/validate-supporting-data.mjs` exits `0`.
  - [ ] `node scripts/validate-textbook-assets.mjs` exits `0`.
  - [ ] `npx playwright test tests/ui/learning-content-modal.spec.ts` exits `0`.
  - [ ] `npx playwright test tests/content/pep-learning-tabs.spec.ts` exits `0`.
  - [ ] `npm run build` exits `0`.
  - [ ] `npm run validate:all:safe` exits `0`.
  - [ ] Source/test grep confirms removed body sections are not rendered/asserted in modal body.

  **QA Scenarios**:
  ```
  Scenario: Full validation suite passes
    Tool: Bash
    Steps: Run `npm run validate:all:safe` after targeted commands pass.
    Expected: Exit code 0; all validators and Vite build complete successfully.
    Evidence: .sisyphus/evidence/task-5-validate-all-safe.txt

  Scenario: Forbidden modal section labels absent from runtime modal code
    Tool: Grep + Bash
    Steps: Search `src/modules/progress.js` and `tests/ui/learning-content-modal.spec.ts` for modal-body uses of `本节要学什么|关键知识点|相关资料|学习确认|暂无已审核的结构化正文`.
    Expected: No source code path renders these as modal body sections; tests assert their absence rather than presence.
    Evidence: .sisyphus/evidence/task-5-forbidden-label-search.txt
  ```

  **Commit**: YES | Message: `chore(progress): verify learning modal textbook content` | Files: [only scoped files changed by verification fixes]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle

  **Agent Profile**: `oracle` read-only review.
  **Parallelization**: Can Parallel: YES | Final wave | Blocks: completion | Blocked By: [1, 2, 3, 4, 5]
  **Prompt**: Review the implementation diff against `.sisyphus/plans/learning-card-modal-textbook-content.md`. Verify every required scope item is implemented and every forbidden item is absent. Return APPROVE or REJECT with blocking issues.
  **References**:
  - Plan: `.sisyphus/plans/learning-card-modal-textbook-content.md`
  - Runtime UI: `src/modules/progress.js`
  - Runtime content: `src/data/learningSegmentTextbookContent.js`, `src/data/index.js`
  - Validation/tests: `scripts/validate-supporting-data.mjs`, `tests/ui/learning-content-modal.spec.ts`
  **Acceptance Criteria**:
  - [ ] Approves exact two-section modal body contract.
  - [ ] Approves generated content source and validator coverage.
  - [ ] Approves preserved footer confirmation behavior.
  **QA Scenario**:
  ```
  Scenario: Plan compliance review
    Tool: task oracle
    Steps: Provide plan path plus implementation diff summary.
    Expected: Oracle returns APPROVE; any REJECT triggers fixes and re-run.
    Evidence: .sisyphus/evidence/f1-plan-compliance.md
  ```

- [x] F2. Code Quality Review — unspecified-high

  **Agent Profile**: Category `unspecified-high`, read/write only if fixes are explicitly assigned after review.
  **Parallelization**: Can Parallel: YES | Final wave | Blocks: completion | Blocked By: [1, 2, 3, 4, 5]
  **Prompt**: Review changed files for maintainability, YAGNI, data-boundary compliance, escaping/XSS safety, and minimal scope. Return APPROVE or REJECT with concrete issues.
  **References**:
  - Generator: `scripts/textbook/generate-learning-segment-content.mjs`
  - Data boundary: `src/data/index.js`
  - Runtime renderer: `src/modules/progress.js`
  - Formula helper: `src/modules/chemNotation.js`
  - Validator: `scripts/validate-supporting-data.mjs`
  **Acceptance Criteria**:
  - [ ] Approves generator simplicity and deterministic output.
  - [ ] Approves `progress.js` changes are scoped and do not duplicate renderer logic unnecessarily.
  - [ ] Approves no raw HTML/Markdown runtime import risk.
  **QA Scenario**:
  ```
  Scenario: Code quality review
    Tool: task unspecified-high
    Steps: Review changed files and test/validator diffs.
    Expected: Reviewer returns APPROVE; any REJECT triggers fixes and re-run.
    Evidence: .sisyphus/evidence/f2-code-quality.md
  ```

- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)

  **Agent Profile**: Category `unspecified-high` with Playwright verification.
  **Parallelization**: Can Parallel: YES | Final wave | Blocks: completion | Blocked By: [1, 2, 3, 4, 5]
  **Prompt**: Execute real browser QA for the progress learning modal. Open a deterministic content card and formula card. Verify visible UI matches plan and save screenshots/evidence.
  **References**:
  - UI tests: `tests/ui/learning-content-modal.spec.ts`
  - Progress module: `src/modules/progress.js`
  - Deterministic content source: `src/data/textbooks/2019版人教版高中化学必修第1册/book.md:63-74`
  - Formula source: `src/data/textbooks/2019版人教版高中化学-选择性必修3 有机化学基础/book.md:8-12`
  - Commands: `npx playwright test tests/ui/learning-content-modal.spec.ts`, `npx playwright test tests/content/pep-learning-tabs.spec.ts`
  **Acceptance Criteria**:
  - [ ] Browser QA confirms source + textbook content only.
  - [ ] Browser QA confirms formula rendering visible for formula segment.
  - [ ] Browser QA confirms confirm button/completed state still works.
  **QA Scenario**:
  ```
  Scenario: Real browser modal QA
    Tool: Playwright
    Steps: Run app through Playwright, open specified learning cards, capture body text/headings and screenshots.
    Expected: UI matches new contract; no console/page errors.
    Evidence: .sisyphus/evidence/f3-real-qa.md
  ```

- [x] F4. Scope Fidelity Check — deep

  **Agent Profile**: Category `deep` read-only scope review.
  **Parallelization**: Can Parallel: YES | Final wave | Blocks: completion | Blocked By: [1, 2, 3, 4, 5]
  **Prompt**: Check the final implementation for scope fidelity against user request and project constraints. Identify any unnecessary changes, missing requested behavior, or hidden assumptions.
  **References**:
  - Original plan/request: `.sisyphus/plans/learning-card-modal-textbook-content.md`
  - Project constraints: `AGENTS.md`
  - Runtime UI: `src/modules/progress.js`
  - Generated runtime data: `src/data/learningSegmentTextbookContent.js`
  - Tests/validators: `tests/ui/learning-content-modal.spec.ts`, `scripts/validate-supporting-data.mjs`
  **Acceptance Criteria**:
  - [ ] Approves no unrelated redesign/data regeneration occurred.
  - [ ] Approves removed sections are absent and requested source/content remain.
  - [ ] Approves completion action preservation is consistent with the plan.
  **QA Scenario**:
  ```
  Scenario: Scope fidelity review
    Tool: task deep
    Steps: Compare original request, plan, and final diff.
    Expected: Reviewer returns APPROVE; any REJECT triggers fixes and re-run.
    Evidence: .sisyphus/evidence/f4-scope-fidelity.md
  ```

## Commit Strategy
- Commit after each implementation task if the task acceptance criteria pass.
- Suggested messages are listed per task.
- Do not commit `.sisyphus/evidence/*` unless project practice explicitly requires evidence artifacts to be tracked.

## Success Criteria
- The learner-facing modal is simpler and content-centered: source + extracted textbook content only.
- Data linkage failures are caught by validators, not hidden as generic learner-facing metadata.
- Existing learning completion behavior remains unchanged.
- Formula-containing textbook prose renders KaTeX in the modal without introducing XSS risk.
