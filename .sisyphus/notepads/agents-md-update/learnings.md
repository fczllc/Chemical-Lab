## Task 1 - authoritative AGENTS.md wording anchors

Source scope used only: `package.json`, `index.html`, `src/main.js`, `原始需求.txt`, `.sisyphus/plans/element-explorer-kids.md`.

Must appear in `AGENTS.md` as exact or near-exact verified anchors:
- Verified npm scripts from `package.json:6-10`: `npm run dev`, `npm run build`, `npm run preview`.
- Verified bootstrap path from `index.html:267`: `<script type="module" src="/src/main.js"></script>`.
- Verified entry module from `src/main.js:1-16`: `/src/main.js` imports data/bootstrap modules and is the application main entry.
- Minimum accurate `window.appState` wording from `src/main.js:18-34`: `window.appState` is the current global/bootstrap runtime state object initialized in `src/main.js`, containing `elements`, current selection/comparison collections, learner-progress sets, `gameScores`, and `settings`.
- Product-intent context from `原始需求.txt`: Vite + vanilla HTML/CSS/JavaScript + ES Modules + Three.js + GSAP + Canvas 2D + localStorage; Chinese-first children’s chemistry learning app named `Element Explorer Kids / 元素探索者`.
- Workflow/validation context from `.sisyphus/plans/element-explorer-kids.md`: current plan validation explicitly references `npm install`, `npm run build`, `node scripts/validate-elements.mjs`, `node scripts/validate-supporting-data.mjs`, and Playwright commands such as `npx playwright test tests/shell/home-shell.spec.ts`.

Must NOT appear in `AGENTS.md` as verified repo workflow/tooling claims:
- Do not claim verified support for `npm test`, `npm run lint`, `npm run typecheck`, `pnpm`, `yarn`, or `bun`.
- These strings were checked against the allowed source files and were not found there.
- Do not blend source roles: `原始需求.txt` is product-intent context; `.sisyphus/plans/element-explorer-kids.md` is current workflow/validation context.
- Do not describe `window.appState` as an immutable public API; the accurate repo-backed wording is current runtime/bootstrap inspection state defined in `src/main.js`.

## Task 2 - Compact AGENTS.md structure and content rules

### Proposed Section Order
1. **Commands**: Verbatim npm scripts from `package.json`.
2. **App Bootstrap**: Entry point path from `index.html` and `src/main.js`.
3. **Source Boundaries**: High-level `src/` organization.
4. **Repo-specific Context**: Pointers to `原始需求.txt` and `.sisyphus/plans/element-explorer-kids.md`.
5. **Verification**: Current verification commands.

### Content Rules
- **Commands**: Include only `npm run dev`, `npm run build`, `npm run preview`. Omit any mention of `test`, `lint`, `typecheck`, or alternative package managers (`pnpm`, `yarn`, `bun`).
- **App Bootstrap**: Explicitly cite `index.html` -> `/src/main.js` as the boot path.
- **Source Boundaries**: Briefly describe `src/data`, `src/modules`, `src/three`, `src/styles`. Omit exhaustive file trees or generic directory descriptions.
- **Repo-specific Context**:
    - `原始需求.txt`: Product-intent context (Vite, vanilla JS, Three.js, GSAP, etc.).
    - `.sisyphus/plans/element-explorer-kids.md`: Current workflow/validation context.
- **Verification**: Include `node scripts/validate-elements.mjs`, `node scripts/validate-supporting-data.mjs`, and Playwright commands.
- **Runtime State**: Describe `window.appState` as current runtime/bootstrap inspection state initialized in `src/main.js`. Do not describe it as an immutable public API.

### Wording Split Confirmation
- `原始需求.txt` = product-intent context.
- `.sisyphus/plans/element-explorer-kids.md` = current workflow/validation context.

### Runtime State Confirmation
- `window.appState` is documented descriptively only, as code-traceable runtime state.

## Task 3 - AGENTS.md creation summary

Created root AGENTS.md with verified repo-specific guidance:
- Commands: npm run dev, build, preview
- Bootstrap: index.html -> /src/main.js
- Source Boundaries: src/data, src/modules, src/three, src/styles
- Context: 原始需求.txt (intent), .sisyphus/plans/element-explorer-kids.md (workflow)
- Verification: validate-elements.mjs, validate-supporting-data.mjs, Playwright
- Runtime State: window.appState (descriptive only)
