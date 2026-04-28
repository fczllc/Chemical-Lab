import { test, expect } from '@playwright/test';

test.describe('Content Data Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
  });

  test('detail panel opens with element content', async ({ page }) => {
    await openHydrogenDetail(page);

    await expect(page.locator('#detail-panel .element-hero .symbol')).toHaveText('H');
    await expect(page.locator('#detail-panel .element-hero .chinese-name')).toHaveText('氢');
    await expect(page.locator('#detail-panel .element-properties')).toContainText('电子排布');
    await expect(page.locator('#detail-panel .element-story')).toContainText('元素小故事');
    await expect(page.locator('#detail-panel .element-funfact')).toContainText('趣味事实');
  });

  test('story flow opens the selected element archive', async ({ page }) => {
    await openHydrogenDetail(page);
    await page.locator('#btn-story').click();

    await expect(page).toHaveURL(/#\/story$/);
    await expect(page.locator('#story')).toHaveClass(/active/);
    await expect(page.locator('#story .story-shell h3')).toContainText('氢 · H');
    await expect
      .poll(async () => ((await page.locator('#story .story-body').textContent()) || '').trim().length)
      .toBeGreaterThan(20);
  });

  test('lab flow opens related experiment content for the selected element', async ({ page }) => {
    await openHydrogenDetail(page);
    await page.locator('#btn-lab').click();

    await expect(page).toHaveURL(/#\/lab$/);
    await expect(page.locator('#lab')).toHaveClass(/active/);
    await expect(page.locator('#lab .lab-toolbar')).toContainText('当前聚焦：氢（H）');
    await expect(page.locator('#lab .lab-list .lab-item-card').first()).toBeVisible();
    await expect(page.locator('#lab #lab-stage .lab-stage-shell h3')).not.toHaveText('');
  });

  test('quiz flow opens a quick quiz for the selected element', async ({ page }) => {
    await openHydrogenDetail(page);
    await page.locator('#btn-quiz').click();

    const quizModal = page.locator('#quiz-modal');
    await expect(quizModal).toHaveClass(/show/);
    await expect(quizModal.locator('#quiz-content h3')).toContainText('氢 · H');
    await expect(quizModal.locator('.quiz-option-btn')).toHaveCount(4);

    await quizModal.locator('.quiz-option-btn').first().click();
    await expect(quizModal.locator('[data-quiz-next]')).toBeEnabled();
  });
});

async function openHydrogenDetail(page) {
  await page.getByTestId('element-cell-1').click();
  await expect(page.locator('#detail-panel')).toHaveClass(/open|docked/);
  await expect(page.locator('#detail-panel .element-hero .symbol')).toHaveText('H');
}

async function waitForShellReady(page) {
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
