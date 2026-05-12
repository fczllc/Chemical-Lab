# Task 4 Browser QA: Full Challenge Options and Scoring

Timestamp: 2026-05-12

## Launch path

- App URL: `http://127.0.0.1:5173/`
- Required local dev command used: `npm run dev -- --host 127.0.0.1 --port 5173`
- Preferred UI route attempted: visible `开始完整测验` button on `[data-testid="full-quiz-primary-card"]`.
- Fallback used: `window.dispatchEvent(new CustomEvent('startfullquiz'))` because the open element detail panel intercepted the real Playwright click on the visible button.
- Source changes: none. Existing selectors `.quiz-option-btn` and `[data-quiz-next]` were sufficient; no `data-testid` attributes were added.

## Full challenge first-question render

- Screenshot: `.sisyphus/evidence/task-4-full-challenge-four-options.png`
- Modal visible: yes
- Protocol text: `FULL QUIZ PROTOCOL`
- Heading: `元素知识挑战`
- Mode badge: `20题完整挑战`
- Progress text: `第 1 / 20 题`
- Score text: `0/20`
- Category: `安全知识`
- Question: `下列哪一种卤素常用于碘盐和皮肤消毒？`
- Option count: 4
- Rendered options:
  1. `A 碘`
  2. `B 氟`
  3. `C 氯`
  4. `D 砹`
- Placeholder absence: no rendered question/category/option text contained `待复核`.
- Initial navigation state: `下一题` button disabled until an answer is selected.

## Correct-answer flow

- Screenshot: `.sisyphus/evidence/task-4-scoring-correct.png`
- Method: selected visible correct option `A 碘` for the iodized-salt / skin-disinfection question.
- Score after answer: `1/20`
- Progress after answer: `第 1 / 20 题`
- Feedback: `回答正确！碘 是正确答案。`
- Explanation: `碘属于卤素，常用于碘盐补充和部分皮肤消毒用品中，但使用时也要遵循安全规范。`
- Option state: `A 碘` had classes `quiz-option-btn is-selected is-correct`; all options disabled after answer.
- Navigation state: `下一题` button enabled after answer.

## Incorrect-answer flow

- Screenshot: `.sisyphus/evidence/task-4-scoring-incorrect.png`
- Method: started fresh full challenge sessions and used visible feedback as the QA oracle; selected the first rendered option until the UI produced wrong-answer feedback. Attempt 1 selected `A 铀` and was correctly marked correct; attempt 2 produced the incorrect-answer evidence below.
- Fresh session progress before answer: `第 1 / 20 题`
- Fresh session score before answer: `0/20`
- Category: `基础认识`
- Question: `空气中帮助我们呼吸、也支持燃烧的元素是哪一种？`
- Options:
  1. `A 氮`
  2. `B 氧`
  3. `C 氦`
  4. `D 氖`
- Selected answer: `A 氮`
- Score after answer: `0/20`
- Progress after answer: `第 1 / 20 题`
- Feedback: `这题答错了，正确答案是 氧。`
- Explanation: `氧气是空气中的重要成分之一，能帮助生物呼吸，也能让许多燃烧现象持续进行。`
- Option state: `A 氮` had classes `quiz-option-btn is-selected is-wrong`; `B 氧` had classes `quiz-option-btn is-correct`; all options disabled after answer.
- Navigation state after answer: `下一题` button enabled.
- Navigation verification: clicking `下一题` advanced to `第 2 / 20 题`, kept score at `0/20`, reset feedback to `请选择一个答案，系统会立刻显示反馈和解析。`, and disabled `下一题` again until the next answer.

## Console summary

- Console evidence file: `.sisyphus/evidence/task-4-console-warnings.txt`
- Errors: 1 unrelated favicon request failure: `Failed to load resource: the server responded with a status of 404 (Not Found) @ http://127.0.0.1:5173/favicon.ico:0`.
- Warnings: 0.

## Build note

- `npm run build` was not run because no selector/source changes were made in this QA task.
