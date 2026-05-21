
## Task 1 storage completion-date repair - 2026-05-20
- Previous attempts missed src/modules/storage.js getStateSnapshot() and tests/ui/settings-reset.spec.ts readState(), so experimentCompletionDates was not visible through window.appState snapshots even though persistence serialization existed. Fixed both fields in this pass.
- tests/ui/storage-migration.spec.ts also contained a malformed partial experiment completion date test block with stray top-level await; replaced it with grep-matched contract tests.


## Task 1 tiny continuation - snapshot/readState fields
- Inserted/verified missing experimentCompletionDates fields in src/modules/storage.js getStateSnapshot() and tests/ui/settings-reset.spec.ts readState().



## Task 2 lab completion footer ID-key bug fix - 2026-05-20
- Bug: src/modules/lab.js used lab card id instead of canonical xperimentId in three places, causing completion storage and date lookup to mismatch the learner-state contract.
- Fixed expressions:
  1. indStageEvents() confirm click: markExperimentCompleted(activeReaction.experimentId) (was .id).
  2. indStageEvents() fresh state: reshCompleted.has(activeReaction.experimentId) (was .id).
  3. enderReactionDetail() completed footer: getExperimentCompletionDate(experiment.experimentId) (was .id).
- Also tightened guard from ctiveReaction?.id to ctiveReaction?.experimentId in confirm handler.
- Verification: 
ode scripts/validate-lab-experiments.mjs passed (92 records). 
pm run build passed.


## Final review rejection fix - 2026-05-20
- Review rejection: the lab completion confirm handler updated the modal, then called undefined renderLabList(), so tests without page-error capture missed a post-click ReferenceError and the card badge/list state did not refresh.
- Fix: keep the immediate modal update, then call existing renderLabShell() to rebuild list cards/filter state and refresh icons.
- Regression coverage: completion confirmation Playwright flow now captures pageerror/console error events and asserts the fixture card badge flips to 已完成 immediately after click.
