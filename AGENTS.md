# AGENTS.md

## Commands
Verified npm scripts from `package.json`:
- `npm run dev`: Start Vite development server (port 5173)
- `npm run build`: Build for production
- `npm run preview`: Preview production build locally (port 4173)

Data validation scripts (run these before claiming data work is complete):
- `node scripts/validate-elements.mjs` — 118 elements, unique atomic numbers/symbols, required fields
- `node scripts/validate-supporting-data.mjs` — cross-references for quizzes, reactions, achievements, learning path
- `node scripts/validate-curriculum.mjs` — curriculum tags, difficulty bands, prerequisites acyclicity
- `node scripts/validate-lab-experiments.mjs` — 92 lab records, unlock requirements, safety notes
- `node scripts/validate-textbook-assets.mjs` — markdown images, manifest paths, runtime references
- `npm run validate:all:safe` — runs all validators + build in sequence

Playwright tests:
- `npx playwright test` — full suite (uses global-setup.ts to spawn Vite preview server on 127.0.0.1:4173)
- Tests live in `tests/` with subdirectories: `shell/`, `ui/`, `content/`
- `tests/setup/global-setup.ts` spawns a detached Vite server; `global-teardown.ts` kills it

## App Bootstrap
Verified application entry path:
- `index.html` -> `/src/main.js`
- `/src/main.js` initializes `window.appState` (read-only inspection proxy), Three.js scene, particles, router, and all module init functions.

## Source Boundaries
- `src/data`: Canonical datasets consumed through `src/data/index.js`. Includes `elements.json`, `quizData.json`, `reactions.json`, `achievementsData.json`, `learningPath.json`, `labExperiments.json`, `spectralLines.json`, `curriculum.js`, `textbookAssets.js`, and `storyMedia/media.json`.
- `src/modules`: Router, table renderer, detail panel, filters, search, compare, timeline, quiz, games, achievements, progress, story mode, lab, storage, home modules, chem notation, and game feedback overlay.
- `src/three`: Three.js rendering — `scene.js`, `particles.js`, `electronModel.js`, `elementEnergy.js`.
- `src/styles`: Component-specific CSS — base, layout, periodic-table, panel, games, lab, achievements, chem notation, responsive.
- `src/games/`, `src/lab/`, `src/animations/`: Game logic, lab scenes, and GSAP animation utilities.
- `scripts/`: Node validation scripts and textbook processing pipelines.
- `tests/`: Playwright end-to-end tests with fixtures and setup/teardown hooks.

## Repo-specific Context
- **Product**: Chinese-first children's chemistry learning app "Element Explorer Kids / 元素探索者" built with Vite, vanilla JS, Three.js, GSAP, KaTeX, and Lucide icons.
- **Language**: UI copy is Chinese-first; English element names are learning assists, not primary labels.
- **Reference**: See `原始需求.txt` for full functional spec and `.sisyphus/plans/element-explorer-kids.md` for implementation waves and acceptance criteria.

## Learner-State Contract (hard rules)
- `learnedElements`: add atomic number the **first time the detail panel fully opens**.
- `collectedElements`: mirrors learned elements automatically (same event, same atomic number).
- `completedExperiments`: experiment IDs completed after the result card successfully renders.
- `quizScores`: append per completed quiz run with `score`, `total`, `percentage`, `sourceElement`, `timestamp`.
- `unlockedAchievements`: derived from canonical event handlers, not scattered UI logic.
- State is persisted via versioned localStorage keys with corruption recovery and schema migration.

## Verification
- All validation scripts listed above are implemented and passing.
- Playwright tests exist and run against a Vite preview server.
- `npm run build` must pass before any PR or completion claim.
- No verification step may be skipped when implementing data, state, or UI changes.

## Runtime State
- `window.appState`: Read-only inspection proxy initialized in `src/main.js`. Contains `elements`, `currentElement`, `compareList`, `learnedElements`, `collectedElements`, `quizScores`, `completedExperiments`, `unlockedAchievements`, `gameScores`, and `settings`. Intended for runtime inspection only — mutate through `storage.js` APIs.
