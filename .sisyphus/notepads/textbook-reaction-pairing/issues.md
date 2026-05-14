
## Task 1 tooling gotcha - 2026-05-13
- The dedicated Glob/Grep tools did not enumerate or match src/data/textbooks/**/book.md in this Unicode textbook tree even though direct Read calls succeeded. The implemented extractor avoids that tooling limitation by using deterministic Node eaddir traversal over src/data/textbooks/.


## Task 3 boundary observation - 2026-05-13
- The runtime boundary validator currently scans src/ for forbidden imports of generated/ and reviewed/ paths, but does not explicitly flag imports of sibling files under textbookIngestion/ (like reactionEquationReview.json).
- This is acceptable because the manifest is not imported by any runtime module, but a future enhancement could add a broader textbookIngestion/* exclusion check if more ingestion artifacts are created at this level.

## Task 4 worktree observation - 2026-05-13
- `git diff -- src/data/reactions.json` showed an existing unstaged runtime-data diff during verification; the Task 4 generator was run only in fail-closed `--check` mode and a before/after SHA-256 rerun proved it did not mutate `src/data/reactions.json`.

## Task 6 validation observations - 2026-05-13
- Full extraction validation intentionally fails in the current schema-only manifest state: `reviews` is empty while the extractor currently emits 638 candidates.
- Reaction game-pool purity intentionally fails in the current runtime state because the actual game-usable pool still includes hand-authored records without textbook source contracts and two promoted textbook records missing `sourceKind: "textbook"`.
- A PowerShell append attempt with Markdown backticks failed because backticks were interpreted as escape characters; verbatim here-strings are safer for append-only notepad updates.

## Task 7 aggregate safety decision - 2026-05-13
- validate:all:safe intentionally excludes validate:textbook-reactions and validate:reaction-game-pool until Task 8 completes review and promotion.
- Adding them now would cause validate:all:safe to exit non-zero and break unrelated CI-like workflows that rely on the safe aggregate.

## Task 8 generator notation contract - 2026-05-13
- Initial game-pool validation after reviewed generation failed only on notation fields: raw extractor LaTeX in generated `equationText` is not renderable by `equationToLatex`, and `notationReviewStatus` was absent.
- Fixed `scripts/textbook/build-reviewed-reactions.mjs` so future generated records use a simple renderable formula-pair `equationText` derived from reviewed `reactants[]`/`products[]` and set `notationReviewStatus: reviewed`.
- PowerShell does not support Bash heredoc syntax (`node - <<'NODE'`); for ad hoc Node helpers in this repo, use `node -e` or pipe a PowerShell verbatim here-string to `node`.

## Task 8 retry evidence naming - 2026-05-13
- The retry request expected `.sisyphus/evidence/task-8-game-pool-report.json`; earlier evidence existed as `task-8-game-pool-validation.json`, so the validator was rerun with the exact requested report path and console output captured to `task-8-game-pool-validator.txt`.

## Task 5 UI-test boundary observation - 2026-05-13
- `GIT_MASTER=1 git status --porcelain` still shows the existing untracked `tests/ui/reaction-game-completion.spec.ts` from the separate reaction-pairing completion workstream; Task 5 did not add or edit Playwright specs.
- The glob tool did not enumerate `tests/**/*.spec.ts` in this workspace even though git status reports the file, so git status is the reliable audit trail for this observation.

## Task 9 evidence path correction - 2026-05-13
- The initial Task 9 path list expected `.sisyphus/evidence/task-6-game-pool-validator.txt`, but actual Task 6 evidence is `.sisyphus/evidence/task-6-game-pool-fail-closed.txt` plus `.sisyphus/evidence/task-6-game-pool-report.json`.
- The final summary references the existing Task 6 files, and `.sisyphus/evidence/task-9-evidence-paths.txt` verifies every listed evidence path exists.
