
# Issues
- Fixed table rendering in learning-card modal: raw HTML table snippets are now parsed into `{type: 'table', rows}` blocks in `generate-learning-segment-content.mjs` and rendered as HTML tables in `progress.js`.
- NOTE: Previous entry was premature; confirmed code changes in `generate-learning-segment-content.mjs` and `progress.js` with subsequent data regeneration successfully included table blocks.
- Correction confirmed 2026-05-29: regenerated `src/data/learningSegmentTextbookContent.js` with structured table blocks; static grep for `<table` returned no matches, and the reported alkali-metal snippet is now a `"type": "table"` block around line 9647. Renderer now emits scoped `lesson-modal-table` markup with matching `<th>`/`</th>` and `<td>`/`</td>` cells.

- Fixed display math grouping in learning-card modal content generation on 2026-05-29: `parseMarkdownToBlocks` now buffers multi-line `$$...$$` and `\[...\]` blocks before blank-line handling, so generated paragraphs preserve complete display tokens around `\begin{array}` formulas for KaTeX rendering. Regenerated `src/data/learningSegmentTextbookContent.js` with the allowed generator command only; no tests/build/validators were run per direct manual-testing instruction.
- Fixed renderer-side display math fallback on 2026-05-29: `renderMixedMathToken` now preserves already-LaTeX token bodies instead of collapsing `\\` line breaks, so `\begin{array}` display blocks can reach KaTeX intact. Static inspection only; no tests/build/validators were run per manual-testing instruction.
