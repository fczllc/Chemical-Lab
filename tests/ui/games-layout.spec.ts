import { test, expect, type Page } from '@playwright/test';

const EVIDENCE_DIR = '.sisyphus/evidence';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

const PRIMARY_GAMES = ['drag', 'memory', 'reaction', 'collector'] as const;

const GAMEPLAY_SELECTORS = {
  drag: '.drag-game-layout',
  memory: '.memory-grid',
  reaction: '.reaction-board',
  collector: '.collector-dashboard',
} as const;

test.describe('Games layout contract', () => {
  test('landing layout keeps primary games and support cards separated across viewports', async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await test.step(`${viewport.name} ${viewport.width}x${viewport.height}`, async () => {
        await openGames(page, viewport);
        await expectGamesLandingContract(page);

        if (viewport.name === 'mobile') {
          await expectNoHorizontalOverflow(page);
        }

        if (viewport.name === 'desktop' || viewport.name === 'mobile') {
          await page.screenshot({
            path: `${EVIDENCE_DIR}/task-5-games-${viewport.name}-landing.png`,
            fullPage: true,
          });
        }
      });
    }
  });

  test('full quiz support card stays unique and opens a 20-question unique quiz', async ({ page }) => {
    await openGames(page, { width: 1280, height: 720 });
    await expectGamesLandingContract(page);

    await page.getByTestId('full-quiz-support-card').locator('.quiz-play-btn').click();
    const modal = page.locator('#quiz-modal');
    await expect(modal).toHaveClass(/show/);
    await expect(modal.locator('.quiz-mode-badge')).toHaveText('20题完整挑战');

    const seenQuestions = new Set<string>();
    for (let questionIndex = 1; questionIndex <= 20; questionIndex += 1) {
      await expect(modal.locator('.quiz-scoreboard')).toContainText(`第 ${questionIndex} / 20 题`);

      const questionText = ((await modal.locator('.quiz-question-text').textContent()) || '').trim();
      expect(questionText.length).toBeGreaterThan(0);
      expect(seenQuestions.has(questionText)).toBe(false);
      seenQuestions.add(questionText);

      await modal.locator('.quiz-option-btn').first().click();
      const nextButton = modal.locator('[data-quiz-next]');
      await expect(nextButton).toBeEnabled();
      await nextButton.click();
    }

    await expect(modal.locator('.quiz-shell--results')).toBeVisible();
    expect(seenQuestions.size).toBe(20);
    await modal.locator('[data-quiz-return]').click();
    await expect(modal).not.toHaveClass(/show/);
    await expectGamesLandingContract(page);
  });

  test('each mini-game launches the shared active-game frame on desktop and mobile', async ({ page }) => {
    await openGames(page, { width: 1280, height: 720 });
    await expectActiveGameLaunches(page, 'desktop');

    await openGames(page, { width: 390, height: 844 });
    await expectActiveGameLaunches(page, 'mobile');
    await expectNoHorizontalOverflow(page);
  });
});

async function openGames(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForShellReady(page);
  await page.getByTestId('nav-games').click();

  await expect(page).toHaveURL(/#\/games$/);
  await expect(page.locator('#games')).toHaveClass(/active/);
  await expect(page.getByTestId('nav-games')).toHaveClass(/active/);
  await expect(page.locator('#game-area .games-overview-header')).toBeVisible({ timeout: 15000 });
}

async function waitForShellReady(page: Page) {
  await expect(page.getByTestId('nav-home')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('detail-panel')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.element-cell').first()).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => {
    return await page.evaluate(() => {
      const hasElements = Array.isArray(window.appState?.elements) && window.appState.elements.length >= 118;
      const loaderHidden = document.getElementById('global-loader')?.classList.contains('hidden') ?? false;
      return hasElements && loaderHidden;
    });
  }, { timeout: 15000 }).toBe(true);
}

async function expectGamesLandingContract(page: Page) {
  const primaryGrid = page.getByTestId('games-primary-grid');
  const supportArea = page.getByTestId('games-support-area');
  const primaryCards = primaryGrid.locator(':scope > .game-card');
  const fullQuizCard = page.getByTestId('full-quiz-support-card');
  const labProgressCard = page.getByTestId('lab-progress-support-card');

  await expect(primaryGrid).toBeVisible();
  await expect(supportArea).toBeVisible();
  await expect(primaryCards).toHaveCount(4);
  await expect.poll(async () => primaryCards.evaluateAll((cards) => (
    cards.map((card) => (card as HTMLElement).dataset.game)
  ))).toEqual([...PRIMARY_GAMES]);

  await expect(fullQuizCard).toHaveCount(1);
  await expect(supportArea.getByTestId('full-quiz-support-card')).toHaveCount(1);
  await expect(primaryGrid.getByTestId('full-quiz-support-card')).toHaveCount(0);
  await expect(primaryGrid.locator(':scope > .game-card[data-game="full-quiz"]')).toHaveCount(0);

  await expect(labProgressCard).toHaveCount(1);
  await expect(supportArea.getByTestId('lab-progress-support-card')).toHaveCount(1);
  await expect(page.locator('#lab-completed-count')).toHaveCount(1);
  await expect(labProgressCard.locator('#lab-completed-count')).toBeVisible();
}

async function expectActiveGameLaunches(page: Page, viewportName: 'desktop' | 'mobile') {
  for (const gameName of PRIMARY_GAMES) {
    await test.step(`${viewportName} launches ${gameName}`, async () => {
      await expectGamesLandingContract(page);

      await page
        .getByTestId('games-primary-grid')
        .locator(`:scope > .game-card[data-game="${gameName}"] .play-btn`)
        .click();

      const stage = page.getByTestId('active-game-stage');
      await expect(stage).toHaveClass(/active/);
      await expect(stage.locator('.game-overlay')).toBeVisible();
      await expect(stage.locator('.hud-shell-header h3')).toBeVisible();
      await expect.poll(async () => ((await stage.locator('.hud-shell-header h3').textContent()) || '').trim().length).toBeGreaterThan(0);
      await expect(stage.locator('.game-frame-actions .hud-action-btn')).toHaveCount(2);
      await expect(stage.locator('.game-scoreboard .quiz-stat-card')).toHaveCount(4);
      await expect(stage.locator('.game-body-shell')).toBeVisible();
      await expect(stage.locator('.game-feedback')).toBeVisible();
      await expect(stage.locator(GAMEPLAY_SELECTORS[gameName])).toBeVisible();

      if (gameName === 'drag') {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/task-5-games-active-${viewportName}.png`,
          fullPage: true,
        });
      }

      await stage.locator('[data-action="close-game"]').click();
      await expect(page.locator('#game-area .games-overview-header')).toBeVisible();
      await expect(stage).not.toHaveClass(/active/);
    });
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
}
