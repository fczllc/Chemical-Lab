/**
 * Shared game feedback overlay
 * Displays a decorative emoji overlay for correct/incorrect game actions.
 * Single-instance, mounted on document.body, restartable, auto-removing.
 */

const OVERLAY_CLASS = 'game-rule-feedback-overlay';
const CORRECT_EMOJI = '😊';
const INCORRECT_EMOJI = '\u{1F61F}'; // 😟
const DISPLAY_MS = 1200;

let overlayEl = null;
let hideTimeoutId = null;

function getOrCreateOverlay() {
  if (typeof document === 'undefined') {
    return null;
  }

  if (overlayEl && overlayEl.isConnected) {
    return overlayEl;
  }

  const el = document.createElement('div');
  el.className = OVERLAY_CLASS;
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('data-testid', 'game-rule-feedback-overlay');
  document.body.appendChild(el);
  overlayEl = el;
  return el;
}

function clearExistingTimeout() {
  if (hideTimeoutId) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }
}

function scheduleHide(el) {
  clearExistingTimeout();
  hideTimeoutId = setTimeout(() => {
    if (el && el.isConnected) {
      el.classList.remove('is-visible');
      // Allow transition-out to finish before removing from DOM
      el.addEventListener(
        'transitionend',
        () => {
          if (el && el.isConnected && !el.classList.contains('is-visible')) {
            el.remove();
          }
        },
        { once: true }
      );
      // Fallback: remove after a generous buffer if transitionend doesn't fire
      setTimeout(() => {
        if (el && el.isConnected && !el.classList.contains('is-visible')) {
          el.remove();
        }
      }, 400);
    }
  }, DISPLAY_MS);
}

/**
 * Show a decorative emoji overlay for a game rule result.
 * @param {'correct' | 'incorrect'} result
 */
export function showGameRuleFeedback(result) {
  if (typeof document === 'undefined') {
    return;
  }

  if (result !== 'correct' && result !== 'incorrect') {
    return;
  }

  const el = getOrCreateOverlay();
  if (!el) {
    return;
  }

  const emoji = result === 'correct' ? CORRECT_EMOJI : INCORRECT_EMOJI;

  // Reset state to enable retrigger animation
  el.classList.remove('is-correct', 'is-incorrect', 'is-visible');
  el.textContent = emoji;

  // Force reflow so the browser registers the class removal before re-adding
  // eslint-disable-next-line no-unused-expressions
  void el.offsetWidth;

  el.classList.add(result === 'correct' ? 'is-correct' : 'is-incorrect');
  el.classList.add('is-visible');

  scheduleHide(el);
}
