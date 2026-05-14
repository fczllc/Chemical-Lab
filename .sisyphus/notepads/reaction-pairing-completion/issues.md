- Task 1: Initial 
pm run validate:data surfaced existing promoted-content consistency issues (difficulty labels 基础/挑战/进阶 and one unreviewed structured equationText). Resolved by accepting the promoted labels in the validator and removing the unreviewed structured equation field while retaining prose source content.
- Task 1 correction: Initial npm run validate:data surfaced existing promoted-content consistency issues (difficulty labels 基础/挑战/进阶 and one unreviewed structured equationText). Resolved by accepting promoted labels in the validator and removing the unreviewed structured equation field while retaining prose source content.
- Task 1 review fix: Post-implementation review found the raw Markdown boundary missed Vite query imports like .md?raw and the reaction game sampled all runtime reactions. Fixed query-aware import validation and filtered the reaction game pool to contract-valid records.

- 2026-05-12 Task 2: g is not installed in this environment; use git grep for repository-local key evidence capture.

- 2026-05-12 Task 2 correction: rg is not installed in this environment; use git grep for repository-local key evidence capture.

- 2026-05-12 Task 3: Direct Playwright click on [data-game="reaction"] from the default home route was intercepted by the active periodic-table layer; navigating with data-testid="nav-games" before clicking the reaction card produced stable browser QA. Browser console also reported only a favicon.ico 404 during this run.

- 2026-05-12 Task 4: Initial browser QA exposed that promoted textbook reaction summaries could show raw `knowledge-topic-*` tags and overlong source prose. Fixed by mapping unknown knowledge-topic tags to a readable `教材知识点` label, including grade/chapter when present, and trimming reaction descriptions to a single short insight.

- 2026-05-12 Task 5: Initial completion/wrong-match spec runs used a broad `.hud-shell-header h3` locator, which also matched the detail-panel prompt heading; fixed by scoping game heading and scoreboard assertions to `data-testid="active-game-stage"`.

- 2026-05-12 Task 6: Initial revisit helper spec timed out because it looked for label 当前得分 after completion, but the completion result screen uses 最终得分. Corrected label and rerun successfully. This is an environment/selector gotcha, not a product bug.
