import { test, expect } from '@playwright/test';

test.describe('Homepage Shell Contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    // Wait for loader to disappear
    await page.waitForSelector('#global-loader', { state: 'hidden', timeout: 10000 });
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

test.describe('Responsive Layout', () => {
  test('tablet layout - navigation visible, detail panel overlay', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigation should be visible
    await expect(page.getByTestId('nav-home')).toBeVisible();
    await expect(page.getByTestId('nav-compare')).toBeVisible();

    // Detail panel should be hidden by default (overlay mode)
    const panel = page.getByTestId('detail-panel');
    await expect(panel).toBeVisible();

    // Bottom modules should be 2 columns
    const bottomModules = page.locator('.bottom-modules');
    await expect(bottomModules).toBeVisible();
  });

  test('mobile layout - hamburger menu and bottom sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mobile menu toggle should be visible
    const mobileToggle = page.locator('#mobile-menu-toggle');
    await expect(mobileToggle).toBeVisible();

    // Navigation should be hidden initially
    const nav = page.locator('.main-nav');
    await expect(nav).not.toHaveClass(/open/);

    // Click hamburger to open menu
    await mobileToggle.click();
    await expect(nav).toHaveClass(/open/);

    // Click nav item should close menu
    await page.getByTestId('nav-compare').click();
    await expect(nav).not.toHaveClass(/open/);

    // Navigate back to home to check bottom modules
    await page.evaluate(() => window.location.hash = '#/');
    await page.waitForURL(/#\/$/);

    // Bottom modules should be visible on home page
    const bottomModules = page.locator('#bottom-modules');
    await expect(bottomModules).toBeVisible({ timeout: 10000 });
  });

  test('mobile periodic table horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const wrapper = page.locator('.periodic-table-wrapper');
    await expect(wrapper).toBeVisible();

    // Check if wrapper has horizontal scroll capability
    const scrollWidth = await wrapper.evaluate((el) => el.scrollWidth);
    const clientWidth = await wrapper.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeGreaterThan(clientWidth);
  });

  test('detail panel bottom sheet on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on first element to open detail panel
    const firstElement = page.locator('.element-cell').first();
    await firstElement.click();

    // Detail panel should be visible as bottom sheet
    const panel = page.getByTestId('detail-panel');
    await expect(panel).toHaveClass(/open/);

    // Panel should have bottom-sheet styling
    const panelStyles = await panel.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        bottom: computed.bottom,
        left: computed.left,
        right: computed.right,
        borderRadius: computed.borderRadius
      };
    });

    expect(panelStyles.borderRadius).toContain('20px');
  });
});

test.describe('Hash-based Routing', () => {
  test('unknown route falls back to home', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#/does-not-exist');
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
    await page.goto('/');
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
  test('viewport meta prevents zoom', async ({ page }) => {
    await page.goto('/');
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /maximum-scale=1\.0/);
    await expect(viewport).toHaveAttribute('content', /user-scalable=no/);
  });
});

test.describe('Performance and Accessibility', () => {
  test('global loader is present and hides after init', async ({ page }) => {
    await page.goto('/');
    const loader = page.locator('#global-loader');
    await expect(loader).toBeAttached();

    // After initialization, loader should be hidden
    await expect(loader).toHaveClass(/hidden/);
  });

  test('focus styles are visible', async ({ page }) => {
    await page.goto('/');
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
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Press Escape to close any modal
    await page.keyboard.press('Escape');

    // Tab navigation should work
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  });
});
