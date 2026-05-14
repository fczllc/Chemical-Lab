
## F4 Scope Fidelity Check
- Focused overlay spec showed timing sensitivity under default parallel workers: 
px playwright test tests/ui/shared-game-feedback-overlay.spec.ts had 4 passed / 2 failed in xpectOverlay pointer-events polling, while --workers=1 passed all 6 tests. This did not indicate scope creep, but the helper may be flaky under parallel load because the overlay auto-removes after 1200ms.

Correction for previous F4 note: the focused overlay spec showed timing sensitivity under default parallel workers. Command: npx playwright test tests/ui/shared-game-feedback-overlay.spec.ts. Result: 4 passed / 2 failed in expectOverlay pointer-events polling. Serial command: npx playwright test tests/ui/shared-game-feedback-overlay.spec.ts --workers=1. Result: all 6 passed. This did not indicate scope creep, but the helper may be flaky under parallel load because the overlay auto-removes after 1200ms.

## 2026-05-14 - F3 Real Manual QA focused spec blocker

- `npm run build` passed during F3.
- Real browser QA on `http://127.0.0.1:4173` confirmed the overlay appears for drag, reaction, and full quiz correct/incorrect outcomes; uses exact `🎆`/`😟`; has one instance; has `aria-hidden="true"`; computes `pointer-events: none`; is not returned by center `document.elementFromPoint()`; and auto-removes.
- Real browser QA confirmed quick quiz and collector interactions do not create `.game-rule-feedback-overlay`.
- Blocking issue: `npx playwright test tests/ui/shared-game-feedback-overlay.spec.ts` failed twice with 5 passed / 1 failed. The failing helper test is `Shared game feedback overlay > helper renders a single non-blocking overlay and removes it after timeout`; Playwright expected computed `pointer-events` to be `none` but received an empty string while polling after `showGameRuleFeedback(...)`.
- Console observations during manual QA showed only the benign `/favicon.ico` 404.

### Resolution

- Resolved with a test-only stabilization in `tests/ui/shared-game-feedback-overlay.spec.ts`: `expectOverlay` now polls a fresh browser-side DOM snapshot instead of evaluating computed style through a potentially stale transient locator.
- Required assertions remain: exact emoji, one overlay, visible class, `aria-hidden="true"`, computed `pointer-events: none`, and auto-removal.
- Verified fixed command: `npx playwright test tests/ui/shared-game-feedback-overlay.spec.ts` passed 6/6 with default workers.
