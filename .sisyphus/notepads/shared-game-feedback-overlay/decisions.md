# Task 1: Shared Game Feedback Overlay — Decisions

## Module Location
Placed in src/modules/gameFeedbackOverlay.js so both games.js and quiz.js can import with relative paths (./gameFeedbackOverlay.js).

## API
Exported function: showGameRuleFeedback(result)
- Accepts 'correct' | 'incorrect'
- Ignores unknown values
- No return value

## Mounting Strategy
document.body.appendChild(el) — stable, outside volatile game-area rerenders.

## Animation Strategy
CSS classes: .is-visible toggles opacity/scale transition.
Retrigger: remove .is-visible and .is-correct/.is-incorrect, force reflow (void el.offsetWidth), then re-add classes.
Hide: setTimeout removes .is-visible; transitionend listener removes from DOM; fallback timeout ensures cleanup.

## Accessibility
- aria-hidden="true"
- pointer-events: none
- prefers-reduced-motion: reduce disables transitions
