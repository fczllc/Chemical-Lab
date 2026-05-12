# Issues — textbook-shortanswer-to-mcq

## 2026-05-12 — Task 3 converter

- No unresolved blockers. `git diff -- src/data/quizData.json` emits a CRLF warning on Windows, but final content diff is empty after the fixture write restore.
- `node scripts/validate-supporting-data.mjs` currently fails on an unrelated reaction notation fixture (`notationReviewStatus` not reviewed and equation parser rejection for sodium/water/ethanol equations); no Task 3 converter or quiz data files are implicated.
- Fixed verifier-found converter control-flow issues: `--help` now bypasses required mode/selection checks, and invalid `--write` generated files now write conversion reports with invalid details before exiting non-zero without mutating quiz data.

## 2026-05-12 — Task 4 validator

- No unresolved blockers.
- `node scripts/validate-supporting-data.mjs` still fails on unrelated reaction notation/equation parsing records; this is expected and not a quiz validator issue.
- All six negative self-check fixtures (`duplicate-options`, `placeholder`, `missing-generation-source`, `invalid-correct-index`, `invalid-difficulty`, `missing-source-references`) are correctly rejected.
- Evidence files written with actual command output.

## 2026-05-12 — Task 5 first organic conversion

- No unresolved blockers for the first organic MCQ conversion batch.
- `npm run build` exits 0 after conversion; Vite still reports the existing large chunk-size warning for `assets/index-*.js`.
- Placeholder grep on `.sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json` found no forbidden terms (`待复核`, `TODO`, `请补充`, `待填写`, `依据来源片段补全标准答案`, `placeholder`).

## 2026-05-12 — Task 6 remaining batch map

- No unresolved blockers for the mapping/readiness task.
- LSP diagnostics are not configured for `.md` or `.txt` evidence files in this workspace; verification used converter dry-run exit code, Node count/hash checks, and grep checks instead.
- `git diff -- src/data/quizData.json src/data/quizData.js` reflects pre-existing Task 5 runtime data changes against `HEAD`, so dry-run safety was verified by immediate before/after SHA-256 hashes instead of by an empty git diff.

## 2026-05-12 — Task 7 browser QA

- No unresolved browser-QA blockers. Subagent-based Task 7 attempts timed out repeatedly, so Atlas performed the required Playwright verification directly.
- Browser console contained one non-blocking unrelated error: `GET /favicon.ico 404`; no generated-quiz flow errors were observed.

## 2026-05-12, Task 8 operator documentation

- No unresolved blockers for the operator guide and report reconciliation task.
- LSP diagnostics are not configured for `.md` evidence or notepad files in this workspace, so verification used file reads, runtime Node reconciliation, quiz data validation, and production build output.

## 2026-05-12 — F1/F4 Final Verification Wave REJECT correction

- F1 Plan Compliance Audit verdict: REJECT because `src/modules/quiz.js` added runtime short-answer normalization/distractor generation outside the data-pipeline scope, and `dist/index.html` build artifact changed.
- F4 Scope Fidelity verdict: REJECT for the same two blocking issues, plus root-level `generated-organic-mcq-live.png` was created by independent browser QA.
- Corrective actions applied:
  - Restored `src/modules/quiz.js` to HEAD state via `git checkout HEAD -- src/modules/quiz.js`.
  - Restored `dist/index.html` to HEAD state via `git checkout HEAD -- dist/index.html`.
  - Removed root-level `generated-organic-mcq-live.png` via `Remove-Item`.
  - Verified `git diff -- src/modules/quiz.js` and `git diff -- dist/index.html` both return empty.
  - Verified `Test-Path generated-organic-mcq-live.png` returns false.
  - `node scripts/validate-quiz-data.mjs` passes (all quiz records valid).
  - `npm run build` passes (exit 0); `dist/index.html` was restored again after build because build artifacts are out of scope.
- Preserved intact: `src/data/quizData.json` organic conversion, `scripts/convert-short-answer-mcqs.mjs`, `scripts/validate-quiz-data.mjs`, and all evidence under `.sisyphus/evidence/` including Task 7 screenshot and scoring markdown.
- Follow-up: Atlas verification ran `npm run build` and regenerated `dist/index.html`; restored it to HEAD again.

## 2026-05-12 — F4 REJECT correction (package.json line-ending-only diff)

- F4 rerun REJECTED because `package.json` had a line-ending-only git diff despite no semantic dependency changes.
- Corrective action applied: `git checkout HEAD -- package.json` (file-specific restore).
- Verification after restore:
  - `git diff -- package.json` returns empty.
  - `git diff -- package-lock.json pnpm-lock.yaml yarn.lock bun.lockb` returns empty.
  - `git diff -- src/modules/quiz.js dist/index.html` returns empty.
  - `Test-Path generated-organic-mcq-live.png` returns false.
- No build was run; no other files were touched.
