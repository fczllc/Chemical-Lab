
## Fix: Saved Experiment Title Overrides Now Render Chemical Formulas Safely

- **Problem**: When users saved an experiment title containing chemical formula syntax (e.g. `$H_2O$`, `\(H_2O\)`, `\mathrm{H_2O}`), the readonly display showed literal raw text instead of rendered formulas. This happened because override titles were routed through `escapeAttr()` (plain text escaping) while only canonical titles used `mixedProseFormulaHTML()`.
- **Solution in `src/modules/lab.js`**:
  1. **Card title rendering** (around line 248): Removed the `source === 'override'` branch. Now both override and canonical titles use `mixedProseFormulaHTML(titleSource.text)` for the rendered HTML.
  2. **Detail readonly title rendering** (`renderTitleReadonly()`, around line 600): Removed the `source === 'override'` branch. Now always uses `mixedProseFormulaHTML(title)`.
- **XSS safety preserved**:
  - `mixedProseFormulaHTML()` escapes all non-math prose segments via `escapeHTML()` and renders math tokens with KaTeX using `trust: false`, `throwOnError: false`, `maxSize: 10`, `maxExpand: 200`.
  - The `title` tooltip attribute on card titles still uses `plainChemText(titleSource.text)` + `escapeAttr()` to remain plain text.
  - Input values, placeholders, and error text in edit mode still use `escapeAttr()`.
  - Malicious text such as `<img src=x onerror=alert(1)>` remains harmless escaped text.
- **Canonical title rendering unchanged**: Canonical titles already used `mixedProseFormulaHTML()`; no behavior change there.
- **No new dependencies added**.
- **No storage semantics or localStorage keys modified**.
- **Verification**:
  - `lsp_diagnostics` on `src/modules/lab.js`: zero errors.
  - `npm run build`: passes successfully.
  - `npx playwright test tests/ui/experiment-title-edit.spec.ts`: 3/3 tests passed.
  - Grepped for `TODO`, `FIXME`, `HACK`, `console.log`, `@ts-ignore`: none found in changed file.
  - Existing `innerHTML` assignments are pre-existing and unrelated to this change.

## Fix: Cursor Position Preservation in Experiment Title Input

- Replaced the naive `input` event handler in `src/modules/lab.js` that directly assigned `titleInput.value = trimmed`, which caused the caret to jump to the end on every truncation.
- New handler:
  - Returns early if no truncation is needed, avoiding any DOM mutation.
  - Captures `selectionStart`, `selectionEnd`, and `selectionDirection` before modifying the value.
  - Computes the weighted length (`getTitleLengthUnits`) of the prefix before the old cursor.
  - After assigning the truncated value, walks the new string to find the character index whose cumulative weighted units most closely match the old prefix length, restoring the cursor to the logical edit position.
  - Preserves selection ranges by clamping `selectionEnd` to the new value length.
  - Gracefully falls back to placing the cursor at the end if `setSelectionRange` is unavailable.
- Preserved all existing behaviors:
  - Weighted max-length enforcement (`MAX_TITLE_LENGTH_UNITS = 48`).
  - Save/cancel, Enter/Escape handling, blank validation.
  - Formula rendering in readonly mode and XSS escaping for user overrides.
  - Card and detail title refresh on `experimenttitlechange`.
- LSP diagnostics clean; `npm run build` passes successfully.

## Tweak: Increase Editable Experiment Title Max Length to 40 Full-Width Characters

- Updated `MAX_TITLE_LENGTH_UNITS` from `48` to `80` in `src/modules/lab.js` (line 28).
  - This allows up to 40 Chinese/full-width characters (each counts as 2 units) while keeping half-width/ASCII characters at 1 unit.
- Updated `.lab-detail-title-input` width from `53ch` to `80ch` in `src/styles/lab.css` (line 616).
  - Keeps `max-width: 100%` to prevent modal overflow.
- All truncation, save, and Enter-save paths automatically use the new limit because they reference `MAX_TITLE_LENGTH_UNITS`.
- Cursor-preservation logic and all other title behaviors remain unchanged.
- LSP diagnostics clean (lab.js: no errors; lab.css: pre-existing Biome warnings only); `npm run build` passes successfully.


## Tweak: Increase Experiment Detail Modal Width for Edit-Mode Layout

- **Problem**: At the desktop viewport shown in the screenshot, entering experiment title edit mode caused the save (√) / cancel (×) buttons to wrap or crowd the right-side 安全守则 / 关闭 buttons, because the modal was capped at `1100px` while the title input is `80ch` (≈40 Chinese characters) wide.
- **Solution in `src/styles/lab.css`**:
  - Changed `.lab-detail-modal` width from `min(1100px, 92vw)` to `min(1280px, 96vw)`.
  - This gives the header row enough horizontal room for the full-width title input plus its action buttons alongside the safety/close buttons on a single line.
  - The viewport percentage increased from `92vw` to `96vw` so the modal still uses most of the screen on smaller desktops.
  - `max-height` remains `min(760px, 88vh)`; modal centering and neon aesthetic are unchanged.
- **Responsive safety preserved**:
  - On narrow viewports the `96vw` cap prevents overflow.
  - Existing mobile media queries (`max-width: 680px`, `768px–900px`) continue to stack content as before.
- **No JavaScript changes**.
- **No other CSS rules modified**.
- **Verification**:
  - `npm run build`: passes successfully.
  - Grepped for duplicate `.lab-detail-modal` definitions: only one declaration exists in `lab.css`.
