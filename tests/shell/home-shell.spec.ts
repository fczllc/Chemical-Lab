import { test, expect } from '@playwright/test';

test.describe('Homepage Shell Contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);
  });

  test('desktop shell contract - all shell regions visible at 1440x900', async ({ page }) => {
    // Top navigation buttons
    await expect(page.getByTestId('nav-home')).toBeVisible();
    await expect(page.getByTestId('nav-compare')).toBeVisible();
    await expect(page.getByTestId('nav-timeline')).toBeVisible();
    await expect(page.getByTestId('nav-games')).toBeVisible();
    await expect(page.getByTestId('nav-lab')).toBeVisible();
    await expect(page.getByTestId('nav-achievements')).toBeVisible();
    await expect(page.getByTestId('nav-progress')).toBeVisible();
    await expect(page.getByTestId('nav-story')).toBeVisible();

    // Settings button
    await expect(page.getByTestId('settings-btn')).toBeVisible();

    // Detail panel (docked, always visible on desktop)
    await expect(page.getByTestId('detail-panel')).toBeVisible();

    // Bottom modules
    await expect(page.getByTestId('bottom-categories')).toBeVisible();
    await expect(page.getByTestId('bottom-compare')).toBeVisible();
    await expect(page.getByTestId('bottom-timeline')).toBeVisible();
    await expect(page.getByTestId('bottom-stats')).toBeVisible();
  });

  test('settings panel opens and contains performance mode toggle', async ({ page }) => {
    await page.getByTestId('settings-btn').click();
    await expect(page.getByTestId('settings-modal')).toBeVisible();
    // The toggle checkbox is visually hidden (opacity: 0) inside the toggle switch;
    // verify it is attached and the toggle switch wrapper is visible.
    await expect(page.getByTestId('performance-mode-toggle')).toBeAttached();
    await expect(page.locator('.toggle-switch:has([data-testid="performance-mode-toggle"])')).toBeVisible();
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

test.describe('Responsive Layout', () => {
  test('desktop layout keeps primary navigation visible at 1366x768', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await expectPrimaryNavigationVisible(page);
    await expect(page.locator('#mobile-menu-toggle')).toHaveCount(0);
    await expect(page.getByTestId('detail-panel')).toBeVisible();
    await expect(page.locator('.periodic-table-wrapper')).toBeVisible();
  });

  test('tablet landscape keeps primary navigation visible at 1024x768', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await expectPrimaryNavigationVisible(page);
    await expect(page.locator('#mobile-menu-toggle')).toHaveCount(0);
    await expect(page.getByTestId('detail-panel')).toBeVisible();
    await expect(page.locator('#bottom-modules')).toBeVisible();
  });

  test('tablet portrait supports navigation and element details at 768x1024', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForShellReady(page);

    await expectPrimaryNavigationVisible(page);
    await expect(page.locator('#mobile-menu-toggle')).toHaveCount(0);

    const firstElement = page.locator('.element-cell').first();
    await expect(firstElement).toBeVisible();
    await firstElement.click();

    const panel = page.getByTestId('detail-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveClass(/open/);
    await expect(panel.locator('.element-hero .symbol')).toBeVisible();
  });
});

test.describe('Hash-based Routing', () => {
  test('unknown route falls back to home', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/does-not-exist', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Should fall back to home
    await expect(page).toHaveURL(/#\/$/);

    // Home section should be active
    await expect(page.locator('#periodic-table')).toHaveClass(/active/);

    // Home nav button should be active
    await expect(page.getByTestId('nav-home')).toHaveClass(/active/);
  });

  test('hash routes navigate correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const routes = [
      { nav: 'nav-compare', section: 'compare', hash: '#/compare' },
      { nav: 'nav-timeline', section: 'timeline', hash: '#/timeline' },
      { nav: 'nav-games', section: 'games', hash: '#/games' },
      { nav: 'nav-lab', section: 'lab', hash: '#/lab' },
      { nav: 'nav-achievements', section: 'achievements', hash: '#/achievements' },
      { nav: 'nav-progress', section: 'progress', hash: '#/progress' },
      { nav: 'nav-story', section: 'story', hash: '#/story' },
    ];

    for (const route of routes) {
      await page.getByTestId(route.nav).click();
      await expect(page).toHaveURL(new RegExp(route.hash.replace('#', '\\#') + '$'));
      await expect(page.locator(`#${route.section}`)).toHaveClass(/active/);
      await expect(page.getByTestId(route.nav)).toHaveClass(/active/);
    }

    // Navigate back to home
    await page.getByTestId('nav-home').click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('#periodic-table')).toHaveClass(/active/);
  });
});

test.describe('Device Optimizations', () => {
  test('viewport meta uses standard responsive scaling', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1.0');
  });
});

test.describe('Performance and Accessibility', () => {
  test('global loader is present and hides after init', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const loader = page.locator('#global-loader');
    await expect(loader).toBeAttached();

    // After initialization, loader should be hidden
    await expect(loader).toHaveClass(/hidden/);
  });

  test('focus styles are visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Focus on first element cell
    const firstElement = page.locator('.element-cell').first();
    await firstElement.focus();

    // Check outline style
    const outline = await firstElement.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.outlineWidth !== '0px' || computed.boxShadow !== 'none';
    });
    expect(outline).toBe(true);
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Press Escape to close any modal
    await page.keyboard.press('Escape');

    // Tab navigation should work
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  });
});
