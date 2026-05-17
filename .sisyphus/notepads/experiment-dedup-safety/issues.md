# Issues

## 2026-05-16 Task: start-work
- Existing `.sisyphus/boulder.json` pointed to a completed older plan; updated active state to `experiment-dedup-safety` before starting work.

## 2026-05-17 Task 5: runtime data fails stricter validator
- 
pm run validate:lab-experiments fails after Task 5 validator changes because current generated src/data/labExperiments.json still contains 1 duplicate canonical content cluster and 99 invalid safety notes, mostly forbidden fallback phrase 教材未提取到明确安全提示 plus step-copy notes. Task 5 explicitly forbids modifying generated runtime JSON, so this remains for the next regeneration/fix task rather than weakening validation.
`nCorrection for Task 5 issue above: the failing runtime command is npm run validate:lab-experiments.

## 2026-05-17 Task 5 follow-up resolution
- Resolved the previous runtime validation failure by regenerating src/data/labExperiments.json with the existing builder. No validator weakening or manual JSON edits were needed. The strict validator now passes on the regenerated 92-record runtime data.
