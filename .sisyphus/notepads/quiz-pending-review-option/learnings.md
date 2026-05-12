# Learnings: quiz-pending-review-option

## 2026-05-11 Task: session-start
- Plan read from `.sisyphus/plans/quiz-pending-review-option.md`.
- User selected conversion of `shortAnswer` questions to four-option MCQ in full challenge.
- User selected manual QA only: do not add new Playwright spec files or mandatory automated tests.

## 2026-05-12 Task 1: Confirm Quiz Data Contract and Normalization Boundary
- **Runtime import path**: `src/modules/quiz.js:2` → `../data/index.js` → `quizData.json` (JSON import with `type: 'json'`). `src/data/quizData.js` is NOT on the runtime import path.
- **Session creation**: `createSession()` at `src/modules/quiz.js:527-556` shuffles full `quizData` and slices 20 for full mode; `getQuickQuizQuestions()` at `558-570` does the same for quick mode (5 questions). No category filtering.
- **Renderer contract**: `renderQuestionMarkup()` at `254-306` + `renderOptionButton()` at `329-348` requires exactly 4 options, `correctIndex` in 0..3, and no option containing `待复核`. Renderer does not inspect `category`.
- **Answer extraction priority** (for Task 2 adapter): `answer` → `standardAnswer` → `correctAnswer` → `expectedAnswer` → `options[correctIndex]` (only if no `待复核`).
- **Manual classification**: Record `textbook-rj-chemistry-g12-selective-3-organic-2019-knowledge-topic-0002-source-section-l6-l38-d782b15af6-...` is **UNCONVERTIBLE** — all extraction steps yield nothing usable.
- **Quick quiz shares the same issue**: Both modes use the same unfiltered pool and same renderer, so normalization must apply to both or be mode-aware.
- **Evidence files created**: `.sisyphus/evidence/task-1-quiz-contract.md` and `.sisyphus/evidence/task-1-unconvertible-rule.md`.
- **No source behavior changed** in this task.

## 2026-05-12 Task 2: Implement Non-Mutating ShortAnswer-to-MCQ Session Adapter
- **Helpers added** to `src/modules/quiz.js`:
  - `extractCanonicalAnswer(question)` — implements canonical extraction priority exactly as Task 1 defined.
  - `isValidMCQ(question)` — checks 4 options, `correctIndex` in 0..3, no `待复核`.
  - `isConvertibleShortAnswer(question)` — `category === 'shortAnswer'` with usable canonical answer.
  - `buildDistractorPool()` — scans valid MCQs in `quizData` to collect unique option strings.
  - `generateDistractors(correctAnswer, count, preferredScope)` — prefers scoped matches, falls back to global pool, deduplicates, excludes `待复核`.
  - `normalizeQuestion(question)` — clones valid MCQs; converts convertible shortAnswer into 4-option MCQ with shuffled options and recalculated `correctIndex`; returns `null` for unconvertible records.
  - `prepareSessionQuestions(sourceQuestions, desiredCount)` — iterates shuffled source, normalizes each, stops when desired count reached.
- **Integration points**: `createSession()` passes raw shuffled pools to `prepareSessionQuestions`; `getQuickQuizQuestions()` returns full ordered candidate pools without slicing so normalization can preserve count.
- **Mutation safety**: valid MCQs get cloned option arrays; converted shortAnswer records build fresh option arrays. Original `quizData` records are not mutated.
- **Data reality discovered**: current `quizData.json` has 512 `shortAnswer` records and all are unconvertible; 26 existing four-option MCQs are valid.
- **Count preservation**: current data can fill full sessions with 20 valid MCQs and quick sessions with 5 valid MCQs.
- **Build**: `npm run build` passes.
- **Evidence files**: `.sisyphus/evidence/task-2-converted-shortanswer-options.md` and `.sisyphus/evidence/task-2-no-placeholder-leak.md`.

## 2026-05-12 Task 2 Correction: Scope and Logic Fix
- **Issue discovered in review**: `normalizeQuestion()` could create malformed MCQs when `generateDistractors()` returned fewer than 3 distractors, resulting in fewer than 4 options.
- **Fix applied** to `src/modules/quiz.js`:
  - After `generateDistractors(correctAnswer, 3, ...)`, explicitly check `if (distractors.length < 3) return null;`.
  - After building `options`, explicitly verify `options.length === 4`, `correctIndex !== -1`, and no option contains `待复核` before returning the converted question.
- **Unauthorized file removed**: `scripts/validate-quiz-normalization.mjs` was deleted because Task 2 did not authorize adding validation scripts or automated test files.
- **Evidence files updated**: Removed references to the deleted validation script from `.sisyphus/evidence/task-2-converted-shortanswer-options.md` and `.sisyphus/evidence/task-2-no-placeholder-leak.md`.
- **Behavior preserved**: Valid MCQs still pass through non-mutating. `prepareSessionQuestions` still scans the shuffled pool until desired count or exhaustion. No changes to `quizData.json` or other modules.

## 2026-05-12 Task 3: Preserve Existing Validator Behavior While Adding Runtime Guard Evidence
- **Validator executed**: `node scripts/validate-supporting-data.mjs` exited with code 1.
- **Failure analysis**: Two pre-existing data errors in reaction `textbook-rj-chemistry-g12-selective-3-organic-2019-knowledge-topic-0015-1-1-l155-l173-c71806e98a-promote-knowledge-topic-0015-1-1-l155-l173-c71806e98a-experiment-experiment-0015-1-1-l155-l173-c71806e98a`:
  1. `notationReviewStatus` must be `reviewed` to use `formulaText/equationText`.
  2. `equationText` cannot be parsed by the enhanced chemistry notation renderer: `2Na + 2H2O → 2NaOH + H2↑；2Na + 2C2H5OH → 2C2H5ONa + H2↑`.
- **These errors are unrelated to Task 1/2 changes**: They concern a promoted textbook reaction record with notation fields, not quiz MCQ conversion or the session adapter.
- **Validator left unmodified**: `scripts/validate-supporting-data.mjs` was not edited. The validator validates canonical data; runtime adapter in `src/modules/quiz.js` normalizes session questions independently.
- **No spec files added**: `glob("tests/**/*.spec.ts")` returned no files; git status shows no changes under `tests/`.
- **Unauthorized script confirmed absent**: `scripts/validate-quiz-normalization.mjs` does not exist.
- **Evidence files created**: `.sisyphus/evidence/task-3-validate-supporting.txt` and `.sisyphus/evidence/task-3-no-spec-files.md`.

## 2026-05-12 Task 4: Agent-Executed Browser QA and Scoring Verification
- **Dev server QA**: Ran the app at `http://127.0.0.1:5173/` with `npm run dev -- --host 127.0.0.1 --port 5173`.
- **Launch path**: The visible `开始完整测验` button existed, but Playwright's real click was blocked by the open detail panel intercepting pointer events; used the allowed `startfullquiz` browser event fallback and documented it in evidence.
- **Full challenge render**: Browser QA observed `FULL QUIZ PROTOCOL`, mode badge `20题完整挑战`, progress `第 1 / 20 题`, score `0/20`, and exactly 4 rendered options for `下列哪一种卤素常用于碘盐和皮肤消毒？`: `A 碘`, `B 氟`, `C 氯`, `D 砹`.
- **Placeholder guard**: No rendered question/category/option text contained `待复核`.
- **Correct flow**: Selecting `A 碘` produced score `1/20`, feedback `回答正确！碘 是正确答案。`, marked the option `is-selected is-correct`, disabled all options, and enabled `下一题`.
- **Incorrect flow**: In a fresh full challenge, selecting `A 氮` for `空气中帮助我们呼吸、也支持燃烧的元素是哪一种？` produced score `0/20`, feedback `这题答错了，正确答案是 氧。`, marked `A 氮` as `is-selected is-wrong`, marked `B 氧` as `is-correct`, and enabled `下一题`.
- **Navigation**: Clicking `下一题` after the incorrect answer advanced to `第 2 / 20 题`, preserved score `0/20`, reset feedback, and disabled `下一题` until the next answer.
- **Console**: Only console error was unrelated favicon 404; warnings were 0.
- **Evidence files**: `.sisyphus/evidence/task-4-full-challenge-four-options.png`, `.sisyphus/evidence/task-4-full-challenge-options.md`, `.sisyphus/evidence/task-4-scoring-correct.png`, `.sisyphus/evidence/task-4-scoring-incorrect.png`, `.sisyphus/evidence/task-4-console-warnings.txt`.
- **Source/build**: No source files changed and no `data-testid` additions were needed, so `npm run build` was not required for this QA task.
