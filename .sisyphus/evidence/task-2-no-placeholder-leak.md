# Task 2 Evidence: No Placeholder Leak

## Date
2026-05-12

## Guarantee
No option string containing `待复核` can reach `renderOptionButton()` in any quiz session.

## How the Guarantee is Enforced
1. `isValidMCQ(question)` returns `false` for any question whose options contain `待复核`.
2. `extractCanonicalAnswer(question)` rejects `options[correctIndex]` if it contains `待复核`.
3. `normalizeQuestion(question)` returns `null` for unconvertible records (including all current `shortAnswer` records).
4. `prepareSessionQuestions(sourceQuestions, desiredCount)` only includes questions where `normalizeQuestion` returns a non-null object.
5. `createSession()` passes the shuffled raw pool through `prepareSessionQuestions`, so only normalized (valid) questions enter `quizSession.questions`.
6. `renderQuestionMarkup()` renders `question.options` blindly, but by this point every option array has been validated and cloned.

## Verification
- `npm run build` passes with no errors.
- No automated validation script is kept in the repository (manual QA only per user selection).

## Files
- `src/modules/quiz.js` — normalization boundary implemented.
