# Decisions

## 2026-05-07 Task: session-start
- Stable machine IDs are canonical for curriculum tags; Chinese grade/chapter/topic paths are display/source metadata.
- Textbook directory names may be Chinese and human-readable; stable `volumeId` metadata must identify each volume for code and validation.
- Raw Markdown/images are source assets only; runtime canonical data must go through `src/data/index.js` or accepted repo import patterns.
- OCR/vision output from textbook images must not be canonical until reviewed.

## 2026-05-07 Task 1: curriculum taxonomy seed
- Seed curriculum tags use stable machine IDs as both object keys and id values; Chinese paths are stored only in display/source metadata fields.
- Difficulty values were seeded from the plan's fixed bands: 入门, 初中, and 高中基础; full textbook coverage remains out of scope for Task 1.

## 2026-05-07 Task 2: curriculum validator
- Experiment unlock and game challenge metadata are optional on current curriculum tags, but when present they are strict object arrays with stable IDs, tag references, allowed difficulty values, and known game IDs.
- Source volume validation uses an explicit allowlist for current and planned PEP chemistry volumes plus the app intro core seed volume.

## 2026-05-07 Task 3: safe validation wiring
- The safe aggregate is a dedicated npm script that enumerates only the non-story-media validators plus the import audit and build, so it can be used without inheriting the current story-media shard mismatch.

## 2026-05-07 Task 4: supporting curriculum metadata
- Supporting data uses only Task 1 seed tags; element-symbol and broad learning/game items map to intro-element-symbols, while reaction/experiment-oriented content maps to g10-redox-valence-change.
- Supporting-data validation requires migrated records to carry curriculumTags and difficulty rather than accepting optional metadata, so missing reaction/experiment tags fail immediately.
- GAME_META keeps existing unprefixed object keys and prefixed GAME_KEYS values unchanged; curriculum metadata is additive only.

## 2026-05-07 Task 7: game challenge metadata
- Kept raw GAME_META object keys as canonical runtime game IDs and kept GAME_KEYS as the persisted storage key alias layer, matching Task 4's compatibility decision.
- Challenge scoring thresholds are metadata/display targets only; they mirror current finish-screen rating thresholds but do not drive per-difficulty rules or gameplay behavior.
