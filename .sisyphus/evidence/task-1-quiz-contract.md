# Task 1 Evidence: Quiz Data Contract and Normalization Boundary

## Date
2026-05-11

## 1. Import Path Verified

- **Runtime import**: `src/modules/quiz.js:2` imports `{ quizData }` from `../data/index.js`.
- **Re-export**: `src/data/index.js:4` imports `quizDataset` from `./quizData.json` (JSON with `{ type: 'json' }`), then re-exports `export const { quizData } = quizDataset;` at line 32.
- **Canonical data**: `src/data/quizData.json` is the single source of truth. `src/data/quizData.js` exists but is **not** consumed by the runtime import path; it appears to be a parallel JS module (possibly for build tooling or legacy). The runtime only reads the JSON file via `index.js`.

## 2. Session Creation Path Verified

- **Full quiz session**: `createSession({ mode, element })` at `src/modules/quiz.js:527-556`.
  - For `mode === 'full'`: `shuffleArray([...quizData]).slice(0, FULL_QUIZ_COUNT)` where `FULL_QUIZ_COUNT = 20` (line 15).
  - No filtering by `category` or `questionType` occurs here; the full pool is shuffled and sliced raw.
- **Quick quiz session**: Same `createSession` function, but questions come from `getQuickQuizQuestions(element)` at `src/modules/quiz.js:558-570`.
  - Also uses raw `quizData` with no category filtering.
- **Both modes share the same renderer**: `renderQuestionMarkup(question)` at `src/modules/quiz.js:254-306` renders `question.options.map(...)` unconditionally.

## 3. Renderer Contract (Session → Renderer)

The renderer (`renderQuestionMarkup` + `renderOptionButton`) imposes the following binary contract on every question object that reaches it:

1. `options` must be an **array of exactly 4 strings**.
2. `correctIndex` must be an **integer in the range 0..3**.
3. **No option string may contain the substring `待复核`** (this text must not reach rendered answer buttons).
4. The renderer does not inspect `category`, `questionType`, or any other metadata field; it blindly trusts `options` and `correctIndex`.

Violations observed in current data:
- `shortAnswer` records have `options.length === 1` (e.g., `["待复核：依据来源片段补全标准答案。"]`).
- `correctIndex` is `0`, which is valid, but the single option contains `待复核`.
- If such a record is chosen into a session, the renderer will emit one button labeled "A. 待复核：依据来源片段补全标准答案。" and the user has no meaningful choice.

## 4. Canonical Answer Extraction Rule (for Task 2 Adapter)

When converting a `shortAnswer` record to a four-option MCQ, the canonical correct answer text must be extracted in this exact priority order:

1. First non-empty string from `question.answer`.
2. First non-empty string from `question.standardAnswer`.
3. First non-empty string from `question.correctAnswer`.
4. First non-empty string from `question.expectedAnswer`.
5. `question.options[question.correctIndex]` **only if** that string does **not** contain `待复核`.

If none of the above yields a usable string, the record is **unconvertible** and must be excluded from the session (or handled by a different UI path).

## 5. Manual Classification Example

**Record ID**: `textbook-rj-chemistry-g12-selective-3-organic-2019-knowledge-topic-0002-source-section-l6-l38-d782b15af6-promote-knowledge-topic-0002-source-section-l6-l38-d782b15af6-quiz-quiz-0002-source-section-l6-l38-d782b15af6`

```json
{
  "id": "...",
  "question": "既然如此，在元素周期表的百余种元素中，为什么只有碳元素独领风骚，它的化合物能够自成一类呢？",
  "options": ["待复核：依据来源片段补全标准答案。"],
  "correctIndex": 0,
  "category": "shortAnswer",
  "answer": null,
  "standardAnswer": null,
  "correctAnswer": null,
  "expectedAnswer": null,
  "explanation": "待复核：依据来源片段补全标准答案。"
}
```

**Extraction attempt**:
- `answer`: absent → skip
- `standardAnswer`: absent → skip
- `correctAnswer`: absent → skip
- `expectedAnswer`: absent → skip
- `options[0]`: `"待复核：依据来源片段补全标准答案。"` → contains `待复核` → **rejected**

**Classification**: **UNCONVERTIBLE** — no usable answer text available; must be excluded from button-rendered sessions.

## 6. Quick Quiz Impact

Because `getQuickQuizQuestions` also draws from the full unfiltered `quizData` pool, a quick quiz can theoretically hit the same `shortAnswer` records. However:
- The quick quiz only selects 5 questions.
- The probability is lower because the full pool contains many valid MCQ records.
- The **same renderer contract applies**, so the same normalization boundary should ideally protect both modes.

## 7. Source Comment Location (optional)

If a local contract comment is added to `src/modules/quiz.js`, it should be placed immediately above `createSession` (line 527) or inside the `questions` mapping block, documenting the expected shape of session questions. No behavior changes are made in this task.

## 8. Files Changed

- `.sisyphus/evidence/task-1-quiz-contract.md` (this file) — created.
- `.sisyphus/evidence/task-1-unconvertible-rule.md` — created.
- `src/modules/quiz.js` — no changes (no source comment added; not required).

## 9. Source Behavior Changed?

**No.** This task is documentation-only. No runtime code was modified.

## 10. Enough Facts for Task 2?

**Yes.** Task 2 can implement the adapter without further user questions:
- The exact import path (`quizData` from `../data/index.js`) is known.
- The exact session creation function (`createSession`) and its line range (527-556) are verified.
- The renderer contract (4 options, `correctIndex` 0..3, no `待复核`) is documented.
- The canonical answer extraction priority is defined.
- A concrete unconvertible example is classified.
- Both full and quick quiz modes share the same pool and renderer, so the same normalization applies.
