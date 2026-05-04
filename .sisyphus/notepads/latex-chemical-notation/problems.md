## 2026-05-04 - Task 8 regression-suite blocker

- `npx playwright test tests/content/chem-notation.spec.ts` passes after adding `equationHTML()` and using it for lab full equations.
- Combined regression command `npx playwright test tests/content/chem-notation.spec.ts tests/shell/home-shell.spec.ts tests/ui/periodic-table-controls.spec.ts` did not complete successfully because `tests/shell/home-shell.spec.ts` has bottom-widget failures unrelated to KaTeX chemistry notation:
  - `bottom-categories` and `bottom-compare` are hidden/inert at 1440x900 in assertions that expect them visible.
  - DOM order expectation receives `bottom-stats, bottom-categories, bottom-element-stats, bottom-compare` instead of expected `bottom-compare, bottom-categories, bottom-element-stats, bottom-stats`.
  - Compare preview clicks are intercepted by `main.main-content` / bottom panel toggle.
- These failures appear outside the formula-rendering migration scope and were not fixed in Task 8 to avoid weakening unrelated shell/control assertions.
- Continue with Task 9 hardening and include this as a known blocker unless later scope authorizes fixing bottom-widget shell contract tests/app layout.

## 2026-05-04 - Task 9 validation blocker

- `npm run validate:data` fails outside this migration because `scripts/validate-story-media.mjs` expects `src/data/storyMedia/media-001-030.json`, which is missing in the current workspace.
- This missing file predates/does not relate to KaTeX notation rendering; no `src/data/` files were modified by this migration.
