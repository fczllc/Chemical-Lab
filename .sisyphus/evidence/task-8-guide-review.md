# Task 8 Guide Review

Date: 2026-05-12

Reviewed file: `.sisyphus/evidence/mcq-generation-operator-guide.md`

## Read-through result

The guide was read top to bottom after drafting. Commands are copy and paste ready because every command uses concrete batch IDs and concrete paths. No shell variables are required.

## Command coverage

| Required command type | Present | Command or location |
|---|---|---|
| Organic dry run | yes | `node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-g12-selective-3-organic-2019 --dry-run` |
| Organic write | yes | `node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-g12-selective-3-organic-2019 --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json --write` |
| Quiz data validation | yes | `node scripts/validate-quiz-data.mjs` |
| Production build | yes | `npm run build` |
| Browser QA startup | yes | `npm run dev` plus Task 7 browser QA evidence path and observation checklist |
| Remaining grade8 batch | yes | dry-run and later write commands for `rj-chemistry-grade8-54-2024-full` |
| Remaining grade9 volume 1 batch | yes | dry-run and later write commands for `rj-chemistry-grade9-2024-vol1` |
| Remaining grade9 volume 2 batch | yes | dry-run and later write commands for `rj-chemistry-grade9-2024-vol2` |

## Path coverage

The guide defines the generated organic JSON path as `.sisyphus/evidence/generated-mcqs-rj-chemistry-g12-selective-3-organic-2019.json` and lists the three expected generated JSON paths for the remaining batches.

## Policy coverage

The guide states that there is no human review gate. It also states that low-confidence items must be skipped with a reason and must not be written as placeholder MCQs.

## Count coverage

The guide distinguishes generated, converted, skipped, invalid, and remaining records. It records the current totals as 512 original placeholders, 91 organic generated and converted MCQs, 0 skipped, 0 invalid, 421 remaining placeholders, and 26 preserved hand-authored MCQs.

Result: Task 8 guide review passed for command clarity, path definition, policy coverage, and report bucket clarity.
