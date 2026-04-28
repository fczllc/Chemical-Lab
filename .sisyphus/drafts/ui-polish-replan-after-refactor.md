# Draft: UI Polish Replan After Refactor

## Pause Reason
- User is currently refactoring architecture to reduce redundancy and repeated definitions.
- UI beautification work is paused until the refactor lands.

## What We Learned Before Pausing
- The previous UI-only beautification plan was too broad to execute directly.
- The safest default implementation surface is still expected to be:
  - `index.html`
  - `src/styles/base.css`
  - `src/styles/layout.css`
  - `src/styles/periodic-table.css`
  - `src/styles/panel.css`
  - `src/styles/games.css`
  - `src/styles/lab.css`
  - `src/styles/achievements.css`
  - `src/styles/responsive.css`
- Many route modules mix rendering and behavior, so post-refactor replanning should re-check whether CSS-only boundaries improved.

## Locked User Constraints To Preserve After Refactor
- Only beautify UI; do not change functionality or interaction semantics.
- Use Scheme A only.
- Background must be pure black or deep navy.
- No flowing stars, particles, or light streaks.
- Prefer CSS-first execution; Three.js should not be required for visible shell styling.

## Replanning Triggers After Refactor
- Re-audit file boundaries after architectural cleanup.
- Re-check whether previous JS hook assumptions are still needed.
- Rebuild the UI plan as smaller, independently verifiable slices.
- Create a fresh execution plan only after the refactor stabilizes.
