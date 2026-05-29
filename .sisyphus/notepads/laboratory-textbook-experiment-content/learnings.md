## 2026-05-10 Task: context-gathering
- Exploration mapped core pipeline: `scripts/textbook/generate-drafts.mjs` builds experiment candidates, currently via `buildExperimentCandidate()` and `summarizeSection()`/`firstNonEmptyExcerpt()` truncation; `scripts/textbook/promote-topic.mjs` `adaptReactionRecord()` maps candidate fields into runtime reactions and currently writes empty `reactants/products` for textbook records.
- Runtime lab cards/details are in `src/modules/lab.js`; cards use `reaction.description`, detail currently relies on `reaction.description` unless later changed. Primary fix should be ingestion/enrichment/promotion, not UI-only patching.
- Existing validation style: ESM Node scripts, `errors[]`, explicit pass/fail logging, `process.exit(1)` on failure, package `validate:*` direct `node scripts/...mjs` conventions.
- Existing chemistry notation expectations: use plain formula/equation strings compatible with `src/modules/chemNotation.js`; `formulaHTML()` for species, `equationHTML()` for full equations.
- External references support conservative approach: parse/validate explicit formula/equation spans and use table-driven fixtures; do not infer chemistry from broad knowledge.

## 2026-05-10 Task 1 contract utilities
- Added scripts/textbook/experiment-enrichment.mjs as a side-effect-free ESM helper module with normalization, <=100-CJK excerpts, vague heading detection, deterministic title generation, and conservative chemistry metadata extraction.
- `extractHighConfidenceChemistry()` returns `{ reactants: [], products: [] }` for ambiguous text and only adds `equationText`, `confidence: 'high'`, and `evidenceText` for explicit formula equations.

## 2026-05-10 Task 5 fixture validator
- Added `scripts/textbook/validate-enrichment-fixtures.mjs` as a fast ESM fixture runner around `experiment-enrichment.mjs` with exact PASS outputs and `--case` selection.
- The explicit-equation extractor only recognizes single-symbol species, so the high-confidence fixture uses a synthetic compatible formula equation rather than a textbook-style multi-atom product.

## 2026-05-10 Task 2 draft generation content preservation
- `scripts/textbook/generate-drafts.mjs` now imports only `normalizeExperimentText`, `createExperimentExcerpt`, and `generateExperimentTitle` from the enrichment helpers for experiment candidates.
- Experiment candidates preserve full normalized source text in `textbookContent`; `summary` and `description` share the deterministic <=100-CJK excerpt, while non-experiment candidate surfaces still use `summarizeSection()`.
- `buildExperimentCandidateForValidation()` is exported as a narrow internal validation hook so fixtures can prove the actual draft candidate shape without running draft generation against repository data.

## 2026-05-10 Task 3 title generation
- Tightened `generateExperimentTitle()` so vague headings with hydrogen combustion text resolve to the concise title `氢气燃烧` instead of the longer experimental phrasing.
- Action-pattern titles now trim trailing clauses after Chinese punctuation, which keeps concise titles like `检验蜡烛的可燃性` stable in fixture validation.

## 2026-05-10 Task 4 high-confidence chemistry extraction
- Explicit chemistry extraction now normalizes unicode subscripts to ASCII and parses complete equation sides around `->`, `→`, or `=` before returning metadata.
- Formula species are validated as repeated element/count groups with leading stoichiometric coefficients removed from `reactants` and `products`; normalized `equationText` keeps coefficients and spaces around `+` and the original arrow.
- Fixture coverage now uses real zinc/HCl and hydrogen/oxygen examples, plus malformed-equation and phrase-rule cases to prevent partial substring extraction regressions.

## 2026-05-10 Task 4 balance correction
- Explicit equation metadata is now high-confidence only when each side is both syntactically valid under the simple formula grammar and atom-balanced after applying stoichiometric coefficients.
- The ambiguous/omitted fixture now locks rejection of unbalanced equations like `H2 + O2 -> H2O` while keeping balanced `2H₂ + O₂ -> 2H₂O` accepted.

## 2026-05-10 Task 6 ambiguous chemistry display
- Lab detail rendering now omits chemistry summary rows entirely when a reaction has no `equationText`, no known fallback equation, and empty reactant/product arrays; this prevents ambiguous textbook records from displaying a bogus blank `→` equation.
- Added Playwright coverage for an ambiguous textbook reaction to prove full `textbookContent` remains visible while equation/reactant/product rows stay hidden.

## 2026-05-10 Task 7 validation compatibility
- `validate:story-media` expected sharded `media-001-030.json` files, but the repository currently stores story media in legacy `storyMedia/media.json`; the validator now adapts that legacy structure into the stricter item contract for validation.
- Legacy story-media compatibility checks local file existence and element coverage, while not enforcing the newer shard image size/dimension policy against older assets that already exist in the repository.

## 2026-05-10 Task 8 malformed experiment headings
- `isVagueExperimentHeading()` now treats unmatched leading brackets on experiment-number headings as vague, so titles like `【实验9-1` flow into content-derived title generation instead of being preserved verbatim.
- The regression fixture now covers the malformed bracket case directly, and the promoted Grade 9 Vol. 2 runtime reaction record now uses a content-derived title instead of the raw heading.

## 2026-05-10 Task 9 boilerplate experiment headings
- `isVagueExperimentHeading()` now treats generic section labels as vague, including `【实验目的】`, `【实验用品】`, `【实验步骤】`, `【实验与记录】`, `【实验与分析】`, and malformed open-bracket variants like `【实验9-8’`.
- Regenerating all textbook drafts and repromoting reviewed runtime data removed every runtime reaction name beginning with `【实验`; only meaningful titles remain.

- 2026-05-28: In Playwright tests with a beforeEach navigation, context.addInitScript only affects future documents. If a Date mock is installed inside a test after beforeEach, also apply it to the current page with page.evaluate before triggering module code that calls new Date().
