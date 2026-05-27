

## 2026-05-27 Task 4 REPAIR Complete

### Problem Found
Initial Task 4 migration accidentally stripped renderProgress() to only render the manual learning section, dropping the full dashboard, stat grid, metric panels, and five-stage learning path. Atlas rejected this.

### Repair Actions
1. **Restored renderProgress()** — full dashboard rendering with:
   - progress-dashboard header with progress ring
   - progress-stat-grid (6 stat cards)
   - progress-metrics-grid (4 metric panels: activity, quiz, game, experiment/achievement)
   - progress-learning-path with stage cards and selected stage detail
   - renderManualLearningSection call at the end

2. **Repaired renderManualLearningSection()** — changed signature to (unlockedAchievements, completedLearningSegments):
   - Calls getManualLearningSegments internally
   - Uses getTextbookGroups for deterministic ordering
   - Renders .progress-textbook-tabs bar with data-textbook-tab buttons
   - Renders .textbook-panel divs with data-textbook-panel
   - Each panel contains only its textbook's cards via renderLearningCard
   - Preserves lesson modal per active panel

3. **Repaired bindStageInteractions()** — added tab click handlers:
   - [data-textbook-tab] buttons set activeTextbookId and toggle .is-active class
   - [data-textbook-panel] panels toggle .is-active class
   - Preserves stage-select, learning-card open, lesson modal confirm/close

4. **Removed standalone renderTextbookTabs()** — tabs are now inline in renderManualLearningSection

### Verification (Post-Repair)
- lsp_diagnostics: 0 errors
- npm run build: passes (exit 0)
- storage.js: unchanged
- 22/22 static checks passed (added data-textbook-tab, data-textbook-panel, full dashboard checks)
- Evidence files refreshed: task-4-progress-static.txt, task-4-learner-state-guard.txt

### Order Fix (Post-Atlas Rejection)
Root cause: KNOWN_TEXTBOOK_ORDER used pep- canonical IDs for grade 8/9/12, but actual migrated data still uses rj- IDs. This caused rj tabs to sort as unknowns after pep tabs.
Fix: Updated KNOWN_TEXTBOOK_ORDER to actual runtime IDs:
- rj-chemistry-grade8-54-2024-full
- rj-chemistry-grade9-2024-vol1
- rj-chemistry-grade9-2024-vol2
- pep-chemistry-g10-required-1
- pep-chemistry-g10-required-2
- pep-chemistry-g11-selective-1
- pep-chemistry-g11-selective-2
- rj-chemistry-g12-selective-3-organic-2019
Labels remain clean Chinese. Verified with Node script against achievementsData.json.

### Key Design Decisions
- Used class-toggle approach in bindStageInteractions (like source) rather than full re-render on tab click, since renderManualLearningSection now embeds tabs inline
- activeTextbookId state is still used by renderManualLearningSection to set initial active tab on full re-render
- All lesson modal semantics preserved: markLearningSegmentCompleted with same args, modal stays open after confirm


## 2026-05-27 Task 5 Complete

### Actions
1. Created `tests/content/pep-learning-tabs.spec.js` adapted from source worktree test, upgraded for main selectors and full 8-tab coverage.
2. Test asserts exactly 8 tabs inside `.progress-textbook-tabs` using `[data-textbook-tab]` selector.
3. Test asserts exact label order: 八年级·全册, 九年级·上册, 九年级·下册, 高一/10年级·必修第一册, 高一/10年级·必修第二册, 高二/11年级·选择性必修一·反应原理, 高二/11年级·选择性必修二·物质结构与性质, 高三/12年级·有机基础.
4. Test clicks every tab and asserts active panel (`.textbook-panel.is-active`) contains `[data-testid="learning-card"]` cards with `toBeGreaterThan(0)`.
5. Test asserts exact PEP counts: 213, 263, 198, 146.
6. Test asserts no banned terms (`pep-chemistry`, `人教版`, `2019`, `2024`) in any tab label.
7. Test fails if `pageErrors` or `consoleErrors` arrays are non-empty.
8. Evidence files produced:
   - `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-5-test-static-review.txt`
   - `.sisyphus/evidence/apply-eight-textbook-tabs-to-main/task-5-label-sanitization.json`

### Verification
- Static review script: 16/16 checks PASS
- Selectors verified: `.progress-textbook-tabs`, `[data-textbook-tab]`, `.textbook-panel.is-active`, `[data-testid="learning-card"]` all present in test
- Exact counts (213, 263, 198, 146) present in test
- Banned term negative assertions present
- Page/console error failure assertions present
- No Playwright execution performed (deferred to Task 6)


## 2026-05-27 Task 5 REPAIR Complete

### Atlas Rejection
Atlas rejected initial Task 5 test because label order assertions used `expect(actual).toContain(expected)` (substring match), which allows extra text around labels. The plan requires exact clean labels/order.

### Repair Actions
1. **Replaced loose label loop** with strict array equality:
   - Before: `for` loop with `expect(actual).toContain(expected)`
   - After: `expect(cleanLabels).toEqual(EXPECTED_TAB_LABELS)`
   - This proves both exact order and exact label text after whitespace normalization.
2. **Kept banned term assertions** as additional guard (does not replace exact equality).
3. **Kept all other assertions unchanged**: 8-tab count, all-tab clicks, active panel cards, exact PEP counts (213, 263, 198, 146), positive legacy counts, page/console error failure.
4. **Refreshed evidence files** with truthful checks:
   - `task-5-test-static-review.txt` now explicitly verifies `STRICT array equality for labels (toEqual): true` and `No loose toContain in label loop: true`
   - `task-5-label-sanitization.json` updated with `strictArrayEqualityPresent` and `noLooseToContainInLabelLoop` checks

### Verification
- Static review script: 17/17 checks PASS
- No `toContain` remains in label exactness assertions
- Selectors, counts, banned terms, error failure all verified present
- No Playwright execution performed (deferred to Task 6)
