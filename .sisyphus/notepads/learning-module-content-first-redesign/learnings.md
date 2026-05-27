

## Task 4 Findings (2026-05-22)

- Added scoped CSS in `src/styles/achievements.css` for `.progress-learning-card`, `.lesson-modal-*`, and responsive breakpoints.
- Cards are now distinct readable blocks with separate title/source/status, hover/focus affordance, and `is-complete`/`is-focused` states.
- Modal overlay is fixed (`position: fixed; inset: 0; z-index: 200`) with backdrop blur.
- Modal shell is constrained to `min(85vw, 960px)` width and `min(85vh, 720px)` height.
- Modal body has `overflow-y: auto` and fills available height via `grid-template-rows: auto 1fr auto`.
- Mobile breakpoint (`max-width: 560px`) makes modal full-viewport to avoid overflow; at `390px` font sizes slightly reduce.
- Added `tabindex="0"`, `role="button"`, and `aria-label` to `article.progress-learning-card`.
- Added Enter/Space keyboard handler in `bindStageInteractions` to open modal without mutating storage.
- Focus outline styles (`:focus-visible`) added for cards, close button, and confirm button.
- Playwright `learning-content-modal.spec.ts`: 8/8 passed.
- Mobile geometry check (390x844 viewport): modal width <= viewport+4px, `overflow-y: auto/scroll` confirmed, close button visible, no horizontal document overflow.
- `npm run build`: passed (exit 0).
- `achievements-progress-coupling.spec.ts` failures are expected legacy-test mismatches (old row UI expects `未开始`/`待同步`/`[data-learning-segment-complete]`), to be resolved in Task 5.
- Reusable gotcha: When adding `tabindex="0"` to a non-interactive element for keyboard access, always pair with `role="button"` and explicit key handlers for Enter/Space; otherwise screen readers and keyboard-only users cannot activate the element.

## Task 5 Findings (2026-05-22)

- Updated 	ests/ui/achievements-progress-coupling.spec.ts from legacy progress rows/buttons to [data-testid='learning-card'], [data-testid='lesson-modal'], and modal [data-testid='confirm-learning'].
- Manual achievement coupling must be verified via the modal confirmation event; seeding completedLearningSegments before startup does not trigger manual achievement evaluation because initial achievement render skips manualReviewAfterPromotion.
- The achievements grid renders the active category, not all 1204 achievements at once, so read-only action audits should check rendered cards for zero [data-achievement-action] rather than requiring every fixture card to be in the DOM simultaneously.
- The achievements coupling spec now mirrors the modal spec readiness pattern: wait for window.appState.elements and hide the loader if needed, without requiring the old detail-panel/table readiness checks.
