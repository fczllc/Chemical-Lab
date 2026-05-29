
## Task 3: Redesign textbook TAB buttons on 学习 page

### Changed files
- `src/modules/progress.js`
- `src/styles/layout.css`

### What changed in progress.js
- Added `renderTextbookTabLabel(label)` helper (lines 86-95) that splits a label by the `·` delimiter and returns multiple `<span class="textbook-tab-line">` elements. The second line gets `.is-emphasis` for larger/stronger styling. Labels without `·` render safely as a single line.
- Updated `renderManualLearningSection()` tab markup (lines 939-944): each `<button class="textbook-tab">` now contains:
  - Left side: `<span class="textbook-tab-label">` with multi-line label HTML from `renderTextbookTabLabel(group.label)`.
  - Right side: `<span class="textbook-tab-progress">${group.completed}/${group.total}</span>`.
- Replaced the old single-line `${escapeHtml(group.label)}` + `<span class="textbook-tab-count">${group.total}</span>` layout.
- Preserved all existing behavior: `data-textbook-tab`, `data-textbook-panel`, `hidden` toggling, active classes, modal/card/completion logic, and 8-textbook order.

### What changed in layout.css
- Added a new `/* ===== Textbook tabs (学习 page) ===== */` block at the end of `layout.css` with styles for:
  - `.textbook-tab` — flex row, space-between, min-height 78px, existing hover/active states matching the prior `.progress-textbook-tab` aesthetic.
  - `.textbook-tab-label` — flex column for stacked lines.
  - `.textbook-tab-line` — base small text, muted color.
  - `.textbook-tab-line.is-emphasis` — larger (1rem), bolder, brighter `#f8fbff`.
  - `.textbook-tab-progress` — right-aligned count using `var(--font-display)` and `var(--neon-cyan)`.

### Why
The user requested that each textbook tab show the label split across multiple lines (e.g. `高二/11年级`, `选择性必修二`, `物质结构与性质`) with the middle line emphasized, and display `completed/total` on the right. This makes the 8 tabs scannable and gives immediate progress context.

### Verification
- `lsp_diagnostics` on `src/modules/progress.js`: no errors.
- `lsp_diagnostics` on `src/styles/layout.css`: only pre-existing biome specificity warnings (no new issues).
- No automated tests run per user request.

### Date
2026-05-28

- 2025-05-28: Added .textbook-tab-bar.progress-textbook-tabs rule with display: flex; flex-wrap: nowrap; overflow-x: auto; and set .textbook-tab { flex: 0 0 auto; } so tabs stay in a single horizontal row with automatic/content-based width. Horizontal scroll appears when tabs exceed viewport. Preserved split labels and right-side X/aa progress display.


- 2025-05-28 (correction): Changed .textbook-tab from lex: 0 0 auto to lex: 1 1 0; min-width: 0; so all tabs share equal width and are evenly distributed across one row, matching user correction.


- 2025-05-28: Adjusted inactive tab text colors to be lighter/weaker (line rgba(226,232,240,.58), emphasis rgba(226,232,240,.72), progress rgba(103,232,249,.62)). Added active overrides so selected tab restores stronger colors (line var(--text-secondary), emphasis #f8fbff, progress var(--neon-cyan)). Preserved equal-width single-row layout.


- 2025-05-28: Unified inactive tab text colors to exactly gba(226, 232, 240, 0.72) for .textbook-tab-line, .textbook-tab-line.is-emphasis, and .textbook-tab-progress. Active overrides remain unchanged.

