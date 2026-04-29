import { test, expect } from '@playwright/test';

const ROUTES = [
  {
    hash: '#/compare',
    section: 'compare',
    nav: 'nav-compare',
    anchor: '#compare-container'
  },
  {
    hash: '#/timeline',
    section: 'timeline',
    nav: 'nav-timeline',
    anchor: '#timeline-container .timeline-page-shell'
  },
  {
    hash: '#/games',
    section: 'games',
    nav: 'nav-games',
    anchor: '#game-area .games-overview-header'
  },
  {
    hash: '#/lab',
    section: 'lab',
    nav: 'nav-lab',
    anchor: '#lab .lab-toolbar'
  },
  {
    hash: '#/achievements',
    section: 'achievements',
    nav: 'nav-achievements',
    anchor: '#achievements-grid .achievement-overview'
  },
  {
    hash: '#/progress',
    section: 'progress',
    nav: 'nav-progress',
    anchor: '#progress .progress-dashboard'
  },
  {
    hash: '#/story',
    section: 'story',
    nav: 'nav-story',
    anchor: '#story .story-shell'
  }
];

test.describe('Route shell rendering sanity', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
  });

  test('hash routes activate and render their shell anchors', async ({ page }) => {
    for (const route of ROUTES) {
      await test.step(route.hash, async () => {
        await page.evaluate((hash) => {
          window.location.hash = hash;
        }, route.hash);

        await expect(page).toHaveURL(new RegExp(`${route.hash.replace('#', '\\#')}$`));
        await expect(page.locator(`#${route.section}`)).toHaveClass(/active/);
        await expect(page.getByTestId(route.nav)).toHaveClass(/active/);
        await expect(page.locator(route.anchor)).toBeVisible({ timeout: 15000 });
      });
    }
  });

  test('tablet portrait routes keep primary navigation visible without phone chrome', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await expectPrimaryNavigationVisible(page);
    await expect(page.locator('#mobile-menu-toggle')).toHaveCount(0);

    for (const route of ROUTES) {
      await test.step(`tablet ${route.hash}`, async () => {
        await page.evaluate((hash) => {
          window.location.hash = hash;
        }, route.hash);

        await expect(page).toHaveURL(new RegExp(`${route.hash.replace('#', '\#')}$`));
        await expect(page.locator(`#${route.section}`)).toHaveClass(/active/);
        await expect(page.getByTestId(route.nav)).toHaveClass(/active/);
        await expect(page.locator(route.anchor)).toBeVisible({ timeout: 15000 });
        await expectPrimaryNavigationVisible(page);
      });
    }
  });
});

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

async function expectPrimaryNavigationVisible(page) {
  await expect(page.locator('.main-nav')).toBeVisible();
  await expect(page.getByTestId('nav-home')).toBeVisible();
  await expect(page.getByTestId('nav-compare')).toBeVisible();
  await expect(page.getByTestId('nav-timeline')).toBeVisible();
  await expect(page.getByTestId('nav-games')).toBeVisible();
  await expect(page.getByTestId('nav-lab')).toBeVisible();
  await expect(page.getByTestId('nav-achievements')).toBeVisible();
  await expect(page.getByTestId('nav-progress')).toBeVisible();
  await expect(page.getByTestId('nav-story')).toBeVisible();
}
