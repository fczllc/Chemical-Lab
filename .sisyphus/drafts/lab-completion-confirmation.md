# Draft: Lab Completion Confirmation

## Requirements (confirmed)
- User wants a new button at the bottom of the experiment content modal: “确认完成实验”.
- Clicking the button should trigger experiment completion.
- For completed experiments, hide this button and show text: “确认完成：XXXX年XX月XX日”, using the confirmation date.
- Remove the current safety acknowledgement checkbox (“我已了解安全事项，并会按说明观察内容。”); its position should be replaced by the confirmation button/status.

## Technical Decisions
- This is a planning request under Prometheus mode; no source code will be edited in this session.
- Existing `markExperimentCompleted(experimentId)` must be reused as the canonical completion write path unless exploration reveals it cannot store/display confirmation dates.
- Date display format confirmed by user: `确认完成：YYYY-MM-DD`.

## Research Findings
- Prior investigation found `src/modules/storage.js:942-959` defines `markExperimentCompleted(experimentId)` but current lab UI has no runtime caller.
- Prior investigation found `src/modules/lab.js:676-681` renders the removable safety acknowledgement checkbox for dangerous/radioactive/extremely dangerous levels.
- New explore task launched to map storage date capability, modal/CSS touchpoints, and tests.
- Explore confirmed the core touchpoints: `src/modules/lab.js` `renderReactionDetail()` renders the removable checkbox around lines 676-681 and `bindStageEvents()` should own the new click handler.
- Explore confirmed `src/modules/storage.js` tracks `completedExperiments` only as a Set of IDs; unlike `achievementDates`, no experiment completion date map exists.
- Explore recommended updating storage serialization/persistence/migration together with `markExperimentCompleted()` so the button and date display use a stable persisted source.

## Open Questions
- None blocking. Default design: add explicit `experimentCompletionDates`/similar persisted object keyed by experiment ID.

## Scope Boundaries
- INCLUDE: Lab modal bottom action/status, completion trigger, completed-date persistence/display, removal of safety acknowledgement checkbox, tests/QA plan.
- EXCLUDE: Restoring experiment animation/simulation, changing experiment unlock rules beyond existing completed-experiment behavior, redesigning the whole modal.
