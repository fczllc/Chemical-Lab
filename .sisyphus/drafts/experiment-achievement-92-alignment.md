# Draft: Experiment Achievement 92 Alignment

## Requirements (confirmed)
- 用户确认按建议修改：实验室 92 个实验应与成就/进度统计一致。
- 实验成就不应继续停留在旧版 1/5 个实验设计。
- 进度模块不应继续硬编码 `TOTAL_EXPERIMENTS = 5`。

## Technical Decisions
- 实验总数应从 `src/data/labExperiments.json` / `labExperiments.length` 派生。
- 实验成就建议扩展为 1、5、20、50、92 五档。
- 保留现有 `completedExperiments` 状态字段和 `completedExperiments` 条件类型。

## Research Findings
- `src/data/labExperiments.json` 当前有 92 条实验。
- `src/data/achievementsData.json` 当前实验类成就只有 2 条：`achievement-first-experiment` count 1，`achievement-lab-safety` count 5。
- `src/modules/achievements.js:152-154` 用 `getCompletedExperiments().size >= condition.count` 判断实验成就。
- `src/modules/progress.js:20` 仍硬编码 `const TOTAL_EXPERIMENTS = 5`。
- `src/modules/storage.js:942-959` 已有 `markExperimentCompleted(experimentId)`，状态结构支持任意数量实验。

## Open Questions
- 无阻塞问题；用户已确认“按这个改”。

## Scope Boundaries
- INCLUDE: 更新实验成就数据、进度实验总数来源、相关文案/校验。
- EXCLUDE: 不改实验完成状态结构，不改实验室实验内容，不新增实验完成机制。
