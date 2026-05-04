
## 2026-05-04 - Migrate lab and reaction displays to chemNotation renderer

- In lab.js, imported formulaHTML and renderEquationToElement from ./chemNotation.js. Replaced all formatFormula() calls with formulaHTML() inside template strings (list card reactants, stage equation, stage reactants/products, simulation modal equation).
- Removed the old formatFormula() helper (String(value).replace(/([A-Z][a-z]?)(\d+)/g, '$1<sub>$2</sub>')) entirely.
- Added data-chem-notation attributes to formula containers: list card reactants (data-chem-notation="reactants"), stage equation card (data-chem-notation="equation"), stage reactants card (data-chem-notation="reactants"), stage products card (data-chem-notation="products"), and simulation modal meta (data-chem-notation="equation").
- EQUATION_MAP and reactions data were preserved unchanged; no safety confirmation flow, completion storage, modal timing, or canvas simulation logic was altered.
- Build passes (npm run build completed successfully).
- No remaining formatFormula references in lab.js per Select-String verification.

## 2026-05-04 - Migrate quiz display to formula-token rendering

- In quiz.js, imported formulaHTML and plainChemText from ./chemNotation.js and added renderChemText() for display-only tokenization of quiz prose.
- renderChemText() escapes plain prose segments, rejects standalone element-symbol tokens like H, and only sends formula-like tokens such as H2O, CO2, NaOH, or grouped/numbered formula tokens through formulaHTML().
- Applied renderChemText() to visible question, option, feedback, explanation, and wrong-answer review text while preserving raw option arrays, selectedIndex, correctIndex, addQuizScore(), and quizScores storage behavior.
- Verification: lsp_diagnostics could not run because the workspace lacks a TypeScript server; npm run build passed. Select-String confirmed data-option-index remains the only option data attribute and no data-option-value is present.

## 2026-05-04 - Migrate reaction game chips to chemNotation renderer

- In games.js, imported formulaHTML from ./chemNotation.js and applied it only to reaction matching reactant/product formula displays.
- Reaction chips preserve existing data-reaction-left/data-reaction-right IDs, selected/matched classes, disabled state, score flow, timer flow, and product session labels; formula rendering maps each formula and joins with plain text ` + ` separators.
- Added data-chem-notation="reactants" and data-chem-notation="products" to the reaction chip formula containers for stable tests.
- Memory and collector standalone element symbols remain plain text; no element-symbol game cards were migrated to KaTeX.

## 2026-05-04 - Reaction game product rendering correction

- Adjusted the games.js reaction product chip display to call formulaHTML(product.label) directly, matching the task contract while preserving product.id matching and product.label session data.

## 2026-05-04 - Task 8 Playwright notation coverage

- Added `tests/content/chem-notation.spec.ts` using existing per-file `waitForShellReady(page)` style.
- Lab full reaction equations require `equationHTML()` instead of `formulaHTML()` because `formulaHTML()` intentionally handles single formula tokens only and falls back for operator-containing equations.
- `npx playwright test tests/content/chem-notation.spec.ts` passes after routing `.lab-equation-card` and `.lab-simulation-meta` through `equationHTML()`.
- Broader home-shell regression remains blocked by unrelated bottom-widget visibility/order/click-interception failures; details are in `problems.md`.

## 2026-05-04 - equationHTML vs formulaHTML distinction

- formulaHTML() is for single chemical formula tokens (e.g. H2O, NaCl). It uses formulaToLatex which parses element symbols and subscripts but does NOT tokenize equation operators (+, ->, etc.). Passing a full equation like '2H2 + O2 -> 2H2O' through formulaHTML causes the converter to return empty string, so renderHTML falls back to plain text — no .katex output.
- equationHTML() is for full reaction equations with operators. It uses equationToLatex which tokenizes the string into formulas and operators, converts each formula token via formulaToLatex, and maps operators to LaTeX (e.g. '->' to \rightarrow). This produces valid KaTeX HTML with .katex classes.
- In lab.js, .lab-equation-card and .lab-simulation-meta now use equationHTML() for full equations, while reactants/products lists continue using formulaHTML() for individual formula tokens.
- This fix resolved the Playwright test failure at chem-notation.spec.ts:28 where .lab-equation-card .katex was not found.

## 2026-05-04 - Task 9 final hardening

- Added scoped `src/styles/chemNotation.css` and imported it after KaTeX CSS in `src/main.js` to constrain KaTeX wrapping/sizing within `.chem-notation` wrappers.
- Removed a stray trailing brace from `src/styles/periodic-table.css`; production build no longer emits the previous esbuild CSS unexpected-`}` warning.
- Boundary audit confirmed `katex.render` and `katex.renderToString` only appear in `src/modules/chemNotation.js`; no `trust: true` matches found.
- Production CSS contains no `data:font`; KaTeX fonts are emitted as assets because `vite.config.js` sets `build.assetsInlineLimit: 0`.
- `npm run build`, `npx playwright test tests/content/chem-notation.spec.ts`, and `npx playwright test tests/ui/periodic-table-controls.spec.ts` pass.

## 2026-05-04 - Final-wave reaction product and coverage fix

- In games.js, reaction product chip session data remains `{ id, label }`; display rendering now looks up the matching canonical reaction products and maps each product formula through formulaHTML(), joining rendered tokens with plain ` + ` separators so labels like `NaOH + H2` produce KaTeX for both formulas.
- Expanded `tests/content/chem-notation.spec.ts` to cover reaction-game multi-product chips, quiz formula-token smoke behavior, story electron configuration rendering, representative `data-plain-text`/`aria-label` metadata, plain standalone symbols, and both desktop/mobile layout overflow checks.

## 2026-05-04 - Dev server access stabilization

- `npm run dev` could start while manual browser access was unreliable in the Windows/PowerShell environment; explicitly configuring Vite dev server to bind `127.0.0.1:5173` made the dev URL deterministic.
- Verified `http://127.0.0.1:5173/` returns the app shell, hides the global loader, and renders 118 element cells; the only console error observed was unrelated `favicon.ico` 404.

