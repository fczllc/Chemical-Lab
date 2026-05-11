## 2026-05-10 Task: context-gathering
- `rg` is not installed in this environment; use `grep`, `glob`, `ast_grep_search`, `Read`, and PowerShell/git commands instead.
- Workspace is already dirty before implementation delegation: `.sisyphus/boulder.json`, `src/modules/lab.js`, and `src/styles/lab.css` have pre-existing changes. Do not overwrite or revert them; task verification must distinguish newly changed files from pre-existing dirty state.
- No `scripts/textbook/experiment-enrichment.mjs`, `scripts/textbook/validate-enrichment-fixtures.mjs`, or `tests/ui/lab-textbook-experiments.spec.ts` exists yet.

## 2026-05-10 Task 1 contract utilities
- No new blockers. Evidence directory was created because .sisyphus/evidence was absent before writing Task 1 QA evidence.
- Directory-wide `lsp_diagnostics` failed because configured `yaml-language-server` is not installed; file-level diagnostics on `scripts/textbook/experiment-enrichment.mjs` passed with no diagnostics.

## 2026-05-10 Task 5 fixture validator
- No blockers. Full suite and all named cases passed; the unknown-case path returned the exact expected error text.

## 2026-05-10 Task 5 correction
- Replaced the invalid high-confidence chemistry fixture with ozone decomposition (`2O3 → 3O2`) so the validator only enforces plausible explicit equations.

## 2026-05-10 Task 5 follow-up
- Updated `promotion-shape-compatibility` to reuse the supported ozone equation shape instead of the unsupported zinc/HCl example until Task 4 expands extraction.

## 2026-05-10 Task 2 draft generation content preservation
- No blockers. Required fixture cases, direct draft candidate shape case, full enrichment fixture suite, file-level diagnostics, CLI help, and `npm run build` passed.

## 2026-05-10 Task 3 title generation
- Initial action-pattern fixture used hydrogen wording and collided with the chemistry shortcut, so the case was switched to non-hydrogen content before final validation.

## 2026-05-10 Task 4 high-confidence chemistry extraction
- No blockers. The parser intentionally omits states, charges, parentheses, hydrates, and broad prose inference outside the two local phrase families.
- Any text containing an explicit arrow or `=` that fails complete equation parsing returns empty chemistry metadata rather than falling back to phrase inference, which is conservative by design.

## 2026-05-10 Static reaction fallback locator fix
- The `static reaction fallback` Playwright case was tripping strict mode when a text filter matched multiple `氢气燃烧` cards.
- The test now narrows to the single matching `.lab-item-card` via the unique `button[data-reaction-open="reaction-hydrogen-combustion"]` child and clicks the card-local open button.

## 2026-05-10 Task 9 validation blocker
- `lsp_diagnostics` on JSON files is blocked because the configured `biome` LSP server is not installed in this environment. Script file diagnostics still passed, and `npm run validate:textbook-enrichment` provided the required verification.

## 2026-05-10 F2 safety/result blocker fix
- Blocker 1 (safety gate): renderSafetyView at line 691 enabled data-launch-simulation solely on unlockState.unlocked, ignoring safetyConfirmed for dangerous reactions. Fixed by adding the same dangerous-level guard used in renderReactionDetail.
- Blocker 1 (handler): bindStageEvents data-launch-simulation click handler only checked unlockState.unlocked. Fixed by adding the dangerous-level + safetyConfirmed guard before allowing closeDetailModal() + openSimulationModal().
- Blocker 2 (result view): startSimulation completion handler set currentView = 'result' and detailModalRequested = true, but openDetailModal() internally calls closeDetailModal() which resets currentView = 'detail'. Fixed by preserving currentView across closeDetailModal() in openDetailModal() so renderStageContent() sees 'result' and renders renderResultView().
- Added Playwright coverage: dangerous reaction safety gate test proves launch is disabled without confirmation and enabled after checkbox check; simulation completion test proves result modal with 'EXPERIMENT LOGGED' appears after simulation finishes.
- All 5 lab-textbook-experiments.spec.ts tests pass (35.9s).
