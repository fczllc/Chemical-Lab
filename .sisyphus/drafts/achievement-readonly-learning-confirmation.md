# Draft: Achievement Readonly Learning Confirmation

## Requirements (confirmed)
- 成就模块是只读、查看成果用途，不应继续提供“去学习”跳转按钮功能。
- 取消成就卡片顶部/操作区的“去学习”按钮。
- 将该位置改为只读文本标签：`通过学习完成`。
- 样式与“通过周期表查看元素实现”这个标签一致。
- 字体大小统一改为 `8rem`。
- 用户截图确认：目标是卡片底部那一行操作/提示区域，当前前四个显示“通过周期表查看元素实现”，第五个显示“去学习”；需要把这行统一为只读文字样式。
- 不需要边框，直接显示文字即可。
- 用户会手动测试。

## Technical Decisions
- 待代码定位后确认具体文件、函数、CSS selector。
- 计划只移除成就模块内该按钮的交互/跳转，不改变学习模块内确认/完成逻辑。

## Research Findings
- `src/modules/achievements.js:62-87`：`handleAchievementActionClick()` 处理 `[data-achievement-action]` 点击，写入 `sessionStorage.achievementActionFocus` 并 `navigateTo(targetSection)`。
- `src/modules/achievements.js:239-260`：`getAchievementActionTarget()` 将 `manualReviewAfterPromotion` 指向 `progress`，这是“去学习”的跳转来源。
- `src/modules/achievements.js:263-285`：`getAchievementActionLabel()` 将 `manualReviewAfterPromotion` 显示为 `去学习`。
- `src/modules/achievements.js:295-324`：`renderAchievementCard()` 中 `learnedElements` 已使用 `<span class="achievement-action-hint">通过周期表查看元素实现</span>`；其他有 target 的条件渲染 `<button class="achievement-action-btn" ...>`。
- `src/styles/achievements.css:247-310`：`.achievement-action-btn` 和 `.achievement-action-hint` 样式；当前 `.achievement-action-hint` 仍有 border/background，字体是 `0.85rem`。

## Open Questions
- 无阻塞问题；用户已确认 `8rem`。

## Scope Boundaries
- INCLUDE: 成就模块“去学习”按钮/跳转改为只读文本标签 `通过学习完成`。
- INCLUDE: 对应样式改为无边框文字，并使用 `8rem`。
- EXCLUDE: 不改学习模块确认逻辑本身。
- EXCLUDE: 不新增自动化测试要求；用户声明手动测试。
