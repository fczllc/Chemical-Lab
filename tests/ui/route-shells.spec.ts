import { test, expect } from '@playwright/test';

const ROUTES = [
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

  test('direct compare route renders compare shell without top navigation entry', async ({ page }) => {
    await page.goto('/#/compare', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await expect(page.locator('#compare')).toHaveClass(/active/);
    await expect(page.locator('#compare-container')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('nav-compare')).toHaveCount(0);
  });

  test('story route renders media cards for the selected element with fallback disclosure', async ({ page }) => {
    await page.getByTestId('element-cell-6').click();
    await expect(page.locator('#detail-panel')).toHaveClass(/open|docked/);
    await expect(page.locator('#detail-panel .element-hero .symbol')).toHaveText('C');

    await page.getByTestId('nav-story').click();

    await expect(page).toHaveURL(/#\/story$/);
    await expect(page.locator('#story')).toHaveClass(/active/);
    await expect(page.locator('#story .story-shell h3')).toContainText('碳 · C');
    await expectStoryMediaCards(page, { expectFallbackDisclosure: true });
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

async function expectStoryMediaCards(page, options = {}) {
  const cards = page.locator('#story .story-media-card');
  await expect(cards).toHaveCount(2);

  for (let index = 0; index < 2; index += 1) {
    const card = cards.nth(index);
    const image = card.locator('img');

    await expect(card).toBeVisible();
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('alt', /\S/);
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('decoding', 'async');
    await expect(image).toHaveAttribute('width', '800');
    await expect(image).toHaveAttribute('height', '520');

    const rawSrc = await image.getAttribute('src');
    expect(rawSrc).toMatch(/^\/assets\/elements\/(discovery|specimens)\/[\w.-]+\.webp$/);
    expect(rawSrc).not.toMatch(/^https?:\/\//);

    await expect(card.locator('.story-media-attribution')).toBeVisible();
    await expect.poll(async () => {
      return ((await card.locator('.story-media-attribution').textContent()) || '').trim().length;
    }).toBeGreaterThan(0);

    if (options.expectFallbackDisclosure) {
      await expect(card.locator('.story-media-disclosure')).toBeVisible();
      await expect.poll(async () => {
        return ((await card.locator('.story-media-disclosure').textContent()) || '').trim().length;
      }).toBeGreaterThan(0);
    }
  }

  await expect.poll(async () => {
    return await cards.locator('img').evaluateAll((images) => {
      return images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0);
    });
  }, { timeout: 15000 }).toBe(true);
}

async function expectPrimaryNavigationVisible(page) {
  await expect(page.locator('.main-nav')).toBeVisible();
  await expect(page.getByTestId('nav-home')).toBeVisible();
  await expect(page.getByTestId('nav-compare')).toHaveCount(0);
  await expect(page.getByTestId('nav-timeline')).toBeVisible();
  await expect(page.getByTestId('nav-games')).toBeVisible();
  await expect(page.getByTestId('nav-lab')).toBeVisible();
  await expect(page.getByTestId('nav-achievements')).toBeVisible();
  await expect(page.getByTestId('nav-progress')).toBeVisible();
  await expect(page.getByTestId('nav-story')).toBeVisible();
}
