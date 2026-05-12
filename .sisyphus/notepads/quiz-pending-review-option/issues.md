# Issues: quiz-pending-review-option

## 2026-05-11 Task: session-start
- Root issue from prior exploration: `shortAnswer` placeholder records have one option and are treated as normal MCQ options by renderer.

## 2026-05-12 Task 3: Supporting validator pre-existing failure
- `node scripts/validate-supporting-data.mjs` exits 1 because of a promoted textbook reaction notation record, not quiz session normalization.
- Scope decision: leave `scripts/validate-supporting-data.mjs` and canonical data unchanged because user selected quiz/manual-QA scope and this failure is unrelated to the pending-review quiz option bug.
