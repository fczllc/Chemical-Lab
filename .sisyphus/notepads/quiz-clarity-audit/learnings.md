### Quiz Clarity Audit - Task 1: Audit Script
Audit script created. Baseline reports generated. Script supports --report, --fail-on-blocking, --fail-on-unclassified.

### Quiz Clarity Audit - Task 2: Strict Validator Rule
- Implemented `validateStandaloneClarity` in `scripts/validate-quiz-data.mjs` to target specifically phrased vague-textbook-fragment questions and explanations.
- Used TDD approach: added invalid fixture `invalid-vague-textbook-fragment` first (Red), implemented logic (Green), verified against full corpus (expected Fail).
- Added `vague-textbook-fragment` to `selfCheckModes` to ensure strict, deterministic testing.
- Observed numerous expected failures in current corpus due to existing records with these patterns.
### Quiz Clarity Audit - Task 1: Final Polish
Added documentation comment for runtimeEligibleQuestionCount. Verified help output, blocking count (63), and report schema stability.
