## Task 3: Align stale lab tests with removed animation/safety-gate flow
- Stale tests in lab-textbook-experiments.spec.ts and lab-3d-simulation.spec.ts were skipped with message: 'Experiment animations removed; completion is confirmed in detail modal'.
- Build passes, but Playwright infrastructure was failing to launch the app during testing in this environment, unrelated to the changes made.

## Task 1: Storage completion-date contract
- getStateSnapshot() must mirror serializeState() for learner-state fields; tests that read window.appState depend on this inspection proxy, not only persisted localStorage.
- Storage migration tests should wait for appState/test hooks instead of stale element-cell DOM classes; the current UI no longer renders that selector.
- Experiment completion dates are local YYYY-MM-DD values. Legacy completed experiment IDs without valid dates remain completed and keep experimentCompletionDates empty.


## Task 4: Lab completion confirmation E2E - 2026-05-20
- Injecting fixture experiments before navigation can be lost when the app module graph reloads; inject after /#/lab is active and dispatch a pagechange event so renderLabShell sees the pushed labExperiments records.
- Legacy completed/missing-date Playwright setup must seed localStorage with context.addInitScript before hydration; direct page.evaluate writes before reload can be overwritten by the app beforeunload save.
- The completion confirmation evidence is written by tests/ui/lab-textbook-experiments.spec.ts to .sisyphus/evidence/task-4-lab-confirmation-flow.json and records button/status/legacy/checkbox/safety assertions.

## 2026-05-20: Center lab completion button
- Added `.lab-completion-footer` rule in `src/styles/lab.css` with `display: flex; justify-content: center; align-items: center; padding-top: 4px;` to horizontally center the `确认完成实验` button (and the completed status text) in the modal footer. No markup or JS changes.
