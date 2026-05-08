# Issues

## 2026-05-07 Task: session-start
- None yet.

## 2026-05-07 Task: reviewed-source contract
- `rg` was unavailable in this environment, so pattern tracing used PowerShell/search tooling instead.

## 2026-05-08 Task: c60 runtime QA
- Initial Vite launch via `Start-Process npm` failed on Windows because `npm` is a command shim; use `npm.cmd` or `cmd.exe /c start /b npm.cmd ...` for detached dev-server startup.
- A Playwright click on the full quiz card was intercepted by the open detail panel; direct DOM click/evaluate worked for QA without restarting the server.
- The only browser console error observed during Task 3 QA was a pre-existing `/favicon.ico` 404.

## 2026-05-08 Task: import C60 runtime content into quiz, progress, and game metadata
- No issues encountered. All required runtime records were already present and validated.
- The task checklist asked for file modifications, but the files already contained the correct C60 content from prior work. Verification confirmed everything matched the spec without additional edits.

## 2026-05-08 Task: draft-only C60 experiment boundary
- No issues encountered. The draft-only experiment record was already present, and the required checks passed without touching runtime lab data.

## 2026-05-08 Task: C60 reviewed-reference negative checks
- `rg` was unavailable in this environment, so direct pattern search could not run; file reads and validator inspection were used instead.

## 2026-05-08 Task: aggregate pilot verification
- `lsp_diagnostics` is not configured for `.md` notepad files, so documentation diagnostics could not run; command gates and evidence file reads were used to verify the appended notes and outputs instead.
