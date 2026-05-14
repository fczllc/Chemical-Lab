# Textbook reaction pairing implementation evidence summary

This summary records the evidence chain for the textbook reaction pairing work. It is scoped to files under `.sisyphus/evidence/` and points maintainers to the generated validation artifacts.

## Textbooks

| Textbook source | Detected candidates | Included runtime records | Excluded candidates | Duplicate candidates |
| --- | ---: | ---: | ---: | ---: |
| src/data/textbooks/2019版人教版高中化学-选择性必修1 化学反应原理/book.md | 248 | 29 | 219 | 10 |
| src/data/textbooks/2019版人教版高中化学-选择性必修2 物质结构与性质/book.md | 9 | 2 | 7 | 0 |
| src/data/textbooks/2019版人教版高中化学-选择性必修3 有机化学基础/book.md | 76 | 8 | 68 | 0 |
| src/data/textbooks/2019版人教版高中化学必修第1册/book.md | 111 | 34 | 77 | 5 |
| src/data/textbooks/2019版人教版高中化学必修第2册/book.md | 87 | 22 | 65 | 3 |
| src/data/textbooks/2024版人教版（五·四学制）八年级化学全一册/book.md | 50 | 19 | 31 | 7 |
| src/data/textbooks/2024版人教版九年级化学上册/book.md | 32 | 1 | 31 | 12 |
| src/data/textbooks/2024版人教版九年级化学下册/book.md | 25 | 12 | 13 | 3 |

## Counts

| Metric | Count |
| --- | ---: |
| Total detected candidates | 638 |
| Reviewed candidates | 638 |
| Included runtime count | 127 |
| Excluded candidates | 511 |
| Duplicate candidates | 40 |
| Stale manifest candidates | 0 |
| Duplicate review candidates | 0 |
| Invalid decision candidates | 0 |
| Exclusions missing reason | 0 |
| Duplicate included equations | 0 |
| Missing explicit equations | 0 |
| Unreviewed candidates | 0 |
| Unaccounted candidates | 0 |

Runtime evidence reports 127 reviewed textbook reactions in the playable game pool, with zero non-textbook game reactions, zero unreviewed game reactions, and zero duplicate normalized runtime equations.

## Exclusions

Task 8 reviewed every detected candidate. The exclusion total is 511. Exclusion decisions by code are:

| Decision | Count |
| --- | ---: |
| exclude_ambiguous_equation | 23 |
| exclude_duplicate | 40 |
| exclude_incomplete_exercise | 6 |
| exclude_not_reaction | 138 |
| exclude_unsupported_notation | 278 |
| exclude_word_only | 26 |

Duplicate candidates are counted as exclusions because each duplicate source occurrence is merged into a canonical included runtime record instead of producing another game record.

## Commands

| Command | Evidence note |
| --- | --- |
| `node scripts/textbook/extract-reaction-equations.mjs --report .sisyphus/evidence/task-1-extraction-report.json` | Captured in the evidence files below or in earlier task evidence. |
| `node scripts/textbook/extract-reaction-equations.mjs --report .sisyphus/evidence/task-1-extraction-report-rerun.json` | Captured in the evidence files below or in earlier task evidence. |
| `node scripts/textbook/extract-reaction-equations.mjs --check --report .sisyphus/evidence/task-1-extraction-report.json` | Captured in the evidence files below or in earlier task evidence. |
| `node scripts/textbook/validate-reaction-extraction.mjs --schema-only` | Captured in the evidence files below or in earlier task evidence. |
| `node scripts/textbook/validate-reaction-extraction.mjs --report .sisyphus/evidence/task-8-review-coverage.json` | Captured in the evidence files below or in earlier task evidence. |
| `node scripts/validate-reaction-game-pool.mjs --report .sisyphus/evidence/task-8-game-pool-report.json` | Captured in the evidence files below or in earlier task evidence. |
| `node scripts/validate-supporting-data.mjs` | Captured in the evidence files below or in earlier task evidence. |
| `node scripts/validate-chem-notation.mjs` | Captured in the evidence files below or in earlier task evidence. |
| `node scripts/textbook/validate-runtime-boundary.mjs` | Captured in the evidence files below or in earlier task evidence. |
| `node scripts/audit-business-data-imports.mjs` | Captured in the evidence files below or in earlier task evidence. |
| `node scripts/textbook/build-reviewed-reactions.mjs --write` | Captured in the evidence files below or in earlier task evidence. |
| `npm run build` | Captured in the evidence files below or in earlier task evidence. |

No new Playwright UI automated tests were added or run as part of this plan evidence. Browser or UI automation is not claimed in this summary.

## Evidence Files

| Path | Verification |
| --- | --- |
| .sisyphus/evidence/task-1-extraction-report.json | exists |
| .sisyphus/evidence/task-1-extraction-report-rerun.json | exists |
| .sisyphus/evidence/task-1-determinism.txt | exists |
| .sisyphus/evidence/task-1-check-mode.txt | exists |
| .sisyphus/evidence/task-1-cited-ranges.json | exists |
| .sisyphus/evidence/task-1-per-file-counts.txt | exists |
| .sisyphus/evidence/task-1-prose-filter.txt | exists |
| .sisyphus/evidence/task-1-invalid-reaction.txt | exists |
| .sisyphus/evidence/task-1-validate-data.txt | exists |
| .sisyphus/evidence/task-2-normalizer-self-test.txt | exists |
| .sisyphus/evidence/task-2-normalizer-unsupported.txt | exists |
| .sisyphus/evidence/task-3-manifest-schema.txt | exists |
| .sisyphus/evidence/task-3-runtime-boundary.txt | exists |
| .sisyphus/evidence/task-4-build-reviewed-reactions.txt | exists |
| .sisyphus/evidence/task-5-import-boundary.txt | exists |
| .sisyphus/evidence/task-5-min-game-usable.txt | exists |
| .sisyphus/evidence/task-6-extraction-coverage-report.json | exists |
| .sisyphus/evidence/task-6-runtime-boundary.txt | exists |
| .sisyphus/evidence/task-6-game-pool-fail-closed.txt | exists |
| .sisyphus/evidence/task-6-game-pool-report.json | exists |
| .sisyphus/evidence/task-7-package-validation-scripts.txt | exists |
| .sisyphus/evidence/task-7-build.txt | exists |
| .sisyphus/evidence/task-8-review-coverage.json | exists |
| .sisyphus/evidence/task-8-exclusion-reasons.txt | exists |
| .sisyphus/evidence/task-8-build-reviewed-reactions.txt | exists |
| .sisyphus/evidence/task-8-game-pool-validator.txt | exists |
| .sisyphus/evidence/task-8-game-pool-report.json | exists |

Task 9 verification outputs:

| Path | Purpose |
| --- | --- |
| .sisyphus/evidence/task-9-summary-check.txt | Required section and value checks for this summary. |
| .sisyphus/evidence/task-9-evidence-paths.txt | Existence check for every evidence path listed above. |
