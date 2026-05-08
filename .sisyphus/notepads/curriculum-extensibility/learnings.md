# Learnings

## 2026-05-07 Task: session-start
- Plan execution started for `.sisyphus/plans/curriculum-extensibility.md` in current workspace, no worktree.
- User-provided textbook sources are currently under `src/data/textbooks/`, with Chinese volume directories containing `book.md` and `images/`.
- A prior spot check found three malformed image references in `src/data/textbooks/2024版人教版九年级化学上册/book.md`: lines around 3193, 3483, and 4923 use `![](images/![image]())`.

## 2026-05-07 Task 1: curriculum taxonomy seed
- src/data/index.js imports src/data/curriculum.js and re-exports curriculumTags, matching the canonical data boundary pattern used by runtime data consumers.
- The local shell does not have 
g on PATH; repository searches for this task used the dedicated search tool instead.

## 2026-05-07 Task 2: curriculum validator
- `scripts/validate-curriculum.mjs` imports `curriculumTags` through `src/data/index.js`, matching the canonical data boundary and avoiding direct business-data imports.
- The validator accepts the four fixed difficulty bands (`入门`, `初中`, `高中基础`, `高中进阶`) even though current seed tags only use the first three.
- Negative self-check modes are deterministic in-script fixtures and exit 0 only after the fixture is rejected.

## 2026-05-07 Task 3: safe validation wiring
- `validate:all:safe` should chain the targeted validators directly and call `build`, not `validate:data`, because the latter still pulls in `validate:story-media`.
- The production build still succeeds with the existing large-chunk warning, so the warning is informational rather than a blocker for this wiring task.

## 2026-05-07 Task 4: supporting curriculum metadata
- Runtime supporting datasets are JSON-canonical through src/data/index.js; JS mirrors were kept aligned for compatibility with existing direct imports.
- validate-supporting now checks non-empty curriculumTags and fixed difficulty bands across quizzes, reactions, achievements, learning stages, and GAME_META, and prints a curriculum reference summary.
- Capturing command evidence through cmd with UTF-8 code page preserves Chinese validator output in .sisyphus/evidence files.

## 2026-05-07 Task 5: progress curriculum mastery
- Progress topic mastery now derives topic labels from canonical curriculumTags and computes activity completion from tagged quiz IDs, tagged experiment IDs, and related element atomic numbers derived from quiz relatedElement/reaction formulas.
- The existing learned-element requiredCount path remains active as the fallback and still drives stage celebrations/unlocks when curriculum sample activities are incomplete or absent.

## 2026-05-07 Task 6: lab experiment curriculum unlocks
- Lab experiment unlocks are additive on `reaction.unlockRequirements`; `safetyLevel` remains the runtime safety display/confirmation field and is mirrored inside unlock metadata through `safetyLevels` only for validation.
- The lab route keeps every experiment card visible, but disables simulation entry until generic curriculum/stage progress requirements are met or the experiment is already completed.
- Task 6 validation now checks reaction-level unlock metadata in both `validate-curriculum` and `validate-supporting`, including existing curriculum tags, valid safety levels, valid learning stage IDs, and non-negative learned-element thresholds.

## 2026-05-07 Task 7: game challenge metadata
- Game challenge metadata is additive under GAME_META.<id>.challengeMetadata; runtime games still use the existing DRAG_BATCH_SIZE, MEMORY_PAIR_COUNT, timers, scoring increments, and persisted GAME_KEYS values.
- validate-curriculum now checks GAME_META challenge metadata in addition to curriculum tag gameChallengeRules and prints gameChallengeRules: valid when the four-game metadata set passes.
- validate-supporting now asserts exact raw GAME_META keys (drag, memory, reaction, collector) and exact persisted GAME_KEYS values (game-drag, game-memory, game-reaction, game-collector).

## 2026-05-07 Task 8: quiz curriculum hooks
- Quiz question cards now carry normalized `data-curriculum-tags` and `data-curriculum-difficulty` attributes, with empty grade/chapter/topic slots reserved for future scope filters.
- `src/modules/filters.js` now exposes reusable curriculum metadata normalizers and match helpers without changing the existing period filter behavior.

## 2026-05-07 Task 13: chemical notation renderer
- chemNotation remains the single KaTeX-backed renderer boundary; Task 13 extended existing formula/equation parsing instead of adding dependencies or changing named exports.
- Textbook notation support now covers hydrates, parenthesized groups, ionic charges, state suffixes, gas/precipitate arrows, reversible arrows, and condition arrows such as --heat--> through deterministic parser cases and validate:chem-notation.
- Required evidence is stored in .sisyphus/evidence/task-13-chem-notation.txt, task-13-chem-notation-playwright.txt, and task-13-build.txt.

## 2026-05-07 Task 14: textbook asset manifest
- Textbook image source metadata now lives in src/data/textbookAssets.js and is exported through src/data/index.js; raw src/data/textbooks/*/book.md and images/ remain source assets only.
- validate:textbook-assets checks parseable Markdown image links across all textbook volumes, validates manifest image paths, and requires reviewed status before quiz/reaction textbookAssetReferences may use formula/diagram/apparatus/experiment-flow content.
- The three inherited malformed ![](images/![image]()) placeholders in 2024版人教版九年级化学上册/book.md are tracked as rejected sourceIssues, so they are preserved and not promoted into canonical assets.
- UTF-8-safe evidence capture uses explicit PowerShell console/output encoding plus Out-File -Encoding utf8 for Chinese validator text.

## Task 10 — Route Shell Smoke Tests (2026-05-07)

- Restored .games-overview-header inside #game-area in src/modules/games.js so the route-shell test anchor #game-area .games-overview-header resolves. The header is rendered as part of the idle HUD shell and does not affect game behavior.
- Added .story-media-attribution and .story-media-disclosure elements to every story media card in src/modules/storyMode.js, with a fallback disclosure note for cards that lack explicit sourceOrigin/fallbackReason metadata. This makes the story media card assertions stable regardless of per-element metadata completeness.
- All 4 Playwright route-shell tests now pass (hash routes, compare direct, story media cards, tablet portrait).

## 2026-05-07 Task 9: storage migration compatibility
- Storage schema now saves as v2 and routes legacy bare payloads plus v0/v1 envelopes through the same non-destructive normalizer, so learned elements, completed experiments, game scores, and settings.difficulty survive bootstrap.
- Empty localStorage now writes a v2 default envelope during initialization, giving future curriculum defaults a deterministic migration anchor without clearing user progress.
- Playwright migration evidence is stored in `.sisyphus/evidence/task-9-storage-migration.json` and `.sisyphus/evidence/task-9-empty-storage.json`; route-shell evidence is stored in `.sisyphus/evidence/task-9-route-shells.txt`.

## 2026-05-07 Task 11: textbook Markdown conventions and curriculum authoring guide
- Created `src/data/textbooks/README.md` as the canonical authoring guide, placed data-adjacent to the textbook source files it describes.
- The guide documents directory structure (`src/data/textbooks/{volumeDirectory}/book.md` and `images/`), required frontmatter (`volumeId`, `schoolLevel`, `grade`, `bookTitle`, `publisher`, `edition`, `chapters`), heading conventions, and image path rules (`images/...` or `./images/...`).
- The guide includes exact seed tag examples `g9-acid-base-salt-neutralization` and `g10-redox-valence-change`, with their corresponding Chinese display paths `九年级/酸碱盐/中和反应` and `高一/氧化还原/化合价变化`.
- The guide explicitly states that raw Markdown/images are source assets only and runtime modules must not import them directly.
- The guide explains the reviewable extraction workflow: OCR/vision may propose content, but canonical formulas/questions/experiment references require reviewed metadata before runtime use.
- The guide includes the explicit out-of-scope statement: `不包含完整教材内容`.
- Evidence files captured: `.sisyphus/evidence/task-11-guide-validation.txt` (validate:curriculum output) and `.sisyphus/evidence/task-11-scope-boundary.txt` (seed ID and scope boundary checks).
- Retry fix: added the exact literal `src/data/textbooks/{volumeDirectory}/book.md` to the directory structure section so the Node guide-check command passes.

## 2026-05-07 Task 15: reviewed chemical notation paths
- `formulaText` and `equationText` are now the reviewed runtime text conventions for curriculum-derived notation; records using them must carry `notationReviewStatus: reviewed` and render through `formulaHTML`/`equationHTML` via the chemNotation boundary.
- `textbookAssetReferences[].reviewedTextField` ties a reviewed formula/equation field back to a reviewed manifest asset, while `validate:textbook-assets` and `validate:supporting` reject unreviewed formula/image references.
- Browser QA verified the reviewed C60 quiz formula and hydrogen-combustion lab equation both produced KaTeX markup; evidence is under `.sisyphus/evidence/task-15-*`.

## 2026-05-07 Task 12: aggregate verification
- Task 12 aggregate verification passed without source/test fixes: `validate:all:safe`, targeted curriculum/chem-notation/textbook-assets/supporting validators, business-data import audit, build, and the route-shell Playwright spec all exited 0.
- `validate:all:safe` covers elements, supporting, spectral, curriculum, textbook assets, business import audit, and build, but Task 12 still captured targeted evidence for the explicitly accepted validators and route-shell spec.
- The existing Vite large chunk warning remains informational during production build; no integration gap was exposed.
- `npm run validate:data` remains outside Task 12 acceptance because it includes the known story-media shard mismatch path.

## 2026-05-07 F2 progress quiz mastery fix
- Progress curriculum quiz completion now preserves legacy score.id/score.quizId matching and also credits stored quiz sessions whose questionIds array contains a tagged quiz ID.
- Focused proof evidence is stored in .sisyphus/evidence/f2-progress-quiz-mastery-questionids.txt; validate:supporting and build evidence are stored with the same f2-progress-quiz-mastery prefix.

## 2026-05-08 Textbook Import Repeatability Guidance
- Repeat the reviewed C60 workflow pattern for the next topic: create a reviewed source inventory first, then add only the intended runtime records, keep draft-only experiment ideas isolated from runtime lab/reactions, run negative validator self-checks for missing and unreviewed source references, and finish with aggregate QA (`validate:all:safe`, `validate:chem-notation`, business import audit, build, and route/content Playwright smoke).
