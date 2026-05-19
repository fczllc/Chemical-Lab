# Module Layout Learnings

## 2026-05-19: Achievements & Progress full-width layout

- **Pattern**: `body:has(#pageId.active) .detail-panel.docked { display: none; }` is the canonical way to hide the right-side detail panel for specific pages.
- **Reference**: `src/styles/lab.css` uses this for `#lab.active` with responsive padding `clamp(12px, 4vw, 56px)`.
- **Application**: Applied the same two-rule pattern to `#achievements.active` and `#progress.active` in `src/styles/achievements.css`.
- **Result**: Achievements and progress pages now fill the full width, matching lab behavior, without touching JS routing or global layout.
- **Verification**: `npm run build` passes; `validate-supporting-data.mjs` passes.

## 2026-05-19: Achievement cards 5-column grid with top/bottom alignment

- **Problem**: `.achievement-category-grid` was grouped with `.progress-metrics-grid` and `.progress-stage-detail-grid` in a single selector setting `grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))`. Because the grouped selector had the same specificity as the standalone 5-column rule, source order determined the winner—and the grouped rule came first, so the 5-column rule was being overridden.
- **Fix**: Removed `.achievement-category-grid` from the grouped selector (line 92-95) and kept it as a standalone, more specific rule after the grouped rule. This ensures 5 columns apply on wide screens without affecting progress grids.
- **Card alignment**: The card already used `grid-template-rows: auto auto 1fr` with `.achievement-card-body { align-self: start; }` and `.achievement-meta-list { align-self: end; }`, so title/description stay at the top and 解锁条件/状态/解锁日期 align at the bottom. No markup changes needed.
- **Responsive**: Existing media queries at 1400px (4 cols), 1100px (3 cols), 860px (2 cols), and 560px (1 col) remain intact.
- **Verification**: `npm run build` passes.
