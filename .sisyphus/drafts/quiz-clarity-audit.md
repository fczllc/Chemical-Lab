# Draft: Quiz Clarity Audit

## Requirements (confirmed)
- User reported screenshot-like quiz wording is unacceptable: “这种表述根本体现不出来要问什么，还得让人去查书才知道，肯定不行。”
- Need check all quiz questions for clear standalone expression, not requiring learners to consult textbook content to infer what is being asked.

## Technical Decisions
- Treat this as a data-quality/root-cause planning task, not an immediate code edit.
- Initial audit pattern targets questions like `学习“...”这一片段，应该掌握哪条事实？`, answers/explanations containing raw教材片段, and bracket placeholders such as `[问题]`/`[答案]`.
- Hard decision: remove the 63 exact vague-fragment records from canonical `src/data/quizData.json` first; do not hide them with a runtime-only Full Quiz filter, because Quick Quiz must be protected too.
- Hard decision: every learner-facing `教材` occurrence in `question`, `options`, and `explanation` must be classified in audit evidence as `allowed`, `rewrite`, or `remove` with a reason before final completion.
- Hard decision: add `node scripts/validate-quiz-data.mjs` into `npm run validate:all:safe` so clarity validation becomes part of the normal safe validation pipeline.

## Standalone Clarity Rubric
- HARD FAIL: question stem references unseen context instead of asking a concrete concept, e.g. `学习“...”这一片段，应该掌握哪条事实？`, `这一片段`, `上述材料`, `根据教材正文`, `教材图...说明` when the image/text is not included in the prompt.
- HARD FAIL: answer option is the raw教材 excerpt instead of a concise answer choice.
- HARD FAIL: explanation says only `教材片段说明：...` without explaining the concept in learner-friendly terms.
- REWRITE: source-anchored stem can become standalone by replacing `根据教材...` with the actual concept question while preserving `sourceReferences`/`generationMetadata`.
- ALLOW: `教材` appears only in provenance/source metadata, or in an explanation that is still self-contained and does not require opening the textbook.
- REMOVE: source content is too broad/ambiguous to rewrite safely without inventing facts.

## Research Findings
- `src/data/quizData.json` currently has 556 quiz records.
- Direct Node audit found 63 records matching the vague textbook-fragment wording pattern.
- Representative root-cause symptom: generated textbook questions use a source heading/excerpt as the prompt and put the textbook excerpt itself as an option/explanation, so the learner must infer the real question from source text.
- No raw grep hits for ASCII quote variants because the data uses Chinese curly quotes and the file is large; Node JSON parsing confirmed hits reliably.
- Background audit `bg_fb4ab8da` initially exhausted `proxy-gemini/gemini-3.1-flash-lite-preview`, then succeeded on fallback `proxy-gemini/gpt-5.4-mini` in session `ses_187cb7bd2ffeojWXlkUy1KLhvt`.
- Subagent confirmed root cause: textbook-driven conversion/promotion preserves source-language framing; validators check structure/placeholders/provenance but not semantic standalone clarity.
- Subagent found additional explicitly source-anchored examples: `quiz-c60-structure-source`, `quiz-c60-carbon-allotrope`, `quiz-c60-reviewed-formula-application`; coarse `教材` occurrence count is 455 but includes explanations/provenance and is not a question count.

## Open Questions
- None blocking. Defaults are fixed above: remove exact 63 vague-fragment records first; classify all remaining learner-facing source anchors; rewrite only safely source-backed items; remove ambiguous ones.

## Scope Boundaries
- INCLUDE: all records in `src/data/quizData.json`, validator/test coverage for unclear wording, source-reference preservation for rewritten textbook-derived records.
- EXCLUDE: changing Full Quiz gameplay mechanics, changing `FULL_QUIZ_COUNT = 20`, broad textbook mining beyond clarity remediation.
