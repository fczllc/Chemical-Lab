
## Task 4: Playwright Test Authoring Notes

- `detail-panel` can be hidden after reloading directly on `#/lab`, so the title-edit spec readiness helper should wait on nav/table/loader readiness and assert the lab route separately.
- Removing only the localStorage key before reload can be overwritten by the in-memory state during lifecycle persistence; clear title overrides through the storage module (`clearExperimentTitleOverride()` plus `saveProgress()`) when validating canonical fallback in an already-loaded page.

## Task 5: Blocked by Existing Home Shell Bottom Widget Failures

- `npx playwright test tests/shell/home-shell.spec.ts tests/ui/route-shells.spec.ts` exited non-zero. `tests/ui/route-shells.spec.ts` passed 4/4, but `tests/shell/home-shell.spec.ts` failed 6 bottom-widget assertions.
- Reproduced again in the combined required command `npx playwright test tests/ui/experiment-title-edit.spec.ts tests/shell/home-shell.spec.ts tests/ui/route-shells.spec.ts`: 19 passed, 6 failed; all editable-title tests passed 3/3.
- Failures are unrelated to the editable experiment title feature: `bottom-categories` and `bottom-compare` are hidden with `aria-hidden="true"`/`inert`, expected bottom widget DOM order differs (`bottom-stats` first instead of `bottom-compare` first), and compare preview clicks are intercepted by the collapsed bottom panel/main content.
- Evidence: `.sisyphus/evidence/task-5-shell-route-regression.txt` and `.sisyphus/evidence/task-5-playwright.txt`.
