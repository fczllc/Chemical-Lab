Browser lab route QA deferred for Task 6 by instruction: do not use Playwright, npm run dev, npm run preview, or start/restart Vite/frontend services because the user reported frequent frontend service restarts.

Static and command verification used instead:
- npm run validate:curriculum
- npm run validate:supporting
- node scripts/validate-curriculum.mjs --self-check-invalid invalid-experiment-unlock
- npm run build
- LSP diagnostics on changed JS/MJS files
