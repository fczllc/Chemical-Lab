# Remaining Short-Answer MCQ Batch Map - Task 6

- Generated at: 2026-05-12
- Scope: evidence-only mapping/readiness report; remaining runtime quiz records stay as shortAnswer placeholders.
- Inventory baseline: `.sisyphus/evidence/mcq-batch-inventory.json`
- Current runtime data checked: `src/data/quizData.json`
- Task 5 organic batch excluded from remaining-placeholder totals: `rj-chemistry-g12-selective-3-organic-2019`
- Remaining `category: "shortAnswer"` records in runtime data: 421
- Reported remaining batch total: 421
- Reconciliation: PASS - runtime remaining shortAnswer count 421 equals report total 421.

## Remaining Batch Summary

| Batch ID | Readiness group | Current remaining shortAnswer | Inventory ready | Missing source | Duplicate | Unsupported | Ready for MCQ generation | Blockers |
|---|---|---:|---:|---:|---:|---:|---|---|
| `rj-chemistry-grade8-54-2024-full` | grade8-full-textbook | 157 | 157 | 0 | 0 | 0 | yes | None recorded |
| `rj-chemistry-grade9-2024-vol1` | grade9-volume-1 | 155 | 155 | 0 | 0 | 0 | yes | None recorded |
| `rj-chemistry-grade9-2024-vol2` | grade9-volume-2 | 109 | 109 | 0 | 0 | 0 | yes | None recorded |

## Totals

- Remaining batches: 3
- Remaining placeholders accounted for: 421
- Readiness status totals from inventory for remaining batches: ready 421, missing-source 0, duplicate 0, unsupported 0.
- Current runtime counts by sourceVolumeId: rj-chemistry-grade8-54-2024-full=157; rj-chemistry-grade9-2024-vol1=155; rj-chemistry-grade9-2024-vol2=109.

## Copy-paste commands for later batch processing

These commands are for a later conversion task after generated MCQ JSON exists. Task 6 ran only the all-ready dry-run command shown in the next section.

### rj-chemistry-grade8-54-2024-full

Dry-run validation:
```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade8-54-2024-full --dry-run --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json
```
Later data-apply command, only after dry-run validation passes and a future task explicitly includes runtime mutation:
```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade8-54-2024-full --write --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade8-54-2024-full.json
```

### rj-chemistry-grade9-2024-vol1

Dry-run validation:
```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol1 --dry-run --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json
```
Later data-apply command, only after dry-run validation passes and a future task explicitly includes runtime mutation:
```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol1 --write --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol1.json
```

### rj-chemistry-grade9-2024-vol2

Dry-run validation:
```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol2 --dry-run --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json
```
Later data-apply command, only after dry-run validation passes and a future task explicitly includes runtime mutation:
```bash
node scripts/convert-short-answer-mcqs.mjs --batch rj-chemistry-grade9-2024-vol2 --write --generated .sisyphus/evidence/generated-mcqs-rj-chemistry-grade9-2024-vol2.json
```

## All-ready dry-run result

Command run for Task 6:
```bash
node scripts/convert-short-answer-mcqs.mjs --all-ready-batches --dry-run
```

- Exit code: 0
- Captured output: `.sisyphus/evidence/task-6-all-ready-dry-run.txt`
- The converter selected 512 inventory-ready records and reported 512 missing generated entries because no generated JSON was supplied. This is a dry-run/report-only state, not a runtime data mutation.
- The selected 512 inventory records include the Task 5 organic baseline batch; current runtime remaining placeholders are only the 421 non-organic records listed above.

## Dry-run mutation check

A repeat `--all-ready-batches --dry-run` exited 0 while preserving runtime data file hashes:

| File | SHA-256 before | SHA-256 after | Stable |
|---|---|---|---|
| `src/data/quizData.json` | `0A272ABBF7D77724C0760E6D90BD6D485013ED2E4CDA3F23F8CF067997D3CD5E` | `0A272ABBF7D77724C0760E6D90BD6D485013ED2E4CDA3F23F8CF067997D3CD5E` | yes |
| `src/data/quizData.js` | `B97796D8C97C1BDCFAC130691FAC2578896C99277C3B60B27E29DD53959BA30C` | `B97796D8C97C1BDCFAC130691FAC2578896C99277C3B60B27E29DD53959BA30C` | yes |
## Non-conversion statement

No converter `--write` command was run for the remaining batches in Task 6. `src/data/quizData.json` and `src/data/quizData.js` are intentionally outside this task's write scope.
