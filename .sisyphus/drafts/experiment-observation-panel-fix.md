# Draft: Experiment Observation Panel Fix

## Requirements (confirmed)
- User reports the experiment completion page card titled “观察到的现象” displays meaningless text: “教材已审核反应：...”
- If textbook data exists, “观察到的现象” should show the textbook content for the observed phenomenon/observation section of this reaction.
- User said “继续”, interpreted as continue planning this bug fix.
- User added that the “视觉描述” content should receive the same treatment: it must not display the generic “教材已审核反应：...” text, and should use the corresponding textbook visual/phenomenon descriptive content when available.

## Technical Decisions
- Missing textbook observation fallback: show a clear empty-state message (`暂无观察现象`) instead of falling back to result summary or hiding the card.
- Apply the same guardrail to the detail-view “视觉描述” area: if no valid textbook visual/observation prose exists, show a clear empty state rather than the generated reviewed-equation placeholder.
- Primary code/data targets identified: `src/modules/lab.js`, `scripts/textbook/build-reviewed-reactions.mjs`, and generated/runtime reaction data contract.

## Research Findings
- `src/modules/lab.js` renders completion results; `renderResultView()` uses `reaction.visualDescription` for “观察到的现象”.
- `src/modules/lab.js` detail view also uses `reaction.visualDescription` for “视觉描述”.
- Active runtime data comes from `src/data/index.js` importing `src/data/reactions.json`; older `src/data/reactions.js` is not the active path for lab reactions.
- `scripts/textbook/build-reviewed-reactions.mjs` generates `description: "教材已审核反应：..."` when no richer description exists, then `labMetadataFor()` sets `visualDescription: description`, causing both panels to inherit the same bad placeholder text.
- No existing active runtime observation-specific field was found; plan must specify a dedicated safe field/fallback contract and prevent generic reviewed-equation placeholders from surfacing in observation/visual panels.
- Validation setup exists: Playwright config/tests are present, especially `tests/ui/lab-textbook-experiments.spec.ts`; no npm `test` script exists, so targeted QA should use direct `npx playwright test ...` plus `npm run build` and relevant validators if data generation changes.

## Open Questions
- Confirm test strategy: TDD regression first, tests-after, or no test addition. Agent QA scenarios will be included regardless.

## Scope Boundaries
- INCLUDE: Fix the experiment completion summary “观察到的现象” content source, fix the detail-view “视觉描述” content source/guardrail, and verification plan.
- EXCLUDE: Full experiment UI redesign, chemistry data corrections unrelated to observation text, broad reaction equation normalization unless required for lookup.
