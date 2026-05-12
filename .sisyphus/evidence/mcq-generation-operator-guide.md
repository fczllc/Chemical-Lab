# MCQ Generation Operator Guide

Date: 2026-05-12

Scope: internal evidence guide for converting textbook `shortAnswer` placeholders into generated MCQs. Do not publish this guide outside `.sisyphus/evidence`.

## Current state

| Record type | Count | Source |
|---|---:|---|
| Original textbook `shortAnswer` placeholders | 512 | `.sisyphus/evidence/mcq-batch-inventory.md` |
| Organic generated and converted MCQs | 91 | `.sisyphus/evidence/mcq-conversion-rj-chemistry-g12-selective-3-organic-2019.md` and runtime data |
| Skipped generated entries | 0 | Organic conversion report |
| Invalid generated entries | 0 | Organic conversion report |
| Remaining textbook `shortAnswer` placeholders | 421 | `.sisyphus/evidence/mcq-remaining-batches.md` and runtime data |
| Existing hand-authored MCQs preserved | 26 | Runtime data and Task 1 baseline |

Reconciliation: `91 converted + 0 skipped + 421 remaining = 512 original placeholders`.

## Policy

There is no human review gate in this MCQ generation workflow. The operator may read reports for visibility, but generated records either pass automated validation and conversion checks or they are not written.

Low-confidence items must be skipped with a specific reason. Do not create placeholder answers, do not keep `待复核` text in generated questions, options, or explanations, and do not write uncertain MCQs for later human cleanup.

Provider credentials, when a future generation task needs them, must come from environment variables. Do not write API keys or secrets into prompts, generated JSON, reports, commands, or source files.

## Generated JSON path

The successful organic batch used this generated JSON file:

```bash
.sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json
```

Each generated record is matched back to the original runtime record by `id`. The converter preserves runtime provenance fields such as `sourceVolumeId`, `sourceReviewStatus`, and `sourceReferences`.

## Successful organic batch commands

Dry run before writing:

```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-g12-selective-3-organic-2019 --dry-run
```

Write after generated JSON exists and dry run passes:

```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-g12-selective-3-organic-2019 --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json --write
```

Validate runtime quiz data:

```bash
node scripts/validate-quiz-data.mjs
```

Build the app:

```bash
npm run build
```

Browser QA evidence for the first generated MCQ is already captured in `.sisyphus/evidence/task-7-generated-scoring.md` with screenshot `.sisyphus/evidence/task-7-generated-mcq.png`. For a future browser QA pass, start the app and exercise the full quiz until a generated MCQ renders, then record the visible question, four options, correct feedback, incorrect feedback, score changes, and console status.

```bash
npm run dev
```

## Remaining batch commands

The remaining 421 records are ready by inventory but must not be converted until a future task explicitly includes generated JSON and runtime mutation.

### rj-chemistry-grade8-54-2024-full

Dry-run validation after generated JSON exists:

```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade8-54-2024-full --dry-run --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json
```

Later data apply command, only after dry-run validation passes and a future task explicitly permits runtime mutation:

```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade8-54-2024-full --write --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json
```

### rj-chemistry-grade9-2024-vol1

Dry-run validation after generated JSON exists:

```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol1 --dry-run --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json
```

Later data apply command, only after dry-run validation passes and a future task explicitly permits runtime mutation:

```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol1 --write --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json
```

### rj-chemistry-grade9-2024-vol2

Dry-run validation after generated JSON exists:

```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol2 --dry-run --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json
```

Later data apply command, only after dry-run validation passes and a future task explicitly permits runtime mutation:

```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol2 --write --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json
```

## Report reading checklist

Before any future write, confirm these report buckets separately:

| Bucket | Meaning |
|---|---|
| Generated | MCQ entries present in generated JSON and selected for conversion |
| Converted | Runtime records that will be or were replaced by valid generated MCQs |
| Skipped | Records intentionally not converted because confidence was too low or source context was insufficient |
| Invalid | Generated entries rejected by converter or validator checks |
| Remaining | Runtime `shortAnswer` placeholders still not converted |

After each write, run `node scripts/validate-quiz-data.mjs`, run `npm run build`, and record the updated generated, skipped, invalid, converted, and remaining totals in `.sisyphus/evidence`.
