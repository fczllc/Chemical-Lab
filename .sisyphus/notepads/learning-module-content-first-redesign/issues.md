
- Replaced invented learning prose in `src/modules/progress.js` with neutral, metadata-derived fallback text.
- Removed runtime error caused by passing missing sets to `getManualLearningSegments`.

- F4 rejected out-of-scope changes in three files (2026-05-22):
  1. src/modules/achievements.js — reverted broad tabbed category navigation (TAB_CATEGORIES, activeAchievementCategory, tab buttons, per-category metrics, conditional single-category rendering). Restored original overview stats + progress bar + all-category rendering.
  2. src/modules/lab.js — restored .lab-card-clue paragraph with renderUnlockSummary.
  3. src/styles/lab.css — restored .lab-card-clue CSS block.
- Verification: git diff -- src/modules/achievements.js src/modules/lab.js src/styles/lab.css shows zero changes (all reverted).
- Verification: npx playwright test tests/ui/achievements-progress-coupling.spec.ts --timeout=30000 --workers=1 — 12/12 passed.
- Verification: npm run build — exit 0, 9.29s.

- Mobile lesson modal offscreen root cause / fix (2026-05-22):
  - Root cause: `src/styles/layout.css:181-198` defines `.page-section` with `transform: translateY(20px)` and `.page-section.active` with `transform: translateY(0)`. A non-none `transform` creates a containing block for fixed descendants. The lesson modal overlay (`position: fixed`) is rendered inside the active progress page-section, so it anchors to the transformed page section/scroll context rather than the viewport, causing it to appear offscreen on mobile.
  - Fix: in `src/styles/layout.css:195`, changed `.page-section.active` from `transform: translateY(0)` to `transform: none;` with a comment explaining the viewport-anchoring requirement. Inactive pages still keep `transform: translateY(20px)` for entrance animation.
  - Verification: grep for `.page-section.active` shows only `src/styles/layout.css` and `src/styles/base.css`. `npm run build` passes (exit 0, 10.30s). LSP diagnostics on `src/styles/layout.css` show only pre-existing biome specificity warnings, zero errors.
