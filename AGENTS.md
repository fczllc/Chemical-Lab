# AGENTS.md

## Commands
Verified npm scripts from `package.json`:
- `npm run dev`: Start Vite development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build locally

## App Bootstrap
Verified application entry path:
- `index.html` -> `/src/main.js`
- `/src/main.js` is the intended main entry point that initializes the global state and imports the current bootstrap modules/data.

## Source Boundaries
- `src/data`: Intended for canonical datasets (elements, quizzes, reactions, etc.). Currently contains only `elements.js` as a minimal build-restoration stub.
- `src/modules`: Currently contains `router.js`, `renderTable.js`, `detailPanel.js`, `filters.js`, `search.js`, `storage.js`, plus minimal build-restoration stubs for `compare.js`, `timeline.js`, `quiz.js`, `achievements.js`, `progress.js`, and `storyMode.js`.
- `src/three`: Three.js rendering logic, including scene setup, particle systems, and 3D models.
- `src/styles`: Component-specific and layout CSS files.

## Repo-specific Context
- **Product Intent**: See `原始需求.txt`. This is a Chinese-first children's chemistry learning app named "Element Explorer Kids / 元素探索者" built with Vite, vanilla JS, Three.js, and GSAP.
- **Current Workflow/Validation**: See `.sisyphus/plans/element-explorer-kids.md` for the current implementation plan and planned validation commands.

## Verification
Current state:
- No verification scripts or Playwright tests currently exist in the repository.
- Planned validation commands (e.g., `node scripts/validate-elements.mjs`, `npx playwright test`) are defined in `.sisyphus/plans/element-explorer-kids.md` and must be implemented as part of the development workflow.

## Runtime State
- `window.appState`: Current global runtime/bootstrap inspection state initialized in `src/main.js`. It contains `elements`, `currentElement`, `compareList`, `learnedElements`, `collectedElements`, `quizScores`, `completedExperiments`, `unlockedAchievements`, `gameScores`, and `settings`. It is intended for runtime inspection and state tracking, not as an immutable public API.
