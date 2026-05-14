
## Task 1 extraction implementation - 2026-05-13
- Equation candidate IDs are derived from normalized project-relative source path, line range, and raw equation text hash (eaction-equation-...-l<start>-l<end>-<hash>), never array indexes.
- The extractor preserves raw source equation text and records context/excerpt separately; normalization into reactants/products is intentionally deferred to later tasks.
- Deterministic report verification passed with identical SHA-256 hashes for two unchanged extractor runs: 7945077395C0A43150D5B9365966ED5E62F3DB1218E9D85168C9270D28FCC87C.
- Required cited candidates were captured from 八年级全一册 lines 4062-4094 and 九年级下册 lines 2572-2601, including \xlongequal, equals, \uparrow, and \downarrow syntax features.

## Task 1 verification retry - 2026-05-13
- Confirmed scripts/textbook/extract-reaction-equations.mjs exists and uses only allowed Node built-ins for this retry: 
ode:fs/promises, 
ode:path, 
ode:crypto, and 
ode:process.
- Required command regenerated .sisyphus/evidence/task-1-extraction-report.json with 8 textbook ook.md files and 638 explicit equation candidates.
- Retry evidence files prove byte-identical reruns, all 8 per-file counts, cited 八年级/九年级下册 line-range candidates, controlled missing-manifest --check, and zero emitted candidates without supported equation operators.

## Task 2 equation normalizer - 2026-05-13
- Added `scripts/textbook/reaction-equation-normalizer.mjs` as a fail-closed string normalizer, not a chemistry balancer; unsupported forms return structured `unsupportedReason` with empty gameplay sides.
- Normalized display equations preserve stoichiometric coefficients, while exported `reactants[]`/`products[]` strip coefficients to match the existing `experiment-enrichment.mjs` gameplay convention of formula-only tokens.
- Conditions from `\xlongequal`, `\xrightarrow`, and `\stackrel` are extracted into `conditions[]`; gas/precipitate markers (`\uparrow`, `\downarrow`, `↑`, `↓`, `(g)`, `(s)`) are extracted into `phaseMarkers[]` and omitted from gameplay formula tokens.
- Evidence files: `.sisyphus/evidence/task-2-normalizer-self-test.txt` proves combustion, displacement, carbonate-acid, and carbonate-base supported fixtures have non-empty sides; `.sisyphus/evidence/task-2-normalizer-unsupported.txt` proves blank, word-only, reversible, ionic, generic-schema, and multi-equation-array fixtures are not game-usable.


## Task 3 manifest schema - 2026-05-13
- Created src/data/textbookIngestion/reactionEquationReview.json as a deterministic review manifest for Task 1 candidates.
- Manifest is intentionally placed outside generated/ and reviewed/ subdirectories because it reviews raw extraction candidates, not drafted promotion candidates.
- Schema uses stable top-level keys and a sorted allowedDecisionCodes list: exclude_ambiguous_equation, exclude_duplicate, exclude_incomplete_exercise, exclude_not_reaction, exclude_outside_markdown_text, exclude_unsupported_notation, exclude_word_only, include.
- Duplicate policy is explicit: one runtime game record per normalizedEquation, with duplicate occurrences merged into sourceRefs/sourceReferences later.
- Reviewer override fields supported: name, description, curriculumTags, difficulty, reactants, products, normalizedEquation, notes.
- reviews array is empty with reviewStatus: schema-only-pending-task-8 so validators can fail closed until Task 8 completes exhaustive review.
- JSON parse/schema inspection command exited 0; evidence captured in .sisyphus/evidence/task-3-manifest-schema.txt.
- Runtime boundary validator (scripts/textbook/validate-runtime-boundary.mjs) exited 0 after manifest creation; evidence in .sisyphus/evidence/task-3-runtime-boundary.txt.
- No runtime imports of reactionEquationReview.json found in src/ tree.

## Task 4 reviewed reaction runtime builder - 2026-05-13
- Added `scripts/textbook/build-reviewed-reactions.mjs` as an importable/CLI generator that reads the Task 1 extractor report referenced by `reactionEquationReview.json` and uses Task 2 `normalizeReactionEquation()` for gameplay sides.
- The generator requires a completed review status plus full include/exclude coverage of current extractor candidate IDs before any destructive runtime replacement; `schema-only-pending-task-8` fails closed and leaves `src/data/reactions.json` untouched.
- Runtime IDs are stable `textbook-reaction-<sha256-prefix>` values based on `normalizedEquation`; duplicate included equations merge sorted curriculum tags and source references.
- Generated records intentionally keep a narrow runtime shape: `id`, `name`, `description`, `equationText`, `normalizedEquation`, `reactants`, `products`, `curriculumTags`, `difficulty`, `sourceKind`, `sourceReviewStatus`, and `sourceReferences`.
- Post-review fixes made the explicit `--candidate-report` path override the manifest default, made manifest `candidateCount` mandatory/exact for fail-closed validation, and preserved reviewer-provided reactant/product order while still sorting/deduping curriculum tags.

## Task 6 fail-closed validators - 2026-05-13
- Added `scripts/textbook/validate-reaction-extraction.mjs` as a coverage validator that keeps `--schema-only` limited to manifest schema checks, while full mode reruns the Task 1 extractor and fails closed until every current candidate has an include/exclude review.
- Full extraction validation prints stable counters including `missingExplicitEquations`, `unreviewedCandidates`, and `unaccountedCandidates`; current pre-Task-8 data reports 638 unreviewed/unaccounted candidates with a per-textbook JSON report.
- Added `scripts/validate-reaction-game-pool.mjs` to mirror the actual `src/modules/games.js` reaction usability predicate, then enforce the stricter textbook-only contract on that actual playable pool.
- Current game-pool validation fails closed with 7 game-usable reactions, 7 non-textbook sourceKind failures, 5 unreviewed hand-authored reactions, 5 missing sourceReferences, and 1 duplicate normalized runtime equation.

## Task 7 package script wiring - 2026-05-13
- Added validate:textbook-reactions and validate:reaction-game-pool to package.json.
- Both scripts execute their intended validators and print required counters; they intentionally fail closed in the current pre-Task-8 state (638 unreviewed extraction candidates; 7 non-textbook game-usable reactions).
- Decided NOT to add either new script to validate:all:safe because both fail closed until Task 8 completes; including them would break the existing safe aggregate prematurely.
- Existing scripts (dev, build, preview, validate:supporting, validate:chem-notation) remain unchanged and verified present.
- npm run build still passes (exit 0) after package.json changes.

## Task 8 exhaustive review manifest - 2026-05-13
- Completed `src/data/textbookIngestion/reactionEquationReview.json` with 638 deterministic review entries and `reviewStatus: reviewed-complete`.
- Final coverage counts: 127 canonical includes, 511 exclusions, 40 duplicate candidate occurrences merged through canonical include `sourceRefs`.
- Included entries carry deterministic `name`, `description`, non-empty `curriculumTags`, `difficulty`, formula-only `reactants[]`/`products[]`, and stable `normalizedEquation` values.
- Generated `src/data/reactions.json` through `node scripts/textbook/build-reviewed-reactions.mjs --write`; runtime pool now contains 127 reviewed textbook records.
- Evidence files captured: `.sisyphus/evidence/task-8-review-coverage.json`, `.sisyphus/evidence/task-8-exclusion-reasons.txt`, `.sisyphus/evidence/task-8-build-reviewed-reactions.txt`, `.sisyphus/evidence/task-8-game-pool-validation.txt`, and `.sisyphus/evidence/task-8-game-pool-validation.json`.

## Task 8 retry verification - 2026-05-13
- Retry confirmed the completed manifest state directly: `reviewStatus: reviewed-complete`, 638 reviews, 127 includes, 511 exclusions, and 40 `exclude_duplicate` entries.
- Direct integrity check proved zero missing/stale reviews, zero bad decisions, zero bad includes, zero duplicate candidates missing canonical `sourceRefs`, zero duplicate candidates missing runtime source references, and zero bad runtime records.
- Refreshed required evidence under the exact retry-requested names: `.sisyphus/evidence/task-8-review-coverage.json`, `.sisyphus/evidence/task-8-game-pool-report.json`, `.sisyphus/evidence/task-8-game-pool-validator.txt`, `.sisyphus/evidence/task-8-build-reviewed-reactions.txt`, and `.sisyphus/evidence/task-8-exclusion-reasons.txt`.

## Task 5 reaction-game compatibility verification - 2026-05-13
- No source change was needed: `src/modules/games.js` already imports `reactions` through `src/data/index.js`, keeps `REACTION_ROUND_SIZE = 5`, filters for non-empty `reactants[]`/`products[]`, and matches reactant/product chips by shared reaction `id`.
- Current reviewed runtime data provides 127 game-usable textbook reactions, so the game does not enter its unavailable state with the reviewed textbook pool.
- Evidence was appended to `.sisyphus/evidence/task-5-import-boundary.txt` and `.sisyphus/evidence/task-5-min-game-usable.txt`; both required validators exited 0.

## Task 9 evidence summary - 2026-05-13
- Created `.sisyphus/evidence/textbook-reaction-pairing-summary.md` from Task 8 coverage and exclusion evidence, with required sections for Textbooks, Counts, Exclusions, Commands, and Evidence Files.
- The summary records 638 detected candidates, 127 included runtime records, 511 exclusions, and 40 duplicate candidate occurrences, plus every per-textbook count from `.sisyphus/evidence/task-8-review-coverage.json`.
- Verification outputs are `.sisyphus/evidence/task-9-summary-check.txt` for required section/value checks and `.sisyphus/evidence/task-9-evidence-paths.txt` for referenced evidence path existence checks.

## Task 10 final validation - 2026-05-13
- Final validator evidence is `.sisyphus/evidence/task-10-validators.txt`; all seven required Node commands exited 0.
- Final extraction report is `.sisyphus/evidence/final-extraction-report.json` and now records `reviewCheck.unreviewedCandidates: 0` and `reviewCheck.unaccountedCandidates: 0`.
- Game-pool validation reported `nonTextbookGameReactions=0`, `unreviewedGameReactions=0`, and `emptyReactantsOrProducts=0` for 127 reviewed textbook reactions.
- Production build evidence is `.sisyphus/evidence/task-10-build.txt`; `npm run build` exited 0 with the existing Vite chunk-size warning only.
- No Playwright spec was added or modified by Task 10; `git diff -- tests` was empty, while the pre-existing untracked `tests/ui/reaction-game-completion.spec.ts` remains unrelated.

## Task 10 review remediation - 2026-05-13
- Post-implementation review caught that the lab module still consumes `src/data/reactions.json`; kept the fix inside the allowed runtime-data/builder scope by generating lab-safe metadata (`experimentId`, `safetyLevel`, `visualDescription`, `steps`, `safetyNotes`) for every reviewed textbook reaction.
- Legacy learning-path experiment IDs are preserved by mapping five reviewed textbook equations to the existing IDs; all other textbook reactions get stable `exp-textbook-reaction-*` IDs.
- Direct data-shape assertion after regeneration reported `reactions=127`, `missingLabFields=0`, and `duplicateExperimentIds=0`.


## UI cleanup - reaction pairing chip labels and formula size - 2026-05-14
- Removed <small></small> from reactant chips in src/modules/games.js because it revealed the matching answer.
- Removed <small>生成物</small> from product chips in src/modules/games.js; column headings 反应物 and 生成物 remain intact outside the chips.
- Enlarged #games .reaction-chip strong font-size in src/styles/games.css from implicit default to clamp(1.15rem, 2.2vw, 1.6rem) for responsive readability while preserving overflow-wrap: anywhere.
- 
pm run build passed (exit 0) with only the pre-existing Vite chunk-size warning.
- No matching logic, scoring, timer, or data changes were made.
