# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

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
