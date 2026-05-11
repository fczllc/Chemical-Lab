# Issues

- 2026-05-10: No blocking issues found; malformed mixed prose falls back to escaped visible text and does not inject HTML.

- 2026-05-10: Corrected the surface inventory so card reactants, detail equationText/reactants/products, and simulation equationText are classified as structured chemistry rather than mixed prose.
- 2026-05-10: Browser QA showed one benign favicon.ico 404 in console; no lab-render regressions were observed.
- No runtime issues encountered in the current reactions dataset; all scanned prose fields passed mixedProseFormulaHTML validation.
- 2026-05-10: Task 4 delegation aborted twice without file changes; retrying with smaller scoped prompts and no long inherited context to avoid subagent/tool interruption.
- 2026-05-10: Task 4 remained blocked by repeated subagent aborts. User explicitly instructed to skip if the task cannot complete and will manually verify Playwright/browser behavior.

## Task 5 observations - 2026-05-11
- Vite dev server port 5173 was already occupied during browser QA, so the manual sweep used port 5185.
- Browser console still reports a benign missing `/favicon.ico` 404.
- Task 4 automated Playwright spec/config remains intentionally skipped by prior user instruction; Task 5 used Playwright MCP manual browser sweep evidence instead.

- Scope fidelity review: reject if formula-rendering fix includes unrelated lab UX rewrites (filters/detail modal/navigation) or bulk generated/data content mutations not required for rendering correctness.

## Final verification reject resolution - 2026-05-11
- Scope-creep finding classified as mostly pre-existing/separate workspace work: current \\GIT_MASTER=1 git status --short\\ still shows broad dirty files across \\src/modules/lab.js\\, \\src/styles/lab.css\\, \\src/data/reactions.json\\, generated ingestion JSON, textbook scripts, and unrelated evidence/notepad paths. The experiment formula plan only requires renderer routing and validation and explicitly says not to change routing/navigation behavior, so I did not revert filters/modal/navigation/layout or generated data churn in this pass.
- Real defect fixed: removed \\lab.js\\ local title KaTeX path (\\enderMixedTitle\\, \\enderLatexSafe\\, \\indLatexEnd\\, direct \\katex\\ import) and kept card title rendering on centralized \\mixedProseFormulaHTML()\\.
- Real validator defect fixed: \\--diagnose-reaction-prose --fail-diagnostics\\ now turns synthetic dry-run diagnostics into nonzero validation errors without mutating \\src/data/reactions.json\\.

## Final verification reject resolution note correction - 2026-05-11
- Correcting the escaped text in the previous appended note: `GIT_MASTER=1 git status --short` showed broad dirty workspace files across `src/modules/lab.js`, `src/styles/lab.css`, `src/data/reactions.json`, generated ingestion JSON, textbook scripts, and unrelated evidence/notepad paths before this pass. I treated filters/modal/navigation/layout and generated data churn as pre-existing/separate workspace work and did not revert it.
- Correcting the helper names from the previous appended note: the real `lab.js` defect fixed in this pass was removal of `renderMixedTitle`, `renderLatexSafe`, `findLatexEnd`, and the direct `katex` import in favor of `mixedProseFormulaHTML()` for card title rendering.
