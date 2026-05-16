## Task 1 learnings\n\n- Runtime lab schema encoded in scripts/validate-lab-experiments.mjs with REQUIRED_FIELDS, ALLOWED_SOURCE_KINDS, and ALLOWED_SAFETY_LEVELS constants.\n- Inclusion predicate isExplicitExperimentCandidate accepts explicit 【实验...】 headings and activityType: experimentReview, rejects inquiryReview.\n- Exclusion predicate isValidLabRuntimeRecord rejects sourceKind: textbook and missing unlockRequirements.\n- Content-quality predicates isMeaningfulTitle and isMeaningfulDescription reject raw candidateIds, sourceSectionIds, hash suffixes, 【实验N-M】 labels, and 教材已审核反应： placeholders.\n- Self-checks pass: explicit-include, reject-non-experiment, reject-meaningless-title.\n- Evidence written to .sisyphus/evidence/task-1-lab-schema-*.json.\n\n
## Task 2 learnings

- Added scripts/textbook/build-lab-experiments.mjs to read the four fixed generated textbook directories and join experiment-candidates.json, experiment-backlog.json, and lab-candidates.json by sourceVolumeId + sourceSectionId/candidate provenance.
- Generated src/data/labExperiments.json contains 108 accepted explicit textbook experiments plus 2 unmatched curatedLegacy records; first semantic textbook matches preserved stable curated IDs where deterministic, later semantic matches use unique lab-experiment-* IDs.
- Builder --check writes only evidence and did not modify src/data/labExperiments.json or src/data/reactions.json in the required git diff proof.
- Required counters after final generation: acceptedExperiments=108, rejectedNonExperiments=367, rejectedDuplicates=1, rejectedMeaninglessTitle=0, rejectedMeaninglessContent=75, curatedLegacyPreserved=2, runtimeRecordCount=110.
- Final verification passed: build-lab-experiments --check, --write, validate-lab-experiments, validate-reaction-game-pool, unique ID/display-label integrity probe, and npm run build.

## Task 2 retry learnings

- Fixed generator-side display scrubbing in scripts/textbook/build-lab-experiments.mjs so shared cleanContent removes well-formed, semantic, and truncated visible experiment labels before title, description, steps, observations, visual descriptions, safety notes, and materials are emitted.
- Added generator validation for dirty display fields and generic titles so --check/--write fail before bad runtime data can be written.
- Improved title derivation with generic-title rejection and material/action fallback; final generation accepted 104 explicit textbook experiments and preserved 2 curatedLegacy records, with rejectedMeaninglessContent=79 and rejectedMeaninglessTitle=0.
- Final integrity probe passed with totalRecords=106, textbookExperiments=104, curatedLegacy=2, duplicateIds=0, dirtyDisplayFields=0, genericTitles=0.

## Task 3 learnings

- Extended scripts/validate-lab-experiments.mjs from schema-only checks into runtime data validation for src/data/labExperiments.json, including non-empty required scalar fields, non-empty array fields, allowed safety/source kinds, unlockRequirements metadata, duplicate IDs, dirty display text, and generic-title rejection aligned with scripts/textbook/build-lab-experiments.mjs.
- Lab sourceKind policy is now explicit: curatedLegacy is allowed only for the original five curated experiment IDs; all other lab records must be textbookExperiment. Current generated data passes with totalRecords=106, starterRecords=38, lockedRecords=68.
- Added scripts/validate-lab-data-boundary.mjs to statically check that lab cards are sourced from labExperiments rather than reactions and that experimentCandidate no longer routes into src/data/reactions.json.
- Added npm scripts validate:lab-experiments and validate:lab-boundary following the existing validate:* naming style.
- Task 3 evidence lives under .sisyphus/evidence/task-3-lab-*.json for default validation, preserved Task 1 self-checks, new self-checks, and boundary validation.

## Task 4 learnings

- src/data/index.js now exposes labExperiments from src/data/labExperiments.json as a separate canonical export while leaving reactions sourced only from src/data/reactions.json for the reaction pairing game.
- scripts/validate-supporting-data.mjs now builds learning-path experimentId cross-reference data from labExperiments[].experimentId instead of reactions[].experimentId, so stage.unlockedExperiments validates against the lab dataset without changing completed experiment ID strings.
- progress.js was inspected and not modified: it still has reaction-derived curriculum experiment assumptions and a hard-coded TOTAL_EXPERIMENTS value, but UI consumption is outside Task 4 and owned by later lab UI work.

## Task 6 learnings

- src/data/textbookIngestion/runtimeTargetMap.js now maps experimentCandidate to src/data/labExperiments.json with targetField labExperiments; generic labCandidate remains in unsupportedArtifactTypes.
- scripts/validate-lab-data-boundary.mjs --check-runtime-target-map now verifies three boundaries: experimentCandidate does not map to reactions.json, experimentCandidate does map to labExperiments.json/labExperiments, and labCandidate is not listed in supportedDestinations.
- Existing reviewed reaction promotion support is preserved in scripts/textbook/validate-promotion-manifest.mjs by allowing experimentCandidate with reaction/labOrReaction content to target src/data/reactions.json, while labCandidate is no longer reaction-compatible.
- Required verification passed: node scripts/validate-lab-data-boundary.mjs --check-runtime-target-map --report .sisyphus/evidence/task-6-runtime-target-map.json and npm run validate:textbook-workflow -- --all-reviewed.


## Task 7 learnings

- Extended tests/ui/lab-textbook-experiments.spec.ts with runtime lab/game separation coverage: rendered lab card IDs are checked against labExperiments from /src/data/index.js, visible titles reject reaction/formula-pool placeholders, raw lab IDs, experiment-number labels, and hash-like strings.
- Existing injected Playwright fixtures now push into labExperiments instead of reactions so card excerpt/detail, fallback, ambiguous chemistry, safety gate, and simulation completion tests exercise the lab dataset boundary.
- Clean runtime lab state now verifies 38 starter cards and 68 locked cards; getReactionUnlockState no longer treats unmapped textbook curriculum tag IDs as hard locks when progress/safety requirements are otherwise satisfied.
- Task 7 evidence files: task-7-lab-runtime-regression.json, task-7-lab-title-quality.json, task-7-lab-locked-state.json, and task-7-lab-placeholder-rejection.json.

