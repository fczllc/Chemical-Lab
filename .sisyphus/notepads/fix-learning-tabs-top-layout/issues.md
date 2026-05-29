

## Second build artifact cleanup

- Atlas re-ran `npm run build` for Task 2 verification, which again updated the asset hash in `dist/index.html`.
- Restored `dist/index.html` from HEAD a second time using `git checkout HEAD -- dist/index.html`.
- `src/modules/progress.js` remains unchanged with `renderManualLearningSection()` first in `container.innerHTML`.
- `git diff --name-only -- .` no longer lists `dist/index.html`.

### Date
2026-05-28

## Final Wave QA Rejection and Fix

**Issue:** Textbook tab switching changes `.is-active` class, but inactive panels remain visible and stacked. Clicking `九年级·上册` changes the active tab/panel to `rj-chemistry-grade9-2024-vol1`, but the first visible card under the tabs still belongs to `rj-chemistry-grade8-54-2024-full` because all panels remain `display:block`, `visibility:visible`, `hidden:false` and stacked.

**Root Cause:** `renderManualLearningSection()` renders all panels without the HTML `hidden` attribute. The `bindStageInteractions()` tab click handler only toggles the `.is-active` class, but there are no CSS rules for `.textbook-panel` or `.is-active` in the codebase, so inactive panels remain fully visible and occupy layout space.

**Fix Applied:**
1. In `renderManualLearningSection()` (line ~938): Added conditional `hidden` attribute to inactive panels:
   ```
   <div class="textbook-panel ${group.sourceVolumeId === activeGroupId ? 'is-active' : ''}" data-textbook-panel="${escapeHtmlAttr(group.sourceVolumeId)}" ${group.sourceVolumeId !== activeGroupId ? 'hidden' : ''}>
   ```
2. In `bindStageInteractions()` (line ~655): Added `panel.hidden = !isActive` alongside the existing `.is-active` toggle:
   ```javascript
   document.querySelectorAll('[data-textbook-panel]').forEach((panel) => {
     const isActive = panel.dataset.textbookPanel === tabId;
     panel.classList.toggle('is-active', isActive);
     panel.hidden = !isActive;
   });
   ```

**Verification:**
- `lsp_diagnostics` on `src/modules/progress.js`: No errors found.
- Manual code inspection confirms both `hidden` attribute rendering and runtime toggle are present.
- All 8 tabs, all 2009 cards remain in DOM. Existing modal/card/completion logic preserved.
- No CSS modifications needed. No build required. No `dist/index.html` changes.

### Date
2026-05-28

- 2025-05-28: Removed 	ransform: translateY(-2px) from .textbook-tab:hover to prevent top border clipping caused by upward shift against overflow-y: hidden container. Hover border, shadow, and color remain intact.

