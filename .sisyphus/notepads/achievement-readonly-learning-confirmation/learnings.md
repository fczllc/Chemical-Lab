## 2026-05-20 Task: achievement action rows
- User confirmed achievements are read-only and will manually test.
- Removed manual-review action row: no `去学习`, no `通过学习完成`, no progress navigation action.
- Removed learned-elements hint row `通过周期表查看元素实现`; learned-elements no longer returns a periodic-table action target, preventing fallback to `去学习元素`.
- Verification performed despite no Playwright request: `grep` found no `去学习`, `通过学习完成`, `通过周期表查看元素实现`, or `data-achievement-action="progress"` in `src/modules/achievements.js`; LSP diagnostics were clean; `npm run build` exited 0.
