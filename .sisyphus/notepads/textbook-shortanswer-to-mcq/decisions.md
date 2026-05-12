# Decisions — textbook-shortanswer-to-mcq

## 2026-05-11 — Inventory status definitions

- Classified records as `ready` only when runtime/candidate mapping is unique and local candidate plus source section plus non-empty source text are all resolved.
- Counted existing MCQs as non-`shortAnswer` records because textbook shortAnswer placeholders also have mechanical one-option `options` arrays.

## 2026-05-12 — Generation contract design decisions

- Chose `generationSource` field name over `generationModel` to avoid implying a specific AI provider; value format is `ai-mcq-generation-v1` or model identifier string.
- Required `generatedFromShortAnswer: true` boolean flag to distinguish generated records from hand-authored MCQs in the runtime data.
- Preserved all provenance fields unchanged via deep copy rather than reference sharing, to prevent accidental mutation during generation.
- Chose 13 validator rejection cases covering structural, content, and provenance violations; each case maps to a specific `INVALID_*` or `MISSING_*` error code for programmatic handling in Task 4.
- Decided against including `answer` field in generated records; the original shortAnswer placeholder is fully replaced by `options` + `correctIndex`.
- Chose to allow `relatedElement: null` when no single element is directly relevant, rather than omitting the field, for schema consistency.
- Decided to include `textbookAssetReferences`, `formulaText`, and `notationReviewStatus` as optional copied fields because they exist in some hand-authored MCQs and may be present in future textbook-generated records.
- Chose Chinese-first prompt template with child-friendly tone requirements, matching the app's target audience.
- Decided on explicit low-confidence skipping with reason logging instead of a `待复核` holding state, to avoid blocking the pipeline on uncertain items.

## 2026-05-12 — Post-verification corrections

- Fixed carbon atomic number example in prompt template: changed `碳填14` to `碳填6` (carbon is atomic number 6, not 14; 14 is silicon).
- Removed "for manual review" language from confidence/skipping policy; changed to "for operator visibility, with no human review gate" to align with no-human-review policy.
- Fixed Malformed Case 12: changed `correctIndex` from `2` (pointing to empty option) to `0` (pointing to valid option "氮气"), so the malformed reason is isolated to EMPTY_OPTION only.
- Verified no other human review gate language remains in the contract except where explicitly forbidden.

## 2026-05-12 — Converter implementation decisions

- Accepted generated JSON as an array, `{ records: [] }`, `{ mcqs: [] }`, `{ generated: [] }`, a single generated/skipped object, or an object keyed by runtime id; all records still map deterministically through the original runtime `id`.
- Chose to allow partial generated files in write mode after all supplied generated/skipped entries validate, reporting missing selected IDs instead of manufacturing placeholder MCQs.
- Chose atomic temp-write plus rename for `src/data/quizData.json` and an explicit non-`shortAnswer` stability check so the 26 hand-authored MCQs cannot be changed by conversion.

## 2026-05-12 — Validator design decisions

- Chose to validate `quizData` directly from `src/data/index.js` import, matching the pattern used by `validate-supporting-data.mjs` and `validate-curriculum.mjs`.
- Decided to validate all records for duplicate IDs and basic shape, but only apply strict generated-record rules to items with `generatedFromShortAnswer === true`.
- Chose not to reject existing `shortAnswer` placeholder records for containing placeholder text, as they are pre-conversion placeholders and not generated MCQs.
- Used `structuredClone` for self-check fixture injection to avoid mutating the imported runtime data.
- Chose six self-check modes covering the most common generation failures: duplicate options, placeholder text, missing generation source, invalid correctIndex, invalid difficulty, and missing source references.
- Normal mode reports hand-authored MCQ count for visibility; the minimum threshold is 26 to match the current inventory.

## 2026-05-12 — Task 5 conversion decisions

- Converted all 91 ready records in the first organic batch rather than skipping, because each record had sufficient local source context for a child-friendly chemistry MCQ.
- Used `generationSource: "ai-mcq-generation-v1-local-task-5"` plus a `generationMetadata` object to identify the local source-context conversion method without adding provider credentials or dependencies.
- Preserved original runtime provenance by copying `sourceVolumeId`, `sourceReviewStatus`, and `sourceReferences` from `src/data/quizData.json` while letting the converter normalize and write final records.
