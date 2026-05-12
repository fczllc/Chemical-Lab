# Task 1 Evidence: Unconvertible Record Rule

## Date
2026-05-11

## Rule Definition

A `shortAnswer` quiz record is **unconvertible** to a four-option MCQ if and only if the canonical answer extraction yields no usable string.

### Canonical Extraction Order

1. `question.answer` — first non-empty string
2. `question.standardAnswer` — first non-empty string
3. `question.correctAnswer` — first non-empty string
4. `question.expectedAnswer` — first non-empty string
5. `question.options[question.correctIndex]` — **only if** it does **not** contain the substring `待复核`

If all five steps fail, the record is **unconvertible**.

## Why This Rule Exists

- The renderer (`renderQuestionMarkup` → `renderOptionButton`) unconditionally renders every element of `question.options` as a clickable button.
- Buttons must contain meaningful answer text; placeholder text like `待复核：依据来源片段补全标准答案。` is not a valid answer choice.
- The `explanation` field is also unsuitable because it is meant for post-answer feedback, not for the answer itself.

## Concrete Example (Unconvertible)

**Record ID**: `textbook-rj-chemistry-g12-selective-3-organic-2019-knowledge-topic-0002-source-section-l6-l38-d782b15af6-promote-knowledge-topic-0002-source-section-l6-l38-d782b15af6-quiz-quiz-0002-source-section-l6-l38-d782b15af6`

| Field | Value | Usable? |
|-------|-------|---------|
| `answer` | `undefined` | No |
| `standardAnswer` | `undefined` | No |
| `correctAnswer` | `undefined` | No |
| `expectedAnswer` | `undefined` | No |
| `options[0]` | `"待复核：依据来源片段补全标准答案。"` | No (contains `待复核`) |

**Result**: UNCONVERTIBLE

## Impact on Session Creation

- `createSession` (full) and `getQuickQuizQuestions` (quick) both draw from the same unfiltered `quizData` pool.
- If an unconvertible record is selected, the user sees a single button with placeholder text and cannot meaningfully answer.
- Task 2 must therefore **filter or transform** `shortAnswer` records at the session-prep boundary, not at render time.

## Decision: Exclude or Transform?

- **Exclude**: Drop unconvertible records from the session pool. Simplest, preserves renderer contract.
- **Transform**: For convertible records, generate 3 distractors + the extracted correct answer, shuffle, and update `correctIndex`. More complex, requires distractor generation logic.

Task 2 will implement whichever approach the plan specifies. This document only defines the classification boundary.
