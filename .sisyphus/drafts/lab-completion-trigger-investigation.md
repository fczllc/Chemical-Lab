# Draft: Lab Completion Trigger Investigation

## Requirements (confirmed)
- User asks: “实验室模块中，完成实验这个现在是靠什么触发的，我们取消了实验动画，查下完成实验是不是有触发操作。”

## Technical Decisions
- This is currently an investigation, not an implementation request.
- No code changes will be made unless investigation shows a missing/incorrect completion trigger and user asks for a work plan.

## Research Findings
- Background explore completed without usable payload, so investigation proceeded via targeted read-only searches.
- `src/modules/storage.js:942-959` defines `markExperimentCompleted(experimentId)`: it adds the string id into `appState.completedExperiments`, appends an `experimentcompleted` activity, emits `experimentcompleted`, and returns `true`; duplicate/invalid ids return `false`.
- Current `src/modules/lab.js` imports only `getCompletedExperiments`, not `markExperimentCompleted` (`src/modules/lab.js:5-11`).
- Current `src/modules/lab.js` uses completion state only for display/filter/unlock: card badge/filter at `src/modules/lab.js:176-186, 226-255`, modal status at `src/modules/lab.js:641-643`, safety status at `src/modules/lab.js:760-763`, and unlock shortcut at `src/modules/lab.js:771-776`.
- Current `src/modules/lab.js` has no `data-lab-start`, no `data-launch-simulation`, no `renderResultView`, and no result-card completion flow; the modal only opens details/safety, edits title, and closes.
- Repository-wide source search found no runtime caller of `markExperimentCompleted` outside its definition; the only non-source caller is `tests/ui/lab-3d-simulation.spec.ts:124,175-177`, where tests manually seed a completed experiment.
- Conclusion: after animation/simulation completion UI was removed, no user-facing lab operation currently writes `completedExperiments`; completion can only happen by direct storage API calls from tests/dev code.

## Open Questions
- None yet; awaiting codebase investigation results.

## Scope Boundaries
- INCLUDE: Lab module completion trigger, persistence/update path for `completedExperiments`, UI/user action that fires completion, tests/selectors if present.
- EXCLUDE: Implementing fixes, changing lab UI, restoring animations.
