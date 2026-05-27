## 2026-05-27 — Task 2 Allowlist Format Correction

**Issue:** Atlas rejected 	ask-2-allowlist.txt because it contained headers, section labels, generated timestamps, notes, and total-count text. The plan requires path-only format.

**Root cause:** Initial allowlist was written as a human-readable categorized document instead of a machine-readable path list.

**Fix:** Rewrote 	ask-2-allowlist.txt to contain exactly 65 repo-relative file paths, one per line, no headers, no metadata. Updated 	ask-2-allowlist-forbidden-check.txt to validate the path-only file with explicit line count, invalid-line count, required-path check, and prefix check.

**Lesson:** Evidence files consumed by downstream tasks must match the exact format contract. When a plan says "exact relative file paths only," it means literally only paths.

## 2026-05-27 — Task 3 PEP Count Evidence Shape Correction

**Issue:** Initial 	ask-3-pep-counts.txt failed with TypeError: data.filter is not a function and EXIT_CODE: 1.

**Root cause:** src/data/achievementsData.json is an object with an chievementsData array property, not a bare array. The first assertion used equire(...).filter(...) directly.

**Fix:** Rewrote the evidence by rerunning the assertion with const raw=require('./src/data/achievementsData.json'); const data=Array.isArray(raw)?raw:raw.achievementsData; plus an array guard. The corrected assertion prints pep-counts-ok and records EXIT_CODE: 0. The same evidence also records all four PEP batch files as present.

**Validator status:** Existing Task 3 validator evidence was inspected after the correction and still contains four EXIT_CODE: 0 entries with no non-zero validator exit-code lines.
## 2026-05-27 — Task 6 Targeted Playwright Repair

**Initial failure:** `npx playwright test tests/content/pep-learning-tabs.spec.js --project=chromium` failed with Playwright strict-mode violation because `.progress-textbook-tabs` matched two nodes.

**Root cause:** `index.html` still rendered an empty legacy placeholder `<div class="progress-textbook-tabs" data-testid="textbook-tabs"></div>` in the progress section, while `src/modules/progress.js` rendered the real populated `.textbook-tab-bar.progress-textbook-tabs` inside `renderManualLearningSection()`.

**Fix 1:** Removed only the empty legacy placeholder from `index.html`. This resolved the duplicate selector owner without touching the populated runtime tab bar.

**Follow-up failure:** After the duplicate was fixed, strict label equality failed because `tabs.allTextContents()` included visible `.textbook-tab-count` badge numbers in each button's text.

**Fix 2:** Updated `tests/content/pep-learning-tabs.spec.js` to clone each tab button, remove only `.textbook-tab-count` from the clone, and compare the remaining label text with `EXPECTED_TAB_LABELS`. This keeps strict exact label/order assertions, exact PEP count assertions, positive all-tab card counts, and page/console error failure.

**Verification:** Corrected targeted Playwright rerun exited 0. Post-fix `npm run validate:all:safe` exited 0. Optional full Playwright suite was attempted before the repair and failed broadly; Task 6 evidence documents it as optional broad-suite failure rather than success.
