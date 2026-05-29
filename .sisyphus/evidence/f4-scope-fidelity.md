# F4 Scope Fidelity Check — learning-module-textbook-confirmation

**Plan reviewed:** `.sisyphus/plans/learning-module-textbook-confirmation.md`  
**Evidence date:** 2026-05-28  
**Reviewer:** F4 deep-review agent  

---

## 1. Original User Requirements Mapping

| Original Requirement (Chinese) | Implemented Behavior | Evidence |
|---|---|---|
| 教材 Tab 下的教材卡片不应包含实验卡片，实验属于"实验室" | `getManualLearningSegments` filters by `sourceVolumeId.trim().length > 0`; no experiment cards appear under `#progress` | `progress.js:139-142` |
| "学习"页不应包含五阶段学习路径、前六个元素学习项或"初级探索者" | `renderProgress()` no longer renders `.progress-learning-path`, stage cards, or stage detail; heading is `教材复习确认` | `progress.js:575-588`, diff shows removal of stage rendering block |
| 被动统计、进度、解锁、元素数量、探索者等级等应属于"成就"，不属于"学习" | No `.progress-ring`, `0 / 118`, `0%`, activity feed, or achievement summary on `#progress`; tests assert counts are 0 / text absent | `pep-learning-tabs.spec.ts:58-68`, `achievements-progress-coupling.spec.ts:467-472` |
| 学习必须有交互确认：卡片点击打开弹窗；弹窗有"确定已学习"按钮；确认后记录状态和时间 | Card click opens modal (no completion); modal footer has `确定已学习` button; `markLearningSegmentCompleted` writes date | `learning-content-modal.spec.ts:8-39`, `storage.js:929-962` |
| 卡片右下角显示 `未学习` / `学习确认：YYYY-MM-DD` | `renderLearningCard` sets status text exactly per state | `progress.js:955-988` |
| 当前只处理学习模块；成就页、实验室、学习流/路径的后续迁移明确不在本计划范围内 | No changes to `achievements.js`, `lab.js`, or `learningPath.json`; future migration not implemented | git diff confirms |

---

## 2. Scope Guardrails Verification

### 2.1 Learning module is active textbook confirmation only
- **PASS.** `#/progress` now renders only `renderManualLearningSection(...)`. The only interactive confirmation path is the modal `确定已学习` button. No passive auto-completion exists.
- `renderProgress()` reads only `unlockedAchievements`, `completedLearningSegments`, and `learningSegmentCompletionDates` — no quiz scores, no experiment counts, no element counts.

### 2.2 Passive/statistical content removed from learning, not migrated
- **PASS.** Removed from `#progress`:
  - `五阶段学习路径` section (`progress-learning-path`)
  - Stage cards (`progress-stage-card`) and detail (`progress-stage-detail`)
  - Activity feed (`activity-item`) — test explicitly asserts count 0
  - Progress rings, `0 / 118`, `0%`
  - Old reward copy (`解锁 0 个游戏`, `项功能`, `个实验`, `需要元素`)
- Tests confirm these selectors/texts are absent on `#progress`.
- **Not migrated** to achievements page in this plan — achievement page remains untouched.

### 2.3 Experiments remain lab-owned
- **PASS.** `src/modules/lab.js` has **zero diff** in this plan. Lab regression test `tests/ui/lab-textbook-experiments.spec.ts` passes (8 passed, 2 skipped). No experiment cards or experiment counts appear on the learning page.

### 2.4 `src/data/learningPath.json` not deleted, reshaped, or used as hidden non-textbook UI source
- **PASS.** `learningPath.json` is **unchanged** in git diff. The learning page does not iterate `learningPath.stages` for rendering; it only uses `achievementsData` + `textbookAssetManifest` to build manual segments filtered by `sourceVolumeId`.
- `learningPath.stages` is still referenced in `progress.js` only for:
  - `selectedStageId` default (harmless, not rendered)
  - `handleStateReset` (harmless)
  - `maybeCelebrateStageProgress` (called on `learnedElements` change, but `renderProgress` no longer renders stages)
  - `selectStageForLearningSegment` / `readAchievementActionFocus` (achievement navigation compatibility)

### 2.5 Passive/statistical content not reintroduced under new names
- **PASS.** No new progress bars, percentages, counts, badges, levels, or unlock summaries were added to `#progress`. The only count visible is `${manualSegments.length} 个片段` (active content count, not passive progress) and `共 ${group.total} 节` (neutral section count per tab).

### 2.6 UI remains Chinese-first and children-learning appropriate
- **PASS.** All user-facing copy on `#progress` is Chinese-first: `教材复习确认`, `未学习`, `学习确认：YYYY-MM-DD`, `学习确认：日期待补充`, `确定已学习`, `暂无教材复习内容`. No broad unrelated redesign.

### 2.7 Compatibility: existing completed segments remain valid; missing legacy dates show `日期待补充`
- **PASS.**
  - `completedLearningSegments` Set compatibility retained.
  - Old v0/v1/v2 envelopes get empty `learningSegmentCompletionDates: {}`.
  - v3 envelopes with `completedLearningSegments` but no dates hydrate correctly; cards show `学习确认：日期待补充`.
  - Test `legacy completed lesson without stored date shows date pending` passes.

---

## 3. Risks and Residual Observations

| Risk | Severity | Mitigation / Status |
|---|---|---|
| `learningPath.stages` still imported and referenced in `progress.js` for helper functions and test hooks, though not rendered. Could confuse future readers. | Low | The references are harmless (no rendering). Plan explicitly says "leave existing helper functions in place to avoid broad refactors." Acceptable. |
| `lab-textbook-experiments.spec.ts` has a flaky date-freezing issue (noted in notepad: frozen Date init script added after `beforeEach` has already loaded app). One test run recorded real current date instead of fixed date. | Low | This is a **pre-existing test infrastructure issue**, not caused by this plan. The lab spec was explicitly left unchanged per task constraint. The test passes on rerun. |
| `renderActivityList` and `renderMetricBars` remain in `progress.js` as dead code (no longer called by `renderProgress`). | Low | Plan says "unused cleanup is optional only if no tests or imports break." Not a scope deviation. |

---

## 4. Test and Evidence Summary

| Test File | Result | Relevant Evidence |
|---|---|---|
| `tests/ui/learning-content-modal.spec.ts` | **PASS** (all tests pass on rerun; 1 flaky connection-refused failure unrelated to code) | Modal confirmation, date persistence, reload, legacy fallback, XSS, scroll |
| `tests/content/pep-learning-tabs.spec.ts` | **PASS** | 8 tabs, removed stage selectors/text, non-empty cards |
| `tests/ui/achievements-progress-coupling.spec.ts` | **PASS** | Achievement unlock after modal, date-aware card footer, activity feed absence, raw segment does not inflate progress |
| `tests/ui/lab-textbook-experiments.spec.ts` | **PASS** (8 passed, 2 skipped) | Lab ownership unchanged, no `lab.js` modifications |
| `npm run build` | **PASS** (exit 0) | Production build succeeds |
| `npm run validate:all:safe` | **PASS** | All data validators, runtime boundary, textbook workflow, and build pass |

---

## 5. Verdict

All original user requirements are mapped to implemented behavior. Scope guardrails are satisfied:
- Learning page is **active textbook confirmation only**.
- Passive/statistical content is **removed, not migrated**.
- Experiments remain **lab-owned** (`lab.js` untouched).
- `learningPath.json` is **preserved** and not reshaped.
- UI remains **Chinese-first** with no broad redesign.
- Legacy compatibility and missing-date fallback work correctly.

**VERDICT: APPROVE**
