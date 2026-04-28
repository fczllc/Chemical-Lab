## 2026-04-28T21:43:25.9710908+08:00 Task: context-bootstrap
- Many route modules mix rendering and behavior (`renderTable.js`, `detailPanel.js`, `compare.js`, `timeline.js`, `quiz.js`, `storyMode.js`, `lab.js`, `achievements.js`, `progress.js`, `homeModules.js`). Avoid touching them unless CSS hooks are truly insufficient.
- Decorative motion and glow are distributed across multiple CSS files, so visual cleanup must be coordinated rather than localized.
- The `#bg-canvas` must remain in the DOM for compatibility even though the visible design should not depend on it.

## 2026-04-28T21:50:00+08:00 Task: delegation-strategy
- Broad Task 1 delegation timed out with no file changes. Retry strategy is to split Task 1 into smaller CSS-first units: token update, canvas hiding, then build verification.
