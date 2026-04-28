## AGENTS.md Factual Corrections

- Removed claims that `src/data` contains specific files (`elements.js`, etc.) as the directory is currently empty.
- Removed claims that verification scripts (`node scripts/validate-elements.mjs`) and Playwright tests currently exist.
- Clarified that these scripts and tests are planned and defined in `.sisyphus/plans/element-explorer-kids.md`.
- Updated "Source Boundaries" and "Verification" sections to reflect the actual current state of the repository.

## Build blocker discovered during Task 5

- `npm run build` currently fails for a pre-existing repo baseline reason unrelated to `AGENTS.md` content.
- Current failure class: `src/main.js` imports multiple missing modules/data files. Observed failing imports across smoke runs include `./data/elements.js` and `./modules/quiz.js`.
- Vite also warns that `/src/styles/games.css`, `/src/styles/lab.css`, `/src/styles/achievements.css`, and `/src/styles/responsive.css` do not exist at build time.
- This blocks Task 5 acceptance (`npm run build` exit 0) and any final verification gate that depends on a green build.
## AGENTS.md Factual Wording Fixes

- Updated Runtime State to include full window.appState shape from src/main.js.
- Clarified App Bootstrap to reflect that some modules/data are not yet present.
- Tightened Source Boundaries for src/modules to list only currently existing files.
- Updated Repo-specific Context to clarify that validation commands are planned, not implemented.

## Build restoration baseline applied

- Added minimal build-safe stubs for `src/data/elements.js`, `src/modules/compare.js`, `src/modules/timeline.js`, `src/modules/quiz.js`, `src/modules/achievements.js`, `src/modules/progress.js`, and `src/modules/storyMode.js` so the current `src/main.js` import surface resolves without changing bootstrap flow.
- Added missing linked placeholder stylesheets: `src/styles/games.css`, `src/styles/lab.css`, `src/styles/achievements.css`, and `src/styles/responsive.css`.
- Fixed a pre-existing Three.js package-path mismatch in `src/three/scene.js` by importing `WebGPURenderer` from `three/webgpu`, which is required for `three@0.172.0` to build under Vite.
