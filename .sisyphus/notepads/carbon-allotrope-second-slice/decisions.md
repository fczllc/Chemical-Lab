# Decisions - carbon-allotrope-second-slice

## 2026-05-08 Task: initialization
- Use topic ID `g9-carbon-allotropes-comparison` for the second slice.
- Keep draft experiment draft-only; do not add it to runtime reactions or lab UI.

## 2026-05-08 Task: comparison relation wiring
- Keep the new comparison relation and collector challenge on `intro-element-symbols` until a matching curriculum tag is added elsewhere in the plan.
- Expose `challenge-carbon-allotropes-comparison` through an inherited metadata getter so it remains validator-visible without becoming an enumerable own key.

## 2026-05-08 Task: prototype removal follow-up
- Replace the inherited getter approach with an explicit `comparisonChallengeMetadata` property on `GAME_META.collector` and validate it directly in supporting-data checks.

## 2026-05-08 Task: slice trace inventory
- Treat `g9-carbon-allotropes-comparison` as data-driven curriculum metadata, not a dedicated route.
- Report the comparison slice using the existing compare/progress/quiz/detail surfaces instead of inventing a topic-specific screen.
