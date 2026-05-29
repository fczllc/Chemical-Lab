# Issues — learning-module-textbook-confirmation

## 2026-05-28 Start Work
- No known implementation issues at session start.

- Task 6 verification: required unchanged lab regression npx playwright test tests/ui/lab-textbook-experiments.spec.ts did not pass. First run timed out at 180s after 6/10 passed; rerun with 420s reached test 8 and failed because expected 确认完成：2026-05-20 but app rendered 确认完成：2026-05-28. The frozen Date init script is added after beforeEach has already loaded the app, so lab completion records the real current date. Lab spec was left unchanged per task constraint.
