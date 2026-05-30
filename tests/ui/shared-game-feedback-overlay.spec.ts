import { expect, test, type Page } from '@playwright/test';

const OVERLAY_SELECTOR = '.game-rule-feedback-overlay';
const CORRECT_EMOJI = '😊';
const INCORRECT_EMOJI = '😟';

declare global {
  interface Window {
    appState?: {
      elements?: unknown[];
    };
  }
}

test.describe('Shared game feedback overlay', () => {
  test('helper renders a single non-blocking overlay and removes it after timeout', async ({ page }) => {
    await openApp(page);

    await showOverlayFromHelper(page, 'correct');
    await expectOverlay(page, CORRECT_EMOJI);

    await showOverlayFromHelper(page, 'incorrect');
    await expectOverlay(page, INCORRECT_EMOJI);
    await expect(page.locator(OVERLAY_SELECTOR)).toHaveCount(1);

    await expectOverlayGone(page);
  });

  test('drag game shows correct and incorrect overlays', async ({ page }) => {
    await openGames(page);
    await startGame(page, 'drag');
    await expect(page.locator('.drag-card[data-drag-atomic]').first()).toBeVisible();

    const targets = await getDragTargets(page);
    await dispatchDragDrop(page, targets.atomic, targets.wrongSlotAtomic);
    await expectOverlay(page, INCORRECT_EMOJI);
    await expectOverlayGone(page);

    await dispatchDragDrop(page, targets.atomic, targets.atomic);
    await expectOverlay(page, CORRECT_EMOJI);
  });

  test('memory game shows correct and incorrect overlays', async ({ page }) => {
    await openGames(page);
    await startGame(page, 'memory');
    await expect(page.locator('.memory-card[data-memory-id]').first()).toBeVisible();

    const targets = await getMemoryTargets(page);
    await clickMemoryCard(page, targets.incorrectFirstId);
    await clickMemoryCard(page, targets.incorrectSecondId);
    await expectOverlay(page, INCORRECT_EMOJI);
    await expectOverlayGone(page);

    await clickMemoryCard(page, targets.correctFirstId);
    await clickMemoryCard(page, targets.correctSecondId);
    await expectOverlay(page, CORRECT_EMOJI);
  });

  test('reaction game shows correct and incorrect overlays', async ({ page }) => {
    await openGames(page);
    await startGame(page, 'reaction');
    await expect(page.getByTestId('reaction-board')).toBeVisible();
    await expect.poll(async () => page.locator('[data-reaction-left]').count()).toBeGreaterThan(0);

    const targets = await getReactionTargets(page);
    await page.locator(reactionLeftSelector(targets.correctReactionId)).click();
    await page.locator(reactionRightSelector(targets.wrongProductId)).click();
    await expect(page.locator('.game-feedback')).toHaveAttribute('data-reaction-result', 'incorrect');
    await expectOverlay(page, INCORRECT_EMOJI);
    await expectOverlayGone(page);

    await page.locator(reactionLeftSelector(targets.correctReactionId)).click();
    await page.locator(reactionRightSelector(targets.correctReactionId)).click();
    await expect(page.locator('.game-feedback')).toHaveAttribute('data-reaction-result', 'correct');
    await expectOverlay(page, CORRECT_EMOJI);
  });

  test('full quiz shows both correct and incorrect overlays', async ({ page }) => {
    await openGames(page);
    await page.locator('[data-game="full-quiz"] .play-btn').first().click();

    const modal = page.locator('#quiz-modal');
    await expect(modal).toHaveClass(/show/);
    await expect(modal.locator('.quiz-mode-badge')).toHaveText('20题完整挑战');

    const outcomes = new Set<'correct' | 'incorrect'>();
    for (let attempt = 0; attempt < 20 && outcomes.size < 2; attempt += 1) {
      const option = modal.locator('.quiz-option-btn[data-option-index="0"]');
      await expect(option).toBeEnabled();
      await option.click();

      const outcome = await readQuizOutcome(page);
      outcomes.add(outcome);
      await expectOverlay(page, outcome === 'correct' ? CORRECT_EMOJI : INCORRECT_EMOJI);

      if (outcomes.size < 2) {
        await modal.locator('[data-quiz-next]').click();
      }
    }

    expect([...outcomes].sort()).toEqual(['correct', 'incorrect']);
  });

  test('quick quiz interaction does not create the shared overlay', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('startquiz'));
    });

    const modal = page.locator('#quiz-modal');
    await expect(modal).toHaveClass(/show/);
    await modal.locator('.quiz-option-btn[data-option-index="0"]').click();
    await expect(modal.locator('.quiz-feedback-panel')).toHaveClass(/is-/);
    await expect(page.locator(OVERLAY_SELECTOR)).toHaveCount(0);

    await modal.locator('[data-quiz-close]').click();
    await expect(modal).not.toHaveClass(/show/);
  });
});

async function openApp(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);
}

async function openGames(page: Page) {
  await openApp(page);
  await page.getByTestId('nav-games').click();
  await expect(page).toHaveURL(/#\/games$/);
  await expect(page.locator('#games')).toHaveClass(/active/);
  await expect(page.getByTestId('games-primary-grid')).toBeVisible();
  await expect(page.getByTestId('games-support-area')).toBeVisible();
}

async function waitForAppReady(page: Page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.element-cell').first()).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 15000 }).toBe(true);
}

async function startGame(page: Page, gameName: 'drag' | 'memory' | 'reaction') {
  await page.locator(`[data-game="${gameName}"] .play-btn`).first().click();
  await expect(page.locator('#game-area')).toHaveClass(/active/);
}

async function showOverlayFromHelper(page: Page, result: 'correct' | 'incorrect') {
  await page.evaluate(async (requestedResult) => {
    const { showGameRuleFeedback } = await import('/src/modules/gameFeedbackOverlay.js');
    showGameRuleFeedback(requestedResult);
  }, result);
}

async function expectOverlay(page: Page, emoji: string) {
  await expect.poll(async () => {
    return await page.evaluate(({ selector, expectedEmoji }) => {
      const overlays = Array.from(document.querySelectorAll(selector));
      if (overlays.length !== 1) {
        return { count: overlays.length };
      }

      const overlay = overlays[0];
      const styles = window.getComputedStyle(overlay);
      return {
        count: overlays.length,
        text: overlay.textContent,
        visible: overlay.classList.contains('is-visible'),
        ariaHidden: overlay.getAttribute('aria-hidden'),
        pointerEvents: styles.pointerEvents,
        expectedEmoji
      };
    }, { selector: OVERLAY_SELECTOR, expectedEmoji: emoji });
  }).toEqual({
    count: 1,
    text: emoji,
    visible: true,
    ariaHidden: 'true',
    pointerEvents: 'none',
    expectedEmoji: emoji
  });
}

async function expectOverlayGone(page: Page) {
  await expect(page.locator(OVERLAY_SELECTOR)).toHaveCount(0, { timeout: 3000 });
}

async function getDragTargets(page: Page) {
  return await page.evaluate(() => {
    const cardAtomicValues = Array.from(document.querySelectorAll('.drag-card[data-drag-atomic]'))
      .map((card) => card.getAttribute('data-drag-atomic'))
      .filter((atomic): atomic is string => Boolean(atomic));
    const slotAtomicValues = Array.from(document.querySelectorAll('.drag-slot[data-slot-atomic]'))
      .map((slot) => slot.getAttribute('data-slot-atomic'))
      .filter((atomic): atomic is string => Boolean(atomic));

    const atomic = cardAtomicValues.find((candidate) => slotAtomicValues.includes(candidate));
    const wrongSlotAtomic = slotAtomicValues.find((candidate) => candidate !== atomic);
    if (!atomic || !wrongSlotAtomic) {
      throw new Error('Could not find drag targets for correct and incorrect drops.');
    }

    return { atomic, wrongSlotAtomic };
  });
}

async function dispatchDragDrop(page: Page, atomic: string, slotAtomic: string) {
  await page.evaluate(({ draggedAtomic, targetAtomic }) => {
    const card = document.querySelector(`.drag-card[data-drag-atomic="${draggedAtomic}"]`);
    const slot = document.querySelector(`.drag-slot[data-slot-atomic="${targetAtomic}"]`);
    if (!card || !slot) {
      throw new Error(`Missing drag card ${draggedAtomic} or slot ${targetAtomic}.`);
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', draggedAtomic);
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }));
    slot.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    slot.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    card.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer }));
  }, { draggedAtomic: atomic, targetAtomic: slotAtomic });
}

async function getMemoryTargets(page: Page) {
  return await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.memory-card[data-memory-id]'))
      .map((card) => card.getAttribute('data-memory-id'))
      .filter((id): id is string => Boolean(id))
      .map((id) => {
        const match = id.match(/^(.*)-(symbol|name)$/);
        if (!match) {
          throw new Error(`Unexpected memory id: ${id}`);
        }
        return { id, pairId: match[1], type: match[2] };
      });

    const correctFirst = cards.find((card) => card.type === 'symbol');
    const correctSecond = correctFirst
      ? cards.find((card) => card.pairId === correctFirst.pairId && card.type !== correctFirst.type)
      : null;
    const incorrectSecond = correctFirst
      ? cards.find((card) => card.pairId !== correctFirst.pairId)
      : null;

    if (!correctFirst || !correctSecond || !incorrectSecond) {
      throw new Error('Could not find memory targets for correct and incorrect pairs.');
    }

    return {
      correctFirstId: correctFirst.id,
      correctSecondId: correctSecond.id,
      incorrectFirstId: correctFirst.id,
      incorrectSecondId: incorrectSecond.id
    };
  });
}

async function clickMemoryCard(page: Page, memoryId: string) {
  await page.locator(memorySelector(memoryId)).click();
}

function memorySelector(memoryId: string) {
  return `.memory-card[data-memory-id="${escapeCssAttribute(memoryId)}"]`;
}

async function getReactionTargets(page: Page) {
  return await page.evaluate(() => {
    const reactionIds = Array.from(document.querySelectorAll('[data-reaction-left]'))
      .map((button) => button.getAttribute('data-reaction-left'))
      .filter((id): id is string => Boolean(id));
    const productIds = Array.from(document.querySelectorAll('[data-reaction-right]'))
      .map((button) => button.getAttribute('data-reaction-right'))
      .filter((id): id is string => Boolean(id));

    const correctReactionId = reactionIds.find((id) => productIds.includes(id));
    const wrongProductId = productIds.find((id) => id !== correctReactionId);
    if (!correctReactionId || !wrongProductId) {
      throw new Error('Could not find reaction targets for correct and incorrect matches.');
    }

    return { correctReactionId, wrongProductId };
  });
}

function reactionLeftSelector(reactionId: string) {
  return `[data-reaction-left="${escapeCssAttribute(reactionId)}"]`;
}

function reactionRightSelector(reactionId: string) {
  return `[data-reaction-right="${escapeCssAttribute(reactionId)}"]`;
}

async function readQuizOutcome(page: Page): Promise<'correct' | 'incorrect'> {
  return await page.locator('.quiz-feedback-panel').evaluate((panel) => {
    if (panel.classList.contains('is-correct')) {
      return 'correct';
    }
    if (panel.classList.contains('is-wrong')) {
      return 'incorrect';
    }
    throw new Error('Quiz feedback panel did not expose a correct or wrong result.');
  });
}

function escapeCssAttribute(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
