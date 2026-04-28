import { test, expect } from '@playwright/test';

test.describe('Homepage Shell Contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
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

test.describe('Hash-based Routing', () => {
  test('unknown route falls back to home', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/does-not-exist');

    // Should fall back to home
    await expect(page).toHaveURL(/#\/$/);

    // Home section should be active
    await expect(page.locator('#periodic-table')).toHaveClass(/active/);

    // Home nav button should be active
    await expect(page.getByTestId('nav-home')).toHaveClass(/active/);
  });

  test('hash routes navigate correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

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
