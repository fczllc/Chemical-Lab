## 2026-04-28T21:43:25.9710908+08:00 Task: context-bootstrap
- Visual direction locked: pure black / deep navy background, restrained cyan-led HUD surfaces, no flowing stars/particles/light streaks.
- Canvas policy locked: `#bg-canvas` remains in DOM but is visually hidden in the final shell.
- Scope locked: beautification only; preserve routes, state logic, selectors, and interaction semantics.
- Execution preference: CSS-first implementation, JS changes only for presentational class/wrapper hooks if strictly necessary.

## 2026-04-28T21:50:00+08:00 Task: delegation-strategy
- Execute Task 1 as multiple smaller units rather than a single broad styling pass.
- First implementation unit is limited to `src/styles/base.css` (token layer + canvas hiding) and `src/styles/layout.css` only if inheritance patching is strictly required.
