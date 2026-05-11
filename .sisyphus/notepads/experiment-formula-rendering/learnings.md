# Learnings

- 2026-05-10: Mixed prose renderer now supports $...$, \(...\), \[...\], raw \mathrm{...}, raw \frac{...}{...}, and escaped fallback for malformed fragments while keeping KaTeX trust disabled.
- 2026-05-10: Inventory exported in chemNotation.js covers cards, detail, steps, safety, visual, simulation, result, unlock text, and structured equation/reactant/product rows.
- 2026-05-10: lab.js now routes all visible prose through mixedProseFormulaHTML, while reaction titles in detail/safety/simulation/result surfaces use the mixed title path and structured chemistry rows stay on equationHTML.
- Task 3 validator coverage now walks reactions.name, description, optional textbookContent, visualDescription, every steps[] entry, every safetyNotes[] entry, and visible unlockRequirements text fields through mixedProseFormulaHTML.


## Task 5 full verification - 2026-05-11
- Full command verification passed: `npm run build`, `node scripts/validate-elements.mjs`, `node scripts/validate-supporting-data.mjs`, and `node scripts/validate-chem-notation.mjs` all exited 0.
- Edge-case driver confirmed mixed rendering handles multiple formulas, beginning/end formulas, `\mathrm{~mL}`, `\mathrm{mL}`, `\frac{...}{...}`, formula-only fields, array-style fields, and malformed fallback without raw tokens in valid visible text.
- Browser MCP sweep should ignore KaTeX MathML `<annotation>` and `<math>` nodes before checking visible text, otherwise KaTeX source annotations can produce false raw-token positives.
- Manual browser sweep found no visible `\mathrm`, `\frac`, or `$2 \mathrm{~mL}$` tokens across lab cards, detail body, steps, safety notes, visual description, locked-state summary, safety view, simulation, and result surfaces.

## Final verification reject resolution - 2026-05-11
- Verification passed after the fix pass: \\
ode --check scripts/validate-chem-notation.mjs\\, \\
ode scripts/validate-chem-notation.mjs\\, \\
ode scripts/validate-chem-notation.mjs --diagnose-reaction-prose\\, controlled failure mode \\
ode scripts/validate-chem-notation.mjs --diagnose-reaction-prose --fail-diagnostics\\ exited 1 as expected, and \\
pm run build\\ exited 0 with only the existing Vite chunk-size warning.
- Browser QA on Vite port 5187 opened the lab view, found 189 cards and 134 KaTeX nodes in the lab list, opened a KaTeX-bearing experiment detail, found 3 KaTeX nodes, and found no visible \\\\\\mathrm\\, \\\\\\frac\\, or \\$2 \\\\mathrm\\ tokens after excluding KaTeX MathML annotation nodes.

## Final verification reject resolution note correction - 2026-05-11
- Correcting the escaped text in the previous appended note: verification commands were `node --check scripts/validate-chem-notation.mjs`, `node scripts/validate-chem-notation.mjs`, `node scripts/validate-chem-notation.mjs --diagnose-reaction-prose`, controlled failure mode `node scripts/validate-chem-notation.mjs --diagnose-reaction-prose --fail-diagnostics` (exited 1 as expected), and `npm run build` (exited 0 with only the existing Vite chunk-size warning).
- Correcting browser QA token text from the previous appended note: the Vite port 5187 sweep found no visible `\mathrm`, `\frac`, or `$2 \mathrm` tokens after excluding KaTeX MathML annotation nodes.

## Final verification wave - 2026-05-11
- F1 Plan Compliance, F2 Code Quality, F3 Real Manual QA, and F4 Scope Fidelity all returned APPROVE after reject-resolution; final wave checkboxes were marked complete in `.sisyphus/plans/experiment-formula-rendering.md`.
